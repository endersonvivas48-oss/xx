// Repositorio oficial unificado: https://github.com/endersonvivas48-oss/main
import { optimizeCandidateUrls } from './imageOptimizer';

const MAIN_REPO_CDN = 'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main';
const MAIN_REPO_RAW = 'https://raw.githubusercontent.com/endersonvivas48-oss/main/main';

/**
 * Mapeo 100% exacto de cada Achievement ID al nombre de archivo exacto mostrado en la captura de pantalla:
 * (28 archivos de logros + 1 fondo_logros.jpg)
 */
export const EXACT_LOGRO_FILES: Record<string, string> = {
  // Triples y daño
  ach_triple: 'logro_triple.jpg',
  ach_damage_10: 'logro_damage_10.jpg',

  // Ejército y tropas
  ach_minions_4: 'logro_legion.jpg',
  ach_full_minion_limit: 'logro_legion.jpg',
  ach_untouchable_king: 'logro_rey_intacto.jpg',
  ach_bank_master: 'logro_reserva.jpg',
  ach_all_tutorials: 'logro_all_tutorials.jpg',

  // Campaña y callejuelas
  ach_alley_first: 'logro_primer_duelo.jpg',
  ach_alley_12: 'logro_rey_callejuelas.jpg',
  ach_tourney_champ: 'logro_campeon_campana1.jpg',
  ach_camp_2: 'logro_senor_calabozo.jpg',
  ach_camp_3: 'logro_graduado_recluta.jpg',
  ach_camp_4: 'logro_emperador_abismo.jpg',
  ach_all_campaigns: 'logro_todas_campanas.jpg',

  // Coliseo / Arena
  ach_coliseum_first_win: 'logro_bautismo_arena.jpg',
  ach_coliseum_wave_3: 'logro_coliseo_gladiador.jpg',
  ach_coliseum_wave_5: 'logro_coliseo_veterano.jpg',
  ach_coliseum_wave_10: 'logro_coliseo_leyenda.jpg',

  // Forja y orbes
  ach_orb_equip: 'logro_forja_orbes.jpg',
  ach_orb_collector: 'logro_forja_orbes.jpg',
  ach_legendary_gemmed: 'logro_dado_legendario_engarce.jpg',
  ach_deck_24: 'logro_arsenal_completo.jpg',
  ach_forge_first_die: 'logro_herrero_sombras.jpg',
  ach_forge_orb_crystal: 'logro_forja_orbes.jpg',
  ach_forge_legendary_throne: 'logro_dado_legendario_engarce.jpg',
  ach_forge_materials_hoarder: 'logro_magnate_minerales.jpg',

  // Grimorio y Magia
  ach_spell_slot: 'logro_mente_expandida.jpg',
  ach_max_slots: 'logro_grimorio_supremo.jpg',
  ach_all_basic_spells: 'logro_erudito_fundamentos.jpg',
  ach_all_advanced_spells: 'logro_maestro_alta_magia.jpg',
  ach_all_grimoire_spells: 'logro_archimago_cosmos.jpg',
  ach_mana_surge: 'logro_sobrecarga_mana.jpg',

  // Contratos (reutilizan medallas acordes)
  ach_contract_first_claim: 'logro_primer_duelo.jpg',
  ach_contract_five_claims: 'logro_arsenal_completo.jpg',
  ach_contract_master_slayer: 'logro_coliseo_gladiador.jpg',
  ach_contract_coliseum_glory: 'logro_coliseo_leyenda.jpg',
  ach_contract_abyss_clear: 'logro_emperador_abismo.jpg',
  ach_contract_recruit_clear: 'logro_graduado_recluta.jpg',
  ach_contract_shadow_clear: 'logro_herrero_sombras.jpg',
};

export function getTrophyBadgeCandidateUrls(trophyId: string): string[] {
  const exactFile = EXACT_LOGRO_FILES[trophyId] || `${trophyId}.jpg`;
  const cleanBase = exactFile.replace(/\.[^/.]+$/, '');
  const cacheKey = `trophy_badge_${trophyId}`;

  const urls: string[] = [];
  const added = new Set<string>();

  const add = (url: string) => {
    if (url && !added.has(url)) {
      added.add(url);
      urls.push(url);
    }
  };

  // 1. PRIORIDAD LOCAL: carpetas locales ./assets/logro/, ./assets/logros/, ./assets/trophies/ y ./assets/
  const localFolders = [
    './assets/logro/',
    './assets/logros/',
    './assets/trophies/',
    './assets/',
  ];
  localFolders.forEach((folder) => {
    add(`${folder}${cleanBase}.webp`);
    add(`${folder}${exactFile}`);
    add(`${folder}${cleanBase}.png`);
  });

  // 2. REPOSITORIO UNIFICADO https://github.com/endersonvivas48-oss/main
  const repoFolders = ['', 'logro/', 'Logro/', 'logros/', 'Logros/', 'assets/logro/', 'assets/logros/'];
  repoFolders.forEach((sub) => {
    add(`${MAIN_REPO_CDN}/${sub}${cleanBase}.webp`);
    add(`${MAIN_REPO_RAW}/${sub}${cleanBase}.webp`);
    add(`${MAIN_REPO_CDN}/${sub}${exactFile}`);
    add(`${MAIN_REPO_RAW}/${sub}${exactFile}`);
    add(`${MAIN_REPO_CDN}/${sub}${cleanBase}.png`);
    add(`${MAIN_REPO_RAW}/${sub}${cleanBase}.png`);
  });

  // Fallbacks universales de alta disponibilidad (medalla/trofeo confirmados)
  add(`${MAIN_REPO_CDN}/logro_primer_duelo.webp`);
  add(`${MAIN_REPO_RAW}/logro_primer_duelo.webp`);
  add(`${MAIN_REPO_CDN}/logro_primer_duelo.jpg`);
  add(`${MAIN_REPO_RAW}/logro_primer_duelo.jpg`);
  add(`${MAIN_REPO_CDN}/coliseo.webp`);
  add(`${MAIN_REPO_RAW}/coliseo.webp`);
  add(`${MAIN_REPO_RAW}/coliseo.jpg`);
  add(`${MAIN_REPO_CDN}/coliseo.jpg`);

  return optimizeCandidateUrls(cacheKey, urls);
}

export function getTrophyBackgroundCandidateUrls(): string[] {
  const cacheKey = 'trophy_hall_bg';
  const urls: string[] = [];
  const added = new Set<string>();

  const add = (url: string) => {
    if (url && !added.has(url)) {
      added.add(url);
      urls.push(url);
    }
  };

  // 1. Local
  add('./assets/logro/fondo_logros.webp');
  add('./assets/logro/fondo_logros.jpg');
  add('./assets/logros/fondo_logros.webp');
  add('./assets/logros/fondo_logros.jpg');
  add('./assets/backgrounds/fondo_logros.webp');
  add('./assets/backgrounds/fondo_logros.jpg');
  add('./assets/fondo_logros.webp');
  add('./assets/fondo_logros.jpg');

  // 2. Remoto CDN y Raw desde el repositorio unificado
  const subFolders = ['', 'logro/', 'Logro/', 'logros/', 'Logros/', 'assets/logro/', 'assets/logros/'];
  subFolders.forEach((sub) => {
    add(`${MAIN_REPO_CDN}/${sub}fondo_logros.webp`);
    add(`${MAIN_REPO_RAW}/${sub}fondo_logros.webp`);
    add(`${MAIN_REPO_CDN}/${sub}fondo_logros.jpg`);
    add(`${MAIN_REPO_RAW}/${sub}fondo_logros.jpg`);
  });

  return optimizeCandidateUrls(cacheKey, urls);
}
