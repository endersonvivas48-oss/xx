import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { createSharedGlbAssetLoader, useSharedGlbAsset } from './gltfLoaderSingleton';
import { isMobileOptimizationTarget } from './glbRuntimeOptimizer';
import { markAsSharedAsset, markGeometryAsShared, markMaterialAsShared } from './ThreeSceneCleanup';
import { InstancedGlbGroup, InstancedTransformItem, mergeStaticGeometries } from './InstancedGlbGroup';

export interface ResidentAdvisor {
  id: string;
  name: string;
  title: string;
  topic: string;
  tip: string;
  color: string;
  icon: string;
  avatarUrl?: string;
}

export interface ResidentialHouseData {
  id: string;
  houseName: string;
  pos: [number, number, number];
  rot: number;
  w: number;
  d: number;
  h: number;
  roof: string;
  wall: string;
  doorWorldPos: [number, number, number];
  resident: ResidentAdvisor;
}

/**
 * Fuente de verdad única para la posición segura de retorno frente a la puerta de una casa en la Ciudad.
 */
export function getHouseSafeExitPos(house: ResidentialHouseData): [number, number, number] {
  const spawnOffsetX = house.pos[0] < 0 ? 12.0 : -12.0;
  return [house.pos[0] + spawnOffsetX, 0, house.doorWorldPos[2]];
}

interface MedievalHouseProps {
  houseData: ResidentialHouseData;
  isPlayerNearDoor: boolean;
  isModalActive: boolean;
  onEnterHouse: (house: ResidentialHouseData) => void;
  glbRotationOffset?: number;
}

// URL unificada para el modelo 3D GLB de la casa medieval
const MEDIEVAL_HOUSE_URL_CANDIDATES = [
  'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main/medieval_house.glb',
  'https://raw.githubusercontent.com/endersonvivas48-oss/main/main/medieval_house.glb',
];

const ROOF_SLOT_REGEX = /roof|tejado|techo|tile|shingle|slate|gable|chimney/i;
const WALL_SLOT_REGEX = /wall|muro|pared|plaster|stucco|facade|body|siding/i;
const TRIM_SLOT_REGEX = /door|puerta|window|ventana|glass|vidrio|frame|marco|timber|wood|madera|beam|viga|stone|piedra|base|foundation|step/i;

function splitHouseGeometryByHeight(
  sourceGeom: THREE.BufferGeometry,
  splitWorldY: number,
  localToWorldMatrix: THREE.Matrix4
): { lower: THREE.BufferGeometry | null; upper: THREE.BufferGeometry | null } {
  const posAttr = sourceGeom.getAttribute('position');
  if (!posAttr || posAttr.count < 3) {
    return { lower: null, upper: null };
  }

  const normAttr = sourceGeom.getAttribute('normal');
  const uvAttr = sourceGeom.getAttribute('uv');
  const colAttr = sourceGeom.getAttribute('color');
  const idxAttr = sourceGeom.getIndex();

  const triCount = idxAttr ? Math.floor(idxAttr.count / 3) : Math.floor(posAttr.count / 3);
  const lowerTriIndices: number[] = [];
  const upperTriIndices: number[] = [];

  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();
  const vC = new THREE.Vector3();

  for (let t = 0; t < triCount; t++) {
    const i0 = idxAttr ? idxAttr.getX(t * 3) : t * 3;
    const i1 = idxAttr ? idxAttr.getX(t * 3 + 1) : t * 3 + 1;
    const i2 = idxAttr ? idxAttr.getX(t * 3 + 2) : t * 3 + 2;

    vA.set(posAttr.getX(i0), posAttr.getY(i0), posAttr.getZ(i0)).applyMatrix4(localToWorldMatrix);
    vB.set(posAttr.getX(i1), posAttr.getY(i1), posAttr.getZ(i1)).applyMatrix4(localToWorldMatrix);
    vC.set(posAttr.getX(i2), posAttr.getY(i2), posAttr.getZ(i2)).applyMatrix4(localToWorldMatrix);

    const centroidY = (vA.y + vB.y + vC.y) / 3;
    if (centroidY >= splitWorldY) {
      upperTriIndices.push(i0, i1, i2);
    } else {
      lowerTriIndices.push(i0, i1, i2);
    }
  }

  if (lowerTriIndices.length === 0 || upperTriIndices.length === 0) {
    return { lower: null, upper: null };
  }

  const buildSubGeo = (vertIndices: number[]): THREE.BufferGeometry => {
    const remap = new Map<number, number>();
    const outIdx: number[] = [];
    const outPos: number[] = [];
    const outNorm: number[] = [];
    const outUv: number[] = [];
    const outCol: number[] = [];

    for (const origIdx of vertIndices) {
      let mapped = remap.get(origIdx);
      if (mapped === undefined) {
        mapped = remap.size;
        remap.set(origIdx, mapped);
        outPos.push(posAttr.getX(origIdx), posAttr.getY(origIdx), posAttr.getZ(origIdx));
        if (normAttr) {
          outNorm.push(normAttr.getX(origIdx), normAttr.getY(origIdx), normAttr.getZ(origIdx));
        }
        if (uvAttr) {
          outUv.push(uvAttr.getX(origIdx), uvAttr.getY(origIdx));
        }
        if (colAttr) {
          outCol.push(colAttr.getX(origIdx), colAttr.getY(origIdx), colAttr.getZ(origIdx));
        }
      }
      outIdx.push(mapped);
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(outPos, 3));
    if (normAttr) {
      g.setAttribute('normal', new THREE.Float32BufferAttribute(outNorm, 3));
    } else {
      g.computeVertexNormals();
    }
    if (uvAttr) {
      g.setAttribute('uv', new THREE.Float32BufferAttribute(outUv, 2));
    }
    if (colAttr) {
      g.setAttribute('color', new THREE.Float32BufferAttribute(outCol, 3));
    }
    g.setIndex(outIdx);
    return markGeometryAsShared(g);
  };

  return {
    lower: buildSubGeo(lowerTriIndices),
    upper: buildSubGeo(upperTriIndices),
  };
}

function prepareTintedHouseMaterial(mat: THREE.Material | THREE.Material[]): THREE.Material | THREE.Material[] {
  const prepOne = (m: THREE.Material): THREE.Material => {
    const cloned = m.clone() as THREE.MeshStandardMaterial;
    if (cloned.color) {
      // Asegurar base luminosa para que instanceColor (roof / wall) tiña la casa sin oscurecerla en exceso
      cloned.color.set('#ffffff');
    }
    cloned.needsUpdate = true;
    return markMaterialAsShared(cloned);
  };
  return Array.isArray(mat) ? mat.map(prepOne) : prepOne(mat);
}

function tagHouseGlbTintSlots(wrapperGroup: THREE.Group): void {
  wrapperGroup.updateMatrixWorld(true);
  const totalBox = new THREE.Box3().setFromObject(wrapperGroup);
  const totalSize = totalBox.getSize(new THREE.Vector3());
  const minY = totalBox.min.y;
  const totalHeight = Math.max(totalSize.y, 0.001);
  const totalFootprint = Math.max(totalSize.x * totalSize.z, 0.001);

  const meshes: THREE.Mesh[] = [];
  wrapperGroup.traverse((child: any) => {
    if (child.isMesh && child.geometry && child.material) {
      meshes.push(child as THREE.Mesh);
    }
  });

  if (meshes.length === 0) return;

  // Caso especial: si el GLB/optimizador consolidó la casa en una sola malla, dividirla por altura para distinguir techo y muros
  if (meshes.length === 1) {
    const singleMesh = meshes[0];
    const splitWorldY = minY + totalHeight * 0.52;
    const { lower, upper } = splitHouseGeometryByHeight(
      singleMesh.geometry,
      splitWorldY,
      singleMesh.matrixWorld
    );
    if (lower && upper && singleMesh.parent) {
      const parent = singleMesh.parent;
      const wallMesh = new THREE.Mesh(lower, prepareTintedHouseMaterial(singleMesh.material));
      wallMesh.position.copy(singleMesh.position);
      wallMesh.rotation.copy(singleMesh.rotation);
      wallMesh.scale.copy(singleMesh.scale);
      wallMesh.castShadow = singleMesh.castShadow;
      wallMesh.receiveShadow = singleMesh.receiveShadow;
      wallMesh.userData.tintSlot = 'wall';

      const roofMesh = new THREE.Mesh(upper, prepareTintedHouseMaterial(singleMesh.material));
      roofMesh.position.copy(singleMesh.position);
      roofMesh.rotation.copy(singleMesh.rotation);
      roofMesh.scale.copy(singleMesh.scale);
      roofMesh.castShadow = singleMesh.castShadow;
      roofMesh.receiveShadow = singleMesh.receiveShadow;
      roofMesh.userData.tintSlot = 'roof';

      parent.remove(singleMesh);
      parent.add(wallMesh);
      parent.add(roofMesh);
      return;
    }

    singleMesh.userData.tintSlot = 'wall';
    singleMesh.material = prepareTintedHouseMaterial(singleMesh.material);
    return;
  }

  interface MeshStats {
    mesh: THREE.Mesh;
    relMinY: number;
    relMaxY: number;
    relCenterY: number;
    footprintRatio: number;
    assignedSlot?: 'roof' | 'wall' | 'trim';
  }

  const statsList: MeshStats[] = meshes.map((mesh) => {
    const meshBox = new THREE.Box3().setFromObject(mesh);
    const meshSize = meshBox.getSize(new THREE.Vector3());
    const relMinY = (meshBox.min.y - minY) / totalHeight;
    const relMaxY = (meshBox.max.y - minY) / totalHeight;
    const relCenterY = (relMinY + relMaxY) * 0.5;
    const footprintRatio = (meshSize.x * meshSize.z) / totalFootprint;

    const firstMat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    const label = `${mesh.name || ''} ${firstMat?.name || ''}`.trim();

    let assignedSlot: MeshStats['assignedSlot'];
    if (ROOF_SLOT_REGEX.test(label)) {
      assignedSlot = 'roof';
    } else if (WALL_SLOT_REGEX.test(label)) {
      assignedSlot = 'wall';
    } else if (TRIM_SLOT_REGEX.test(label)) {
      assignedSlot = 'trim';
    }

    return { mesh, relMinY, relMaxY, relCenterY, footprintRatio, assignedSlot };
  });

  // Clasificación geométrica para las submallas sin nombre semántico
  for (const st of statsList) {
    if (st.assignedSlot) continue;
    if (st.relCenterY >= 0.55 || (st.relMinY >= 0.40 && st.relMaxY >= 0.84)) {
      st.assignedSlot = 'roof';
    } else if (st.relCenterY < 0.58 && st.relMinY < 0.35 && st.footprintRatio >= 0.22) {
      st.assignedSlot = 'wall';
    }
  }

  // Garantizar al menos un slot 'roof' y un slot 'wall' cuando haya múltiples submallas
  if (!statsList.some((s) => s.assignedSlot === 'roof')) {
    const roofCandidate = [...statsList]
      .filter((s) => s.assignedSlot !== 'wall')
      .sort((a, b) => b.relMaxY - a.relMaxY || b.relCenterY - a.relCenterY)[0];
    if (roofCandidate) {
      roofCandidate.assignedSlot = 'roof';
    }
  }

  if (!statsList.some((s) => s.assignedSlot === 'wall')) {
    const wallCandidate = [...statsList]
      .filter((s) => s.assignedSlot !== 'roof')
      .sort((a, b) => b.footprintRatio - a.footprintRatio || a.relCenterY - b.relCenterY)[0];
    if (wallCandidate) {
      wallCandidate.assignedSlot = 'wall';
    }
  }

  for (const st of statsList) {
    if (st.assignedSlot === 'roof' || st.assignedSlot === 'wall') {
      st.mesh.userData.tintSlot = st.assignedSlot;
      st.mesh.material = prepareTintedHouseMaterial(st.mesh.material);
    }
  }
}

const houseGlbLoader = createSharedGlbAssetLoader<THREE.Group>(
  MEDIEVAL_HOUSE_URL_CANDIDATES,
  (rootScene) => {
    const bbox = new THREE.Box3().setFromObject(rootScene);
    const center = bbox.getCenter(new THREE.Vector3());
    const minY = bbox.min.y;

    rootScene.position.set(-center.x, -minY, -center.z);

    const wrapperGroup = new THREE.Group();
    wrapperGroup.add(rootScene);
    tagHouseGlbTintSlots(wrapperGroup);

    return markAsSharedAsset(wrapperGroup);
  },
  'MedievalHouse',
  'HOUSE'
);

let cachedLowPolyHouseTemplate: THREE.Group | null = null;

/**
 * Perfil ligero procedural / low-poly compartido para Android y fallback inmediato:
 * 4 mallas mínimas (zócalo/vigas, muros con tinte, tejado con tinte, puerta/ventanas).
 */
function getLowPolyHouseTemplate(): THREE.Group {
  if (cachedLowPolyHouseTemplate) return cachedLowPolyHouseTemplate;

  const group = new THREE.Group();

  // 1. Zócalo de piedra + vigas de madera oscura
  const timberStoneGeo = mergeStaticGeometries([
    { geometry: new THREE.BoxGeometry(3.65, 0.28, 3.65), position: [0, 0.14, 0] },
    { geometry: new THREE.BoxGeometry(3.48, 0.14, 3.48), position: [0, 1.98, 0] },
    { geometry: new THREE.BoxGeometry(0.18, 1.9, 0.18), position: [-1.66, 1.05, -1.66] },
    { geometry: new THREE.BoxGeometry(0.18, 1.9, 0.18), position: [1.66, 1.05, -1.66] },
    { geometry: new THREE.BoxGeometry(0.18, 1.9, 0.18), position: [-1.66, 1.05, 1.66] },
    { geometry: new THREE.BoxGeometry(0.18, 1.9, 0.18), position: [1.66, 1.05, 1.66] },
  ]);
  const timberStoneMat = markMaterialAsShared(
    new THREE.MeshStandardMaterial({ color: '#292524', roughness: 0.9 })
  );
  group.add(new THREE.Mesh(timberStoneGeo, timberStoneMat));

  // 2. Cuerpo principal (admite tinte por instancia en Android)
  const wallGeo = mergeStaticGeometries([
    { geometry: new THREE.BoxGeometry(3.38, 1.85, 3.38), position: [0, 1.15, 0] },
  ]);
  const wallMat = markMaterialAsShared(
    new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.85 })
  );
  const wallMesh = new THREE.Mesh(wallGeo, wallMat);
  wallMesh.userData.tintSlot = 'wall';
  group.add(wallMesh);

  // 3. Tejado piramidal low-poly + chimenea (admite tinte por instancia)
  const roofGeo = mergeStaticGeometries([
    {
      geometry: new THREE.ConeGeometry(2.75, 1.45, 4),
      position: [0, 2.75, 0],
      rotation: [0, Math.PI / 4, 0],
    },
  ]);
  const roofMat = markMaterialAsShared(
    new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.75, flatShading: true })
  );
  const roofMesh = new THREE.Mesh(roofGeo, roofMat);
  roofMesh.userData.tintSlot = 'roof';
  group.add(roofMesh);

  // 4. Puerta de roble y ventanas cálidas frontales/laterales
  const doorWindowGeo = mergeStaticGeometries([
    { geometry: new THREE.BoxGeometry(0.75, 1.25, 0.14), position: [0, 0.72, 1.71] },
    { geometry: new THREE.BoxGeometry(0.45, 0.45, 0.12), position: [-0.95, 1.35, 1.7] },
    { geometry: new THREE.BoxGeometry(0.45, 0.45, 0.12), position: [0.95, 1.35, 1.7] },
    { geometry: new THREE.BoxGeometry(0.14, 1.25, 0.75), position: [1.71, 0.72, 0] },
    { geometry: new THREE.BoxGeometry(0.14, 1.25, 0.75), position: [-1.71, 0.72, 0] },
  ]);
  const doorWindowMat = markMaterialAsShared(
    new THREE.MeshStandardMaterial({
      color: '#78350f',
      emissive: '#f59e0b',
      emissiveIntensity: 0.25,
      roughness: 0.7,
    })
  );
  group.add(new THREE.Mesh(doorWindowGeo, doorWindowMat));

  cachedLowPolyHouseTemplate = markAsSharedAsset(group);
  return cachedLowPolyHouseTemplate;
}

export function isMedievalHouseGlbSettled(): boolean {
  if (isMobileOptimizationTarget()) return true;
  return houseGlbLoader.isSettled();
}

export function preloadMedievalHouseGlb(): Promise<THREE.Group | null> {
  if (isMobileOptimizationTarget()) return Promise.resolve(null);
  return houseGlbLoader.load();
}

export function disposeMedievalHouseGlbAsset(): void {
  houseGlbLoader.disposeCachedAsset();
}

/**
 * Renderizador por lotes con InstancedMesh para las 12 casas medievales de la ciudad.
 * En Android/móvil utiliza el perfil ligero procedural/low-poly sin descargar el GLB pesado.
 */
export function InstancedMedievalHouses({
  houses,
  houseRotations,
}: {
  houses: ResidentialHouseData[];
  houseRotations: Record<string, number>;
}) {
  const isMobile = isMobileOptimizationTarget();
  const glbScene = useSharedGlbAsset(houseGlbLoader, isMobile);

  const activeTemplate = useMemo(() => {
    if (!isMobile && glbScene) return glbScene;
    return getLowPolyHouseTemplate();
  }, [isMobile, glbScene]);

  const instances: InstancedTransformItem[] = useMemo(
    () =>
      houses.map((h) => {
        const individualRotDeg = houseRotations[h.id] ?? 270;
        const individualOffsetRad = (individualRotDeg * Math.PI) / 180;
        return {
          position: h.pos,
          rotation: [0, h.rot + individualOffsetRad, 0],
          scale: [2.45, 2.45, 2.45],
          tintColors: {
            roof: h.roof,
            wall: h.wall,
          },
        };
      }),
    [houses, houseRotations]
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

export function MedievalHouse({
  houseData,
  isPlayerNearDoor,
  isModalActive,
  onEnterHouse,
  glbRotationOffset = 0,
}: MedievalHouseProps) {
  const { pos, rot, houseName } = houseData;
  const isMobile = isMobileOptimizationTarget();
  const glbScene = useSharedGlbAsset(houseGlbLoader, isMobile);

  const instanceClone = useMemo(() => {
    const src = !isMobile && glbScene ? glbScene : getLowPolyHouseTemplate();
    return src.clone(true);
  }, [glbScene, isMobile]);

  const localDoorZ = 4.6;

  return (
    <group position={pos} rotation={[0, rot + glbRotationOffset, 0]}>
      <primitive
        object={instanceClone}
        scale={[2.45, 2.45, 2.45]}
        position={[0, 0, 0]}
      />

      {isPlayerNearDoor && !isModalActive && (
        <Html position={[0, 1.85, localDoorZ + 0.4]} center distanceFactor={22}>
          <div className="flex flex-col items-center gap-1 select-none pointer-events-auto">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEnterHouse(houseData);
              }}
              className="py-1.5 px-4 rounded-full font-serif font-black text-xs sm:text-sm shadow-[0_0_20px_rgba(245,158,11,0.8)] border-2 border-amber-300 bg-gradient-to-r from-amber-500 to-yellow-400 text-black transition-all transform hover:scale-105 active:scale-95 cursor-pointer whitespace-nowrap flex items-center gap-1.5"
            >
              <span>🏠</span>
              <span>Entrar a {houseName} (E)</span>
            </button>
          </div>
        </Html>
      )}
    </group>
  );
}
