import { NextResponse } from "next/server";

import { authenticateDeviceRequest } from "@/server/device-authentication";
import { PrismaDeviceCollectionSessionRepository } from "@/server/repositories/prisma-device-collection-session-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const repository = new PrismaDeviceCollectionSessionRepository();

export async function GET(request: Request) {
  const device = await authenticateDeviceRequest(request);
  if (!device) return NextResponse.json({ error: "Dispositivo não autorizado." }, { status: 401 });
  const session = await repository.findActiveForDevice(device.internalId);
  return NextResponse.json(session ? { status: "ACTIVE", sessionId: session.sessionId } : { status: "IDLE", sessionId: null }, { headers: { "Cache-Control": "no-store" } });
}
