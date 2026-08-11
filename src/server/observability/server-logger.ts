import "server-only";

type LogEntry = { operation: string; correlationId: string; actorType: "PATIENT" | "NURSE" | "SYSTEM"; entity: string; state?: string; result: "SUCCESS" | "FAILURE" | "CONFLICT"; errorCode?: string; durationMs?: number };

export function logServerOperation(entry: LogEntry): void {
  const serialized = JSON.stringify({ timestamp: new Date().toISOString(), ...entry });
  if (entry.result === "FAILURE") console.error(serialized);
  else console.info(serialized);
}
