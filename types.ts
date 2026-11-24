// tslint:disable
/* eslint-disable */
/** 3D Vector. */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** 3D Position as a tuple. */
export type Position3D = [number, number, number];

/** Represents an object in the 3D scene. */
export interface Entity3D {
  id: string | number;
  type?: string;
  position: Vec3 | Position3D;
  rotation?: Vec3 | Position3D;
  scale?: Vec3 | Position3D;
  velocity?: Vec3;
  active?: boolean;
  [key: string]: any;
}

/** Represents a particle in a particle system. */
export interface Particle {
  id: string | number;
  position: Vec3 | Position3D;
  velocity?: Vec3 | Position3D;
  life: number;
  maxLife: number;
  color?: string;
  size?: number;
  [key: string]: any;
}

export interface Orb {
  id: string;
  templateId?: string;
  name: string;
  element: 'Fuego' | 'Hielo' | 'Rayo' | 'Oscuro' | 'Viento' | 'Tierra' | 'Sombra' | 'Luz' | 'Veneno' | 'Metal' | 'Cosmico';
  effect: string;
  price: number;
  bonusHp: number;
  bonusAtk: number;
  minHeroLevel?: number;
}

export interface DieRarity {
  name: 'Normal' | 'Raro' | 'Épico' | 'Legendario';
  slots: number;
  class: string;
  color: string;
}

export interface DieData {
  id: string;
  name: string;
  rarity: DieRarity;
  level: number;
  attachedOrbs: Orb[];
  enMazo: boolean;
  isLockedInlaid?: boolean;
  bonusHp?: number;
  bonusAtk?: number;
  discoveredAt?: number; // Marca temporal de adquisición para el Códice / Bestiario
}

export interface UnitData {
  id: string;
  nombre: string;
  nivel: number;
  maestria?: number;
  rangoNombre?: string;
  hpActual: number;
  hpMax: number;
  daño: number;
  dueño: 1 | 2; // 1 = Jugador, 2 = IA
  posicion: number; // Hex cell ID
  yaSeMovio: boolean;
  esMaestra: boolean;
  esAscendido: boolean;
  ascendidoTipo?: number;
  orbs?: Orb[];
  equippedOrbs?: Orb[];
  isFrozen?: boolean;
  hasShield?: boolean;
  shieldCharges?: number;
  gravityTurns?: number; // Turnos restantes del campo gravitatorio protector alrededor de la Maestra
  hasResurrected?: boolean; // Para habilidad de resurrección del Fénix Eterno
  bonusDamageNextTurn?: number; // Para Runa de Fuego (Lava) +2 ATK
  lastAttackSeq?: number; // Contador incremental exclusivo de ataques cuerpo a cuerpo para animar golpes sin dispararse al mover
}

export interface RolledDieResult {
  valor: number;
  tipo: string;
  emoji: string;
  color: string;
  dieRef?: DieData;
}

export interface FloatingText {
  id: string;
  text: string;
  color: string;
  position: [number, number, number];
  life: number;
  scale?: number;
}

export interface SpellVFX {
  id: string;
  type: 'rayo' | 'escudo' | 'transposicion' | 'juicio' | 'tormenta' | 'vinculo' | 'prision' | 'ira_ra' | 'gravedad' | 'supremo';
  origin: [number, number, number];
  target?: [number, number, number];
  color: string;
  startTime: number;
}

export type ColiseumDifficulty = 'NORMAL' | 'HEROICO' | 'PESADILLA';

export interface ColiseumModifier {
  id: string;
  title: string;
  desc: string;
  positive: boolean;
  statBonus: string;
}

export type AchievementTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'LEGEND';

export interface TierLevelData {
  tier: AchievementTier;
  levelNumber: number;
  tierName: string;
  conditionDesc: string;
  target: number;
  rewardGold: number;
  rewardMaterials: string;
  materialAwards?: Record<string, number>;
  badgeIcon: string;
  badgeColor: string;
}

export interface AchievementProgression {
  id: string;
  name: string;
  description: string;
  category: 'COMBATE' | 'COLECCIÓN' | 'CAMPAÑA' | 'MAESTRÍA' | 'COLISEO' | 'GRIMORIO' | 'FORJA';
  currentValue: number;
  unlockedLevel: number; // 0 = sin completar, 1 = Bronce, 2 = Plata, 3 = Oro, 4 = Leyenda
  claimedLevels: number[]; // niveles ya cobrados [1, 2, 3, 4]
  tiers: TierLevelData[];
}

export type HexRuneType = 'LAVA' | 'HEAL' | 'MANA';

export interface SpecialHexRune {
  hexId: number;
  type: HexRuneType;
  title: string;
  desc: string;
  color: string;
  emissive: string;
  symbol: string;
}

export interface CombatLogItem {
  id: string;
  text: string;
  color: string;
  timestamp: number;
}

export interface CityDialogueData {
  speaker: string;
  role: string;
  text: string;
  actionText?: string;
  action?: () => void;
  avatarImgUrl?: string;
  candidateAvatarUrls?: string[];
}

export interface BattleRewardModalData {
  exp: number;
  gold: number;
  leveledUp: boolean;
  newLevel?: number;
  gainedLevels?: number[];
  randomDie: {
    name: string;
    rarity: DieRarity;
    level: number;
  };
  randomOrb: Orb;
}

