import { NextResponse } from "next/server";

import { DeviceCollectionSessionError } from "@/server/application/device-collection-sessions/device-collection-session-errors";
import { cancelDeviceCollectionSession } from "@/server/application/device-collection-sessions/device-collection-session-use-cases";
import { cancelDeviceCollectionSessionSchema } from "@/server/application/device-collection-sessions/device-collection-session-validation";
import { PrismaDeviceCollectionSessionRepository } from "@/server/repositories/prisma-device-collection-session-repository";
import { authorizedPatientTriageId } from "@/server/patient-device-session-authorization";

export const runtime = "nodejs";
const repository = new PrismaDeviceCollectionSessionRepository();

export async function POST(request: Request) {
  const triageId = await authorizedPatientTriageId();
  if (!triageId) return NextResponse.json({ error: "Sessão do paciente inválida." }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "JSON inválido." }, { status: 400 }); }
  const parsed = cancelDeviceCollectionSessionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  try {
    const session = await cancelDeviceCollectionSession(repository, parsed.data.sessionId, triageId);
    return NextResponse.json({ sessionId: session.sessionId, status: session.status });
  } catch (error) {
    if (error instanceof DeviceCollectionSessionError) return NextResponse.json({ error: "Sessão não encontrada." }, { status: 404 });
    return NextResponse.json({ error: "Não foi possível cancelar a sessão." }, { status: 500 });
  }
}
