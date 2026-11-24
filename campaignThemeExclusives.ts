import { DieData, DieRarity, Orb } from './types';

export const RARIDADES: Record<string, DieRarity> = {
  NORMAL: { name: 'Normal', slots: 0, class: 'text-slate-300 border-slate-600', color: '#94a3b8' },
  RARO: { name: 'Raro', slots: 1, class: 'text-cyan-400 border-cyan-500', color: '#38bdf8' },
  EPICO: { name: 'Épico', slots: 2, class: 'text-purple-400 border-purple-500', color: '#c084fc' },
  LEGENDARIO: { name: 'Legendario', slots: 3, class: 'text-amber-400 border-amber-500', color: '#f59e0b' },
};

// =========================================================================
// DEFINICIÓN DE DADOS, ORBES Y EFECTOS EXCLUSIVOS POR CADA CAMPAÑA
// =========================================================================

export interface CampaignThemeProfile {
  campaignIndex: number;
  name: string;
  subtitle: string;
  themeColor: string;
  diceArchetype: string;
  exclusiveDice: {
    name: string;
    rarity: DieRarity;
    level: number;
    specialTrait: string;
  }[];
  exclusiveOrbs: Orb[];
}

export const CAMPAIGN_EXCLUSIVES: Record<number, CampaignThemeProfile> = {
  // -----------------------------------------------------------------------
  // CAMPAÑA 1: EL CAMINO AL TORNEO DE CAMPEONES (Tradición Marcial y Honor del Reino)
  // Enfoque: Estabilidad marcial, escudos de placas y precisión caballeresca
  // -----------------------------------------------------------------------
  0: {
    campaignIndex: 0,
    name: 'El Camino al Torneo',
    subtitle: 'Artes de Caballería y Duelos Reales',
    themeColor: '#38bdf8',
    diceArchetype: 'Dados de Acero Real y Bastión',
    exclusiveDice: [
      {
        name: 'Dado del Caballero del Alba',
        rarity: RARIDADES.RARO,
        level: 2,
        specialTrait: 'Guardia Real: +2 Defensa al recibir ataques frontales',
      },
      {
        name: 'Dado del Heraldo del Rey',
        rarity: RARIDADES.EPICO,
        level: 3,
        specialTrait: 'Inspiración: Otorga +1 Casilla de movimiento al invocar',
      },
      {
        name: 'Dado del Paladín Imperial',
        rarity: RARIDADES.LEGENDARIO,
        level: 4,
        specialTrait: 'Muralla Inquebrantable: Genera Escudo de absorción al entrar',
      },
    ],
    exclusiveOrbs: [
      {
        id: 'orb_c1_alba',
        name: 'Orbe del Alba Real',
        element: 'Luz',
        effect: 'Honor Real: +4 HP y +1 ATK en choques directos',
        price: 130,
        bonusHp: 4,
        bonusAtk: 1,
      },
      {
        id: 'orb_c1_escudo',
        name: 'Orbe de la Guardia Férrea',
        element: 'Metal',
        effect: 'Baluarte: +6 HP permanente y reduce 1 punto de daño rival',
        price: 150,
        bonusHp: 6,
        bonusAtk: 0,
      },
      {
        id: 'orb_c1_céfiro',
        name: 'Orbe del Céfiro Veloz',
        element: 'Viento',
        effect: 'Carga Ligera: +2 HP y permite saltar una pieza aliada al mover',
        price: 140,
        bonusHp: 2,
        bonusAtk: 1,
      },
    ],
  },

  // -----------------------------------------------------------------------
  // CAMPAÑA 2: EL DESAFÍO DE LOS SEÑORES DEL CALABOZO (Magia Elemental y Cataclismo)
  // Enfoque: Furia ígnea, permafrost, descargas voltaicas y trampas
  // -----------------------------------------------------------------------
  1: {
    campaignIndex: 1,
    name: 'Señores del Calabozo',
    subtitle: 'Fuerzas Primordiales y Cataclismos',
    themeColor: '#f97316',
    diceArchetype: 'Dados de Magma, Permafrost y Tormenta',
    exclusiveDice: [
      {
        name: 'Dado de Magma Volcánico',
        rarity: RARIDADES.EPICO,
        level: 3,
        specialTrait: 'Combustión: Quema la casilla pisada infligiendo 2 de daño continuo',
      },
      {
        name: 'Dado de Escarcha Profunda',
        rarity: RARIDADES.EPICO,
        level: 4,
        specialTrait: 'Permafrost: Congela e inmoviliza al atacante durante 1 turno',
      },
      {
        name: 'Dado del Cataclismo Elemental',
        rarity: RARIDADES.LEGENDARIO,
        level: 5,
        specialTrait: 'Furia de los Cuatro Vientos: Daño en área de 3 pts al golpear',
      },
    ],
    exclusiveOrbs: [
      {
        id: 'orb_c2_ignis',
        name: 'Orbe de Fuego Vivo',
        element: 'Fuego',
        effect: 'Llamarada Ígnea: +5 HP y +3 ATK explosivo al atacar',
        price: 260,
        bonusHp: 5,
        bonusAtk: 3,
      },
      {
        id: 'orb_c2_glaciar',
        name: 'Orbe Glacial Cero',
        element: 'Hielo',
        effect: 'Aura Helada: +7 HP y reduce en 2 el ataque de los rivales adyacentes',
        price: 280,
        bonusHp: 7,
        bonusAtk: 0,
      },
      {
        id: 'orb_c2_voltio',
        name: 'Orbe de Chispa Cósmica',
        element: 'Rayo',
        effect: 'Sobrecarga: +4 HP y arco voltaico que rebota al esbirro más cercano',
        price: 290,
        bonusHp: 4,
        bonusAtk: 3,
      },
    ],
  },

  // -----------------------------------------------------------------------
  // CAMPAÑA 3: EL TORNEÍLLO DEL RECLUTA (Didáctica, Entrenamiento y Cobre)
  // Enfoque: Aprendizaje táctico, bajo coste, piezas adaptables y equilibrio
  // -----------------------------------------------------------------------
  2: {
    campaignIndex: 2,
    name: 'El Torneíllo del Recluta',
    subtitle: 'Academia y Maniobras Didácticas',
    themeColor: '#10b981',
    diceArchetype: 'Dados de Práctica, Pino y Bronce Ligero',
    exclusiveDice: [
      {
        name: 'Dado del Cadete Rápido',
        rarity: RARIDADES.RARO,
        level: 1,
        specialTrait: 'Iniciativa: Puede invocarse consumiendo 1 sola ficha de nivel',
      },
      {
        name: 'Dado del Tutor Táctico',
        rarity: RARIDADES.RARO,
        level: 2,
        specialTrait: 'Maniobra Segura: Permite repetir una tirada de defensa fallida',
      },
      {
        name: 'Dado de la Diadema de Aprendiz',
        rarity: RARIDADES.EPICO,
        level: 3,
        specialTrait: 'Crecimiento Rápido: Otorga +2 HP al eliminar a un enemigo menor',
      },
    ],
    exclusiveOrbs: [
      {
        id: 'orb_c3_cadete',
        name: 'Orbe de Entrenamiento Básico',
        element: 'Tierra',
        effect: 'Resistencia Fácil: +3 HP y otorga +1 Maná adicional al invocar',
        price: 90,
        bonusHp: 3,
        bonusAtk: 1,
      },
      {
        id: 'orb_c3_viento_puro',
        name: 'Orbe del Alumno Ágil',
        element: 'Viento',
        effect: 'Zancada Limpia: +2 HP y +1 Casilla extra sin coste de maná',
        price: 110,
        bonusHp: 2,
        bonusAtk: 1,
      },
      {
        id: 'orb_c3_luz_guia',
        name: 'Orbe de la Luz Serena',
        element: 'Luz',
        effect: 'Serenidad: +5 HP y regenera 1 HP por turno a su pieza Maestra',
        price: 130,
        bonusHp: 5,
        bonusAtk: 0,
      },
    ],
  },

  // -----------------------------------------------------------------------
  // CAMPAÑA 4: EL TRONO DE LAS SOMBRAS (Abismo, Nigromancia y Vacío)
  // Enfoque: Drenaje vital, daño diagonal, anulación de escudos y colapso cósmico
  // -----------------------------------------------------------------------
  3: {
    campaignIndex: 3,
    name: 'El Trono de las Sombras',
    subtitle: 'Noche Eterna, Vacío y Resonancia Abisal • 10% Probabilidad de Botín de Material Raro y Catalizadores',
    themeColor: '#c084fc',
    diceArchetype: 'Dados de Obsidiana del Vacío y Cripta',
    exclusiveDice: [
      {
        name: 'Dado de Obsidiana del Vacío',
        rarity: RARIDADES.EPICO,
        level: 4,
        specialTrait: 'Drenaje Sombrío: Roba 3 HP al dañar a cualquier criatura rival',
      },
      {
        name: 'Dado del Segador Nocturno',
        rarity: RARIDADES.LEGENDARIO,
        level: 5,
        specialTrait: 'Paso Furtivo: Se desplaza en diagonales ignorando muros y trampas',
      },
      {
        name: 'Dado Supremo del Trono Sombrío',
        rarity: RARIDADES.LEGENDARIO,
        level: 6,
        specialTrait: 'Ruina Cósmica: Anula escudos y destruye piezas de Nivel 1 al instante',
      },
    ],
    exclusiveOrbs: [
      {
        id: 'orb_c4_vampiro',
        name: 'Orbe de Sangre Abisal',
        element: 'Oscuro',
        effect: 'Vampirismo Mayor: +8 HP y restaura 3 HP al Rey con cada golpe',
        price: 450,
        bonusHp: 8,
        bonusAtk: 4,
      },
      {
        id: 'orb_c4_agujero_negro',
        name: 'Orbe de Singularidad Gravitatoria',
        element: 'Oscuro',
        effect: 'Colapso: +10 HP y arrastra a los enemigos cercanos hacia la criatura',
        price: 520,
        bonusHp: 10,
        bonusAtk: 3,
      },
      {
        id: 'orb_c4_trono_eterno',
        name: 'Orbe de la Corona del Abismo',
        element: 'Sombra',
        effect: 'Soberanía Sombría: +12 HP / +5 ATK y otorga resurrección con 1 HP',
        price: 600,
        bonusHp: 12,
        bonusAtk: 5,
      },
    ],
  },
};

// Generador de dado temático exclusivo al vencer en una campaña específica
export function generateCampaignThemedRewardDie(campaignIdx: number, levelBias: number): DieData {
  const profile = CAMPAIGN_EXCLUSIVES[campaignIdx] || CAMPAIGN_EXCLUSIVES[0];
  const list = profile.exclusiveDice;
  const picked = list[Math.floor(Math.random() * list.length)];

  return {
    id: `d_camp_${campaignIdx}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    name: picked.name,
    rarity: picked.rarity,
    level: Math.max(1, Math.min(6, picked.level + (levelBias >= 8 ? 1 : 0))),
    attachedOrbs: [],
    enMazo: false,
  };
}

// Generador de orbe temático exclusivo al vencer en una campaña específica
export function generateCampaignThemedRewardOrb(campaignIdx: number): Orb {
  const profile = CAMPAIGN_EXCLUSIVES[campaignIdx] || CAMPAIGN_EXCLUSIVES[0];
  const list = profile.exclusiveOrbs;
  const picked = list[Math.floor(Math.random() * list.length)];

  return {
    id: `o_camp_${campaignIdx}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    templateId: picked.templateId || picked.id,
    name: picked.name,
    element: picked.element,
    effect: picked.effect,
    price: picked.price,
    bonusHp: picked.bonusHp,
    bonusAtk: picked.bonusAtk,
    minHeroLevel: picked.minHeroLevel,
  };
}
