import { z } from "zod";

const deviceId = z.string().trim().regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/);

export const startDeviceCollectionSessionSchema = z.object({ deviceId }).strict();
export const cancelDeviceCollectionSessionSchema = z.object({ sessionId: z.string().uuid() }).strict();
export const releaseDeviceCollectionSessionSchema = z.object({ deviceId, sessionId: z.string().uuid().optional() }).strict();
