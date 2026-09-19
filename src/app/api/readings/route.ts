import { NextResponse } from "next/server";

import { DeviceNotFoundError, DeviceReadingSessionError } from "@/server/application/device-readings/device-reading-errors";
import { recordDeviceReading } from "@/server/application/device-readings/record-device-reading";
import { deviceReadingSchema } from "@/server/application/device-readings/reading-validation";
import { logServerOperation } from "@/server/observability/server-logger";
import { PrismaDeviceReadingRepository } from "@/server/repositories/prisma-device-reading-repository";
import { authenticateDeviceRequest } from "@/server/device-authentication";

export const runtime = "nodejs";

const repository = new PrismaDeviceReadingRepository();

export async function POST(request: Request) {
  const device = await authenticateDeviceRequest(request);
  if (!device) return NextResponse.json({ error: "Dispositivo não autorizado." }, { status: 401 });
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const parsed = deviceReadingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }
  if (parsed.data.deviceId !== device.deviceId) return NextResponse.json({ error: "Dispositivo não autorizado para este identificador." }, { status: 403 });

  try {
    const { readingId } = await recordDeviceReading(repository, parsed.data);
    return NextResponse.json({ success: true, readingId }, { status: 201 });
  } catch (error) {
    if (error instanceof DeviceNotFoundError) {
      return NextResponse.json({ error: "Dispositivo não encontrado." }, { status: 404 });
    }
    if (error instanceof DeviceReadingSessionError) {
      return NextResponse.json({ error: "Sessão de coleta inválida para esta leitura." }, { status: error.code === "SESSION_NOT_FOUND" ? 404 : 409 });
    }

    const errorCode = error instanceof Error && "code" in error && typeof error.code === "string"
      ? error.code
      : error instanceof Error ? error.name : "UNKNOWN_ERROR";
    logServerOperation({
      operation: "device-reading-ingestion",
      correlationId: crypto.randomUUID(),
      actorType: "SYSTEM",
      entity: "Reading",
      result: "FAILURE",
      errorCode,
    });
    return NextResponse.json({ error: "Não foi possível registrar a leitura." }, { status: 500 });
  }
}
