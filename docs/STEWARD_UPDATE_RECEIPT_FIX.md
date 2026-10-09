# Steward update: receipt parsing after transaction submission

The steward reported `((intermediate value) || []) is not iterable` after initiating a transaction.

## Cause and fix

The frontend treated `consensus_data.votes` as an array and spread it into execution receipts. The installed GenLayer SDK declares this field as `Record<string, string>`: a map of validator votes. Spreading this object throws before contract readback.

The frontend now reads execution receipts from the leader and validator arrays only, with explicit array checks. Vote maps are not execution receipts. Finality and execution errors are checked before proceeding to authoritative state readback.

Regression tests reproduce the SDK vote map and verify that pending transactions and execution errors are rejected. The existing contract address remains `0x3A03347dBA24C3a7fa1511Dd698B9D8dfA334B2a`.

## Retest

Open [MandateLock](https://mandatelock.vercel.app), connect a StudioNet wallet, and click SYNC LEDGER. Check the namespace used for the previous transaction before attempting another write: the reported JavaScript error does not establish whether that transaction succeeded. If it exists, continue from that state; otherwise create an unused namespace.

The screenshot does not include a transaction hash, so the outcome of the steward's specific transaction has not been independently verified. Existing [live transaction evidence](LIVE_STUDIONET_EVIDENCE.md) remains available.
