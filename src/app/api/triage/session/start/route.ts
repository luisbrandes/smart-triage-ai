import { NextResponse } from "next/server";

import { DeviceCollectionSessionError } from "@/server/application/device-collection-sessions/device-collection-session-errors";
import { startDeviceCollectionSession } from "@/server/application/device-collection-sessions/device-collection-session-use-cases";
import { startDeviceCollectionSessionSchema } from "@/server/application/device-collection-sessions/device-collection-session-validation";
import { PrismaDeviceCollectionSessionRepository } from "@/server/repositories/prisma-device-collection-session-repository";
import { authorizedPatientTriageId } from "@/server/patient-device-session-authorization";

export const runtime = "nodejs";
const repository = new PrismaDeviceCollectionSessionRepository();

export async function POST(request: Request) {
  const triageId = await authorizedPatientTriageId();
  if (!triageId) return NextResponse.json({ error: "Sessão do paciente inválida." }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "JSON inválido." }, { status: 400 }); }
  const parsed = startDeviceCollectionSessionSchema.safeParse(body);
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
