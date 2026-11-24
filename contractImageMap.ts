import { optimizeCandidateUrls } from './imageOptimizer';

/**
 * Repositorios de activos vinculados a contratos y tablón de anuncios
 * con prioridad local en ./assets/contracts/ y ./assets/
 * Repositorio oficial unificado: https://github.com/endersonvivas48-oss/main
 */
const MAIN_REPO_CDN = 'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main';
const MAIN_REPO_RAW = 'https://raw.githubusercontent.com/endersonvivas48-oss/main/main';

export type ContractMissionType =
  | 'BOARD_BG'
  | 'ASESINO'
  | 'TANQUE'
  | 'MAGO'
  | 'TRAMPERO'
  | 'CAMPEON'
  | 'DUNGEON_ABYSS'
  | 'RECRUIT_HONOR'
  | 'SHADOW_PURGE';

const CONTRACT_FILENAMES: Record<ContractMissionType, string[]> = {
  BOARD_BG: [
    'tablon_fondo',
    'tablon_bg',
    'contratos_bg',
    'tablon',
    'bounty_board',
    'notice_board',
    'tablon_contratos',
    'fondo_tablon',
    'board_bg',
    'board',
  ],
  ASESINO: [
    'icono_mision_asesino',
    'mision_asesino',
    'mision_1',
    'contrato_asesino',
    'icono_asesino',
    'asesino',
    'daga_sombra',
    'rogue_icon',
  ],
  TANQUE: [
    'icono_mision_tanque',
    'mision_tanque',
    'mision_2',
    'contrato_tanque',
    'icono_tanque',
    'tanque',
    'baluarte',
    'shield_icon',
  ],
  MAGO: [
    'icono_mision_mago',
    'mision_mago',
    'mision_3',
    'contrato_mago',
    'icono_mago',
    'mago',
    'arcano',
    'hielo',
    'mage_icon',
  ],
  TRAMPERO: [
    'icono_mision_trampero',
    'mision_trampero',
    'mision_4',
    'contrato_trampero',
    'icono_trampero',
    'trampero',
    'alquimista',
    'trapper_icon',
  ],
  CAMPEON: [
    'icono_mision_campeon',
    'mision_campeon',
    'mision_boss',
    'contrato_campeon',
    'icono_campeon',
    'campeon',
    'jefe',
    'boss_icon',
    'corona_campeon',
  ],
  DUNGEON_ABYSS: [
    'icono_mision_calabozo',
    'mision_calabozo',
    'mision_abismo',
    'contrato_calabozo',
    'calabozo_icon',
    'icono_dungeon',
    'dungeon_abyss',
    'ojo_abismo',
  ],
  RECRUIT_HONOR: [
    'icono_mision_recluta',
    'mision_recluta',
    'contrato_recluta',
    'icono_honor',
    'recluta_icon',
    'honor_badge',
    'medalla_recluta',
  ],
  SHADOW_PURGE: [
    'icono_mision_sombras',
    'mision_sombras',
    'contrato_sombras',
    'icono_trono',
    'shadow_purge',
    'trono_sombras',
    'calavera_vacio',
  ],
};

export function autoDiscoverContractRepoFiles(): void {}

export function getContractImageCandidateUrls(type: ContractMissionType): string[] {
  const cacheKey = `contract_${type}`;
  const baseNames = CONTRACT_FILENAMES[type] || ['icono_mision'];
  const extensions = ['.png', '.webp', '.jpg', '.jpeg'];
  const folders = ['', 'contratos/', 'iconos/', 'icons/', 'misiones/', 'fondos/', 'assets/'];

  const urls: string[] = [];
  const added = new Set<string>();

  const add = (url: string) => {
    if (url && !added.has(url)) {
      added.add(url);
      urls.push(url);
    }
  };

  // 1. PRIORIDAD 1: CARPETA LOCAL (./assets/contracts/, ./assets/backgrounds/ y ./assets/)
  baseNames.forEach((base) => {
    extensions.forEach((ext) => {
      add(`./assets/contracts/${base}${ext}`);
      add(`./assets/backgrounds/${base}${ext}`);
      add(`./assets/${base}${ext}`);
    });
  });

  // 2. PRIORIDAD 2: REPOSITORIO UNIFICADO MAIN
  folders.forEach((folder) => {
    baseNames.forEach((base) => {
      extensions.forEach((ext) => {
        add(`${MAIN_REPO_CDN}/${folder}${base}${ext}`);
        add(`${MAIN_REPO_RAW}/${folder}${base}${ext}`);
      });
    });
  });

  return optimizeCandidateUrls(cacheKey, urls);
}
