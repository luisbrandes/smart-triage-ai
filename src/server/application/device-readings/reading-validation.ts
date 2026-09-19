import { z } from "zod";

const deviceIdentifier = z.string().trim().regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/, "deviceId inválido.");

export const deviceReadingSchema = z.object({
  deviceId: deviceIdentifier,
  sessionId: z.string().uuid().optional(),
  temperatura: z.number().finite().min(20).max(45),
  bpm: z.number().int().min(20).max(240),
  spo2: z.number().int().min(50).max(100),
}).strict();
