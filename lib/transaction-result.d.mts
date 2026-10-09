export function assertSuccessfulFinality(tx: unknown): void;
export function waitForFinalized(getTransaction: () => Promise<unknown>, options?: {attempts?: number; interval?: number}): Promise<unknown>;
