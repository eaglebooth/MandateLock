# Frontend transaction consistency audit

Production: https://mandatelock.vercel.app

Contract remains `0x3A03347dBA24C3a7fa1511Dd698B9D8dfA334B2a`.

## Changes verified

- Receipt normalization handles vote maps, delayed execution fields, and idle validators stopped after quorum. Only accepted execution evidence can establish success.
- Pending, canceled, undetermined, RPC failures and execution errors cannot show VERIFIED.
- Reads use `latest-final`. VERIFIED additionally requires changed target state, the expected transition, complete ledger synchronization and the same wallet/context.
- Submit is locked during signing, consensus and readback; IDs cannot be edited during a write.
- Wallet/network/ID changes invalidate stale authority and ledger data.
- Seal requires the exact registered publisher and an active mandate; consumption requires the assigned registered executor.
- DAO/mandate/action relationships are checked before enabling writes.
- Session recovery retains the transaction link and blocks another write while the previous transaction is unresolved, including after unrelated ID changes.

## Browser regression evidence

[`browser-evidence/report.json`](browser-evidence/report.json) records 24 passing browser scenarios against the production bundle. The injected wallet and RPC responses in these cases are mocked. Screenshots are stored beside the report. These tests prove UI behavior under controlled conditions, not live consensus or manual MetaMask popup behavior.

Coverage includes all six UI procedures, vote maps, signature rejection, execution failure, unchanged state, full-sync failure, wallet/network changes, duplicate clicks, pending refresh, completed refresh, stale responses, RPC failure, canceled/undetermined consensus, revoked roles and mismatched object IDs.

Five receipt/polling regression tests pass with `node --test tests/transaction-result.test.mjs`. ESLint, TypeScript and production build also pass.

## Actual production browser writes

[`browser-live-evidence/1791540108323.json`](browser-live-evidence/1791540108323.json) records two successful signed writes through the production UI, with finalized RPC status and authoritative before/after state:

| Action | Transaction | UI and post-state |
|---|---|---|
| Create DAO | [0x9d7ccb0e36411443526e5c840153d2ee1b99fd1efebeb2e52690997e888d5a71](https://explorer-studio.genlayer.com/tx/0x9d7ccb0e36411443526e5c840153d2ee1b99fd1efebeb2e52690997e888d5a71) | VERIFIED; namespace exists with wallet A as authority |
| Register publisher | [0xd7c40d57e8e45197a0e76a9876b390418d56fa15461899fe0d735d0d33b486b9](https://explorer-studio.genlayer.com/tx/0xd7c40d57e8e45197a0e76a9876b390418d56fa15461899fe0d735d0d33b486b9) | VERIFIED; publisher changes false to true |

Signing used an automated injected provider backed by the authorized test wallet. Private keys were supplied through stdin and are not stored in the repository. No deployer transaction was used in this UI run.

## Limitations and failed attempts

The production run did not complete executor registration or the later lifecycle: direct browser requests to StudioNet returned `net::ERR_FAILED` / `Failed to fetch` during ledger synchronization. The UI stopped and did not report VERIFIED for the failing synchronization. Read retries did not submit duplicate writes. This network issue remains a limitation of the completed production journey.

Earlier partial runs are retained in `browser-live-evidence/`: local run `1791538907407`, production attempts `1791539801456` and `1791539960665` exposed receipt false-errors and were superseded by the receipt fixes. Later retry files record availability failures, not passing full journeys.

The existing [contract lifecycle evidence](LIVE_STUDIONET_EVIDENCE.md) separately proves the contract workflow. It must not be presented as proof of a complete manual browser-wallet journey. No claim is made that every wallet extension/browser combination has been tested.
