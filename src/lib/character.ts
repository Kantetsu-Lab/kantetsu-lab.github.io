import { existsSync } from "node:fs";
import path from "node:path";

/**
 * 本物のドット絵 PNG が public/character/ に置かれていればそれを使い、
 * なければ仮の SVG スプライトにフォールバックする(ビルド時に判定)。
 */
function pick(name: string): string {
  const png = path.join(process.cwd(), "public", "character", `${name}.png`);
  return existsSync(png) ? `/character/${name}.png` : `/character/${name}.svg`;
}

export function getRiderSrc(): string {
  return pick("rider");
}

export function getEngineSrc(): string {
  return pick("engine");
}
