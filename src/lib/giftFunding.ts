/** Arredondamento monetário (2 casas). */
export function roundBRL(n: number): number {
  return Math.round(n * 100) / 100
}
