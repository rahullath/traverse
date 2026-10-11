import { DEFAULT_ANCHOR_CONFIG, type AnchorType } from "./types";

/**
 * Client-safe anchor type suggestion from a title. Mirrors the keyword
 * order used by AnchorService.classifyAnchorType so the plan screen's
 * pre-selection matches what calendar-sourced anchors get server-side.
 */
export function suggestAnchorType(title: string): AnchorType {
  const text = title.toLowerCase();
  const has = (words: string[]) => words.some((w) => text.includes(w));
  const c = DEFAULT_ANCHOR_CONFIG;
  if (has(c.workshopKeywords)) return "workshop";
  if (has(c.classKeywords)) return "class";
  if (has(c.seminarKeywords)) return "seminar";
  if (has(c.appointmentKeywords)) return "appointment";
  return "other";
}
