import React, { useMemo } from 'react';
import * as THREE from 'three';
import { markAsSharedAsset, markGeometryAsShared, markMaterialAsShared } from './ThreeSceneCleanup';
import { createSharedGlbAssetLoader, useSharedGlbAsset } from './gltfLoaderSingleton';
import { isMobileOptimizationTarget } from './glbRuntimeOptimizer';
import { InstancedGlbGroup, InstancedTransformItem, mergeStaticGeometries } from './InstancedGlbGroup';

// ========================================================
// GEOMETRÍAS Y MATERIALES COMPARTIDOS PARA PROPS Y ÁRBOLES
// ========================================================
const propGeos = {
  barrelBody: markGeometryAsShared(new THREE.CylinderGeometry(0.42, 0.46, 1.3, 12)),
  barrelBulge: markGeometryAsShared(new THREE.CylinderGeometry(0.54, 0.54, 0.5, 12)),
  barrelRimCap: markGeometryAsShared(new THREE.CylinderGeometry(0.47, 0.47, 0.08, 12)),
  barrelRimMid: markGeometryAsShared(new THREE.CylinderGeometry(0.55, 0.55, 0.08, 12)),
  crateBody: markGeometryAsShared(new THREE.BoxGeometry(1.0, 1.0, 1.0)),
  crateBrace: markGeometryAsShared(new THREE.BoxGeometry(1.2, 0.12, 0.04)),
  crateCorner: markGeometryAsShared(new THREE.BoxGeometry(1.04, 0.08, 1.04)),
  planterPot: markGeometryAsShared(new THREE.CylinderGeometry(0.55, 0.38, 0.9, 10)),
  planterRim: markGeometryAsShared(new THREE.CylinderGeometry(0.62, 0.55, 0.12, 10)),
  planterSoil: markGeometryAsShared(new THREE.CircleGeometry(0.5, 12)),
  planterFoliageMain: markGeometryAsShared(new THREE.DodecahedronGeometry(0.65, 1)),
  planterFoliageTop: markGeometryAsShared(new THREE.DodecahedronGeometry(0.55, 1)),
  planterFlower: markGeometryAsShared(new THREE.SphereGeometry(0.14, 6, 6)),
  oakTrunk: markGeometryAsShared(new THREE.CylinderGeometry(0.3, 0.55, 4.0, 8)),
  oakRoots: markGeometryAsShared(new THREE.CylinderGeometry(0.65, 0.9, 0.5, 7)),
  oakBranch: markGeometryAsShared(new THREE.CylinderGeometry(0.16, 0.26, 1.8, 6)),
  oakCanopyMain: markGeometryAsShared(new THREE.DodecahedronGeometry(2.0, 1)),
  oakCanopySide: markGeometryAsShared(new THREE.DodecahedronGeometry(1.8, 1)),
  oakCanopyTop: markGeometryAsShared(new THREE.DodecahedronGeometry(1.7, 1)),
  sack: markGeometryAsShared(new THREE.SphereGeometry(0.38, 8, 8)),
};

const propMats = {
  barrelWood: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#5c3a21', roughness: 0.85 })),
  barrelBulgeWood: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#6e4629', roughness: 0.82 })),
  barrelIron: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#1e293b', metalness: 0.8, roughness: 0.4 })),
  crateWood: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#784e2d', roughness: 0.9 })),
  crateBrace: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#543319', roughness: 0.85 })),
  crateIron: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.7, roughness: 0.5 })),
  planterClay: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#7c3f1d', roughness: 0.88 })),
  planterRim: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#9a4d25', roughness: 0.85 })),
  planterSoil: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#2d1b0e', roughness: 0.95 })),
  planterLeafDark: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#2d6a2e', roughness: 0.85, flatShading: true })),
  planterLeafLight: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#3a8a3a', roughness: 0.85, flatShading: true })),
  oakBark: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#4a3525', roughness: 0.92 })),
  oakRoots: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#3b291c', roughness: 0.95 })),
  oakBranch: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#4a3525', roughness: 0.9 })),
  oakLeafDark: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#234a17', roughness: 0.8, flatShading: true })),
  oakLeafLight: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#3d7828', roughness: 0.8, flatShading: true })),
  sack: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#d4b483', roughness: 0.95 })),
};

const planterFlowerMatCache = new Map<string, THREE.MeshStandardMaterial>();
const oakTintMatCache = new Map<string, THREE.MeshStandardMaterial>();

function getPlanterFlowerMat(flowerColor: string): THREE.MeshStandardMaterial {
  let mat = planterFlowerMatCache.get(flowerColor);
  if (!mat) {
    mat = markMaterialAsShared(new THREE.MeshStandardMaterial({ color: flowerColor, roughness: 0.5 }));
    planterFlowerMatCache.set(flowerColor, mat);
  }
  return mat;
}

function getOakTintMat(tint: string): THREE.MeshStandardMaterial {
  let mat = oakTintMatCache.get(tint);
  if (!mat) {
    mat = markMaterialAsShared(new THREE.MeshStandardMaterial({ color: tint, roughness: 0.8, flatShading: true }));
    oakTintMatCache.set(tint, mat);
  }
  return mat;
}

// URLs candidatas oficiales del modelo 3D GLB de cajas de provisiones
const CRATES_GLB_URLS = [
  'https://raw.githubusercontent.com/endersonvivas48-oss/main/main/cajas.glb',
  'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main/cajas.glb',
  'https://fastly.jsdelivr.net/gh/endersonvivas48-oss/main@main/cajas.glb',
  'https://raw.githubusercontent.com/endersonvivas48-oss/main/main/caja.glb',
  'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main/caja.glb',
];

// URLs candidatas oficiales del modelo 3D GLB de barriles
const BARREL_GLB_URLS = [
  'https://raw.githubusercontent.com/endersonvivas48-oss/main/main/barrel.glb',
  'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main/barrel.glb',
  'https://fastly.jsdelivr.net/gh/endersonvivas48-oss/main@main/barrel.glb',
  'https://raw.githubusercontent.com/endersonvivas48-oss/main/main/barril.glb',
  'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main/barril.glb',
];

// URLs candidatas oficiales del modelo 3D GLB de macetas / tiestos (pot-v1.glb)
const POT_GLB_URLS = [
  'https://raw.githubusercontent.com/endersonvivas48-oss/main/main/pot-v1.glb',
  'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main/pot-v1.glb',
  'https://fastly.jsdelivr.net/gh/endersonvivas48-oss/main@main/pot-v1.glb',
  'https://raw.githubusercontent.com/endersonvivas48-oss/main/master/pot-v1.glb',
  'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@master/pot-v1.glb',
  'https://raw.githubusercontent.com/endersonvivas48-oss/main/main/pot.glb',
  'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main/pot.glb',
];

function normalizePropGlbScene(
  root: THREE.Group,
  targetSize: number,
  options?: { isPot?: boolean; minDimThreshold?: number }
): THREE.Group {
  const isMobile = isMobileOptimizationTarget();
  root.traverse((child: any) => {
    if (child.isMesh) {
      child.castShadow = !isMobile;
      child.receiveShadow = !isMobile;
      if (child.geometry) {
        if (typeof child.geometry.computeBoundingBox === 'function') {
          child.geometry.computeBoundingBox();
        }
        if (typeof child.geometry.computeBoundingSphere === 'function') {
          child.geometry.computeBoundingSphere();
        }
      }
      if (child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((mat: any) => {
          if (!mat) return;
          mat.depthWrite = true;
          if (options?.isPot) {
            mat.transparent = false;
            mat.opacity = 1.0;
          }
          if (mat.map) {
            mat.map.colorSpace = THREE.SRGBColorSpace;
            mat.map.needsUpdate = true;
          }
        });
      }
    }
  });

  if (options?.isPot) {
    root.updateMatrixWorld(true);
  }
  const bbox = new THREE.Box3().setFromObject(root);
  const size = bbox.getSize(new THREE.Vector3());
  const center = bbox.getCenter(new THREE.Vector3());

  const maxDim = Math.max(size.x, size.y, size.z);
  const threshold = options?.minDimThreshold ?? 0.05;
  const scale = maxDim > threshold ? targetSize / maxDim : 1.0;

  root.position.set(-center.x * scale, -bbox.min.y * scale, -center.z * scale);
  root.scale.set(scale, scale, scale);

  const wrapper = new THREE.Group();
  wrapper.add(root);
  return markAsSharedAsset(wrapper);
}

const cratesGlbLoader = createSharedGlbAssetLoader<THREE.Group>(
  CRATES_GLB_URLS,
  (root) => normalizePropGlbScene(root, 1.3),
  undefined,
  'PROP'
);

const barrelGlbLoader = createSharedGlbAssetLoader<THREE.Group>(
  BARREL_GLB_URLS,
  (root) => normalizePropGlbScene(root, 1.25),
  undefined,
  'PROP'
);

const potGlbLoader = createSharedGlbAssetLoader<THREE.Group>(
  POT_GLB_URLS,
  (root) => normalizePropGlbScene(root, 0.95, { isPot: true, minDimThreshold: 0.001 }),
  'MedievalProps',
  'PROP'
);

let cachedLowPolyBarrelTemplate: THREE.Group | null = null;
let cachedLowPolyCrateTemplate: THREE.Group | null = null;
let cachedSackTemplate: THREE.Group | null = null;

function getLowPolyBarrelTemplate(): THREE.Group {
  if (cachedLowPolyBarrelTemplate) return cachedLowPolyBarrelTemplate;
  const group = new THREE.Group();

  const woodGeo = mergeStaticGeometries([
    { geometry: new THREE.CylinderGeometry(0.42, 0.45, 1.25, 8), position: [0, 0.625, 0] },
    { geometry: new THREE.CylinderGeometry(0.51, 0.51, 0.48, 8), position: [0, 0.625, 0] },
  ]);
  group.add(new THREE.Mesh(woodGeo, propMats.barrelWood));

  const ironGeo = mergeStaticGeometries([
    { geometry: new THREE.CylinderGeometry(0.46, 0.46, 0.08, 8), position: [0, 1.12, 0] },
    { geometry: new THREE.CylinderGeometry(0.52, 0.52, 0.08, 8), position: [0, 0.63, 0] },
    { geometry: new THREE.CylinderGeometry(0.46, 0.46, 0.08, 8), position: [0, 0.14, 0] },
  ]);
  group.add(new THREE.Mesh(ironGeo, propMats.barrelIron));

  cachedLowPolyBarrelTemplate = markAsSharedAsset(group);
  return cachedLowPolyBarrelTemplate;
}

function getLowPolyCrateTemplate(): THREE.Group {
  if (cachedLowPolyCrateTemplate) return cachedLowPolyCrateTemplate;
  const group = new THREE.Group();

  const woodGeo = mergeStaticGeometries([
    { geometry: new THREE.BoxGeometry(1.0, 1.0, 1.0), position: [0, 0.5, 0] },
  ]);
  group.add(new THREE.Mesh(woodGeo, propMats.crateWood));

  const trimGeo = mergeStaticGeometries([
    { geometry: new THREE.BoxGeometry(1.04, 0.1, 1.04), position: [0, 0.94, 0] },
    { geometry: new THREE.BoxGeometry(1.04, 0.1, 1.04), position: [0, 0.06, 0] },
    { geometry: new THREE.BoxGeometry(1.15, 0.11, 0.04), position: [0, 0.5, 0.51], rotation: [0, 0, Math.PI / 4] },
    { geometry: new THREE.BoxGeometry(1.15, 0.11, 0.04), position: [0, 0.5, -0.51], rotation: [0, 0, -Math.PI / 4] },
  ]);
  group.add(new THREE.Mesh(trimGeo, propMats.crateBrace));

  cachedLowPolyCrateTemplate = markAsSharedAsset(group);
  return cachedLowPolyCrateTemplate;
}

function getSackTemplate(): THREE.Group {
  if (cachedSackTemplate) return cachedSackTemplate;
  const group = new THREE.Group();
  group.add(new THREE.Mesh(propGeos.sack, propMats.sack));
  cachedSackTemplate = markAsSharedAsset(group);
  return cachedSackTemplate;
}

export function isMedievalPropsGlbsSettled(): boolean {
  const isMobile = isMobileOptimizationTarget();
  return (
    (isMobile || cratesGlbLoader.isSettled()) &&
    (isMobile || barrelGlbLoader.isSettled()) &&
    (isMobile || potGlbLoader.isSettled())
  );
}

export function preloadCratesGlb(): Promise<THREE.Group | null> {
  if (isMobileOptimizationTarget()) return Promise.resolve(null);
  return cratesGlbLoader.load();
}

export function preloadBarrelGlb(): Promise<THREE.Group | null> {
  if (isMobileOptimizationTarget()) return Promise.resolve(null);
  return barrelGlbLoader.load();
}

export function preloadPotGlb(): Promise<THREE.Group | null> {
  if (isMobileOptimizationTarget()) return Promise.resolve(null);
  return potGlbLoader.load();
}

export function disposeMedievalPropsGlbAssets(): void {
  cratesGlbLoader.disposeCachedAsset();
  barrelGlbLoader.disposeCachedAsset();
  potGlbLoader.disposeCachedAsset();
}

/**
 * Hook para obtener la escena 3D oficial de cajas.glb
 */
export function useCratesGlbModel(disabled = false): THREE.Group | null {
  return useSharedGlbAsset(cratesGlbLoader, disabled);
}

/**
 * Hook para obtener la escena 3D oficial de barrel.glb
 */
export function useBarrelGlbModel(disabled = false): THREE.Group | null {
  return useSharedGlbAsset(barrelGlbLoader, disabled);
}

/**
 * Hook para obtener la escena 3D oficial de pot-v1.glb (maceta)
 */
export function usePotGlbModel(disabled = false): THREE.Group | null {
  return useSharedGlbAsset(potGlbLoader, disabled);
}

/**
 * Renderizador por lotes con InstancedMesh para todos los barriles de la ciudad.
 */
export function InstancedMedievalBarrels({
  instances,
}: {
  instances: InstancedTransformItem[];
}) {
  const isMobile = isMobileOptimizationTarget();
  const glbScene = useBarrelGlbModel(isMobile);

  const activeTemplate = useMemo(() => {
    if (!isMobile && glbScene) return glbScene;
    return getLowPolyBarrelTemplate();
  }, [isMobile, glbScene]);

  return (
    <InstancedGlbGroup
      template={activeTemplate}
      instances={instances}
      castShadow={!isMobile}
      receiveShadow={!isMobile}
    />
  );
}

/**
 * Renderizador por lotes con InstancedMesh para todas las cajas de provisiones de la ciudad.
 */
export function InstancedMedievalCrates({
  instances,
}: {
  instances: InstancedTransformItem[];
}) {
  const isMobile = isMobileOptimizationTarget();
  const glbScene = useCratesGlbModel(isMobile);

  const activeTemplate = useMemo(() => {
    if (!isMobile && glbScene) return glbScene;
    return getLowPolyCrateTemplate();
  }, [isMobile, glbScene]);

  return (
    <InstancedGlbGroup
      template={activeTemplate}
      instances={instances}
      castShadow={!isMobile}
      receiveShadow={!isMobile}
    />
  );
}

/**
 * Renderizador por lotes con InstancedMesh para los sacos de provisiones.
 */
export function InstancedProvisionSacks({
  instances,
}: {
  instances: InstancedTransformItem[];
}) {
  const isMobile = isMobileOptimizationTarget();
  const template = useMemo(() => getSackTemplate(), []);

  return (
    <InstancedGlbGroup
      template={template}
      instances={instances}
      castShadow={!isMobile}
      receiveShadow={false}
    />
  );
}

/**
 * Barril de roble (Renderiza el modelo 3D GLB barrel.glb en PC o perfil ligero procedural en Android)
 */
export function MedievalBarrel({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1.0,
}: {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}) {
  const isMobile = isMobileOptimizationTarget();
  const glbScene = useBarrelGlbModel(isMobile);

  const clonedGlb = useMemo(() => {
    if (isMobile || !glbScene) return null;
    return glbScene.clone(true);
  }, [glbScene, isMobile]);

  if (clonedGlb) {
    return (
      <group position={position} rotation={rotation} scale={[scale, scale, scale]}>
        <primitive object={clonedGlb} />
      </group>
    );
  }

  return (
    <group position={position} rotation={rotation} scale={[scale, scale, scale]}>
      <mesh geometry={propGeos.barrelBody} material={propMats.barrelWood} position={[0, 0.65, 0]} castShadow={!isMobile} receiveShadow={!isMobile} />
      <mesh geometry={propGeos.barrelBulge} material={propMats.barrelBulgeWood} position={[0, 0.65, 0]} castShadow={!isMobile} receiveShadow={!isMobile} />
      <mesh geometry={propGeos.barrelRimCap} material={propMats.barrelIron} position={[0, 1.15, 0]} />
      <mesh geometry={propGeos.barrelRimMid} material={propMats.barrelIron} position={[0, 0.75, 0]} />
      <mesh geometry={propGeos.barrelRimMid} material={propMats.barrelIron} position={[0, 0.55, 0]} />
      <mesh geometry={propGeos.barrelRimCap} material={propMats.barrelIron} position={[0, 0.15, 0]} />
    </group>
  );
}

/**
 * Caja de provisiones (Renderiza el modelo 3D GLB cajas.glb en PC o perfil ligero procedural en Android)
 */
export function MedievalCrate({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1.0,
}: {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}) {
  const isMobile = isMobileOptimizationTarget();
  const glbScene = useCratesGlbModel(isMobile);

  const clonedGlb = useMemo(() => {
    if (isMobile || !glbScene) return null;
    return glbScene.clone(true);
  }, [glbScene, isMobile]);

  if (clonedGlb) {
    return (
      <group position={position} rotation={rotation} scale={[scale, scale, scale]}>
        <primitive object={clonedGlb} />
      </group>
    );
  }

  return (
    <group position={position} rotation={rotation} scale={[scale, scale, scale]}>
      <mesh geometry={propGeos.crateBody} material={propMats.crateWood} position={[0, 0.5, 0]} castShadow={!isMobile} receiveShadow={!isMobile} />
      <mesh geometry={propGeos.crateBrace} material={propMats.crateBrace} position={[0, 0.5, 0.51]} rotation={[0, 0, Math.PI / 4]} />
      <mesh geometry={propGeos.crateBrace} material={propMats.crateBrace} position={[0, 0.5, -0.51]} rotation={[0, 0, -Math.PI / 4]} />
      <mesh geometry={propGeos.crateCorner} material={propMats.crateIron} position={[0, 0.95, 0]} />
      <mesh geometry={propGeos.crateCorner} material={propMats.crateIron} position={[0, 0.05, 0]} />
    </group>
  );
}

/**
 * Macetero ornamental con flores y follaje
 * Utiliza el modelo 3D GLB oficial 'pot-v1.glb' si está disponible,
 * o el fallback procedural detallado con flores.
 */
export function MedievalPlanter({
  position = [0, 0, 0],
  scale = 1.0,
  flowerColor = '#f59e0b',
}: {
  position?: [number, number, number];
  scale?: number;
  flowerColor?: string;
}) {
  const isMobile = isMobileOptimizationTarget();

  // En móviles usamos el fallback procedural ligero para no saturar memoria VRAM con decenas de instancias GLB
  const potGlb = usePotGlbModel(isMobile);

  const clonedPot = useMemo(() => {
    if (isMobile || !potGlb) return null;
    return potGlb.clone(true);
  }, [potGlb, isMobile]);

  const flowerMat = useMemo(() => getPlanterFlowerMat(flowerColor), [flowerColor]);

  return (
    <group position={position} scale={[scale, scale, scale]}>
      {clonedPot && <primitive object={clonedPot} />}

      {/* Maceta de base y follaje siempre presente o de respaldo */}
      {!clonedPot && (
        <group>
          {/* Maceta de terracota o piedra labrada */}
          <mesh geometry={propGeos.planterPot} material={propMats.planterClay} position={[0, 0.45, 0]} castShadow={!isMobile} receiveShadow={!isMobile} />
          <mesh geometry={propGeos.planterRim} material={propMats.planterRim} position={[0, 0.88, 0]} />
          {/* Tierra húmeda */}
          <mesh geometry={propGeos.planterSoil} material={propMats.planterSoil} position={[0, 0.86, 0]} rotation={[-Math.PI / 2, 0, 0]} />
          {/* Follaje denso */}
          <mesh geometry={propGeos.planterFoliageMain} material={propMats.planterLeafDark} position={[0, 1.25, 0]} castShadow={!isMobile} />
          <mesh geometry={propGeos.planterFoliageTop} material={propMats.planterLeafLight} position={[0.2, 1.45, 0.1]} castShadow={!isMobile} scale={0.7} />
          {/* Flores coloridas */}
          {[-0.25, 0.2, 0].map((fx, idx) => (
            <mesh key={idx} geometry={propGeos.planterFlower} material={flowerMat} position={[fx, 1.6, idx * 0.15 - 0.05]} castShadow={!isMobile} />
          ))}
        </group>
      )}
    </group>
  );
}

/**
 * Árbol medieval estilizado (Roble / Broadleaf Tree)
 * Geometrías y materiales cacheados a nivel de módulo.
 */
export function MedievalOakTree({
  position = [0, 0, 0],
  scale = 1.0,
  tint = '#2e5c1e',
}: {
  position?: [number, number, number];
  scale?: number;
  tint?: string;
}) {
  const isMobile = isMobileOptimizationTarget();
  const canopyTintMat = useMemo(() => getOakTintMat(tint), [tint]);

  return (
    <group position={position} scale={[scale, scale, scale]}>
      {/* Tronco de roble estilizado */}
      <mesh geometry={propGeos.oakTrunk} material={propMats.oakBark} position={[0, 2.0, 0]} castShadow={!isMobile} receiveShadow={!isMobile} />
      {/* Raíces salientes en la base */}
      <mesh geometry={propGeos.oakRoots} material={propMats.oakRoots} position={[0, 0.25, 0]} receiveShadow={!isMobile} />
      {/* Ramas principales */}
      <mesh geometry={propGeos.oakBranch} material={propMats.oakBranch} position={[0.5, 3.4, 0]} rotation={[0, 0, 0.45]} castShadow={!isMobile} />
      <mesh geometry={propGeos.oakBranch} material={propMats.oakBranch} position={[-0.5, 3.3, 0]} rotation={[0, 0, -0.45]} castShadow={!isMobile} />
      {/* Copa escalonada con geometría dodecaédrica flatShading */}
      <group position={[0, 5.2, 0]}>
        <mesh geometry={propGeos.oakCanopyMain} material={canopyTintMat} position={[0, 0, 0]} castShadow={!isMobile} />
        <mesh geometry={propGeos.oakCanopySide} material={propMats.oakLeafDark} position={[-1.4, -0.5, 0.3]} scale={[0.85, 0.85, 0.85]} castShadow={!isMobile} />
        <mesh geometry={propGeos.oakCanopySide} material={propMats.oakLeafDark} position={[1.4, -0.4, -0.3]} scale={[0.85, 0.85, 0.85]} castShadow={!isMobile} />
        <mesh geometry={propGeos.oakCanopyTop} material={propMats.oakLeafLight} position={[0, 1.3, -0.2]} scale={[0.85, 0.9, 0.85]} castShadow={!isMobile} />
      </group>
    </group>
  );
}

const STACK_CRATE_INSTANCES: InstancedTransformItem[] = [
  { position: [0, 0, 0], rotation: [0, 0.1, 0], scale: 1.1 },
  { position: [1.25, 0, 0.1], rotation: [0, -0.15, 0], scale: 1.05 },
  { position: [0.55, 1.15, 0.05], rotation: [0, 0.25, 0], scale: 0.95 },
];

const STACK_BARREL_INSTANCES: InstancedTransformItem[] = [
  { position: [-1.1, 0, 0], scale: 1.0 },
  { position: [-0.8, 0, 0.9], rotation: [0, 0.3, 0], scale: 0.9 },
];

const STACK_SACK_INSTANCES: InstancedTransformItem[] = [
  { position: [0.7, 0.3, 0.7], rotation: [0.2, 0.4, 0], scale: 1.0 },
];

/**
 * Pila de provisiones (usa el sistema unificado de InstancedMesh para cajas, barriles y sacos)
 */
export function MarketProvisionsStack({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1.0,
}: {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}) {
  return (
    <group position={position} rotation={rotation} scale={[scale, scale, scale]}>
      <InstancedMedievalCrates instances={STACK_CRATE_INSTANCES} />
      <InstancedMedievalBarrels instances={STACK_BARREL_INSTANCES} />
      <InstancedProvisionSacks instances={STACK_SACK_INSTANCES} />
    </group>
  );
}
