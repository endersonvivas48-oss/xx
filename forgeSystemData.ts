import { Orb } from './types';

export interface ForgeMaterial {
  id: string;
  name: string;
  category: 'MINERAL' | 'ESSENCE' | 'RUNE' | 'CATALYST';
  icon: string;
  description: string;
  buyPrice: number;
  sellPrice: number;
  rarityColor: string;
  // Efectos especiales al usarse como catalizador: CADA UNO DA EXACTAMENTE 1 CARACTERÍSTICA ÚNICA
  isCatalyst?: boolean;
  guaranteesSuccess?: boolean; // Única característica: Garantiza 100% de éxito
  bonusHp?: number;             // Única característica: +HP Máximo permanente
  bonusAtk?: number;            // Única característica: +ATK permanente
  bonusSlots?: number;          // Única característica: +1 Ranura extra de orbe
}

export const FORGE_MATERIALS: Record<string, ForgeMaterial> = {
  // 1. Materiales Base de Recetas (Precios actualizados)
  obsidiana_sombras: {
    id: 'obsidiana_sombras',
    name: 'Obsidiana de las Sombras',
    category: 'MINERAL',
    icon: '🖤',
    description: 'Mineral volcánico impregnado con energía del Trono de las Sombras. Base estructural de dados raros.',
    buyPrice: 220,
    sellPrice: 110,
    rarityColor: '#94a3b8',
  },
  polvo_astral: {
    id: 'polvo_astral',
    name: 'Polvo de Estrella Astral',
    category: 'ESSENCE',
    icon: '✨',
    description: 'Partículas celestiales que enlazan runas y orbes mágicos. Esencial para forja de orbes y dados.',
    buyPrice: 320,
    sellPrice: 160,
    rarityColor: '#38bdf8',
  },
  lingote_runico: {
    id: 'lingote_runico',
    name: 'Lingote Rúnico Primordial',
    category: 'MINERAL',
    icon: '🧱',
    description: 'Metal sagrado fundido en fraguas celestes. Permite forjar dados Épicos y Legendarios con alta potencia.',
    buyPrice: 480,
    sellPrice: 240,
    rarityColor: '#a855f7',
  },
  chispa_vacio: {
    id: 'chispa_vacio',
    name: 'Chispa del Vacío',
    category: 'ESSENCE',
    icon: '🔮',
    description: 'Esencia purificada extraída de los duelistas de la Campaña 4. Catalizador de artefactos legendarios.',
    buyPrice: 650,
    sellPrice: 325,
    rarityColor: '#ec4899',
  },
  cristal_eterio: {
    id: 'cristal_eterio',
    name: 'Cristal Etéreo Pulsante',
    category: 'MINERAL',
    icon: '💎',
    description: 'Cristal transparente que vibra con armonía pura. Incrementa la solidez de las caras y aristas del dado.',
    buyPrice: 550,
    sellPrice: 275,
    rarityColor: '#06b6d4',
  },
  lagrima_fenix: {
    id: 'lagrima_fenix',
    name: 'Lágrima Ígnea del Fénix',
    category: 'ESSENCE',
    icon: '🔥',
    description: 'Fuego líquido condensado. Aumenta la resonancia mágica en las forjas arcanas.',
    buyPrice: 620,
    sellPrice: 310,
    rarityColor: '#f97316',
  },

  // 2. CATALIZADORES ESPECIALES DE ALTO VALOR (Artefactos sagrados de gran prestigio)
  piedra_filosofal_astral: {
    id: 'piedra_filosofal_astral',
    name: 'Piedra Filosofal Astral',
    category: 'CATALYST',
    icon: '🌟',
    description: 'Característica única: ¡GARANTIZA 100% ÉXITO! Elimina por completo el riesgo de fallo en la forja.',
    buyPrice: 1200,
    sellPrice: 600,
    rarityColor: '#eab308',
    isCatalyst: true,
    guaranteesSuccess: true, // SOLO éxito garantizado
  },
  nucleo_adamantio_puro: {
    id: 'nucleo_adamantio_puro',
    name: 'Núcleo de Adamantio Puro',
    category: 'CATALYST',
    icon: '🛡️',
    description: 'Característica única: Otorga +5 HP MÁXIMO permanente al dado u orbe forjado.',
    buyPrice: 850,
    sellPrice: 425,
    rarityColor: '#10b981',
    isCatalyst: true,
    bonusHp: 5, // SOLO vida
  },
  esencia_del_titan_belico: {
    id: 'esencia_del_titan_belico',
    name: 'Esencia del Titán Bélico',
    category: 'CATALYST',
    icon: '⚔️',
    description: 'Característica única: Concede +4 ATK permanente de ataque al dado u orbe forjado.',
    buyPrice: 900,
    sellPrice: 450,
    rarityColor: '#ef4444',
    isCatalyst: true,
    bonusAtk: 4, // SOLO ataque
  },
  orbe_de_ranura_ancestral: {
    id: 'orbe_de_ranura_ancestral',
    name: 'Sello de Ranura Ancestral',
    category: 'CATALYST',
    icon: '🌀',
    description: 'Característica única: Añade +1 RANURA EXTRA de orbe adicional al dado resultante.',
    buyPrice: 1400,
    sellPrice: 700,
    rarityColor: '#8b5cf6',
    isCatalyst: true,
    bonusSlots: 1, // SOLO ranura extra
  },
};

export interface ForgeRecipe {
  id: string;
  type: 'DIE' | 'ORB';
  name: string;
  description: string;
  baseSuccessRate: number; // Porcentaje base de éxito (ej. 75 = 75%)
  requiredMaterials: { materialId: string; amount: number }[];
  orbStats?: {
    element: Orb['element'];
    price: number;
    bonusHp: number;
    bonusAtk: number;
  };
  resultPreview: {
    name: string;
    icon: string;
    color: string;
    details: string;
  };
}

export const FORGE_RECIPES: ForgeRecipe[] = [
  {
    id: 'recipe_die_rare',
    type: 'DIE',
    name: 'Forjar Dado Raro de las Sombras',
    description: 'Crea un nuevo Dado Raro con 2 ranuras de orbes y alta potencia de invocación.',
    baseSuccessRate: 75,
    requiredMaterials: [
      { materialId: 'obsidiana_sombras', amount: 3 },
      { materialId: 'polvo_astral', amount: 2 },
    ],
    resultPreview: {
      name: 'Dado Raro Umbrío',
      icon: '🎲',
      color: '#38bdf8',
      details: 'Rareza Rara • Nivel 2 • 2 Ranuras',
    },
  },
  {
    id: 'recipe_die_epic',
    type: 'DIE',
    name: 'Forjar Dado Épico Astral',
    description: 'Forja un potente Dado Épico con 3 ranuras de orbes y maestría militar garantizada.',
    baseSuccessRate: 60,
    requiredMaterials: [
      { materialId: 'obsidiana_sombras', amount: 4 },
      { materialId: 'lingote_runico', amount: 3 },
      { materialId: 'polvo_astral', amount: 3 },
    ],
    resultPreview: {
      name: 'Dado Épico del Abismo',
      icon: '🎲',
      color: '#c084fc',
      details: 'Rareza Épica • Nivel 3 • 3 Ranuras',
    },
  },
  {
    id: 'recipe_die_legendary',
    type: 'DIE',
    name: 'Forjar Dado Legendario del Trono',
    description: 'Obra maestra de la herrería astral: un Dado Legendario con 4 ranuras de orbe máximas.',
    baseSuccessRate: 45,
    requiredMaterials: [
      { materialId: 'lingote_runico', amount: 5 },
      { materialId: 'chispa_vacio', amount: 4 },
      { materialId: 'polvo_astral', amount: 5 },
    ],
    resultPreview: {
      name: 'Dado Legendario del Trono Sombrío',
      icon: '🎲',
      color: '#fbbf24',
      details: 'Rareza Legendaria • Nivel 4 • 4 Ranuras Máximas',
    },
  },
  {
    id: 'recipe_orb_vampirico',
    type: 'ORB',
    name: 'Cristalizar Orbe Vampírico',
    description: 'Sintetiza un orbe que drena vida enemiga y cura a la criatura invocadora al atacar.',
    baseSuccessRate: 70,
    requiredMaterials: [
      { materialId: 'obsidiana_sombras', amount: 3 },
      { materialId: 'chispa_vacio', amount: 2 },
    ],
    orbStats: {
      element: 'Oscuro',
      price: 250,
      bonusHp: 3,
      bonusAtk: 2,
    },
    resultPreview: {
      name: 'Orbe Vampírico de las Sombras',
      icon: '🩸',
      color: '#f43f5e',
      details: 'Drenaje: Roba 2 HP del objetivo al golpear',
    },
  },
  {
    id: 'recipe_orb_rayo_arcano',
    type: 'ORB',
    name: 'Cristalizar Orbe de Rayo Astral',
    description: 'Sintetiza un orbe de movilidad que otorga +1 casilla de desplazamiento adicional.',
    baseSuccessRate: 70,
    requiredMaterials: [
      { materialId: 'polvo_astral', amount: 4 },
      { materialId: 'lingote_runico', amount: 2 },
    ],
    orbStats: {
      element: 'Rayo',
      price: 250,
      bonusHp: 3,
      bonusAtk: 1,
    },
    resultPreview: {
      name: 'Orbe de Rayo Celestial',
      icon: '⚡',
      color: '#eab308',
      details: 'Movilidad: +1 Casilla extra de movimiento',
    },
  },
  {
    id: 'recipe_orb_escudo_titan',
    type: 'ORB',
    name: 'Cristalizar Orbe Titán Protector',
    description: 'Otorga un escudo abrumador de absorción y +6 HP Máximo para la criatura.',
    baseSuccessRate: 50,
    requiredMaterials: [
      { materialId: 'lingote_runico', amount: 3 },
      { materialId: 'chispa_vacio', amount: 2 },
      { materialId: 'polvo_astral', amount: 3 },
    ],
    orbStats: {
      element: 'Tierra',
      price: 250,
      bonusHp: 6,
      bonusAtk: 1,
    },
    resultPreview: {
      name: 'Orbe del Bastión Eterno',
      icon: '🛡️',
      color: '#10b981',
      details: 'Defensa: +6 HP y Escudo Arcano permanente al invocar',
    },
  },
];
