# Steward update: StudioNet wallet chain fix

## Reason for this update

The first review attempt stopped before a transaction was submitted because the connected wallet provider was on a different chain. The RPC returned:

```text
Invalid parameters were provided to the RPC method.
chainId should be same as current chainId
```

This was a frontend wallet-network configuration issue. It was not a contract execution failure and does not require a new contract deployment.

## Resolution

Production was updated so that MandateLock now:

1. checks the wallet network when the page loads;
2. requests `wallet_switchEthereumChain` to GenLayer StudioNet;
3. offers `wallet_addEthereumChain` if StudioNet is not configured;
4. verifies the network again immediately before every write;
5. listens for `chainChanged`, displays `WRONG NETWORK`, and disables write actions while the wallet is on the wrong network.

The network configuration is derived from the GenLayer SDK:

- Network: GenLayer StudioNet
- Chain ID: `61999` (`0xf22f`)
- RPC: `https://studio.genlayer.com/api`

## Current deployment

- Website: [https://mandatelock.vercel.app](https://mandatelock.vercel.app)
- Contract: [`0x3A03347dBA24C3a7fa1511Dd698B9D8dfA334B2a`](https://explorer-studio.genlayer.com/address/0x3A03347dBA24C3a7fa1511Dd698B9D8dfA334B2a)
- Fix commit: [`55b0adb`](https://github.com/eaglebooth/MandateLock/commit/55b0adbd13e97d212bb27d444fdca50e1c7394d3)
- Live transaction evidence: [`LIVE_STUDIONET_EVIDENCE.md`](LIVE_STUDIONET_EVIDENCE.md)

The contract address is unchanged because the contract was already deployed and its live two-wallet lifecycle had finalized successfully on StudioNet. Only the wallet-network handling in the frontend changed.

## Steward verification path

1. Open [https://mandatelock.vercel.app](https://mandatelock.vercel.app).
2. Click **CONNECT WALLET**.
3. Approve switching to GenLayer StudioNet (`61999`) if prompted.
4. If the button displays **WRONG NETWORK**, click it and approve the network switch.
5. Click **SYNC LEDGER** to read the existing deployment.
6. To perform a fresh write test, create an unused DAO namespace. The UI submits only after the wallet is on StudioNet and shows success only after finality and matching contract readback.

## Verification performed after the fix

- 13 contract tests passed.
- ESLint passed.
- TypeScript and the production Next.js build passed.
- The Vercel deployment reached `READY` and returns HTTP 200.
- The production bundle contains the network switch/add methods, chain `61999`, and the StudioNet RPC.

