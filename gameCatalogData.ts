import { Orb, DieRarity } from './types';

export const MAIN_RAW_BASE = 'https://raw.githubusercontent.com/endersonvivas48-oss/main/main';
export const MAIN_CDN_BASE = 'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main';
export const JUGADOR2_CDN_BASE = 'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/jugador-2@main';

export const RARIDADES: Record<string, DieRarity> = {
  NORMAL: { name: 'Normal', slots: 0, class: 'text-slate-300 border-slate-600', color: '#94a3b8' },
  RARO: { name: 'Raro', slots: 1, class: 'text-cyan-400 border-cyan-500', color: '#38bdf8' },
  EPICO: { name: 'Épico', slots: 2, class: 'text-purple-400 border-purple-500', color: '#c084fc' },
  LEGENDARIO: { name: 'Legendario', slots: 3, class: 'text-amber-400 border-amber-500', color: '#f59e0b' },
};

export interface CatalogPurchasableDie {
  key: string;
  name: string;
  rarity: DieRarity['name'];
  price: number;
  slots: number;
  color: string;
  desc: string;
}

// Fuente única de verdad para los 4 dados comprables en el Bazar de Salomón y listados en el Códice
export const CATALOG_PURCHASABLE_DICE: CatalogPurchasableDie[] = [
  {
    key: 'dado_normal',
    name: 'Dado Normal',
    rarity: 'Normal',
    price: 25,
    slots: 0,
    color: '#94a3b8',
    desc: 'Dado rúnico estándar equilibrado. Es el dado fundamental de la baraja para tiradas iniciales.',
  },
  {
    key: 'dado_raro',
    name: 'Dado Raro',
    rarity: 'Raro',
    price: 120,
    slots: 1,
    color: '#38bdf8',
    desc: 'Dado de cobre imbuido con 1 ranura arcana dorada. Permite engarzar un orbe elemental.',
  },
  {
    key: 'dado_epico',
    name: 'Dado Épico',
    rarity: 'Épico',
    price: 280,
    slots: 2,
    color: '#c084fc',
    desc: 'Dado forjado en el abismo con 2 ranuras completas para doble engarce y combinación de orbes.',
  },
  {
    key: 'dado_legendario',
    name: 'Dado Legendario',
    rarity: 'Legendario',
    price: 600,
    slots: 3,
    color: '#fbbf24',
    desc: 'Artefacto supremo del trono con 3 ranuras doradas. Desata el máximo potencial elemental.',
  },
];

export interface CatalogCreature {
  id: string;
  nivel: number;
  nombre: string;
  rango: string;
  hp: number;
  atk: number;
  mov: number;
  desc: string;
  color: string;
  imgUrl: string;
  candidateUrls?: string[];
}

export interface CatalogTitan {
  id: number;
  combination: string;
  roll?: string;
  name: string;
  element: string;
  hp: number;
  atk: number;
  color: string;
  habilidad: string;
  desc: string;
  imgUrl: string;
  candidateUrls?: string[];
}

export interface CatalogSpell {
  id: string;
  name: string;
  category: 'Básico' | 'Avanzado';
  cost: number;
  desc: string;
  icon: string;
  color: string;
  unlockedByDefault: boolean;
  price: number;
  minHeroLevel?: number;
}

export type SpellItem = CatalogSpell;

export interface CatalogMasteryTier {
  nombre: string;
  rango?: string;
  color: string;
  bonusHp: number;
  bonusAtk: number;
}

export const CATALOG_ASCENDED_TITANS: CatalogTitan[] = [
  {
    id: 1,
    combination: '1-1-1',
    roll: '1-1-1',
    name: 'Espectro del Vacío',
    element: 'Cósmico',
    hp: 40,
    atk: 6,
    color: '#a855f7',
    habilidad: 'Manto Cósmico: Otorga +2 de Maná inmediato al entrar al tablero.',
    desc: 'Entidad de las profundidades del cosmos.',
    imgUrl: `${MAIN_CDN_BASE}/asc1.webp`,
    candidateUrls: [
      `${MAIN_CDN_BASE}/asc1.webp`,
      `${MAIN_RAW_BASE}/asc1.webp`,
      `${MAIN_CDN_BASE}/ASC1.webp`,
      `${MAIN_RAW_BASE}/ASC1.webp`,
      `${JUGADOR2_CDN_BASE}/asc1.webp`,
      `${JUGADOR2_CDN_BASE}/asc1.png`,
      `./assets/asc1.webp`,
    ],
  },
  {
    id: 2,
    combination: '2-2-2',
    roll: '2-2-2',
    name: 'Guardián de Ra',
    element: 'Solar',
    hp: 45,
    atk: 5,
    color: '#fbbf24',
    habilidad: 'Barrera Solar Suprema: Otorga Escudo Sagrado a tu Rey que absorbe por completo el próximo ataque que reciba.',
    desc: 'Coloso forjado con la gloria del solsticio.',
    imgUrl: `${MAIN_CDN_BASE}/asc2.webp`,
    candidateUrls: [
      `${MAIN_CDN_BASE}/asc2.webp`,
      `${MAIN_RAW_BASE}/asc2.webp`,
      `${MAIN_CDN_BASE}/ASC2.webp`,
      `${MAIN_RAW_BASE}/ASC2.webp`,
      `${JUGADOR2_CDN_BASE}/asc2.webp`,
      `${JUGADOR2_CDN_BASE}/asc2.png`,
      `./assets/asc2.webp`,
    ],
  },
  {
    id: 3,
    combination: '3-3-3',
    roll: '3-3-3',
    name: 'Devorador de Sombras',
    element: 'Sombra',
    hp: 42,
    atk: 7,
    color: '#38bdf8',
    habilidad: 'Golpe Abisal: Emite una onda de choque que inflige 2 de daño directo a la criatura rival más cercana.',
    desc: 'Ser abisal engendrado en la noche perpetua.',
    imgUrl: `${MAIN_CDN_BASE}/asc3.webp`,
    candidateUrls: [
      `${MAIN_CDN_BASE}/asc3.webp`,
      `${MAIN_RAW_BASE}/asc3.webp`,
      `${MAIN_CDN_BASE}/ASC3.webp`,
      `${MAIN_RAW_BASE}/ASC3.webp`,
      `${JUGADOR2_CDN_BASE}/asc3.webp`,
      `${JUGADOR2_CDN_BASE}/asc3.png`,
      `./assets/asc3.webp`,
    ],
  },
  {
    id: 4,
    combination: '4-4-4',
    roll: '4-4-4',
    name: 'Titán de la Tormenta',
    element: 'Rayo',
    hp: 44,
    atk: 8,
    color: '#60a5fa',
    habilidad: 'Cólera del Trueno: Aturde a una criatura enemiga impidiéndole atacar en su próximo turno.',
    desc: 'Avatar celestial de relámpagos tempestuosos.',
    imgUrl: `${MAIN_CDN_BASE}/asc4.webp`,
    candidateUrls: [
      `${MAIN_CDN_BASE}/asc4.webp`,
      `${MAIN_RAW_BASE}/asc4.webp`,
      `${MAIN_CDN_BASE}/ASC4.webp`,
      `${MAIN_RAW_BASE}/ASC4.webp`,
      `${JUGADOR2_CDN_BASE}/asc4.webp`,
      `${JUGADOR2_CDN_BASE}/asc4.png`,
      `./assets/asc4.webp`,
    ],
  },
  {
    id: 5,
    combination: '5-5-5',
    roll: '5-5-5',
    name: 'Fénix Eterno',
    element: 'Fuego',
    hp: 38,
    atk: 7,
    color: '#f97316',
    habilidad: 'Renacer Ígneo: Si es derrotado, resucita de inmediato una vez por combate con 10 PV.',
    desc: 'Espíritu de resurrección y llamas inextinguibles.',
    imgUrl: `${MAIN_CDN_BASE}/asc5.webp`,
    candidateUrls: [
      `${MAIN_CDN_BASE}/asc5.webp`,
      `${MAIN_RAW_BASE}/asc5.webp`,
      `${MAIN_CDN_BASE}/ASC5.webp`,
      `${MAIN_RAW_BASE}/ASC5.webp`,
      `${JUGADOR2_CDN_BASE}/asc5.webp`,
      `${JUGADOR2_CDN_BASE}/asc5.png`,
      `./assets/asc5.webp`,
    ],
  },
  {
    id: 6,
    combination: '6-6-6',
    roll: '6-6-6',
    name: 'Señor del Juicio',
    element: 'Sagrado',
    hp: 50,
    atk: 9,
    color: '#e2e8f0',
    habilidad: 'Sentencia Definitiva: Inflige 4 de daño inmediato al Rey oponente si tiene criaturas a su alrededor.',
    desc: 'Juez supremo de los destinos de la arena.',
    imgUrl: `${MAIN_CDN_BASE}/asc6.webp`,
    candidateUrls: [
      `${MAIN_CDN_BASE}/asc6.webp`,
      `${MAIN_RAW_BASE}/asc6.webp`,
      `${MAIN_CDN_BASE}/ASC6.webp`,
      `${MAIN_RAW_BASE}/ASC6.webp`,
      `${JUGADOR2_CDN_BASE}/asc6.webp`,
      `${JUGADOR2_CDN_BASE}/asc6.png`,
      `./assets/asc6.webp`,
    ],
  },
];

export const CATALOG_CREATURES_J1: CatalogCreature[] = [
  {
    id: 'l1',
    nombre: 'Infantería de Bronce',
    nivel: 1,
    rango: 'Infantería',
    hp: 5,
    atk: 3,
    mov: 1,
    color: '#34d399',
    imgUrl: `${MAIN_CDN_BASE}/l1.webp`,
    candidateUrls: [
      `${MAIN_CDN_BASE}/l1.webp`,
      `${MAIN_RAW_BASE}/l1.webp`,
      `${MAIN_CDN_BASE}/L1.webp`,
      `${MAIN_CDN_BASE}/l1.png`,
      `./assets/l1.webp`,
    ],
    desc: 'Disciplinado guerrero elfo de bronce equipado con armadura ligera, casco ceremonial, lanza de vanguardia y escudo redondo con el blasón de la hoja. Ideal para sostener la primera línea defensiva y bloquear el paso.',
  },
  {
    id: 'l2',
    nombre: 'Oficial Silvano',
    nivel: 2,
    rango: 'Oficial',
    hp: 7,
    atk: 4,
    mov: 1,
    color: '#38bdf8',
    imgUrl: `${MAIN_CDN_BASE}/l2.webp`,
    candidateUrls: [
      `${MAIN_CDN_BASE}/l2.webp`,
      `${MAIN_RAW_BASE}/l2.webp`,
      `${MAIN_CDN_BASE}/L2.webp`,
      `${MAIN_CDN_BASE}/l2.png`,
      `./assets/l2.webp`,
    ],
    desc: 'Estratega y cazador élfico con armadura grabada, arco recurvo corto, espada ligera a la cintura y carcaj repleto de flechas. Unidad versátil para presionar el mapa y brindar apoyo táctico en fases intermedias.',
  },
  {
    id: 'l3',
    nombre: 'Caballero del León',
    nivel: 3,
    rango: 'Caballero',
    hp: 9,
    atk: 5,
    mov: 1,
    color: '#818cf8',
    imgUrl: `${MAIN_CDN_BASE}/l3.webp`,
    candidateUrls: [
      `${MAIN_CDN_BASE}/l3.webp`,
      `${MAIN_RAW_BASE}/l3.webp`,
      `${MAIN_CDN_BASE}/L3.webp`,
      `${MAIN_CDN_BASE}/l3.png`,
      `./assets/l3.webp`,
    ],
    desc: 'Imponente guerrero pesado en placas completas con relieves, yelmo con visera de calavera y escudo gótico con el león heráldico. Fuerza de choque que rompe defensas enemigas mediante maniobras de flanqueo.',
  },
  {
    id: 'l4',
    nombre: 'Arquero de Élite',
    nivel: 4,
    rango: 'Arquero',
    hp: 11,
    atk: 6,
    mov: 2,
    color: '#fbbf24',
    imgUrl: `${MAIN_CDN_BASE}/l4.webp`,
    candidateUrls: [
      `${MAIN_CDN_BASE}/l4.webp`,
      `${MAIN_RAW_BASE}/l4.webp`,
      `${MAIN_CDN_BASE}/L4.webp`,
      `${MAIN_CDN_BASE}/l4.png`,
      `./assets/l4.webp`,
    ],
    desc: 'Tirador experto de rasgos élficos con arco largo de precisión y flechas gemelas listas para disparar. Domina el control del terreno con movimiento veloz de 2 casillas para cazar objetivos clave a salvo.',
  },
  {
    id: 'l5',
    nombre: 'Mago del Grimorio',
    nivel: 5,
    rango: 'Mago',
    hp: 13,
    atk: 7,
    mov: 2,
    color: '#f43f5e',
    imgUrl: `${MAIN_CDN_BASE}/l5.webp`,
    candidateUrls: [
      `${MAIN_CDN_BASE}/l5.webp`,
      `${MAIN_RAW_BASE}/l5.webp`,
      `${MAIN_CDN_BASE}/L5.webp`,
      `${MAIN_CDN_BASE}/l5.png`,
      `./assets/l5.webp`,
    ],
    desc: 'Erudito de las artes arcanas en túnicas ceremoniales labradas. Empuña un grimorio abierto con conjuros milenarios y un báculo rematado por una gema negra flotante. Canalizador místico de alto alcance.',
  },
  {
    id: 'l6',
    nombre: 'Reina del Trono Astral',
    nivel: 6,
    rango: 'Pieza Maestra',
    hp: 15,
    atk: 8,
    mov: 2,
    color: '#38bdf8',
    imgUrl: `${MAIN_CDN_BASE}/l6.webp`,
    candidateUrls: [
      `${MAIN_CDN_BASE}/l6.webp`,
      `${MAIN_RAW_BASE}/l6.webp`,
      `${MAIN_CDN_BASE}/L6.webp`,
      `${MAIN_CDN_BASE}/l6.png`,
      `./assets/l6.webp`,
    ],
    desc: 'Figura soberana de ultratumba coronada sobre un semblante místico. Empuña la gran espada de rey, un cetro de mando real decorado y pechera con el león del legado. Pieza central y corazón vital de la estrategia.',
  },
];

export const CATALOG_CREATURES_J2: CatalogCreature[] = [
  {
    id: 'j2_l1',
    nombre: 'Esbirro de las Sombras',
    nivel: 1,
    rango: 'Infantería',
    hp: 5,
    atk: 3,
    mov: 1,
    color: '#f43f5e',
    imgUrl: `${JUGADOR2_CDN_BASE}/l1.webp`,
    desc: 'Guerrero de choque convocado por el contrincante para presionar la vanguardia.',
  },
  {
    id: 'j2_l2',
    nombre: 'Ballestero Oscuro',
    nivel: 2,
    rango: 'Tirador',
    hp: 7,
    atk: 4,
    mov: 1,
    color: '#f43f5e',
    imgUrl: `${JUGADOR2_CDN_BASE}/l2.webp`,
    desc: 'Cazador furtivo con saetas de fuego negro que amenazan desde la retaguardia.',
  },
  {
    id: 'j2_l3',
    nombre: 'Caballero Negro',
    nivel: 3,
    rango: 'Caballero',
    hp: 9,
    atk: 5,
    mov: 1,
    color: '#f43f5e',
    imgUrl: `${JUGADOR2_CDN_BASE}/l3.webp`,
    desc: 'Coloso acorazado con armadura y escudo de obsidiana pesada.',
  },
  {
    id: 'j2_l4',
    nombre: 'Acechador Umbrío',
    nivel: 4,
    rango: 'Asesino',
    hp: 11,
    atk: 6,
    mov: 2,
    color: '#f43f5e',
    imgUrl: `${JUGADOR2_CDN_BASE}/l4.webp`,
    desc: 'Unidad ágil de 2 casillas de movimiento especializada en flanquear piezas maestras.',
  },
  {
    id: 'j2_l5',
    nombre: 'Señor de la Ceniza',
    nivel: 5,
    rango: 'Comandante',
    hp: 13,
    atk: 7,
    mov: 2,
    color: '#f43f5e',
    imgUrl: `${JUGADOR2_CDN_BASE}/l5.webp`,
    desc: 'Comandante armado con espada de fuego infernal y aura ardiente.',
  },
  {
    id: 'j2_l6',
    nombre: 'Leviatán del Abismo',
    nivel: 6,
    rango: 'Pieza Maestra',
    hp: 15,
    atk: 8,
    mov: 2,
    color: '#f43f5e',
    imgUrl: `${JUGADOR2_CDN_BASE}/l6.webp`,
    desc: 'La criatura mortal suprema del Invocador Rival, engendro ancestral de la noche.',
  },
];

export const CATALOG_GRIMOIRE_SPELLS: Record<string, CatalogSpell> = {
  rayo: {
    id: 'rayo',
    name: 'Relámpago',
    category: 'Básico',
    cost: 2,
    desc: 'Quita 2 HP a una unidad enemiga situada a un rango máximo de 3 celdas de tu pieza Maestra.',
    icon: '⚡',
    color: '#38bdf8',
    unlockedByDefault: false,
    price: 100,
    minHeroLevel: 1,
  },
  escudo: {
    id: 'escudo',
    name: 'Escudo',
    category: 'Básico',
    cost: 2,
    desc: 'Otorga un escudo de energía a una unidad aliada, anulando por completo el próximo daño o ataque que reciba.',
    icon: '🛡️',
    color: '#34d399',
    unlockedByDefault: false,
    price: 100,
    minHeroLevel: 1,
  },
  transposicion: {
    id: 'transposicion',
    name: 'Transposición',
    category: 'Básico',
    cost: 3,
    desc: 'Permite seleccionar dos piezas en el tablero e intercambiar sus posiciones de forma instantánea.',
    icon: '🔄',
    color: '#a78bfa',
    unlockedByDefault: false,
    price: 150,
    minHeroLevel: 1,
  },
  juicio: {
    id: 'juicio',
    name: 'Juicio',
    category: 'Básico',
    cost: 4,
    desc: 'Destruye y elimina de forma instantánea a un enemigo que se encuentre dentro del rango de ataque de tu unidad.',
    icon: '⚖️',
    color: '#fbbf24',
    unlockedByDefault: false,
    price: 250,
    minHeroLevel: 1,
  },
  tormenta: {
    id: 'tormenta',
    name: 'Tormenta',
    category: 'Avanzado',
    cost: 3,
    desc: 'Desata una ráfaga que inflige 1 punto de daño a todos los enemigos en el tablero simultáneamente.',
    icon: '🌪️',
    color: '#60a5fa',
    unlockedByDefault: false,
    price: 200,
    minHeroLevel: 10,
  },
  vinculo: {
    id: 'vinculo',
    name: 'Vínculo',
    category: 'Avanzado',
    cost: 2,
    desc: 'Sacrifica voluntariamente a una criatura aliada que no sea Maestra para curar 5 puntos de HP a tu pieza Maestra.',
    icon: '🩸',
    color: '#f43f5e',
    unlockedByDefault: false,
    price: 220,
    minHeroLevel: 10,
  },
  prision: {
    id: 'prision',
    name: 'Prisión',
    category: 'Avanzado',
    cost: 3,
    desc: 'Encierra a una criatura enemiga, dejándola inmovilizada y sin poder actuar durante 2 turnos.',
    icon: '⛓️',
    color: '#94a3b8',
    unlockedByDefault: false,
    price: 260,
    minHeroLevel: 10,
  },
  ira_ra: {
    id: 'ira_ra',
    name: 'Ira de Ra',
    category: 'Avanzado',
    cost: 4,
    desc: 'Provoca una devastadora línea de fuego que inflige 4 puntos de daño a cualquier unidad situada en toda la fila o columna del objetivo.',
    icon: '🔥',
    color: '#f97316',
    unlockedByDefault: false,
    price: 320,
    minHeroLevel: 10,
  },
  gravedad: {
    id: 'gravedad',
    name: 'Gravedad',
    category: 'Avanzado',
    cost: 3,
    desc: 'Bloquea temporalmente las casillas adyacentes a tu Maestra, impidiendo el paso o acercamiento de los rivales.',
    icon: '🌌',
    color: '#818cf8',
    unlockedByDefault: false,
    price: 280,
    minHeroLevel: 10,
  },
  supremo: {
    id: 'supremo',
    name: 'Sentencia Sagrada',
    category: 'Avanzado',
    cost: 5,
    desc: 'El hechizo definitivo. Elimina de manera fulminante a la criatura rival más fuerte (con mayor nivel) que esté en el tablero.',
    icon: '🌟',
    color: '#e2e8f0',
    unlockedByDefault: false,
    price: 500,
    minHeroLevel: 10,
  },
};

export const CATALOG_MASTERY_TIERS: Record<number, CatalogMasteryTier> = {
  1: { nombre: 'Iniciado', rango: 'Iniciado', color: '#94a3b8', bonusHp: 0, bonusAtk: 0 },
  2: { nombre: 'Novato', rango: 'Novato', color: '#38bdf8', bonusHp: 1, bonusAtk: 0 },
  3: { nombre: 'Veterano', rango: 'Veterano', color: '#10b981', bonusHp: 2, bonusAtk: 1 },
  4: { nombre: 'Élite', rango: 'Élite', color: '#818cf8', bonusHp: 3, bonusAtk: 1 },
  5: { nombre: 'Experto', rango: 'Experto', color: '#c084fc', bonusHp: 4, bonusAtk: 1 },
  6: { nombre: 'Maestro', rango: 'Maestro', color: '#fbbf24', bonusHp: 5, bonusAtk: 2 },
};

export function calculateCreatureStats(nivelBase: number, maestriaVal: number) {
  const tier = CATALOG_MASTERY_TIERS[maestriaVal] || CATALOG_MASTERY_TIERS[1];
  const baseHp = nivelBase * 2 + 3;
  const baseAtk = Math.max(2, nivelBase + 2);
  return {
    hp: baseHp + tier.bonusHp,
    atk: baseAtk + tier.bonusAtk,
    rangoNombre: tier.nombre || tier.rango || 'Iniciado',
    rangoColor: tier.color,
  };
}

export const CATALOG_ELEMENT_ORBS: Orb[] = [
  { id: 'o1', name: 'Orbe de Fuego', element: 'Fuego', effect: '+3 HP / +1 ATK', price: 100, bonusHp: 3, bonusAtk: 1, minHeroLevel: 1 },
  { id: 'o2', name: 'Orbe de Hielo', element: 'Hielo', effect: 'Congela / Daño reducido', price: 100, bonusHp: 2, bonusAtk: 0, minHeroLevel: 1 },
  { id: 'o3', name: 'Orbe de Rayo', element: 'Rayo', effect: 'Movimiento extra (+1)', price: 120, bonusHp: 1, bonusAtk: 1, minHeroLevel: 3 },
  { id: 'o4', name: 'Orbe Vampírico', element: 'Oscuro', effect: 'Robo de vida al atacar (+2 HP)', price: 200, bonusHp: 4, bonusAtk: 2, minHeroLevel: 5 },
  { id: 'o5', name: 'Orbe de Viento', element: 'Viento', effect: '+2 ATK de iniciativa aérea', price: 160, bonusHp: 2, bonusAtk: 2, minHeroLevel: 4 },
  { id: 'o6', name: 'Orbe de Tierra', element: 'Tierra', effect: '+6 HP de bastión pétreo', price: 180, bonusHp: 6, bonusAtk: 0, minHeroLevel: 6 },
  { id: 'o7', name: 'Orbe Venenoso', element: 'Veneno', effect: '+3 ATK corrosivo continuo', price: 220, bonusHp: 2, bonusAtk: 3, minHeroLevel: 7 },
  { id: 'o8', name: 'Orbe de Luz Solar', element: 'Luz', effect: '+5 HP / +2 ATK sagrado', price: 260, bonusHp: 5, bonusAtk: 2, minHeroLevel: 8 },
  { id: 'o9', name: 'Orbe de Metal', element: 'Metal', effect: '+7 HP / +1 ATK armadura', price: 300, bonusHp: 7, bonusAtk: 1, minHeroLevel: 9 },
  { id: 'o10', name: 'Orbe Cósmico Supremo', element: 'Cosmico', effect: '+8 HP / +3 ATK celestial', price: 450, bonusHp: 8, bonusAtk: 3, minHeroLevel: 10 },
];
