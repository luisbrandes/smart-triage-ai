import { describe, expect, it } from "vitest";

import { defaultAccessibilityPreferences, parseAccessibilityPreferences } from "@/features/accessibility/accessibility-preferences";

describe("preferências de acessibilidade", () => {
  it("usa padrão para armazenamento ausente ou inválido", () => {
    expect(parseAccessibilityPreferences(null)).toEqual(defaultAccessibilityPreferences);
    expect(parseAccessibilityPreferences("inválido")).toEqual(defaultAccessibilityPreferences);
  });

  it("preserva apenas valores reconhecidos", () => {
    expect(parseAccessibilityPreferences(JSON.stringify({ colorMode: "high-contrast", fontScale: "130", textSpacing: "wide", reduceMotion: true, focusNarration: true, simplifiedReading: true }))).toMatchObject({ colorMode: "high-contrast", fontScale: "130", textSpacing: "wide", reduceMotion: true, focusNarration: true, simplifiedReading: true });
    expect(parseAccessibilityPreferences(JSON.stringify({ colorMode: "unknown", fontScale: "999" }))).toMatchObject({ colorMode: "default", fontScale: "100" });
  });
});
