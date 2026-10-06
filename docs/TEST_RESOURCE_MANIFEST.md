# Test resource manifest

## Local fixtures

Behavioral tests use synthetic proposal and action text solely to exercise contract logic. They are not submitted as evidence that a real DAO vote or treasury transfer occurred.

## Live StudioNet evidence requirements

- Exact deployed contract address and source commit.
- Two operational wallets distinct from deployer: wallet A owns namespace/publishes; wallet B executes.
- Public governance URL and retrieved source revision, labeled as externally observed evidence.
- Transaction hashes for namespace, roles, mandate, seal, assessment and consumption.
- Adversarial transactions: excess value, wrong executor, digest mismatch, replay and stale revision.
- Final contract readback and machine-readable assertions.

## Claim-source matrix

| Claim | Authoritative source |
|---|---|
| Contract call finalized | StudioNet Explorer / RPC |
| State changed or did not change | Contract view before and after finality |
| Source page existed at test time | Retrieved public governance source plus timestamp/revision |
| Repository contains exact source/tests | Git commit and file blobs |
| External treasury transferred assets | Not claimed by this project |
