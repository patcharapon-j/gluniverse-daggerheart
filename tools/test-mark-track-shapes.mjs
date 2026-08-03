import assert from "node:assert/strict";
import { markShapeSignature } from "../src/module/sheets/parts/marks.ts";

const base = {
  kind: "hp",
  label: "Damage",
  total: 6,
  span: 7,
  head: true,
  vuln: false,
  damage: { major: 8, severe: 15, massive: false },
};
const signature = markShapeSignature(base);

for (const changed of [
  { kind: "stress" },
  { label: "Stress" },
  { total: 7 },
  { span: 8 },
  { head: false },
  { vuln: true },
  { damage: { ...base.damage, major: 9 } },
  { damage: { ...base.damage, severe: 16 } },
  { damage: { ...base.damage, massive: true } },
  { damage: undefined },
]) {
  assert.notEqual(markShapeSignature({ ...base, ...changed }), signature);
}

console.log("mark tracks: every DOM-shape input invalidates frozen markup");
