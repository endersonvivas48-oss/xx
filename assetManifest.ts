import { EXACT_67_DICE_FILES, getDieImageCacheKey } from './diceImageMap';
import { CONFIRMED_ORB_FILES } from './irvbeOrbImages';
import { FORGE_MATERIALS } from './forgeSystemData';
import { EXACT_LOGRO_FILES } from './trophyImageMap';
import {
  CATALOG_CREATURES_J1,
  CATALOG_CREATURES_J2,
  CATALOG_ASCENDED_TITANS,
  CATALOG_GRIMOIRE_SPELLS,
} from './gameCatalogData';
import { resolveMobileGlbUrls, isMobileOptimizationTarget } from './glbRuntimeOptimizer';

/**
 * MANIFIESTO CANÓNICO DE RUTAS REALES DE ASSETS (assetManifest.ts)
 * Centraliza los activos verificados del juego (Fondos, Modelos 3D GLB, 67 Dados,
 * 25 Orbes, Criaturas, Titanes, Retratos, Logros, Hechizos, Materiales e Iconos).
 */

const MAIN_CDN = 'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main';
const MAIN_RAW = 'https://raw.githubusercontent.com/endersonvivas48-oss/main/main';

const J2_CDN = 'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/jugador-2@main';
const J2_RAW = 'https://raw.githubusercontent.com/endersonvivas48-oss/jugador-2/main';

const IMAGNPC_CDN = 'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/imagnpc@main';
const IMAGNPC_RAW = 'https://raw.githubusercontent.com/endersonvivas48-oss/imagnpc/main';
const GLADIADOR_CDN = 'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/gladiador@main';

export interface AssetEntry {
  primary: string;
  fallback: string;
}

export interface AssetDownloadItem {
  id: string;
  name: string;
  urls: string[];
  type: string;
  extraCacheKeys?: string[];
}

/**
 * Tabla de rutas canónicas verificadas
 */
export const ASSET_MANIFEST: Record<string, AssetEntry> = {
  // --- FONDOS Y ESCENARIOS ---
  bg_title: {
    primary: `${MAIN_CDN}/portada.webp`,
    fallback: `${MAIN_RAW}/portada.webp`,
  },
  bg_campaign_hub: {
    primary: `${MAIN_CDN}/campamento.webp`,
    fallback: `${MAIN_RAW}/campamento.webp`,
  },
  bg_coliseum: {
    primary: `${GLADIADOR_CDN}/coliseo.webp`,
    fallback: `${MAIN_CDN}/coliseo.webp`,
  },
  bg_tavern: {
    primary: `${MAIN_CDN}/taberna.webp`,
    fallback: `${MAIN_RAW}/taberna.webp`,
  },
  bg_shop: {
    primary: `${MAIN_CDN}/tienda.webp`,
    fallback: `${MAIN_RAW}/tienda.webp`,
  },
  bg_workshop: {
    primary: `${MAIN_CDN}/forja.webp`,
    fallback: `${MAIN_RAW}/forja.webp`,
  },
  bg_save_stone: {
    primary: `${MAIN_CDN}/fondo_guardar_piedra.jpg`,
    fallback: `${MAIN_RAW}/fondo_guardar_piedra.jpg`,
  },

  // --- ICONOS DE MENÚ ---
  icon_audio: {
    primary: `${MAIN_CDN}/icono_audio.webp`,
    fallback: `${MAIN_RAW}/icono_audio.webp`,
  },
  icon_ficha_maestra: {
    primary: `${MAIN_CDN}/icono_ficha_maestra.webp`,
    fallback: `${MAIN_RAW}/icono_ficha_maestra.webp`,
  },
  icon_trophies: {
    primary: `${MAIN_CDN}/icono_trofeos.webp`,
    fallback: `${MAIN_RAW}/icono_trofeos.webp`,
  },
  icon_advanced_achievements: {
    primary: `${MAIN_CDN}/icono_avanzados.webp`,
    fallback: `${MAIN_RAW}/icono_avanzados.webp`,
  },
  icon_stats: {
    primary: `${MAIN_CDN}/icono_estadisticas.webp`,
    fallback: `${MAIN_RAW}/icono_estadisticas.webp`,
  },
  icon_display: {
    primary: `${MAIN_CDN}/icono_pantalla.webp`,
    fallback: `${MAIN_RAW}/icono_pantalla.webp`,
  },
  icon_save: {
    primary: `${MAIN_CDN}/icono_guardar.webp`,
    fallback: `${MAIN_RAW}/icono_guardar.webp`,
  },
  icon_camp_exit: {
    primary: `${MAIN_CDN}/icono_salir_campamento.webp`,
    fallback: `${MAIN_RAW}/icono_salir_campamento.webp`,
  },
  icon_exit: {
    primary: `${MAIN_CDN}/icono_salir.webp`,
    fallback: `${MAIN_RAW}/icono_salir.webp`,
  },

  // --- FIGURAS Y CRIATURAS J1 ---
  figure_l1: { primary: `${MAIN_CDN}/l1.webp`, fallback: `${MAIN_RAW}/l1.webp` },
  figure_l2: { primary: `${MAIN_CDN}/l2.webp`, fallback: `${MAIN_RAW}/l2.webp` },
  figure_l3: { primary: `${MAIN_CDN}/l3.webp`, fallback: `${MAIN_RAW}/l3.webp` },
  figure_l4: { primary: `${MAIN_CDN}/l4.webp`, fallback: `${MAIN_RAW}/l4.webp` },
  figure_l5: { primary: `${MAIN_CDN}/l5.webp`, fallback: `${MAIN_RAW}/l5.webp` },
  figure_l6: { primary: `${MAIN_CDN}/l6.webp`, fallback: `${MAIN_RAW}/l6.webp` },

  // --- FIGURAS Y CRIATURAS J2 / RIVALES ---
  figure_j2_l1: { primary: `${J2_CDN}/l1.webp`, fallback: `${J2_RAW}/l1.webp` },
  figure_j2_l2: { primary: `${J2_CDN}/l2.webp`, fallback: `${J2_RAW}/l2.webp` },
  figure_j2_l3: { primary: `${J2_CDN}/l3.webp`, fallback: `${J2_RAW}/l3.webp` },
  figure_j2_l4: { primary: `${J2_CDN}/l4.webp`, fallback: `${J2_RAW}/l4.webp` },
  figure_j2_l5: { primary: `${J2_CDN}/l5.webp`, fallback: `${J2_RAW}/l5.webp` },
  figure_j2_l6: { primary: `${J2_CDN}/l6.webp`, fallback: `${J2_RAW}/l6.webp` },

  // --- LOGO OFICIAL DEL JUEGO ---
  game_logo: {
    primary: `${MAIN_CDN}/logo_torneo_campeones.webp`,
    fallback: `${MAIN_RAW}/logo_torneo_campeones.webp`,
  },
};

/**
 * Retorna las URLs limpias y optimizadas para un activo dado:
 * [Primary URL, Fallback URL]
 */
export function getCanonicalAssetUrls(key: string, defaultUrl?: string): string[] {
  const entry = ASSET_MANIFEST[key];
  if (entry) {
    return [entry.primary, entry.fallback];
  }
  if (defaultUrl) {
    if (defaultUrl.includes('raw.githubusercontent.com')) {
      const cdnMirror = defaultUrl.replace(
        /^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/,
        'https://cdn.jsdelivr.net/gh/$1/$2@$3/$4'
      );
      return [cdnMirror, defaultUrl];
    }
    return [defaultUrl];
  }
  return [];
}

function formatAssetTitle(token: string): string {
  return token
    .replace(/\.[^/.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function dedupeUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of urls) {
    if (u && !seen.has(u)) {
      seen.add(u);
      out.push(u);
    }
  }
  return out;
}

function buildCompleteDiskAssetManifest(): AssetDownloadItem[] {
  const items: AssetDownloadItem[] = [];
  const seenIds = new Set<string>();

  const pushItem = (item: AssetDownloadItem) => {
    if (!item.id || seenIds.has(item.id)) return;
    seenIds.add(item.id);
    items.push({ ...item, urls: dedupeUrls(item.urls) });
  };

  // 1. Fondos Panorámicos, Campañas y Logo (19 archivos)
  const bgAndLogoItems: AssetDownloadItem[] = [
    {
      id: 'bg_logo',
      name: 'Logo Oficial Torneo de Campeones',
      type: 'Logo',
      urls: [`${MAIN_CDN}/logo.webp`, `${MAIN_RAW}/logo.webp`, `${MAIN_CDN}/logo.png`, `${MAIN_RAW}/logo.png`],
    },
    {
      id: 'bg_camp',
      name: 'Fondo Campamento de Guerra',
      type: 'Fondo',
      extraCacheKeys: ['hub_bg_campaign'],
      urls: [`${MAIN_CDN}/campamento.webp`, `${MAIN_RAW}/campamento.webp`, `${MAIN_CDN}/campamento.jpg`],
    },
    {
      id: 'coli_bg_GENERAL',
      name: 'Fondo Gran Coliseo',
      type: 'Fondo',
      extraCacheKeys: ['bg_coliseum'],
      urls: [`${MAIN_CDN}/coliseo.webp`, `${MAIN_RAW}/coliseo.webp`, `${GLADIADOR_CDN}/coliseo.webp`, `${MAIN_CDN}/coliseo.jpg`],
    },
    {
      id: 'coli_bg_NORMAL',
      name: 'Fondo Coliseo Normal',
      type: 'Fondo',
      urls: [`${MAIN_CDN}/coliseo_normal.webp`, `${MAIN_RAW}/coliseo_normal.webp`, `${MAIN_CDN}/coliseo.webp`],
    },
    {
      id: 'coli_bg_HEROIC',
      name: 'Fondo Coliseo Heroico',
      type: 'Fondo',
      urls: [`${MAIN_CDN}/coliseo_heroico.webp`, `${MAIN_RAW}/coliseo_heroico.webp`, `${MAIN_CDN}/coliseo.webp`],
    },
    {
      id: 'coli_bg_NIGHTMARE',
      name: 'Fondo Coliseo Pesadilla',
      type: 'Fondo',
      urls: [`${MAIN_CDN}/coliseo_pesadilla.webp`, `${MAIN_RAW}/coliseo_pesadilla.webp`, `${MAIN_CDN}/coliseo.webp`],
    },
    {
      id: 'bg_tienda',
      name: 'Fondo Tienda Arcana',
      type: 'Fondo',
      extraCacheKeys: ['hub_bg_shop'],
      urls: [`${MAIN_CDN}/tienda.webp`, `${MAIN_RAW}/tienda.webp`, `${MAIN_CDN}/tienda.jpg`],
    },
    {
      id: 'bg_solomon',
      name: 'Fondo Bazar de Solomon',
      type: 'Fondo',
      urls: [`${MAIN_CDN}/solomon.webp`, `${MAIN_RAW}/solomon.webp`, `${MAIN_CDN}/solomon.jpg`, `${MAIN_CDN}/tienda.webp`],
    },
    {
      id: 'bg_workshop',
      name: 'Fondo Taller de Dados',
      type: 'Fondo',
      urls: [`${MAIN_CDN}/forja.webp`, `${MAIN_RAW}/forja.webp`, `${MAIN_CDN}/forja.jpg`],
    },
    {
      id: 'bg_forge_exclusivo',
      name: 'Fondo Gran Fragua Alquímica',
      type: 'Fondo',
      extraCacheKeys: ['hub_bg_forge'],
      urls: [`${MAIN_CDN}/forja_fondo.webp`, `${MAIN_RAW}/forja_fondo.webp`, `${MAIN_CDN}/forja.webp`],
    },
    {
      id: 'bg_tavern',
      name: 'Fondo Taberna Astral',
      type: 'Fondo',
      urls: [`${MAIN_CDN}/taberna.webp`, `${MAIN_RAW}/taberna.webp`, `${MAIN_CDN}/taberna.jpg`],
    },
    {
      id: 'bg_codex',
      name: 'Fondo Códice del Destino',
      type: 'Fondo',
      extraCacheKeys: ['hub_bg_codex'],
      urls: [`${MAIN_CDN}/codice.webp`, `${MAIN_RAW}/codice.webp`, `${MAIN_CDN}/codice.jpg`],
    },
    {
      id: 'bg_libro',
      name: 'Fondo Grimorio de Hechizos',
      type: 'Fondo',
      extraCacheKeys: ['hub_bg_spellbook'],
      urls: [`${MAIN_CDN}/libro.webp`, `${MAIN_RAW}/libro.webp`, `${MAIN_CDN}/libro.jpg`],
    },
    {
      id: 'bg_menu_city',
      name: 'Fondo Ciudadela y Menú',
      type: 'Fondo',
      extraCacheKeys: ['hub_bg_city'],
      urls: [`${MAIN_CDN}/fondo_cyty.webp`, `${MAIN_RAW}/fondo_cyty.webp`, `${MAIN_CDN}/menu.webp`],
    },
    {
      id: 'trophy_hall_bg',
      name: 'Fondo Salón de Trofeos',
      type: 'Fondo',
      extraCacheKeys: ['bg_trophy', 'bg_trophy_tiered'],
      urls: [`${MAIN_CDN}/fondo_logros.webp`, `${MAIN_RAW}/fondo_logros.webp`, `${MAIN_CDN}/fondo_logros.jpg`],
    },
    ...[0, 1, 2, 3].map((idx) => ({
      id: `camp_banner_${idx}`,
      name: `Banner Campaña ${idx + 1}`,
      type: 'Fondo',
      urls: [
        `${MAIN_CDN}/campana_${idx + 1}.webp`,
        `${MAIN_RAW}/campana_${idx + 1}.webp`,
        `${MAIN_CDN}/campana_${idx + 1}.jpg`,
      ],
    })),
  ];
  bgAndLogoItems.forEach(pushItem);

  // 2. Modelos 3D GLB Oficiales (en móvil únicamente las variantes *_mobile.glb utilizadas)
  const isMobile = isMobileOptimizationTarget();
  const glbModels: AssetDownloadItem[] = [
    { id: 'floor_3d', name: 'Modelo 3D Suelo Ciudadela (GLB)', type: 'Modelo 3D', urls: [`${MAIN_CDN}/floor.glb`, `${MAIN_RAW}/floor.glb`] },
    { id: 'iglesia_3d', name: 'Modelo 3D Santuario y Capilla (GLB)', type: 'Modelo 3D', urls: [`${MAIN_CDN}/iglesis.glb`, `${MAIN_RAW}/iglesis.glb`, `${MAIN_CDN}/iglesia.glb`] },
    { id: 'taverna_3d', name: 'Modelo 3D Taberna (GLB)', type: 'Modelo 3D', urls: [`${MAIN_CDN}/taverna.glb`, `${MAIN_RAW}/taverna.glb`] },
    { id: 'forja_3d', name: 'Modelo 3D Forja (GLB)', type: 'Modelo 3D', urls: [`${MAIN_CDN}/forja.glb`, `${MAIN_RAW}/forja.glb`] },
    { id: 'tienda_3d', name: 'Modelo 3D Tienda (GLB)', type: 'Modelo 3D', urls: [`${MAIN_CDN}/temd.glb`, `${MAIN_RAW}/temd.glb`, `${MAIN_CDN}/tienda.glb`] },
    { id: 'coliseo_3d', name: 'Modelo 3D Coliseo (GLB)', type: 'Modelo 3D', urls: [`${MAIN_CDN}/coli.glb`, `${MAIN_RAW}/coli.glb`, `${MAIN_CDN}/coliseo.glb`] },
    { id: 'tablero_3d', name: 'Modelo 3D Tablero de Batalla (GLB)', type: 'Modelo 3D', urls: [`${MAIN_CDN}/tablero.glb`, `${MAIN_RAW}/tablero.glb`] },
    { id: 'fuente_3d', name: 'Modelo 3D Fuente Plaza (GLB)', type: 'Modelo 3D', urls: [`${MAIN_CDN}/medieval_fountain_empty.glb`, `${MAIN_RAW}/medieval_fountain_empty.glb`] },
  ];
  if (!isMobile) {
    glbModels.push(
      { id: 'casa_3d', name: 'Modelo 3D Casa Medieval (GLB)', type: 'Modelo 3D', urls: [`${MAIN_CDN}/medieval_house.glb`, `${MAIN_RAW}/medieval_house.glb`] },
      { id: 'puesto_3d', name: 'Modelo 3D Puesto Mercado (GLB)', type: 'Modelo 3D', urls: [`${MAIN_CDN}/medieval_stall.glb`, `${MAIN_RAW}/medieval_stall.glb`] },
      { id: 'farol_3d', name: 'Modelo 3D Farol Medieval (GLB)', type: 'Modelo 3D', urls: [`${MAIN_CDN}/medieval_lamp_post.glb`, `${MAIN_RAW}/medieval_lamp_post.glb`, `${MAIN_CDN}/medieval_lamppost.glb`] },
      { id: 'cajas_3d', name: 'Modelo 3D Cajas (GLB)', type: 'Modelo 3D', urls: [`${MAIN_CDN}/cajas.glb`, `${MAIN_RAW}/cajas.glb`, `${MAIN_CDN}/caja.glb`] },
      { id: 'barril_3d', name: 'Modelo 3D Barriles (GLB)', type: 'Modelo 3D', urls: [`${MAIN_CDN}/barrel.glb`, `${MAIN_RAW}/barrel.glb`, `${MAIN_CDN}/barril.glb`] },
      { id: 'maceta_3d', name: 'Modelo 3D Macetero Ornamental (GLB)', type: 'Modelo 3D', urls: [`${MAIN_CDN}/pot-v1.glb`, `${MAIN_RAW}/pot-v1.glb`, `${MAIN_CDN}/pot.glb`] }
    );
  }
  glbModels.forEach((item) => pushItem({ ...item, urls: resolveMobileGlbUrls(item.urls) }));

  // 3. 67 Dados Reales de Combate
  EXACT_67_DICE_FILES.forEach((file) => {
    const base = file.replace(/\.[^/.]+$/, '');
    const title = formatAssetTitle(file);
    const keyNormal = getDieImageCacheKey(title, base);
    pushItem({
      id: keyNormal,
      name: title,
      type: 'Dado',
      extraCacheKeys: [
        `die_${base}_normal`,
        `die_${base}_raro`,
        `die_${base}_epico`,
        `die_${base}_legendario`,
      ],
      urls: [
        `${MAIN_CDN}/${file}`,
        `${MAIN_RAW}/${file}`,
        `${MAIN_CDN}/dado/${file}`,
        `${MAIN_RAW}/dado/${file}`,
      ],
    });
  });

  // 4. 25 Orbes Elementales
  CONFIRMED_ORB_FILES.forEach((file) => {
    const base = file.replace(/\.[^/.]+$/, '');
    pushItem({
      id: `orb_${file}`,
      name: `Orbe ${formatAssetTitle(file)}`,
      type: 'Orbe',
      urls: [
        `${MAIN_CDN}/${base}.webp`,
        `${MAIN_RAW}/${base}.webp`,
        `${MAIN_CDN}/${file}`,
        `${MAIN_RAW}/${file}`,
        `${MAIN_CDN}/orbs/${base}.webp`,
        `${MAIN_CDN}/orbs/${file}`,
        `${MAIN_RAW}/orbs/${file}`,
      ],
    });
  });

  // 5. Criaturas J1, J2 y Titanes Ascendidos (18)
  CATALOG_CREATURES_J1.forEach((c) => {
    pushItem({
      id: `codex_j1_${c.id}`,
      name: c.nombre,
      type: 'Criatura',
      urls: [
        `${MAIN_CDN}/${c.id}.webp`,
        `${MAIN_RAW}/${c.id}.webp`,
        `${MAIN_CDN}/${c.id}.png`,
      ],
    });
  });
  CATALOG_CREATURES_J2.forEach((c) => {
    const shortId = c.id.replace('j2_', '');
    pushItem({
      id: `codex_j2_${c.id}`,
      name: c.nombre,
      type: 'Criatura',
      urls: [
        `${J2_CDN}/${shortId}.webp`,
        `${J2_RAW}/${shortId}.webp`,
        `${J2_CDN}/${shortId}.png`,
      ],
    });
  });
  CATALOG_ASCENDED_TITANS.forEach((t) => {
    pushItem({
      id: `codex_titan_${t.id}`,
      name: t.name,
      type: 'Titán',
      urls: [
        `${MAIN_CDN}/asc${t.id}.webp`,
        `${MAIN_RAW}/asc${t.id}.webp`,
        `${J2_CDN}/asc${t.id}.webp`,
      ],
    });
  });

  // 6. Retratos de Gladiadores, Rivales y NPCs (48 retratos)
  const portraitKeys: Array<{ key: string; label: string }> = [
    { key: 'kaelen', label: 'Kaelen Daga-Veloz' },
    { key: 'sir_gareth', label: 'Sir Gareth' },
    { key: 'vespera', label: 'Vespera' },
    { key: 'zephyr', label: 'Zephyrus / Monje Zephyr' },
    { key: 'ignis_rex', label: 'Ignis el Invicto' },
    { key: 'lady_aurelia', label: 'Lady Aurelia' },
    { key: 'darian', label: 'Lord Darian' },
    { key: 'thorin', label: 'Thorin Rompeacero' },
    { key: 'grom', label: 'Grom el Rompemuros' },
    { key: 'sariel', label: 'Sariel Canto-Helado' },
    { key: 'varek', label: 'Varek el Trampero' },
    { key: 'lyanna', label: 'Lyanna Espada Danzante' },
    { key: 'aldous', label: 'Hermano Aldous' },
    { key: 'morvath', label: 'Morvath Alquimista' },
    { key: 'silas', label: 'Silas Garras de Acero' },
    { key: 'nyx', label: 'Nyx la Sombra Ciega' },
    { key: 'balthazar', label: 'Balthazar el Gólem' },
    { key: 'pyros', label: 'Pyros el Ígneo' },
    { key: 'glaciella', label: 'Glaciella Escarcha-Cero' },
    { key: 'electra', label: 'Electra Chispa-Voraz' },
    { key: 'terrax', label: 'Terrax Rompecorazas' },
    { key: 'azrael', label: 'Azrael Señor del Calabozo' },
    { key: 'valeria', label: 'Valeria Cuerda-Tensa' },
    { key: 'inmortal', label: 'El Inmortal' },
    { key: 'campeon', label: 'El Campeón Definitivo' },
    { key: 'emperador', label: 'El Emperador del Legado' },
    { key: 'pablito', label: 'Pablito el Recluta' },
    { key: 'lucas', label: 'Lucas el Granjero' },
    { key: 'nico', label: 'Nico el Aprendiz' },
    { key: 'tomas', label: 'Capitán Tomás' },
    { key: 'bruno', label: 'Sargento Bruno' },
    { key: 'carla', label: 'Carla la Ballestera' },
    { key: 'oliver', label: 'Oliver el Explorador' },
    { key: 'roldan', label: 'Capitán Roldán' },
    { key: 'master_avatar', label: 'Rey Soberano (Avatar)' },
    { key: 'garrick_intendente', label: 'Intendente Garrick' },
    { key: 'valerius', label: 'Heraldo Valerius' },
    { key: 'eldrin', label: 'Custodio Eldrin' },
    { key: 'borin', label: 'Aprendiz Borin' },
    { key: 'brom', label: 'Tabernero Brom' },
    { key: 'hermano_aldous', label: 'Capellán Aldous' },
    { key: 'darren', label: 'Herrero Darren' },
    { key: 'selene', label: 'Erudita Selene' },
    { key: 'alistair', label: 'Bardo Alistair' },
    { key: 'vaelor', label: 'Centinela Vaelor' },
    { key: 'vulkan', label: 'Maestro Forjador Vulkan' },
    { key: 'solomon', label: 'Mercader Solomon' },
    { key: 'titan', label: 'Titán Ascendido (Avatar)' },
  ];
  portraitKeys.forEach(({ key, label }) => {
    pushItem({
      id: `portrait_${key}`,
      name: label,
      type: 'Retrato',
      urls: [
        `${MAIN_CDN}/${key}.webp`,
        `${MAIN_RAW}/${key}.webp`,
        `${MAIN_CDN}/${key}.jpg`,
        `${MAIN_RAW}/${key}.jpg`,
        `${IMAGNPC_CDN}/${key}.jpg`,
        `${IMAGNPC_RAW}/${key}.jpg`,
        `${MAIN_CDN}/gladiador/${key}.webp`,
        `${MAIN_CDN}/imagnpc/${key}.jpg`,
      ],
    });
  });

  // 7. Insignias de Logros (únicas), Hechizos del Grimorio, Materiales de Forja e Iconos
  const seenTrophyFiles = new Set<string>();
  Object.entries(EXACT_LOGRO_FILES).forEach(([achId, file]) => {
    if (seenTrophyFiles.has(file)) return;
    seenTrophyFiles.add(file);
    const base = file.replace(/\.[^/.]+$/, '');
    pushItem({
      id: `trophy_${achId}`,
      name: `Insignia ${formatAssetTitle(file)}`,
      type: 'Logro',
      urls: [
        `${MAIN_CDN}/${base}.webp`,
        `${MAIN_RAW}/${base}.webp`,
        `${MAIN_CDN}/${file}`,
        `${MAIN_RAW}/${file}`,
        `${MAIN_CDN}/logro/${base}.webp`,
        `${MAIN_CDN}/logro/${file}`,
      ],
    });
  });

  Object.values(CATALOG_GRIMOIRE_SPELLS).forEach((sp) => {
    const fileToken =
      sp.id === 'rayo'
        ? 'relampago'
        : sp.id === 'supremo'
        ? 'sentencia_sagrada'
        : sp.id;
    pushItem({
      id: `spell_${sp.id}`,
      name: `Hechizo: ${sp.name}`,
      type: 'Hechizo',
      extraCacheKeys: [`codex_spell_${sp.id}`],
      urls: [
        `${MAIN_CDN}/${fileToken}.jpg`,
        `${MAIN_RAW}/${fileToken}.jpg`,
        `${MAIN_CDN}/${fileToken}.webp`,
        `${MAIN_CDN}/hechizos/${fileToken}.jpg`,
        `${MAIN_CDN}/${sp.id}.jpg`,
      ],
    });
  });

  Object.values(FORGE_MATERIALS).forEach((mat) => {
    pushItem({
      id: `forge_mat_card_${mat.id}`,
      name: mat.name,
      type: 'Forja',
      extraCacheKeys: [`forge_cat_${mat.id}`],
      urls: [
        `${MAIN_CDN}/materials/${mat.id}.webp`,
        `${MAIN_RAW}/materials/${mat.id}.webp`,
        `${MAIN_CDN}/materials/${mat.id}.jpg`,
        `${MAIN_CDN}/${mat.id}.webp`,
        `${MAIN_CDN}/${mat.id}.jpg`,
      ],
    });
  });

  const uiIconFiles = [
    'icono_salir',
    'icono_guardar',
    'icono_reanudar',
    'icono_campana',
    'icono_coliseo',
    'icono_taller',
    'icono_forja',
    'icono_tienda',
    'icono_codice',
    'icono_grimorio',
    'icono_audio',
    'icono_ficha_maestra',
    'icono_trofeos',
    'icono_avanzados',
    'icono_estadisticas',
    'icono_pantalla',
    'icono_salir_campamento',
  ];
  uiIconFiles.forEach((iconBase) => {
    pushItem({
      id: `hub_icon_${iconBase}`,
      name: `Icono ${formatAssetTitle(iconBase)}`,
      type: 'Icono',
      urls: [
        `${MAIN_CDN}/${iconBase}.webp`,
        `${MAIN_RAW}/${iconBase}.webp`,
        `${MAIN_CDN}/iconos/${iconBase}.webp`,
        `${MAIN_RAW}/iconos/${iconBase}.webp`,
        `${MAIN_CDN}/${iconBase}.png`,
      ],
    });
  });

  return items;
}

/**
 * Manifiesto completo de recursos para almacenamiento local en disco (usado por DiskCacheModal)
 */
export const CRITICAL_ASSET_MANIFEST: AssetDownloadItem[] = buildCompleteDiskAssetManifest();
