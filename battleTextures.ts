import * as THREE from 'three';

let cachedHexTileRunicTexture: THREE.CanvasTexture | null = null;
let cachedArenaFloorTexture: THREE.CanvasTexture | null = null;

/**
 * Textura procedural de Hexágono Rúnico de Piedra Antigua.
 * Genera bisel exterior, relieve de cantería y runas arcanas concéntricas.
 */
export function getHexTileRunicTexture(): THREE.CanvasTexture {
  if (cachedHexTileRunicTexture) {
    return cachedHexTileRunicTexture;
  }
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // 1. Base de Granito Oscuro
  ctx.fillStyle = '#1e2532';
  ctx.fillRect(0, 0, size, size);

  // 2. Grano y ruido mineral
  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 26;
    data[i] = Math.min(255, Math.max(0, data[i] + noise));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise + 2));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise + 6));
  }
  ctx.putImageData(imgData, 0, 0);

  // 3. Bisel Hexagonal Interior
  const cx = size / 2;
  const cy = size / 2;
  const rad = size * 0.44;

  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i + Math.PI / 6;
    const x = cx + rad * Math.cos(angle);
    const y = cy + rad * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.lineWidth = 14;
  ctx.strokeStyle = '#0f141d';
  ctx.stroke();

  ctx.lineWidth = 4;
  ctx.strokeStyle = '#38bdf8';
  ctx.shadowColor = '#0284c7';
  ctx.shadowBlur = 12;
  ctx.stroke();
  ctx.restore();

  // 4. Glifo Rúnico Central y Círculos de Canalización
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.24, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Estrella rúnica interna de 6 puntas
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a1 = (Math.PI / 3) * i;
    const a2 = (Math.PI / 3) * ((i + 2) % 6);
    ctx.moveTo(cx + Math.cos(a1) * size * 0.22, cy + Math.sin(a1) * size * 0.22);
    ctx.lineTo(cx + Math.cos(a2) * size * 0.22, cy + Math.sin(a2) * size * 0.22);
  }
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.userData = texture.userData || {};
  texture.userData.sharedAsset = true;
  cachedHexTileRunicTexture = texture;
  return texture;
}

/**
 * Textura procedural de la Fosa del Coliseo y Arena de Combate.
 * Genera losas circulares de cantería y arena compactada.
 */
export function getArenaFloorTexture(): THREE.CanvasTexture {
  if (cachedArenaFloorTexture) {
    return cachedArenaFloorTexture;
  }
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Base oscura de arena volcánica y grava
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, size, size);

  // Ruido de arena
  for (let i = 0; i < 18000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = Math.random();
    ctx.fillStyle = r < 0.3 ? '#1e293b' : r < 0.7 ? '#0b0f19' : '#334155';
    ctx.fillRect(x, y, 1.8, 1.8);
  }

  // Anillos concéntricos de cantería
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#090d16';
  for (let radius = 50; radius < size * 0.75; radius += 42) {
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.userData = texture.userData || {};
  texture.userData.sharedAsset = true;
  cachedArenaFloorTexture = texture;
  return texture;
}
