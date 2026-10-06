import { mkdirSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { createAccount, createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

const CONTRACT = process.argv[2];
if (!/^0x[0-9a-fA-F]{40}$/.test(CONTRACT || "")) throw new Error("Usage: node scripts/live-e2e.mjs <contract-address> [run-id]");
const run = process.argv[3] || Date.now().toString().slice(-10);
const DAO = `mandate-${run}`, MANDATE = `${DAO}.proposal-${run}`;
const ids = { pass: `${MANDATE}.pass`, overflow: `${MANDATE}.overflow`, conflict: `${MANDATE}.conflict`, stale: `${MANDATE}.stale` };
const TARGET = "0x1111111111111111111111111111111111111111", ASSET = "0x2222222222222222222222222222222222222222", RECIPIENT = "0x3333333333333333333333333333333333333333";
const CALLDATA = "a".repeat(64);
const TEXT = "Authorize one payment up to 5000 units solely for an independent smart-contract security audit. Recurring streams, grants, swaps, and unrelated transfers are prohibited.";
const SAFE = "Execute one payment of 4000 units for the independent smart-contract security audit. No recurring stream, grant, swap, or additional side effect.";
const CONFLICT = "Create a recurring monthly payment stream of 4000 units for general operations and grants.";

async function readKeys() {
  const rl = createInterface({ input: process.stdin, terminal: false }), lines = [];
  return await new Promise((resolve, reject) => {
    rl.on("line", line => { const value = line.trim().replace(/^0x/, ""); if (value) lines.push(value); if (lines.length === 2) { rl.close(); resolve(lines); } });
    rl.on("close", () => { if (lines.length < 2) reject(new Error("Two wallet credentials required on stdin")); });
  });
}
const [keyA, keyB] = await readKeys();
const walletA = createAccount(`0x${keyA}`), walletB = createAccount(`0x${keyB}`);
const clientA = createClient({ chain: studionet, account: walletA }), clientB = createClient({ chain: studionet, account: walletB });
const report = { contract: CONTRACT, network: "GenLayer StudioNet 61999", run, dao: DAO, mandate: MANDATE, actors: { dao_authority_publisher: walletA.address, executor: walletB.address }, transactions: [], assertions: [], final: {} };
mkdirSync("docs/live-evidence", { recursive: true });
const path = `docs/live-evidence/studionet-${run}.json`, save = () => writeFileSync(path, `${JSON.stringify(report, null, 2)}\n`);
const check = (condition, label, details = {}) => { report.assertions.push({ label, pass: Boolean(condition), details }); save(); if (!condition) throw new Error(`Assertion failed: ${label}`); };
const read = async (method, args = []) => JSON.parse(await clientA.readContract({ address: CONTRACT, functionName: method, args }));
const execution = tx => { const vs = tx.consensus_data?.validators || []; if (vs.some(v => v.vote === "agree" && v.execution_result === "SUCCESS")) return "SUCCESS"; if (vs.some(v => v.vote === "agree" && v.execution_result === "ERROR")) return "ERROR"; const l = tx.consensus_data?.leader_receipt?.[0]?.genvm_result; return l && !l.error_code ? "SUCCESS" : l?.error_code ? "ERROR" : "UNKNOWN"; };
const write = async (label, client, method, args, expected = "SUCCESS") => {
  const raw = await client.writeContract({ address: CONTRACT, functionName: method, args, value: BigInt(0) }), hash = typeof raw === "string" ? raw : raw?.txId;
  process.stdout.write(`${label}: ${hash}\n`); let tx = {};
  for (let i = 0; i < 360; i++) { try { tx = await client.getTransaction({ hash }); } catch { await new Promise(r => setTimeout(r, 2500)); continue; } if (["FINALIZED", "CANCELED", "UNDETERMINED"].includes(tx.statusName)) break; await new Promise(r => setTimeout(r, 2500)); }
  const actual = execution(tx); report.transactions.push({ label, method, expected, hash, status: tx.statusName || "UNKNOWN", execution: actual }); save();
  check(tx.statusName === "FINALIZED" && actual === expected, `${label} finalized with ${expected}`, { hash, status: tx.statusName, execution: actual });
};

const version = await read("get_contract_version"); check(version.schema === "semantic-treasury-execution-firewall-v1" && version.version === 1, "deployed MandateLock V1 identity", version);
await write("wallet A creates DAO namespace", clientA, "create_dao", [DAO]);
await write("wallet A enables itself as publisher", clientA, "set_publisher", [DAO, walletA.address, true]);
await write("wallet A enables wallet B as executor", clientA, "set_executor", [DAO, walletB.address, true]);
await write("publisher records exact mandate", clientA, "publish_mandate", [MANDATE, DAO, "https://snapshot.org/#/mandatelock-demo", `observed-${run}`, TEXT, BigInt(1), TARGET, ASSET, RECIPIENT, BigInt(5000)]);
await write("publisher seals compliant action", clientA, "seal_action", [ids.pass, MANDATE, BigInt(1), TARGET, ASSET, RECIPIENT, BigInt(4000), CALLDATA, SAFE, walletB.address, `pass-${run}`]);
await write("wallet B triggers compliant assessment", clientB, "assess_action", [ids.pass]);
let pass = await read("get_action", [ids.pass]); check(pass.status === "AUTHORIZED" && pass.verdict === "COMPLIANT" && Boolean(pass.permit_digest), "compliant action creates exact permit", pass);
await write("wrong wallet cannot consume", clientA, "consume_permit", [ids.pass, CALLDATA, `pass-${run}`], "ERROR");
await write("digest substitution cannot consume", clientB, "consume_permit", [ids.pass, "b".repeat(64), `pass-${run}`], "ERROR");
await write("open permit blocks mandate revision", clientA, "revise_mandate", [MANDATE, "https://snapshot.org/#/mandatelock-demo", `blocked-${run}`, TEXT, BigInt(1), TARGET, ASSET, RECIPIENT, BigInt(5000)], "ERROR");
await write("assigned executor consumes exact permit", clientB, "consume_permit", [ids.pass, CALLDATA, `pass-${run}`]);
pass = await read("get_action", [ids.pass]); check(pass.status === "CONSUMED" && pass.consumed === true, "permit consumed exactly once", pass);
await write("replay is rejected", clientB, "consume_permit", [ids.pass, CALLDATA, `pass-${run}`], "ERROR");
await write("publisher seals deterministic overflow", clientA, "seal_action", [ids.overflow, MANDATE, BigInt(1), TARGET, ASSET, RECIPIENT, BigInt(7500), "c".repeat(64), SAFE, walletB.address, `overflow-${run}`]);
await write("overflow assessment is deterministic", clientB, "assess_action", [ids.overflow]);
const overflow = await read("get_action", [ids.overflow]); check(overflow.status === "BLOCKED" && overflow.verdict === "SCOPE_EXCEEDED" && overflow.violations.includes("VALUE_EXCEEDS_CAP") && !overflow.permit_digest, "overflow blocks without permit", overflow);
await write("publisher seals semantic conflict", clientA, "seal_action", [ids.conflict, MANDATE, BigInt(1), TARGET, ASSET, RECIPIENT, BigInt(4000), "d".repeat(64), CONFLICT, walletB.address, `conflict-${run}`]);
await write("wallet B triggers conflict assessment", clientB, "assess_action", [ids.conflict]);
const conflict = await read("get_action", [ids.conflict]); check(conflict.status === "BLOCKED" && ["CONTRADICTORY", "SCOPE_EXCEEDED", "INSUFFICIENT"].includes(conflict.verdict) && !conflict.permit_digest, "semantic conflict never creates permit", conflict);
await write("publisher seals future-stale action", clientA, "seal_action", [ids.stale, MANDATE, BigInt(1), TARGET, ASSET, RECIPIENT, BigInt(3000), "e".repeat(64), SAFE, walletB.address, `stale-${run}`]);
await write("publisher advances mandate revision", clientA, "revise_mandate", [MANDATE, "https://snapshot.org/#/mandatelock-demo", `amended-${run}`, TEXT + " Reporting must be delivered after completion.", BigInt(1), TARGET, ASSET, RECIPIENT, BigInt(5000)]);
const staleBefore = await read("get_action", [ids.stale]); await write("stale action assessment is rejected", clientB, "assess_action", [ids.stale], "ERROR"); const staleAfter = await read("get_action", [ids.stale]); check(JSON.stringify(staleBefore) === JSON.stringify(staleAfter), "stale rejection preserves action state", { before: staleBefore, after: staleAfter });
const mandateState = await read("get_mandate", [MANDATE]), daoState = await read("get_dao", [DAO]), stats = await read("get_stats"); check(stats.open_permits === 0 && stats.consumed >= 1 && daoState.consumed_count === 1 && daoState.mandate_count === 1, "namespace counters and global open-permit invariant", { mandate: mandateState, dao: daoState, stats });
report.final = { version, pass, overflow, conflict, stale: staleAfter, mandate: mandateState, dao: daoState, stats }; save(); process.stdout.write(`Evidence: ${path}\n`);
