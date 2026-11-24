import React, { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { markGeometryAsShared } from './ThreeSceneCleanup';

export interface InstancedTransformItem {
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number] | number;
  tintColors?: Record<string, string>;
}

interface ExtractedMeshPart {
  geometry: THREE.BufferGeometry;
  material: THREE.Material | THREE.Material[];
  localMatrix: THREE.Matrix4;
  tintSlot?: string;
}

const tempPos = new THREE.Vector3();
const tempQuat = new THREE.Quaternion();
const tempEuler = new THREE.Euler();
const tempScale = new THREE.Vector3();
const tempInstanceMatrix = new THREE.Matrix4();
const tempFinalMatrix = new THREE.Matrix4();
const tempColor = new THREE.Color();

export interface StaticGeoMergePart {
  geometry: THREE.BufferGeometry;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
}

/**
 * Combina múltiples geometrías estáticas (Box, Cylinder, Cone, etc.) en una sola
 * BufferGeometry compartida para reducir draw calls en perfiles low-poly / InstancedMesh.
 */
export function mergeStaticGeometries(parts: StaticGeoMergePart[]): THREE.BufferGeometry {
  const mat4 = new THREE.Matrix4();
  const normMat3 = new THREE.Matrix3();
  const v = new THREE.Vector3();
  const n = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();

  let totalVerts = 0;
  let totalIndices = 0;
  let allHaveUv = true;

  for (const part of parts) {
    const pos = part.geometry.getAttribute('position');
    if (!pos) continue;
    if (!part.geometry.getAttribute('uv')) allHaveUv = false;
    totalVerts += pos.count;
    const idx = part.geometry.getIndex();
    totalIndices += idx ? idx.count : pos.count;
  }

  const outPos = new Float32Array(totalVerts * 3);
  const outNorm = new Float32Array(totalVerts * 3);
  const outUv = allHaveUv ? new Float32Array(totalVerts * 2) : null;
  const outIdx = totalVerts <= 65535 ? new Uint16Array(totalIndices) : new Uint32Array(totalIndices);

  let vOffset = 0;
  let iOffset = 0;

  for (const part of parts) {
    const geom = part.geometry;
    const pos = geom.getAttribute('position');
    if (!pos) continue;
    if (!geom.getAttribute('normal')) {
      geom.computeVertexNormals();
    }
    const norm = geom.getAttribute('normal');
    const uv = geom.getAttribute('uv');

    p.set(...(part.position || [0, 0, 0]));
    e.set(...(part.rotation || [0, 0, 0]));
    q.setFromEuler(e);
    s.set(...(part.scale || [1, 1, 1]));
    mat4.compose(p, q, s);
    normMat3.getNormalMatrix(mat4);

    const vCount = pos.count;
    for (let i = 0; i < vCount; i++) {
      v.set(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(mat4);
      const dst3 = (vOffset + i) * 3;
      outPos[dst3] = v.x;
      outPos[dst3 + 1] = v.y;
      outPos[dst3 + 2] = v.z;

      if (norm) {
        n.set(norm.getX(i), norm.getY(i), norm.getZ(i)).applyMatrix3(normMat3).normalize();
        outNorm[dst3] = n.x;
        outNorm[dst3 + 1] = n.y;
        outNorm[dst3 + 2] = n.z;
      } else {
        outNorm[dst3 + 1] = 1;
      }

      if (outUv && uv) {
        const dst2 = (vOffset + i) * 2;
        outUv[dst2] = uv.getX(i);
        outUv[dst2 + 1] = uv.getY(i);
      }
    }

    const idx = geom.getIndex();
    if (idx) {
      for (let i = 0; i < idx.count; i++) {
        outIdx[iOffset + i] = vOffset + idx.getX(i);
      }
      iOffset += idx.count;
    } else {
      for (let i = 0; i < vCount; i++) {
        outIdx[iOffset + i] = vOffset + i;
      }
      iOffset += vCount;
    }

    vOffset += vCount;
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(outPos, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(outNorm, 3));
  if (outUv) merged.setAttribute('uv', new THREE.BufferAttribute(outUv, 2));
  merged.setIndex(new THREE.BufferAttribute(outIdx, 1));
  return markGeometryAsShared(merged);
}

function extractPartsFromGroup(template: THREE.Group): ExtractedMeshPart[] {
  template.updateMatrixWorld(true);
  const rootInv = new THREE.Matrix4().copy(template.matrixWorld).invert();
  const parts: ExtractedMeshPart[] = [];

  template.traverse((child: any) => {
    if (!child.isMesh || !child.geometry || !child.material) return;
    let mat: THREE.Material | THREE.Material[] | null = null;
    if (Array.isArray(child.material)) {
      const validMats = child.material.filter(Boolean) as THREE.Material[];
      if (validMats.length === 0) return;
      if (validMats.length === 1) {
        mat = validMats[0];
      } else {
        const fallbackMat = validMats[0];
        mat = child.material.map((m: THREE.Material | null | undefined) => m || fallbackMat);
      }
    } else {
      mat = child.material as THREE.Material;
    }
    if (!mat) return;
    const localMatrix = new THREE.Matrix4().multiplyMatrices(rootInv, child.matrixWorld);
    parts.push({
      geometry: child.geometry as THREE.BufferGeometry,
      material: mat,
      localMatrix,
      tintSlot: typeof child.userData?.tintSlot === 'string' ? child.userData.tintSlot : undefined,
    });
  });

  return parts;
}

function InstancedPartMesh({
  part,
  instances,
  castShadow,
  receiveShadow,
}: {
  part: ExtractedMeshPart;
  instances: InstancedTransformItem[];
  castShadow: boolean;
  receiveShadow: boolean;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = instances.length;

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || count === 0) return;

    const usesTint = Boolean(part.tintSlot);

    for (let i = 0; i < count; i++) {
      const item = instances[i];
      tempPos.set(item.position[0], item.position[1], item.position[2]);
      const rot = item.rotation || [0, 0, 0];
      tempEuler.set(rot[0], rot[1], rot[2], 'XYZ');
      tempQuat.setFromEuler(tempEuler);

      if (typeof item.scale === 'number') {
        tempScale.set(item.scale, item.scale, item.scale);
      } else if (Array.isArray(item.scale)) {
        tempScale.set(item.scale[0], item.scale[1], item.scale[2]);
      } else {
        tempScale.set(1, 1, 1);
      }

      tempInstanceMatrix.compose(tempPos, tempQuat, tempScale);
      tempFinalMatrix.multiplyMatrices(tempInstanceMatrix, part.localMatrix);
      mesh.setMatrixAt(i, tempFinalMatrix);

      if (usesTint && part.tintSlot) {
        const hex = item.tintColors?.[part.tintSlot] || '#ffffff';
        tempColor.set(hex);
        mesh.setColorAt(i, tempColor);
      }
    }

    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    mesh.instanceMatrix.needsUpdate = true;
    if (usesTint && mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
    mesh.computeBoundingBox();
    mesh.computeBoundingSphere();
  }, [part, instances, count]);

  if (count === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[part.geometry, part.material, count]}
      frustumCulled={true}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
    />
  );
}

/**
 * Renderiza N transformaciones de un modelo THREE.Group (GLB optimizado o perfil low-poly)
 * mediante un único InstancedMesh por cada submalla/material del template.
 */
export function InstancedGlbGroup({
  template,
  instances,
  castShadow = false,
  receiveShadow = false,
}: {
  template: THREE.Group | null;
  instances: InstancedTransformItem[];
  castShadow?: boolean;
  receiveShadow?: boolean;
}) {
  const parts = useMemo(() => {
    if (!template) return [];
    return extractPartsFromGroup(template);
  }, [template]);

  if (!template || parts.length === 0 || instances.length === 0) {
    return null;
  }

  return (
    <>
      {parts.map((part, idx) => {
        const matKey = Array.isArray(part.material)
          ? part.material.map((m) => m.uuid).join('-')
          : part.material.uuid;
        return (
          <InstancedPartMesh
            key={`${part.geometry.uuid}_${matKey}_${idx}`}
            part={part}
            instances={instances}
            castShadow={castShadow}
            receiveShadow={receiveShadow}
          />
        );
      })}
    </>
  );
}
