/**
 * Mapeo y Fallback URLs para la Personalización de la Ficha Maestra y Titanes:
 * Repositorio oficial unificado: https://github.com/endersonvivas48-oss/main
 */

import { buildCascadingAssetUrls } from './assetManager';

const MAIN_RAW = 'https://raw.githubusercontent.com/endersonvivas48-oss/main/main';
const MAIN_CDN = 'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main';

const REMOTE_BACKGROUND_URLS: string[] = [
  `${MAIN_CDN}/master_throne.webp`,
  `${MAIN_RAW}/master_throne.webp`,
  `${MAIN_RAW}/master_throne.jpg`,
  `${MAIN_CDN}/master_throne.jpg`,
  `${MAIN_CDN}/fondo.webp`,
  `${MAIN_RAW}/fondo.webp`,
  `${MAIN_RAW}/fondo.jpg`,
  `${MAIN_CDN}/fondo.jpg`,
  `${MAIN_CDN}/trono.webp`,
  `${MAIN_RAW}/trono.webp`,
  `${MAIN_RAW}/trono.jpg`,
  `${MAIN_CDN}/trono.jpg`,
  `${MAIN_CDN}/throne.webp`,
  `${MAIN_RAW}/throne.webp`,
  `${MAIN_RAW}/throne.jpg`,
  `${MAIN_CDN}/throne.jpg`,
  `${MAIN_RAW}/piezam.jpg`,
  `${MAIN_CDN}/piezam.jpg`,
  `${MAIN_RAW}/assets/trono.webp`,
  `${MAIN_RAW}/assets/trono.jpg`,
];

export const MASTER_BACKGROUND_CANDIDATES: string[] = buildCascadingAssetUrls(
  'backgrounds',
  'master_throne.webp',
  REMOTE_BACKGROUND_URLS
);

const REMOTE_AVATAR_URLS: string[] = [
  `${MAIN_CDN}/master_avatar.webp`,
  `${MAIN_RAW}/master_avatar.webp`,
  `${MAIN_RAW}/master_avatar.jpg`,
  `${MAIN_CDN}/master_avatar.jpg`,
  `${MAIN_RAW}/master_avatar.png`,
  `${MAIN_CDN}/master_avatar.png`,
  `${MAIN_CDN}/titan.webp`,
  `${MAIN_RAW}/titan.webp`,
  `${MAIN_RAW}/titan.jpg`,
  `${MAIN_CDN}/titan.jpg`,
  `${MAIN_RAW}/titan.png`,
  `${MAIN_CDN}/titan.png`,
  `${MAIN_CDN}/titanes.webp`,
  `${MAIN_RAW}/titanes.webp`,
  `${MAIN_RAW}/titanes.jpg`,
  `${MAIN_CDN}/titanes.jpg`,
  `${MAIN_CDN}/rey_maestro.webp`,
  `${MAIN_RAW}/rey_maestro.webp`,
  `${MAIN_RAW}/rey_maestro.jpg`,
  `${MAIN_CDN}/rey_maestro.jpg`,
  `${MAIN_RAW}/ficha.jpg`,
  `${MAIN_CDN}/ficha.jpg`,
  `${MAIN_RAW}/rey.jpg`,
  `${MAIN_CDN}/rey.jpg`,
  `${MAIN_RAW}/assets/titan.webp`,
  `${MAIN_RAW}/assets/titan.jpg`,
];

export const MASTER_AVATAR_CANDIDATES: string[] = buildCascadingAssetUrls(
  'avatars',
  'master_avatar.webp',
  REMOTE_AVATAR_URLS
);

export function getTitanAscendedCandidateUrls(): string[] {
  return [
    `./assets/titan.webp`,
    `./assets/titan.jpg`,
    `./assets/titanes.webp`,
    `./assets/titanes.jpg`,
    `./assets/ascendido.webp`,
    `./assets/ascendido.jpg`,
    `${MAIN_CDN}/titan.webp`,
    `${MAIN_RAW}/titan.webp`,
    `${MAIN_RAW}/titan.jpg`,
    `${MAIN_CDN}/titan.jpg`,
    `${MAIN_CDN}/titanes.webp`,
    `${MAIN_RAW}/titanes.webp`,
    `${MAIN_RAW}/titanes.jpg`,
    `${MAIN_CDN}/titanes.jpg`,
    `${MAIN_CDN}/ascendido.webp`,
    `${MAIN_RAW}/ascendido.webp`,
    `${MAIN_RAW}/ascendido.jpg`,
    `${MAIN_CDN}/ascendido.jpg`,
    `${MAIN_CDN}/master_avatar.webp`,
    `${MAIN_RAW}/master_avatar.webp`,
    `${MAIN_RAW}/master_avatar.jpg`,
    `${MAIN_CDN}/master_avatar.jpg`,
  ];
}

export function getHaloCandidateUrls(colorKey: string): string[] {
  const map: Record<string, { name: string; altNames: string[] }> = {
    '#38bdf8': { name: 'halo_celeste', altNames: ['celeste', 'halo_cyan', 'cyan', 'halo1', '1'] },
    '#fbbf24': { name: 'halo_solar', altNames: ['solar', 'halo_oro', 'oro', 'gold', 'halo2', '2'] },
    '#10b981': { name: 'halo_esmeralda', altNames: ['esmeralda', 'halo_verde', 'verde', 'green', 'halo3', '3'] },
    '#ef4444': { name: 'halo_carmesi', altNames: ['carmesi', 'halo_rojo', 'rojo', 'red', 'halo4', '4'] },
    '#a855f7': { name: 'halo_amatista', altNames: ['amatista', 'halo_purpura', 'purpura', 'purple', 'halo5', '5'] },
    '#e2e8f0': { name: 'halo_platino', altNames: ['platino', 'halo_blanco', 'blanco', 'white', 'halo6', '6'] },
  };

  const item = map[colorKey] || map['#38bdf8'];
  const allNames = [item.name, ...item.altNames];

  const remoteHaloUrls: string[] = [];

  allNames.forEach((n) => {
    remoteHaloUrls.push(`${MAIN_CDN}/${n}.webp`);
    remoteHaloUrls.push(`${MAIN_RAW}/${n}.webp`);
    remoteHaloUrls.push(`${MAIN_RAW}/${n}.png`);
    remoteHaloUrls.push(`${MAIN_RAW}/${n}.jpg`);
    remoteHaloUrls.push(`${MAIN_RAW}/halos/${n}.webp`);
    remoteHaloUrls.push(`${MAIN_RAW}/halos/${n}.png`);
    remoteHaloUrls.push(`${MAIN_RAW}/halos/${n}.jpg`);
    remoteHaloUrls.push(`${MAIN_CDN}/${n}.png`);
    remoteHaloUrls.push(`${MAIN_CDN}/${n}.jpg`);
  });

  return buildCascadingAssetUrls('halos', `${item.name}.png`, remoteHaloUrls);
}
