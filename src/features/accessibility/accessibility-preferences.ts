export const accessibilityStorageKey = "smart-triage:accessibility:v1";

export type ColorMode = "default" | "high-contrast" | "grayscale" | "protanopia" | "deuteranopia" | "tritanopia";
export type FontScale = "100" | "115" | "130" | "150";
export type TextSpacing = "default" | "comfortable" | "wide";

export type AccessibilityPreferences = {
  colorMode: ColorMode;
  fontScale: FontScale;
  textSpacing: TextSpacing;
  reduceMotion: boolean;
  focusNarration: boolean;
  simplifiedReading: boolean;
};

export const defaultAccessibilityPreferences: AccessibilityPreferences = {
  colorMode: "default",
  fontScale: "100",
  textSpacing: "default",
  reduceMotion: false,
  focusNarration: false,
  simplifiedReading: false,
};

const colorModes = new Set<ColorMode>(["default", "high-contrast", "grayscale", "protanopia", "deuteranopia", "tritanopia"]);
const fontScales = new Set<FontScale>(["100", "115", "130", "150"]);
const textSpacings = new Set<TextSpacing>(["default", "comfortable", "wide"]);

export function parseAccessibilityPreferences(value: string | null): AccessibilityPreferences {
  if (!value) return defaultAccessibilityPreferences;
  try {
    const parsed = JSON.parse(value) as Partial<AccessibilityPreferences>;
    return {
      colorMode: colorModes.has(parsed.colorMode as ColorMode) ? parsed.colorMode as ColorMode : "default",
      fontScale: fontScales.has(parsed.fontScale as FontScale) ? parsed.fontScale as FontScale : "100",
      textSpacing: textSpacings.has(parsed.textSpacing as TextSpacing) ? parsed.textSpacing as TextSpacing : "default",
      reduceMotion: parsed.reduceMotion === true,
      focusNarration: parsed.focusNarration === true,
      simplifiedReading: parsed.simplifiedReading === true,
    };
  } catch { return defaultAccessibilityPreferences; }
}
