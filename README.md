# Token bridge tutorial on testnet

Works on sandbox, fails on testnet

Running PXE:

```bash
aztec start --port 8081 --pxe --pxe.nodeUrl=XXX --pxe.proverEnabled true --l1-chain-id 11155111
```

Explorer url: https://aztecscan.xyz/tx-effects/0x0097e9e242d043591ce0ab42be7f3e280a28b0569556191e5b4e11def8912ff1

Error

```bash
[21:41:52.778] INFO: token-bridge-tutorial Schnorr account deployed at: 0x1eb084349662e678f7feeed902a1378db541cf1a1b1fb69c4d1c68cacce65ae6
[21:41:54.938] INFO: token-bridge-tutorial L1 Contract Addresses:
[21:41:54.939] INFO: token-bridge-tutorial Registry Address: 0x4d2cc1d5fb6be65240e0bfc8154243e69c0fb19e
[21:41:54.939] INFO: token-bridge-tutorial Inbox Address: 0x812bdd3aa323fe28db926b55d7f0273b3efadf06
[21:41:54.939] INFO: token-bridge-tutorial Outbox Address: 0x4345f34cc1a4be57156f1d0c669f9f5cbfb15d0a
[21:41:54.939] INFO: token-bridge-tutorial Rollup Address: 0x8d1cc702453fa889f137dbd5734cdb7ee96b6ba0
[21:46:10.963] INFO: aztecjs:deploy_sent_tx Contract 0x0c6d6aa66f4bd520a9274b3d4587da8b411824aa43113e9bf9034b3faf87818c successfully deployed.
[21:46:10.963] INFO: token-bridge-tutorial L2 token contract deployed at 0x0c6d6aa66f4bd520a9274b3d4587da8b411824aa43113e9bf9034b3faf87818c
[21:46:54.746] INFO: token-bridge-tutorial erc20 contract deployed
[21:47:41.851] INFO: token-bridge-tutorial L1 portal contract deployed
[21:51:56.864] INFO: aztecjs:deploy_sent_tx Contract 0x2f043db051f7b9cf7f512fe6306370ee9979da9cc597637a1dc0af76afe495d7 successfully deployed.
[21:51:56.864] INFO: token-bridge-tutorial L2 token bridge contract deployed at 0x2f043db051f7b9cf7f512fe6306370ee9979da9cc597637a1dc0af76afe495d7
[21:54:03.926] INFO: token-bridge-tutorial L1 portal contract initialized
[21:54:07.951] INFO: token-bridge-tutorial Minting 1000000000000000 tokens for 0xB84eb0bfCc25C832acad39D315a3B7B0e959e252
[21:54:16.933] INFO: token-bridge-tutorial Approving 1000000000000000 tokens for TokenPortal (0x78a4eab470a15970060ebc4b1e0f97487abb7273)
[21:54:29.123] INFO: token-bridge-tutorial Sending L1 tokens to L2 to be claimed publicly
[22:01:45.111] INFO: token-bridge-tutorial Public L2 balance of 0x1eb084349662e678f7feeed902a1378db541cf1a1b1fb69c4d1c68cacce65ae6 is 1000000000000000
22:05:53.235] INFO: token-bridge-tutorial New L2 balance of 0x1eb084349662e678f7feeed902a1378db541cf1a1b1fb69c4d1c68cacce65ae6 is 999999999999991
[22:05:54.217] INFO: token-bridge-tutorial Sending L1 tx to consume message at block 9823 index 0 to withdraw 9
/home/josh/Documents/test/token-bridge-tutorial/node_modules/@aztec/ethereum/node_modules/viem/utils/errors/getContractError.ts:78
  return new ContractFunctionExecutionError(cause as BaseError, {
         ^


ContractFunctionExecutionError: The contract function "withdraw" reverted.

Error: Outbox__BlockNotProven(uint256 l2BlockNumber)
                             (9823)
 
Contract Call:
  address:   0x78a4eab470a15970060ebc4b1e0f97487abb7273
  function:  withdraw(address _recipient, uint256 _amount, bool _withCaller, uint256 _l2BlockNumber, uint256 _leafIndex, bytes32[] _path)
  args:              (0xb84eb0bfcc25c832acad39d315a3b7b0e959e252, 9, false, 9823, 0, ["0x0000000000000000000000000000000000000000000000000000000000000000","0x00f5a5fd42d16a20302798ef6ed309979b43003d2320d9f0e8ea9831a92759fb","0x0007638bb56b6dda2b64b8f76841114ac3a87a1820030e2e16772c4d294879c3"])
  sender:    0xB84eb0bfCc25C832acad39D315a3B7B0e959e252

Docs: https://viem.sh/docs/contract/simulateContract
Version: viem@2.23.7
```