import React, { useMemo, useState, useEffect } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import {
  markAsSharedAsset,
  markGeometryAsShared,
  markMaterialAsShared,
  disposeObject3DResources,
} from './ThreeSceneCleanup';
import { loadGltfFromUrl } from './gltfLoaderSingleton';
import {
  optimizeGlbSceneAsync,
  isMobileOptimizationTarget,
  resolveMobileGlbUrls,
  isPreoptimizedMobileGlbUrl,
} from './glbRuntimeOptimizer';
import { mergeStaticGeometries } from './InstancedGlbGroup';

interface ProceduralDistrictProps {
  id: string;
  name: string;
  label: string;
  type: 'ARENA' | 'SHOP' | 'FORGE' | 'TAVERN';
  position: [number, number, number];
  isModalActive?: boolean;
  onEnterBuilding?: () => void;
}

// URLs de modelos 3D GLB oficiales
const DISTRICT_GLB_URLS: Record<string, string[]> = {
  TAVERN: [
    'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main/taverna.glb',
    'https://raw.githubusercontent.com/endersonvivas48-oss/main/main/taverna.glb',
  ],
  FORGE: [
    'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main/forja.glb',
    'https://raw.githubusercontent.com/endersonvivas48-oss/main/main/forja.glb',
  ],
  SHOP: [
    'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main/temd.glb',
    'https://raw.githubusercontent.com/endersonvivas48-oss/main/main/temd.glb',
  ],
  ARENA: [
    'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main/coli.glb',
    'https://raw.githubusercontent.com/endersonvivas48-oss/main/main/coli.glb',
  ],
};

const DISTRICT_TARGET_SIZES: Record<string, number> = {
  TAVERN: 34.0,
  FORGE: 30.0,
  SHOP: 42.0,
  ARENA: 54.0,
};

const cachedGlbScenes: Record<string, THREE.Group | null> = {};
const glbLoadPromises: Record<string, Promise<THREE.Group | null> | null> = {};
const districtSettledMap: Record<string, boolean> = {};

export function isDistrictGlbSettled(type: 'ARENA' | 'SHOP' | 'FORGE' | 'TAVERN'): boolean {
  return Boolean(districtSettledMap[type]);
}

// Carga bajo demanda perezosa unificada (sin descargar modelos al importar el archivo)
export function loadDistrictGlbModel(type: 'ARENA' | 'SHOP' | 'FORGE' | 'TAVERN'): Promise<THREE.Group | null> {
  if (cachedGlbScenes[type]) {
    districtSettledMap[type] = true;
    return Promise.resolve(cachedGlbScenes[type]);
  }
  if (glbLoadPromises[type]) {
    return glbLoadPromises[type]!;
  }

  const urls = resolveMobileGlbUrls(DISTRICT_GLB_URLS[type] || []);
  const targetSize = DISTRICT_TARGET_SIZES[type] || 32.0;

  glbLoadPromises[type] = (async () => {
    for (const url of urls) {
      try {
        const gltf = await loadGltfFromUrl(url);

        if (gltf && gltf.scene) {
          const root = await optimizeGlbSceneAsync(gltf.scene as THREE.Group, 'HERO_BUILDING', {
            preoptimizedMobile: isPreoptimizedMobileGlbUrl(url),
          });

          const box = new THREE.Box3().setFromObject(root);
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = maxDim > 0 ? targetSize / maxDim : 1.0;

          const wrapper = new THREE.Group();
          root.position.set(
            -box.getCenter(new THREE.Vector3()).x * scale,
            -box.min.y * scale,
            -box.getCenter(new THREE.Vector3()).z * scale
          );
          root.scale.set(scale, scale, scale);
          wrapper.add(root);
          markAsSharedAsset(wrapper);

          cachedGlbScenes[type] = wrapper;
          districtSettledMap[type] = true;
          return wrapper;
        }
      } catch (_) {}
    }
    glbLoadPromises[type] = null;
    districtSettledMap[type] = true;
    return null;
  })();

  return glbLoadPromises[type]!;
}

export function disposeDistrictGlbAssets(): void {
  (['ARENA', 'SHOP', 'FORGE', 'TAVERN'] as const).forEach((type) => {
    const cached = cachedGlbScenes[type];
    if (cached) {
      disposeObject3DResources(cached);
    }
    cachedGlbScenes[type] = null;
    glbLoadPromises[type] = null;
    districtSettledMap[type] = false;
  });
}

function useDistrictModel(type: 'ARENA' | 'SHOP' | 'FORGE' | 'TAVERN'): THREE.Group | null {
  const [model, setModel] = useState<THREE.Group | null>(() => cachedGlbScenes[type] || null);

  useEffect(() => {
    let isMounted = true;
    if (cachedGlbScenes[type]) {
      setModel(cachedGlbScenes[type]);
      return;
    }

    loadDistrictGlbModel(type).then((scene) => {
      if (isMounted && scene) {
        setModel(scene);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [type]);

  return model;
}

// Caché perezosa por tipo de distrito: se construye solo si un edificio necesita fallback mientras carga o tras fallo de CDN
const districtFallbackCache: Partial<Record<'ARENA' | 'SHOP' | 'FORGE' | 'TAVERN', THREE.Group>> = {};

function getDistrictFallbackTemplate(type: 'ARENA' | 'SHOP' | 'FORGE' | 'TAVERN'): THREE.Group {
  const cached = districtFallbackCache[type];
  if (cached) return cached;

  const isMobile = isMobileOptimizationTarget();
  const group = new THREE.Group();

  const stoneMat = markMaterialAsShared(
    new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.85 })
  );
  const goldMat = markMaterialAsShared(
    new THREE.MeshStandardMaterial({ color: '#f59e0b', metalness: 0.85, roughness: 0.25 })
  );

  if (type === 'ARENA') {
    const wallGeo = mergeStaticGeometries([
      { geometry: new THREE.CylinderGeometry(23.5, 25.0, 1.2, 16), position: [0, 0.6, 0] },
      { geometry: new THREE.CylinderGeometry(21.0, 22.0, 10.5, 16), position: [0, 6.45, 0] },
      { geometry: new THREE.TorusGeometry(21.4, 0.8, 6, 16), position: [0, 11.9, 0], rotation: [Math.PI / 2, 0, 0] },
      { geometry: new THREE.BoxGeometry(9.0, 9.5, 4.5), position: [0, 4.75, 20.5] },
    ]);
    const roofGeo = mergeStaticGeometries([
      { geometry: new THREE.CylinderGeometry(22.2, 22.5, 1.4, 16), position: [0, 12.7, 0] },
      { geometry: new THREE.ConeGeometry(4.5, 4.0, 8), position: [-9.0, 13.5, 18.0] },
      { geometry: new THREE.ConeGeometry(4.5, 4.0, 8), position: [9.0, 13.5, 18.0] },
    ]);
    const portalGeo = markGeometryAsShared(new THREE.BoxGeometry(4.6, 6.2, 1.2));
    portalGeo.translate(0, 3.1, 22.6);

    const roofMat = markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#991b1b', roughness: 0.6 }));
    const portalMat = markMaterialAsShared(
      new THREE.MeshStandardMaterial({ color: '#451a03', emissive: '#ef4444', emissiveIntensity: 0.35 })
    );

    [
      new THREE.Mesh(wallGeo, stoneMat),
      new THREE.Mesh(roofGeo, roofMat),
      new THREE.Mesh(portalGeo, portalMat),
    ].forEach((m) => {
      m.castShadow = !isMobile;
      m.receiveShadow = !isMobile;
      group.add(m);
    });
  } else {
    const isTavern = type === 'TAVERN';
    const isForge = type === 'FORGE';
    const w = type === 'SHOP' ? 24 : 21;
    const d = type === 'SHOP' ? 22 : 19;
    const h = type === 'SHOP' ? 10 : 8.5;
    const doorZ = isTavern ? -d / 2 - 0.3 : d / 2 + 0.3;

    const wallColor = isTavern ? '#78350f' : isForge ? '#334155' : '#3b2d54';
    const roofColor = isTavern ? '#92400e' : isForge ? '#0369a1' : '#581c87';

    const bodyGeo = mergeStaticGeometries([
      { geometry: new THREE.BoxGeometry(w + 2.2, 0.9, d + 2.2), position: [0, 0.45, 0] },
      { geometry: new THREE.BoxGeometry(w, h, d), position: [0, h / 2 + 0.9, 0] },
      { geometry: new THREE.CylinderGeometry(2.8, 3.0, h + 3.2, 10), position: [-w / 2 + 1.4, (h + 3.2) / 2, d / 2 - 1.4] },
      { geometry: new THREE.CylinderGeometry(2.8, 3.0, h + 3.2, 10), position: [w / 2 - 1.4, (h + 3.2) / 2, d / 2 - 1.4] },
    ]);
    const roofGeo = mergeStaticGeometries([
      {
        geometry: new THREE.ConeGeometry(Math.max(w, d) * 0.78, 6.8, 4),
        position: [0, h + 4.3, 0],
        rotation: [0, Math.PI / 4, 0],
      },
      { geometry: new THREE.ConeGeometry(3.3, 3.6, 10), position: [-w / 2 + 1.4, h + 5.0, d / 2 - 1.4] },
      { geometry: new THREE.ConeGeometry(3.3, 3.6, 10), position: [w / 2 - 1.4, h + 5.0, d / 2 - 1.4] },
    ]);
    const trimGeo = mergeStaticGeometries([
      { geometry: new THREE.BoxGeometry(3.8, 5.2, 0.8), position: [0, 3.0, doorZ] },
      { geometry: new THREE.SphereGeometry(0.65, 8, 8), position: [0, h + 7.9, 0] },
    ]);

    const bodyMat = markMaterialAsShared(new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.82 }));
    const roofMat = markMaterialAsShared(new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.6 }));

    [
      new THREE.Mesh(bodyGeo, bodyMat),
      new THREE.Mesh(roofGeo, roofMat),
      new THREE.Mesh(trimGeo, goldMat),
    ].forEach((m) => {
      m.castShadow = !isMobile;
      m.receiveShadow = !isMobile;
      group.add(m);
    });
  }

  districtFallbackCache[type] = markAsSharedAsset(group);
  return districtFallbackCache[type]!;
}

const DISTRICT_DISPLAY_CONFIG: Record<
  'ARENA' | 'SHOP' | 'FORGE' | 'TAVERN',
  {
    rotationY: number;
    labelPos: [number, number, number];
    isArena?: boolean;
  }
> = {
  TAVERN: { rotationY: Math.PI, labelPos: [0, 7.5, -11] },
  FORGE: { rotationY: -Math.PI / 2, labelPos: [0, 7.5, 10] },
  SHOP: { rotationY: Math.PI / 2, labelPos: [0, 9.5, 13] },
  ARENA: { rotationY: 0, labelPos: [0, 3.2, 20.5], isArena: true },
};

export function ProceduralDistrict({
  label,
  type,
  position,
  isModalActive = false,
  onEnterBuilding,
}: ProceduralDistrictProps) {
  const districtModel = useDistrictModel(type);
  const displayMesh = useMemo(() => {
    const src = districtModel || getDistrictFallbackTemplate(type);
    return src.clone(true);
  }, [districtModel, type]);

  const cfg = DISTRICT_DISPLAY_CONFIG[type];

  return (
    <group position={position} rotation={[0, cfg.rotationY, 0]}>
      <primitive object={displayMesh} />
      {!isModalActive && (
        <Html position={cfg.labelPos} center distanceFactor={22}>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              if (onEnterBuilding) onEnterBuilding();
            }}
            className={
              cfg.isArena
                ? 'px-4 py-2 rounded-full bg-black/95 border-2 border-red-500 text-amber-300 font-serif font-black text-xs sm:text-sm whitespace-nowrap shadow-[0_0_25px_rgba(239,68,68,0.95)] hover:scale-105 active:scale-95 transition transform cursor-pointer pointer-events-auto flex items-center gap-1.5'
                : 'px-3.5 py-1.5 rounded-full bg-black/95 border-2 border-amber-400 text-amber-300 font-serif font-black text-xs sm:text-sm whitespace-nowrap shadow-[0_0_20px_rgba(245,158,11,0.9)] hover:scale-105 active:scale-95 transition transform cursor-pointer pointer-events-auto'
            }
          >
            {cfg.isArena && <span>⚔️</span>}
            <span>{label}</span>
          </button>
        </Html>
      )}
    </group>
  );
}
