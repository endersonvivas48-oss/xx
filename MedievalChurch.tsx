import React, { useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import {
  markAsSharedAsset,
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

// URLs candidatas oficiales del modelo 3D GLB de la Capilla / Iglesia
const CHURCH_GLB_URLS = [
  'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main/iglesis.glb',
  'https://raw.githubusercontent.com/endersonvivas48-oss/main/main/iglesis.glb',
];

let cachedChurchScene: THREE.Group | null = null;
let isChurchLoading = false;
let hasChurchLoadSettled = false;
const churchListeners: Array<(scene: THREE.Group | null) => void> = [];

export function isChurchGlbSettled(): boolean {
  return hasChurchLoadSettled;
}

export function preloadChurchGlb(): Promise<THREE.Group | null> {
  if (cachedChurchScene) {
    hasChurchLoadSettled = true;
    return Promise.resolve(cachedChurchScene);
  }
  return new Promise((resolve) => {
    loadChurchModel((scene) => resolve(scene));
  });
}

function loadChurchModel(onLoaded: (scene: THREE.Group | null) => void) {
  if (cachedChurchScene) {
    hasChurchLoadSettled = true;
    onLoaded(cachedChurchScene);
    return;
  }

  churchListeners.push(onLoaded);
  if (isChurchLoading) return;
  isChurchLoading = true;

  const effectiveUrls = resolveMobileGlbUrls(CHURCH_GLB_URLS);

  const tryUrl = (idx: number) => {
    if (idx >= effectiveUrls.length) {
      isChurchLoading = false;
      hasChurchLoadSettled = true;
      churchListeners.forEach((l) => l(null));
      churchListeners.length = 0;
      return;
    }

    const url = effectiveUrls[idx];
    loadGltfFromUrl(url)
      .then(async (gltf) => {
        if (gltf && gltf.scene) {
          const root = await optimizeGlbSceneAsync(gltf.scene as THREE.Group, 'HERO_BUILDING', {
            preoptimizedMobile: isPreoptimizedMobileGlbUrl(url),
          });

          root.traverse((child: any) => {
            if (child.isMesh && child.material) {
              const mats = Array.isArray(child.material) ? child.material : [child.material];
              mats.forEach((mat: any) => {
                if (mat && (mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial)) {
                  mat.roughness = Math.min(mat.roughness ?? 0.8, 0.85);
                  mat.metalness = Math.min(mat.metalness ?? 0.1, 0.15);
                }
              });
            }
          });

          const bbox = new THREE.Box3().setFromObject(root);
          const size = bbox.getSize(new THREE.Vector3());
          const center = bbox.getCenter(new THREE.Vector3());

          const maxDim = Math.max(size.x, size.y, size.z);
          const targetSize = 36.0;
          const scale = maxDim > 0.1 ? targetSize / maxDim : 1.0;

          root.position.set(-center.x * scale, -bbox.min.y * scale, -center.z * scale);
          root.scale.set(scale, scale, scale);
          root.rotation.set(0, Math.PI / 2, 0);

          const wrapper = new THREE.Group();
          wrapper.add(root);

          markAsSharedAsset(wrapper);

          cachedChurchScene = wrapper;
          isChurchLoading = false;
          hasChurchLoadSettled = true;
          churchListeners.forEach((l) => l(cachedChurchScene));
          churchListeners.length = 0;
        } else {
          tryUrl(idx + 1);
        }
      })
      .catch(() => {
        tryUrl(idx + 1);
      });
  };

  tryUrl(0);
}

export function disposeChurchGlbAsset(): void {
  if (cachedChurchScene) {
    disposeObject3DResources(cachedChurchScene);
    cachedChurchScene = null;
  }
  isChurchLoading = false;
  hasChurchLoadSettled = false;
  churchListeners.length = 0;
}

interface MedievalChurchProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  isModalActive?: boolean;
  onBlessing?: () => void;
}

let cachedLowPolyChurchTemplate: THREE.Group | null = null;

function getLowPolyChurchTemplate(): THREE.Group {
  if (cachedLowPolyChurchTemplate) return cachedLowPolyChurchTemplate;

  const isMobile = isMobileOptimizationTarget();
  const group = new THREE.Group();

  const stoneGeo = mergeStaticGeometries([
    { geometry: new THREE.BoxGeometry(17.5, 0.8, 28.0), position: [0, 0.4, 0] },
    { geometry: new THREE.BoxGeometry(14.5, 11.0, 24.0), position: [0, 6.3, 0] },
    { geometry: new THREE.BoxGeometry(24.0, 9.5, 9.5), position: [0, 5.55, 1.5] },
    { geometry: new THREE.BoxGeometry(6.5, 19.0, 6.5), position: [0, 9.9, -9.5] },
  ]);
  const roofGeo = mergeStaticGeometries([
    { geometry: new THREE.CylinderGeometry(0.2, 10.6, 5.5, 4), position: [0, 14.5, 0], rotation: [0, Math.PI / 4, 0] },
    { geometry: new THREE.ConeGeometry(5.2, 7.5, 4), position: [0, 23.1, -9.5], rotation: [0, Math.PI / 4, 0] },
  ]);
  const portalGlowGeo = mergeStaticGeometries([
    { geometry: new THREE.BoxGeometry(4.2, 6.2, 0.8), position: [0, 3.5, -12.8] },
    { geometry: new THREE.OctahedronGeometry(0.95), position: [0, 27.6, -9.5] },
  ]);

  const stoneMat = markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.85 }));
  const roofMat = markMaterialAsShared(new THREE.MeshStandardMaterial({ color: '#1e3a8a', roughness: 0.6 }));
  const goldMat = markMaterialAsShared(
    new THREE.MeshStandardMaterial({
      color: '#fbbf24',
      emissive: '#f59e0b',
      emissiveIntensity: 0.55,
      metalness: 0.75,
      roughness: 0.25,
    })
  );

  [
    new THREE.Mesh(stoneGeo, stoneMat),
    new THREE.Mesh(roofGeo, roofMat),
    new THREE.Mesh(portalGlowGeo, goldMat),
  ].forEach((m) => {
    m.castShadow = !isMobile;
    m.receiveShadow = !isMobile;
    group.add(m);
  });

  cachedLowPolyChurchTemplate = markAsSharedAsset(group);
  return cachedLowPolyChurchTemplate;
}

export function MedievalChurch({
  position = [0, 0, 48],
  rotation = [0, 0, 0],
  isModalActive = false,
  onBlessing,
}: MedievalChurchProps) {
  const [model, setModel] = useState<THREE.Group | null>(() => cachedChurchScene);

  useEffect(() => {
    let isMounted = true;
    loadChurchModel((scene) => {
      if (isMounted && scene) {
        setModel(scene);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const instanceClone = useMemo(() => {
    const src = model || getLowPolyChurchTemplate();
    return src.clone(true);
  }, [model]);

  return (
    <group position={position} rotation={rotation}>
      <primitive object={instanceClone} />

      {/* Rótulo interactivo y cartel de la Capilla sobre la entrada frontal orientada hacia el bulevar */}
      {!isModalActive && (
        <Html position={[0, 7.5, -11.0]} center distanceFactor={22}>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              if (onBlessing) onBlessing();
            }}
            className="px-4 py-1.5 rounded-full bg-slate-950/95 border-2 border-amber-300 text-amber-300 font-serif font-black text-xs sm:text-sm whitespace-nowrap shadow-[0_0_25px_rgba(251,191,36,0.9)] hover:scale-105 active:scale-95 transition transform cursor-pointer pointer-events-auto flex items-center gap-1.5"
          >
            <span>⛪</span>
            <span>SANTUARIO Y CAPILLA ASTRAL</span>
          </button>
        </Html>
      )}
    </group>
  );
}
