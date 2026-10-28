import { describe, expect, it } from "vitest";
import { PRESETS, scoreRisk } from "@/lib/bioauth";
const live = { dwell: 72, flight: 95 };
describe("risk engine", () => {
  it("normal mode stays under 25%", () => { for (let i = 0; i < 50; i++) expect(scoreRisk("normal", live, PRESETS.fast).risk).toBeLessThan(25); });
  it("bot mode is ~95% (high risk)", () => { for (let i = 0; i < 50; i++) expect(scoreRisk("bot", live, PRESETS.fast).risk).toBeGreaterThan(90); });
  it("erratic mode falls in step-up band 40-70", () => { for (let i = 0; i < 50; i++) { const r = scoreRisk("erratic", live, PRESETS.fast).risk; expect(r).toBeGreaterThanOrEqual(40); expect(r).toBeLessThanOrEqual(70); } });
});
