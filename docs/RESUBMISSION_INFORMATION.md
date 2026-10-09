# MandateLock — steward resubmission information

## What did you change? (copy into the form; under 1,000 characters)

```text
Addressed both reported frontend errors. Wallet connection now switches to StudioNet (61999) and rechecks the chain before signing. Receipt parsing handles the SDK vote map, delayed execution fields and idle validators stopped after quorum.

Added transaction/UI safeguards: finalized-state reads; no VERIFIED after failed full sync; submit locks; wallet/network/ID invalidation; current-role and object-link checks; pending transaction recovery after refresh.

Verification: 24/24 browser regression cases with mocked wallet/RPC, 5/5 receipt tests, lint, TypeScript and production build passed. Two signed production writes finalized and matched UI/readback (DAO creation and publisher registration).

The remaining production journey stopped on StudioNet browser fetch failures; UI failed closed. Full manual MetaMask/lifecycle completion is not claimed.

Website: https://mandatelock.vercel.app
Audit: https://github.com/eaglebooth/MandateLock/blob/main/docs/FRONTEND_TRANSACTION_AUDIT.md
```

## Steward requests and implemented responses

| Reported issue | Cause established | Implemented response | Evidence |
|---|---|---|---|
| DAO creation stopped with `chainId should be same as current chainId` | Wallet provider could use a different chain from the StudioNet SDK client | Switch/add StudioNet, verify chain before every write, observe chain changes and disable writes on the wrong network | [Chain fix note](STEWARD_UPDATE_CHAIN_FIX.md), [fix commit](https://github.com/eaglebooth/MandateLock/commit/55b0adbd13e97d212bb27d444fdca50e1c7394d3) |
| Transaction initiated, then `((intermediate value) || []) is not iterable` | `consensus_data.votes` is a map, but frontend spread it as an array | Normalize receipt arrays without spreading vote maps | [Receipt fix note](STEWARD_UPDATE_RECEIPT_FIX.md), [fix commit](https://github.com/eaglebooth/MandateLock/commit/c036212) |
| Additional issue found during live audit: finalized receipt temporarily lacks execution fields | RPC receipt fields may become available after finality status | Continue polling while execution is UNKNOWN; never infer SUCCESS solely from finality | [Receipt tests](../tests/transaction-result.test.mjs), [parser](../lib/transaction-result.mjs) |
| Additional issue found during live audit: idle validator reports ERROR after quorum | `CONSENSUS_VALIDATOR_QUORUM_REACHED` for an idle validator is not the agreed execution outcome | Use agreeing validators or the current leader receipt; reject actual agreed execution errors | [Receipt tests](../tests/transaction-result.test.mjs), [audit](FRONTEND_TRANSACTION_AUDIT.md) |

The contract source and deployment address did not change in these frontend remediations.

## Additional verification performed

- 24 browser regression cases passed against the production bundle, with simulated wallet and RPC responses clearly labeled as mocks.
- Cases include all six UI procedures, signature rejection, execution error, unchanged state, full-ledger RPC failure, wallet/network changes, pending double-click prevention, reload recovery, pending reload with changed IDs, obsolete read responses, canceled and undetermined transactions, revoked roles and mismatched DAO/mandate/action relationships.
- Five direct receipt and polling tests passed, including delayed execution fields and idle quorum-stopped validators.
- ESLint, TypeScript and production build passed; Vercel deployment reached READY.
- Two signed writes through the production UI reached FINALIZED, displayed VERIFIED and matched independent RPC before/after readback.
- The contract's earlier lifecycle report is a separate evidence layer, not a replacement for browser-wallet verification.

## Production transaction links

| Action | Transaction |
|---|---|
| Create DAO namespace | https://explorer-studio.genlayer.com/tx/0x9d7ccb0e36411443526e5c840153d2ee1b99fd1efebeb2e52690997e888d5a71 |
| Register publisher | https://explorer-studio.genlayer.com/tx/0xd7c40d57e8e45197a0e76a9876b390418d56fa15461899fe0d735d0d33b486b9 |

Namespace: `ui-audit-1791540108323`.

## Links to attach

1. Resubmission information: https://github.com/eaglebooth/MandateLock/blob/main/docs/RESUBMISSION_INFORMATION.md
2. Frontend audit: https://github.com/eaglebooth/MandateLock/blob/main/docs/FRONTEND_TRANSACTION_AUDIT.md
3. Browser regression report: https://github.com/eaglebooth/MandateLock/blob/main/docs/browser-evidence/report.json
4. Production write/readback report: https://github.com/eaglebooth/MandateLock/blob/main/docs/browser-live-evidence/1791540108323.json
5. Contract lifecycle transaction index: https://github.com/eaglebooth/MandateLock/blob/main/docs/LIVE_STUDIONET_EVIDENCE.md
6. Website: https://mandatelock.vercel.app
7. Contract: https://explorer-studio.genlayer.com/address/0x3A03347dBA24C3a7fa1511Dd698B9D8dfA334B2a

## Retest path and remaining limitation

Connect a funded StudioNet wallet, approve the network switch if prompted, select an unused DAO namespace and click SYNC LEDGER before submitting. After a write, wait for finality and readback. If a prior write is pending or a read fails, use the retained Explorer link and SYNC rather than submitting again.

The live production journey stopped before executor registration when direct browser requests to StudioNet failed with `net::ERR_FAILED` / `Failed to fetch`. The UI stopped safely and read retries did not duplicate writes. Later lifecycle steps and a full manual MetaMask-popup journey have not been verified in this audit.

The links for the latest audit and this document are prepared for publication. Confirm the files are visible on GitHub before using them as submission evidence; authentication blocked the latest push in the current session.
