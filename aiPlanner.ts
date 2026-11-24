import { UnitData } from './types';
import { getHexDistance, HEX_MAP } from './hexGrid';

export type AiTactic =
  | 'AGGRESSIVE_ASSASSIN'
  | 'DEFENSIVE_TANK'
  | 'SPELL_CONTROL'
  | 'TRAP_AMBUSH'
  | 'BALANCED'
  | 'TITAN_COLOSSUS'
  | 'ENDGAME_BOSS';

export interface AiUnitActionPlan {
  type: 'ATTACK' | 'MOVE' | 'PASS';
  targetUnit?: UnitData;
  bestMoveHex?: number;
}

/**
 * Planificador táctico puro de la IA para una unidad
 */
export function planAiUnitAction(
  aiU: UnitData,
  unitsSnapshot: UnitData[]
): AiUnitActionPlan {
  const currentPos = aiU.posicion;

  // 1. Verificar si hay un enemigo en rango cuerpo a cuerpo adyacente (distancia = 1)
  const adjacentEnemies = unitsSnapshot.filter(
    (u) => u.dueño === 1 && getHexDistance(currentPos, u.posicion) === 1
  );

  if (adjacentEnemies.length > 0) {
    // Prioridad: Matar primero a la Pieza Maestra enemiga si está en rango
    adjacentEnemies.sort((a, b) => {
      if (a.esMaestra) return -1;
      if (b.esMaestra) return 1;
      return a.hpActual - b.hpActual;
    });

    return {
      type: 'ATTACK',
      targetUnit: adjacentEnemies[0],
    };
  }

  // Maestras rivales con campo de Gravedad activo bloquean las casillas adyacentes
  const enemyGravityMasters = unitsSnapshot.filter(
    (u) => u.dueño !== aiU.dueño && u.esMaestra && (u.gravityTurns || 0) > 0
  );
  const isBlockedByGravity = (hex: number): boolean =>
    enemyGravityMasters.some((gm) => getHexDistance(gm.posicion, hex) === 1);

  // 2. Si no hay enemigo adyacente, buscar el enemigo accesible más cercano
  const allEnemies = unitsSnapshot.filter((u) => u.dueño === 1);
  if (allEnemies.length === 0) {
    return { type: 'PASS' };
  }

  allEnemies.sort((a, b) => {
    const aGravityLocked = a.esMaestra && (a.gravityTurns || 0) > 0 && getHexDistance(currentPos, a.posicion) <= 2;
    const bGravityLocked = b.esMaestra && (b.gravityTurns || 0) > 0 && getHexDistance(currentPos, b.posicion) <= 2;
    if (aGravityLocked !== bGravityLocked) return aGravityLocked ? 1 : -1;
    if (a.esMaestra) return -1;
    if (b.esMaestra) return 1;
    return getHexDistance(currentPos, a.posicion) - getHexDistance(currentPos, b.posicion);
  });

  const targetEnemy = allEnemies[0];
  const targetPos = targetEnemy.posicion;

  // Buscar casillas adyacentes válidas, no ocupadas y no bloqueadas por Gravedad
  const validMoves: number[] = [];
  Object.keys(HEX_MAP).forEach((key) => {
    const hex = parseInt(key, 10);
    const isOccupied = unitsSnapshot.some((u) => u.posicion === hex);
    if (!isOccupied && !isBlockedByGravity(hex) && getHexDistance(currentPos, hex) === 1) {
      validMoves.push(hex);
    }
  });

  if (validMoves.length > 0) {
    validMoves.sort((a, b) => getHexDistance(a, targetPos) - getHexDistance(b, targetPos));
    const bestHex = validMoves[0];
    if (
      targetEnemy.esMaestra &&
      (targetEnemy.gravityTurns || 0) > 0 &&
      getHexDistance(bestHex, targetPos) >= getHexDistance(currentPos, targetPos)
    ) {
      return { type: 'PASS' };
    }
    return {
      type: 'MOVE',
      bestMoveHex: bestHex,
    };
  }

  return { type: 'PASS' };
}
