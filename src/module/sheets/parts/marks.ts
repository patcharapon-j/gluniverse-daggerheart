/**
 * The values that determine a mark track's DOM shape.
 *
 * `marked` is deliberately absent: crossing or clearing boxes is animated in
 * place. Everything here can add/remove boxes or redraw the damage band and
 * therefore requires fresh markup.
 */
export interface MarkShape {
  kind: string;
  label: string;
  total: number;
  span?: number;
  head: boolean;
  vuln: boolean;
  damage?: { major: number; severe: number; massive?: boolean };
}

export function markShapeSignature(shape: MarkShape): string {
  return JSON.stringify([
    shape.kind,
    shape.label,
    shape.total,
    shape.span ?? null,
    shape.head,
    shape.vuln,
    shape.damage?.major ?? null,
    shape.damage?.severe ?? null,
    shape.damage?.massive ?? null,
  ]);
}
