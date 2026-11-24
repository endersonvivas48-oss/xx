// Estructura matemática y coordenadas puras del tablero hexagonal 3D
// Módulo puro (TypeScript estándar sin dependencias de React, R3F ni Three.js)

export interface HexCoord {
  id: number;
  q: number;
  r: number;
  worldX: number;
  worldZ: number;
}

export const HEX_RADIUS = 0.74;
export const HEX_WIDTH = Math.sqrt(3) * HEX_RADIUS;
export const HEX_HEIGHT = 2 * HEX_RADIUS;

export const HEX_GRID: HexCoord[] = [];
export const HEX_MAP: Record<number, HexCoord> = {};

// Distribución de filas del tablero:
// 5, 6, 7, 8, 9, 8, 7, 6, 5 (total 61 casillas)
const ROW_DEFS = [
  { celdas: 5, r: -4, qStart: 0 },
  { celdas: 6, r: -3, qStart: -1 },
  { celdas: 7, r: -2, qStart: -2 },
  { celdas: 8, r: -1, qStart: -3 },
  { celdas: 9, r: 0,  qStart: -4 },
  { celdas: 8, r: 1,  qStart: -4 },
  { celdas: 7, r: 2,  qStart: -4 },
  { celdas: 6, r: 3,  qStart: -4 },
  { celdas: 5, r: 4,  qStart: -4 },
];

let currId = 0;
ROW_DEFS.forEach((row) => {
  for (let i = 0; i < row.celdas; i++) {
    const q = row.qStart + i;
    const r = row.r;
    const worldX = HEX_WIDTH * (q + r / 2);
    const worldZ = (HEX_HEIGHT * 3 / 4) * r;
    const item: HexCoord = { id: currId, q, r, worldX, worldZ };
    HEX_GRID.push(item);
    HEX_MAP[currId] = item;
    currId++;
  }
});

export const AI_MASTER_START_HEX = 2;
export const PLAYER_MASTER_START_HEX = 58;

export function getHexDistance(id1: number, id2: number): number {
  const a = HEX_MAP[id1];
  const b = HEX_MAP[id2];
  if (!a || !b) return 999;
  return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
}
