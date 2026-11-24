import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { getConfig } from './constants';
import { loadGltfFromUrl } from './gltfLoaderSingleton';
import {
  optimizeGlbSceneAsync,
  isMobileOptimizationTarget,
  resolveMobileGlbUrls,
  isPreoptimizedMobileGlbUrl,
} from './glbRuntimeOptimizer';
import { UnitData, FloatingText, SpellVFX, SpecialHexRune, RolledDieResult } from './types';
import { DetailedCreatureMesh, AscendedTitanMesh } from './DetailedCreatures';
import { getHexTileRunicTexture } from './battleTextures';
import { getDieFaceCanvasTexture } from './proceduralDiceTextures';
import { ThreeSceneCleanup, markAsSharedAsset, markGeometryAsShared, markMaterialAsShared, disposeObject3DResources, useWebglContextRecovery } from './ThreeSceneCleanup';
import { calculateAttackDamagePreview } from './tacticalCombatFormulas';

// Pre-allocated scratch vectors
const tempV3 = new THREE.Vector3();
const tempColor = new THREE.Color();

// URLs candidatas oficiales para el modelo 3D GLB del tablero en el campo de batalla
const TABLERO_GLB_CANDIDATES = [
  'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main/tablero.glb',
  'https://raw.githubusercontent.com/endersonvivas48-oss/main/main/tablero.glb',
];

// Hook de carga acelerada con DRACOLoader y caché para el modelo del tablero
let cachedTableroGlb: THREE.Group | null = null;
let tableroLoadingPromise: Promise<THREE.Group | null> | null = null;
let tableroBoardSurfaceY = 0.0; // Altura exacta de la superficie superior del tablero
let tableroLoadSettled = false;

export function isCombatEnvironmentModelReady(): boolean {
  return cachedTableroGlb !== null;
}

export function isCombatEnvironmentLoadSettled(): boolean {
  return tableroLoadSettled;
}

export function preloadCombatEnvironmentModel(): Promise<THREE.Group | null> {
  if (cachedTableroGlb) {
    tableroLoadSettled = true;
    return Promise.resolve(cachedTableroGlb);
  }
  if (tableroLoadingPromise) return tableroLoadingPromise;

  // Al iniciar un nuevo intento de carga, reiniciar el estado a no asentado
  tableroLoadSettled = false;

  const effectiveUrls = resolveMobileGlbUrls(TABLERO_GLB_CANDIDATES);

  tableroLoadingPromise = new Promise(async (resolve) => {
    for (const url of effectiveUrls) {
      try {
        const gltf = await loadGltfFromUrl(url);
        if (gltf && gltf.scene) {
          const scene = await optimizeGlbSceneAsync(gltf.scene as THREE.Group, 'BOARD', {
            preoptimizedMobile: isPreoptimizedMobileGlbUrl(url),
          });

          scene.traverse((child: any) => {
            if (child.isMesh && child.material) {
              const mats = Array.isArray(child.material) ? child.material : [child.material];
              mats.forEach((m: any) => {
                if (m) m.roughness = Math.max(0.3, m.roughness ?? 0.5);
              });
            }
          });

          const rawBox = new THREE.Box3().setFromObject(scene);
          const rawSize = rawBox.getSize(new THREE.Vector3());
          const rawCenter = rawBox.getCenter(new THREE.Vector3());

          scene.position.x = -rawCenter.x;
          scene.position.z = -rawCenter.z;

          const scaleFactor = 23.5 / Math.max(rawSize.x, rawSize.z);
          scene.scale.set(scaleFactor, scaleFactor, scaleFactor);

          const scaledBox = new THREE.Box3().setFromObject(scene);
          const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
          scene.position.x = -scaledCenter.x;
          scene.position.z = -scaledCenter.z;
          scene.position.y = -scaledBox.max.y - 0.25;

          markAsSharedAsset(scene);
          cachedTableroGlb = scene;
          tableroBoardSurfaceY = 0.0;
          tableroLoadSettled = true;
          resolve(scene);
          return;
        }
      } catch (e) {
        // Siguiente candidato
      }
    }
    // Si todos los candidatos fallaron, permitir futuros reintentos limpiando la promesa
    tableroLoadingPromise = null;
    tableroLoadSettled = true;
    resolve(null);
  });

  return tableroLoadingPromise;
}

/**
 * Libera el modelo GLB pesado del tablero de combate al salir de COMBAT en móvil.
 */
export function disposeCombatBoardAsset(force = false): void {
  if (!force) {
    return;
  }
  if (cachedTableroGlb) {
    disposeObject3DResources(cachedTableroGlb);
    cachedTableroGlb = null;
  }
  tableroLoadingPromise = null;
  tableroLoadSettled = false;
}

function useTableroGlbModel() {
  const [model, setModel] = useState<THREE.Group | null>(cachedTableroGlb);

  useEffect(() => {
    if (cachedTableroGlb) {
      setModel(cachedTableroGlb);
      return;
    }

    let isMounted = true;
    preloadCombatEnvironmentModel()
      .then((res) => {
        if (isMounted && res) {
          setModel(res);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  return { model };
}

// Re-exportar las definiciones matemáticas y coordenadas puras desde hexGrid.ts
export type { HexCoord } from './hexGrid';
export {
  HEX_RADIUS,
  HEX_WIDTH,
  HEX_HEIGHT,
  HEX_GRID,
  HEX_MAP,
  AI_MASTER_START_HEX,
  PLAYER_MASTER_START_HEX,
  getHexDistance,
} from './hexGrid';
import { HexCoord, HEX_RADIUS, HEX_GRID, HEX_MAP, getHexDistance } from './hexGrid';

// Geometría compartida a nivel de módulo para los anillos de acción de las casillas activas
const actionRingGeometry = (() => {
  const geom = new THREE.RingGeometry(0.74, 0.86, 6);
  markGeometryAsShared(geom);
  return geom;
})();

// ========================================================
// GEOMETRÍAS Y MATERIALES COMPARTIDOS PARA UNITPAWN / REY / EFECTOS
// ========================================================
const unitPawnGeos = {
  hitbox: markGeometryAsShared(new THREE.CylinderGeometry(0.85, 0.85, 1.8, 12)),
  pedestal: markGeometryAsShared(new THREE.CylinderGeometry(0.55, 0.6, 0.12, 16)),
  kingRobe: markGeometryAsShared(new THREE.CapsuleGeometry(0.42, 0.14, 8, 16)),
  kingTorso: markGeometryAsShared(new THREE.CapsuleGeometry(0.34, 0.42, 8, 16)),
  kingChestGem: markGeometryAsShared(new THREE.SphereGeometry(0.22, 14, 14)),
  kingHead: markGeometryAsShared(new THREE.SphereGeometry(0.22, 18, 18)),
  kingCrownRing: markGeometryAsShared(new THREE.TorusGeometry(0.2, 0.035, 8, 20)),
  kingCrownSpike: markGeometryAsShared(new THREE.ConeGeometry(0.06, 0.16, 6)),
  arcaneShield: markGeometryAsShared(new THREE.SphereGeometry(1.25, 16, 16)),
  gravityRing: markGeometryAsShared(new THREE.TorusGeometry(1.45, 0.06, 8, 24)),
  selectionDisc: markGeometryAsShared(new THREE.CylinderGeometry(0.7, 0.7, 0.05, 24)),
  orbParticle: markGeometryAsShared(new THREE.SphereGeometry(0.09, 8, 8)),
  dieBox: markGeometryAsShared(new THREE.BoxGeometry(0.88, 0.88, 0.88)),
};

const unitPawnMats = {
  invisibleHitbox: markMaterialAsShared(new THREE.MeshBasicMaterial({ visible: false })),
  pedestalMaster: markMaterialAsShared(
    new THREE.MeshStandardMaterial({ color: '#fbbf24', metalness: 0.5, roughness: 0.3 })
  ),
  pedestalJ1: markMaterialAsShared(
    new THREE.MeshStandardMaterial({ color: '#38bdf8', metalness: 0.5, roughness: 0.3 })
  ),
  pedestalJ2: markMaterialAsShared(
    new THREE.MeshStandardMaterial({ color: '#f43f5e', metalness: 0.5, roughness: 0.3 })
  ),
  kingRobeJ1: markMaterialAsShared(
    new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.8, metalness: 0.2 })
  ),
  kingRobeJ2: markMaterialAsShared(
    new THREE.MeshStandardMaterial({ color: '#271b1d', roughness: 0.8, metalness: 0.2 })
  ),
  kingTorsoJ1: markMaterialAsShared(
    new THREE.MeshStandardMaterial({ color: '#0284c7', roughness: 0.4, metalness: 0.65 })
  ),
  kingTorsoJ2: markMaterialAsShared(
    new THREE.MeshStandardMaterial({ color: '#be123c', roughness: 0.4, metalness: 0.65 })
  ),
  kingChestJ1: markMaterialAsShared(
    new THREE.MeshStandardMaterial({ color: '#38bdf8', roughness: 0.3, metalness: 0.7 })
  ),
  kingChestJ2: markMaterialAsShared(
    new THREE.MeshStandardMaterial({ color: '#e11d48', roughness: 0.3, metalness: 0.7 })
  ),
  kingSkin: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#fed7aa', roughness: 0.7 })),
  kingCrown: markMaterialAsShared(
    new THREE.MeshStandardMaterial({ color: '#f59e0b', metalness: 0.95, roughness: 0.15 })
  ),
  arcaneShield: markMaterialAsShared(
    new THREE.MeshStandardMaterial({
      color: '#34d399',
      emissive: '#10b981',
      emissiveIntensity: 1.2,
      transparent: true,
      opacity: 0.4,
      wireframe: true,
    })
  ),
  gravityRing: markMaterialAsShared(
    new THREE.MeshStandardMaterial({
      color: '#818cf8',
      emissive: '#6366f1',
      emissiveIntensity: 2.2,
      transparent: true,
      opacity: 0.85,
    })
  ),
  selectionDisc: markMaterialAsShared(
    new THREE.MeshBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0.6 })
  ),
};

const orbParticleMatCache = new Map<string, THREE.MeshStandardMaterial>();
function getOrbParticleMat(color: string, emissive: string): THREE.MeshStandardMaterial {
  const key = `${color}|${emissive}`;
  let mat = orbParticleMatCache.get(key);
  if (!mat) {
    mat = markMaterialAsShared(
      new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: 3.0 })
    );
    orbParticleMatCache.set(key, mat);
  }
  return mat;
}

// Procedural Hex Prism Geometry with smooth bevels
function createHexPrismGeometry(radius = 0.88, height = 0.12) {
  const s = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i + Math.PI / 6;
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    if (i === 0) s.moveTo(x, y);
    else s.lineTo(x, y);
  }
  s.closePath();

  return new THREE.ExtrudeGeometry(s, {
    depth: height,
    bevelEnabled: false,
  });
}

// Geometrías y materiales compartidos a nivel de módulo para el tablero hexagonal y efectos de HUD 3D
const hexGridRingGeometry = markGeometryAsShared(
  new THREE.RingGeometry(HEX_RADIUS * 0.9, HEX_RADIUS * 0.96, 6)
);
const hexTilePrismGeometry = markGeometryAsShared(
  createHexPrismGeometry(HEX_RADIUS * 0.94, 0.08)
);
const hexGridLineMaterial = markMaterialAsShared(
  new THREE.MeshBasicMaterial({ color: '#64748b', transparent: true, opacity: 0.45 })
);
const targetImpactRingGeometry = markGeometryAsShared(new THREE.RingGeometry(0.7, 0.9, 16));
const targetImpactRingMaterial = markMaterialAsShared(
  new THREE.MeshBasicMaterial({ color: '#f43f5e', transparent: true, opacity: 0.8 })
);
const floatingIndicatorSphereGeo = markGeometryAsShared(new THREE.SphereGeometry(0.24, 10, 10));
const floatingIndicatorRingGeo = markGeometryAsShared(new THREE.RingGeometry(0.2, 0.6, 12));
const tileDummyObject = new THREE.Object3D();

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.max(0, Math.min(r, w * 0.5, h * 0.5));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

const InstancedHexGridLines = React.memo(function InstancedHexGridLines() {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    if (!meshRef.current) return;
    HEX_GRID.forEach((coord, idx) => {
      tileDummyObject.position.set(coord.worldX, 0.05, coord.worldZ);
      tileDummyObject.rotation.set(-Math.PI / 2, 0, 0);
      tileDummyObject.scale.set(1, 1, 1);
      tileDummyObject.updateMatrix();
      meshRef.current!.setMatrixAt(idx, tileDummyObject.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, []);

  return (
    <instancedMesh
      ref={meshRef}
      args={[hexGridRingGeometry, hexGridLineMaterial, HEX_GRID.length]}
    />
  );
});

// Instanced Hex Tiles Board Renderer - Renders 61 hex tiles in 1 single GPU draw call con actualización O(1) al mover el puntero
const InstancedHexTilesBoard = React.memo(function InstancedHexTilesBoard({
  runicTexture,
  specialRunes = [],
  cellMov,
  cellAtq,
  cellInv,
  selectedUnitHex,
  onTileClick,
  onTileHover,
}: {
  runicTexture?: THREE.CanvasTexture;
  specialRunes?: SpecialHexRune[];
  cellMov: number[];
  cellAtq: number[];
  cellInv: number[];
  selectedUnitHex: number;
  onTileClick?: (id: number) => void;
  onTileHover?: (rune: SpecialHexRune | null) => void;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const hoveredIdxRef = useRef<number | null>(null);
  const lastHoveredRuneHexRef = useRef<number | null>(null);

  const runeByHexId = useMemo(() => {
    const map = new Map<number, SpecialHexRune>();
    for (let i = 0; i < specialRunes.length; i++) {
      map.set(specialRunes[i].hexId, specialRunes[i]);
    }
    return map;
  }, [specialRunes]);

  const movSet = useMemo(() => new Set(cellMov), [cellMov]);
  const atkSet = useMemo(() => new Set(cellAtq), [cellAtq]);
  const invSet = useMemo(() => new Set(cellInv), [cellInv]);

  // Precomputar estado base O(1) por casilla (solo cuando cambia selección, rangos o runas, nunca al hacer hover)
  const baseTileStates = useMemo(() => {
    return HEX_GRID.map((coord) => {
      const rune = runeByHexId.get(coord.id) || null;
      const isSel = selectedUnitHex === coord.id;
      const isAtk = atkSet.has(coord.id);
      const isInv = invSet.has(coord.id);
      const isMov = movSet.has(coord.id);

      let color = '#1e293b';
      let y = 0.02;
      let hasPriorityState = false;

      if (isSel) {
        color = '#38bdf8';
        y = 0.08;
        hasPriorityState = true;
      } else if (isAtk) {
        color = '#ef4444';
        y = 0.06;
        hasPriorityState = true;
      } else if (isInv) {
        color = '#fbbf24';
        y = 0.07;
        hasPriorityState = true;
      } else if (isMov) {
        color = '#10b981';
        y = 0.055;
        hasPriorityState = true;
      } else if (rune) {
        color = rune.color;
        y = 0.035;
      }

      return { color, y, coord, rune, hasPriorityState };
    });
  }, [runeByHexId, selectedUnitHex, atkSet, invSet, movSet]);

  const writeTileInstance = (idx: number, isHovered: boolean) => {
    const mesh = meshRef.current;
    const item = baseTileStates[idx];
    if (!mesh || !item) return;

    const effectiveColor =
      isHovered && !item.hasPriorityState
        ? item.rune
          ? item.rune.color
          : '#60a5fa'
        : item.color;
    const effectiveY = isHovered && !item.hasPriorityState ? 0.04 : item.y;

    tileDummyObject.position.set(item.coord.worldX, effectiveY, item.coord.worldZ);
    tileDummyObject.scale.set(1, 1, 1);
    tileDummyObject.rotation.set(-Math.PI / 2, 0, 0);
    tileDummyObject.updateMatrix();
    mesh.setMatrixAt(idx, tileDummyObject.matrix);

    tempColor.set(effectiveColor);
    mesh.setColorAt(idx, tempColor);
  };

  // Actualizar GPU únicamente cuando cambian los estados base de las casillas
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const activeHoverIdx = hoveredIdxRef.current;
    for (let idx = 0; idx < baseTileStates.length; idx++) {
      const item = baseTileStates[idx];
      const isHovered = activeHoverIdx === idx;
      const effectiveColor =
        isHovered && !item.hasPriorityState
          ? item.rune
            ? item.rune.color
            : '#60a5fa'
          : item.color;
      const effectiveY = isHovered && !item.hasPriorityState ? 0.04 : item.y;

      tileDummyObject.position.set(item.coord.worldX, effectiveY, item.coord.worldZ);
      tileDummyObject.scale.set(1, 1, 1);
      tileDummyObject.rotation.set(-Math.PI / 2, 0, 0);
      tileDummyObject.updateMatrix();
      mesh.setMatrixAt(idx, tileDummyObject.matrix);

      tempColor.set(effectiveColor);
      mesh.setColorAt(idx, tempColor);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  }, [baseTileStates]);

  return (
    <group>
      {/* Malla base de las 61 casillas hexagonales visibles con eventos R3F nativos por instanceId */}
      <instancedMesh
        ref={meshRef}
        args={[hexTilePrismGeometry, undefined, HEX_GRID.length]}
        receiveShadow
        castShadow
        onClick={(e) => {
          if (e.instanceId !== undefined && e.instanceId >= 0 && e.instanceId < HEX_GRID.length) {
            e.stopPropagation();
            const coord = HEX_GRID[e.instanceId];
            if (coord && onTileClick) onTileClick(coord.id);
          }
        }}
        onPointerMove={(e) => {
          if (e.pointerType === 'touch') return;
          const nextIdx = e.instanceId;
          if (nextIdx === undefined || nextIdx < 0 || nextIdx >= HEX_GRID.length) return;
          e.stopPropagation();
          if (hoveredIdxRef.current === nextIdx) return;

          const prevIdx = hoveredIdxRef.current;
          hoveredIdxRef.current = nextIdx;

          if (prevIdx !== null) {
            writeTileInstance(prevIdx, false);
          }
          writeTileInstance(nextIdx, true);

          if (meshRef.current) {
            meshRef.current.instanceMatrix.needsUpdate = true;
            if (meshRef.current.instanceColor) {
              meshRef.current.instanceColor.needsUpdate = true;
            }
          }

          if (onTileHover) {
            const nextRune = baseTileStates[nextIdx]?.rune || null;
            const nextRuneHex = nextRune ? nextRune.hexId : null;
            if (nextRuneHex !== lastHoveredRuneHexRef.current) {
              lastHoveredRuneHexRef.current = nextRuneHex;
              onTileHover(nextRune);
            }
          }
        }}
        onPointerOut={() => {
          const prevIdx = hoveredIdxRef.current;
          if (prevIdx !== null) {
            hoveredIdxRef.current = null;
            writeTileInstance(prevIdx, false);
            if (meshRef.current) {
              meshRef.current.instanceMatrix.needsUpdate = true;
              if (meshRef.current.instanceColor) {
                meshRef.current.instanceColor.needsUpdate = true;
              }
            }
          }
          if (lastHoveredRuneHexRef.current !== null) {
            lastHoveredRuneHexRef.current = null;
            if (onTileHover) onTileHover(null);
          }
        }}
      >
        <meshStandardMaterial
          map={runicTexture}
          roughness={0.25}
          metalness={0.3}
          transparent
          opacity={0.88}
        />
      </instancedMesh>

      {/* Delineado rúnico exterior de cada casilla mediante InstancedMesh (1 sola llamada GPU) */}
      <InstancedHexGridLines />
    </group>
  );
});

type OrbVisualElementType =
  | 'fire'
  | 'ice'
  | 'lightning'
  | 'poison'
  | 'dark'
  | 'cosmic'
  | 'light'
  | 'wind'
  | 'earth'
  | 'metal'
  | 'arcane';

function resolveOrbVisualEffect(o: { element?: string; name?: string; color?: string }): {
  type: OrbVisualElementType;
  color: string;
  emissive: string;
} {
  const el = `${o.element || ''} ${o.name || ''}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (
    el.includes('fuego') ||
    el.includes('magma') ||
    el.includes('igneo') ||
    el.includes('ignea') ||
    el.includes('fenix') ||
    el.includes('llama')
  ) {
    return { type: 'fire', color: '#f97316', emissive: '#ea580c' };
  }
  if (el.includes('hielo') || el.includes('escarcha') || el.includes('glacial')) {
    return { type: 'ice', color: '#38bdf8', emissive: '#0284c7' };
  }
  if (
    el.includes('rayo') ||
    el.includes('trueno') ||
    el.includes('electr') ||
    el.includes('relampago') ||
    el.includes('chispa')
  ) {
    return { type: 'lightning', color: '#facc15', emissive: '#eab308' };
  }
  if (el.includes('venen') || el.includes('corrosivo') || el.includes('miasma') || el.includes('toxic')) {
    return { type: 'poison', color: '#4ade80', emissive: '#22c55e' };
  }
  if (
    el.includes('oscur') ||
    el.includes('sombra') ||
    el.includes('vampir') ||
    el.includes('abisal') ||
    el.includes('sangre')
  ) {
    return { type: 'dark', color: '#e11d48', emissive: '#9f1239' };
  }
  if (el.includes('cosmic') || el.includes('singular') || el.includes('astral')) {
    return { type: 'cosmic', color: '#c084fc', emissive: '#a855f7' };
  }
  if (el.includes('luz') || el.includes('solar') || el.includes('sagrad') || el.includes('gracia') || el.includes('alba')) {
    return { type: 'light', color: '#fde047', emissive: '#f59e0b' };
  }
  if (el.includes('viento') || el.includes('aire') || el.includes('cefiro')) {
    return { type: 'wind', color: '#2dd4bf', emissive: '#0d9488' };
  }
  if (el.includes('tierra') || el.includes('roca') || el.includes('diamante') || el.includes('granito') || el.includes('bastion')) {
    return { type: 'earth', color: '#84cc16', emissive: '#4d7c0f' };
  }
  if (el.includes('metal') || el.includes('acero') || el.includes('adamantio')) {
    return { type: 'metal', color: '#e2e8f0', emissive: '#94a3b8' };
  }
  return { type: 'arcane', color: '#38bdf8', emissive: '#0284c7' };
}

// Componente de Partículas 3D Elementales por Orbes (Fuego, Hielo, Rayo, Veneno, Oscuro, Luz, Cósmico)
function ElementalOrbParticles({
  orbs,
  yOffset = 0.8,
}: {
  orbs?: Array<{ element?: string; name?: string; color?: string }>;
  yOffset?: number;
}) {
  const pGroup = useRef<THREE.Group>(null);

  const activeEffects = useMemo(() => {
    if (!orbs || orbs.length === 0) return [];
    const byType = new Map<OrbVisualElementType, { type: OrbVisualElementType; color: string; emissive: string }>();
    orbs.forEach((o) => {
      const resolved = resolveOrbVisualEffect(o);
      if (!byType.has(resolved.type)) {
        byType.set(resolved.type, resolved);
      }
    });
    return Array.from(byType.values());
  }, [orbs]);

  useFrame(({ clock }) => {
    if (!pGroup.current) return;
    const t = clock.getElapsedTime();
    pGroup.current.rotation.y = t * 1.8;
    pGroup.current.children.forEach((child: any, i) => {
      const childOffset = i * 1.2;
      child.position.y = Math.sin(t * 3.5 + childOffset) * 0.18;
    });
  });

  if (activeEffects.length === 0) return null;

  return (
    <group ref={pGroup} position={[0, yOffset, 0]}>
      {activeEffects.map((eff, idx) => {
        const angle = (idx / activeEffects.length) * Math.PI * 2;
        const radius = 0.85;
        const px = Math.cos(angle) * radius;
        const pz = Math.sin(angle) * radius;

        return (
          <group key={eff.type} position={[px, 0, pz]}>
            <mesh geometry={unitPawnGeos.orbParticle} material={getOrbParticleMat(eff.color, eff.emissive)} />
          </group>
        );
      })}
    </group>
  );
}

// Previsión de Trayectoria y Daño en 3D (Arco de ataque translúcido y predicción táctica)
function AttackTrajectoryArc({
  attackerCoord,
  targetCoord,
  damageAmount,
  targetHpBefore,
  targetHpAfter,
}: {
  attackerCoord: HexCoord;
  targetCoord: HexCoord;
  damageAmount: number;
  targetHpBefore: number;
  targetHpAfter: number;
}) {
  const curvePoints = useMemo(() => {
    const start = new THREE.Vector3(attackerCoord.worldX, 0.9, attackerCoord.worldZ);
    const end = new THREE.Vector3(targetCoord.worldX, 0.9, targetCoord.worldZ);
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    mid.y += Math.max(1.2, start.distanceTo(end) * 0.45);

    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    return curve.getPoints(24);
  }, [attackerCoord, targetCoord]);

  const lineGeometry = useMemo(() => {
    const geom = new THREE.BufferGeometry().setFromPoints(curvePoints);
    return geom;
  }, [curvePoints]);

  useEffect(() => {
    return () => {
      if (lineGeometry && typeof lineGeometry.dispose === 'function') {
        try {
          lineGeometry.dispose();
        } catch (_) {}
      }
    };
  }, [lineGeometry]);

  const midPoint = curvePoints[Math.floor(curvePoints.length / 2)] || new THREE.Vector3(0, 1.5, 0);
  const spriteRef = useRef<THREE.Sprite>(null);

  const previewSprite = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 384;
    canvas.height = 112;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });
    return { canvas, tex, mat };
  }, []);

  useEffect(() => {
    const { canvas, tex } = previewSprite;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawRoundedRectPath(ctx, 8, 8, canvas.width - 16, canvas.height - 16, 18);
    ctx.fillStyle = 'rgba(2, 6, 23, 0.94)';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#f43f5e';
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 24px monospace';
    ctx.fillStyle = '#fda4af';
    ctx.fillText(`⚔️ PREVISIÓN: -${damageAmount} ATK`, canvas.width / 2, 38);

    const hpAfterClamped = Math.max(0, targetHpAfter);
    const suffix = targetHpAfter <= 0 ? ' [DERROTA]' : '';
    ctx.font = 'bold 21px monospace';
    ctx.fillStyle = targetHpAfter <= 0 ? '#f87171' : '#34d399';
    ctx.fillText(
      `Vida: ${targetHpBefore} ➔ ${hpAfterClamped}${suffix}`,
      canvas.width / 2,
      76
    );

    tex.needsUpdate = true;
  }, [previewSprite, damageAmount, targetHpBefore, targetHpAfter]);

  useEffect(() => {
    return () => {
      try { previewSprite.tex.dispose(); } catch (_) {}
      try { previewSprite.mat.dispose(); } catch (_) {}
    };
  }, [previewSprite]);

  useFrame(({ clock }) => {
    if (!spriteRef.current) return;
    spriteRef.current.position.y = midPoint.y + 2.0 + Math.sin(clock.getElapsedTime() * 5) * 0.12;
  });

  return (
    <group>
      {/* Línea de trayectoria en arco */}
      {/* @ts-ignore line component */}
      <line geometry={lineGeometry}>
        <lineBasicMaterial color="#f43f5e" linewidth={3} transparent opacity={0.85} />
      </line>

      {/* Marcador de impacto en objetivo */}
      <mesh
        geometry={targetImpactRingGeometry}
        material={targetImpactRingMaterial}
        position={[targetCoord.worldX, 0.08, targetCoord.worldZ]}
        rotation={[-Math.PI / 2, 0, 0]}
      />

      {/* Previsión de daño nativa en WebGL Sprite (sin capas DOM <Html>) */}
      <sprite
        ref={spriteRef}
        position={[midPoint.x, midPoint.y + 2.0, midPoint.z]}
        scale={[4.4, 1.28, 1]}
        material={previewSprite.mat}
        renderOrder={16}
      />
    </group>
  );
}

// 3D Stylized Unit Character Component
function UnitPawn({
  unit,
  isSelected,
  hideHealthBar = false,
  isPaused = false,
  onClick,
  onHover,
}: {
  unit: UnitData;
  isSelected: boolean;
  hideHealthBar?: boolean;
  isPaused?: boolean;
  onClick: () => void;
  onHover?: (hovered: boolean) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const meshWrapRef = useRef<THREE.Group>(null);
  const isJ1 = unit.dueño === 1;

  const primaryColor = isJ1 ? '#38bdf8' : '#f43f5e';
  const trimColor = unit.esMaestra ? '#fbbf24' : unit.esAscendido ? '#c084fc' : isJ1 ? '#1d4ed8' : '#991b1b';

  const prevHpRef = useRef(unit.hpActual);
  const prevAttackSeqRef = useRef(unit.lastAttackSeq ?? 0);
  const attackAnimTimeRef = useRef(0);
  const hitReactionTimeRef = useRef(0);

  const animTimeRef = useRef(0);

  const healthSprite = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });
    return { canvas, tex, mat };
  }, []);

  useEffect(() => {
    return () => {
      try { healthSprite.tex.dispose(); } catch (_) {}
      try { healthSprite.mat.dispose(); } catch (_) {}
    };
  }, [healthSprite]);

  useFrame((_, delta) => {
    if (isPaused || !groupRef.current) return;
    const clampedDelta = Math.min(delta, 0.05);
    animTimeRef.current += clampedDelta;

    const targetCoord = HEX_MAP[unit.posicion];
    const tx = targetCoord ? targetCoord.worldX : 0;
    const tz = targetCoord ? targetCoord.worldZ : 0;

    // Disparar animación de golpe ÚNICAMENTE cuando se ejecuta un ataque cuerpo a cuerpo real
    const currentAttackSeq = unit.lastAttackSeq ?? 0;
    if (currentAttackSeq > prevAttackSeqRef.current) {
      prevAttackSeqRef.current = currentAttackSeq;
      attackAnimTimeRef.current = 1.0;
    } else if (currentAttackSeq < prevAttackSeqRef.current) {
      prevAttackSeqRef.current = currentAttackSeq;
    }

    // Detectar si la unidad recibió impacto / daño para activar Knockback
    if (unit.hpActual < prevHpRef.current) {
      hitReactionTimeRef.current = 1.0;
    }
    prevHpRef.current = unit.hpActual;

    const moveSmooth = 1 - Math.exp(-15 * clampedDelta);
    if (groupRef.current.position.distanceToSquared(tempV3.set(tx, groupRef.current.position.y, tz)) > 25) {
      groupRef.current.position.x = tx;
      groupRef.current.position.z = tz;
    } else {
      groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, tx, moveSmooth);
      groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, tz, moveSmooth);
    }

    // Animación de ataque frontal
    if (attackAnimTimeRef.current > 0) {
      attackAnimTimeRef.current = Math.max(0, attackAnimTimeRef.current - clampedDelta * 3);
      groupRef.current.rotation.z = Math.sin(animTimeRef.current * 25) * 0.15 * attackAnimTimeRef.current;
    } else {
      groupRef.current.rotation.z = 0;
    }

    // Reacción física de Impacto y Retroceso (Knockback + Sacudida)
    if (meshWrapRef.current) {
      if (hitReactionTimeRef.current > 0) {
        hitReactionTimeRef.current = Math.max(0, hitReactionTimeRef.current - clampedDelta * 3.5);
        const progress = Math.max(0, hitReactionTimeRef.current);
        const knockDir = isJ1 ? 1 : -1;
        // Retroceso hacia atrás según el dueño
        meshWrapRef.current.position.z = Math.sin(progress * Math.PI) * 0.35 * knockDir;
        // Sacudida lateral de impacto
        meshWrapRef.current.position.x = Math.sin(animTimeRef.current * 45) * 0.12 * progress;
        meshWrapRef.current.rotation.x = -Math.sin(progress * Math.PI) * 0.3 * knockDir;
      } else {
        meshWrapRef.current.position.set(0, 0, 0);
        meshWrapRef.current.rotation.x = 0;
      }
    }

    const t = animTimeRef.current + (typeof unit.id === 'string' ? unit.id.length : 1);
    const bounce = Math.sin(t * (unit.esAscendido ? 2.5 : 3.5)) * (unit.esAscendido ? 0.08 : 0.04);
    groupRef.current.position.y = (unit.esAscendido ? 0.95 : 0.72) + bounce;

    const selectPulse = isSelected ? 1.15 + Math.sin(t * 8) * 0.05 : 1.0;
    groupRef.current.scale.setScalar(selectPulse);
  });

  const currentCoord = HEX_MAP[unit.posicion];
  const initialX = currentCoord ? currentCoord.worldX : 0;
  const initialZ = currentCoord ? currentCoord.worldZ : 0;

  const currentHp = Math.max(0, Number(unit.hpActual ?? 0));
  const maxHp = Math.max(1, Number(unit.hpMax > 0 ? unit.hpMax : 1));
  const hpRatio = THREE.MathUtils.clamp(currentHp / maxHp, 0, 1);
  const hpBarY = unit.esMaestra ? 2.65 : unit.esAscendido ? 2.45 : 1.6 + (unit.nivel || 1) * 0.12;
  const shieldCount = unit.hasShield ? (unit.shieldCharges ?? 1) : 0;
  const gravityTurns = unit.gravityTurns || 0;

  useEffect(() => {
    const { canvas, tex } = healthSprite;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Cápsula principal de barra de vida en Canvas 2D (cero capas DOM <Html>)
    drawRoundedRectPath(ctx, 6, 10, canvas.width - 12, canvas.height - 20, 22);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.88)';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = isSelected ? '#38bdf8' : 'rgba(100, 116, 139, 0.85)';
    ctx.stroke();

    const hasShieldBadge = shieldCount > 0;
    const hasGravityBadge = gravityTurns > 0;
    const badgeWidth = (hasShieldBadge ? 34 : 0) + (hasGravityBadge ? 34 : 0);
    const barX = 18;
    const barY = 23;
    const barH = 18;
    const barW = Math.max(64, canvas.width - 120 - badgeWidth);

    drawRoundedRectPath(ctx, barX, barY, barW, barH, 9);
    ctx.fillStyle = '#020617';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#1e293b';
    ctx.stroke();

    const fillW = Math.max(0, (barW - 4) * hpRatio);
    if (fillW > 0) {
      drawRoundedRectPath(ctx, barX + 2, barY + 2, fillW, barH - 4, 7);
      ctx.fillStyle = isJ1
        ? hpRatio < 0.35
          ? '#f59e0b'
          : '#22c55e'
        : '#ef4444';
      ctx.fill();
    }

    let cursorX = barX + barW + 10;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 21px monospace';
    ctx.fillStyle = hpRatio < 0.35 ? '#fcd34d' : '#f1f5f9';
    const hpText = `${currentHp}/${maxHp}`;
    ctx.fillText(hpText, cursorX, 33);
    cursorX += ctx.measureText(hpText).width + 6;

    if (hasShieldBadge) {
      ctx.font = 'bold 19px monospace';
      ctx.fillStyle = '#67e8f9';
      const shieldTxt = `🛡️${shieldCount > 1 ? shieldCount : ''}`;
      ctx.fillText(shieldTxt, cursorX, 33);
      cursorX += ctx.measureText(shieldTxt).width + 4;
    }

    if (hasGravityBadge) {
      ctx.font = 'bold 19px monospace';
      ctx.fillStyle = '#a5b4fc';
      ctx.fillText(`🌌${gravityTurns}`, cursorX, 33);
    }

    tex.needsUpdate = true;
  }, [healthSprite, currentHp, maxHp, hpRatio, isJ1, isSelected, shieldCount, gravityTurns]);

  return (
    <group
      ref={groupRef}
      position={[initialX, 0.72, initialZ]}
      rotation={[0, isJ1 ? 0 : Math.PI, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (e.pointerType === 'touch') return;
        if (onHover) onHover(true);
      }}
      onPointerOut={(e) => {
        if (e.pointerType === 'touch') return;
        if (onHover) onHover(false);
      }}
    >
      {/* Zona invisible ampliada de selección táctil para móviles Android */}
      <mesh
        geometry={unitPawnGeos.hitbox}
        material={unitPawnMats.invisibleHitbox}
        position={[0, unit.esMaestra ? 1.2 : 0.8, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      />

      <group ref={meshWrapRef}>
        <mesh
          geometry={unitPawnGeos.pedestal}
          material={unit.esMaestra ? unitPawnMats.pedestalMaster : isJ1 ? unitPawnMats.pedestalJ1 : unitPawnMats.pedestalJ2}
          position={[0, 0.05, 0]}
          castShadow
        />

        {unit.esMaestra ? (
          <group position={[0, 0.05, 0]}>
            <group position={[0, 0.14, 0]}>
              <mesh
                geometry={unitPawnGeos.kingRobe}
                material={isJ1 ? unitPawnMats.kingRobeJ1 : unitPawnMats.kingRobeJ2}
                castShadow
                receiveShadow
              />
            </group>

            <group position={[0, 0.32, 0]}>
              <mesh
                geometry={unitPawnGeos.kingTorso}
                material={isJ1 ? unitPawnMats.kingTorsoJ1 : unitPawnMats.kingTorsoJ2}
                position={[0, 0.42, 0]}
                castShadow
              />
              <mesh
                geometry={unitPawnGeos.kingChestGem}
                material={isJ1 ? unitPawnMats.kingChestJ1 : unitPawnMats.kingChestJ2}
                position={[0, 0.72, 0.12]}
                castShadow
              />
              <group position={[0, 1.25, 0]}>
                <mesh geometry={unitPawnGeos.kingHead} material={unitPawnMats.kingSkin} castShadow />
                {/* Corona Imperial Dorada del Rey */}
                <group position={[0, 0.16, 0]}>
                  <mesh
                    geometry={unitPawnGeos.kingCrownRing}
                    material={unitPawnMats.kingCrown}
                    rotation={[Math.PI / 2, 0, 0]}
                    castShadow
                  />
                  <mesh
                    geometry={unitPawnGeos.kingCrownSpike}
                    material={unitPawnMats.kingCrown}
                    position={[0, 0.08, 0.18]}
                    castShadow
                  />
                </group>
              </group>
            </group>
          </group>
        ) : unit.esAscendido ? (
          <AscendedTitanMesh isJ1={isJ1} />
        ) : (
          <DetailedCreatureMesh level={unit.nivel} isJ1={isJ1} trimColor={trimColor} primaryColor={primaryColor} />
        )}

        {/* Partículas Elementales 3D Orbitantes según los orbes asignados (compatible con orbs y equippedOrbs) */}
        {((unit.equippedOrbs && unit.equippedOrbs.length > 0) || (unit.orbs && unit.orbs.length > 0)) && (
          <ElementalOrbParticles orbs={unit.equippedOrbs || unit.orbs} yOffset={unit.esMaestra ? 1.8 : 1.1} />
        )}

        {/* Escudo Arcano visual */}
        {unit.hasShield && (
          <group position={[0, 0.8, 0]}>
            <mesh geometry={unitPawnGeos.arcaneShield} material={unitPawnMats.arcaneShield} />
          </group>
        )}

        {/* Campo Gravitatorio Protector alrededor de la Maestra */}
        {(unit.gravityTurns || 0) > 0 && (
          <group position={[0, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <mesh geometry={unitPawnGeos.gravityRing} material={unitPawnMats.gravityRing} />
          </group>
        )}

        {isSelected && (
          <mesh geometry={unitPawnGeos.selectionDisc} material={unitPawnMats.selectionDisc} position={[0, 0.02, 0]} />
        )}
      </group>

      {/* Barra de vida billboard nativa en WebGL Sprite (cero capas DOM <Html> en Android) */}
      {!hideHealthBar && (
        <sprite
          position={[0, hpBarY, 0]}
          scale={[2.45, 0.62, 1]}
          material={healthSprite.mat}
          renderOrder={12}
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        />
      )}
    </group>
  );
}

// Pre-generar geometría de estrellas una sola vez fuera del render
const starFieldGeometry = (() => {
  const starCount = 350;
  const positions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 0.85); // Hemisferio superior
    const rad = 75 + Math.random() * 15;
    positions[i * 3] = rad * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = rad * Math.cos(phi) - 4;
    positions[i * 3 + 2] = rad * Math.sin(phi) * Math.sin(theta);
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  markGeometryAsShared(geom);
  return geom;
})();

// Geometrías y materiales compartidos del pedestal fallback si falla la carga de tablero.glb
const fallbackBoardGeos = {
  upperDeck: markGeometryAsShared(new THREE.CylinderGeometry(7.7, 8.2, 0.52, 6)),
  lowerPlinth: markGeometryAsShared(new THREE.CylinderGeometry(9.2, 10.1, 0.9, 6)),
  runicRim: markGeometryAsShared(new THREE.TorusGeometry(8.05, 0.14, 8, 6)),
  outerRim: markGeometryAsShared(new THREE.TorusGeometry(9.35, 0.18, 8, 12)),
  pillar: markGeometryAsShared(new THREE.CylinderGeometry(0.42, 0.56, 1.55, 8)),
  pillarOrb: markGeometryAsShared(new THREE.OctahedronGeometry(0.32)),
};

const fallbackBoardMats = {
  stoneDeck: markMaterialAsShared(
    new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.72, metalness: 0.28 })
  ),
  obsidianPlinth: markMaterialAsShared(
    new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.85, metalness: 0.22 })
  ),
  brassTrim: markMaterialAsShared(
    new THREE.MeshStandardMaterial({ color: '#b45309', roughness: 0.35, metalness: 0.78 })
  ),
  runeGlowDay: markMaterialAsShared(
    new THREE.MeshStandardMaterial({
      color: '#38bdf8',
      emissive: '#0284c7',
      emissiveIntensity: 1.4,
      roughness: 0.25,
    })
  ),
  runeGlowSunset: markMaterialAsShared(
    new THREE.MeshStandardMaterial({
      color: '#fbbf24',
      emissive: '#f97316',
      emissiveIntensity: 1.6,
      roughness: 0.25,
    })
  ),
  runeGlowNight: markMaterialAsShared(
    new THREE.MeshStandardMaterial({
      color: '#c084fc',
      emissive: '#7c3aed',
      emissiveIntensity: 1.7,
      roughness: 0.25,
    })
  ),
};

const FALLBACK_BOARD_PILLAR_ANGLES = [0, 1, 2, 3, 4, 5].map((i) => (i * Math.PI) / 3);

function FallbackArenaBoardBase({ timeOfDay = 0 }: { timeOfDay?: 0 | 1 | 2 }) {
  const isMobile = isMobileOptimizationTarget();
  const runeMat =
    timeOfDay === 1
      ? fallbackBoardMats.runeGlowSunset
      : timeOfDay === 2
      ? fallbackBoardMats.runeGlowNight
      : fallbackBoardMats.runeGlowDay;

  return (
    <group position={[0, 0, 0]}>
      <mesh
        geometry={fallbackBoardGeos.upperDeck}
        material={fallbackBoardMats.stoneDeck}
        position={[0, -0.32, 0]}
        rotation={[0, Math.PI / 6, 0]}
        receiveShadow={!isMobile}
      />
      <mesh
        geometry={fallbackBoardGeos.lowerPlinth}
        material={fallbackBoardMats.obsidianPlinth}
        position={[0, -0.98, 0]}
        rotation={[0, Math.PI / 6, 0]}
        receiveShadow={!isMobile}
      />
      <mesh
        geometry={fallbackBoardGeos.runicRim}
        material={runeMat}
        position={[0, -0.08, 0]}
        rotation={[-Math.PI / 2, 0, Math.PI / 6]}
      />
      <mesh
        geometry={fallbackBoardGeos.outerRim}
        material={fallbackBoardMats.brassTrim}
        position={[0, -0.56, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      />
      {FALLBACK_BOARD_PILLAR_ANGLES.map((ang, idx) => {
        const px = Math.cos(ang) * 8.65;
        const pz = Math.sin(ang) * 8.65;
        return (
          <group key={idx} position={[px, -0.45, pz]}>
            <mesh
              geometry={fallbackBoardGeos.pillar}
              material={fallbackBoardMats.obsidianPlinth}
              castShadow={!isMobile}
              receiveShadow={!isMobile}
            />
            <mesh
              geometry={fallbackBoardGeos.pillarOrb}
              material={runeMat}
              position={[0, 1.05, 0]}
            />
          </group>
        );
      })}
    </group>
  );
}

/**
 * 3D Gran Arena y Campo de Batalla del Torneo (Diseño Monumental y Orgánico)
 */
function ArenaEnvironment({
  timeOfDay = 0,
}: {
  timeOfDay?: 0 | 1 | 2;
}) {
  const { model: officialTablero } = useTableroGlbModel();

  // Colores temáticos para el cielo y estrellas según la hora de batalla
  const skyColorTop = timeOfDay === 1 ? '#451a03' : timeOfDay === 2 ? '#020617' : '#0c192e';
  const skyColorBottom = timeOfDay === 1 ? '#7c2d12' : timeOfDay === 2 ? '#0f172a' : '#1e293b';

  return (
    <group>
      {/* 1. Bóveda Celeste / Domo Atmosférico Envolvente (Elimina el fondo negro plano) */}
      <mesh position={[0, -2, 0]}>
        <sphereGeometry args={[95, 32, 24]} />
        <meshBasicMaterial color={skyColorTop} side={THREE.BackSide} />
      </mesh>

      {/* 2. Cúpula de Nebulosa Cósmica / Brillo de Horizonte */}
      <mesh position={[0, -8, 0]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[90, 92, 40, 32, 1, true]} />
        <meshBasicMaterial color={skyColorBottom} side={THREE.BackSide} transparent opacity={0.7} />
      </mesh>

      {/* 3. Campo de Estrellas y Polvo Estelar Brillante */}
      <points geometry={starFieldGeometry}>
        <pointsMaterial
          size={timeOfDay === 1 ? 0.35 : 0.45}
          color={timeOfDay === 1 ? '#fed7aa' : timeOfDay === 2 ? '#7dd3fc' : '#ffffff'}
          transparent
          opacity={0.85}
        />
      </points>

      {/* 4. Niebla Volumétrica Suave en la Base para dar profundidad al abismo */}
      <mesh position={[0, -5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[140, 140]} />
        <meshBasicMaterial color={skyColorTop} transparent opacity={0.65} />
      </mesh>

      {/* 5. Modelo 3D Oficial GLB 'tablero.glb' o plataforma pedestal fallback si falla CDN */}
      {officialTablero ? (
        <primitive object={officialTablero} />
      ) : (
        <FallbackArenaBoardBase timeOfDay={timeOfDay} />
      )}
    </group>
  );
}

function FloatingTextSpriteItem({ item }: { item: FloatingText }) {
  const isCrit = item.text.includes('CRÍTICO') || item.text.includes('¡') || item.color === '#f59e0b';

  const spriteRes = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 420;
    canvas.height = 80;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = 'bold 26px monospace';
      const measuredW = Math.min(canvas.width - 28, Math.max(110, ctx.measureText(item.text).width + 36));
      const boxX = (canvas.width - measuredW) / 2;
      drawRoundedRectPath(ctx, boxX, 12, measuredW, 56, 26);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.78)';
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = item.color || '#f87171';
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = item.color || '#f87171';
      ctx.fillText(item.text, canvas.width / 2, 41, measuredW - 18);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;

    const spriteMat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });
    const dotMat = new THREE.MeshBasicMaterial({ color: item.color });
    const ringMat = new THREE.MeshBasicMaterial({ color: item.color, transparent: true, opacity: 0.6 });

    return { tex, spriteMat, dotMat, ringMat };
  }, [item.text, item.color]);

  useEffect(() => {
    return () => {
      try { spriteRes.tex.dispose(); } catch (_) {}
      try { spriteRes.spriteMat.dispose(); } catch (_) {}
      try { spriteRes.dotMat.dispose(); } catch (_) {}
      try { spriteRes.ringMat.dispose(); } catch (_) {}
    };
  }, [spriteRes]);

  return (
    <group position={item.position} userData={{ floatingId: item.id }}>
      <mesh
        geometry={floatingIndicatorSphereGeo}
        material={spriteRes.dotMat}
        scale={isCrit ? 1.35 : 0.9}
      />
      <mesh
        geometry={floatingIndicatorRingGeo}
        material={spriteRes.ringMat}
        position={[0, 0.05, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={isCrit ? 1.3 : 0.9}
      />
      <sprite
        position={[0, 0.75, 0]}
        scale={[3.8, 0.72, 1]}
        material={spriteRes.spriteMat}
        renderOrder={15}
      />
    </group>
  );
}

// 3D Floating Combat Damage & Status Texts con Sprite WebGL nativo (sin capas DOM <Html>)
function FloatingTextsRenderer({ texts, isPaused = false }: { texts: FloatingText[]; isPaused?: boolean }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (isPaused || !groupRef.current) return;
    const clampedDelta = Math.min(delta, 0.05);
    groupRef.current.children.forEach((child: any) => {
      if (child.userData?.floatingId) {
        child.position.y += clampedDelta * 1.6;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {texts.map((item) => (
        <FloatingTextSpriteItem key={item.id} item={item} />
      ))}
    </group>
  );
}

function WeatherBannerSprite({
  weatherModifierName,
  weatherModifierDesc,
}: {
  weatherModifierName: string;
  weatherModifierDesc?: string;
}) {
  const bannerRes = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawRoundedRectPath(ctx, 26, 8, canvas.width - 52, 40, 20);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 21px serif';
      ctx.fillStyle = 'rgba(253, 230, 138, 0.85)';
      ctx.fillText(weatherModifierName, canvas.width / 2, 29, canvas.width - 80);

      if (weatherModifierDesc) {
        ctx.font = '600 17px sans-serif';
        ctx.fillStyle = 'rgba(203, 213, 225, 0.78)';
        ctx.fillText(weatherModifierDesc, canvas.width / 2, 70, canvas.width - 36);
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;

    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      depthTest: false,
    });
    return { tex, mat };
  }, [weatherModifierName, weatherModifierDesc]);

  useEffect(() => {
    return () => {
      try { bannerRes.tex.dispose(); } catch (_) {}
      try { bannerRes.mat.dispose(); } catch (_) {}
    };
  }, [bannerRes]);

  return (
    <sprite
      position={[0, 6.2, -8.5]}
      scale={[5.6, 1.05, 1]}
      material={bannerRes.mat}
      renderOrder={8}
    />
  );
}

// Elemento individual de VFX de hechizo con reloj interno pausable y desvanecimiento transparente
function SpellVFXItem({ vfx, isPaused }: { vfx: SpellVFX; isPaused: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const elapsedRef = useRef(0);

  useFrame((_, delta) => {
    if (isPaused || !meshRef.current) return;
    const clampedDelta = Math.min(delta, 0.05);
    elapsedRef.current += clampedDelta;
    const progress = Math.min(1, elapsedRef.current / 0.85);
    const mat = meshRef.current.material as THREE.Material & { opacity?: number };

    if (vfx.type === 'rayo') {
      meshRef.current.scale.set(1, Math.max(0.01, 1 - progress), 1);
      if (mat && typeof mat.opacity === 'number') {
        mat.opacity = Math.max(0, 0.9 * (1 - progress * 0.5));
      }
    } else if (vfx.type === 'escudo' || vfx.type === 'gravedad') {
      meshRef.current.scale.setScalar(1 + progress * 0.4);
      if (mat && typeof mat.opacity === 'number') {
        const baseOpacity = vfx.type === 'escudo' ? 0.7 : 0.9;
        mat.opacity = Math.max(0, baseOpacity * (1 - progress));
      }
    } else {
      meshRef.current.position.y = progress * 4.5;
      meshRef.current.scale.setScalar(1 + progress * 1.2);
      meshRef.current.rotation.y += clampedDelta * 4.5;
      if (mat && typeof mat.opacity === 'number') {
        mat.opacity = Math.max(0, 1 - progress);
      }
    }
  });

  const [ox, oy, oz] = vfx.origin;

  if (vfx.type === 'rayo') {
    return (
      <group position={[ox, oy, oz]}>
        <mesh ref={meshRef} position={[0, 4, 0]}>
          <cylinderGeometry args={[0.18, 0.35, 8, 8]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.9} depthWrite={false} />
        </mesh>
      </group>
    );
  }

  if (vfx.type === 'escudo') {
    return (
      <group position={[ox, oy + 0.8, oz]}>
        <mesh ref={meshRef}>
          <sphereGeometry args={[1.2, 16, 16]} />
          <meshStandardMaterial
            color="#34d399"
            emissive="#10b981"
            emissiveIntensity={1.8}
            transparent
            opacity={0.7}
            roughness={0.2}
            depthWrite={false}
          />
        </mesh>
      </group>
    );
  }

  if (vfx.type === 'gravedad') {
    return (
      <group position={[ox, oy + 0.15, oz]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh ref={meshRef}>
          <torusGeometry args={[1.9, 0.12, 10, 28]} />
          <meshStandardMaterial
            color="#818cf8"
            emissive="#6366f1"
            emissiveIntensity={2.5}
            transparent
            opacity={0.9}
            depthWrite={false}
          />
        </mesh>
      </group>
    );
  }

  return (
    <group position={[ox, oy + 0.5, oz]}>
      <mesh ref={meshRef}>
        <octahedronGeometry args={[0.8]} />
        <meshStandardMaterial
          color={vfx.color}
          emissive={vfx.color}
          emissiveIntensity={2.5}
          transparent
          opacity={1}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

// 3D Animated Visual Effects for Spells
function SpellVFXRenderer({ vfxList, isPaused = false }: { vfxList: SpellVFX[]; isPaused?: boolean }) {
  return (
    <group>
      {vfxList.map((vfx) => (
        <SpellVFXItem key={vfx.id} vfx={vfx} isPaused={isPaused} />
      ))}
    </group>
  );
}

// Materiales compartidos cacheados globalmente para RealisticDie (evita re-instanciar texturas y materiales en cada frame/render)
const realisticDieMaterialCache: Record<string, THREE.MeshStandardMaterial[]> = {};

function getCachedRealisticDieMaterials(theme: 'arcane' | 'gold' | 'crimson'): THREE.MeshStandardMaterial[] {
  if (realisticDieMaterialCache[theme]) {
    return realisticDieMaterialCache[theme];
  }
  const facePips = [3, 4, 2, 5, 1, 6];
  const mats = facePips.map((pip) => {
    const tex = getDieFaceCanvasTexture(theme, pip);
    if (tex) {
      tex.userData = tex.userData || {};
      tex.userData.sharedAsset = true;
    }
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.35,
      metalness: 0.2,
    });
    mat.userData = mat.userData || {};
    mat.userData.sharedAsset = true;
    return mat;
  });
  realisticDieMaterialCache[theme] = mats;
  return mats;
}

// 3D Realistic Pip Die con Biselado, Puntos Hundidos y Texturas Rúnicas Oficiales
function RealisticDie({
  theme,
  orbs = [],
}: {
  theme: 'arcane' | 'gold' | 'crimson';
  orbs?: Array<{ element?: string; name?: string; color?: string }>;
}) {
  const materials = useMemo(() => getCachedRealisticDieMaterials(theme), [theme]);

  // Detección de elementos de orbes equipados para emitir partículas 3D activas al rodar
  const orbEffects = useMemo(() => {
    const list: Array<{ color: string; emissive: string; type: string }> = [];
    if (!orbs || orbs.length === 0) {
      if (theme === 'gold') list.push({ color: '#f59e0b', emissive: '#d97706', type: 'fire' });
      else if (theme === 'crimson') list.push({ color: '#ef4444', emissive: '#b91c1c', type: 'fire' });
      else list.push({ color: '#38bdf8', emissive: '#0284c7', type: 'arcane' });
      return list;
    }

    orbs.forEach((o) => {
      list.push(resolveOrbVisualEffect(o));
    });

    return list;
  }, [orbs, theme]);

  const sparksRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!sparksRef.current) return;
    const t = clock.getElapsedTime() * 6.0;
    sparksRef.current.rotation.y = t * 1.5;
    sparksRef.current.children.forEach((child: any, i) => {
      const radius = 0.65 + Math.sin(t * 2.0 + i) * 0.15;
      const angle = (i / sparksRef.current!.children.length) * Math.PI * 2 + t * 0.8;
      child.position.x = Math.cos(angle) * radius;
      child.position.z = Math.sin(angle) * radius;
      child.position.y = Math.sin(t * 3.0 + i * 1.5) * 0.45;
    });
  });

  return (
    <group>
      {/* Cuerpo principal del dado con aristas nítidas y texturas de 6 caras temáticas */}
      <mesh geometry={unitPawnGeos.dieBox} material={materials} castShadow receiveShadow />

      {/* Partículas Elementales Orbitantes e Ígneas según orbes engarzados */}
      <group ref={sparksRef}>
        {orbEffects.map((eff, idx) => (
          <group key={idx}>
            <mesh>
              <sphereGeometry args={[eff.type === 'fire' ? 0.08 : 0.065, 8, 8]} />
              <meshStandardMaterial
                color={eff.color}
                emissive={eff.emissive}
                emissiveIntensity={3.5}
                transparent
                opacity={0.9}
              />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

// 3D Tumbling Realistic Dice Visualization con Física Parabólica
function RollingDice3D({
  rolling,
  rolledDiceResults = [],
  isPaused = false,
}: {
  rolling: boolean;
  rolledDiceResults?: RolledDieResult[];
  isPaused?: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const d1Ref = useRef<THREE.Group>(null);
  const d2Ref = useRef<THREE.Group>(null);
  const d3Ref = useRef<THREE.Group>(null);
  const shadow1Ref = useRef<THREE.Mesh>(null);
  const shadow2Ref = useRef<THREE.Mesh>(null);
  const shadow3Ref = useRef<THREE.Mesh>(null);
  const ringShockRef = useRef<THREE.Mesh>(null);
  const elapsedRef = useRef<number>(0);

  useFrame((_, delta) => {
    if (!rolling) {
      elapsedRef.current = 0;
      return;
    }
    if (isPaused) return;

    const clampedDelta = Math.min(delta, 0.05);
    elapsedRef.current += clampedDelta;
    const elapsed = elapsedRef.current;

    // Curva física de rebotes amortiguados prolongada (~2.8s de suspensión y rodamiento real)
    const bounceDecay = Math.max(0, 1 - elapsed * 0.42);
    const bounce1 = Math.abs(Math.sin(elapsed * 5.2)) * 4.2 * bounceDecay;
    const bounce2 = Math.abs(Math.sin(elapsed * 5.6 + 0.35)) * 4.6 * bounceDecay;
    const bounce3 = Math.abs(Math.sin(elapsed * 5.4 + 0.7)) * 4.3 * bounceDecay;
    const settle = Math.max(0, 1 - elapsed * 0.38);

    // Dado 1 (Azul / Arcano)
    if (d1Ref.current) {
      d1Ref.current.rotation.x += clampedDelta * (18 * settle + 1.2);
      d1Ref.current.rotation.y += clampedDelta * (22 * settle + 1.5);
      d1Ref.current.rotation.z += clampedDelta * (16 * settle + 1.0);
      const xPos = -1.6 + Math.sin(elapsed * 3.2) * 0.35 * settle;
      const zPos = 0.2 + Math.cos(elapsed * 3.6) * 0.35 * settle;
      const yPos = 0.42 + bounce1;
      d1Ref.current.position.set(xPos, yPos, zPos);

      if (shadow1Ref.current) {
        shadow1Ref.current.position.set(xPos, 0.02, zPos);
        const s = THREE.MathUtils.lerp(1.3, 0.6, Math.min(1, bounce1 / 3.2));
        shadow1Ref.current.scale.set(s, s, 1);
      }
    }

    // Dado 2 (Dorado / Solar Central)
    if (d2Ref.current) {
      d2Ref.current.rotation.x += clampedDelta * (24 * settle + 1.8);
      d2Ref.current.rotation.y += clampedDelta * (17 * settle + 1.4);
      d2Ref.current.rotation.z += clampedDelta * (26 * settle + 1.6);
      const xPos = 0 + Math.sin(elapsed * 4.2) * 0.3 * settle;
      const zPos = 0.5 + Math.cos(elapsed * 3.4) * 0.3 * settle;
      const yPos = 0.42 + bounce2;
      d2Ref.current.position.set(xPos, yPos, zPos);

      if (shadow2Ref.current) {
        shadow2Ref.current.position.set(xPos, 0.02, zPos);
        const s = THREE.MathUtils.lerp(1.4, 0.65, Math.min(1, bounce2 / 3.2));
        shadow2Ref.current.scale.set(s, s, 1);
      }
    }

    // Dado 3 (Carmesí / Fuego)
    if (d3Ref.current) {
      d3Ref.current.rotation.x += clampedDelta * (18 * settle + 1.4);
      d3Ref.current.rotation.y += clampedDelta * (25 * settle + 1.8);
      d3Ref.current.rotation.z += clampedDelta * (20 * settle + 1.5);
      const xPos = 1.6 + Math.cos(elapsed * 3.8) * 0.35 * settle;
      const zPos = 0.2 + Math.sin(elapsed * 4.4) * 0.35 * settle;
      const yPos = 0.42 + bounce3;
      d3Ref.current.position.set(xPos, yPos, zPos);

      if (shadow3Ref.current) {
        shadow3Ref.current.position.set(xPos, 0.02, zPos);
        const s = THREE.MathUtils.lerp(1.3, 0.6, Math.min(1, bounce3 / 3.2));
        shadow3Ref.current.scale.set(s, s, 1);
      }
    }

    // Onda mística de choque expandiéndose al aterrizar
    if (ringShockRef.current) {
      const shockProgress = (elapsed * 1.2) % 1;
      const scale = THREE.MathUtils.lerp(1.0, 3.8, shockProgress);
      ringShockRef.current.scale.set(scale, scale, 1);
      (ringShockRef.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.8 * (1 - shockProgress));
    }
  });

  if (!rolling) return null;

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Sombras proyectadas individuales y adaptadas a la altura */}
      <mesh ref={shadow1Ref} position={[-1.6, 0.02, 0.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.55, 16]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.65} />
      </mesh>
      <mesh ref={shadow2Ref} position={[0, 0.02, 0.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.6, 16]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.7} />
      </mesh>
      <mesh ref={shadow3Ref} position={[1.6, 0.02, 0.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.55, 16]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.65} />
      </mesh>

      {/* Onda de choque rúnica concéntrica al rodar */}
      <mesh ref={ringShockRef} position={[0, 0.03, 0.3]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.8, 1.1, 24]} />
        <meshBasicMaterial color="#f59e0b" transparent opacity={0.7} />
      </mesh>

      {/* Círculo místico de lanzamiento de invocación */}
      <mesh position={[0, 0.025, 0.3]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.2, 2.35, 32]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.6} />
      </mesh>

      {/* Dados 3D detallados con arte rúnico exacto y partículas de orbes */}
      <group ref={d1Ref} position={[-1.6, 3.5, 0.2]}>
        <RealisticDie theme="arcane" orbs={rolledDiceResults[0]?.dieRef?.attachedOrbs || []} />
      </group>
      <group ref={d2Ref} position={[0, 4.2, 0.5]}>
        <RealisticDie theme="gold" orbs={rolledDiceResults[1]?.dieRef?.attachedOrbs || []} />
      </group>
      <group ref={d3Ref} position={[1.6, 3.8, 0.2]}>
        <RealisticDie theme="crimson" orbs={rolledDiceResults[2]?.dieRef?.attachedOrbs || []} />
      </group>
    </group>
  );
}

// Cámara Cinemática y Dinámica con 3 Modos y Rotación Libre del Campo
function ResponsiveCameraRig({
  cameraMode = 'TACTICAL',
  boardRotation = 0,
  isPaused = false,
}: {
  cameraMode?: 'TACTICAL' | 'ISOMETRIC' | 'CINEMATIC';
  boardRotation?: number;
  isPaused?: boolean;
}) {
  const { camera, size } = useThree();
  const targetPosRef = useRef(new THREE.Vector3(0, 18, 12));
  const targetLookRef = useRef(new THREE.Vector3(0, -1.4, -1.2));
  const currentRotRef = useRef<number>(boardRotation);

  useFrame((_, delta) => {
    if (isPaused) return;
    const aspect = size.width / Math.max(1, size.height);
    if (!Number.isFinite(aspect) || aspect <= 0) return;
    const clampedDelta = Math.min(delta, 0.05);

    // Suavizado angular continuo de la rotación del campo
    const rotLerpRate = 1 - Math.exp(-10 * clampedDelta);
    currentRotRef.current = THREE.MathUtils.lerp(currentRotRef.current, boardRotation, rotLerpRate);
    const theta = currentRotRef.current;

    let baseDist = 12.0;
    let baseY = 18.0;
    let lookDist = -1.2;
    let lookY = -1.4;

    if (cameraMode === 'TACTICAL') {
      if (aspect < 0.8) {
        baseDist = 14.5;
        baseY = 22.0;
        lookDist = -1.2;
        lookY = -1.8;
      } else if (aspect < 1.3) {
        baseDist = 13.0;
        baseY = 19.5;
        lookDist = -1.2;
        lookY = -1.5;
      } else {
        baseDist = 11.5;
        baseY = 17.5;
        lookDist = -1.2;
        lookY = -1.3;
      }
    } else if (cameraMode === 'ISOMETRIC') {
      if (aspect < 0.8) {
        baseDist = 15.5;
        baseY = 16.0;
        lookDist = -0.5;
        lookY = 0.2;
      } else {
        baseDist = 13.0;
        baseY = 13.5;
        lookDist = -0.5;
        lookY = 0.5;
      }
    } else if (cameraMode === 'CINEMATIC') {
      if (aspect < 0.8) {
        baseDist = 11.5;
        baseY = 10.5;
        lookDist = 0;
        lookY = 1.2;
      } else {
        baseDist = 9.5;
        baseY = 8.5;
        lookDist = 0;
        lookY = 1.4;
      }
    }

    // Proyección orbital cilíndrica alrededor del centro del tablero con el ángulo theta
    const camX = Math.sin(theta) * baseDist;
    const camZ = Math.cos(theta) * baseDist;
    const lookX = Math.sin(theta) * lookDist;
    const lookZ = Math.cos(theta) * lookDist;

    targetPosRef.current.set(camX, baseY, camZ);
    targetLookRef.current.set(lookX, lookY, lookZ);

    const lerpRate = 1 - Math.exp(-8 * clampedDelta);
    camera.position.lerp(targetPosRef.current, lerpRate);

    tempV3.copy(targetLookRef.current);
    camera.lookAt(tempV3);
  });

  return null;
}

// Lighting Rig
function GameLighting({ timeOfDay = 0 }: { timeOfDay?: 0 | 1 | 2 }) {
  const ambientIntensity = getConfig('ambientIntensity');
  const sunIntensity = getConfig('sunIntensity');
  const hemiIntensity = getConfig('hemiIntensity');
  const hemiSkyColor = getConfig('hemiSkyColor');
  const hemiGroundColor = getConfig('hemiGroundColor');

  const isMobileDevice = isMobileOptimizationTarget();

  // En móvil desactivamos sombras en tiempo real para evitar duplicar pasadas de GPU. En escritorio limitamos a 1024.
  const enableShadows = !isMobileDevice;
  const shadowResolution = 1024;

  // Moduladores lumínicos del ciclo Día / Atardecer / Noche en el combate
  const sunColor =
    timeOfDay === 1 ? '#f97316' : timeOfDay === 2 ? '#93c5fd' : '#ffffff';
  const effectiveSunIntensity =
    timeOfDay === 1 ? sunIntensity * 1.15 : timeOfDay === 2 ? sunIntensity * 0.78 : sunIntensity;
  const effectiveAmbient =
    timeOfDay === 1 ? ambientIntensity * 1.05 : timeOfDay === 2 ? Math.max(1.45, ambientIntensity * 0.92) : ambientIntensity;
  const effectiveHemiSky =
    timeOfDay === 1 ? '#fbbf24' : timeOfDay === 2 ? '#7dd3fc' : hemiSkyColor;
  const effectiveHemiGround =
    timeOfDay === 1 ? '#451a03' : timeOfDay === 2 ? '#1e293b' : hemiGroundColor;

  return (
    <>
      <hemisphereLight args={[effectiveHemiSky, effectiveHemiGround, hemiIntensity]} />
      <directionalLight
        position={[8, 22, 10]}
        intensity={effectiveSunIntensity}
        color={sunColor}
        castShadow={enableShadows}
        shadow-mapSize={[shadowResolution, shadowResolution]}
        shadow-camera-near={0.5}
        shadow-camera-far={45}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-bias={-0.0005}
      />
      <directionalLight
        position={[-6, 18, -8]}
        intensity={timeOfDay === 2 ? 1.35 : 1.8}
        color={timeOfDay === 1 ? '#fde047' : timeOfDay === 2 ? '#7dd3fc' : '#f8fafc'}
      />
      <ambientLight intensity={effectiveAmbient} />
      {/* Luz puntual cenital amplia para iluminar tanto el hexágono central como el anillo exterior */}
      <pointLight
        position={[0, 10, 0]}
        intensity={timeOfDay === 2 ? 55 : 32}
        color={timeOfDay === 1 ? '#fed7aa' : timeOfDay === 2 ? '#93c5fd' : '#e0e7ff'}
        distance={32}
        decay={1.6}
      />
    </>
  );
}

interface GameCanvasProps {
  units: UnitData[];
  selectedUnitId: string | null;
  cellMov: number[];
  cellAtq: number[];
  cellInv: number[];
  rollingDice: boolean;
  floatingTexts: FloatingText[];
  spellVFXList?: SpellVFX[];
  specialRunes?: SpecialHexRune[];
  hoveredEnemyUnit?: UnitData | null;
  rolledDiceResults?: RolledDieResult[];
  cameraMode?: 'TACTICAL' | 'ISOMETRIC' | 'CINEMATIC';
  boardRotation?: number;
  hideHealthBars?: boolean;
  timeOfDay?: 0 | 1 | 2;
  weatherModifierName?: string;
  weatherModifierDesc?: string;
  onTileClick: (id: number) => void;
  onTileHover?: (rune: SpecialHexRune | null) => void;
  onUnitClick: (unit: UnitData) => void;
  onUnitHover?: (unit: UnitData | null) => void;
  isPaused: boolean;
}

export default function Game({
  units,
  selectedUnitId,
  cellMov,
  cellAtq,
  cellInv,
  rollingDice,
  floatingTexts,
  spellVFXList = [],
  specialRunes = [],
  hoveredEnemyUnit = null,
  rolledDiceResults = [],
  cameraMode = 'TACTICAL',
  boardRotation = 0,
  hideHealthBars = false,
  timeOfDay = 0,
  weatherModifierName,
  weatherModifierDesc,
  onTileClick,
  onTileHover,
  onUnitClick,
  onUnitHover,
  isPaused,
}: GameCanvasProps) {
  // Detectar entorno móvil real antes de memorizar opciones de WebGL
  const isMobileClient = isMobileOptimizationTarget();

  const camX = getConfig('cameraX');
  const camY = getConfig('cameraY');
  const camZ = getConfig('cameraZ');
  const fov = getConfig('fov');
  const canvasCamera = useMemo(
    () => ({ position: [camX, camY, camZ] as [number, number, number], fov }),
    [camX, camY, camZ, fov]
  );
  const canvasGl = useMemo(
    () => ({
      powerPreference: (isMobileClient ? 'default' : 'high-performance') as WebGLPowerPreference,
      antialias: !isMobileClient,
      preserveDrawingBuffer: false,
      failIfMajorPerformanceCaveat: false,
    }),
    [isMobileClient]
  );

  // Cálculo de Previsión de Daño y Trayectoria sincronizado al 100% con la lógica canónica de combate
  const trajectoryData = useMemo(() => {
    if (!selectedUnitId || !hoveredEnemyUnit) return null;
    const attacker = units.find((u) => u.id === selectedUnitId);
    if (!attacker || attacker.yaSeMovio || attacker.isFrozen || attacker.dueño === hoveredEnemyUnit.dueño) return null;

    const attackerCoord = HEX_MAP[attacker.posicion];
    const targetCoord = HEX_MAP[hoveredEnemyUnit.posicion];
    if (!attackerCoord || !targetCoord) return null;

    if (!cellAtq.includes(hoveredEnemyUnit.posicion)) return null;

    const calc = calculateAttackDamagePreview(attacker, hoveredEnemyUnit, timeOfDay);

    return {
      attackerCoord,
      targetCoord,
      damageAmount: calc.totalEstimatedDamage,
      targetHpBefore: hoveredEnemyUnit.hpActual,
      targetHpAfter: calc.remainingHp,
    };
  }, [selectedUnitId, hoveredEnemyUnit, units, cellAtq, timeOfDay]);

  const runicTileTexture = useMemo(() => {
    const tex = getHexTileRunicTexture();
    if (tex) {
      tex.userData = tex.userData || {};
      tex.userData.sharedAsset = true;
    }
    return tex;
  }, []);

  const actionRingMaterials = useMemo(
    () => ({
      selection: new THREE.MeshBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0.88 }),
      attack: new THREE.MeshBasicMaterial({ color: '#ef4444', transparent: true, opacity: 0.88 }),
      invocation: new THREE.MeshBasicMaterial({ color: '#fbbf24', transparent: true, opacity: 0.88 }),
      movement: new THREE.MeshBasicMaterial({ color: '#10b981', transparent: true, opacity: 0.88 }),
      gravity: new THREE.MeshBasicMaterial({ color: '#818cf8', transparent: true, opacity: 0.72 }),
    }),
    []
  );

  const selectedUnitHex = useMemo(() => {
    if (!selectedUnitId) return -1;
    return units.find((u) => u.id === selectedUnitId)?.posicion ?? -1;
  }, [selectedUnitId, units]);

  const gravityBlockedHexes = useMemo(() => {
    const blocked = new Set<number>();
    units.forEach((u) => {
      if (u.esMaestra && (u.gravityTurns || 0) > 0) {
        HEX_GRID.forEach((c) => {
          if (getHexDistance(u.posicion, c.id) === 1) {
            blocked.add(c.id);
          }
        });
      }
    });
    return blocked;
  }, [units]);

  const actionRings = useMemo(() => {
    const movSet = new Set(cellMov);
    const atkSet = new Set(cellAtq);
    const invSet = new Set(cellInv);

    return HEX_GRID.reduce<Array<{ coord: HexCoord; ringMaterial: THREE.MeshBasicMaterial }>>(
      (acc, coord) => {
        const isSel = selectedUnitHex === coord.id;
        const isAtk = atkSet.has(coord.id);
        const isInv = invSet.has(coord.id);
        const isMov = movSet.has(coord.id);
        const isGravity = gravityBlockedHexes.has(coord.id);

        if (!isSel && !isAtk && !isInv && !isMov && !isGravity) {
          return acc;
        }

        const ringMaterial = isSel
          ? actionRingMaterials.selection
          : isAtk
          ? actionRingMaterials.attack
          : isInv
          ? actionRingMaterials.invocation
          : isMov
          ? actionRingMaterials.movement
          : actionRingMaterials.gravity;

        acc.push({ coord, ringMaterial });
        return acc;
      },
      []
    );
  }, [cellMov, cellAtq, cellInv, gravityBlockedHexes, selectedUnitHex, actionRingMaterials]);

  const { isContextLost, handleCanvasCreated } = useWebglContextRecovery();

  useEffect(() => {
    return () => {
      Object.values(actionRingMaterials).forEach((mat) => {
        if (mat && typeof mat.dispose === 'function') {
          try {
            mat.dispose();
          } catch (_) {}
        }
      });
    };
  }, [actionRingMaterials]);

  return (
    <div className="flex-1 w-full min-h-0 relative z-0 bg-slate-950 overflow-hidden">
      <Canvas
        camera={canvasCamera}
        shadows={!isMobileClient}
        dpr={isMobileClient ? [1, 1.2] : [1, 1.5]}
        gl={canvasGl}
        onCreated={handleCanvasCreated}
        onPointerMissed={() => {
          if (onUnitHover) onUnitHover(null);
        }}
        className="w-full h-full block"
      >
        <ThreeSceneCleanup />
        <ResponsiveCameraRig cameraMode={cameraMode} boardRotation={boardRotation} isPaused={isPaused} />
        <GameLighting timeOfDay={timeOfDay} />
        <ArenaEnvironment timeOfDay={timeOfDay} />

        {/* Indicador sutil de clima y modificador atmosférico en el entorno 3D (WebGL Sprite sin DOM <Html>) */}
        {weatherModifierName && !hideHealthBars && !isPaused && (
          <WeatherBannerSprite
            weatherModifierName={weatherModifierName}
            weatherModifierDesc={weatherModifierDesc}
          />
        )}

        {/* Instanced Hex Tiles Board: 61 celdas dibujadas en 1 sola llamada GPU con eventos nativos por instanceId */}
        <InstancedHexTilesBoard
          runicTexture={runicTileTexture}
          specialRunes={specialRunes}
          cellMov={cellMov}
          cellAtq={cellAtq}
          cellInv={cellInv}
          selectedUnitHex={selectedUnitHex}
          onTileClick={onTileClick}
          onTileHover={onTileHover}
        />

        {/* Resaltado de Anillos de Acción (Movimiento, Invocación, Gravedad y Ataque) */}
        <group>
          {actionRings.map(({ coord, ringMaterial }) => (
            <mesh
              key={`action_ring_${coord.id}`}
              geometry={actionRingGeometry}
              material={ringMaterial}
              position={[coord.worldX, 0.08, coord.worldZ]}
              rotation={[-Math.PI / 2, 0, 0]}
            />
          ))}
        </group>

        {/* Previsión de Trayectoria y Daño Visual */}
        {trajectoryData && (
          <AttackTrajectoryArc
            attackerCoord={trajectoryData.attackerCoord}
            targetCoord={trajectoryData.targetCoord}
            damageAmount={trajectoryData.damageAmount}
            targetHpBefore={trajectoryData.targetHpBefore}
            targetHpAfter={trajectoryData.targetHpAfter}
          />
        )}

        {/* 3D Units Pawns */}
        <group>
          {units.map((unit) => (
            <UnitPawn
              key={unit.id}
              unit={unit}
              isSelected={unit.id === selectedUnitId}
              hideHealthBar={hideHealthBars}
              isPaused={isPaused}
              onClick={() => onUnitClick(unit)}
              onHover={(hovered) => {
                if (onUnitHover) {
                  onUnitHover(hovered ? unit : null);
                }
              }}
            />
          ))}
        </group>

        {/* Dynamic Tumbling 3D Dice with Elemental Sparks */}
        <RollingDice3D rolling={rollingDice} rolledDiceResults={rolledDiceResults} isPaused={isPaused} />

        {/* 3D Animated Visual Effects for Spells */}
        <SpellVFXRenderer vfxList={spellVFXList} isPaused={isPaused} />

        {/* Floating Combat Texts */}
        <FloatingTextsRenderer texts={floatingTexts} isPaused={isPaused} />
      </Canvas>

      {isContextLost && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/75 pointer-events-none">
          <div className="px-4 py-2 rounded-2xl bg-slate-900/95 border border-amber-500/60 text-amber-300 font-serif text-xs shadow-xl">
            Restaurando gráficos 3D...
          </div>
        </div>
      )}
    </div>
  );
}
