# MandateLock

MandateLock is a GenLayer dApp that turns one authenticated governance mandate into a revision-bound, single-use treasury execution permit. Validators judge semantic purpose and prohibitions; deterministic contract logic enforces chain, target, asset, recipient, value, calldata digest, executor and nonce.

## Proof boundary

The contract proves consistency between statements authenticated by a namespace-scoped publisher and one sealed execution manifest. It does not prove that a governance vote was legitimate, that a URL is immutable, or that an external treasury transfer occurred. `consume_permit` records consumption of exact on-chain authorization; downstream treasury integration remains outside this demo.

## Authority model

The deployer gets no administrator or operational role. Any wallet, including a reviewer, can claim an unused DAO namespace. Its authenticated sender becomes authority for only that namespace and can register scoped publisher and executor wallets.

## Lifecycle

1. Claim DAO namespace.
2. Register publisher and executor.
3. Publisher records source locator, source revision, mandate text and deterministic scope.
4. Publisher seals exact transaction intent.
5. Any wallet triggers assessment. Exact mismatches fail deterministically; semantic conditions use independent leader/validator judgment.
6. Only `COMPLIANT` creates an execution permit.
7. Assigned, still-registered executor consumes exact digest and nonce once.

## Verification

```powershell
python -m pytest -q -p no:cacheprovider
python -X utf8 -m genvm_linter.cli check contracts\mandate_lock.py
npm run lint
npm run build
```

The UI uses `genlayer-js`, displays the active StudioNet contract and Explorer links, waits for finality, and verifies the expected state through contract readback before showing `VERIFIED`.

Steward resubmission note: [`docs/STEWARD_UPDATE_CHAIN_FIX.md`](docs/STEWARD_UPDATE_CHAIN_FIX.md) documents the frontend chain-mismatch fix, unchanged contract deployment, production URL, and exact verification path.

StudioNet deployment: [`0x3A03347dBA24C3a7fa1511Dd698B9D8dfA334B2a`](https://explorer-studio.genlayer.com/address/0x3A03347dBA24C3a7fa1511Dd698B9D8dfA334B2a).

The finalized two-wallet lifecycle is documented in [`docs/LIVE_STUDIONET_EVIDENCE.md`](docs/LIVE_STUDIONET_EVIDENCE.md): 18 finalized transactions and 25 passing assertions across compliant execution, authorization failures, binding substitution, replay, deterministic scope overflow, semantic conflict and stale-revision rollback.

## Evidence source policy

Mandate content in contract state is an authenticated publisher statement, not independent proof that a proposal passed. A live evidence package must separately link the public governance source and record its retrieved revision. Positive permit tests demonstrate mandate-to-action enforcement only. See [`docs/TEST_RESOURCE_MANIFEST.md`](docs/TEST_RESOURCE_MANIFEST.md) and [`docs/THREAT_MODEL.md`](docs/THREAT_MODEL.md).
