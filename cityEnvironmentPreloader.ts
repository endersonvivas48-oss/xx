import { preloadCityFloorGlb, isCityFloorGlbSettled, disposeCityFloorGlbAsset } from './CityFloor3D';
import { preloadMedievalHouseGlb, isMedievalHouseGlbSettled, disposeMedievalHouseGlbAsset } from './MedievalHouse';
import { preloadChurchGlb, isChurchGlbSettled, disposeChurchGlbAsset } from './MedievalChurch';
import { loadDistrictGlbModel, isDistrictGlbSettled, disposeDistrictGlbAssets } from './ProceduralDistrict';
import {
  preloadMedievalStallGlb,
  preloadMedievalFountainGlb,
  preloadMedievalLampGlb,
  isCityAtmosphereGlbsSettled,
  disposeCityAtmosphereGlbAssets,
} from './MedievalCityAtmosphere';
import {
  preloadCratesGlb,
  preloadBarrelGlb,
  preloadPotGlb,
  isMedievalPropsGlbsSettled,
  disposeMedievalPropsGlbAssets,
} from './MedievalProps';
import { disposeLazyGlbCache } from './gltfLoaderSingleton';
import { isMobileOptimizationTarget } from './glbRuntimeOptimizer';

export type CityPreloadProgressCallback = (loaded: number, total: number, currentLabel: string) => void;

let cityPreloadPromise: Promise<void> | null = null;
let cityLoadSettled = false;
let lastSettledCount = 0;
let lastTotalCount = 12;
let lastProgressLabel = 'Cargando modelos 3D de la Ciudadela...';
const progressListeners = new Set<CityPreloadProgressCallback>();

function isMobileClient(): boolean {
  return isMobileOptimizationTarget();
}

export function isCityEnvironmentLoadSettled(): boolean {
  if (cityLoadSettled) return true;
  const allModulesSettled =
    isCityFloorGlbSettled() &&
    isMedievalHouseGlbSettled() &&
    isChurchGlbSettled() &&
    isDistrictGlbSettled('TAVERN') &&
    isDistrictGlbSettled('FORGE') &&
    isDistrictGlbSettled('SHOP') &&
    isDistrictGlbSettled('ARENA') &&
    isCityAtmosphereGlbsSettled() &&
    isMedievalPropsGlbsSettled();

  if (allModulesSettled) {
    cityLoadSettled = true;
  }
  return cityLoadSettled;
}

export function getCityPreloadProgress(): { loaded: number; total: number; currentLabel: string } {
  return {
    loaded: lastSettledCount,
    total: lastTotalCount,
    currentLabel: lastProgressLabel,
  };
}

export function preloadCityEnvironmentModels(
  onProgress?: CityPreloadProgressCallback
): Promise<void> {
  if (isCityEnvironmentLoadSettled()) {
    onProgress?.(lastTotalCount, lastTotalCount, 'Modelos 3D de la Ciudadela listos');
    return Promise.resolve();
  }

  if (onProgress) {
    progressListeners.add(onProgress);
    if (lastSettledCount > 0) {
      onProgress(lastSettledCount, lastTotalCount, lastProgressLabel);
    }
  }

  if (cityPreloadPromise) {
    return cityPreloadPromise.finally(() => {
      if (onProgress) progressListeners.delete(onProgress);
    });
  }

  const isMobile = isMobileClient();

  const tasks: Array<{ label: string; isDone: () => boolean; run: () => Promise<unknown> }> = [
    { label: 'Cargando suelo de la ciudadela...', isDone: isCityFloorGlbSettled, run: () => preloadCityFloorGlb() },
    { label: 'Descargando santuario y capilla...', isDone: isChurchGlbSettled, run: () => preloadChurchGlb() },
    { label: 'Descargando Taberna Astral...', isDone: () => isDistrictGlbSettled('TAVERN'), run: () => loadDistrictGlbModel('TAVERN') },
    { label: 'Descargando Forja de Dados...', isDone: () => isDistrictGlbSettled('FORGE'), run: () => loadDistrictGlbModel('FORGE') },
    { label: 'Descargando Tienda de Solomon...', isDone: () => isDistrictGlbSettled('SHOP'), run: () => loadDistrictGlbModel('SHOP') },
    { label: 'Descargando Gran Arena y Coliseo...', isDone: () => isDistrictGlbSettled('ARENA'), run: () => loadDistrictGlbModel('ARENA') },
  ];

  if (!isMobile) {
    tasks.push(
      { label: 'Descargando fuente de la plaza...', isDone: isCityAtmosphereGlbsSettled, run: () => preloadMedievalFountainGlb() },
      { label: 'Descargando casas medievales...', isDone: isMedievalHouseGlbSettled, run: () => preloadMedievalHouseGlb() },
      { label: 'Descargando puestos del mercado...', isDone: isCityAtmosphereGlbsSettled, run: () => preloadMedievalStallGlb() },
      { label: 'Descargando faroles de la avenida...', isDone: isCityAtmosphereGlbsSettled, run: () => preloadMedievalLampGlb() },
      { label: 'Descargando cajas y provisiones...', isDone: isMedievalPropsGlbsSettled, run: () => preloadCratesGlb() },
      { label: 'Descargando barriles medievales...', isDone: isMedievalPropsGlbsSettled, run: () => preloadBarrelGlb() },
      { label: 'Descargando maceteros ornamentales...', isDone: isMedievalPropsGlbsSettled, run: () => preloadPotGlb() }
    );
  }

  lastTotalCount = tasks.length;
  lastSettledCount = tasks.filter((t) => t.isDone()).length;

  // En móvil procesar estrictamente 1 GLB a la vez para no saturar WiFi/CPU/RAM
  const batchSize = isMobile ? 1 : 2;
  const pendingTasks = tasks.filter((t) => !t.isDone());

  cityPreloadPromise = (async () => {
    for (let i = 0; i < pendingTasks.length; i += batchSize) {
      const batch = pendingTasks.slice(i, i + batchSize);
      await Promise.all(
        batch.map((task) =>
          task
            .run()
            .catch(() => null)
            .finally(() => {
              lastSettledCount = Math.min(lastTotalCount, tasks.filter((t) => t.isDone()).length);
              lastProgressLabel = task.label;
              progressListeners.forEach((fn) => {
                try {
                  fn(lastSettledCount, lastTotalCount, lastProgressLabel);
                } catch (_) {}
              });
            })
        )
      );

      // Pausa breve entre modelos para liberar memoria temporal y no saturar WiFi en móvil
      if (i + batchSize < pendingTasks.length) {
        await new Promise((r) => setTimeout(r, isMobile ? 80 : 16));
      }
    }

    cityLoadSettled = tasks.every((t) => t.isDone());
  })().finally(() => {
    cityPreloadPromise = null;
    progressListeners.clear();
  });

  return cityPreloadPromise;
}

/**
 * Libera los modelos GLB pesados de la Ciudadela únicamente cuando se fuerza de forma explícita
 * (por ejemplo, al regresar al menú principal/título), conservando en memoria los modelos ya
 * decimados durante los viajes Ciudad ↔ Edificios ↔ Combate para evitar picos de GC/Draco/WebGL.
 */
export function disposeUnusedCityAssets(force = false): void {
  if (!force) {
    return;
  }
  disposeCityFloorGlbAsset();
  disposeChurchGlbAsset();
  disposeDistrictGlbAssets();
  disposeCityAtmosphereGlbAssets();
  disposeMedievalHouseGlbAsset();
  disposeMedievalPropsGlbAssets();
  disposeLazyGlbCache();
  cityLoadSettled = false;
  lastSettledCount = 0;
}
