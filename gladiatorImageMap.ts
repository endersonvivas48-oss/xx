/**
 * Mapeo de Ilustraciones y Fondos de la Gran Arena y Gladiadores
 * Repositorio oficial unificado: https://github.com/endersonvivas48-oss/main
 */

import { buildCascadingAssetUrls } from './assetManager';

const MAIN_RAW = 'https://raw.githubusercontent.com/endersonvivas48-oss/main/main';
const MAIN_CDN = 'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main';

const REMOTE_COLISEUM_URLS: string[] = [
  `${MAIN_CDN}/coliseo.webp`,
  `${MAIN_RAW}/coliseo.webp`,
  `${MAIN_RAW}/coliseo.jpg`,
  `${MAIN_CDN}/coliseo.jpg`,
  `${MAIN_RAW}/gladiador/coliseo.webp`,
  `${MAIN_CDN}/gladiador/coliseo.webp`,
  `${MAIN_RAW}/gladiador/coliseo.jpg`,
  `${MAIN_CDN}/gladiador/coliseo.jpg`,
  `${MAIN_RAW}/assets/coliseo.webp`,
  `${MAIN_RAW}/assets/coliseo.jpg`,
];

export const COLISEUM_BACKGROUNDS: string[] = buildCascadingAssetUrls(
  'backgrounds',
  'coliseo.webp',
  REMOTE_COLISEUM_URLS
);

export const DIFFICULTY_BADGES: Record<string, string[]> = {
  NORMAL: buildCascadingAssetUrls('materials', 'normal.webp', [
    `${MAIN_RAW}/normal.webp`,
    `${MAIN_CDN}/normal.webp`,
    `${MAIN_RAW}/normal.jpg`,
    `${MAIN_CDN}/normal.jpg`,
    `${MAIN_RAW}/normal.png`,
    `${MAIN_CDN}/normal.png`,
    `${MAIN_RAW}/gladiador/normal.webp`,
    `${MAIN_CDN}/gladiador/normal.webp`,
    `${MAIN_RAW}/gladiador/normal.jpg`,
    `${MAIN_CDN}/gladiador/normal.jpg`,
  ]),
  HARD: buildCascadingAssetUrls('materials', 'heroico.webp', [
    `${MAIN_RAW}/heroico.webp`,
    `${MAIN_CDN}/heroico.webp`,
    `${MAIN_RAW}/heroico.jpg`,
    `${MAIN_CDN}/heroico.jpg`,
    `${MAIN_RAW}/heroico.png`,
    `${MAIN_CDN}/heroico.png`,
    `${MAIN_RAW}/gladiador/heroico.webp`,
    `${MAIN_CDN}/gladiador/heroico.webp`,
    `${MAIN_RAW}/gladiador/heroico.jpg`,
    `${MAIN_CDN}/gladiador/heroico.jpg`,
  ]),
  TITAN: buildCascadingAssetUrls('materials', 'mitico.webp', [
    `${MAIN_RAW}/mitico.webp`,
    `${MAIN_CDN}/mitico.webp`,
    `${MAIN_RAW}/mitico.jpg`,
    `${MAIN_CDN}/mitico.jpg`,
    `${MAIN_RAW}/mitico.png`,
    `${MAIN_CDN}/mitico.png`,
    `${MAIN_RAW}/gladiador/mitico.webp`,
    `${MAIN_CDN}/gladiador/mitico.webp`,
    `${MAIN_RAW}/gladiador/mitico.jpg`,
    `${MAIN_CDN}/gladiador/mitico.jpg`,
  ]),
};

export const GLADIATOR_KEYS = [
  'sir_gareth',
  'vespera',
  'zephyr',
  'ignis_rex',
  'kaelen',
  'darian',
  'lady_aurelia',
];

export function getGladiatorPortraitUrls(contenderId: string, name?: string): string[] {
  const cleanId = (contenderId || '').toLowerCase().replace('contender_', '').replace('gladiador_', '').replace('tourney_', '');
  const cleanName = (name || '').toLowerCase();

  // Mapeo exhaustivo por palabras clave de nombres de rivales de callejuela, torneos y gladiadores
  let specificKey = '';
  if (cleanId.includes('kaelen') || cleanName.includes('kaelen')) specificKey = 'kaelen';
  else if (cleanId.includes('gareth') || cleanName.includes('gareth')) specificKey = 'sir_gareth';
  else if (cleanId.includes('vespera') || cleanName.includes('vespera')) specificKey = 'vespera';
  else if (cleanId.includes('zephyr') || cleanName.includes('zephyr')) specificKey = 'zephyr';
  else if (cleanId.includes('ignis') || cleanName.includes('ignis')) specificKey = 'ignis_rex';
  else if (cleanId.includes('aurelia') || cleanName.includes('aurelia')) specificKey = 'lady_aurelia';
  else if (cleanId.includes('darian') || cleanName.includes('darian')) specificKey = 'darian';
  else if (cleanId.includes('thorin') || cleanName.includes('thorin')) specificKey = 'thorin';
  else if (cleanId.includes('grom') || cleanName.includes('grom')) specificKey = 'grom';
  else if (cleanId.includes('sariel') || cleanName.includes('sariel')) specificKey = 'sariel';
  else if (cleanId.includes('varek') || cleanName.includes('varek')) specificKey = 'varek';
  else if (cleanId.includes('lyanna') || cleanName.includes('lyanna')) specificKey = 'lyanna';
  else if (cleanId.includes('aldous') || cleanName.includes('aldous')) specificKey = 'aldous';
  else if (cleanId.includes('morvath') || cleanName.includes('morvath')) specificKey = 'morvath';
  else if (cleanId.includes('silas') || cleanName.includes('silas')) specificKey = 'silas';
  else if (cleanId.includes('nyx') || cleanName.includes('nyx')) specificKey = 'nyx';
  else if (cleanId.includes('balthazar') || cleanName.includes('balthazar')) specificKey = 'balthazar';
  else if (cleanId.includes('pyros') || cleanName.includes('pyros')) specificKey = 'pyros';
  else if (cleanId.includes('glaciella') || cleanName.includes('glaciella')) specificKey = 'glaciella';
  else if (cleanId.includes('electra') || cleanName.includes('electra')) specificKey = 'electra';
  else if (cleanId.includes('terrax') || cleanName.includes('terrax')) specificKey = 'terrax';
  else if (cleanId.includes('azrael') || cleanName.includes('azrael')) specificKey = 'azrael';
  else if (cleanId.includes('valeria') || cleanName.includes('valeria')) specificKey = 'valeria';
  else if (cleanId.includes('inmortal') || cleanName.includes('inmortal')) specificKey = 'inmortal';
  else if (cleanId.includes('campeon') || cleanName.includes('campeon')) specificKey = 'campeon';
  else if (cleanId.includes('emperador') || cleanName.includes('emperador')) specificKey = 'emperador';
  else if (cleanId.includes('pablito') || cleanName.includes('pablito')) specificKey = 'pablito';
  else if (cleanId.includes('lucas') || cleanName.includes('lucas')) specificKey = 'lucas';
  else if (cleanId.includes('nico') || cleanName.includes('nico')) specificKey = 'nico';
  else if (cleanId.includes('tomas') || cleanName.includes('tomas')) specificKey = 'tomas';
  else if (cleanId.includes('bruno') || cleanName.includes('bruno')) specificKey = 'bruno';
  else if (cleanId.includes('carla') || cleanName.includes('carla')) specificKey = 'carla';
  else if (cleanId.includes('oliver') || cleanName.includes('oliver')) specificKey = 'oliver';
  else if (cleanId.includes('roldan') || cleanName.includes('roldan')) specificKey = 'roldan';
  else specificKey = cleanId;

  const targetKey = specificKey || cleanId || 'gladiador_1';

  // Colección de URLs dando prioridad absoluta a los CDNs y Raw oficiales para carga inmediata
  const remote = [
    `${MAIN_CDN}/${targetKey}.webp`,
    `${MAIN_RAW}/${targetKey}.webp`,
    `${MAIN_CDN}/gladiador/${targetKey}.webp`,
    `${MAIN_RAW}/gladiador/${targetKey}.webp`,
    `${MAIN_CDN}/gladiador_${targetKey}.webp`,
    `${MAIN_RAW}/gladiador_${targetKey}.webp`,
    `${MAIN_CDN}/${targetKey}.jpg`,
    `${MAIN_RAW}/${targetKey}.jpg`,
    `${MAIN_CDN}/imagnpc/${targetKey}.webp`,
    `${MAIN_RAW}/imagnpc/${targetKey}.webp`,
    `${MAIN_CDN}/imagnpc/${targetKey}.jpg`,
    `${MAIN_RAW}/imagnpc/${targetKey}.jpg`,
    `${MAIN_CDN}/gladiador/${targetKey}.jpg`,
    `${MAIN_RAW}/gladiador/${targetKey}.jpg`,
    `${MAIN_RAW}/${targetKey}.png`,
    `${MAIN_CDN}/${targetKey}.png`,
    `./assets/imagnpc/${targetKey}.webp`,
    `./assets/imagnpc/${targetKey}.jpg`,
    `./assets/${targetKey}.webp`,
    `./assets/${targetKey}.jpg`,
  ];

  return remote;
}
