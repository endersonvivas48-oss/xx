// Repositorio oficial unificado: https://github.com/endersonvivas48-oss/main
import { optimizeCandidateUrls } from './imageOptimizer';

const MAIN_REPO_CDN = 'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main';
const MAIN_REPO_RAW = 'https://raw.githubusercontent.com/endersonvivas48-oss/main/main';

function cleanSpellToken(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

export function getSpellImageCandidateUrls(spellId: string, spellName?: string): string[] {
  const cleanId = cleanSpellToken(spellId);
  const cleanName = cleanSpellToken(spellName || '');
  const cacheKey = `spell_${cleanId || cleanName}`;

  const baseNames: string[] = [];

  if (cleanId.includes('lightning') || cleanId.includes('relampago') || cleanName.includes('relampago') || cleanId === 'rayo') {
    baseNames.push('relampago', 'rayo', 'trueno', 'lightning');
  } else {
    if (cleanId) baseNames.push(cleanId);
    if (cleanName && !baseNames.includes(cleanName)) baseNames.push(cleanName);
  }

  if (cleanId.includes('shield') || cleanId.includes('escudo') || cleanName.includes('escudo')) {
    baseNames.push('escudo', 'barrera_arcana', 'escudo_arcano', 'shield');
  }
  if (cleanId.includes('swap') || cleanId.includes('transposicion') || cleanName.includes('transposicion')) {
    baseNames.push('transposicion', 'teletransporte', 'transposicion_magica', 'swap');
  }
  if (cleanId.includes('judgment') || cleanId.includes('juicio') || cleanName.includes('juicio')) {
    baseNames.push('juicio', 'balanza_juicio', 'juicio_divino', 'judgment');
  }
  if (cleanId.includes('storm') || cleanId.includes('tormenta') || cleanName.includes('tormenta')) {
    baseNames.push('tormenta', 'torbellino', 'tempestad', 'storm');
  }
  if (cleanId.includes('bond') || cleanId.includes('vinculo') || cleanName.includes('vinculo')) {
    baseNames.push('vinculo', 'sacrificio_vital', 'vinculo_vital', 'bond');
  }
  if (cleanId.includes('prison') || cleanId.includes('prision') || cleanName.includes('prision')) {
    baseNames.push('prision', 'cadenas_runicas', 'prision_runica', 'prison');
  }
  if (cleanId.includes('ra') || cleanId.includes('ira') || cleanName.includes('ira_ra')) {
    baseNames.push('ira_ra', 'fuego_solar', 'ira_de_ra', 'ojo_de_ra', 'ra');
  }
  if (cleanId.includes('gravity') || cleanId.includes('gravedad') || cleanName.includes('gravedad')) {
    baseNames.push('gravedad', 'agujero_gravitacional', 'singularidad', 'gravity');
  }
  if (cleanId.includes('sentencia') || cleanId.includes('supremo') || cleanName.includes('sentencia_sagrada')) {
    baseNames.push('sentencia_sagrada', 'sentencia', 'supremo', 'juicio_sagrado', 'espada_sagrada');
  }
  if (cleanId.includes('ranura') || cleanId.includes('slot') || cleanName.includes('ranura')) {
    baseNames.push('ranura_hechizo', 'espacio_grimorio', 'ranura_extra', 'slot_hechizo');
  }

  const uniqueBaseNames = Array.from(new Set(baseNames.filter(Boolean)));
  const extensions = ['.jpg', '.png', '.jpeg', '.webp'];

  const urls: string[] = [];
  const added = new Set<string>();

  const addUrl = (url: string) => {
    if (!added.has(url)) {
      added.add(url);
      urls.push(url);
    }
  };

  // 1. PRIORIDAD 1: CARPETA LOCAL (./assets/grimorio/, ./assets/hechizos/, ./assets/spells/ y ./assets/)
  const localFolders = [
    './assets/grimorio/',
    './assets/hechizos/',
    './assets/spells/',
    './assets/Grimorio/',
    './assets/Hechizos/',
    './assets/',
  ];

  uniqueBaseNames.forEach((base) => {
    localFolders.forEach((folder) => {
      extensions.forEach((ext) => {
        addUrl(`${folder}${base}${ext}`);
      });
    });
  });

  // 2. PRIORIDAD 2: REPOSITORIO UNIFICADO https://github.com/endersonvivas48-oss/main
  const subFolders = ['', 'hechizos/', 'Hechizos/', 'grimorio/', 'Grimorio/', 'spells/', 'Spells/', 'assets/hechizos/', 'assets/grimorio/'];
  subFolders.forEach((folder) => {
    uniqueBaseNames.forEach((base) => {
      extensions.forEach((ext) => {
        addUrl(`${MAIN_REPO_CDN}/${folder}${base}${ext}`);
        addUrl(`${MAIN_REPO_RAW}/${folder}${base}${ext}`);
      });
    });
  });

  return optimizeCandidateUrls(cacheKey, urls);
}
