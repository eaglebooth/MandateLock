# MandateLock V1 — Live StudioNet Evidence

## Deployment

- Network: GenLayer StudioNet (`61999`)
- Contract: [`0x3A03347dBA24C3a7fa1511Dd698B9D8dfA334B2a`](https://explorer-studio.genlayer.com/address/0x3A03347dBA24C3a7fa1511Dd698B9D8dfA334B2a)
- Schema: `semantic-treasury-execution-firewall-v1`, version `1`
- Verified run: `1273691700`
- Raw evidence: [`live-evidence/studionet-1273691700.json`](live-evidence/studionet-1273691700.json)
- Wallet A: DAO authority and mandate publisher `0xeb57bc7125fa60d7482CE12058397369AB3581f8`
- Wallet B: assigned executor `0x2da5393d7BBb9A037dc3abB56DbbC5C150fc843f`
- Deploy wallet involvement after deployment: none

## Finalized transaction trail

All 18 transactions reached `FINALIZED`; execution matched the expected success or rejection.

| Scenario | Execution | Explorer |
|---|---|---|
| Create DAO namespace | SUCCESS | [tx](https://explorer-studio.genlayer.com/tx/0xdc36d1da09adb5c24078f46dfb1be83a57df666abf7dd4a4e37eaee1bedf3b33) |
| Enable publisher | SUCCESS | [tx](https://explorer-studio.genlayer.com/tx/0xf8740582238dadd433223cc92db45042e72ec98769c9e1859de22e3475b409a4) |
| Enable executor | SUCCESS | [tx](https://explorer-studio.genlayer.com/tx/0x26b700c49864961d5b83b17b2e263b0e761e9adac7fe5c39752c467ae5144717) |
| Record mandate | SUCCESS | [tx](https://explorer-studio.genlayer.com/tx/0x023ebf71f84c165a90fbb87b560847329626438594f0448d645aeef26a1b9423) |
| Seal compliant action | SUCCESS | [tx](https://explorer-studio.genlayer.com/tx/0xd91922fd71d60fd9ad106e069160ca34331e5131e24ab0426b5c1724c4c8eded) |
| Assess compliant action | SUCCESS | [tx](https://explorer-studio.genlayer.com/tx/0xfa358eae071c3d63b4eaab620206d1fc64082b9f00bbe29cb946a020eac65de0) |
| Wrong wallet consumption | ERROR | [tx](https://explorer-studio.genlayer.com/tx/0xdd918a1ce85d5d9049b0de896ba8700652f5876a55fb7b0cf349205b66ef6a5d) |
| Calldata digest substitution | ERROR | [tx](https://explorer-studio.genlayer.com/tx/0x4632f42cd324b241c52d3044685db389990023ba6b47750f2f4e6b4c6f423803) |
| Revise while permit open | ERROR | [tx](https://explorer-studio.genlayer.com/tx/0xfda0480b4cae6e8d1e20ee77cb9aba74c3dd4f33c200fd09da9d4e140b3c49f1) |
| Assigned executor consumes | SUCCESS | [tx](https://explorer-studio.genlayer.com/tx/0xf8dee2839c420e78baef53797adcaaf2d198ff56d4c0e47a7b629c6fcb0ffc28) |
| Replay consumption | ERROR | [tx](https://explorer-studio.genlayer.com/tx/0x13dff596f35c6cc660a8f1ba01bf7d251443315ee32cbce37135b140a6314d59) |
| Seal excessive-value action | SUCCESS | [tx](https://explorer-studio.genlayer.com/tx/0x08e132be5b64197ba4299593ff42b35b696facf198d9e51950e0964611b1a483) |
| Assess excessive value | SUCCESS | [tx](https://explorer-studio.genlayer.com/tx/0x95486c86891e0f6ff9d2dd5bc895ff592ae9517bcb916249a75aaa5dd7890204) |
| Seal semantic conflict | SUCCESS | [tx](https://explorer-studio.genlayer.com/tx/0x42b1f67ba089d9035f7a94080aba3ce5235fc7e8381161a889a6e6ccd6afe39d) |
| Assess semantic conflict | SUCCESS | [tx](https://explorer-studio.genlayer.com/tx/0x73bcf5d0687b591447002cb9979672f3ba72a0d1c4f1600e835a1656ad9f39f7) |
| Seal future-stale action | SUCCESS | [tx](https://explorer-studio.genlayer.com/tx/0xcd345243a57cd77d0fd52ffc2566a66eda92404bbd3990f01c631340c42d146d) |
| Advance mandate revision | SUCCESS | [tx](https://explorer-studio.genlayer.com/tx/0x2e34938c8cbe2d9548cdca74fc0bc0aa49d3fae0b596c38d77ae0de696d7eeef) |
| Assess stale action | ERROR | [tx](https://explorer-studio.genlayer.com/tx/0x2fb5911c0a08663da7c80013b4334d2186c9b8f9bf7b38cadf349be4f6a7d8b3) |

## Authoritative readback

- Compliant action: `CONSUMED`, verdict `COMPLIANT`, permit consumed once.
- Excessive-value action: `BLOCKED`, verdict `SCOPE_EXCEEDED`, violation `VALUE_EXCEEDS_CAP`, no permit.
- Semantic conflict: `BLOCKED`, no permit.
- Stale action: remains `PENDING_ASSESSMENT`; rejected call preserved complete state.
- Run namespace: one mandate and one consumed permit.
- Global state: zero open permits.

The deployment also contains two completed lifecycle attempts whose host sessions detached before evidence capture. Therefore global totals are larger than one. The verified run is isolated by DAO namespace and its exact 18-transaction trail; the raw evidence records this explicitly.

## Evidence scope

This proves mandate-to-action consistency enforcement and exact single-use permit consumption. The Snapshot URL in this demo is a public locator, not proof of a real passed vote. The project does not claim that an external treasury transfer occurred.
