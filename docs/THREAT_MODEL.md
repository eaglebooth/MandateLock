# Threat model

| Threat | Enforcement |
|---|---|
| Deployer privilege | Constructor assigns no role. |
| Cross-DAO ID squatting | DAO IDs cannot contain `.`, mandates require `dao.` prefix, actions require `mandate.` prefix. |
| Caller impersonation | Authority, publisher and executor derive from authenticated transaction sender. |
| Prompt injection | Prompts explicitly treat mandate and manifest as quoted untrusted data. |
| Structured scope bypass | Chain, target, asset, recipient and max value are compared before LLM judgment. |
| Stale mandate | Action binds revision and digest; stale assessment reverts. |
| Replay | Namespace-scoped nonce reservation plus terminal consumed state. |
| Executor revocation | Role is rechecked immediately before consumption. |
| Calldata substitution | Exact SHA-256 digest and nonce rechecked at consumption. |
| Parallel open permits | A mandate can have at most one open authorized permit. |
| False UI success | Client requires finalized execution and expected state readback. |

## Explicit non-claims

- MandateLock does not establish governance legitimacy from self-authored text.
- It does not transfer assets from an external treasury.
- It does not provide real-time deadline enforcement.
- A public URL is a locator, not an immutable commitment unless independently archived and verified.
