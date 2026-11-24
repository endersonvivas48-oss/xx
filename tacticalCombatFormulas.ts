import { UnitData } from './types';

export interface AttackDamageCalculationResult {
  baseAttack: number;
  effectiveDmg: number;
  extraOrbDamage: number;
  weatherTacticalBonus: number;
  lavaDamageBonus: number;
  shieldReduction: number;
  shieldNote: string;
  shieldBrokenDefender: boolean;
  fireResidualDmg: number;
  poisonDmg: number;
  totalEstimatedDamage: number;
  remainingHp: number;
  willFall: boolean;
  isPhoenixWillResurrect?: boolean;
  hasVampiric: boolean;
  hasFrost: boolean;
  hasFire: boolean;
  hasPoison: boolean;
  hasLightning: boolean;
  hasSolarLight: boolean;
  hasCosmic: boolean;
  hasSingularity: boolean;
  vampiricHealAmount: number;
}

/**
 * Función centralizada y canónica para calcular el daño de ataque cuerpo a cuerpo
 * en armonía estricta entre executeMeleeAttack (App.tsx), combatStateMachine.ts,
 * combatEngine.ts, la tarjeta lateral (CombatArenaView.tsx) y el arco / indicador 3D (Game.tsx).
 */
export function calculateAttackDamagePreview(
  attacker: UnitData,
  defender: UnitData,
  cityTimeOfDay: 0 | 1 | 2 = 0,
  extraBonusDamage: number = 0
): AttackDamageCalculationResult {
  const attackerOrbs = attacker.equippedOrbs || attacker.orbs || [];
  const matchesOrbTemplate = (o: NonNullable<UnitData['equippedOrbs']>[number], templateId: string, nameFragment?: string) =>
    o.id === templateId ||
    o.templateId === templateId ||
    Boolean(nameFragment && (o.name || '').toLowerCase().includes(nameFragment));

  const hasVampiric = attackerOrbs.some(
    (o) =>
      matchesOrbTemplate(o, 'o4') ||
      matchesOrbTemplate(o, 'orb_c4_vampiro', 'sangre abisal') ||
      matchesOrbTemplate(o, 'orb_c4_trono_eterno', 'corona del abismo') ||
      o.element === 'Oscuro' ||
      (o.effect && o.effect.includes('Roba')) ||
      (o.effect && o.effect.includes('Robo'))
  );
  const hasFrost = attackerOrbs.some(
    (o) => matchesOrbTemplate(o, 'o2') || matchesOrbTemplate(o, 'orb_c2_glaciar', 'glacial cero') || o.element === 'Hielo'
  );
  const hasFire = attackerOrbs.some(
    (o) => matchesOrbTemplate(o, 'o1') || matchesOrbTemplate(o, 'orb_c2_ignis', 'fuego vivo') || o.element === 'Fuego'
  );
  const hasPoison = attackerOrbs.some(
    (o) => matchesOrbTemplate(o, 'o7') || o.element === 'Veneno'
  );
  const hasLightning = attackerOrbs.some(
    (o) => matchesOrbTemplate(o, 'o3') || matchesOrbTemplate(o, 'recipe_orb_rayo_arcano', 'rayo arcano') || o.element === 'Rayo'
  );
  const hasSolarLight = attackerOrbs.some(
    (o) => matchesOrbTemplate(o, 'o8') || o.element === 'Luz'
  );
  const hasCosmic = attackerOrbs.some(
    (o) => matchesOrbTemplate(o, 'o10') || o.element === 'Cosmico'
  );
  const hasSingularity = attackerOrbs.some(
    (o) => matchesOrbTemplate(o, 'orb_c4_agujero_negro', 'singularidad gravitatoria')
  );

  let extraOrbDamage = 0;
  if (hasSolarLight) extraOrbDamage += 1;
  if (hasCosmic) extraOrbDamage += 2;
  if (hasSingularity) extraOrbDamage += 3;

  let weatherTacticalBonus = 0;
  if (cityTimeOfDay === 1 && hasFire) {
    weatherTacticalBonus += 1;
  } else if (cityTimeOfDay === 2 && (hasVampiric || hasFrost)) {
    weatherTacticalBonus += 1;
  }

  const lavaDamageBonus = attacker.bonusDamageNextTurn || 0;
  const rawAttack = (attacker.daño || 1) + lavaDamageBonus + extraOrbDamage + weatherTacticalBonus + extraBonusDamage;
  const baseAttack = Math.max(1, rawAttack);

  let effectiveDmg = baseAttack;
  let shieldReduction = 0;
  let shieldNote = '';
  const shieldBrokenDefender = Boolean(defender.hasShield);

  if (defender.hasShield) {
    if (defender.esMaestra) {
      shieldReduction = effectiveDmg;
      effectiveDmg = 0;
      shieldNote = ' (Escudo: 0 Daño)';
    } else {
      shieldReduction = Math.min(4, effectiveDmg);
      effectiveDmg = Math.max(0, baseAttack - 4);
      shieldNote = ' (Escudo -4)';
    }
  }

  const fireResidualDmg = hasFire ? 1 : 0;
  const poisonDmg = hasPoison ? 1 : 0;
  const totalEstimatedDamage = effectiveDmg + fireResidualDmg + poisonDmg;
  const remainingHp = Math.max(0, defender.hpActual - totalEstimatedDamage);
  const isPhoenixWillResurrect = Boolean(
    remainingHp <= 0 &&
    !defender.esMaestra &&
    defender.esAscendido &&
    defender.ascendidoTipo === 5 &&
    !defender.hasResurrected
  );
  const willFall = remainingHp <= 0 && !isPhoenixWillResurrect;

  const vampiricHealBase = cityTimeOfDay === 2 ? 3 : 2;
  const vampiricHealAmount =
    hasVampiric && attacker.hpActual < attacker.hpMax
      ? Math.min(attacker.hpMax - attacker.hpActual, vampiricHealBase)
      : 0;

  return {
    baseAttack,
    effectiveDmg,
    extraOrbDamage,
    weatherTacticalBonus,
    lavaDamageBonus,
    shieldReduction,
    shieldNote,
    shieldBrokenDefender,
    fireResidualDmg,
    poisonDmg,
    totalEstimatedDamage,
    remainingHp,
    willFall,
    isPhoenixWillResurrect,
    hasVampiric,
    hasFrost,
    hasFire,
    hasPoison,
    hasLightning,
    hasSolarLight,
    hasCosmic,
    hasSingularity,
    vampiricHealAmount,
  };
}

export interface SpellDamageResult {
  effectiveDmg: number;
  shieldBroken: boolean;
  remainingHp: number;
}

export function getUnitShieldCharges(unit: Pick<UnitData, 'hasShield' | 'shieldCharges'>): number {
  if (!unit.hasShield && !(unit.shieldCharges && unit.shieldCharges > 0)) return 0;
  return Math.max(1, unit.shieldCharges ?? 1);
}

export function consumeUnitShieldCharge(unit: Pick<UnitData, 'hasShield' | 'shieldCharges'>): {
  hasShield: boolean;
  shieldCharges: number;
} {
  const remaining = Math.max(0, getUnitShieldCharges(unit) - 1);
  return {
    hasShield: remaining > 0,
    shieldCharges: remaining,
  };
}

/**
 * Resolución canónica de daño de hechizos considerando el estado `hasShield`
 * (compartida entre hechizos del jugador y de la IA).
 * - En Pieza Maestra: el Escudo absorbe el 100% del daño del hechizo y se consume.
 * - En criaturas estándar: el Escudo absorbe hasta 4 puntos de daño y se consume.
 */
export function calculateSpellDamageWithShield(
  target: UnitData,
  rawDamage: number
): SpellDamageResult {
  const shieldBroken = Boolean(target.hasShield);
  let effectiveDmg = Math.max(0, rawDamage);

  if (shieldBroken) {
    effectiveDmg = target.esMaestra ? 0 : Math.max(0, effectiveDmg - 4);
  }

  const remainingHp = Math.max(0, target.hpActual - effectiveDmg);
  return {
    effectiveDmg,
    shieldBroken,
    remainingHp,
  };
}

/**
 * Resolución canónica del daño directo de entrada de los Titanes #3 y #4:
 * - Aplica daño directo tanto a súbditos como a la Maestra rival, permitiendo rematarla si llega a 0 HP.
 * - Respeta la resurrección única del Fénix Eterno (#5) en súbditos no Maestros.
 */
export function calculateTitanEntryDirectDamageHp(
  target: Pick<UnitData, 'hpActual' | 'esMaestra' | 'esAscendido' | 'ascendidoTipo' | 'hasResurrected'>,
  damage: number = 2
): { nextHp: number; defeatedMinion: boolean; defeatedMaster: boolean; phoenixResurrected: boolean } {
  const rawRemaining = Math.max(0, target.hpActual - damage);
  if (target.esMaestra) {
    return {
      nextHp: rawRemaining,
      defeatedMinion: false,
      defeatedMaster: rawRemaining <= 0,
      phoenixResurrected: false,
    };
  }
  if (
    rawRemaining <= 0 &&
    target.esAscendido &&
    target.ascendidoTipo === 5 &&
    !target.hasResurrected
  ) {
    return {
      nextHp: 10,
      defeatedMinion: false,
      defeatedMaster: false,
      phoenixResurrected: true,
    };
  }
  return {
    nextHp: rawRemaining,
    defeatedMinion: rawRemaining <= 0,
    defeatedMaster: false,
    phoenixResurrected: false,
  };
}

