import { NextResponse } from "next/server";
import { readJsonBody } from "@/server/http/read-json-body";

import { DeviceCollectionSessionError } from "@/server/application/device-collection-sessions/device-collection-session-errors";
import { releaseDeviceCollectionSession } from "@/server/application/device-collection-sessions/device-collection-session-use-cases";
import { releaseDeviceCollectionSessionSchema } from "@/server/application/device-collection-sessions/device-collection-session-validation";
import { PrismaDeviceCollectionSessionRepository } from "@/server/repositories/prisma-device-collection-session-repository";
import { authenticateDeviceRequest } from "@/server/device-authentication";
import { rateLimitResponse } from "@/server/http/rate-limit-response";

export const runtime = "nodejs";
const repository = new PrismaDeviceCollectionSessionRepository();

export async function POST(request: Request) {
  const ipLimit = await rateLimitResponse("api:triage-session-release:ip", { limit: 120, windowMs: 60_000 });
  if (ipLimit) return ipLimit;
  const device = await authenticateDeviceRequest(request);
  if (!device) return NextResponse.json({ error: "Dispositivo não autorizado." }, { status: 401 });
  const deviceLimit = await rateLimitResponse("api:triage-session-release:device", { limit: 30, windowMs: 60_000 }, device.internalId);
  if (deviceLimit) return deviceLimit;
  const body = await readJsonBody(request);
  if (!body.ok) {
    return NextResponse.json(
      { error: body.reason === "TOO_LARGE" ? "Payload muito grande." : "JSON invalido." },
      { status: body.reason === "TOO_LARGE" ? 413 : 400 },
    );
  }
  const parsed = releaseDeviceCollectionSessionSchema.safeParse(body.value);
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
