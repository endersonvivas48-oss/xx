import * as THREE from 'three';

/**
 * Texturas procedurales cacheadas y optimizadas mediante Canvas en memoria
 * para la Ciudad de las Siete Puertas
 */
const textureCache = new Map<string, THREE.CanvasTexture>();

export function createProceduralTexture(
  cacheKey: string,
  generator: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  size = 256,
  repeatX = 1,
  repeatY = 1
): THREE.CanvasTexture {
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey)!;
  }

  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  generator(ctx, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.userData = texture.userData || {};
  texture.userData.sharedAsset = true;
  textureCache.set(cacheKey, texture);
  return texture;
}

// 1. Textura de Calzada de Adoquines Medievales Claros
export function getCobblestoneRoadTexture(): THREE.CanvasTexture {
  return createProceduralTexture(
    'cobblestone_road',
    (ctx, w, h) => {
      // Fondo de mortero de piedra claro
      ctx.fillStyle = '#475569';
      ctx.fillRect(0, 0, w, h);

      const rows = 8;
      const cols = 8;
      const rh = h / rows;
      const rw = w / cols;

      for (let r = 0; r < rows; r++) {
        const offsetX = (r % 2) * (rw * 0.5);
        for (let c = -1; c <= cols; c++) {
          const x = c * rw + offsetX + 2;
          const y = r * rh + 2;
          const pw = rw - 4;
          const ph = rh - 4;

          const seed = Math.sin(r * 19 + c * 37);
          const lightness = 52 + Math.floor(seed * 12);
          ctx.fillStyle = `hsl(210, 16%, ${lightness}%)`;
          ctx.fillRect(x, y, pw, ph);

          ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
          ctx.fillRect(x, y, pw, 2);
          ctx.fillRect(x, y, 2, ph);

          ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
          ctx.fillRect(x, y + ph - 2, pw, 2);
          ctx.fillRect(x + pw - 2, y, 2, ph);
        }
      }

      // Granulado sutil de piedra
      for (let i = 0; i < 400; i++) {
        const gx = Math.random() * w;
        const gy = Math.random() * h;
        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.15)';
        ctx.fillRect(gx, gy, 2, 2);
      }
    },
    256,
    6,
    6
  );
}

// 2. Textura de Fachada de Sillar de Piedra Clara
export function getStoneWallTexture(baseHue = 210, baseSat = 20): THREE.CanvasTexture {
  return createProceduralTexture(
    `stone_wall_${baseHue}_${baseSat}`,
    (ctx, w, h) => {
      ctx.fillStyle = '#334155';
      ctx.fillRect(0, 0, w, h);

      const rows = 8;
      const cols = 5;
      const rh = h / rows;
      const rw = w / cols;

      for (let r = 0; r < rows; r++) {
        const offsetX = (r % 2) * (rw * 0.5);
        for (let c = -1; c <= cols; c++) {
          const x = c * rw + offsetX + 2;
          const y = r * rh + 2;
          const pw = rw - 4;
          const ph = rh - 4;

          const val = 48 + Math.floor(Math.sin(r * 23 + c * 31) * 10);
          ctx.fillStyle = `hsl(${baseHue}, ${baseSat}%, ${val}%)`;
          ctx.fillRect(x, y, pw, ph);

          ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
          ctx.fillRect(x, y, pw, 2);
          ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
          ctx.fillRect(x, y + ph - 2, pw, 2);
        }
      }
    },
    256,
    3,
    2
  );
}

// 3. Textura de Tejas de Arcilla Brillante
export function getRoofTileTexture(colorHex = '#b91c1c'): THREE.CanvasTexture {
  return createProceduralTexture(
    `roof_tile_${colorHex}`,
    (ctx, w, h) => {
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(0, 0, w, h);

      const rows = 12;
      const rh = h / rows;

      for (let r = 0; r < rows; r++) {
        const y = r * rh;
        ctx.fillStyle = colorHex;
        ctx.fillRect(0, y + 2, w, rh - 3);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.fillRect(0, y + rh - 3, w, 2);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.fillRect(0, y + 2, w, 2);
      }
    },
    256,
    2,
    4
  );
}

// 4. Textura de Mármol de la Plaza Central Ritual
export function getAstralPlazaTexture(): THREE.CanvasTexture {
  return createProceduralTexture(
    'astral_plaza',
    (ctx, w, h) => {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;

      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx, cy, w * 0.44, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, w * 0.36, 0, Math.PI * 2);
      ctx.stroke();

      for (let i = 0; i < 7; i++) {
        const angle = (i * Math.PI * 2) / 7;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(angle) * w * 0.44, cy + Math.sin(angle) * h * 0.44);
        ctx.stroke();
      }
    },
    256,
    1,
    1
  );
}
