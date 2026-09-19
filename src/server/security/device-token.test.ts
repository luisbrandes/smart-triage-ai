import { beforeEach, describe, expect, it } from "vitest";

import { generateDeviceToken, hashDeviceToken, readBearerToken } from "@/server/security/device-token";

describe("token de dispositivo", () => {
  beforeEach(() => { process.env.DEVICE_TOKEN_PEPPER = "pepper-exclusivo-de-teste-com-mais-de-32-caracteres"; });

  it("gera token opaco e persiste somente hash determinístico", () => {
    const token = generateDeviceToken();
    expect(token).toMatch(/^stdev_[A-Za-z0-9_-]{40,}$/);
    expect(hashDeviceToken(token)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashDeviceToken(token)).not.toContain(token);
  });

  it("aceita somente Authorization Bearer no formato do dispositivo", () => {
    const token = generateDeviceToken();
    expect(readBearerToken(new Request("https://example.test", { headers: { Authorization: `Bearer ${token}` } }))).toBe(token);
    expect(readBearerToken(new Request("https://example.test", { headers: { Authorization: "Bearer inválido" } }))).toBeNull();
    expect(readBearerToken(new Request("https://example.test"))).toBeNull();
  });
});
