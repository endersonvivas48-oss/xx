// Mapeo EXACTO y DIRECTO para Orbes con prioridad de respaldo local en ./assets/orbs/
// Repositorio oficial unificado: https://github.com/endersonvivas48-oss/main

import { optimizeCandidateUrls } from './imageOptimizer';

const MAIN_REPO_RAW = 'https://raw.githubusercontent.com/endersonvivas48-oss/main/main';
const MAIN_REPO_CDN = 'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main';

export const CONFIRMED_ORB_FILES = [
  'agil.jpg',
  'alba.jpg',
  'bastion.jpg',
  'cefiro.jpg',
  'chispa.jpg',
  'cosmico.jpg',
  'entrenamiento.jpg',
  'forja_rayo.jpg',
  'forja_vampirico.jpg',
  'fuego.jpg',
  'fuego_vivo.jpg',
  'glacial_cero.jpg',
  'guardia.jpg',
  'hielo.jpg',
  'luz.jpg',
  'metal.jpg',
  'rayo.jpg',
  'sangre.jpg',
  'serena.jpg',
  'singularidad.jpg',
  'sombra.jpg',
  'tierra.jpg',
  'vampirico.jpg',
  'veneno.jpg',
  'viento.jpg',
];

export function getExactOrbFileName(name: string, element?: string, orbId?: string): string {
  const n = (name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const e = (element || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const id = (orbId || '').toLowerCase();

  if (n.includes('fuego vivo')) return 'fuego_vivo.jpg';
  if (n.includes('glacial cero') || n.includes('glacial')) return 'glacial_cero.jpg';
  if (n.includes('alba')) return 'alba.jpg';
  if (n.includes('bastion')) return 'bastion.jpg';
  if (n.includes('cefiro')) return 'cefiro.jpg';
  if (n.includes('chispa')) return 'chispa.jpg';
  if (n.includes('entrenamiento')) return 'entrenamiento.jpg';
  if (n.includes('guardia')) return 'guardia.jpg';
  if (n.includes('agil')) return 'agil.jpg';
  if (n.includes('serena')) return 'serena.jpg';
  if (
    n.includes('sangre') || 
    n.includes('abisal') || 
    id.includes('sangre') || 
    id.includes('abisal') || 
    n.includes('vampir') || 
    id.includes('vampir')
  ) {
    if (n.includes('sangre') || n.includes('abisal') || id.includes('sangre') || id.includes('abisal')) {
      return 'sangre.jpg';
    }
    return 'vampirico.jpg';
  }
  if (n.includes('singularidad')) return 'singularidad.jpg';
  if (n.includes('sombra') || n.includes('corona')) return 'sombra.jpg';

  if (id.includes('forja_rayo') || n.includes('forja rayo')) return 'forja_rayo.jpg';
  if (id.includes('forja_vamp') || n.includes('forja vamp')) return 'forja_vampirico.jpg';

  if (n.includes('fuego') || e.includes('fuego')) return 'fuego.jpg';
  if (n.includes('hielo') || e.includes('hielo')) return 'hielo.jpg';
  if (n.includes('rayo') || e.includes('rayo') || e.includes('electric')) return 'rayo.jpg';
  if (n.includes('vampir') || n.includes('oscur') || e.includes('vampir') || e.includes('oscur')) return 'vampirico.jpg';
  if (n.includes('viento') || e.includes('viento') || e.includes('aire')) return 'viento.jpg';
  if (n.includes('tierra') || e.includes('tierra')) return 'tierra.jpg';
  if (n.includes('veneno') || e.includes('venen')) return 'veneno.jpg';
  if (n.includes('luz') || e.includes('luz') || e.includes('sagrad')) return 'luz.jpg';
  if (n.includes('metal') || e.includes('metal') || e.includes('acero')) return 'metal.jpg';
  if (n.includes('cosm') || e.includes('cosm')) return 'cosmico.jpg';

  return 'fuego.jpg';
}

export function getOrbAllCandidateUrls(name: string, element: string, orbId?: string): string[] {
  const exactFile = getExactOrbFileName(name, element, orbId);
  const cacheKey = `orb_${exactFile}`;
  const nameWithoutExt = exactFile.replace(/\.[^/.]+$/, '');

  const rawUrls: string[] = [
    // 1. PRIORIDAD LOCAL: ./assets/orbs/ y ./assets/ (con WebP prioritario)
    `./assets/orbs/${nameWithoutExt}.webp`,
    `./assets/orbs/${exactFile}`,
    `./assets/orbs/${nameWithoutExt}.png`,
    `./assets/${nameWithoutExt}.webp`,
    `./assets/${exactFile}`,
    `./assets/${nameWithoutExt}.png`,

    // 2. REPOSITORIO UNIFICADO Y CDN https://github.com/endersonvivas48-oss/main (con WebP prioritario)
    `${MAIN_REPO_CDN}/${nameWithoutExt}.webp`,
    `${MAIN_REPO_RAW}/${nameWithoutExt}.webp`,
    `${MAIN_REPO_CDN}/${exactFile}`,
    `${MAIN_REPO_RAW}/${exactFile}`,
    `${MAIN_REPO_CDN}/orbs/${nameWithoutExt}.webp`,
    `${MAIN_REPO_RAW}/orbs/${nameWithoutExt}.webp`,
    `${MAIN_REPO_CDN}/orbs/${exactFile}`,
    `${MAIN_REPO_RAW}/orbs/${exactFile}`,
    `${MAIN_REPO_CDN}/orbess/${nameWithoutExt}.webp`,
    `${MAIN_REPO_RAW}/orbess/${nameWithoutExt}.webp`,
    `${MAIN_REPO_CDN}/orbess/${exactFile}`,
    `${MAIN_REPO_RAW}/orbess/${exactFile}`,
    `${MAIN_REPO_CDN}/assets/orbs/${nameWithoutExt}.webp`,
    `${MAIN_REPO_RAW}/assets/orbs/${nameWithoutExt}.webp`,
    `${MAIN_REPO_CDN}/assets/orbs/${exactFile}`,
    `${MAIN_REPO_RAW}/assets/orbs/${exactFile}`,
  ];

  const lower = (name || '').toLowerCase();
  if (lower.includes('sangre') || lower.includes('abisal')) {
    if (exactFile !== 'sangre.jpg') {
      rawUrls.push(
        `./assets/orbs/sangre.webp`,
        `./assets/orbs/sangre.jpg`,
        `${MAIN_REPO_CDN}/sangre.webp`,
        `${MAIN_REPO_RAW}/sangre.webp`,
        `${MAIN_REPO_CDN}/sangre.jpg`,
        `${MAIN_REPO_RAW}/sangre.jpg`,
        `${MAIN_REPO_CDN}/orbs/sangre.webp`,
        `${MAIN_REPO_RAW}/orbs/sangre.webp`,
        `${MAIN_REPO_CDN}/orbs/sangre.jpg`,
        `${MAIN_REPO_RAW}/orbs/sangre.jpg`
      );
    }
    if (exactFile !== 'vampirico.jpg') {
      rawUrls.push(
        `./assets/orbs/vampirico.webp`,
        `./assets/orbs/vampirico.jpg`,
        `${MAIN_REPO_CDN}/vampirico.webp`,
        `${MAIN_REPO_RAW}/vampirico.webp`,
        `${MAIN_REPO_CDN}/vampirico.jpg`,
        `${MAIN_REPO_RAW}/vampirico.jpg`,
        `${MAIN_REPO_CDN}/orbs/vampirico.webp`,
        `${MAIN_REPO_RAW}/orbs/vampirico.webp`,
        `${MAIN_REPO_CDN}/orbs/vampirico.jpg`,
        `${MAIN_REPO_RAW}/orbs/vampirico.jpg`
      );
    }
  }

  return optimizeCandidateUrls(cacheKey, rawUrls);
}
