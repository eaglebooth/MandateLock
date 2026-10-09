export function assertSuccessfulFinality(tx) {
  const consensus = tx.consensus_data || {};
  const receipts = [consensus.leader_receipt, consensus.validators]
    .flatMap(value => Array.isArray(value) ? value : []);
  const execution = String(tx.txExecutionResultName || "").toUpperCase();
  const failed = execution.includes("ERROR") || receipts.some(receipt =>
    String(receipt.execution_result || "").toUpperCase().includes("ERROR")
  );
  if (String(tx.statusName || "").toUpperCase() !== "FINALIZED" || failed) {
    throw new Error("Transaction has not finalized successfully");
  }
}
