/**
 * Mapeo de Ilustraciones y Fondos de la Taberna del Dragón Astral
 * Repositorio oficial unificado: https://github.com/endersonvivas48-oss/main
 */

import { buildCascadingAssetUrls } from './assetManager';

const MAIN_RAW = 'https://raw.githubusercontent.com/endersonvivas48-oss/main/main';
const MAIN_CDN = 'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main';

const REMOTE_TAVERN_URLS: string[] = [
  `${MAIN_CDN}/taberna.webp`,
  `${MAIN_RAW}/taberna.webp`,
  `${MAIN_RAW}/taberna.jpg`,
  `${MAIN_CDN}/taberna.jpg`,
  `${MAIN_CDN}/tavern.webp`,
  `${MAIN_RAW}/tavern.webp`,
  `${MAIN_RAW}/tavern.jpg`,
  `${MAIN_CDN}/tavern.jpg`,
  `${MAIN_RAW}/assets/taberna.webp`,
  `${MAIN_RAW}/assets/taberna.jpg`,
];

export const TAVERN_BACKGROUND_CANDIDATES: string[] = buildCascadingAssetUrls(
  'backgrounds',
  'taberna.jpg',
  REMOTE_TAVERN_URLS
);
