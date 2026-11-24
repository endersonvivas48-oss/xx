/**
 * Mapeo de Ilustraciones y Fondos de la Forja y Taller Medieval
 * Repositorio oficial: https://github.com/endersonvivas48-oss/main/blob/main/forja_fondo.webp
 */

const MAIN_RAW = 'https://raw.githubusercontent.com/endersonvivas48-oss/main/main';
const MAIN_CDN = 'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main';

export const FORGE_BACKGROUND_CANDIDATES: string[] = [
  `${MAIN_RAW}/forja_fondo.webp`,
  `${MAIN_CDN}/forja_fondo.webp`,
];

export function getForgeBackgroundCandidateUrls(): string[] {
  return [
    `${MAIN_RAW}/forja_fondo.webp`,
    `${MAIN_CDN}/forja_fondo.webp`,
  ];
}

/**
 * Lista oficial de materiales y minerales de la Gran Forja
 */
export const FORGE_MATERIAL_KEYS = [
  'hierro',
  'acero',
  'plata',
  'oro',
  'mithril',
  'adamantina',
  'meteorito',
  'obsidiana',
  'esencia_magica',
  'polvo_astral',
  'cristal_vacio',
  'gema_igneas',
];

export function getForgeMaterialImageUrls(matId: string, name?: string): string[] {
  const clean = (matId || '').toLowerCase().trim();
  const remote = [
    `${MAIN_CDN}/materials/${clean}.webp`,
    `${MAIN_RAW}/materials/${clean}.webp`,
    `${MAIN_CDN}/materials/${clean}.jpg`,
    `${MAIN_RAW}/materials/${clean}.jpg`,
    `${MAIN_CDN}/${clean}.webp`,
    `${MAIN_RAW}/${clean}.webp`,
    `${MAIN_CDN}/${clean}.jpg`,
    `${MAIN_RAW}/${clean}.jpg`,
    `${MAIN_CDN}/assets/${clean}.webp`,
    `${MAIN_CDN}/assets/${clean}.jpg`,
    `${MAIN_RAW}/assets/${clean}.webp`,
    `${MAIN_RAW}/assets/${clean}.jpg`,
  ];
  return [
    `./assets/forja/${clean}.webp`,
    `./assets/forja/${clean}.jpg`,
    `./assets/materials/${clean}.webp`,
    `./assets/materials/${clean}.jpg`,
    `./assets/minerales/${clean}.webp`,
    `./assets/minerales/${clean}.jpg`,
    `./assets/${clean}.webp`,
    `./assets/${clean}.jpg`,
    ...remote,
  ];
}

export function getForgeFailImageUrls(type: 'DIE' | 'ORB'): string[] {
  const baseName = type === 'ORB' ? 'orbe_fallo' : 'dado_fallo';
  const remote = [
    `${MAIN_CDN}/${baseName}.webp`,
    `${MAIN_RAW}/${baseName}.webp`,
    `${MAIN_CDN}/${baseName}.jpg`,
    `${MAIN_RAW}/${baseName}.jpg`,
    `${MAIN_CDN}/materials/${baseName}.webp`,
    `${MAIN_CDN}/materials/${baseName}.jpg`,
    `${MAIN_RAW}/materials/${baseName}.webp`,
    `${MAIN_RAW}/materials/${baseName}.jpg`,
    `${MAIN_CDN}/forja.webp`,
    `${MAIN_CDN}/forja.jpg`,
    `${MAIN_RAW}/forja.webp`,
    `${MAIN_RAW}/forja.jpg`,
  ];
  return [
    `./assets/forja/${baseName}.webp`,
    `./assets/forja/${baseName}.jpg`,
    `./assets/materials/${baseName}.webp`,
    `./assets/materials/${baseName}.jpg`,
    `./assets/${baseName}.webp`,
    `./assets/${baseName}.jpg`,
    ...remote,
  ];
}
