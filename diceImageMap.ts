// Repositorio oficial unificado: https://github.com/endersonvivas48-oss/main
import { optimizeCandidateUrls } from './imageOptimizer';

const MAIN_REPO_CDN = 'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main';
const MAIN_REPO_RAW = 'https://raw.githubusercontent.com/endersonvivas48-oss/main/main';

/**
 * LISTA EXACTA DE LOS 67 ARCHIVOS (nombres reales con extensión)
 * extraídos directamente de la captura del explorador de Windows:
 */
export const EXACT_67_DICE_FILES = [
  'dado_alquimico_corrosivo.jpg',
  'dado_chispa_electrica.jpg',
  'dado_de_acero_punzante.jpg',
  'dado_de_acero_sombrio.jpg',
  'dado_de_adamantio_abisal.jpg',
  'dado_de_bronce_disciplinado.jpg',
  'dado_de_caballeria_leve.jpg',
  'dado_de_ceniza_astral.jpg',
  'dado_de_corona_solar.jpg',
  'dado_de_cuarzo_macizo.jpg',
  'dado_de_encadenamiento.jpg',
  'dado_de_entrenamiento_tactico.jpg',
  'dado_de_escarcha_arcana.jpg',
  'dado_de_escarcha_profunda.jpg',
  'dado_de_escudo_runico.jpg',
  'dado_de_granito_colosal.jpg',
  'dado_de_grilletes_negros.jpg',
  'dado_de_la_diadema_de_aprendiz.jpg',
  'dado_de_la_punteria.jpg',
  'dado_de_luz_menor.jpg',
  'dado_de_madera_pulida.jpg',
  'dado_de_magma_primordial.jpg',
  'dado_de_muro_bastion.jpg',
  'dado_de_obsidiana_del_umbral.jpg',
  'dado_de_obsidiana_del_vacio.jpg',
  'dado_de_pino_robusto.jpg',
  'dado_de_roca_blindado.jpg',
  'dado_de_sombras_veloz.jpg',
  'dado_de_tormenta_oscura.jpg',
  'dado_del_bastion_de_sangre.jpg',
  'dado_del_caballero_del_alba.jpg',
  'dado_del_cadete_rapido.jpg',
  'dado_del_cataclismo_elemental.jpg',
  'dado_del_ciclon_cosmico.jpg',
  'dado_del_fenix_legendario.jpg',
  'dado_del_graduado_ilustre.jpg',
  'dado_del_heraldo_del_rey.jpg',
  'dado_del_hielo_cosmico.jpg',
  'dado_del_laberinto_sombrio.jpg',
  'dado_del_nucleo_del_abismo.jpg',
  'dado_del_paladin_imperial.jpg',
  'dado_del_patriarca_lunar.jpg',
  'dado_del_rayo_voraz.jpg',
  'dado_del_segador_nocturno.jpg',
  'dado_del_sendero_verde.jpg',
  'dado_del_soberano_supremo.jpg',
  'dado_del_trono_de_las_sombras.jpg',
  'dado_del_trueno_arcano.jpg',
  'dado_del_tutor_tactico.jpg',
  'dado_del_vinculo_carmesi.jpg',
  'dado_diagonal_sombra.jpg',
  'dado_epico.jpg',
  'dado_epico_del_abismo.jpg',
  'dado_espectro_de_la_noche.jpg',
  'dado_legendario.jpg',
  'dado_legendario_del_trono_sombrio.jpg',
  'dado_normal.jpg',
  'dado_raro.jpg',
  'dado_raro_de_cobre.jpg',
  'dado_raro_umbrio.jpg',
  'dado_reliquia_de_la_danza.jpg',
  'dado_santificado.jpg',
  'dado_supremo_del_trono_sombrio.jpg',
  'dado_trampa_de_acero.jpg',
  'dado_venenoso_del_abismo.jpg',
  'dado_volatil_de_polvora.jpg',
  'de_magma_lvocanico.jpg',
];

function cleanToken(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

function findBestMatchingExactFile(query: string, dieRarity?: string): string | null {
  const cleanQ = cleanToken(query);
  if (!cleanQ) return null;

  // 1. Prioridad de tokens temáticos específicos y nombres de personajes
  if (cleanQ.includes('caballero') || cleanQ.includes('alba')) return 'dado_del_caballero_del_alba.jpg';
  if (cleanQ.includes('cadete')) return 'dado_del_cadete_rapido.jpg';
  if (cleanQ.includes('tutor')) return 'dado_del_tutor_tactico.jpg';
  if (cleanQ.includes('graduado')) return 'dado_del_graduado_ilustre.jpg';
  if (cleanQ.includes('heraldo')) return 'dado_del_heraldo_del_rey.jpg';
  if (cleanQ.includes('paladin')) return 'dado_del_paladin_imperial.jpg';
  if (cleanQ.includes('diadema')) return 'dado_de_la_diadema_de_aprendiz.jpg';
  if (cleanQ.includes('segador')) return 'dado_del_segador_nocturno.jpg';
  if (cleanQ.includes('patriarca')) return 'dado_del_patriarca_lunar.jpg';
  if (cleanQ.includes('soberano')) return 'dado_del_soberano_supremo.jpg';
  if (cleanQ.includes('espectro')) return 'dado_espectro_de_la_noche.jpg';
  if (cleanQ.includes('fenix')) return 'dado_del_fenix_legendario.jpg';
  if (cleanQ.includes('ciclon')) return 'dado_del_ciclon_cosmico.jpg';
  if (cleanQ.includes('cataclismo')) return 'dado_del_cataclismo_elemental.jpg';
  if (cleanQ.includes('bastion')) return 'dado_del_bastion_de_sangre.jpg';
  if (cleanQ.includes('vinculo')) return 'dado_del_vinculo_carmesi.jpg';
  if (cleanQ.includes('alquimico')) return 'dado_alquimico_corrosivo.jpg';
  if (cleanQ.includes('chispa')) return 'dado_chispa_electrica.jpg';
  if (cleanQ.includes('escarcha')) return 'dado_de_escarcha_profunda.jpg';
  if (cleanQ.includes('magma')) return 'de_magma_lvocanico.jpg';
  if (cleanQ.includes('santificado')) return 'dado_santificado.jpg';
  if (cleanQ.includes('punteria')) return 'dado_de_la_punteria.jpg';
  if (cleanQ.includes('encadenamiento')) return 'dado_de_encadenamiento.jpg';
  if (cleanQ.includes('entrenamiento')) return 'dado_de_entrenamiento_tactico.jpg';
  if (cleanQ.includes('rayo_voraz') || cleanQ.includes('voraz')) return 'dado_del_rayo_voraz.jpg';
  if (cleanQ.includes('trueno_arcano')) return 'dado_del_trueno_arcano.jpg';
  if (cleanQ.includes('laberinto')) return 'dado_del_laberinto_sombrio.jpg';
  if (cleanQ.includes('nucleo') || cleanQ.includes('abismo')) return 'dado_del_nucleo_del_abismo.jpg';
  if (cleanQ.includes('hielo_cosmico')) return 'dado_del_hielo_cosmico.jpg';
  if (cleanQ.includes('trono_de_las_sombras') || cleanQ.includes('trono_sombrio')) {
    if (dieRarity === 'Legendario' || cleanQ.includes('legendario')) return 'dado_legendario_del_trono_sombrio.jpg';
    if (cleanQ.includes('supremo')) return 'dado_supremo_del_trono_sombrio.jpg';
    return 'dado_del_trono_de_las_sombras.jpg';
  }

  // 2. Coincidencia exacta de archivo en la lista de los 67 dados
  for (const f of EXACT_67_DICE_FILES) {
    const fClean = cleanToken(f.replace('.jpg', ''));
    if (fClean === cleanQ) return f;
  }

  // 3. Coincidencia sin prefijos "dado_", "de_", "del_"
  for (const f of EXACT_67_DICE_FILES) {
    const fClean = cleanToken(f.replace('.jpg', ''));
    const fWithoutDado = fClean.replace(/^dado_/, '').replace(/^del_/, '').replace(/^de_/, '');
    const qWithoutDado = cleanQ.replace(/^dado_/, '').replace(/^del_/, '').replace(/^de_/, '');

    if (fWithoutDado === qWithoutDado && fWithoutDado.length > 2) return f;
  }

  // 4. Verificación por Rareza explícita SOLO si no hubo coincidencia temática específica
  const isEpicQuery = cleanQ.includes('epico') || dieRarity === 'Épico';
  const isLegendaryQuery = cleanQ.includes('legendario') || dieRarity === 'Legendario';
  const isRareQuery = cleanQ.includes('raro') || dieRarity === 'Raro';

  if (isLegendaryQuery) {
    if (cleanQ.includes('trono')) return 'dado_legendario_del_trono_sombrio.jpg';
    if (cleanQ.includes('fenix')) return 'dado_del_fenix_legendario.jpg';
    return 'dado_legendario.jpg';
  }

  if (isEpicQuery) {
    if (cleanQ.includes('abismo')) return 'dado_epico_del_abismo.jpg';
    return 'dado_epico.jpg';
  }

  if (isRareQuery) {
    if (cleanQ.includes('cobre')) return 'dado_raro_de_cobre.jpg';
    if (cleanQ.includes('umbrio')) return 'dado_raro_umbrio.jpg';
    return 'dado_raro.jpg';
  }

  // 5. Mapeo genérico por defecto para dados numerados "Dado 1", "Dado 5", "d_5", etc.
  if (cleanQ.includes('normal') || /^dado_\d+$/.test(cleanQ) || /^d_\d+$/.test(cleanQ) || /^dado\d+$/.test(cleanQ)) {
    return 'dado_normal.jpg';
  }

  return null;
}

function resolveMatchedDieFile(dieName: string, dieId?: string, dieRarity?: string): string {
  const cleanName = cleanToken(dieName);
  const cleanId = cleanToken(dieId || '');

  // Prioridad 1: Buscar coincidencia de nombre exacto o token temático específico (ej. "Caballero del Alba")
  let matchedFile =
    findBestMatchingExactFile(dieName, dieRarity) ||
    findBestMatchingExactFile(dieId || '', dieRarity);

  // Si no se encontró un dado temático concreto, resolver por rareza
  if (!matchedFile) {
    const isExplicitEpic =
      cleanName.includes('epico') ||
      cleanId.includes('epico') ||
      dieRarity === 'Épico';

    const isExplicitLegendary =
      cleanName.includes('legendario') ||
      cleanId.includes('legendario') ||
      dieRarity === 'Legendario';

    const isExplicitRare =
      cleanName.includes('raro') ||
      cleanId.includes('raro') ||
      dieRarity === 'Raro';

    if (isExplicitLegendary) {
      if (cleanName.includes('trono') || cleanId.includes('trono')) {
        matchedFile = 'dado_legendario_del_trono_sombrio.jpg';
      } else if (cleanName.includes('fenix') || cleanId.includes('fenix')) {
        matchedFile = 'dado_del_fenix_legendario.jpg';
      } else {
        matchedFile = 'dado_legendario.jpg';
      }
    } else if (isExplicitEpic) {
      if (cleanName.includes('abismo') || cleanId.includes('abismo')) {
        matchedFile = 'dado_epico_del_abismo.jpg';
      } else {
        matchedFile = 'dado_epico.jpg';
      }
    } else if (isExplicitRare) {
      if (cleanName.includes('cobre') || cleanId.includes('cobre')) {
        matchedFile = 'dado_raro_de_cobre.jpg';
      } else if (cleanName.includes('umbrio') || cleanId.includes('umbrio')) {
        matchedFile = 'dado_raro_umbrio.jpg';
      } else {
        matchedFile = 'dado_raro.jpg';
      }
    } else {
      matchedFile = 'dado_normal.jpg';
    }
  }

  return matchedFile;
}

/**
 * Clave de caché canónica y reutilizable por tipo/nombre del dado y rareza
 * (independiente de IDs únicos de instancia o índice en el mazo).
 */
export function getDieImageCacheKey(dieName: string, dieId?: string, dieRarity?: string): string {
  const matchedFile = resolveMatchedDieFile(dieName, dieId, dieRarity);
  const fileBaseToken = cleanToken(matchedFile.replace(/\.[^/.]+$/, ''));
  const rarityToken = cleanToken(dieRarity || '');
  return rarityToken ? `die_${fileBaseToken}_${rarityToken}` : `die_${fileBaseToken}`;
}

export function getDieImageCandidateUrls(dieName: string, dieId?: string, dieRarity?: string): string[] {
  const cacheKey = getDieImageCacheKey(dieName, dieId, dieRarity);
  const matchedFile = resolveMatchedDieFile(dieName, dieId, dieRarity);

  const candidateNames: string[] = [];
  if (matchedFile) {
    // El archivo exacto verificado (.jpg) debe ir PRIMERO para carga instantánea garantizada 200 OK
    candidateNames.push(matchedFile);
    const baseWithoutExt = matchedFile.replace(/\.[^/.]+$/, '');
    candidateNames.push(`${baseWithoutExt}.webp`);
    candidateNames.push(`${baseWithoutExt}.png`);
  }

  // Alternativas de extensiones o nombres canónicos
  if (matchedFile === 'dado_normal.jpg') {
    candidateNames.push('dado_normal.jpg', 'dado_normal.webp', 'dado_normal.png', 'normal.jpg', 'normal.webp');
  } else if (matchedFile === 'dado_epico.jpg') {
    candidateNames.push('dado_epico.jpg', 'dado_epico_del_abismo.jpg', 'dado_epico.webp', 'epico.jpg');
  } else if (matchedFile === 'dado_legendario.jpg') {
    candidateNames.push('dado_legendario.jpg', 'dado_legendario_del_trono_sombrio.jpg', 'dado_legendario.webp', 'legendario.jpg');
  } else if (matchedFile === 'dado_raro.jpg') {
    candidateNames.push('dado_raro.jpg', 'dado_raro_de_cobre.jpg', 'dado_raro.webp', 'raro.jpg');
  }

  const urls: string[] = [];
  const added = new Set<string>();

  const add = (u: string) => {
    if (u && !added.has(u)) {
      added.add(u);
      urls.push(u);
    }
  };

  // 1. PRIORIDAD REMOTA DIRECTA (CDN jsDelivr y GitHub Raw) - Carga inmediata en 200 OK
  candidateNames.forEach((file) => {
    add(`${MAIN_REPO_CDN}/${file}`);
    add(`${MAIN_REPO_RAW}/${file}`);
    add(`${MAIN_REPO_CDN}/dado/${file}`);
    add(`${MAIN_REPO_RAW}/dado/${file}`);
    add(`${MAIN_REPO_CDN}/dados/${file}`);
    add(`${MAIN_REPO_RAW}/dados/${file}`);
  });

  // 2. FALLBACKS LOCALES
  const localDirs = [
    './assets/dado/',
    './assets/dados/',
    './assets/dice/',
    './assets/',
    './assets/materials/',
  ];
  candidateNames.forEach((file) => {
    localDirs.forEach((dir) => {
      add(`${dir}${file}`);
    });
  });

  return optimizeCandidateUrls(cacheKey, urls);
}
