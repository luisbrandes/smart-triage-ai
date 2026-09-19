import { createHmac, randomBytes } from "node:crypto";

const tokenPrefix = "stdev_";

function pepper(): string {
  const value = process.env.DEVICE_TOKEN_PEPPER;
  if (!value || value.length < 32) throw new Error("DEVICE_TOKEN_PEPPER deve possuir ao menos 32 caracteres.");
  return value;
}

export function generateDeviceToken(): string {
  return `${tokenPrefix}${randomBytes(32).toString("base64url")}`;
}

export function hashDeviceToken(token: string): string {
  return createHmac("sha256", pepper()).update(token).digest("hex");
}

export function readBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice(7).trim();
  return token.startsWith(tokenPrefix) && token.length >= 40 ? token : null;
}
