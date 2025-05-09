import { getInitialTestAccountsWallets } from "@aztec/accounts/testing";
import {
  EthAddress,
  Fr,
  L1TokenManager,
  L1TokenPortalManager,
  createLogger,
  createPXEClient,
  waitForPXE,
} from "@aztec/aztec.js";
import { createL1Clients, deployL1Contract } from "@aztec/ethereum";
import { deriveSigningKey } from '@aztec/stdlib/keys';
import {
  FeeAssetHandlerAbi,
  FeeAssetHandlerBytecode,
  TestERC20Abi,
  TestERC20Bytecode,
  TokenPortalAbi,
  TokenPortalBytecode,
} from "@aztec/l1-artifacts";
import { TokenContract } from "@aztec/noir-contracts.js/Token";
import { TokenBridgeContract } from "@aztec/noir-contracts.js/TokenBridge";
import { SponsoredFeePaymentMethod } from "@aztec/aztec.js/fee/testing";

import { getContract } from "viem";
import fs from 'fs';

import {
  type ContractInstanceWithAddress,
  type PXE,
  getContractInstanceFromDeployParams,
} from '@aztec/aztec.js';
import { SponsoredFPCContract } from '@aztec/noir-contracts.js/SponsoredFPC';
import { getSchnorrAccount } from "@aztec/accounts/schnorr";
import 'dotenv/config';
import { sepolia, foundry } from "viem/chains";

const SPONSORED_FPC_SALT = new Fr(0);

export async function getSponsoredFPCInstance(): Promise<ContractInstanceWithAddress> {
  return await getContractInstanceFromDeployParams(SponsoredFPCContract.artifact, {
    salt: SPONSORED_FPC_SALT,
  });
}

export async function getSponsoredFPCAddress() {
  return (await getSponsoredFPCInstance()).address;
}

export async function getDeployedSponsoredFPCAddress(pxe: PXE) {
  const fpc = await getSponsoredFPCAddress();
  const contracts = await pxe.getContracts();
  if (!contracts.find(c => c.equals(fpc))) {
    throw new Error('SponsoredFPC not deployed.');
  }
  return fpc;
}

const MNEMONIC = "test test test test test test test test test test test junk";

// const { ETHEREUM_HOSTS = "https://ethereum-sepolia-rpc.publicnode.com", PRIVATE_KEY } = process.env;
const { ETHEREUM_HOSTS = "http://localhost:8545", PRIVATE_KEY } = process.env;

if (!PRIVATE_KEY) {
  throw new Error('PRIVATE_KEY must be set in .env file');
}


const { walletClient, publicClient } = createL1Clients(
  ETHEREUM_HOSTS.split(","),
  MNEMONIC,
  //PRIVATE_KEY,
  // @ts-ignore
  foundry,
  //sepolia
);
const ownerEthAddress = walletClient.account.address;

const MINT_AMOUNT = BigInt(1e15);

const setupSandbox = async () => {
  const { PXE_URL = "http://localhost:8081" } = process.env;
  // eslint-disable-next-line @typescript-eslint/await-thenable
  const pxe = await createPXEClient(PXE_URL);
  await waitForPXE(pxe);
  return pxe;
};

async function deployTestERC20(): Promise<EthAddress> {
  const constructorArgs = ["Test Token", "TEST", walletClient.account.address];

  return await deployL1Contract(
    walletClient,
    publicClient,
    TestERC20Abi,
    TestERC20Bytecode,
    constructorArgs
  ).then(({ address }) => address);
}

async function deployFeeAssetHandler(
  l1TokenContract: EthAddress
): Promise<EthAddress> {
  const constructorArgs = [
    walletClient.account.address,
    l1TokenContract.toString(),
    MINT_AMOUNT,
  ];
  return await deployL1Contract(
    walletClient,
    publicClient,
    FeeAssetHandlerAbi,
    FeeAssetHandlerBytecode,
    constructorArgs
  ).then(({ address }) => address);
}

async function deployTokenPortal(): Promise<EthAddress> {
  return await deployL1Contract(
    walletClient,
    publicClient,
    TokenPortalAbi,
    TokenPortalBytecode,
    []
  ).then(({ address }) => address);
}

async function addMinter(
  l1TokenContract: EthAddress,
  l1TokenHandler: EthAddress
) {
  const contract = getContract({
    address: l1TokenContract.toString(),
    abi: TestERC20Abi,
    // @ts-ignore
    client: walletClient,
  });
  // @ts-ignore
  await contract.write.addMinter([l1TokenHandler.toString()]);
}

async function main() {
  const logger = createLogger("aztec:token-bridge-tutorial");
  const pxe = await setupSandbox();

  let secretKey = Fr.random();
  let salt = Fr.random();
  let schnorrAccount = await getSchnorrAccount(pxe, secretKey, deriveSigningKey(secretKey), salt);
  let ownerWallet = await schnorrAccount.getWallet();
  const ownerAztecAddress = ownerWallet.getAddress();
  const sponseredFPC = await getSponsoredFPCInstance();
  await pxe.registerContract({ instance: sponseredFPC, artifact: SponsoredFPCContract.artifact });
  const paymentMethod = new SponsoredFeePaymentMethod(sponseredFPC.address);

  let tx = await schnorrAccount.deploy({ fee: { paymentMethod } }).wait({ timeout: 120000 });

  logger.info(`Schnorr account deployed at: ${ownerWallet.getAddress()}`);

  const l1ContractAddresses = (await pxe.getNodeInfo()).l1ContractAddresses;
  logger.info("L1 Contract Addresses:");
  logger.info(`Registry Address: ${l1ContractAddresses.registryAddress}`);
  logger.info(`Inbox Address: ${l1ContractAddresses.inboxAddress}`);
  logger.info(`Outbox Address: ${l1ContractAddresses.outboxAddress}`);
  logger.info(`Rollup Address: ${l1ContractAddresses.rollupAddress}`);

  const l2TokenContract = await TokenContract.deploy(
    ownerWallet,
    ownerAztecAddress,
    "L2 Token",
    "L2",
    18
  )
    .send({ fee: { paymentMethod } })
    .deployed({ timeout: 120000 });
  logger.info(`L2 token contract deployed at ${l2TokenContract.address}`);

  const l1TokenContract = await deployTestERC20();
  logger.info("erc20 contract deployed");

  const feeAssetHandler = await deployFeeAssetHandler(l1TokenContract);
  await addMinter(l1TokenContract, feeAssetHandler);

  const l1TokenManager = new L1TokenManager(
    l1TokenContract,
    feeAssetHandler,
    publicClient,
    walletClient,
    logger
  );

  const l1PortalContractAddress = await deployTokenPortal();
  logger.info("L1 portal contract deployed");

  const l1Portal = getContract({
    address: l1PortalContractAddress.toString(),
    abi: TokenPortalAbi,
    // @ts-ignore
    client: walletClient,
  });

  const l2BridgeContract = await TokenBridgeContract.deploy(
    ownerWallet,
    l2TokenContract.address,
    l1PortalContractAddress
  )
    .send({ fee: { paymentMethod } })
    .deployed({ timeout: 120000 });
  logger.info(
    `L2 token bridge contract deployed at ${l2BridgeContract.address}`
  );

  await l2TokenContract.methods
    .set_minter(l2BridgeContract.address, true)
    .send({ fee: { paymentMethod } })
    .wait({ timeout: 120000 });

  // @ts-ignore
  await l1Portal.write.initialize(
    [
      l1ContractAddresses.registryAddress.toString(),
      l1TokenContract.toString(),
      l2BridgeContract.address.toString(),
    ],
    {}
  );
  logger.info("L1 portal contract initialized");

  const l1PortalManager = new L1TokenPortalManager(
    l1PortalContractAddress,
    l1TokenContract,
    feeAssetHandler,
    l1ContractAddresses.outboxAddress,
    publicClient,
    walletClient,
    logger
  );

  await fs.promises.writeFile(
    'bridge_info.json',
    JSON.stringify({
      l1PortalContractAddress: l1PortalContractAddress.toString(),
      l1TokenContract: l1TokenContract.toString(), 
      feeAssetHandler: feeAssetHandler.toString(),
      outboxAddress: l1ContractAddresses.outboxAddress.toString()
    }, null, 2),
    'utf8'
  );

  const claim = await l1PortalManager.bridgeTokensPublic(
    ownerAztecAddress,
    MINT_AMOUNT,
    true
  );


  // Wait for 2 minutes to allow for message processing
  await new Promise(resolve => setTimeout(resolve, 120000));


  await l2BridgeContract.methods
    .claim_public(
      ownerAztecAddress,
      MINT_AMOUNT,
      claim.claimSecret,
      claim.messageLeafIndex
    )
    .send({ fee: { paymentMethod } })
    .wait({ timeout: 120000 });
  const balance = await l2TokenContract.methods
    .balance_of_public(ownerAztecAddress)
    .simulate();
  logger.info(`Public L2 balance of ${ownerAztecAddress} is ${balance}`);

  const withdrawAmount = 9n;
  const nonce = Fr.random();

  // Give approval to bridge to burn owner's funds:
  const authwit = await ownerWallet.setPublicAuthWit(
    {
      caller: l2BridgeContract.address,
      action: l2TokenContract.methods.burn_public(
        ownerAztecAddress,
        withdrawAmount,
        nonce
      ),
    },
    true
  );

  await authwit.send({ fee: { paymentMethod } }).wait({ timeout: 120000 });

  const l2ToL1Message = await l1PortalManager.getL2ToL1MessageLeaf(
    withdrawAmount,
    EthAddress.fromString(ownerEthAddress),
    l2BridgeContract.address,
    EthAddress.ZERO
  );
  const l2TxReceipt = await l2BridgeContract.methods
    .exit_to_l1_public(
      EthAddress.fromString(ownerEthAddress),
      withdrawAmount,
      EthAddress.ZERO,
      nonce
    )
    .send({ fee: { paymentMethod } })
    .wait({ timeout: 120000 });

  const newL2Balance = await l2TokenContract.methods
    .balance_of_public(ownerAztecAddress)
    .simulate();
  logger.info(`New L2 balance of ${ownerAztecAddress} is ${newL2Balance}`);

  const [l2ToL1MessageIndex, siblingPath] =
    await pxe.getL2ToL1MembershipWitness(
      l2TxReceipt.blockNumber!,
      l2ToL1Message
    );

  
  const withdrawData = {
    withdrawAmount: withdrawAmount.toString(),
    ownerEthAddress: ownerEthAddress,
    l2ToL1MessageIndex: l2ToL1MessageIndex,
    siblingPath: siblingPath,
    blockNumber: l2TxReceipt.blockNumber!.toString()
  };

  fs.writeFileSync(
    'withdraw-data.json',
    JSON.stringify(withdrawData, null, 2),
    'utf8'
  );
  logger.info('Withdraw data saved to withdraw-data.json');

  await l1PortalManager.withdrawFunds(
    withdrawAmount,
    EthAddress.fromString(ownerEthAddress),
    BigInt(l2TxReceipt.blockNumber!),
    l2ToL1MessageIndex,
    siblingPath
  );
  const newL1Balance = await l1TokenManager.getL1TokenBalance(ownerEthAddress);
  logger.info(`New L1 balance of ${ownerEthAddress} is ${newL1Balance}`);
}

main();

