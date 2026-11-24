import { optimizeCandidateUrls } from './imageOptimizer';

const MAIN_REPO_CDN = 'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main';
const MAIN_REPO_RAW = 'https://raw.githubusercontent.com/endersonvivas48-oss/main/main';

const CAMPAIGN_CONFIRMED_FILES: Record<number, string> = {
  0: 'campana_1.webp',
  1: 'campana_2.webp',
  2: 'campana_3.webp',
  3: 'campana_4.webp',
};

export function getCampaignImageCandidateUrls(campaignIndex: number): string[] {
  const cacheKey = `camp_banner_${campaignIndex}`;
  const fileName = CAMPAIGN_CONFIRMED_FILES[campaignIndex] || `campana_${campaignIndex + 1}.webp`;

  // Exactamente 2 URLs canónicas limpias (CDN acelerado + GitHub raw de respaldo)
  const urls: string[] = [
    `${MAIN_REPO_CDN}/${fileName}`,
    `${MAIN_REPO_RAW}/${fileName}`,
    `${MAIN_REPO_CDN}/${fileName.replace('.webp', '.jpg')}`,
  ];

  return optimizeCandidateUrls(cacheKey, urls);
}
