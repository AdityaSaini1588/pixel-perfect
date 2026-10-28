import { describe, expect, it } from "vitest";
import { PRESETS, scoreRisk } from "@/lib/bioauth";
const live = { dwell: 72, flight: 95 };
describe("risk engine", () => {
  it("normal mode stays under 25%", () => { for (let i = 0; i < 50; i++) expect(scoreRisk("normal", live, PRESETS.fast).risk).toBeLessThan(25); });
  it("bot mode produces exactly 95% risk", () => { for (let i = 0; i < 50; i++) expect(scoreRisk("bot", live, PRESETS.fast).risk).toBe(95); });
  it("erratic mode produces exactly 55% risk", () => { for (let i = 0; i < 50; i++) expect(scoreRisk("erratic", live, PRESETS.fast).risk).toBe(55); });
});
