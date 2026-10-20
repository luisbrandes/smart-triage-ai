import { NextResponse } from "next/server";
import { readJsonBody } from "@/server/http/read-json-body";

import { DeviceCollectionSessionError } from "@/server/application/device-collection-sessions/device-collection-session-errors";
import { cancelDeviceCollectionSession } from "@/server/application/device-collection-sessions/device-collection-session-use-cases";
import { cancelDeviceCollectionSessionSchema } from "@/server/application/device-collection-sessions/device-collection-session-validation";
import { PrismaDeviceCollectionSessionRepository } from "@/server/repositories/prisma-device-collection-session-repository";
import { authorizedPatientTriageId } from "@/server/patient-device-session-authorization";
import { rateLimitResponse } from "@/server/http/rate-limit-response";

export const runtime = "nodejs";
const repository = new PrismaDeviceCollectionSessionRepository();

export async function POST(request: Request) {
  const triageId = await authorizedPatientTriageId();
  if (!triageId) return NextResponse.json({ error: "Sessão do paciente inválida." }, { status: 401 });
  const limited = await rateLimitResponse("api:triage-session-cancel", { limit: 20, windowMs: 10 * 60_000 }, triageId);
  if (limited) return limited;
  const body = await readJsonBody(request);
  if (!body.ok) {
    return NextResponse.json(
      { error: body.reason === "TOO_LARGE" ? "Payload muito grande." : "JSON invalido." },
      { status: body.reason === "TOO_LARGE" ? 413 : 400 },
    );
  }
  const parsed = cancelDeviceCollectionSessionSchema.safeParse(body.value);
  if (!parsed.success) return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  try {
    const session = await cancelDeviceCollectionSession(repository, parsed.data.sessionId, triageId);
    return NextResponse.json({ sessionId: session.sessionId, status: session.status });
  } catch (error) {
    if (error instanceof DeviceCollectionSessionError) return NextResponse.json({ error: "Sessão não encontrada." }, { status: 404 });
    return NextResponse.json({ error: "Não foi possível cancelar a sessão." }, { status: 500 });
  }
}
