import { describe, expect, it } from "vitest";

import { readJsonBody } from "@/server/http/read-json-body";

describe("readJsonBody", () => {
  it("parses a small JSON request", async () => {
    const request = new Request("http://localhost", { method: "POST", body: JSON.stringify({ value: 1 }) });
    await expect(readJsonBody(request)).resolves.toEqual({ ok: true, value: { value: 1 } });
  });

  it("rejects a request over the byte limit from its declared length", async () => {
    const request = new Request("http://localhost", { method: "POST", headers: { "Content-Length": "20" }, body: "{}" });
    await expect(readJsonBody(request, 10)).resolves.toEqual({ ok: false, reason: "TOO_LARGE" });
  });

  it("rejects an oversized stream even when it has no length header", async () => {
    const request = new Request("http://localhost", {
      method: "POST",
      body: new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode("{\"value\":123}")); controller.close(); } }),
      // A stream body is intentionally not assigned Content-Length.
      duplex: "half",
    } as RequestInit);
    await expect(readJsonBody(request, 8)).resolves.toEqual({ ok: false, reason: "TOO_LARGE" });
  });

  it("rejects invalid JSON", async () => {
    const request = new Request("http://localhost", { method: "POST", body: "{" });
    await expect(readJsonBody(request)).resolves.toEqual({ ok: false, reason: "INVALID_JSON" });
  });
});
