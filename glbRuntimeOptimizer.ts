import * as THREE from 'three';

export type GlbOptimizationProfile = 'HERO_BUILDING' | 'HOUSE' | 'FLOOR' | 'PROP' | 'BOARD';

export interface OptimizeGlbOptions {
  preserveRig?: boolean;
  preoptimizedMobile?: boolean;
}

export function isPreoptimizedMobileGlbUrl(url: string): boolean {
  return typeof url === 'string' && /_mobile\.glb(\?|$)/i.test(url);
}

export function resolveMobileGlbUrls(urls: string[]): string[] {
  const normalized = Array.isArray(urls) ? urls.filter(Boolean) : [];
  if (!isMobileOptimizationTarget()) {
    return normalized;
  }
  const mobileVariants: string[] = [];
  for (const url of normalized) {
    if (/_mobile\.glb($|\?)/i.test(url)) {
      mobileVariants.push(url);
    } else if (/\.glb($|\?)/i.test(url)) {
      mobileVariants.push(url.replace(/\.glb($|\?)/i, '_mobile.glb$1'));
    }
  }
  return Array.from(new Set(mobileVariants));
}

interface ProfileBudget {
  maxTriangles: number;
  maxMaterials: number;
  maxTextureSize: number;
  maxSecondaryTextureSize: number;
  stripSecondaryMaps: boolean;
  preserveNormalMap: boolean;
  allowShadows: boolean;
}

export function isMobileOptimizationTarget(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
    return true;
  }
  if (
    navigator.maxTouchPoints > 1 &&
    typeof window !== 'undefined' &&
    Math.min(window.screen?.width || 9999, window.screen?.height || 9999) <= 900
  ) {
    return true;
  }
  return false;
}

function getProfileBudget(profile: GlbOptimizationProfile, isMobile: boolean): ProfileBudget {
  switch (profile) {
    case 'HERO_BUILDING':
      return isMobile
        ? {
            maxTriangles: 26000,
            maxMaterials: 4,
            maxTextureSize: 512,
            maxSecondaryTextureSize: 256,
            stripSecondaryMaps: true,
            preserveNormalMap: false,
            allowShadows: false,
          }
        : {
            maxTriangles: 29000,
            maxMaterials: 4,
            maxTextureSize: 1024,
            maxSecondaryTextureSize: 512,
            stripSecondaryMaps: false,
            preserveNormalMap: true,
            allowShadows: true,
          };

    case 'BOARD':
      return isMobile
        ? {
            maxTriangles: 42000,
            maxMaterials: 6,
            maxTextureSize: 512,
            maxSecondaryTextureSize: 256,
            stripSecondaryMaps: true,
            preserveNormalMap: true,
            allowShadows: false,
          }
        : {
            maxTriangles: 85000,
            maxMaterials: 12,
            maxTextureSize: 1024,
            maxSecondaryTextureSize: 512,
            stripSecondaryMaps: false,
            preserveNormalMap: true,
            allowShadows: true,
          };

    case 'HOUSE':
      return isMobile
        ? {
            maxTriangles: 8000,
            maxMaterials: 2,
            maxTextureSize: 256,
            maxSecondaryTextureSize: 256,
            stripSecondaryMaps: true,
            preserveNormalMap: false,
            allowShadows: false,
          }
        : {
            maxTriangles: 16000,
            maxMaterials: 3,
            maxTextureSize: 512,
            maxSecondaryTextureSize: 512,
            stripSecondaryMaps: false,
            preserveNormalMap: true,
            allowShadows: true,
          };

    case 'FLOOR':
      return isMobile
        ? {
            maxTriangles: 4000,
            maxMaterials: 2,
            maxTextureSize: 512,
            maxSecondaryTextureSize: 256,
            stripSecondaryMaps: true,
            preserveNormalMap: false,
            allowShadows: false,
          }
        : {
            maxTriangles: 8000,
            maxMaterials: 2,
            maxTextureSize: 512,
            maxSecondaryTextureSize: 512,
            stripSecondaryMaps: false,
            preserveNormalMap: true,
            allowShadows: true,
          };

    case 'PROP':
    default:
      return isMobile
        ? {
            maxTriangles: 4000,
            maxMaterials: 2,
            maxTextureSize: 256,
            maxSecondaryTextureSize: 256,
            stripSecondaryMaps: true,
            preserveNormalMap: false,
            allowShadows: false,
          }
        : {
            maxTriangles: 8000,
            maxMaterials: 2,
            maxTextureSize: 512,
            maxSecondaryTextureSize: 256,
            stripSecondaryMaps: false,
            preserveNormalMap: true,
            allowShadows: true,
          };
  }
}

function getEffectiveBudget(
  profile: GlbOptimizationProfile,
  isMobile: boolean,
  options?: OptimizeGlbOptions
): ProfileBudget {
  const base = getProfileBudget(profile, isMobile);
  if (isMobile && options?.preoptimizedMobile) {
    return {
      ...base,
      maxTriangles: profile === 'BOARD' ? Math.max(base.maxTriangles, 42000) : Math.max(base.maxTriangles, 26000),
      maxMaterials: profile === 'BOARD' ? Math.max(base.maxMaterials, 6) : Math.max(base.maxMaterials, 4),
      maxTextureSize: Math.max(base.maxTextureSize, 512),
    };
  }
  return base;
}

function tryFastPathPreoptimizedMobile(
  rootScene: THREE.Group,
  budget: ProfileBudget,
  isMobile: boolean,
  options?: OptimizeGlbOptions
): THREE.Group | null {
  if (!isMobile || !options?.preoptimizedMobile) return null;

  let totalTris = 0;
  let maxTexDim = 0;
  let hasSkinnedOrMorph = false;
  const uniqueMats = new Set<THREE.Material>();
  const matSigMap = new Map<string, THREE.Material>();

  rootScene.traverse((child: any) => {
    if (!child.isMesh || !child.geometry || !child.material) return;
    if (
      child.isSkinnedMesh ||
      (Array.isArray(child.morphTargetInfluences) && child.morphTargetInfluences.length > 0)
    ) {
      hasSkinnedOrMorph = true;
      return;
    }

    totalTris += getTriangleCount(child.geometry);

    const mats = Array.isArray(child.material) ? child.material : [child.material];
    for (const mat of mats) {
      if (!mat) continue;
      uniqueMats.add(mat);
      const m = mat as any;
      for (const texKey of ['map', 'emissiveMap', 'alphaMap']) {
        const tex = m[texKey];
        if (tex && tex.image) {
          const { width, height } = getImageDimensions(tex.image);
          maxTexDim = Math.max(maxTexDim, width, height);
        }
      }
    }
  });

  if (
    hasSkinnedOrMorph ||
    totalTris > budget.maxTriangles * 1.15 ||
    uniqueMats.size > budget.maxMaterials ||
    maxTexDim > budget.maxTextureSize
  ) {
    return null;
  }

  rootScene.traverse((child: any) => {
    if (!child.isMesh || !child.geometry || !child.material) return;
    child.castShadow = budget.allowShadows;
    child.receiveShadow = budget.allowShadows;
    stripUnusedAttributes(child.geometry, false);

    const mats = Array.isArray(child.material) ? child.material : [child.material];
    const nextMats = mats.map((mat: THREE.Material) => {
      if (!mat) return mat;
      const sig = buildMaterialSignature(mat);
      const dedup = matSigMap.get(sig);
      if (dedup) return dedup;
      optimizeMaterialTextures(mat, budget, isMobile);
      matSigMap.set(sig, mat);
      return mat;
    });
    child.material = Array.isArray(child.material) ? nextMats : nextMats[0];
  });

  return rootScene;
}

function yieldToMainThread(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function getImageDimensions(image: any): { width: number; height: number } {
  if (!image) return { width: 0, height: 0 };
  const width = Number(image.naturalWidth || image.videoWidth || image.width || 0);
  const height = Number(image.naturalHeight || image.videoHeight || image.height || 0);
  return { width, height };
}

function downscaleTextureInPlace(
  tex: THREE.Texture | null | undefined,
  maxDim: number,
  isColorMap: boolean,
  isMobile: boolean
): void {
  if (!tex || !tex.image) return;
  if (tex.userData?.__glbOptimizedMaxDim && tex.userData.__glbOptimizedMaxDim <= maxDim) {
    return;
  }

  const { width, height } = getImageDimensions(tex.image);
  if (width > 0 && height > 0 && Math.max(width, height) > maxDim && typeof document !== 'undefined') {
    const scale = maxDim / Math.max(width, height);
    const targetW = Math.max(4, Math.round(width * scale));
    const targetH = Math.max(4, Math.round(height * scale));

    try {
      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = isMobile ? 'medium' : 'high';
        ctx.drawImage(tex.image, 0, 0, targetW, targetH);

        const prevImage = tex.image;
        tex.image = canvas;
        if (typeof ImageBitmap !== 'undefined' && prevImage instanceof ImageBitmap) {
          try {
            prevImage.close();
          } catch (_) {}
        }
      }
    } catch (_) {}
  }

  if (isColorMap) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = isMobile ? 1 : Math.min(2, tex.anisotropy || 1);
  tex.userData = tex.userData || {};
  tex.userData.__glbOptimizedMaxDim = maxDim;
  tex.needsUpdate = true;
}

const SECONDARY_MAP_KEYS = [
  'normalMap',
  'bumpMap',
  'displacementMap',
  'aoMap',
  'roughnessMap',
  'metalnessMap',
  'specularMap',
  'lightMap',
  'envMap',
] as const;

function optimizeMaterialTextures(
  mat: THREE.Material,
  budget: ProfileBudget,
  isMobile: boolean
): void {
  const m = mat as any;
  m.depthWrite = m.transparent ? Boolean(m.depthWrite) : true;

  if (m.map) {
    downscaleTextureInPlace(m.map, budget.maxTextureSize, true, isMobile);
  }
  if (m.emissiveMap) {
    downscaleTextureInPlace(m.emissiveMap, budget.maxSecondaryTextureSize, true, isMobile);
  }
  if (m.alphaMap) {
    downscaleTextureInPlace(m.alphaMap, budget.maxSecondaryTextureSize, false, isMobile);
  }

  if (budget.stripSecondaryMaps) {
    let hadRoughMetalMap = false;
    for (const key of SECONDARY_MAP_KEYS) {
      const tex = m[key] as THREE.Texture | null | undefined;
      if (!tex) continue;

      if (key === 'normalMap' && budget.preserveNormalMap) {
        downscaleTextureInPlace(tex, budget.maxSecondaryTextureSize, false, isMobile);
        continue;
      }

      if (key === 'roughnessMap' || key === 'metalnessMap') {
        hadRoughMetalMap = true;
      }
      try {
        if (typeof ImageBitmap !== 'undefined' && tex.image instanceof ImageBitmap) {
          tex.image.close();
        }
        tex.dispose();
      } catch (_) {}
      m[key] = null;
    }

    if (hadRoughMetalMap) {
      if (typeof m.roughness === 'number') {
        m.roughness = Math.max(0.55, Math.min(0.85, m.roughness));
      }
      if (typeof m.metalness === 'number') {
        m.metalness = Math.min(0.12, m.metalness);
      }
    } else if (typeof m.metalness === 'number' && !m.envMap) {
      m.metalness = Math.min(0.22, m.metalness);
    }
  } else {
    for (const key of SECONDARY_MAP_KEYS) {
      const tex = m[key] as THREE.Texture | null | undefined;
      if (tex) {
        downscaleTextureInPlace(tex, budget.maxSecondaryTextureSize, false, isMobile);
      }
    }
    if (typeof m.metalness === 'number' && !m.metalnessMap && !m.envMap) {
      m.metalness = Math.min(0.28, m.metalness);
    }
  }

  m.needsUpdate = true;
}

function getTriangleCount(geometry: THREE.BufferGeometry): number {
  const idx = geometry.getIndex();
  if (idx) return Math.floor(idx.count / 3);
  const pos = geometry.getAttribute('position');
  return pos ? Math.floor(pos.count / 3) : 0;
}

function stripUnusedAttributes(geometry: THREE.BufferGeometry, keepSkin = false): void {
  const toDelete = ['tangent', 'uv1', 'uv2', 'uv3', '_tangent'];
  if (!keepSkin) {
    toDelete.push('skinIndex', 'skinWeight', 'joints', 'weights');
  }
  for (const attr of toDelete) {
    if (geometry.getAttribute(attr)) {
      geometry.deleteAttribute(attr);
    }
  }
  if (geometry.morphAttributes && Object.keys(geometry.morphAttributes).length > 0) {
    geometry.morphAttributes = {};
  }
}

function reverseTriangleWinding(geometry: THREE.BufferGeometry): void {
  const idx = geometry.getIndex();
  if (idx) {
    const arr = idx.array as Uint16Array | Uint32Array;
    for (let i = 0; i + 2 < arr.length; i += 3) {
      const tmp = arr[i + 1];
      arr[i + 1] = arr[i + 2];
      arr[i + 2] = tmp;
    }
    idx.needsUpdate = true;
    return;
  }

  const attrNames = Object.keys(geometry.attributes);
  const pos = geometry.getAttribute('position');
  if (!pos) return;
  const count = pos.count;
  for (const name of attrNames) {
    const attr = geometry.getAttribute(name);
    if (!attr || !('itemSize' in attr)) continue;
    const itemSize = attr.itemSize;
    for (let i = 0; i + 2 < count; i += 3) {
      for (let k = 0; k < itemSize; k++) {
        const idx1 = (i + 1) * itemSize + k;
        const idx2 = (i + 2) * itemSize + k;
        const tmp = attr.array[idx1];
        (attr.array as Float32Array)[idx1] = attr.array[idx2];
        (attr.array as Float32Array)[idx2] = tmp;
      }
    }
    attr.needsUpdate = true;
  }
}

const tempBakeVec = new THREE.Vector3();

function bakeSkinOrMorphIntoGeometry(
  child: any,
  srcGeom: THREE.BufferGeometry,
  preserveRig: boolean
): THREE.BufferGeometry {
  const cloned = srcGeom.clone();

  // 1. Hornear morph targets activos si existen
  const influences: number[] | undefined = child.morphTargetInfluences;
  const morphPositions: THREE.BufferAttribute[] | undefined = srcGeom.morphAttributes?.position as
    | THREE.BufferAttribute[]
    | undefined;

  if (
    !preserveRig &&
    Array.isArray(influences) &&
    influences.length > 0 &&
    Array.isArray(morphPositions) &&
    morphPositions.length > 0
  ) {
    const pos = cloned.getAttribute('position') as THREE.BufferAttribute;
    if (pos) {
      const vCount = pos.count;
      const outPos = new Float32Array(vCount * 3);
      for (let i = 0; i < vCount; i++) {
        let x = pos.getX(i);
        let y = pos.getY(i);
        let z = pos.getZ(i);
        for (let m = 0; m < morphPositions.length; m++) {
          const w = influences[m] || 0;
          if (Math.abs(w) > 1e-4 && morphPositions[m]) {
            x += morphPositions[m].getX(i) * w;
            y += morphPositions[m].getY(i) * w;
            z += morphPositions[m].getZ(i) * w;
          }
        }
        outPos[i * 3] = x;
        outPos[i * 3 + 1] = y;
        outPos[i * 3 + 2] = z;
      }
      cloned.setAttribute('position', new THREE.Float32BufferAttribute(outPos, 3));
    }
    cloned.morphAttributes = {};
  }

  // 2. Hornear SkinnedMesh estático si es parte de un edificio/prop/escenario estático
  if (!preserveRig && child.isSkinnedMesh) {
    try {
      child.skeleton?.update?.();
    } catch (_) {}
    if (
      typeof child.applyBoneTransform === 'function' &&
      cloned.getAttribute('skinIndex') &&
      cloned.getAttribute('skinWeight')
    ) {
      const pos = cloned.getAttribute('position') as THREE.BufferAttribute;
      if (pos) {
        const vCount = pos.count;
        const outPos = new Float32Array(vCount * 3);
        for (let i = 0; i < vCount; i++) {
          tempBakeVec.set(pos.getX(i), pos.getY(i), pos.getZ(i));
          child.applyBoneTransform(i, tempBakeVec);
          outPos[i * 3] = tempBakeVec.x;
          outPos[i * 3 + 1] = tempBakeVec.y;
          outPos[i * 3 + 2] = tempBakeVec.z;
        }
        cloned.setAttribute('position', new THREE.Float32BufferAttribute(outPos, 3));
      }
    }
  }

  return cloned;
}

function extractGroupSubGeometry(
  sourceGeom: THREE.BufferGeometry,
  start: number,
  count: number
): THREE.BufferGeometry {
  const out = new THREE.BufferGeometry();
  const srcIdx = sourceGeom.getIndex();
  const srcPos = sourceGeom.getAttribute('position');
  if (!srcPos) return out;

  const srcNorm = sourceGeom.getAttribute('normal');
  const srcUv = sourceGeom.getAttribute('uv');
  const srcColor = sourceGeom.getAttribute('color');

  const vertexMap = new Map<number, number>();
  const end = start + count;
  const newIndices = new Uint32Array(count);
  let newIdxLen = 0;

  const estVerts = Math.min(srcPos.count, count);
  let positions = new Float32Array(estVerts * 3);
  let normals = srcNorm ? new Float32Array(estVerts * 3) : null;
  let uvs = srcUv ? new Float32Array(estVerts * 2) : null;
  let colors = srcColor ? new Float32Array(estVerts * 3) : null;
  let cap = estVerts;
  let vLen = 0;

  const ensureCap = () => {
    if (vLen < cap) return;
    const nextCap = cap * 2;
    const grow = (arr: Float32Array | null, stride: number) => {
      if (!arr) return null;
      const next = new Float32Array(nextCap * stride);
      next.set(arr);
      return next;
    };
    positions = grow(positions, 3)!;
    normals = grow(normals, 3);
    uvs = grow(uvs, 2);
    colors = grow(colors, 3);
    cap = nextCap;
  };

  for (let i = start; i < end; i++) {
    const origVertIdx = srcIdx ? srcIdx.getX(i) : i;
    if (origVertIdx >= srcPos.count) continue;
    let mapped = vertexMap.get(origVertIdx);
    if (mapped === undefined) {
      ensureCap();
      mapped = vLen++;
      vertexMap.set(origVertIdx, mapped);
      positions[mapped * 3] = srcPos.getX(origVertIdx);
      positions[mapped * 3 + 1] = srcPos.getY(origVertIdx);
      positions[mapped * 3 + 2] = srcPos.getZ(origVertIdx);
      if (normals && srcNorm) {
        normals[mapped * 3] = srcNorm.getX(origVertIdx);
        normals[mapped * 3 + 1] = srcNorm.getY(origVertIdx);
        normals[mapped * 3 + 2] = srcNorm.getZ(origVertIdx);
      }
      if (uvs && srcUv) {
        uvs[mapped * 2] = srcUv.getX(origVertIdx);
        uvs[mapped * 2 + 1] = srcUv.getY(origVertIdx);
      }
      if (colors && srcColor) {
        colors[mapped * 3] = srcColor.getX(origVertIdx);
        colors[mapped * 3 + 1] = srcColor.getY(origVertIdx);
        colors[mapped * 3 + 2] = srcColor.getZ(origVertIdx);
      }
    }
    newIndices[newIdxLen++] = mapped;
  }

  out.setAttribute('position', new THREE.BufferAttribute(positions.slice(0, vLen * 3), 3));
  if (normals) {
    out.setAttribute('normal', new THREE.BufferAttribute(normals.slice(0, vLen * 3), 3));
  } else {
    out.computeVertexNormals();
  }
  if (uvs) {
    out.setAttribute('uv', new THREE.BufferAttribute(uvs.slice(0, vLen * 2), 2));
  }
  if (colors) {
    out.setAttribute('color', new THREE.BufferAttribute(colors.slice(0, vLen * 3), 3));
  }

  const slicedIdx = newIndices.subarray(0, newIdxLen);
  const indexArray = vLen <= 65535 ? new Uint16Array(slicedIdx) : new Uint32Array(slicedIdx);
  out.setIndex(new THREE.BufferAttribute(indexArray, 1));
  return out;
}

function nextPowerOf2(n: number): number {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

interface RawGeometryArrays {
  pos: Float32Array;
  norm: Float32Array | null;
  uv: Float32Array | null;
  color: Float32Array | null;
  skinIndex: Float32Array | null;
  skinWeight: Float32Array | null;
  index: Uint16Array | Uint32Array | null;
}

function extractContiguousFloat32(
  attr: THREE.BufferAttribute | THREE.InterleavedBufferAttribute | undefined,
  itemSize: number
): Float32Array | null {
  if (!attr) return null;
  const count = attr.count;
  if (
    !(attr as any).isInterleavedBufferAttribute &&
    attr.array instanceof Float32Array &&
    attr.array.length === count * itemSize
  ) {
    return new Float32Array(attr.array);
  }
  const out = new Float32Array(count * itemSize);
  for (let i = 0; i < count; i++) {
    out[i * itemSize] = attr.getX(i);
    if (itemSize >= 2) out[i * itemSize + 1] = attr.getY(i);
    if (itemSize >= 3) out[i * itemSize + 2] = attr.getZ(i);
    if (itemSize >= 4) out[i * itemSize + 3] = attr.getW(i);
  }
  return out;
}

function geometryToRawArrays(geometry: THREE.BufferGeometry): RawGeometryArrays | null {
  const posAttr = geometry.getAttribute('position');
  if (!posAttr || posAttr.count === 0) return null;

  const pos = extractContiguousFloat32(posAttr as any, 3);
  if (!pos) return null;

  const norm = extractContiguousFloat32(geometry.getAttribute('normal') as any, 3);
  const uv = extractContiguousFloat32(geometry.getAttribute('uv') as any, 2);
  const color = extractContiguousFloat32(geometry.getAttribute('color') as any, 3);
  const skinIndex = extractContiguousFloat32(geometry.getAttribute('skinIndex') as any, 4);
  const skinWeight = extractContiguousFloat32(geometry.getAttribute('skinWeight') as any, 4);

  const srcIdx = geometry.getIndex();
  let index: Uint16Array | Uint32Array | null = null;
  if (srcIdx) {
    if (srcIdx.array instanceof Uint16Array) {
      index = new Uint16Array(srcIdx.array);
    } else if (srcIdx.array instanceof Uint32Array) {
      index = new Uint32Array(srcIdx.array);
    } else {
      const len = srcIdx.count;
      const arr = new Uint32Array(len);
      for (let i = 0; i < len; i++) arr[i] = srcIdx.getX(i);
      index = arr;
    }
  }

  return { pos, norm, uv, color, skinIndex, skinWeight, index };
}

function rawArraysToGeometry(raw: RawGeometryArrays): THREE.BufferGeometry {
  const result = new THREE.BufferGeometry();
  result.setAttribute('position', new THREE.BufferAttribute(raw.pos, 3));
  if (raw.norm) {
    result.setAttribute('normal', new THREE.BufferAttribute(raw.norm, 3));
  } else {
    result.computeVertexNormals();
  }
  if (raw.uv) {
    result.setAttribute('uv', new THREE.BufferAttribute(raw.uv, 2));
  }
  if (raw.color) {
    result.setAttribute('color', new THREE.BufferAttribute(raw.color, 3));
  }
  if (raw.skinIndex) {
    result.setAttribute('skinIndex', new THREE.BufferAttribute(raw.skinIndex, 4));
  }
  if (raw.skinWeight) {
    result.setAttribute('skinWeight', new THREE.BufferAttribute(raw.skinWeight, 4));
  }
  if (raw.index) {
    result.setIndex(new THREE.BufferAttribute(raw.index, 1));
  }
  return result;
}

/**
 * Núcleo puro sobre TypedArrays para Spatial Vertex Clustering (ejecutable tanto en Web Worker
 * como de forma troceada asíncrona en el hilo principal):
 * - Usa Float32Array relativo a bounds.min y Uint32Array predimensionado (sin number[] ni Float64Array).
 */
function runClusteringOnRawArraysSync(
  src: RawGeometryArrays,
  gridDivs: number,
  bounds: { minX: number; minY: number; minZ: number; maxDim: number }
): { result: RawGeometryArrays; triCount: number } {
  const vCount = Math.floor(src.pos.length / 3);
  const srcIndex = src.index;
  const triCount = srcIndex ? Math.floor(srcIndex.length / 3) : Math.floor(vCount / 3);
  if (triCount === 0 || vCount === 0) return { result: src, triCount };

  const clampedGrid = Math.max(6, Math.min(1020, Math.floor(gridDivs)));
  const invCellSize = clampedGrid / Math.max(bounds.maxDim, 1e-5);
  const maxCoord = clampedGrid;

  let clusterCap = Math.max(256, Math.min(vCount, Math.min(triCount, clampedGrid * clampedGrid * 4)));
  let hashSize = nextPowerOf2(Math.min(clusterCap * 2, 1 << 20));
  let hashPosKeys = new Int32Array(hashSize).fill(-1);
  let hashSeamKeys = new Int32Array(hashSize).fill(0);
  let hashVals = new Int32Array(hashSize).fill(-1);

  let sumX = new Float32Array(clusterCap);
  let sumY = new Float32Array(clusterCap);
  let sumZ = new Float32Array(clusterCap);
  let counts = new Uint32Array(clusterCap);
  let sumNX = src.norm ? new Float32Array(clusterCap) : null;
  let sumNY = src.norm ? new Float32Array(clusterCap) : null;
  let sumNZ = src.norm ? new Float32Array(clusterCap) : null;
  let sumU = src.uv ? new Float32Array(clusterCap) : null;
  let sumV = src.uv ? new Float32Array(clusterCap) : null;
  let sumR = src.color ? new Float32Array(clusterCap) : null;
  let sumG = src.color ? new Float32Array(clusterCap) : null;
  let sumB = src.color ? new Float32Array(clusterCap) : null;
  let firstSkinIdx = src.skinIndex ? new Float32Array(clusterCap * 4) : null;
  let firstSkinWt = src.skinWeight ? new Float32Array(clusterCap * 4) : null;

  let clusterCount = 0;

  const growArrays = () => {
    const nextCap = clusterCap * 2;
    const growF32 = (a: Float32Array | null, stride = 1) => {
      if (!a) return null;
      const b = new Float32Array(nextCap * stride);
      b.set(a);
      return b;
    };
    const growU32 = (a: Uint32Array) => {
      const b = new Uint32Array(nextCap);
      b.set(a);
      return b;
    };

    sumX = growF32(sumX)!;
    sumY = growF32(sumY)!;
    sumZ = growF32(sumZ)!;
    counts = growU32(counts);
    sumNX = growF32(sumNX);
    sumNY = growF32(sumNY);
    sumNZ = growF32(sumNZ);
    sumU = growF32(sumU);
    sumV = growF32(sumV);
    sumR = growF32(sumR);
    sumG = growF32(sumG);
    sumB = growF32(sumB);
    firstSkinIdx = growF32(firstSkinIdx, 4);
    firstSkinWt = growF32(firstSkinWt, 4);
    clusterCap = nextCap;
  };

  const rehash = () => {
    const newSize = hashSize * 2;
    const newPosKeys = new Int32Array(newSize).fill(-1);
    const newSeamKeys = new Int32Array(newSize).fill(0);
    const newVals = new Int32Array(newSize).fill(-1);
    const mask = newSize - 1;
    for (let i = 0; i < hashSize; i++) {
      const pk = hashPosKeys[i];
      if (pk !== -1) {
        const sk = hashSeamKeys[i];
        let slot = ((Math.imul(pk, 2654435761) ^ Math.imul(sk, 2246822519)) >>> 0) & mask;
        while (newPosKeys[slot] !== -1) {
          slot = (slot + 1) & mask;
        }
        newPosKeys[slot] = pk;
        newSeamKeys[slot] = sk;
        newVals[slot] = hashVals[i];
      }
    }
    hashSize = newSize;
    hashPosKeys = newPosKeys;
    hashSeamKeys = newSeamKeys;
    hashVals = newVals;
  };

  const vertexToCluster = new Int32Array(vCount);
  const { minX, minY, minZ } = bounds;
  const pos = src.pos;
  const norm = src.norm;
  const uv = src.uv;
  const color = src.color;

  for (let v = 0; v < vCount; v++) {
    const v3 = v * 3;
    const dx = pos[v3] - minX;
    const dy = pos[v3 + 1] - minY;
    const dz = pos[v3 + 2] - minZ;

    const gx = Math.min(maxCoord, Math.max(0, Math.floor(dx * invCellSize)));
    const gy = Math.min(maxCoord, Math.max(0, Math.floor(dy * invCellSize)));
    const gz = Math.min(maxCoord, Math.max(0, Math.floor(dz * invCellSize)));
    const posKey = (gx << 20) | (gy << 10) | gz;

    let seamKey = 0;
    if (norm) {
      const nqx = Math.max(0, Math.min(4, Math.round(norm[v3] * 1.4) + 2));
      const nqy = Math.max(0, Math.min(4, Math.round(norm[v3 + 1] * 1.4) + 2));
      const nqz = Math.max(0, Math.min(4, Math.round(norm[v3 + 2] * 1.4) + 2));
      seamKey |= (nqx << 16) | (nqy << 12) | (nqz << 8);
    }
    if (uv) {
      const v2 = v * 2;
      const uq = Math.floor(uv[v2] * 8) & 15;
      const vq = Math.floor(uv[v2 + 1] * 8) & 15;
      seamKey |= (uq << 4) | vq;
    }

    if (clusterCount * 2 >= hashSize) {
      rehash();
    }

    const mask = hashSize - 1;
    let slot = ((Math.imul(posKey, 2654435761) ^ Math.imul(seamKey, 2246822519)) >>> 0) & mask;
    let cid = -1;
    while (true) {
      const existingPos = hashPosKeys[slot];
      if (existingPos === posKey && hashSeamKeys[slot] === seamKey) {
        cid = hashVals[slot];
        break;
      }
      if (existingPos === -1) {
        cid = clusterCount++;
        if (cid >= clusterCap) {
          growArrays();
        }
        hashPosKeys[slot] = posKey;
        hashSeamKeys[slot] = seamKey;
        hashVals[slot] = cid;
        if (firstSkinIdx && src.skinIndex) {
          const s4 = cid * 4;
          const vs4 = v * 4;
          firstSkinIdx[s4] = src.skinIndex[vs4];
          firstSkinIdx[s4 + 1] = src.skinIndex[vs4 + 1];
          firstSkinIdx[s4 + 2] = src.skinIndex[vs4 + 2];
          firstSkinIdx[s4 + 3] = src.skinIndex[vs4 + 3];
        }
        if (firstSkinWt && src.skinWeight) {
          const s4 = cid * 4;
          const vs4 = v * 4;
          firstSkinWt[s4] = src.skinWeight[vs4];
          firstSkinWt[s4 + 1] = src.skinWeight[vs4 + 1];
          firstSkinWt[s4 + 2] = src.skinWeight[vs4 + 2];
          firstSkinWt[s4 + 3] = src.skinWeight[vs4 + 3];
        }
        break;
      }
      slot = (slot + 1) & mask;
    }

    vertexToCluster[v] = cid;
    sumX[cid] += dx;
    sumY[cid] += dy;
    sumZ[cid] += dz;
    counts[cid] += 1;

    if (sumNX && sumNY && sumNZ && norm) {
      sumNX[cid] += norm[v3];
      sumNY[cid] += norm[v3 + 1];
      sumNZ[cid] += norm[v3 + 2];
    }
    if (sumU && sumV && uv) {
      const v2 = v * 2;
      sumU[cid] += uv[v2];
      sumV[cid] += uv[v2 + 1];
    }
    if (sumR && sumG && sumB && color) {
      sumR[cid] += color[v3];
      sumG[cid] += color[v3 + 1];
      sumB[cid] += color[v3 + 2];
    }
  }

  const usedRemap = new Int32Array(clusterCount).fill(-1);
  let usedCount = 0;

  const triHashSize = nextPowerOf2(Math.max(1024, Math.min(triCount * 2, 1 << 20)));
  const triSeenA = new Int32Array(triHashSize).fill(-1);
  const triSeenB = new Int32Array(triHashSize);
  const triSeenC = new Int32Array(triHashSize);
  const triMask = triHashSize - 1;

  const outIndices = new Uint32Array(triCount * 3);
  let outIdxLen = 0;

  for (let t = 0; t < triCount; t++) {
    const t3 = t * 3;
    const i0 = srcIndex ? srcIndex[t3] : t3;
    const i1 = srcIndex ? srcIndex[t3 + 1] : t3 + 1;
    const i2 = srcIndex ? srcIndex[t3 + 2] : t3 + 2;
    if (i0 >= vCount || i1 >= vCount || i2 >= vCount) continue;

    const c0 = vertexToCluster[i0];
    const c1 = vertexToCluster[i1];
    const c2 = vertexToCluster[i2];
    if (c0 === c1 || c1 === c2 || c2 === c0) continue;

    let a = c0;
    let b = c1;
    let c = c2;
    if (c1 < c0 && c1 < c2) {
      a = c1;
      b = c2;
      c = c0;
    } else if (c2 < c0 && c2 < c1) {
      a = c2;
      b = c0;
      c = c1;
    }

    let h = ((Math.imul(a, 73856093) ^ Math.imul(b, 19349663) ^ Math.imul(c, 83492791)) >>> 0) & triMask;
    let isDup = false;
    let probes = 0;
    while (triSeenA[h] !== -1 && probes < 16) {
      if (triSeenA[h] === a && triSeenB[h] === b && triSeenC[h] === c) {
        isDup = true;
        break;
      }
      h = (h + 1) & triMask;
      probes++;
    }
    if (isDup) continue;
    if (triSeenA[h] === -1) {
      triSeenA[h] = a;
      triSeenB[h] = b;
      triSeenC[h] = c;
    }

    if (usedRemap[c0] === -1) usedRemap[c0] = usedCount++;
    if (usedRemap[c1] === -1) usedRemap[c1] = usedCount++;
    if (usedRemap[c2] === -1) usedRemap[c2] = usedCount++;

    outIndices[outIdxLen++] = usedRemap[c0];
    outIndices[outIdxLen++] = usedRemap[c1];
    outIndices[outIdxLen++] = usedRemap[c2];
  }

  if (outIdxLen < 3 || usedCount === 0) {
    return { result: src, triCount };
  }

  const outPos = new Float32Array(usedCount * 3);
  const outNorm = sumNX ? new Float32Array(usedCount * 3) : null;
  const outUv = sumU ? new Float32Array(usedCount * 2) : null;
  const outColor = sumR ? new Float32Array(usedCount * 3) : null;
  const outSkinIdx = firstSkinIdx ? new Float32Array(usedCount * 4) : null;
  const outSkinWt = firstSkinWt ? new Float32Array(usedCount * 4) : null;

  for (let cid = 0; cid < clusterCount; cid++) {
    const dst = usedRemap[cid];
    if (dst === -1) continue;
    const invN = 1 / Math.max(1, counts[cid]);
    const d3 = dst * 3;
    outPos[d3] = minX + sumX[cid] * invN;
    outPos[d3 + 1] = minY + sumY[cid] * invN;
    outPos[d3 + 2] = minZ + sumZ[cid] * invN;

    if (outNorm && sumNX && sumNY && sumNZ) {
      const nx = sumNX[cid];
      const ny = sumNY[cid];
      const nz = sumNZ[cid];
      const nLen = Math.hypot(nx, ny, nz);
      if (nLen > 1e-5) {
        outNorm[d3] = nx / nLen;
        outNorm[d3 + 1] = ny / nLen;
        outNorm[d3 + 2] = nz / nLen;
      } else {
        outNorm[d3 + 1] = 1;
      }
    }

    if (outUv && sumU && sumV) {
      const d2 = dst * 2;
      outUv[d2] = sumU[cid] * invN;
      outUv[d2 + 1] = sumV[cid] * invN;
    }

    if (outColor && sumR && sumG && sumB) {
      outColor[d3] = Math.min(1, sumR[cid] * invN);
      outColor[d3 + 1] = Math.min(1, sumG[cid] * invN);
      outColor[d3 + 2] = Math.min(1, sumB[cid] * invN);
    }

    if (outSkinIdx && firstSkinIdx) {
      const d4 = dst * 4;
      const c4 = cid * 4;
      outSkinIdx[d4] = firstSkinIdx[c4];
      outSkinIdx[d4 + 1] = firstSkinIdx[c4 + 1];
      outSkinIdx[d4 + 2] = firstSkinIdx[c4 + 2];
      outSkinIdx[d4 + 3] = firstSkinIdx[c4 + 3];
    }
    if (outSkinWt && firstSkinWt) {
      const d4 = dst * 4;
      const c4 = cid * 4;
      outSkinWt[d4] = firstSkinWt[c4];
      outSkinWt[d4 + 1] = firstSkinWt[c4 + 1];
      outSkinWt[d4 + 2] = firstSkinWt[c4 + 2];
      outSkinWt[d4 + 3] = firstSkinWt[c4 + 3];
    }
  }

  const slicedIdx = outIndices.subarray(0, outIdxLen);
  const finalIndex = usedCount <= 65535 ? new Uint16Array(slicedIdx) : new Uint32Array(slicedIdx);

  return {
    result: {
      pos: outPos,
      norm: outNorm,
      uv: outUv,
      color: outColor,
      skinIndex: outSkinIdx,
      skinWeight: outSkinWt,
      index: finalIndex,
    },
    triCount: Math.floor(outIdxLen / 3),
  };
}

/**
 * Estrategia rápida de decimación (síncrona):
 * - Como máximo UNA pasada sobre la malla original gigante (ej. 1.6M tris), apuntando ligeramente por encima del objetivo (~1.25x).
 * - Cualquier ajuste fino posterior opera sobre la malla ya reducida (<40k tris), evitando 5 pasadas sobre 1.6M tris.
 */
function decimateRawArraysFast(src: RawGeometryArrays, targetTriangles: number): RawGeometryArrays {
  const vCount = Math.floor(src.pos.length / 3);
  const initialTris = src.index ? Math.floor(src.index.length / 3) : Math.floor(vCount / 3);
  if (initialTris <= targetTriangles * 1.15 || initialTris <= 24) {
    return src;
  }

  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  const pos = src.pos;
  for (let i = 0; i < pos.length; i += 3) {
    const x = pos[i];
    const y = pos[i + 1];
    const z = pos[i + 2];
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (z < minZ) minZ = z;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
    if (z > maxZ) maxZ = z;
  }

  const maxDim = Math.max(maxX - minX, maxY - minY, maxZ - minZ, 1e-4);
  const bounds = { minX, minY, minZ, maxDim };

  // Apuntar ligeramente por encima del presupuesto para no sobre-simplificar en la pasada única sobre la malla original
  const firstPassTarget = Math.round(targetTriangles * 1.25);
  let gridDivs = Math.max(12, Math.min(900, Math.round(Math.sqrt(firstPassTarget * 0.72))));

  let { result: current, triCount: curTris } = runClusteringOnRawArraysSync(src, gridDivs, bounds);

  // Solo si sobre-simplificó drásticamente en un objeto muy plano/delgado, reintentar 1 vez con rejilla más fina
  if (curTris < targetTriangles * 0.4 && initialTris > targetTriangles * 2 && gridDivs < 900) {
    const widerDivs = Math.min(
      1000,
      Math.max(gridDivs + 16, Math.round(gridDivs * Math.sqrt(firstPassTarget / Math.max(1, curTris))))
    );
    const retry = runClusteringOnRawArraysSync(src, widerDivs, bounds);
    if (retry.triCount > curTris) {
      current = retry.result;
      curTris = retry.triCount;
      gridDivs = widerDivs;
    }
  }

  // Si excede el presupuesto, refinar SOBRE LA MALLA YA REDUCIDA (no sobre los 1.6M originales)
  let guard = 0;
  while (curTris > targetTriangles * 1.15 && guard < 2 && gridDivs > 8) {
    gridDivs = Math.max(
      8,
      Math.floor(gridDivs * Math.sqrt(targetTriangles / Math.max(1, curTris)) * 0.92)
    );
    const next = runClusteringOnRawArraysSync(current, gridDivs, bounds);
    if (next.triCount >= curTris || next.triCount === 0) break;
    current = next.result;
    curTris = next.triCount;
    guard++;
  }

  return current;
}

/**
 * Fallback asíncrono por bloques en el hilo principal (cuando Web Workers no están disponibles),
 * cediendo el control periódicamente para no congelar la UI.
 */
async function decimateRawArraysChunkedAsync(
  src: RawGeometryArrays,
  targetTriangles: number
): Promise<RawGeometryArrays> {
  const vCount = Math.floor(src.pos.length / 3);
  const initialTris = src.index ? Math.floor(src.index.length / 3) : Math.floor(vCount / 3);
  if (initialTris <= targetTriangles * 1.15 || initialTris <= 24) {
    return src;
  }

  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  const pos = src.pos;
  for (let i = 0; i < pos.length; i += 3) {
    const x = pos[i];
    const y = pos[i + 1];
    const z = pos[i + 2];
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (z < minZ) minZ = z;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
    if (z > maxZ) maxZ = z;
    if ((i & 65535) === 0 && i > 0) {
      await yieldToMainThread();
    }
  }

  const maxDim = Math.max(maxX - minX, maxY - minY, maxZ - minZ, 1e-4);
  const bounds = { minX, minY, minZ, maxDim };

  const firstPassTarget = Math.round(targetTriangles * 1.25);
  let gridDivs = Math.max(12, Math.min(900, Math.round(Math.sqrt(firstPassTarget * 0.72))));

  await yieldToMainThread();
  let { result: current, triCount: curTris } = runClusteringOnRawArraysSync(src, gridDivs, bounds);

  if (curTris < targetTriangles * 0.4 && initialTris > targetTriangles * 2 && gridDivs < 900) {
    await yieldToMainThread();
    const widerDivs = Math.min(
      1000,
      Math.max(gridDivs + 16, Math.round(gridDivs * Math.sqrt(firstPassTarget / Math.max(1, curTris))))
    );
    const retry = runClusteringOnRawArraysSync(src, widerDivs, bounds);
    if (retry.triCount > curTris) {
      current = retry.result;
      curTris = retry.triCount;
      gridDivs = widerDivs;
    }
  }

  let guard = 0;
  while (curTris > targetTriangles * 1.15 && guard < 2 && gridDivs > 8) {
    await yieldToMainThread();
    gridDivs = Math.max(
      8,
      Math.floor(gridDivs * Math.sqrt(targetTriangles / Math.max(1, curTris)) * 0.92)
    );
    const next = runClusteringOnRawArraysSync(current, gridDivs, bounds);
    if (next.triCount >= curTris || next.triCount === 0) break;
    current = next.result;
    curTris = next.triCount;
    guard++;
  }

  return current;
}

// ============================================================================
// INLINE WEB WORKER PARA DECIMACIÓN OFF-THREAD (CERO BLOQUEO DEL HILO PRINCIPAL)
// ============================================================================
const WORKER_SCRIPT_BODY = `
function nextPowerOf2(n) {
  var p = 1;
  while (p < n) p <<= 1;
  return p;
}
${runClusteringOnRawArraysSync.toString()}
${decimateRawArraysFast.toString()}
self.onmessage = function(ev) {
  var msg = ev.data;
  try {
    var out = decimateRawArraysFast(msg.src, msg.targetTriangles);
    var transfers = [out.pos.buffer];
    if (out.norm) transfers.push(out.norm.buffer);
    if (out.uv) transfers.push(out.uv.buffer);
    if (out.color) transfers.push(out.color.buffer);
    if (out.skinIndex) transfers.push(out.skinIndex.buffer);
    if (out.skinWeight) transfers.push(out.skinWeight.buffer);
    if (out.index) transfers.push(out.index.buffer);
    self.postMessage({ id: msg.id, ok: true, out: out }, transfers);
  } catch (err) {
    self.postMessage({ id: msg.id, ok: false, error: String(err) });
  }
};
`;

let sharedDecimationWorker: Worker | null = null;
let workerDisabled = typeof Worker === 'undefined' || typeof Blob === 'undefined' || typeof URL === 'undefined';
let workerJobSeq = 1;
let workerIdleTimer: ReturnType<typeof setTimeout> | null = null;
const pendingWorkerJobs = new Map<
  number,
  { resolve: (res: RawGeometryArrays) => void; reject: (err: any) => void }
>();

function scheduleWorkerIdleCleanup(): void {
  if (workerIdleTimer) clearTimeout(workerIdleTimer);
  if (pendingWorkerJobs.size > 0) return;
  workerIdleTimer = setTimeout(() => {
    if (pendingWorkerJobs.size === 0 && sharedDecimationWorker) {
      try {
        sharedDecimationWorker.terminate();
      } catch (_) {}
      sharedDecimationWorker = null;
    }
  }, 3500);
}

function getDecimationWorker(): Worker | null {
  if (workerDisabled) return null;
  if (sharedDecimationWorker) return sharedDecimationWorker;
  try {
    const blob = new Blob([WORKER_SCRIPT_BODY], { type: 'application/javascript' });
    const blobUrl = URL.createObjectURL(blob);
    const worker = new Worker(blobUrl);
    URL.revokeObjectURL(blobUrl);

    worker.onmessage = (ev: MessageEvent) => {
      const { id, ok, out, error } = ev.data || {};
      const job = pendingWorkerJobs.get(id);
      if (!job) return;
      pendingWorkerJobs.delete(id);
      scheduleWorkerIdleCleanup();
      if (ok && out) {
        job.resolve(out as RawGeometryArrays);
      } else {
        job.reject(new Error(error || 'Worker decimation failed'));
      }
    };

    worker.onerror = () => {
      workerDisabled = true;
      const err = new Error('Worker execution failed');
      pendingWorkerJobs.forEach((job) => job.reject(err));
      pendingWorkerJobs.clear();
      try {
        worker.terminate();
      } catch (_) {}
      sharedDecimationWorker = null;
    };

    sharedDecimationWorker = worker;
    return worker;
  } catch (_) {
    workerDisabled = true;
    return null;
  }
}

async function decimateBufferGeometryAsync(
  geometry: THREE.BufferGeometry,
  targetTriangles: number
): Promise<THREE.BufferGeometry> {
  const initialTris = getTriangleCount(geometry);
  if (initialTris <= targetTriangles * 1.15 || initialTris <= 24) {
    return geometry;
  }

  // Para mallas pesadas (>= 18k tris como temd.glb / taverna.glb / iglesis.glb), ejecutar en Web Worker con Transferables
  const worker = initialTris >= 18000 ? getDecimationWorker() : null;
  if (worker) {
    const raw = geometryToRawArrays(geometry);
    if (raw) {
      try {
        const outRaw = await new Promise<RawGeometryArrays>((resolve, reject) => {
          const id = workerJobSeq++;
          pendingWorkerJobs.set(id, { resolve, reject });
          const transfers: Transferable[] = [raw.pos.buffer];
          if (raw.norm) transfers.push(raw.norm.buffer);
          if (raw.uv) transfers.push(raw.uv.buffer);
          if (raw.color) transfers.push(raw.color.buffer);
          if (raw.skinIndex) transfers.push(raw.skinIndex.buffer);
          if (raw.skinWeight) transfers.push(raw.skinWeight.buffer);
          if (raw.index) transfers.push(raw.index.buffer);
          worker.postMessage({ id, src: raw, targetTriangles }, transfers);
        });
        geometry.dispose();
        return rawArraysToGeometry(outRaw);
      } catch (_) {
        // Fallback automático al procesador troceado en hilo principal conservando `geometry` intacta
      }
    }
  }

  const freshRaw = geometryToRawArrays(geometry);
  if (!freshRaw) return geometry;
  geometry.dispose();
  const outRaw = await decimateRawArraysChunkedAsync(freshRaw, targetTriangles);
  return rawArraysToGeometry(outRaw);
}

export function decimateBufferGeometrySpatial(
  geometry: THREE.BufferGeometry,
  targetTriangles: number
): THREE.BufferGeometry {
  const initialTris = getTriangleCount(geometry);
  if (initialTris <= targetTriangles * 1.15 || initialTris <= 24) {
    return geometry;
  }
  const raw = geometryToRawArrays(geometry);
  if (!raw) return geometry;
  geometry.dispose();
  const outRaw = decimateRawArraysFast(raw, targetTriangles);
  return rawArraysToGeometry(outRaw);
}

interface MeshEntry {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
}

function ensureGeometryAttributesForMerge(
  entries: MeshEntry[],
  requireUv: boolean,
  requireColor: boolean
): void {
  for (const entry of entries) {
    const geom = entry.geometry;
    const pos = geom.getAttribute('position');
    if (!pos) continue;
    const count = pos.count;

    if (!geom.getAttribute('normal')) {
      geom.computeVertexNormals();
    }
    if (requireUv && !geom.getAttribute('uv')) {
      geom.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(count * 2), 2));
    } else if (!requireUv && geom.getAttribute('uv')) {
      geom.deleteAttribute('uv');
    }
    if (requireColor && !geom.getAttribute('color')) {
      const arr = new Float32Array(count * 3);
      arr.fill(1.0);
      geom.setAttribute('color', new THREE.Float32BufferAttribute(arr, 3));
    } else if (!requireColor && geom.getAttribute('color')) {
      geom.deleteAttribute('color');
    }
  }
}

function mergeMeshEntries(entries: MeshEntry[]): THREE.BufferGeometry {
  if (entries.length === 1) {
    return entries[0].geometry;
  }

  const hasAnyUv = entries.some((e) => Boolean(e.geometry.getAttribute('uv')));
  const hasAnyColor = entries.some((e) => Boolean(e.geometry.getAttribute('color')));
  ensureGeometryAttributesForMerge(entries, hasAnyUv, hasAnyColor);

  let totalVerts = 0;
  let totalIndices = 0;
  for (const entry of entries) {
    const pos = entry.geometry.getAttribute('position');
    if (!pos) continue;
    totalVerts += pos.count;
    const idx = entry.geometry.getIndex();
    totalIndices += idx ? idx.count : pos.count;
  }

  const outPos = new Float32Array(totalVerts * 3);
  const outNorm = new Float32Array(totalVerts * 3);
  const outUv = hasAnyUv ? new Float32Array(totalVerts * 2) : null;
  const outColor = hasAnyColor ? new Float32Array(totalVerts * 3) : null;
  const outIdx = totalVerts <= 65535 ? new Uint16Array(totalIndices) : new Uint32Array(totalIndices);

  let vOffset = 0;
  let iOffset = 0;

  for (const entry of entries) {
    const geom = entry.geometry;
    const pos = geom.getAttribute('position');
    const norm = geom.getAttribute('normal');
    const uv = geom.getAttribute('uv');
    const color = geom.getAttribute('color');
    if (!pos) continue;

    const vCount = pos.count;
    for (let v = 0; v < vCount; v++) {
      const dst3 = (vOffset + v) * 3;
      outPos[dst3] = pos.getX(v);
      outPos[dst3 + 1] = pos.getY(v);
      outPos[dst3 + 2] = pos.getZ(v);

      if (norm) {
        outNorm[dst3] = norm.getX(v);
        outNorm[dst3 + 1] = norm.getY(v);
        outNorm[dst3 + 2] = norm.getZ(v);
      } else {
        outNorm[dst3 + 1] = 1;
      }

      if (outUv && uv) {
        const dst2 = (vOffset + v) * 2;
        outUv[dst2] = uv.getX(v);
        outUv[dst2 + 1] = uv.getY(v);
      }

      if (outColor && color) {
        outColor[dst3] = color.getX(v);
        outColor[dst3 + 1] = color.getY(v);
        outColor[dst3 + 2] = color.getZ(v);
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
    geom.dispose();
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(outPos, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(outNorm, 3));
  if (outUv) merged.setAttribute('uv', new THREE.BufferAttribute(outUv, 2));
  if (outColor) merged.setAttribute('color', new THREE.BufferAttribute(outColor, 3));
  merged.setIndex(new THREE.BufferAttribute(outIdx, 1));
  return merged;
}

function bakeSolidColorIntoGeometry(geom: THREE.BufferGeometry, color: THREE.Color): void {
  const pos = geom.getAttribute('position');
  if (!pos) return;
  const vCount = pos.count;
  const existing = geom.getAttribute('color');
  const out = new Float32Array(vCount * 3);

  for (let i = 0; i < vCount; i++) {
    const r = existing ? existing.getX(i) : 1;
    const g = existing ? existing.getY(i) : 1;
    const b = existing ? existing.getZ(i) : 1;
    out[i * 3] = r * color.r;
    out[i * 3 + 1] = g * color.g;
    out[i * 3 + 2] = b * color.b;
  }

  geom.setAttribute('color', new THREE.Float32BufferAttribute(out, 3));
  if (geom.getAttribute('uv')) {
    geom.deleteAttribute('uv');
  }
}

function sampleAverageTextureColor(tex: THREE.Texture | null | undefined): THREE.Color {
  const fallback = new THREE.Color('#cbd5e1');
  if (!tex || !tex.image || typeof document === 'undefined') return fallback;
  try {
    const { width, height } = getImageDimensions(tex.image);
    if (width <= 0 || height <= 0) return fallback;
    const canvas = document.createElement('canvas');
    canvas.width = 4;
    canvas.height = 4;
    const ctx = canvas.getContext('2d');
    if (!ctx) return fallback;
    ctx.drawImage(tex.image, 0, 0, 4, 4);
    const data = ctx.getImageData(0, 0, 4, 4).data;
    let r = 0;
    let g = 0;
    let b = 0;
    const pxCount = 16;
    for (let i = 0; i < pxCount; i++) {
      r += data[i * 4];
      g += data[i * 4 + 1];
      b += data[i * 4 + 2];
    }
    const c = new THREE.Color();
    c.setRGB(r / (pxCount * 255), g / (pxCount * 255), b / (pxCount * 255), THREE.SRGBColorSpace);
    return c;
  } catch (_) {
    return fallback;
  }
}

function isGeometryUvNonTiling(geom: THREE.BufferGeometry): boolean {
  const uv = geom.getAttribute('uv');
  if (!uv || uv.count === 0) return false;
  for (let i = 0; i < uv.count; i++) {
    const u = uv.getX(i);
    const v = uv.getY(i);
    if (u < -0.02 || u > 1.02 || v < -0.02 || v > 1.02) {
      return false;
    }
  }
  return true;
}

function buildMaterialSignature(mat: THREE.Material): string {
  const m = mat as any;
  const colorHex = m.color?.getHexString ? m.color.getHexString() : 'ffffff';
  const emissiveHex = m.emissive?.getHexString ? m.emissive.getHexString() : '000000';
  const r = typeof m.roughness === 'number' ? Math.round(m.roughness * 10) : 7;
  const met = typeof m.metalness === 'number' ? Math.round(m.metalness * 10) : 1;
  const op = typeof m.opacity === 'number' ? Math.round(m.opacity * 20) : 20;
  return [
    mat.type,
    m.map?.uuid || '',
    m.emissiveMap?.uuid || '',
    m.normalMap?.uuid || '',
    m.roughnessMap?.uuid || '',
    m.metalnessMap?.uuid || '',
    m.alphaMap?.uuid || '',
    colorHex,
    emissiveHex,
    r,
    met,
    Boolean(m.transparent),
    op,
    Math.round((m.alphaTest || 0) * 100),
    m.side ?? THREE.FrontSide,
  ].join('|');
}

function packNonTilingTexturedEntriesIntoAtlas(
  groups: Array<{ tex: THREE.Texture; entries: MeshEntry[] }>,
  atlasSize: number,
  isMobile: boolean
): { material: THREE.MeshStandardMaterial; entries: MeshEntry[] } | null {
  if (groups.length === 0 || typeof document === 'undefined') return null;

  const grid = Math.ceil(Math.sqrt(groups.length));
  const cellSize = Math.floor(atlasSize / grid);
  if (cellSize < 16) return null;

  const pad = Math.max(1, Math.min(3, Math.floor(cellSize * 0.04)));
  const innerSize = cellSize - pad * 2;

  const canvas = document.createElement('canvas');
  canvas.width = atlasSize;
  canvas.height = atlasSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = isMobile ? 'medium' : 'high';

  const resultEntries: MeshEntry[] = [];
  const tempColor = new THREE.Color();

  let anyDoubleSide = false;
  let roughnessSum = 0;
  let metalnessSum = 0;

  groups.forEach((grp, idx) => {
    const col = idx % grid;
    const row = Math.floor(idx / grid);
    const cellX = col * cellSize;
    const cellY = row * cellSize;
    const innerX = cellX + pad;
    const innerY = cellY + pad;

    const srcImg = grp.tex.image;
    const { width, height } = getImageDimensions(srcImg);
    if (srcImg && width > 0 && height > 0) {
      ctx.drawImage(srcImg, cellX, cellY, cellSize, cellSize);
      ctx.drawImage(srcImg, innerX, innerY, innerSize, innerSize);
    } else {
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(cellX, cellY, cellSize, cellSize);
    }

    const uMin = innerX / atlasSize;
    const uMax = (innerX + innerSize) / atlasSize;
    const vMin = innerY / atlasSize;
    const vMax = (innerY + innerSize) / atlasSize;
    const uSpan = uMax - uMin;
    const vSpan = vMax - vMin;
    const needsFlipV = grp.tex.flipY === true;

    for (const entry of grp.entries) {
      const m = entry.material as any;
      if (m.side === THREE.DoubleSide) anyDoubleSide = true;
      roughnessSum += typeof m.roughness === 'number' ? m.roughness : 0.72;
      metalnessSum += typeof m.metalness === 'number' ? Math.min(0.18, m.metalness) : 0.08;

      const tint = m.color?.isColor ? m.color : tempColor.set('#ffffff');
      const geom = entry.geometry;
      const pos = geom.getAttribute('position');
      const uv = geom.getAttribute('uv');
      if (uv && pos) {
        const outUv = new Float32Array(uv.count * 2);
        for (let i = 0; i < uv.count; i++) {
          const u = THREE.MathUtils.clamp(uv.getX(i), 0, 1);
          const rawV = THREE.MathUtils.clamp(uv.getY(i), 0, 1);
          const v = needsFlipV ? 1 - rawV : rawV;
          outUv[i * 2] = uMin + u * uSpan;
          outUv[i * 2 + 1] = vMin + v * vSpan;
        }
        geom.setAttribute('uv', new THREE.BufferAttribute(outUv, 2));
      }

      if (tint.r < 0.98 || tint.g < 0.98 || tint.b < 0.98 || geom.getAttribute('color')) {
        const vCount = pos ? pos.count : 0;
        const existingCol = geom.getAttribute('color');
        const colArr = new Float32Array(vCount * 3);
        for (let i = 0; i < vCount; i++) {
          const er = existingCol ? existingCol.getX(i) : 1;
          const eg = existingCol ? existingCol.getY(i) : 1;
          const eb = existingCol ? existingCol.getZ(i) : 1;
          colArr[i * 3] = er * tint.r;
          colArr[i * 3 + 1] = eg * tint.g;
          colArr[i * 3 + 2] = eb * tint.b;
        }
        geom.setAttribute('color', new THREE.Float32BufferAttribute(colArr, 3));
      }

      resultEntries.push(entry);
    }

    try {
      if (typeof ImageBitmap !== 'undefined' && srcImg instanceof ImageBitmap) {
        srcImg.close();
      }
      grp.tex.dispose();
    } catch (_) {}
  });

  const atlasTex = new THREE.CanvasTexture(canvas);
  atlasTex.flipY = false;
  atlasTex.colorSpace = THREE.SRGBColorSpace;
  atlasTex.generateMipmaps = true;
  atlasTex.minFilter = THREE.LinearMipmapLinearFilter;
  atlasTex.magFilter = THREE.LinearFilter;
  atlasTex.anisotropy = isMobile ? 1 : 2;
  atlasTex.needsUpdate = true;

  const hasColors = resultEntries.some((e) => Boolean(e.geometry.getAttribute('color')));
  const count = Math.max(1, resultEntries.length);

  const atlasMat = new THREE.MeshStandardMaterial({
    map: atlasTex,
    vertexColors: hasColors,
    roughness: Math.max(0.45, Math.min(0.88, roughnessSum / count)),
    metalness: Math.min(0.18, metalnessSum / count),
    side: anyDoubleSide ? THREE.DoubleSide : THREE.FrontSide,
  });

  for (const entry of resultEntries) {
    entry.material = atlasMat;
  }

  return { material: atlasMat, entries: resultEntries };
}

function consolidateEntriesMaterials(
  entries: MeshEntry[],
  budget: ProfileBudget,
  isMobile: boolean
): MeshEntry[] {
  if (entries.length === 0) return entries;

  const sigMap = new Map<string, THREE.Material>();
  for (const entry of entries) {
    const sig = buildMaterialSignature(entry.material);
    const existing = sigMap.get(sig);
    if (existing) {
      entry.material = existing;
    } else {
      sigMap.set(sig, entry.material);
    }
  }

  if (sigMap.size <= budget.maxMaterials) {
    return entries;
  }

  const untexturedOpaque: MeshEntry[] = [];
  const untexturedTransparent: MeshEntry[] = [];
  const texturedEntries: MeshEntry[] = [];

  for (const entry of entries) {
    const m = entry.material as any;
    const hasTex = Boolean(m.map || m.emissiveMap || m.alphaMap);
    if (!hasTex) {
      if (m.transparent || (m.alphaTest && m.alphaTest > 0)) {
        untexturedTransparent.push(entry);
      } else {
        untexturedOpaque.push(entry);
      }
    } else {
      texturedEntries.push(entry);
    }
  }

  const finalEntries: MeshEntry[] = [];
  const defaultWhite = new THREE.Color('#ffffff');

  if (untexturedOpaque.length > 0) {
    let rSum = 0;
    let mSum = 0;
    let anyDouble = false;
    for (const entry of untexturedOpaque) {
      const m = entry.material as any;
      const c = m.color?.isColor ? m.color : defaultWhite;
      bakeSolidColorIntoGeometry(entry.geometry, c);
      rSum += typeof m.roughness === 'number' ? m.roughness : 0.72;
      mSum += typeof m.metalness === 'number' ? Math.min(0.18, m.metalness) : 0.08;
      if (m.side === THREE.DoubleSide) anyDouble = true;
    }
    const opaqueVertexMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: Math.max(0.35, Math.min(0.92, rSum / untexturedOpaque.length)),
      metalness: Math.min(0.18, mSum / untexturedOpaque.length),
      side: anyDouble ? THREE.DoubleSide : THREE.FrontSide,
    });
    for (const entry of untexturedOpaque) {
      entry.material = opaqueVertexMat;
      finalEntries.push(entry);
    }
  }

  if (untexturedTransparent.length > 0) {
    let opSum = 0;
    for (const entry of untexturedTransparent) {
      const m = entry.material as any;
      const c = m.color?.isColor ? m.color : defaultWhite;
      bakeSolidColorIntoGeometry(entry.geometry, c);
      opSum += typeof m.opacity === 'number' ? m.opacity : 0.6;
    }
    const transpVertexMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      transparent: true,
      opacity: Math.max(0.15, Math.min(0.95, opSum / untexturedTransparent.length)),
      roughness: 0.35,
      metalness: 0.08,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    for (const entry of untexturedTransparent) {
      entry.material = transpVertexMat;
      finalEntries.push(entry);
    }
  }

  if (texturedEntries.length === 0) {
    return finalEntries;
  }

  const usedSlots = (untexturedOpaque.length > 0 ? 1 : 0) + (untexturedTransparent.length > 0 ? 1 : 0);
  const remainingSlots = Math.max(1, budget.maxMaterials - usedSlots);

  const texMatMap = new Map<THREE.Material, MeshEntry[]>();
  for (const entry of texturedEntries) {
    const arr = texMatMap.get(entry.material) || [];
    arr.push(entry);
    texMatMap.set(entry.material, arr);
  }

  if (texMatMap.size <= remainingSlots) {
    finalEntries.push(...texturedEntries);
    return finalEntries;
  }

  const atlasCandidates: Array<{ tex: THREE.Texture; entries: MeshEntry[] }> = [];
  const otherTexturedGroups: Array<{ mat: THREE.Material; entries: MeshEntry[]; tris: number }> = [];

  for (const [mat, grpEntries] of texMatMap.entries()) {
    const m = mat as any;
    const mapTex = m.map as THREE.Texture | undefined;
    const hasCustomTransform =
      Boolean(mapTex) &&
      (Math.abs((mapTex!.repeat?.x ?? 1) - 1) > 0.01 ||
        Math.abs((mapTex!.repeat?.y ?? 1) - 1) > 0.01 ||
        Math.abs(mapTex!.offset?.x ?? 0) > 0.01 ||
        Math.abs(mapTex!.offset?.y ?? 0) > 0.01);

    const canAtlas =
      Boolean(mapTex) &&
      !hasCustomTransform &&
      !m.transparent &&
      !m.alphaMap &&
      !m.emissiveMap &&
      !(m.alphaTest > 0) &&
      grpEntries.every((e) => isGeometryUvNonTiling(e.geometry));

    if (canAtlas) {
      atlasCandidates.push({ tex: mapTex!, entries: grpEntries });
    } else {
      const tris = grpEntries.reduce((acc, e) => acc + getTriangleCount(e.geometry), 0);
      otherTexturedGroups.push({ mat, entries: grpEntries, tris });
    }
  }

  if (atlasCandidates.length > 1) {
    const packed = packNonTilingTexturedEntriesIntoAtlas(
      atlasCandidates,
      Math.max(512, budget.maxTextureSize),
      isMobile
    );
    if (packed) {
      finalEntries.push(...packed.entries);
    } else {
      for (const c of atlasCandidates) {
        const tris = c.entries.reduce((acc, e) => acc + getTriangleCount(e.geometry), 0);
        otherTexturedGroups.push({ mat: c.entries[0].material, entries: c.entries, tris });
      }
    }
  } else if (atlasCandidates.length === 1) {
    const c = atlasCandidates[0];
    const tris = c.entries.reduce((acc, e) => acc + getTriangleCount(e.geometry), 0);
    otherTexturedGroups.push({ mat: c.entries[0].material, entries: c.entries, tris });
  }

  const atlasUsed = atlasCandidates.length > 1 ? 1 : 0;
  const slotsLeftForOthers = Math.max(1, remainingSlots - atlasUsed);

  otherTexturedGroups.sort((a, b) => b.tris - a.tris);
  const keptGroups = otherTexturedGroups.slice(0, slotsLeftForOthers);
  const overflowGroups = otherTexturedGroups.slice(slotsLeftForOthers);

  for (const grp of keptGroups) {
    finalEntries.push(...grp.entries);
  }

  if (overflowGroups.length > 0) {
    const overflowVertexMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.75,
      metalness: 0.1,
    });
    for (const grp of overflowGroups) {
      const m = grp.mat as any;
      const texAvg = sampleAverageTextureColor(m.map);
      const tint = m.color?.isColor ? m.color : defaultWhite;
      texAvg.multiply(tint);
      for (const entry of grp.entries) {
        bakeSolidColorIntoGeometry(entry.geometry, texAvg);
        entry.material = overflowVertexMat;
        finalEntries.push(entry);
      }
    }
  }

  return finalEntries;
}

function optimizePreservingRiggedHierarchy(
  rootScene: THREE.Group,
  budget: ProfileBudget,
  isMobile: boolean
): THREE.Group {
  const seenMats = new Set<THREE.Material>();
  const matSigMap = new Map<string, THREE.Material>();
  const riggedMeshes: Array<{ mesh: any; tris: number }> = [];
  let totalTris = 0;

  rootScene.traverse((child: any) => {
    if (!child.isMesh || !child.geometry || !child.material) return;
    child.castShadow = budget.allowShadows;
    child.receiveShadow = budget.allowShadows;

    const mats = Array.isArray(child.material) ? child.material : [child.material];
    const nextMats = mats.map((m: THREE.Material) => {
      if (!m) return m;
      if (!seenMats.has(m)) {
        seenMats.add(m);
        optimizeMaterialTextures(m, budget, isMobile);
      }
      const sig = buildMaterialSignature(m);
      const dedup = matSigMap.get(sig);
      if (dedup) return dedup;
      matSigMap.set(sig, m);
      return m;
    });
    child.material = Array.isArray(child.material) ? nextMats : nextMats[0];

    const tris = getTriangleCount(child.geometry);
    riggedMeshes.push({ mesh: child, tris });
    totalTris += tris;
  });

  if (totalTris > budget.maxTriangles * 1.15) {
    for (const item of riggedMeshes) {
      const share = item.tris / Math.max(1, totalTris);
      const meshBudget = Math.max(250, Math.floor(budget.maxTriangles * share));
      item.mesh.geometry = decimateBufferGeometrySpatial(item.mesh.geometry, meshBudget);
    }
  }

  return rootScene;
}

async function optimizePreservingRiggedHierarchyAsync(
  rootScene: THREE.Group,
  budget: ProfileBudget,
  isMobile: boolean
): Promise<THREE.Group> {
  const seenMats = new Set<THREE.Material>();
  const matSigMap = new Map<string, THREE.Material>();
  const riggedMeshes: Array<{ mesh: any; tris: number }> = [];
  let totalTris = 0;

  rootScene.traverse((child: any) => {
    if (!child.isMesh || !child.geometry || !child.material) return;
    child.castShadow = budget.allowShadows;
    child.receiveShadow = budget.allowShadows;

    const mats = Array.isArray(child.material) ? child.material : [child.material];
    const nextMats = mats.map((m: THREE.Material) => {
      if (!m) return m;
      if (!seenMats.has(m)) {
        seenMats.add(m);
        optimizeMaterialTextures(m, budget, isMobile);
      }
      const sig = buildMaterialSignature(m);
      const dedup = matSigMap.get(sig);
      if (dedup) return dedup;
      matSigMap.set(sig, m);
      return m;
    });
    child.material = Array.isArray(child.material) ? nextMats : nextMats[0];

    const tris = getTriangleCount(child.geometry);
    riggedMeshes.push({ mesh: child, tris });
    totalTris += tris;
  });

  if (totalTris > budget.maxTriangles * 1.15) {
    for (const item of riggedMeshes) {
      const share = item.tris / Math.max(1, totalTris);
      const meshBudget = Math.max(250, Math.floor(budget.maxTriangles * share));
      item.mesh.geometry = await decimateBufferGeometryAsync(item.mesh.geometry, meshBudget);
    }
  }

  return rootScene;
}

function prepareStaticEntriesFromScene(
  rootScene: THREE.Group,
  budget: ProfileBudget,
  isMobile: boolean,
  preserveRig: boolean
): {
  rawEntries: MeshEntry[];
  seenMats: Set<THREE.Material>;
  hasActiveRig: boolean;
} {
  rootScene.updateMatrixWorld(true);

  if (preserveRig) {
    let hasActiveRig = false;
    rootScene.traverse((child: any) => {
      const hasRealMorph =
        Array.isArray(child.morphTargetInfluences) &&
        child.morphTargetInfluences.length > 0 &&
        child.geometry?.morphAttributes &&
        Object.keys(child.geometry.morphAttributes).length > 0;
      if (child.isSkinnedMesh || hasRealMorph) {
        hasActiveRig = true;
      }
    });
    if (hasActiveRig) {
      return { rawEntries: [], seenMats: new Set<THREE.Material>(), hasActiveRig: true };
    }
  }

  const rootInverse = new THREE.Matrix4().copy(rootScene.matrixWorld).invert();
  const relMatrix = new THREE.Matrix4();

  const rawEntries: MeshEntry[] = [];
  const originalGeometries = new Set<THREE.BufferGeometry>();
  const seenMats = new Set<THREE.Material>();

  rootScene.traverse((child: any) => {
    if (!child.isMesh || !child.geometry || !child.material) return;
    const srcGeom = child.geometry as THREE.BufferGeometry;
    if (!srcGeom.getAttribute('position')) return;

    originalGeometries.add(srcGeom);
    relMatrix.multiplyMatrices(rootInverse, child.matrixWorld);
    const flipWinding = relMatrix.determinant() < 0;

    // Si algún modelo estático trae SkinnedMesh o morphTargetInfluences residuales, se hornean a estático
    // para que SIEMPRE participe en la consolidación de materiales y decimación de triángulos.
    const bakedGeom =
      child.isSkinnedMesh ||
      (Array.isArray(child.morphTargetInfluences) && child.morphTargetInfluences.length > 0)
        ? bakeSkinOrMorphIntoGeometry(child, srcGeom, false)
        : srcGeom;

    if (Array.isArray(child.material) && bakedGeom.groups.length > 0) {
      for (const grp of bakedGeom.groups) {
        const mat = child.material[grp.materialIndex ?? 0] || child.material[0];
        if (!mat || grp.count <= 0) continue;
        if (!seenMats.has(mat)) {
          seenMats.add(mat);
          optimizeMaterialTextures(mat, budget, isMobile);
        }
        const subGeom = extractGroupSubGeometry(bakedGeom, grp.start, grp.count);
        subGeom.applyMatrix4(relMatrix);
        if (flipWinding) reverseTriangleWinding(subGeom);
        stripUnusedAttributes(subGeom, false);
        rawEntries.push({ geometry: subGeom, material: mat });
      }
      if (bakedGeom !== srcGeom) bakedGeom.dispose();
    } else {
      const mat = Array.isArray(child.material) ? child.material[0] : child.material;
      if (!mat) {
        if (bakedGeom !== srcGeom) bakedGeom.dispose();
        return;
      }
      if (!seenMats.has(mat)) {
        seenMats.add(mat);
        optimizeMaterialTextures(mat, budget, isMobile);
      }
      const clonedGeom = bakedGeom === srcGeom ? srcGeom.clone() : bakedGeom;
      clonedGeom.applyMatrix4(relMatrix);
      if (flipWinding) reverseTriangleWinding(clonedGeom);
      stripUnusedAttributes(clonedGeom, false);
      if (!clonedGeom.getAttribute('normal')) {
        clonedGeom.computeVertexNormals();
      }
      rawEntries.push({ geometry: clonedGeom, material: mat });
    }
  });

  originalGeometries.forEach((g) => {
    try {
      g.dispose();
    } catch (_) {}
  });

  return { rawEntries, seenMats, hasActiveRig: false };
}

/**
 * Optimiza de forma asíncrona una escena GLB recién parseada sin congelar el hilo principal:
 * 1. Reduce texturas embebidas (512x512 en móvil / 1024x1024 máx. en edificios heroicos en PC) cediendo entre materiales.
 * 2. Consolida materiales (incluyendo escenas con SkinnedMesh / morphTargetInfluences).
 * 3. Decima mallas densas en Web Worker off-thread (o por bloques asíncronos si no hay Worker).
 */
export async function optimizeGlbSceneAsync(
  rootScene: THREE.Group,
  profile: GlbOptimizationProfile,
  options?: OptimizeGlbOptions
): Promise<THREE.Group> {
  const isMobile = isMobileOptimizationTarget();
  const budget = getEffectiveBudget(profile, isMobile, options);
  const preserveRig = Boolean(options?.preserveRig);

  if (!preserveRig) {
    const fast = tryFastPathPreoptimizedMobile(rootScene, budget, isMobile, options);
    if (fast) {
      return fast;
    }
  }

  const { rawEntries, seenMats, hasActiveRig } = prepareStaticEntriesFromScene(
    rootScene,
    budget,
    isMobile,
    preserveRig
  );

  if (hasActiveRig) {
    return await optimizePreservingRiggedHierarchyAsync(rootScene, budget, isMobile);
  }

  if (rawEntries.length === 0) {
    return rootScene;
  }

  await yieldToMainThread();

  const consolidatedEntries = consolidateEntriesMaterials(rawEntries, budget, isMobile);

  await yieldToMainThread();

  const byMaterial = new Map<THREE.Material, MeshEntry[]>();
  for (const entry of consolidatedEntries) {
    const list = byMaterial.get(entry.material) || [];
    list.push(entry);
    byMaterial.set(entry.material, list);
  }

  const mergedMeshes: Array<{ geometry: THREE.BufferGeometry; material: THREE.Material; tris: number }> = [];
  let totalTris = 0;

  for (const [mat, list] of byMaterial.entries()) {
    const mergedGeom = mergeMeshEntries(list);
    const tris = getTriangleCount(mergedGeom);
    if (tris > 0) {
      mergedMeshes.push({ geometry: mergedGeom, material: mat, tris });
      totalTris += tris;
    } else {
      mergedGeom.dispose();
    }
  }

  await yieldToMainThread();

  const optimizedGroup = new THREE.Group();
  for (const item of mergedMeshes) {
    let finalGeom = item.geometry;
    if (totalTris > budget.maxTriangles * 1.15) {
      const share = item.tris / Math.max(1, totalTris);
      const meshBudget = Math.max(250, Math.floor(budget.maxTriangles * share));
      finalGeom = await decimateBufferGeometryAsync(finalGeom, meshBudget);
    }

    const mesh = new THREE.Mesh(finalGeom, item.material);
    mesh.castShadow = budget.allowShadows;
    mesh.receiveShadow = budget.allowShadows;
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    optimizedGroup.add(mesh);
  }

  const activeMats = new Set(mergedMeshes.map((m) => m.material));
  seenMats.forEach((oldMat) => {
    if (!activeMats.has(oldMat)) {
      try {
        oldMat.dispose();
      } catch (_) {}
    }
  });

  return optimizedGroup;
}

/**
 * Versión síncrona de optimización GLB (mantiene compatibilidad directa y aplica el mismo pipeline
 * optimizado sin bypass en SkinnedMesh/morphTargetInfluences).
 */
export function optimizeGlbScene(
  rootScene: THREE.Group,
  profile: GlbOptimizationProfile,
  options?: OptimizeGlbOptions
): THREE.Group {
  const isMobile = isMobileOptimizationTarget();
  const budget = getEffectiveBudget(profile, isMobile, options);
  const preserveRig = Boolean(options?.preserveRig);

  if (!preserveRig) {
    const fast = tryFastPathPreoptimizedMobile(rootScene, budget, isMobile, options);
    if (fast) {
      return fast;
    }
  }

  const { rawEntries, seenMats, hasActiveRig } = prepareStaticEntriesFromScene(
    rootScene,
    budget,
    isMobile,
    preserveRig
  );

  if (hasActiveRig) {
    return optimizePreservingRiggedHierarchy(rootScene, budget, isMobile);
  }

  if (rawEntries.length === 0) {
    return rootScene;
  }

  const consolidatedEntries = consolidateEntriesMaterials(rawEntries, budget, isMobile);

  const byMaterial = new Map<THREE.Material, MeshEntry[]>();
  for (const entry of consolidatedEntries) {
    const list = byMaterial.get(entry.material) || [];
    list.push(entry);
    byMaterial.set(entry.material, list);
  }

  const mergedMeshes: Array<{ geometry: THREE.BufferGeometry; material: THREE.Material; tris: number }> = [];
  let totalTris = 0;

  for (const [mat, list] of byMaterial.entries()) {
    const mergedGeom = mergeMeshEntries(list);
    const tris = getTriangleCount(mergedGeom);
    if (tris > 0) {
      mergedMeshes.push({ geometry: mergedGeom, material: mat, tris });
      totalTris += tris;
    } else {
      mergedGeom.dispose();
    }
  }

  const optimizedGroup = new THREE.Group();
  for (const item of mergedMeshes) {
    let finalGeom = item.geometry;
    if (totalTris > budget.maxTriangles * 1.15) {
      const share = item.tris / Math.max(1, totalTris);
      const meshBudget = Math.max(250, Math.floor(budget.maxTriangles * share));
      finalGeom = decimateBufferGeometrySpatial(finalGeom, meshBudget);
    }

    const mesh = new THREE.Mesh(finalGeom, item.material);
    mesh.castShadow = budget.allowShadows;
    mesh.receiveShadow = budget.allowShadows;
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    optimizedGroup.add(mesh);
  }

  const activeMats = new Set(mergedMeshes.map((m) => m.material));
  seenMats.forEach((oldMat) => {
    if (!activeMats.has(oldMat)) {
      try {
        oldMat.dispose();
      } catch (_) {}
    }
  });

  return optimizedGroup;
}
