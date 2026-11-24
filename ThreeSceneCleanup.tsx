import React, { useEffect, useState, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';

const MATERIAL_TEXTURE_KEYS = [
  'map',
  'alphaMap',
  'aoMap',
  'bumpMap',
  'displacementMap',
  'emissiveMap',
  'envMap',
  'gradientMap',
  'lightMap',
  'metalnessMap',
  'normalMap',
  'roughnessMap',
  'specularMap',
] as const;

function isProtectedAsset(asset: any): boolean {
  return Boolean(asset?.userData?.sharedAsset || asset?.userData?.isGlobalCache);
}

function markSingleMaterialAsShared(mat: any): void {
  if (!mat) return;
  mat.userData = mat.userData || {};
  mat.userData.sharedAsset = true;

  MATERIAL_TEXTURE_KEYS.forEach((key) => {
    const tex = mat[key];
    if (tex) {
      tex.userData = tex.userData || {};
      tex.userData.sharedAsset = true;
    }
  });

  Object.keys(mat).forEach((key) => {
    const val = mat[key];
    if (val && typeof val === 'object' && val.isTexture) {
      val.userData = val.userData || {};
      val.userData.sharedAsset = true;
    }
  });
}

function disposeMaterialAndTextures(
  mat: any,
  disposedAssets: Set<any>,
  forceDispose = false
): void {
  if (!mat || (!forceDispose && isProtectedAsset(mat)) || disposedAssets.has(mat)) return;
  disposedAssets.add(mat);

  MATERIAL_TEXTURE_KEYS.forEach((key) => {
    const tex = mat[key];
    if (
      tex &&
      (forceDispose || !isProtectedAsset(tex)) &&
      !disposedAssets.has(tex) &&
      typeof tex.dispose === 'function'
    ) {
      disposedAssets.add(tex);
      try {
        if (typeof ImageBitmap !== 'undefined' && tex.image instanceof ImageBitmap) {
          tex.image.close();
        }
      } catch (_) {}
      try {
        tex.dispose();
      } catch (_) {}
    }
  });

  if (typeof mat.dispose === 'function') {
    try {
      mat.dispose();
    } catch (_) {}
  }
}

/**
 * Libera explícitamente todas las geometrías, materiales, texturas e ImageBitmaps de una jerarquía
 * Object3D pesada (usado en móvil al salir de la Ciudad o Combate para recuperar VRAM/RAM).
 */
export function disposeObject3DResources(root: THREE.Object3D | null | undefined): void {
  if (!root || typeof root.traverse !== 'function') return;
  const disposedAssets = new Set<any>();

  root.traverse((object: any) => {
    if (
      object.geometry &&
      !disposedAssets.has(object.geometry) &&
      typeof object.geometry.dispose === 'function'
    ) {
      disposedAssets.add(object.geometry);
      try {
        object.geometry.dispose();
      } catch (_) {}
    }

    if (object.material) {
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((mat: any) => disposeMaterialAndTextures(mat, disposedAssets, true));
    }

    if (object.customDepthMaterial) {
      disposeMaterialAndTextures(object.customDepthMaterial, disposedAssets, true);
    }

    if (object.customDistanceMaterial) {
      disposeMaterialAndTextures(object.customDistanceMaterial, disposedAssets, true);
    }
  });
}

/**
 * Marca un Object3D / Group y toda su descendencia (nodos, geometrías, materiales y texturas)
 * como activo compartido de caché global para que ThreeSceneCleanup NUNCA los destruya en VRAM.
 */
export function markAsSharedAsset<T extends THREE.Object3D>(root: T): T {
  if (!root) return root;
  const obj = root as any;
  obj.userData = obj.userData || {};
  obj.userData.sharedAsset = true;

  if (typeof obj.traverse === 'function') {
    obj.traverse((child: any) => {
      child.userData = child.userData || {};
      child.userData.sharedAsset = true;

      if (child.geometry) {
        child.geometry.userData = child.geometry.userData || {};
        child.geometry.userData.sharedAsset = true;
      }

      if (child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach(markSingleMaterialAsShared);
      }

      if (child.customDepthMaterial) {
        markSingleMaterialAsShared(child.customDepthMaterial);
      }

      if (child.customDistanceMaterial) {
        markSingleMaterialAsShared(child.customDistanceMaterial);
      }
    });
  }

  return root;
}

/**
 * Marca una BufferGeometry compartida de módulo como protegida frente a dispose().
 */
export function markGeometryAsShared<T extends THREE.BufferGeometry>(geo: T): T {
  if (!geo) return geo;
  geo.userData = geo.userData || {};
  geo.userData.sharedAsset = true;
  return geo;
}

/**
 * Marca un Material compartido de módulo (y sus mapas de textura) como protegido frente a dispose().
 */
export function markMaterialAsShared<T extends THREE.Material>(mat: T): T {
  if (!mat) return mat;
  markSingleMaterialAsShared(mat);
  return mat;
}

/**
 * ThreeSceneCleanup
 * Componente de limpieza segura y estricta en useEffect para escenas 3D de Three.js / React Three Fiber:
 * 1. Recorre toda la jerarquía de la escena (scene.traverse) para liberar geometrías, materiales
 *    (incluidos customDepthMaterial y customDistanceMaterial) y texturas GPU.
 * 2. EXCLUSIÓN VITAL: Excluye de dispose() los recursos compartidos en caché global marcados con `userData.sharedAsset = true`
 *    o `userData.isGlobalCache = true` pertenecientes a modelos GLB o cachés reutilizables entre montajes.
 * 3. Libera las listas internas de renderizado (`gl.renderLists.dispose()`) para evitar referencias retenidas en VRAM.
 */
export const ThreeSceneCleanup: React.FC = () => {
  const { gl, scene, camera } = useThree();

  useEffect(() => {
    return () => {
      const disposedAssets = new Set<any>();

      // Liberación selectiva y segura de geometrías, materiales y mapas de texturas
      if (scene) {
        scene.traverse((object: any) => {
          // Si el objeto o su nodo están marcados como compartidos, no destruir su jerarquía
          if (isProtectedAsset(object)) {
            return;
          }

          if (
            object.geometry &&
            !isProtectedAsset(object.geometry) &&
            !disposedAssets.has(object.geometry) &&
            typeof object.geometry.dispose === 'function'
          ) {
            disposedAssets.add(object.geometry);
            try {
              object.geometry.dispose();
            } catch (_) {}
          }

          if (object.material) {
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            materials.forEach((mat: any) => disposeMaterialAndTextures(mat, disposedAssets));
          }

          if (object.customDepthMaterial) {
            disposeMaterialAndTextures(object.customDepthMaterial, disposedAssets);
          }

          if (object.customDistanceMaterial) {
            disposeMaterialAndTextures(object.customDistanceMaterial, disposedAssets);
          }
        });
      }

      // Vaciar las renderLists de Three.js para que no retengan referencias a mallas o materiales desmontados
      if (gl && (gl as any).renderLists && typeof (gl as any).renderLists.dispose === 'function') {
        try {
          (gl as any).renderLists.dispose();
        } catch (_) {}
      }
    };
  }, [gl, scene, camera]);

  return null;
};

/**
 * Hook reutilizable para registrar listeners de recuperación de contexto WebGL
 * (`webglcontextlost` / `webglcontextrestored`) en el `onCreated` de `<Canvas>`,
 * previniendo la pérdida permanente del contexto y limpiando los listeners al desmontar.
 */
export function useWebglContextRecovery() {
  const [isContextLost, setIsContextLost] = useState(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, []);

  const handleCanvasCreated = useCallback(({ gl }: { gl: THREE.WebGLRenderer }) => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    const domElement = gl.domElement;
    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setIsContextLost(true);
      console.warn('WebGL context lost, awaiting auto-restore...');
    };
    const handleContextRestored = () => {
      setIsContextLost(false);
      try {
        if (typeof (gl as any).resetState === 'function') {
          (gl as any).resetState();
        }
      } catch (_) {}
      console.info('WebGL context restored.');
    };

    domElement.addEventListener('webglcontextlost', handleContextLost, false);
    domElement.addEventListener('webglcontextrestored', handleContextRestored, false);

    cleanupRef.current = () => {
      domElement.removeEventListener('webglcontextlost', handleContextLost, false);
      domElement.removeEventListener('webglcontextrestored', handleContextRestored, false);
    };
  }, []);

  return { isContextLost, handleCanvasCreated };
}

export default ThreeSceneCleanup;
