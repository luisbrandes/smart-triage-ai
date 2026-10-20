import { NextResponse } from "next/server";

import { DeviceNotFoundError, DeviceReadingSessionError } from "@/server/application/device-readings/device-reading-errors";
import { recordDeviceReading } from "@/server/application/device-readings/record-device-reading";
import { deviceReadingSchema } from "@/server/application/device-readings/reading-validation";
import { logServerOperation } from "@/server/observability/server-logger";
import { PrismaDeviceReadingRepository } from "@/server/repositories/prisma-device-reading-repository";
import { authenticateDeviceRequest } from "@/server/device-authentication";
import { readJsonBody } from "@/server/http/read-json-body";
import { rateLimitResponse } from "@/server/http/rate-limit-response";

export const runtime = "nodejs";

const repository = new PrismaDeviceReadingRepository();

export async function POST(request: Request) {
  const ipLimit = await rateLimitResponse("api:readings:ip", { limit: 120, windowMs: 60_000 });
  if (ipLimit) return ipLimit;
  const device = await authenticateDeviceRequest(request);
  if (!device) return NextResponse.json({ error: "Dispositivo não autorizado." }, { status: 401 });
  const deviceLimit = await rateLimitResponse("api:readings:device", { limit: 60, windowMs: 60_000 }, device.internalId);
  if (deviceLimit) return deviceLimit;
  const body = await readJsonBody(request);
  if (!body.ok) {
    return NextResponse.json(
      { error: body.reason === "TOO_LARGE" ? "Payload muito grande." : "JSON invalido." },
      { status: body.reason === "TOO_LARGE" ? 413 : 400 },
    );
  }
  const parsed = deviceReadingSchema.safeParse(body.value);
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
