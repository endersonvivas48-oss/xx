import { optimizeCandidateUrls } from './imageOptimizer';

const MAIN_REPO_CDN = 'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main';
const MAIN_REPO_RAW = 'https://raw.githubusercontent.com/endersonvivas48-oss/main/main';

const COLISEUM_CONFIRMED: Record<'GENERAL' | 'NORMAL' | 'HEROIC' | 'NIGHTMARE', string> = {
  GENERAL: 'coliseo.webp',
  NORMAL: 'coliseo_normal.webp',
  HEROIC: 'coliseo_heroico.webp',
  NIGHTMARE: 'coliseo_pesadilla.webp',
};

export function autoDiscoverColiseumRepoFiles(): void {}

export function getColiseumImageCandidateUrls(
  type: 'GENERAL' | 'NORMAL' | 'HEROIC' | 'NIGHTMARE'
): string[] {
  const cacheKey = `coli_bg_${type}`;
  const file = COLISEUM_CONFIRMED[type] || 'coliseo.webp';

  const urls: string[] = [
    `${MAIN_REPO_CDN}/${file}`,
    `${MAIN_REPO_RAW}/${file}`,
    `${MAIN_REPO_CDN}/${file.replace('.webp', '.jpg')}`,
    `${MAIN_REPO_RAW}/${file.replace('.webp', '.jpg')}`,
    `${MAIN_REPO_CDN}/${file.replace('.webp', '.png')}`,
    `${MAIN_REPO_RAW}/${file.replace('.webp', '.png')}`,
    `${MAIN_REPO_CDN}/coliseo.webp`,
    `${MAIN_REPO_RAW}/coliseo.webp`,
  ];

  return optimizeCandidateUrls(cacheKey, urls);
}
