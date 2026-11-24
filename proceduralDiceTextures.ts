import * as THREE from 'three';

// Cache para no regenerar texturas en cada frame
const diceTextureCache = new Map<string, THREE.CanvasTexture>();

interface DiceVisualTheme {
  bgGradient: [string, string, string];
  edgeColor: string;
  runeColor: string;
  pipColor: string;
  pipGlow: string;
  accentSymbol: string;
}

const THEMES: Record<'arcane' | 'gold' | 'crimson', DiceVisualTheme> = {
  arcane: {
    bgGradient: ['#0f172a', '#1e3a8a', '#0284c7'],
    edgeColor: '#38bdf8',
    runeColor: '#7dd3fc',
    pipColor: '#ffffff',
    pipGlow: 'rgba(56, 189, 248, 0.8)',
    accentSymbol: '✦',
  },
  gold: {
    bgGradient: ['#451a03', '#92400e', '#d97706'],
    edgeColor: '#fde047',
    runeColor: '#fef08a',
    pipColor: '#ffffff',
    pipGlow: 'rgba(251, 191, 36, 0.85)',
    accentSymbol: '⚜',
  },
  crimson: {
    bgGradient: ['#450a0a', '#881337', '#e11d48'],
    edgeColor: '#fda4af',
    runeColor: '#fecdd3',
    pipColor: '#ffffff',
    pipGlow: 'rgba(244, 63, 94, 0.85)',
    accentSymbol: '⚔',
  },
};

// Genera una textura Canvas para cada cara (1 al 6) con estética idéntica a las cartas de dados
export function getDieFaceCanvasTexture(
  themeName: 'arcane' | 'gold' | 'crimson',
  pipNumber: number
): THREE.CanvasTexture {
  const cacheKey = `${themeName}_${pipNumber}`;
  if (diceTextureCache.has(cacheKey)) {
    return diceTextureCache.get(cacheKey)!;
  }

  const theme = THEMES[themeName];
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // 1. Fondo con Degradado Radial y Textura Mágica
  const grad = ctx.createRadialGradient(size / 2, size / 2, 20, size / 2, size / 2, size * 0.7);
  grad.addColorStop(0, theme.bgGradient[2]);
  grad.addColorStop(0.5, theme.bgGradient[1]);
  grad.addColorStop(1, theme.bgGradient[0]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Ruido fino de piedra/mármol arcano
  const imgData = ctx.getImageData(0, 0, size, size);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 22;
    d[i] = Math.min(255, Math.max(0, d[i] + n));
    d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + n));
    d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + n));
  }
  ctx.putImageData(imgData, 0, 0);

  // 2. Marco Dorado/Rúnico Grabado (Borde de fantasía como en el arte)
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#050b14';
  ctx.strokeRect(6, 6, size - 12, size - 12);

  ctx.lineWidth = 4;
  ctx.strokeStyle = theme.edgeColor;
  ctx.shadowColor = theme.edgeColor;
  ctx.shadowBlur = 10;
  ctx.strokeRect(10, 10, size - 20, size - 20);
  ctx.shadowBlur = 0;

  // Esquinas ornamentadas en ángulo
  const cornerLen = 24;
  ctx.lineWidth = 3;
  ctx.strokeStyle = theme.runeColor;
  // Superior Izquierda
  ctx.beginPath();
  ctx.moveTo(14, 14 + cornerLen);
  ctx.lineTo(14, 14);
  ctx.lineTo(14 + cornerLen, 14);
  ctx.stroke();
  // Superior Derecha
  ctx.beginPath();
  ctx.moveTo(size - 14 - cornerLen, 14);
  ctx.lineTo(size - 14, 14);
  ctx.lineTo(size - 14, 14 + cornerLen);
  ctx.stroke();
  // Inferior Izquierda
  ctx.beginPath();
  ctx.moveTo(14, size - 14 - cornerLen);
  ctx.lineTo(14, size - 14);
  ctx.lineTo(14 + cornerLen, size - 14);
  ctx.stroke();
  // Inferior Derecha
  ctx.beginPath();
  ctx.moveTo(size - 14 - cornerLen, size - 14);
  ctx.lineTo(size - 14, size - 14);
  ctx.lineTo(size - 14, size - 14 - cornerLen);
  ctx.stroke();

  // 3. Círculo y Sello Místico Central
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.38, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 4. Posiciones de los Pips (1 a 6) con Puntos Resplandecientes tipo Gema / Runa
  const cx = size / 2;
  const cy = size / 2;
  const offset = size * 0.24;

  const pipCoords: Record<number, [number, number][]> = {
    1: [[cx, cy]],
    2: [
      [cx - offset, cy - offset],
      [cx + offset, cy + offset],
    ],
    3: [
      [cx - offset, cy - offset],
      [cx, cy],
      [cx + offset, cy + offset],
    ],
    4: [
      [cx - offset, cy - offset],
      [cx + offset, cy - offset],
      [cx - offset, cy + offset],
      [cx + offset, cy + offset],
    ],
    5: [
      [cx - offset, cy - offset],
      [cx + offset, cy - offset],
      [cx, cy],
      [cx - offset, cy + offset],
      [cx + offset, cy + offset],
    ],
    6: [
      [cx - offset, cy - offset],
      [cx + offset, cy - offset],
      [cx - offset, cy],
      [cx + offset, cy],
      [cx - offset, cy + offset],
      [cx + offset, cy + offset],
    ],
  };

  const coords = pipCoords[pipNumber] || pipCoords[1];

  coords.forEach(([px, py]) => {
    // Halo de brillo exterior
    const pipGrad = ctx.createRadialGradient(px, py, 2, px, py, 18);
    pipGrad.addColorStop(0, '#ffffff');
    pipGrad.addColorStop(0.4, theme.edgeColor);
    pipGrad.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.fillStyle = pipGrad;
    ctx.beginPath();
    ctx.arc(px, py, 18, 0, Math.PI * 2);
    ctx.fill();

    // Núcleo blanco perla
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(px, py, 9, 0, Math.PI * 2);
    ctx.fill();

    // Borde biselado
    ctx.strokeStyle = '#050b14';
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.userData = texture.userData || {};
  texture.userData.sharedAsset = true;
  diceTextureCache.set(cacheKey, texture);
  return texture;
}
