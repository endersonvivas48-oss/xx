import React, { useMemo } from 'react';
import * as THREE from 'three';
import { markMaterialAsShared } from './ThreeSceneCleanup';
import { mergeStaticGeometries } from './InstancedGlbGroup';
import { isMobileOptimizationTarget } from './glbRuntimeOptimizer';

interface MonumentalGateProps {
  position: [number, number, number];
  rotationY: number;
  wallTex?: THREE.CanvasTexture;
  roofTex?: THREE.CanvasTexture;
  accentColor?: string;
}

// ========================================================
// GEOMETRÍAS COMBINADAS POR MATERIAL PARA PUERTAS MONUMENTALES (~8 DRAW CALLS TOTALES)
// ========================================================
const mergedGateGeos = {
  platformAndKeystone: mergeStaticGeometries([
    { geometry: new THREE.BoxGeometry(20, 0.3, 10), position: [0, 0.15, 6] },
    { geometry: new THREE.BoxGeometry(1.6, 1.6, 4.2), position: [0, 8.4, 0.2] },
  ]),
  darkStoneStructure: mergeStaticGeometries([
    // Casetas de aduana (flancos izquierdo y derecho)
    { geometry: new THREE.BoxGeometry(3.2, 2.6, 3.2), position: [-7, 0.3, 6] },
    { geometry: new THREE.BoxGeometry(3.2, 2.6, 3.2), position: [7, 0.3, 6] },
    // Matacanes de las torres gemelas
    { geometry: new THREE.CylinderGeometry(4.2, 3.4, 1.2, 16), position: [-6.5, 12.2, 0] },
    { geometry: new THREE.CylinderGeometry(4.2, 3.4, 1.2, 16), position: [6.5, 12.2, 0] },
    // Molduras del arco gótico central
    { geometry: new THREE.BoxGeometry(3.8, 1, 3.8), position: [-2, 6.8, 0.2], rotation: [0, 0, Math.PI / 6] },
    { geometry: new THREE.BoxGeometry(3.8, 1, 3.8), position: [2, 6.8, 0.2], rotation: [0, 0, -Math.PI / 6] },
  ]),
  boothRoofs: mergeStaticGeometries([
    { geometry: new THREE.ConeGeometry(2.4, 1.4, 4), position: [-7, 2.1, 6] },
    { geometry: new THREE.ConeGeometry(2.4, 1.4, 4), position: [7, 2.1, 6] },
  ]),
  towerShafts: mergeStaticGeometries([
    { geometry: new THREE.CylinderGeometry(3.4, 3.8, 12, 16), position: [-6.5, 6, 0] },
    { geometry: new THREE.CylinderGeometry(3.4, 3.8, 12, 16), position: [6.5, 6, 0] },
  ]),
  towerRoofs: mergeStaticGeometries([
    { geometry: new THREE.ConeGeometry(4.4, 5.5, 16), position: [-6.5, 15.5, 0] },
    { geometry: new THREE.ConeGeometry(4.4, 5.5, 16), position: [6.5, 15.5, 0] },
  ]),
  bannerPoles: mergeStaticGeometries([
    { geometry: new THREE.CylinderGeometry(0.08, 0.08, 2.4, 8), position: [-6.5, 18.5, 0] },
    { geometry: new THREE.CylinderGeometry(0.08, 0.08, 2.4, 8), position: [6.5, 18.5, 0] },
  ]),
  bannerCloths: mergeStaticGeometries([
    { geometry: new THREE.BoxGeometry(1.3, 0.8, 0.04), position: [-5.8, 18.5, 0] },
    { geometry: new THREE.BoxGeometry(1.3, 0.8, 0.04), position: [7.2, 18.5, 0] },
  ]),
  archBastion: mergeStaticGeometries([
    { geometry: new THREE.BoxGeometry(7.2, 6, 4), position: [0, 8.5, 0] },
  ]),
  ironWork: mergeStaticGeometries([
    // Travesaños del rastrillo
    { geometry: new THREE.BoxGeometry(5.2, 0.25, 0.15), position: [0, 6.0, 0.3] },
    { geometry: new THREE.BoxGeometry(5.2, 0.25, 0.15), position: [0, 4.7, 0.3] },
    // Barras y puntas del rastrillo
    ...[-2.0, -1.2, -0.4, 0.4, 1.2, 2.0].flatMap((bx) => [
      { geometry: new THREE.CylinderGeometry(0.07, 0.07, 2.6, 8), position: [bx, 4.8, 0.3] as [number, number, number] },
      { geometry: new THREE.ConeGeometry(0.1, 0.3, 8), position: [bx, 3.4, 0.3] as [number, number, number] },
    ]),
    // Cadenas del puente levadizo
    { geometry: new THREE.CylinderGeometry(0.05, 0.05, 7.5, 6), position: [-2.7, 2.9, -2.5], rotation: [Math.PI / 4, 0, 0] },
    { geometry: new THREE.CylinderGeometry(0.05, 0.05, 7.5, 6), position: [2.7, 2.9, -2.5], rotation: [Math.PI / 4, 0, 0] },
  ]),
  drawbridgePlank: mergeStaticGeometries([
    { geometry: new THREE.BoxGeometry(5.8, 0.4, 7.5), position: [0, 0.25, -5] },
  ]),
  lanternCores: mergeStaticGeometries([
    { geometry: new THREE.OctahedronGeometry(0.3), position: [-3.8, 3.6, 1.5] },
    { geometry: new THREE.OctahedronGeometry(0.3), position: [3.8, 3.6, 1.5] },
  ]),
  lanternGlows: mergeStaticGeometries([
    { geometry: new THREE.SphereGeometry(0.65, 10, 10), position: [-3.8, 3.6, 1.5] },
    { geometry: new THREE.SphereGeometry(0.65, 10, 10), position: [3.8, 3.6, 1.5] },
  ]),
};

const gateFixedMats = {
  platform: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.8 })),
  darkStone: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.75 })),
  boothRoof: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.6 })),
  bannerPole: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#f59e0b', metalness: 0.7 })),
  ironWork: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#1e293b', metalness: 0.9, roughness: 0.2 })),
  drawbridgeWood: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#451a03', roughness: 0.85 })),
  lanternCore: markMaterialAsShared(new THREE.MeshBasicMaterial({ color: '#fde047' })),
  lanternGlow: markMaterialAsShared(
    new THREE.MeshBasicMaterial({ color: '#f59e0b', transparent: true, opacity: 0.28, depthWrite: false })
  ),
  defaultTowerWall: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.85 })),
  defaultBastionWall: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.8 })),
  defaultRoof: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#1c1917', roughness: 0.5 })),
};

const gateAccentMatCache = new Map<string, THREE.MeshStandardMaterial>();
const gateTowerWallMatCache = new WeakMap<THREE.CanvasTexture, THREE.MeshStandardMaterial>();
const gateBastionWallMatCache = new WeakMap<THREE.CanvasTexture, THREE.MeshStandardMaterial>();
const gateRoofMatCache = new WeakMap<THREE.CanvasTexture, THREE.MeshStandardMaterial>();

function getGateAccentMat(accentColor: string): THREE.MeshStandardMaterial {
  let mat = gateAccentMatCache.get(accentColor);
  if (!mat) {
    mat = markMaterialAsShared(new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.4 }));
    gateAccentMatCache.set(accentColor, mat);
  }
  return mat;
}

function getGateTowerWallMat(wallTex?: THREE.CanvasTexture): THREE.MeshStandardMaterial {
  if (!wallTex) return gateFixedMats.defaultTowerWall;
  let mat = gateTowerWallMatCache.get(wallTex);
  if (!mat) {
    mat = markMaterialAsShared(
      new THREE.MeshStandardMaterial({ map: wallTex, color: '#475569', roughness: 0.85 })
    );
    gateTowerWallMatCache.set(wallTex, mat);
  }
  return mat;
}

function getGateBastionWallMat(wallTex?: THREE.CanvasTexture): THREE.MeshStandardMaterial {
  if (!wallTex) return gateFixedMats.defaultBastionWall;
  let mat = gateBastionWallMatCache.get(wallTex);
  if (!mat) {
    mat = markMaterialAsShared(
      new THREE.MeshStandardMaterial({ map: wallTex, color: '#334155', roughness: 0.8 })
    );
    gateBastionWallMatCache.set(wallTex, mat);
  }
  return mat;
}

function getGateRoofMat(roofTex?: THREE.CanvasTexture): THREE.MeshStandardMaterial {
  if (!roofTex) return gateFixedMats.defaultRoof;
  let mat = gateRoofMatCache.get(roofTex);
  if (!mat) {
    mat = markMaterialAsShared(
      new THREE.MeshStandardMaterial({ map: roofTex, color: '#1c1917', roughness: 0.5 })
    );
    gateRoofMatCache.set(roofTex, mat);
  }
  return mat;
}

/**
 * Puerta Monumental con zona de control aduanera, torres de guarnición gemelas,
 * arco gótico ojival, rastrillo de hierro elevado y puente levadizo exterior.
 * Geometrías combinadas por material para minimizar draw calls y sombras filtradas en móvil.
 */
export function MonumentalGate({
  position,
  rotationY,
  wallTex,
  roofTex,
  accentColor = '#f59e0b',
}: MonumentalGateProps) {
  const isMobile = isMobileOptimizationTarget();
  const accentMat = useMemo(() => getGateAccentMat(accentColor), [accentColor]);
  const towerWallMat = useMemo(() => getGateTowerWallMat(wallTex), [wallTex]);
  const bastionWallMat = useMemo(() => getGateBastionWallMat(wallTex), [wallTex]);
  const roofMat = useMemo(() => getGateRoofMat(roofTex), [roofTex]);

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh geometry={mergedGateGeos.platformAndKeystone} material={gateFixedMats.platform} receiveShadow={!isMobile} />
      <mesh geometry={mergedGateGeos.darkStoneStructure} material={gateFixedMats.darkStone} castShadow={!isMobile} receiveShadow={!isMobile} />
      <mesh geometry={mergedGateGeos.boothRoofs} material={gateFixedMats.boothRoof} castShadow={!isMobile} />
      <mesh geometry={mergedGateGeos.towerShafts} material={towerWallMat} castShadow={!isMobile} receiveShadow={!isMobile} />
      <mesh geometry={mergedGateGeos.towerRoofs} material={roofMat} castShadow={!isMobile} />
      <mesh geometry={mergedGateGeos.bannerPoles} material={gateFixedMats.bannerPole} castShadow={!isMobile} />
      <mesh geometry={mergedGateGeos.bannerCloths} material={accentMat} castShadow={!isMobile} />
      <mesh geometry={mergedGateGeos.archBastion} material={bastionWallMat} castShadow={!isMobile} receiveShadow={!isMobile} />
      <mesh geometry={mergedGateGeos.ironWork} material={gateFixedMats.ironWork} castShadow={!isMobile} />
      <mesh geometry={mergedGateGeos.drawbridgePlank} material={gateFixedMats.drawbridgeWood} receiveShadow={!isMobile} />
      <mesh geometry={mergedGateGeos.lanternCores} material={gateFixedMats.lanternCore} />
      <mesh geometry={mergedGateGeos.lanternGlows} material={gateFixedMats.lanternGlow} />
    </group>
  );
}
