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
import { sepolia } from "viem/chains";

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

const { ETHEREUM_HOSTS = "https://ethereum-sepolia-rpc.publicnode.com", PRIVATE_KEY } = process.env;
// const { ETHEREUM_HOSTS = "http://localhost:8545", PRIVATE_KEY } = process.env;

if (!PRIVATE_KEY) {
  throw new Error('PRIVATE_KEY must be set in .env file');
}


const { walletClient, publicClient } = createL1Clients(
  ETHEREUM_HOSTS.split(","),
  PRIVATE_KEY,
  // @ts-ignore
  sepolia
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


async function main() {
  const logger = createLogger("aztec:token-bridge-tutorial");
  const pxe = await setupSandbox();

  const l1ContractAddresses = (await pxe.getNodeInfo()).l1ContractAddresses;

  const bridgeInfo = JSON.parse(fs.readFileSync('bridge_info.json', 'utf8'));
  const { l1PortalContractAddress, l1TokenContract, feeAssetHandler } = bridgeInfo;


  const l1TokenManager = new L1TokenManager(
    l1TokenContract,
    feeAssetHandler,
    publicClient,
    walletClient,
    logger
  );

  const l1PortalManager = new L1TokenPortalManager(
    l1PortalContractAddress,
    l1TokenContract,
    feeAssetHandler,
    l1ContractAddresses.outboxAddress,
    publicClient,
    walletClient,
    logger
  );

  const withdrawDataRaw = fs.readFileSync('withdraw-data.json', 'utf8');
  const withdrawData = JSON.parse(withdrawDataRaw);
  const { withdrawAmount, ownerEthAddress, l2ToL1MessageIndex, siblingPath, blockNumber } = withdrawData;


  await l1PortalManager.withdrawFunds(
    withdrawAmount,
    EthAddress.fromString(ownerEthAddress),
    BigInt(blockNumber),
    l2ToL1MessageIndex,
    siblingPath
  );
  const newL1Balance = await l1TokenManager.getL1TokenBalance(ownerEthAddress);
  logger.info(`New L1 balance of ${ownerEthAddress} is ${newL1Balance}`);
}

main();

