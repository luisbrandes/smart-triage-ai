import { NextResponse } from "next/server";

import { DeviceCollectionSessionError } from "@/server/application/device-collection-sessions/device-collection-session-errors";
import { getDeviceCollectionSession } from "@/server/application/device-collection-sessions/device-collection-session-use-cases";
import { PrismaDeviceCollectionSessionRepository } from "@/server/repositories/prisma-device-collection-session-repository";

export const runtime = "nodejs";

const repository = new PrismaDeviceCollectionSessionRepository();

export async function GET(_request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId)) {
    return NextResponse.json({ error: "sessionId inválido." }, { status: 400 });
  }

  try {
    const session = await getDeviceCollectionSession(repository, sessionId);
    return NextResponse.json({
      sessionId: session.sessionId,
      deviceId: session.deviceId,
      status: session.status,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      cancelledAt: session.cancelledAt,
      readings: session.readings.map((reading) => ({
        readingId: reading.readingId,
        bpm: reading.bpm,
        spo2: reading.spo2,
        temperatura: reading.temperatura,
        receivedAt: reading.receivedAt,
      })),
    });
  } catch (error) {
    if (error instanceof DeviceCollectionSessionError) {
      return NextResponse.json({ error: "Sessão não encontrada." }, { status: 404 });
    }
    return NextResponse.json({ error: "Não foi possível consultar a sessão." }, { status: 500 });
  }
}
