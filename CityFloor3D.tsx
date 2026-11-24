import React, { useEffect, useState, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { markAsSharedAsset, disposeObject3DResources } from './ThreeSceneCleanup';
import { loadGltfFromUrl } from './gltfLoaderSingleton';
import {
  optimizeGlbSceneAsync,
  isMobileOptimizationTarget,
  resolveMobileGlbUrls,
  isPreoptimizedMobileGlbUrl,
} from './glbRuntimeOptimizer';

// URLs candidatas oficiales del modelo 3D GLB del suelo
const FLOOR_GLB_URLS = [
  'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main/floor.glb',
  'https://raw.githubusercontent.com/endersonvivas48-oss/main/main/floor.glb',
];

interface FloorMeshAsset {
  scene: THREE.Group;
  baseWidth: number;
  baseDepth: number;
}

let cachedFloorAsset: FloorMeshAsset | null = null;
let isFloorLoading = false;
let hasFloorLoadSettled = false;
const floorListeners: Array<(asset: FloorMeshAsset | null) => void> = [];

export function isCityFloorGlbSettled(): boolean {
  return hasFloorLoadSettled;
}

export function preloadCityFloorGlb(): Promise<FloorMeshAsset | null> {
  if (cachedFloorAsset) {
    hasFloorLoadSettled = true;
    return Promise.resolve(cachedFloorAsset);
  }
  return new Promise((resolve) => {
    loadFloorModel((asset) => resolve(asset));
  });
}

function loadFloorModel(onLoaded: (asset: FloorMeshAsset | null) => void) {
  if (cachedFloorAsset) {
    hasFloorLoadSettled = true;
    onLoaded(cachedFloorAsset);
    return;
  }

  floorListeners.push(onLoaded);
  if (isFloorLoading) return;
  isFloorLoading = true;

  const effectiveUrls = resolveMobileGlbUrls(FLOOR_GLB_URLS);

  const tryUrl = (idx: number) => {
    if (idx >= effectiveUrls.length) {
      isFloorLoading = false;
      hasFloorLoadSettled = true;
      floorListeners.forEach((l) => l(null));
      floorListeners.length = 0;
      return;
    }

    const url = effectiveUrls[idx];
    loadGltfFromUrl(url)
      .then(async (gltf) => {
        if (gltf && gltf.scene) {
          const root = await optimizeGlbSceneAsync(gltf.scene as THREE.Group, 'FLOOR', {
            preoptimizedMobile: isPreoptimizedMobileGlbUrl(url),
          });

          const bbox = new THREE.Box3().setFromObject(root);
          const size = bbox.getSize(new THREE.Vector3());
          const center = bbox.getCenter(new THREE.Vector3());

          root.position.set(-center.x, -bbox.min.y, -center.z);

          const wrapper = new THREE.Group();
          wrapper.add(root);
          markAsSharedAsset(wrapper);

          const width = size.x > 0.5 ? size.x : 20;
          const depth = size.z > 0.5 ? size.z : 20;

          cachedFloorAsset = {
            scene: wrapper,
            baseWidth: width,
            baseDepth: depth,
          };

          isFloorLoading = false;
          hasFloorLoadSettled = true;
          floorListeners.forEach((l) => l(cachedFloorAsset));
          floorListeners.length = 0;
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

export function disposeCityFloorGlbAsset(): void {
  if (cachedFloorAsset) {
    disposeObject3DResources(cachedFloorAsset.scene);
    cachedFloorAsset = null;
  }
  isFloorLoading = false;
  hasFloorLoadSettled = false;
  floorListeners.length = 0;
}

interface TileTransform {
  pos: [number, number, number];
  scale: [number, number, number];
}

function InstancedFloorSubmesh({
  geometry,
  material,
  localMatrix,
  tiles,
  receiveShadow,
  onPointerDown,
}: {
  geometry: THREE.BufferGeometry;
  material: THREE.Material | THREE.Material[];
  localMatrix: THREE.Matrix4;
  tiles: TileTransform[];
  receiveShadow: boolean;
  onPointerDown?: (e: any) => void;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const finalMatrix = useMemo(() => new THREE.Matrix4(), []);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    tiles.forEach((t, i) => {
      dummy.position.set(t.pos[0], t.pos[1], t.pos[2]);
      dummy.scale.set(t.scale[0], t.scale[1], t.scale[2]);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      finalMatrix.multiplyMatrices(dummy.matrix, localMatrix);
      mesh.setMatrixAt(i, finalMatrix);
    });
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingBox();
    mesh.computeBoundingSphere();
  }, [tiles, dummy, finalMatrix, localMatrix]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, tiles.length]}
      receiveShadow={receiveShadow}
      frustumCulled={true}
      onPointerDown={onPointerDown}
    />
  );
}

export function CityFloor3D({
  extent = 270,
  fallbackMap,
  fallbackColor = '#52433d',
  onPointerDown,
}: {
  extent?: number;
  fallbackMap?: THREE.Texture;
  fallbackColor?: string;
  onPointerDown?: (e: any) => void;
}) {
  const [floorAsset, setFloorAsset] = useState<FloorMeshAsset | null>(() => cachedFloorAsset);

  useEffect(() => {
    let isMounted = true;
    loadFloorModel((asset) => {
      if (isMounted && asset) {
        setFloorAsset(asset);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const tiles: TileTransform[] = useMemo(() => {
    if (!floorAsset) return [];

    const isMobileDevice = isMobileOptimizationTarget();

    const targetTileSize = isMobileDevice ? 45.0 : 25.0;
    const scaleX = targetTileSize / floorAsset.baseWidth;
    const scaleZ = targetTileSize / floorAsset.baseDepth;
    const avgScale = (scaleX + scaleZ) / 2;

    const effectiveTileSize = targetTileSize;
    const halfExtent = extent / 2;
    const countX = Math.ceil(extent / effectiveTileSize);
    const countZ = Math.ceil(extent / effectiveTileSize);

    const startX = -halfExtent + effectiveTileSize / 2;
    const startZ = -halfExtent + effectiveTileSize / 2;

    const list: TileTransform[] = [];

    for (let ix = 0; ix < countX; ix++) {
      for (let iz = 0; iz < countZ; iz++) {
        const x = startX + ix * effectiveTileSize;
        const z = startZ + iz * effectiveTileSize;
        list.push({
          pos: [x, -0.02, z],
          scale: [avgScale, avgScale, avgScale],
        });
      }
    }
    return list;
  }, [floorAsset, extent]);

  const submeshes = useMemo(() => {
    if (!floorAsset) return [];
    floorAsset.scene.updateMatrixWorld(true);
    const rootInv = new THREE.Matrix4().copy(floorAsset.scene.matrixWorld).invert();
    const list: Array<{
      id: string;
      geometry: THREE.BufferGeometry;
      material: THREE.Material | THREE.Material[];
      localMatrix: THREE.Matrix4;
    }> = [];
    let counter = 0;
    floorAsset.scene.traverse((child: any) => {
      if (child.isMesh && child.geometry && child.material) {
        const localMatrix = new THREE.Matrix4().multiplyMatrices(rootInv, child.matrixWorld);
        list.push({
          id: `floor_mesh_${counter++}`,
          geometry: child.geometry,
          material: child.material,
          localMatrix,
        });
      }
    });
    return list;
  }, [floorAsset]);

  const isMobile = isMobileOptimizationTarget();
  const hasInstancedFloor = tiles.length > 0 && submeshes.length > 0;

  return (
    <group>
      {!hasInstancedFloor && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0, 0]}
          receiveShadow={!isMobile}
          onPointerDown={onPointerDown}
        >
          <planeGeometry args={[extent, extent]} />
          <meshStandardMaterial
            color={fallbackColor}
            map={fallbackMap}
            roughness={0.8}
          />
        </mesh>
      )}

      {hasInstancedFloor &&
        submeshes.map((sub) => (
          <InstancedFloorSubmesh
            key={sub.id}
            geometry={sub.geometry}
            material={sub.material}
            localMatrix={sub.localMatrix}
            tiles={tiles}
            receiveShadow={!isMobile}
            onPointerDown={onPointerDown}
          />
        ))}
    </group>
  );
}
