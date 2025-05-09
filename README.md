# Token bridge tutorial on testnet

Works on sandbox, fails on testnet

Running PXE on testnet:

```bash
aztec start --port 8081 --pxe --pxe.nodeUrl=https://aztec-alpha-testnet-fullnode.zkv.xyz --pxe.proverEnabled true --l1-chain-id 11155111
```

Run PXE on sandbox:

```bash
aztec start --port 8081 --pxe --pxe.nodeUrl=http://localhost:8080 --pxe.proverEnabled false --l1-chain-id 31337
```