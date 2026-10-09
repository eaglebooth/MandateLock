export function executionOutcome(tx) {
  const consensus = tx.consensus_data || {};
  const leaders = Array.isArray(consensus.leader_receipt) ? consensus.leader_receipt : [];
  const validators = Array.isArray(consensus.validators) ? consensus.validators : [];
  const agreed = validators.filter(receipt => receipt.vote === "agree");
  const receipts = agreed.length ? agreed : leaders.slice(-1);
  const execution = String(tx.txExecutionResultName || "").toUpperCase();
  const failed = execution.includes("ERROR") || receipts.some(receipt =>
    String(receipt.execution_result || "").toUpperCase().includes("ERROR")
  );
  const succeeded = execution === "SUCCESS" || receipts.some(receipt =>
    String(receipt.execution_result || "").toUpperCase() === "SUCCESS"
  );
  return failed ? "ERROR" : succeeded ? "SUCCESS" : "UNKNOWN";
}
export function assertSuccessfulFinality(tx) {
  if (String(tx.statusName || "").toUpperCase() !== "FINALIZED" || executionOutcome(tx) !== "SUCCESS") {
    throw new Error("Transaction has not finalized successfully");
  }
}

export async function waitForFinalized(getTransaction, { attempts = 360, interval = 2500 } = {}) {
  for (let i = 0; i < attempts; i++) {
    const tx = await getTransaction();
    const status = String(tx?.statusName || "").toUpperCase();
    if (status === "FINALIZED" && executionOutcome(tx) !== "UNKNOWN") { assertSuccessfulFinality(tx); return tx; }
    if (["CANCELED", "UNDETERMINED", "LEADER_TIMEOUT", "VALIDATORS_TIMEOUT"].includes(status)) {
      throw new Error(`Transaction stopped with ${status}; inspect its Explorer link`);
    }
    if (i + 1 < attempts) await new Promise(resolve => setTimeout(resolve, interval));
  }
  throw new Error("Consensus timeout; transaction may still finalize. Inspect Explorer and sync before retrying");
}
