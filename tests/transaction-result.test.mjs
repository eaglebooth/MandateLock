import test from "node:test";
import assert from "node:assert/strict";
import { assertSuccessfulFinality, waitForFinalized } from "../lib/transaction-result.mjs";

test("SDK vote map does not crash finalized receipt parsing", () => {
  assert.doesNotThrow(() => assertSuccessfulFinality({
    statusName: "FINALIZED", txExecutionResultName: "SUCCESS",
    consensus_data: { votes: { "0xvalidator": "agree" }, validators: [{ execution_result: "SUCCESS" }] }
  }));
});
test("pending and accepted wait until successful finality", async () => {
  const states=[{statusName:"PENDING"},{statusName:"ACCEPTED"},{statusName:"FINALIZED"},{statusName:"FINALIZED",txExecutionResultName:"SUCCESS"}];
  const tx=await waitForFinalized(async()=>states.shift(),{attempts:4,interval:0});
  assert.equal(tx.statusName,"FINALIZED");
});
test("terminal failures, consensus timeout and RPC failure stop without success", async()=>{
  for(const statusName of ["CANCELED","UNDETERMINED","LEADER_TIMEOUT","VALIDATORS_TIMEOUT"])
    await assert.rejects(waitForFinalized(async()=>({statusName}),{attempts:2,interval:0}),new RegExp(statusName));
  await assert.rejects(waitForFinalized(async()=>({statusName:"PENDING"}),{attempts:1,interval:0}),/Consensus timeout/);
  await assert.rejects(waitForFinalized(async()=>{throw new Error("RPC unavailable")}),/RPC unavailable/);
});
test("execution errors and pending consensus cannot report success", () => {
  for (const tx of [
    { statusName: "ACCEPTED" },
    { statusName: "FINALIZED" },
    { statusName: "FINALIZED", txExecutionResultName: "ERROR" },
    { statusName: "FINALIZED", consensus_data: { validators: [{ vote:"agree", execution_result: "ERROR" }] } }
  ]) assert.throws(() => assertSuccessfulFinality(tx));
});
test("idle quorum-stopped validators do not override agreed successful execution",()=>{
  assert.doesNotThrow(()=>assertSuccessfulFinality({statusName:"FINALIZED",consensus_data:{validators:[
    {vote:"idle",execution_result:"ERROR",genvm_result:{error_code:"CONSENSUS_VALIDATOR_QUORUM_REACHED"}},
    {vote:"agree",execution_result:"SUCCESS"}
  ]}}));
});
