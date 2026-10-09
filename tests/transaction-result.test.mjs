import test from "node:test";
import assert from "node:assert/strict";
import { assertSuccessfulFinality } from "../lib/transaction-result.mjs";

test("SDK vote map does not crash finalized receipt parsing", () => {
  assert.doesNotThrow(() => assertSuccessfulFinality({
    statusName: "FINALIZED", txExecutionResultName: "SUCCESS",
    consensus_data: { votes: { "0xvalidator": "agree" }, validators: [{ execution_result: "SUCCESS" }] }
  }));
});
test("execution errors and pending consensus cannot report success", () => {
  for (const tx of [
    { statusName: "ACCEPTED" },
    { statusName: "FINALIZED", txExecutionResultName: "ERROR" },
    { statusName: "FINALIZED", consensus_data: { validators: [{ execution_result: "ERROR" }] } }
  ]) assert.throws(() => assertSuccessfulFinality(tx));
});
