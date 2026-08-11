import { z } from "zod";

export const reclassificationSchema = z.object({ priority: z.enum(["GREEN", "YELLOW", "RED"]), justification: z.string().trim().min(5, "Informe uma justificativa com pelo menos 5 caracteres.").max(500, "Use no máximo 500 caracteres.") });
export const recollectionSchema = z.object({ reason: z.string().trim().min(3, "Informe um motivo curto para a nova coleta.").max(300, "Use no máximo 300 caracteres.") });
export const referralSchema = z.object({ destination: z.string().trim().max(120, "Use no máximo 120 caracteres.").optional().transform((value) => value || undefined), notes: z.string().trim().max(500, "Use no máximo 500 caracteres.").optional().transform((value) => value || undefined) });

export function validationErrors(error: z.ZodError): Record<string, string[]> {
  return z.flattenError(error).fieldErrors as Record<string, string[]>;
}
