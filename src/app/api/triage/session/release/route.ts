import { NextResponse } from "next/server";

import { DeviceCollectionSessionError } from "@/server/application/device-collection-sessions/device-collection-session-errors";
import { releaseDeviceCollectionSession } from "@/server/application/device-collection-sessions/device-collection-session-use-cases";
import { releaseDeviceCollectionSessionSchema } from "@/server/application/device-collection-sessions/device-collection-session-validation";
import { PrismaDeviceCollectionSessionRepository } from "@/server/repositories/prisma-device-collection-session-repository";
import { authenticateDeviceRequest } from "@/server/device-authentication";

export const runtime = "nodejs";
const repository = new PrismaDeviceCollectionSessionRepository();

export async function POST(request: Request) {
  const device = await authenticateDeviceRequest(request);
  if (!device) return NextResponse.json({ error: "Dispositivo não autorizado." }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "JSON inválido." }, { status: 400 }); }
  const parsed = releaseDeviceCollectionSessionSchema.safeParse(body);
  if (parsed.success && parsed.data.deviceId !== device.deviceId) return NextResponse.json({ error: "Dispositivo não autorizado para este identificador." }, { status: 403 });
  if (!parsed.success) return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  try {
    const session = await releaseDeviceCollectionSession(repository, parsed.data.deviceId, parsed.data.sessionId);
    return NextResponse.json({ sessionId: session.sessionId, status: session.status });
  } catch (error) {
    if (error instanceof DeviceCollectionSessionError) return NextResponse.json({ error: "Dispositivo não encontrado." }, { status: 404 });
    return NextResponse.json({ error: "Não foi possível liberar o dispositivo." }, { status: 500 });
  }
}
