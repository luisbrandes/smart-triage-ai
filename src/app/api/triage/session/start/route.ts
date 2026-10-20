import { NextResponse } from "next/server";
import { readJsonBody } from "@/server/http/read-json-body";

import { DeviceCollectionSessionError } from "@/server/application/device-collection-sessions/device-collection-session-errors";
import { startDeviceCollectionSession } from "@/server/application/device-collection-sessions/device-collection-session-use-cases";
import { startDeviceCollectionSessionSchema } from "@/server/application/device-collection-sessions/device-collection-session-validation";
import { PrismaDeviceCollectionSessionRepository } from "@/server/repositories/prisma-device-collection-session-repository";
import { authorizedPatientTriageId } from "@/server/patient-device-session-authorization";
import { rateLimitResponse } from "@/server/http/rate-limit-response";

export const runtime = "nodejs";
const repository = new PrismaDeviceCollectionSessionRepository();

export async function POST(request: Request) {
  const triageId = await authorizedPatientTriageId();
  if (!triageId) return NextResponse.json({ error: "Sessão do paciente inválida." }, { status: 401 });
  const limited = await rateLimitResponse("api:triage-session-start", { limit: 10, windowMs: 10 * 60_000 }, triageId);
  if (limited) return limited;
  const body = await readJsonBody(request);
  if (!body.ok) {
    return NextResponse.json(
      { error: body.reason === "TOO_LARGE" ? "Payload muito grande." : "JSON invalido." },
      { status: body.reason === "TOO_LARGE" ? 413 : 400 },
    );
  }
  const parsed = startDeviceCollectionSessionSchema.safeParse(body.value);
  const configuredDeviceId = process.env.TRIAGE_DEVICE_ID;
  if (parsed.success && (!configuredDeviceId || parsed.data.deviceId !== configuredDeviceId)) return NextResponse.json({ error: "Dispositivo indisponível para este ambiente." }, { status: 403 });
  if (!parsed.success) return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  try {
    const session = await startDeviceCollectionSession(repository, parsed.data.deviceId, triageId);
    return NextResponse.json({ sessionId: session.sessionId, status: session.status }, { status: 201 });
  } catch (error) {
    if (error instanceof DeviceCollectionSessionError) return NextResponse.json({ error: "Não foi possível iniciar a sessão." }, { status: error.code === "ACTIVE_SESSION_EXISTS" ? 409 : 404 });
    return NextResponse.json({ error: "Não foi possível iniciar a sessão." }, { status: 500 });
  }
}
