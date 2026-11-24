/**
 * Mapeo de Ilustraciones y Fondos del Bazar Arcana de Solomon
 * Repositorio oficial unificado: https://github.com/endersonvivas48-oss/main
 */

import { buildCascadingAssetUrls } from './assetManager';

const MAIN_RAW = 'https://raw.githubusercontent.com/endersonvivas48-oss/main/main';
const MAIN_CDN = 'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main';

const REMOTE_SHOP_URLS: string[] = [
  `${MAIN_CDN}/tienda.webp`,
  `${MAIN_RAW}/tienda.webp`,
  `${MAIN_RAW}/tienda.jpg`,
  `${MAIN_CDN}/tienda.jpg`,
  `${MAIN_CDN}/shop.webp`,
  `${MAIN_RAW}/shop.webp`,
  `${MAIN_RAW}/shop.jpg`,
  `${MAIN_CDN}/shop.jpg`,
  `${MAIN_CDN}/solomon.webp`,
  `${MAIN_RAW}/solomon.webp`,
  `${MAIN_RAW}/solomon.jpg`,
  `${MAIN_CDN}/solomon.jpg`,
  `${MAIN_RAW}/assets/tienda.webp`,
  `${MAIN_RAW}/assets/tienda.jpg`,
];

export const SHOP_BACKGROUND_CANDIDATES: string[] = buildCascadingAssetUrls(
  'backgrounds',
  'tienda.jpg',
  REMOTE_SHOP_URLS
);

export function getShopBackgroundCandidateUrls(): string[] {
  return SHOP_BACKGROUND_CANDIDATES;
}
