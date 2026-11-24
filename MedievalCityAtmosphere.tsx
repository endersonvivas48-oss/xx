import React, { useMemo } from 'react';
import * as THREE from 'three';
import { markAsSharedAsset, markGeometryAsShared, markMaterialAsShared } from './ThreeSceneCleanup';
import { createSharedGlbAssetLoader, useSharedGlbAsset } from './gltfLoaderSingleton';
import { isMobileOptimizationTarget } from './glbRuntimeOptimizer';
import { InstancedGlbGroup, InstancedTransformItem, mergeStaticGeometries } from './InstancedGlbGroup';

// URL unificada para el modelo 3D GLB del puesto de mercado (repositorio oficial único https://github.com/endersonvivas48-oss/main)
const MEDIEVAL_STALL_URL_CANDIDATES = [
  'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main/medieval_stall.glb',
  'https://raw.githubusercontent.com/endersonvivas48-oss/main/main/medieval_stall.glb',
];

// URL unificada para el modelo 3D GLB de la fuente medieval central (repositorio oficial único https://github.com/endersonvivas48-oss/main)
const MEDIEVAL_FOUNTAIN_URL_CANDIDATES = [
  'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main/medieval_fountain_empty.glb',
  'https://raw.githubusercontent.com/endersonvivas48-oss/main/main/medieval_fountain_empty.glb',
];

// URL unificada para el modelo 3D GLB del farol medieval (repositorio oficial único https://github.com/endersonvivas48-oss/main)
const MEDIEVAL_LAMP_URL_CANDIDATES = [
  'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main/medieval_lamp_post.glb',
  'https://raw.githubusercontent.com/endersonvivas48-oss/main/main/medieval_lamp_post.glb',
  'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main/medieval_lamppost.glb',
  'https://raw.githubusercontent.com/endersonvivas48-oss/main/main/medieval_lamppost.glb',
];

// Optimización de texturas y mallas para móviles
function optimizeSceneForMobile(scene: THREE.Group) {
  const isMobile = isMobileOptimizationTarget();
  scene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const m = child as THREE.Mesh;
      m.castShadow = !isMobile;
      m.receiveShadow = !isMobile;
      if (m.material) {
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        mats.forEach((mat: any) => {
          if (!mat) return;
          mat.depthWrite = true;
          if (isMobile && mat.map) {
            mat.map.generateMipmaps = true;
            mat.map.minFilter = THREE.LinearMipmapLinearFilter;
            mat.map.needsUpdate = true;
          }
        });
      }
    }
  });
}

function normalizeAndWrapAtmosphereModel(rootScene: THREE.Group, targetHeight: number): THREE.Group {
  const bbox = new THREE.Box3().setFromObject(rootScene);
  const center = bbox.getCenter(new THREE.Vector3());
  const minY = bbox.min.y;
  const size = bbox.getSize(new THREE.Vector3());

  const naturalHeight = size.y > 0.05 ? size.y : 1.0;
  const autoScale = targetHeight / naturalHeight;

  rootScene.position.set(-center.x * autoScale, -minY * autoScale, -center.z * autoScale);
  rootScene.scale.set(autoScale, autoScale, autoScale);

  const wrapperGroup = new THREE.Group();
  wrapperGroup.add(rootScene);
  optimizeSceneForMobile(wrapperGroup);
  return markAsSharedAsset(wrapperGroup);
}

const stallGlbLoader = createSharedGlbAssetLoader<THREE.Group>(
  MEDIEVAL_STALL_URL_CANDIDATES,
  (root) => normalizeAndWrapAtmosphereModel(root, 5.6),
  undefined,
  'PROP'
);

const fountainGlbLoader = createSharedGlbAssetLoader<THREE.Group>(
  MEDIEVAL_FOUNTAIN_URL_CANDIDATES,
  (root) => normalizeAndWrapAtmosphereModel(root, 4.8),
  undefined,
  'HERO_BUILDING'
);

const lampGlbLoader = createSharedGlbAssetLoader<THREE.Group>(
  MEDIEVAL_LAMP_URL_CANDIDATES,
  (root) => normalizeAndWrapAtmosphereModel(root, 7.5),
  undefined,
  'PROP'
);

let cachedLowPolyStallTemplate: THREE.Group | null = null;
let cachedLowPolyLampTemplate: THREE.Group | null = null;
let cachedLowPolyFountainTemplate: THREE.Group | null = null;

function getLowPolyFountainTemplate(): THREE.Group {
  if (cachedLowPolyFountainTemplate) return cachedLowPolyFountainTemplate;

  const isMobile = isMobileOptimizationTarget();
  const group = new THREE.Group();

  const stoneGeo = mergeStaticGeometries([
    { geometry: new THREE.CylinderGeometry(4.4, 4.8, 0.55, 14), position: [0, 0.275, 0] },
    { geometry: new THREE.TorusGeometry(3.8, 0.36, 6, 16), position: [0, 0.68, 0], rotation: [Math.PI / 2, 0, 0] },
    { geometry: new THREE.CylinderGeometry(0.95, 1.35, 2.2, 10), position: [0, 1.35, 0] },
    { geometry: new THREE.CylinderGeometry(1.9, 1.1, 0.45, 12), position: [0, 2.5, 0] },
    { geometry: new THREE.CylinderGeometry(0.55, 0.75, 1.4, 10), position: [0, 3.25, 0] },
  ]);
  const stoneMat = markMaterialAsShared(
    new THREE.MeshStandardMaterial({ color: '#64748b', roughness: 0.85 })
  );
  const stoneMesh = new THREE.Mesh(stoneGeo, stoneMat);
  stoneMesh.castShadow = !isMobile;
  stoneMesh.receiveShadow = !isMobile;
  group.add(stoneMesh);

  const waterGeo = mergeStaticGeometries([
    { geometry: new THREE.CylinderGeometry(3.65, 3.65, 0.14, 16), position: [0, 0.62, 0] },
    { geometry: new THREE.CylinderGeometry(1.65, 1.65, 0.12, 12), position: [0, 2.7, 0] },
  ]);
  const waterMat = markMaterialAsShared(
    new THREE.MeshStandardMaterial({
      color: '#38bdf8',
      emissive: '#0284c7',
      emissiveIntensity: 0.35,
      roughness: 0.2,
      metalness: 0.25,
    })
  );
  const waterMesh = new THREE.Mesh(waterGeo, waterMat);
  waterMesh.receiveShadow = !isMobile;
  group.add(waterMesh);

  const crestGeo = mergeStaticGeometries([
    { geometry: new THREE.OctahedronGeometry(0.5), position: [0, 4.25, 0] },
  ]);
  const crestMat = markMaterialAsShared(
    new THREE.MeshStandardMaterial({ color: '#fbbf24', metalness: 0.85, roughness: 0.2 })
  );
  const crestMesh = new THREE.Mesh(crestGeo, crestMat);
  crestMesh.castShadow = !isMobile;
  group.add(crestMesh);

  cachedLowPolyFountainTemplate = markAsSharedAsset(group);
  return cachedLowPolyFountainTemplate;
}

function getLowPolyStallTemplate(): THREE.Group {
  if (cachedLowPolyStallTemplate) return cachedLowPolyStallTemplate;

  const group = new THREE.Group();

  // Estructura de madera (mostrador + 4 postes + travesaños) combinada en 1 geometría
  const woodGeo = mergeStaticGeometries([
    { geometry: new THREE.BoxGeometry(3.4, 1.05, 1.8), position: [0, 0.525, 0] },
    { geometry: new THREE.BoxGeometry(0.18, 3.2, 0.18), position: [-1.55, 1.6, -0.85] },
    { geometry: new THREE.BoxGeometry(0.18, 3.2, 0.18), position: [1.55, 1.6, -0.85] },
    { geometry: new THREE.BoxGeometry(0.18, 2.85, 0.18), position: [-1.55, 1.42, 0.85] },
    { geometry: new THREE.BoxGeometry(0.18, 2.85, 0.18), position: [1.55, 1.42, 0.85] },
    { geometry: new THREE.BoxGeometry(3.3, 0.16, 0.16), position: [0, 2.85, 0.85] },
  ]);
  const woodMat = markMaterialAsShared(
    new THREE.MeshStandardMaterial({ color: '#6b3f1d', roughness: 0.88 })
  );
  group.add(new THREE.Mesh(woodGeo, woodMat));

  // Toldo textil inclinado del puesto de mercado
  const canopyGeo = mergeStaticGeometries([
    {
      geometry: new THREE.BoxGeometry(3.85, 0.22, 2.55),
      position: [0, 3.15, 0],
      rotation: [0.18, 0, 0],
    },
    {
      geometry: new THREE.BoxGeometry(3.85, 0.45, 0.12),
      position: [0, 2.85, 1.2],
    },
  ]);
  const canopyMat = markMaterialAsShared(
    new THREE.MeshStandardMaterial({ color: '#b91c1c', roughness: 0.78 })
  );
  group.add(new THREE.Mesh(canopyGeo, canopyMat));

  cachedLowPolyStallTemplate = markAsSharedAsset(group);
  return cachedLowPolyStallTemplate;
}

function getLowPolyLampTemplate(): THREE.Group {
  if (cachedLowPolyLampTemplate) return cachedLowPolyLampTemplate;

  const group = new THREE.Group();

  // Poste metálico de hierro forjado + base + brazo + tejadillo combinados en 1 geometría
  const ironGeo = mergeStaticGeometries([
    { geometry: new THREE.CylinderGeometry(0.32, 0.42, 0.45, 6), position: [0, 0.225, 0] },
    { geometry: new THREE.CylinderGeometry(0.1, 0.16, 6.2, 6), position: [0, 3.1, 0] },
    { geometry: new THREE.BoxGeometry(0.95, 0.14, 0.14), position: [0.35, 6.1, 0] },
    { geometry: new THREE.ConeGeometry(0.45, 0.42, 4), position: [0.65, 6.55, 0], rotation: [0, Math.PI / 4, 0] },
  ]);
  const ironMat = markMaterialAsShared(
    new THREE.MeshStandardMaterial({ color: '#1e293b', metalness: 0.6, roughness: 0.5 })
  );
  group.add(new THREE.Mesh(ironGeo, ironMat));

  // Núcleo luminoso del farol
  const lanternGlassGeo = mergeStaticGeometries([
    { geometry: new THREE.BoxGeometry(0.38, 0.52, 0.38), position: [0.65, 6.15, 0] },
  ]);
  const lanternGlassMat = markMaterialAsShared(
    new THREE.MeshStandardMaterial({
      color: '#fef08a',
      emissive: '#f59e0b',
      emissiveIntensity: 1.8,
      roughness: 0.2,
    })
  );
  group.add(new THREE.Mesh(lanternGlassGeo, lanternGlassMat));

  cachedLowPolyLampTemplate = markAsSharedAsset(group);
  return cachedLowPolyLampTemplate;
}

export function isCityAtmosphereGlbsSettled(): boolean {
  const isMobile = isMobileOptimizationTarget();
  return (
    (isMobile || stallGlbLoader.isSettled()) &&
    (isMobile || fountainGlbLoader.isSettled()) &&
    (isMobile || lampGlbLoader.isSettled())
  );
}

export function preloadMedievalStallGlb(): Promise<THREE.Group | null> {
  if (isMobileOptimizationTarget()) return Promise.resolve(null);
  return stallGlbLoader.load();
}

export function preloadMedievalFountainGlb(): Promise<THREE.Group | null> {
  if (isMobileOptimizationTarget()) return Promise.resolve(null);
  return fountainGlbLoader.load();
}

export function preloadMedievalLampGlb(): Promise<THREE.Group | null> {
  if (isMobileOptimizationTarget()) return Promise.resolve(null);
  return lampGlbLoader.load();
}

export function disposeCityAtmosphereGlbAssets(): void {
  stallGlbLoader.disposeCachedAsset();
  fountainGlbLoader.disposeCachedAsset();
  lampGlbLoader.disposeCachedAsset();
}

/**
 * Fuente Medieval Central de la Gran Plaza:
 * Se sincroniza en la posición asignada con visualización garantizada y cambio automático al GLB
 */
export function MedievalCentralFountain({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1.0, 1.0, 1.0],
}: {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
}) {
  const isMobile = isMobileOptimizationTarget();
  const fountainScene = useSharedGlbAsset(fountainGlbLoader, isMobile);

  const instanceClone = useMemo(() => {
    const src = !isMobile && fountainScene ? fountainScene : getLowPolyFountainTemplate();
    return src.clone(true);
  }, [fountainScene, isMobile]);

  return (
    <group position={position} rotation={rotation}>
      <primitive object={instanceClone} scale={scale} position={[0, 0, 0]} />
    </group>
  );
}

// ========================================================
// GEOMETRÍAS Y MATERIALES COMPARTIDOS PARA ATMÓSFERA Y ESTRUCTURAS
// ========================================================
const lampHaloGeo = markGeometryAsShared(new THREE.SphereGeometry(0.45, 8, 8));
const lampHaloMatCache = new Map<string, THREE.MeshBasicMaterial>();

function getLampHaloMat(lightColor: string): THREE.MeshBasicMaterial {
  let mat = lampHaloMatCache.get(lightColor);
  if (!mat) {
    mat = markMaterialAsShared(
      new THREE.MeshBasicMaterial({ color: lightColor, transparent: true, opacity: 0.32, depthWrite: false })
    );
    lampHaloMatCache.set(lightColor, mat);
  }
  return mat;
}

const obeliskGeos = {
  baseLower: markGeometryAsShared(new THREE.CylinderGeometry(3.2, 3.6, 0.4, 24)),
  baseUpper: markGeometryAsShared(new THREE.CylinderGeometry(2.5, 2.9, 0.3, 24)),
  dialPlate: markGeometryAsShared(new THREE.CircleGeometry(2.2, 24)),
  shaft: markGeometryAsShared(new THREE.CylinderGeometry(0.4, 0.85, 7.2, 4)),
  cap: markGeometryAsShared(new THREE.ConeGeometry(0.55, 1.4, 4)),
  gnomon: markGeometryAsShared(new THREE.CylinderGeometry(0.06, 0.1, 3.2, 8)),
};

const obeliskMats = {
  baseLower: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.85 })),
  baseUpper: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.8 })),
  dialPlate: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#d97706', metalness: 0.7, roughness: 0.3 })),
  shaft: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#64748b', roughness: 0.7, metalness: 0.2 })),
  cap: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#fbbf24', metalness: 0.9, roughness: 0.15 })),
  gnomon: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#f59e0b', metalness: 0.85, roughness: 0.2 })),
};

const forgeDetailGeos = {
  chimney: markGeometryAsShared(new THREE.BoxGeometry(1.8, 5.0, 1.8)),
  chimneyCap: markGeometryAsShared(new THREE.ConeGeometry(1.4, 1.0, 8)),
  hearth: markGeometryAsShared(new THREE.BoxGeometry(2.4, 2.4, 2.4)),
  fireOpening: markGeometryAsShared(new THREE.PlaneGeometry(1.4, 1.2)),
  anvilStump: markGeometryAsShared(new THREE.CylinderGeometry(0.5, 0.6, 0.9, 12)),
  anvilBody: markGeometryAsShared(new THREE.BoxGeometry(0.7, 0.4, 1.2)),
  anvilHorn: markGeometryAsShared(new THREE.ConeGeometry(0.3, 0.5, 10)),
};

const forgeDetailMats = {
  chimney: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.9 })),
  chimneyCap: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.8 })),
  hearth: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#1f2937', roughness: 0.95 })),
  fireGlow: markMaterialAsShared(new THREE.MeshBasicMaterial({ color: '#ea580c' })),
  anvilStump: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#451a03', roughness: 0.9 })),
  anvilSteel: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#94a3b8', metalness: 0.9, roughness: 0.25 })),
};

const citadelBackdropGeos = {
  ground: markGeometryAsShared(new THREE.PlaneGeometry(320, 90)),
  curtainWall: markGeometryAsShared(new THREE.BoxGeometry(84, 16, 12)),
  merlon: markGeometryAsShared(new THREE.BoxGeometry(4.5, 2.5, 12.5)),
  mainKeep: markGeometryAsShared(new THREE.CylinderGeometry(10, 12, 26, 16)),
  mainRoof: markGeometryAsShared(new THREE.ConeGeometry(12.5, 14, 16)),
  sideTower: markGeometryAsShared(new THREE.CylinderGeometry(6.5, 7.5, 24, 16)),
  sideRoof: markGeometryAsShared(new THREE.ConeGeometry(8.5, 10, 16)),
  flagPole: markGeometryAsShared(new THREE.CylinderGeometry(0.1, 0.15, 6, 6)),
  flagCloth: markGeometryAsShared(new THREE.BoxGeometry(2.2, 1.4, 0.05)),
  mountain: markGeometryAsShared(new THREE.ConeGeometry(42, 65, 5)),
};

const citadelBackdropMats = {
  ground: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#1e3a12', roughness: 0.9 })),
  stoneLight: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.8 })),
  stoneDark: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.8 })),
  keepWall: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.75 })),
  mainRoof: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#991b1b', roughness: 0.65 })),
  sideRoof: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#b91c1c', roughness: 0.6 })),
  flagPole: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.7 })),
  flagCloth: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.5 })),
  mountain: markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#3b1f14', roughness: 0.9 })),
};

const CITADEL_MERLON_X = [-36, -24, -12, 0, 12, 24, 36];
const CITADEL_TOWER_X = [-38, 38];
const CITADEL_MOUNTAIN_X = [-120, -50, 45, 110];

/**
 * Renderizador por lotes con InstancedMesh para los 16 faroles medievales de la ciudad.
 */
export function InstancedMedievalLampPosts({
  positions,
  litIndices = [6, 7],
  lightColor = '#fef08a',
}: {
  positions: [number, number, number][];
  litIndices?: number[];
  lightColor?: string;
}) {
  const isMobile = isMobileOptimizationTarget();
  const lampScene = useSharedGlbAsset(lampGlbLoader, isMobile);

  const activeTemplate = useMemo(() => {
    if (!isMobile && lampScene) return lampScene;
    return getLowPolyLampTemplate();
  }, [isMobile, lampScene]);

  const instances: InstancedTransformItem[] = useMemo(
    () => positions.map((pos) => ({ position: pos })),
    [positions]
  );

  const haloMat = useMemo(() => getLampHaloMat(lightColor), [lightColor]);

  return (
    <>
      <InstancedGlbGroup
        template={activeTemplate}
        instances={instances}
        castShadow={!isMobile}
        receiveShadow={!isMobile}
      />
      {litIndices.map((idx) => {
        const p = positions[idx];
        if (!p) return null;
        return (
          <mesh
            key={`lamp_halo_${idx}`}
            geometry={lampHaloGeo}
            material={haloMat}
            position={[p[0], 6.2, p[2]]}
          />
        );
      })}
    </>
  );
}

/**
 * Renderizador por lotes con InstancedMesh para los 8 puestos de mercado medievales.
 */
export function InstancedMedievalMarketStalls({
  stalls,
}: {
  stalls: Array<{
    position: [number, number, number];
    rotation?: [number, number, number];
    scale?: [number, number, number];
  }>;
}) {
  const isMobile = isMobileOptimizationTarget();
  const stallScene = useSharedGlbAsset(stallGlbLoader, isMobile);

  const activeTemplate = useMemo(() => {
    if (!isMobile && stallScene) return stallScene;
    return getLowPolyStallTemplate();
  }, [isMobile, stallScene]);

  const instances: InstancedTransformItem[] = useMemo(
    () =>
      stalls.map((s) => ({
        position: s.position,
        rotation: s.rotation || [0, 0, 0],
        scale: s.scale || [1, 1, 1],
      })),
    [stalls]
  );

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
 * Farol Medieval Oficial utilizando el modelo 3D GLB o perfil ligero en Android
 */
export function MedievalLampPost({
  position = [0, 0, 0],
  hasLight = false,
  lightColor = '#fef08a',
}: {
  position?: [number, number, number];
  hasLight?: boolean;
  lightColor?: string;
}) {
  const isMobile = isMobileOptimizationTarget();
  const lampScene = useSharedGlbAsset(lampGlbLoader, isMobile);

  const instanceClone = useMemo(() => {
    const src = !isMobile && lampScene ? lampScene : getLowPolyLampTemplate();
    return src.clone(true);
  }, [lampScene, isMobile]);

  const haloMat = useMemo(() => getLampHaloMat(lightColor), [lightColor]);

  return (
    <group position={position}>
      <primitive object={instanceClone} position={[0, 0, 0]} />
      {hasLight && (
        <mesh geometry={lampHaloGeo} material={haloMat} position={[0, 6.2, 0]} />
      )}
    </group>
  );
}

/**
 * Puestos de Mercado Medieval utilizando el modelo 3D GLB oficial o perfil ligero en Android
 */
export function MedievalMarketStall({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1.0, 1.0, 1.0],
}: {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
}) {
  const isMobile = isMobileOptimizationTarget();
  const stallScene = useSharedGlbAsset(stallGlbLoader, isMobile);

  const instanceClone = useMemo(() => {
    const src = !isMobile && stallScene ? stallScene : getLowPolyStallTemplate();
    return src.clone(true);
  }, [stallScene, isMobile]);

  return (
    <group position={position} rotation={rotation}>
      <primitive
        object={instanceClone}
        scale={scale}
        position={[0, 0, 0]}
      />
    </group>
  );
}

/**
 * Obelisco Reloj de Sol Medieval en la Plaza Principal
 */
export function PlazaObeliskSundial({
  position = [0, 0, 0],
}: {
  position?: [number, number, number];
}) {
  const isMobile = isMobileOptimizationTarget();
  return (
    <group position={position}>
      <mesh geometry={obeliskGeos.baseLower} material={obeliskMats.baseLower} position={[0, 0.2, 0]} receiveShadow={!isMobile} />
      <mesh geometry={obeliskGeos.baseUpper} material={obeliskMats.baseUpper} position={[0, 0.5, 0]} receiveShadow={!isMobile} />
      <mesh
        geometry={obeliskGeos.dialPlate}
        material={obeliskMats.dialPlate}
        position={[0, 0.68, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow={!isMobile}
      />
      <mesh geometry={obeliskGeos.shaft} material={obeliskMats.shaft} position={[0, 4.2, 0]} castShadow={!isMobile} receiveShadow={!isMobile} />
      <mesh geometry={obeliskGeos.cap} material={obeliskMats.cap} position={[0, 8.2, 0]} castShadow={!isMobile} />
      <mesh
        geometry={obeliskGeos.gnomon}
        material={obeliskMats.gnomon}
        position={[0, 2.2, 0.6]}
        rotation={[0.55, 0, 0]}
        castShadow={!isMobile}
      />
    </group>
  );
}

/**
 * Taller de Herrero Medieval con chimenea de humo humeante y fuego de forja resplandeciente
 */
export function BlacksmithForgeDetail({
  position = [0, 0, 0],
}: {
  position?: [number, number, number];
}) {
  const isMobile = isMobileOptimizationTarget();
  return (
    <group position={position}>
      <mesh geometry={forgeDetailGeos.chimney} material={forgeDetailMats.chimney} position={[0, 6.2, 0]} castShadow={!isMobile} receiveShadow={!isMobile} />
      <mesh geometry={forgeDetailGeos.chimneyCap} material={forgeDetailMats.chimneyCap} position={[0, 9.0, 0]} castShadow={!isMobile} />
      <group position={[-2.5, 0, 2.5]}>
        <mesh geometry={forgeDetailGeos.hearth} material={forgeDetailMats.hearth} position={[0, 1.2, 0]} castShadow={!isMobile} receiveShadow={!isMobile} />
        <mesh geometry={forgeDetailGeos.fireOpening} material={forgeDetailMats.fireGlow} position={[0, 1.2, 1.22]} />

        <group position={[1.8, 0, 1.5]}>
          <mesh geometry={forgeDetailGeos.anvilStump} material={forgeDetailMats.anvilStump} position={[0, 0.45, 0]} castShadow={!isMobile} receiveShadow={!isMobile} />
          <mesh geometry={forgeDetailGeos.anvilBody} material={forgeDetailMats.anvilSteel} position={[0, 1.1, 0]} castShadow={!isMobile} />
          <mesh
            geometry={forgeDetailGeos.anvilHorn}
            material={forgeDetailMats.anvilSteel}
            position={[0, 1.1, 0.7]}
            rotation={[Math.PI / 2, 0, 0]}
            castShadow={!isMobile}
          />
        </group>
      </group>
    </group>
  );
}

/**
 * Paisaje de Fondo Cinemático con castillo y montañas exteriores
 */
export function MedievalSunsetCitadelBackdrop() {
  const isMobile = isMobileOptimizationTarget();
  return (
    <group position={[0, 0, 0]}>
      <mesh
        geometry={citadelBackdropGeos.ground}
        material={citadelBackdropMats.ground}
        position={[0, -2, -155]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow={!isMobile}
      />

      <group position={[0, 10, -160]}>
        <mesh
          geometry={citadelBackdropGeos.curtainWall}
          material={citadelBackdropMats.stoneLight}
          position={[0, 6, 0]}
          castShadow={!isMobile}
          receiveShadow={!isMobile}
        />
        {CITADEL_MERLON_X.map((xOff, i) => (
          <mesh
            key={i}
            geometry={citadelBackdropGeos.merlon}
            material={citadelBackdropMats.stoneDark}
            position={[xOff, 15, 0]}
            castShadow={!isMobile}
          />
        ))}

        <mesh
          geometry={citadelBackdropGeos.mainKeep}
          material={citadelBackdropMats.keepWall}
          position={[0, 18, -4]}
          castShadow={!isMobile}
          receiveShadow={!isMobile}
        />
        <mesh
          geometry={citadelBackdropGeos.mainRoof}
          material={citadelBackdropMats.mainRoof}
          position={[0, 35, -4]}
          castShadow={!isMobile}
        />

        {CITADEL_TOWER_X.map((tX, idx) => (
          <group key={idx} position={[tX, 10, 2]}>
            <mesh geometry={citadelBackdropGeos.sideTower} material={citadelBackdropMats.stoneLight} castShadow={!isMobile} receiveShadow={!isMobile} />
            <mesh geometry={citadelBackdropGeos.sideRoof} material={citadelBackdropMats.sideRoof} position={[0, 16, 0]} castShadow={!isMobile} />
            <mesh geometry={citadelBackdropGeos.flagPole} material={citadelBackdropMats.flagPole} position={[0, 23, 0]} />
            <mesh geometry={citadelBackdropGeos.flagCloth} material={citadelBackdropMats.flagCloth} position={[1.2, 24.5, 0]} />
          </group>
        ))}
      </group>

      {CITADEL_MOUNTAIN_X.map((mX, mIdx) => (
        <mesh
          key={mIdx}
          geometry={citadelBackdropGeos.mountain}
          material={citadelBackdropMats.mountain}
          position={[mX, 32, -185]}
          castShadow={!isMobile}
        />
      ))}
    </group>
  );
}
