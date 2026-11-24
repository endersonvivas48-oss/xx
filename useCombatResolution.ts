import { useState, useCallback, useEffect, useRef, MutableRefObject, Dispatch, SetStateAction } from 'react';
import { UnitData, SpellVFX } from './types';
import { CATALOG_GRIMOIRE_SPELLS, SpellItem } from './gameCatalogData';
import {
  calculateAttackDamagePreview,
  calculateSpellDamageWithShield,
  consumeUnitShieldCharge,
} from './tacticalCombatFormulas';
import { getHexDistance, HEX_MAP } from './hexGrid';
import { getGladiatorPortraitUrls } from './gladiatorImageMap';
import { DailyContract } from './TavernInterior';
import { Achievement } from './TrophyModal';
import { gameAudio } from './utils';

export interface EmergentGladiatorBark {
  name: string;
  quote: string;
  portraitUrls: string[];
  color: string;
}

export interface UseCombatResolutionParams {
  unitsRef: MutableRefObject<UnitData[]>;
  updateUnitsSync: (updater: UnitData[] | ((prev: UnitData[]) => UnitData[])) => UnitData[];
  manaRef: MutableRefObject<{ J1: number; J2: number }>;
  setMana: Dispatch<SetStateAction<{ J1: number; J2: number }>>;
  jugadorActivoRef: MutableRefObject<1 | 2>;
  isCombatActionLockedRef?: MutableRefObject<boolean>;
  isAiRunningRef?: MutableRefObject<boolean>;
  hechizoEnEspera: string | null;
  setHechizoEnEspera: Dispatch<SetStateAction<string | null>>;
  cityTimeOfDay: 0 | 1 | 2;
  currentOpponentId: string;
  triggerHapticFeedback: (duration?: number | number[]) => void;
  triggerBattleMessage: (text: string, color?: string) => void;
  spawnFloatingText: (text: string, hexId: number, color?: string) => void;
  triggerSpellVFX: (type: SpellVFX['type'], hexId: number, color?: string) => void;
  clearSelection: () => void;
  cancelInvocation: () => void;
  checkTutorialStepProgression: (
    actionDone: 'ROLL_DICE' | 'SUMMON' | 'MOVE' | 'ATTACK' | 'CAST_SPELL' | 'TRANSMUTE'
  ) => void;
  handleMasterDefeated: (winner: 1 | 2) => void;
  setAchievements: (action: SetStateAction<Achievement[]>) => void;
  setDailyContracts: Dispatch<SetStateAction<DailyContract[]>>;
  setLastPlayerMoveAction: Dispatch<
    SetStateAction<{ unitId: string; fromHex: number; toHex: number } | null>
  >;
  hasTriggeredGladiatorBarkRef: MutableRefObject<boolean>;
  setEmergentGladiatorBark: Dispatch<SetStateAction<EmergentGladiatorBark | null>>;
}

export function useCombatResolution({
  unitsRef,
  updateUnitsSync,
  manaRef,
  setMana,
  jugadorActivoRef,
  isCombatActionLockedRef,
  isAiRunningRef,
  hechizoEnEspera,
  setHechizoEnEspera,
  cityTimeOfDay,
  currentOpponentId,
  triggerHapticFeedback,
  triggerBattleMessage,
  spawnFloatingText,
  triggerSpellVFX,
  clearSelection,
  cancelInvocation,
  checkTutorialStepProgression,
  handleMasterDefeated,
  setAchievements,
  setDailyContracts,
  setLastPlayerMoveAction,
  hasTriggeredGladiatorBarkRef,
  setEmergentGladiatorBark,
}: UseCombatResolutionParams) {
  const [spellToConfirm, setSpellToConfirm] = useState<SpellItem | null>(null);
  const isMountedRef = useRef(true);
  const pendingTimeoutsRef = useRef<number[]>([]);

  const spendManaSync = useCallback(
    (player: 1 | 2, cost: number) => {
      const playerKey = `J${player}` as 'J1' | 'J2';
      const nextMana = {
        ...manaRef.current,
        [playerKey]: Math.max(0, manaRef.current[playerKey] - cost),
      };
      manaRef.current = nextMana;
      setMana(nextMana);
      return nextMana;
    },
    [manaRef, setMana]
  );

  const isUnresurrectedPhoenix = (u: UnitData): boolean =>
    Boolean(!u.esMaestra && u.esAscendido && u.ascendidoTipo === 5 && !u.hasResurrected);

  const advanceArcaneMightContract = useCallback(() => {
    setDailyContracts((prev) =>
      prev.map((c) => {
        if (c.id === 'contract_arcane_might') {
          const nextVal = c.currentCount + 1;
          return {
            ...c,
            currentCount: Math.min(c.targetCount, nextVal),
            isCompleted: nextVal >= c.targetCount,
          };
        }
        return c;
      })
    );
  }, [setDailyContracts]);

  const advanceMinionSlayerContract = useCallback(
    (killsCount: number = 1) => {
      if (killsCount <= 0) return;
      setDailyContracts((prev) =>
        prev.map((c) =>
          c.id === 'contract_minion_slayer'
            ? {
                ...c,
                currentCount: Math.min(c.targetCount, c.currentCount + killsCount),
                isCompleted: c.currentCount + killsCount >= c.targetCount,
              }
            : c
        )
      );
    },
    [setDailyContracts]
  );

  const clearCombatResolutionTimeouts = useCallback(() => {
    pendingTimeoutsRef.current.forEach((id) => clearTimeout(id));
    pendingTimeoutsRef.current = [];
  }, []);

  const scheduleTimeout = useCallback((fn: () => void, delayMs: number) => {
    const id = window.setTimeout(() => {
      pendingTimeoutsRef.current = pendingTimeoutsRef.current.filter((t) => t !== id);
      if (!isMountedRef.current) return;
      fn();
    }, delayMs);
    pendingTimeoutsRef.current.push(id);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      clearCombatResolutionTimeouts();
    };
  }, [clearCombatResolutionTimeouts]);

  const executeMeleeAttack = (attacker: UnitData, defender: UnitData) => {
    triggerHapticFeedback(40);
    gameAudio.playSwordClash();
    gameAudio.playMeleePunch();

    // Cálculo canónico único compartido con tacticalCombatFormulas.ts, combatStateMachine.ts y previsualización UI
    const calc = calculateAttackDamagePreview(attacker, defender, cityTimeOfDay);
    const {
      effectiveDmg: effectiveDamage,
      shieldBrokenDefender: shieldConsumed,
      totalEstimatedDamage: totalSubtracted,
      remainingHp: newHp,
      hasVampiric,
      hasFrost: defenderFrozen,
      hasFire,
      hasPoison,
      hasLightning,
      hasSolarLight,
      hasCosmic,
      hasSingularity,
      vampiricHealAmount,
    } = calc;

    if (shieldConsumed) {
      const remainingCharges = Math.max(0, (defender.shieldCharges ?? 1) - 1);
      gameAudio.playShieldBlock();
      if (defender.esMaestra) {
        spawnFloatingText(
          remainingCharges > 0 ? `🛡️ ¡ESCUDO ANULÓ DAÑO (${remainingCharges} rest.)!` : '🛡️ ¡ESCUDO ANULÓ TODO EL DAÑO!',
          defender.posicion,
          '#34d399'
        );
        triggerBattleMessage(
          `🛡️ ¡La Barrera Solar de ${defender.nombre} anuló por completo el ataque enemigo (0 Daño)${remainingCharges > 0 ? ` — quedan ${remainingCharges} cargas` : ''}!`,
          '#34d399'
        );
      } else {
        spawnFloatingText('🛡️ ¡ESCUDO ABSORBIÓ DAÑO!', defender.posicion, '#34d399');
        triggerBattleMessage(`🛡️ ¡El Escudo Arcano de ${defender.nombre} absorbió 4 de daño!`, '#34d399');
      }
    }

    spawnFloatingText(`-${effectiveDamage} HP`, defender.posicion, '#ef4444');
    triggerBattleMessage(
      `⚔️ ¡${attacker.nombre} atacó a ${defender.nombre} infligiendo -${effectiveDamage} HP!`,
      '#ef4444'
    );
    checkTutorialStepProgression('ATTACK');

    if (hasFire) {
      scheduleTimeout(() => {
        spawnFloatingText('🔥 ¡LLAMA ÍGNEA (-1)!', defender.posicion, '#f97316');
      }, 250);
    }

    if (defenderFrozen) {
      scheduleTimeout(() => {
        spawnFloatingText('❄️ CONGELADO', defender.posicion, '#38bdf8');
      }, 280);
      triggerBattleMessage(`❄️ ¡Orbe de Hielo congeló a ${defender.nombre}!`, '#38bdf8');
    }

    if (hasPoison) {
      scheduleTimeout(() => {
        spawnFloatingText('☠️ VENENO (-1)', defender.posicion, '#22c55e');
      }, 320);
    }

    if (attacker.dueño === 1 && totalSubtracted >= 10) {
      setAchievements((prev) =>
        prev.map((a) =>
          a.id === 'ach_damage_10'
            ? { ...a, progress: Math.max(a.progress || 0, totalSubtracted), isUnlocked: true }
            : a
        )
      );
    }

    if (hasLightning) {
      scheduleTimeout(() => {
        spawnFloatingText('⚡ DESCARGA ELÉCTRICA', defender.posicion, '#facc15');
      }, 200);
    }

    if (hasCosmic || hasSingularity) {
      scheduleTimeout(() => {
        spawnFloatingText('🌌 IMPACTO CÓSMICO', defender.posicion, '#c084fc');
      }, 300);
    }

    const attackerNewHp = attacker.hpActual + vampiricHealAmount;
    if (hasVampiric && vampiricHealAmount > 0) {
      scheduleTimeout(() => {
        spawnFloatingText(
          cityTimeOfDay === 2
            ? `+${vampiricHealAmount} HP DRENADO (LUNA 🌙)`
            : `+${vampiricHealAmount} HP DRENADO`,
          attacker.posicion,
          '#a855f7'
        );
      }, 300);
    }

    if (hasSolarLight) {
      const allyMaster = unitsRef.current.find((u) => u.dueño === attacker.dueño && u.esMaestra);
      if (allyMaster && allyMaster.hpActual < allyMaster.hpMax) {
        scheduleTimeout(() => {
          spawnFloatingText('☀️ BENDICIÓN (+1 HP)', allyMaster.posicion, '#fde047');
        }, 350);
      }
    }

    // Tras atacar cuerpo a cuerpo se consolida la acción y ya no se puede deshacer el movimiento previo
    setLastPlayerMoveAction(null);

    if (newHp <= 0) {
      if (defender.esMaestra) {
        updateUnitsSync((prev) =>
          prev.map((u) => {
          if (u.id === defender.id) {
            return { ...u, hpActual: 0, hasShield: false, shieldCharges: 0 };
          }
            if (u.id === attacker.id) {
              const effectiveHp =
                hasSolarLight && u.esMaestra ? Math.min(u.hpMax, attackerNewHp + 1) : attackerNewHp;
              return { ...u, hpActual: effectiveHp, yaSeMovio: true, bonusDamageNextTurn: 0, lastAttackSeq: (u.lastAttackSeq || 0) + 1 };
            }
            if (hasSolarLight && u.dueño === attacker.dueño && u.esMaestra) {
              return { ...u, hpActual: Math.min(u.hpMax, u.hpActual + 1) };
            }
            return u;
          })
        );
        handleMasterDefeated(defender.dueño === 2 ? 1 : 2);
        clearSelection();
        return;
      } else if (defender.esAscendido && defender.ascendidoTipo === 5 && !defender.hasResurrected) {
        // Habilidad pasiva del Fénix Eterno: Resucita de inmediato una vez por combate con 10 PV
        gameAudio.playVictoryFanfare();
        spawnFloatingText('🔥 ¡RENACER ÍGNEO (10 HP)!', defender.posicion, '#f97316');
        triggerBattleMessage(`🔥 ¡El Fénix Eterno renace de sus cenizas con 10 HP!`, '#f97316');
        updateUnitsSync((prev) =>
          prev.map((u) => {
            if (u.id === defender.id) {
              return {
                ...u,
                hpActual: 10,
                hasResurrected: true,
                ...(shieldConsumed ? consumeUnitShieldCharge(u) : {}),
                isFrozen: defenderFrozen ? true : u.isFrozen,
                yaSeMovio: defenderFrozen ? true : u.yaSeMovio,
              };
            }
            if (u.id === attacker.id) {
              const effectiveHp =
                hasSolarLight && u.esMaestra ? Math.min(u.hpMax, attackerNewHp + 1) : attackerNewHp;
              return { ...u, hpActual: effectiveHp, yaSeMovio: true, bonusDamageNextTurn: 0, lastAttackSeq: (u.lastAttackSeq || 0) + 1 };
            }
            if (hasSolarLight && u.dueño === attacker.dueño && u.esMaestra) {
              return { ...u, hpActual: Math.min(u.hpMax, u.hpActual + 1) };
            }
            return u;
          })
        );
        clearSelection();
        return;
      } else {
        gameAudio.playMeleePunch();
        spawnFloatingText('💀 CAÍDO', defender.posicion, '#94a3b8');
        triggerBattleMessage(`💀 ¡${defender.nombre} ha caído en combate!`, '#94a3b8');
      }

      updateUnitsSync((prev) =>
        prev
          .filter((u) => u.id !== defender.id)
          .map((u) => {
            if (u.id === attacker.id) {
              const effectiveHp =
                hasSolarLight && u.esMaestra ? Math.min(u.hpMax, attackerNewHp + 1) : attackerNewHp;
              return { ...u, hpActual: effectiveHp, yaSeMovio: true, bonusDamageNextTurn: 0, lastAttackSeq: (u.lastAttackSeq || 0) + 1 };
            }
            if (hasSolarLight && u.dueño === attacker.dueño && u.esMaestra) {
              return { ...u, hpActual: Math.min(u.hpMax, u.hpActual + 1) };
            }
            return u;
          })
      );

      // Progreso de contrato diario: Caza de Vanguardias (eliminar 4 esbirros)
      if (!defender.esMaestra && defender.dueño === 2) {
        advanceMinionSlayerContract(1);
      }
    } else {
      // ACTUALIZAR ESTADO DEL DEFENSOR Y ATACANTE CUANDO EL DEFENSOR SOBREVIVE
      updateUnitsSync((prev) =>
        prev.map((u) => {
          if (u.id === defender.id) {
            return {
              ...u,
              hpActual: newHp,
              ...(shieldConsumed ? consumeUnitShieldCharge(u) : {}),
              isFrozen: defenderFrozen ? true : u.isFrozen,
              yaSeMovio: defenderFrozen ? true : u.yaSeMovio,
            };
          }
          if (u.id === attacker.id) {
            const effectiveHp =
              hasSolarLight && u.esMaestra ? Math.min(u.hpMax, attackerNewHp + 1) : attackerNewHp;
            return {
              ...u,
              hpActual: effectiveHp,
              yaSeMovio: true,
              bonusDamageNextTurn: 0,
              lastAttackSeq: (u.lastAttackSeq || 0) + 1,
            };
          }
          if (hasSolarLight && u.dueño === attacker.dueño && u.esMaestra) {
            return { ...u, hpActual: Math.min(u.hpMax, u.hpActual + 1) };
          }
          return u;
        })
      );

      // Línea de diálogo emergente del gladiador si su salud baja del 45% (Crisis en combate)
      if (
        defender.esMaestra &&
        defender.dueño === 2 &&
        newHp > 0 &&
        newHp <= defender.hpMax * 0.45 &&
        !hasTriggeredGladiatorBarkRef.current
      ) {
        hasTriggeredGladiatorBarkRef.current = true;
        const gladiatorName = defender.nombre || 'El Rival';
        const portUrls = getGladiatorPortraitUrls(currentOpponentId, gladiatorName);

        const barkQuotes: Record<string, string> = {
          'Sir Gareth': '«¡Mi escudo no cederá tan fácilmente ante tus dados, Soberano!»',
          Vespera: '«Las sombras del abismo se alimentan del dolor... ¡aún no has ganado!»',
          Zephyr: '«¡El viento ruge con más fuerza cuando la tormenta arrecia!»',
          'Ignis Rex': '«¡Arderemos juntos antes de que reclames mi corona de fuego!»',
          'Lady Aurelia': '«¡Digno rival! Pero el trono del Legado exige sangre y templanza.»',
        };

        const matchingQuote =
          Object.entries(barkQuotes).find(([k]) => gladiatorName.includes(k))?.[1] ||
          '«¡No subestimes el temple de un gladiador en el momento de la verdad!»';

        scheduleTimeout(() => {
          setEmergentGladiatorBark({
            name: gladiatorName,
            quote: matchingQuote,
            portraitUrls: portUrls,
            color: '#f43f5e',
          });
          gameAudio.playPowerupChime();
        }, 300);

        scheduleTimeout(() => {
          setEmergentGladiatorBark(null);
        }, 5500);
      }
    }
    clearSelection();
  };

  const selectSpell = useCallback(
    (spellType: string) => {
      if (isCombatActionLockedRef?.current || isAiRunningRef?.current || jugadorActivoRef.current !== 1) {
        return;
      }
      const spell = CATALOG_GRIMOIRE_SPELLS[spellType];
      if (!spell) return;
      const activeP = jugadorActivoRef.current;
      const currentMana = manaRef.current[`J${activeP}`];
      if (currentMana < spell.cost) {
        triggerBattleMessage(`¡Maná insuficiente! Requiere ${spell.cost} Maná.`, '#ef4444');
        return;
      }
      // Abrir confirmación antes de gastar maná
      setSpellToConfirm(spell);
      gameAudio.playCrispClick();
    },
    [isCombatActionLockedRef, isAiRunningRef, jugadorActivoRef, manaRef, triggerBattleMessage]
  );

  const confirmSpellCast = () => {
    if (!spellToConfirm) return;
    const spell = spellToConfirm;
    const cost = spell.cost;
    const activeP = jugadorActivoRef.current;
    const currentMana = manaRef.current[`J${activeP}`];
    if (currentMana < cost) {
      triggerBattleMessage('¡Maná insuficiente!', '#ef4444');
      setSpellToConfirm(null);
      return;
    }

    if (spell.id === 'tormenta') {
      // Tormenta: 1 de daño a todos los enemigos simultáneamente
      setLastPlayerMoveAction(null);
      gameAudio.playChiptuneExplosion();
      spendManaSync(activeP, cost);
      triggerBattleMessage('¡Tormenta: Ráfaga sobre todos los rivales!', '#60a5fa');
      checkTutorialStepProgression('CAST_SPELL');

      // Progreso de contrato de cazador: Lanzar hechizos
      if (activeP === 1) {
        advanceArcaneMightContract();
      }

      let rivalMasterKilled = false;
      let killedEnemyMinions = 0;
      const phoenixRevivedHexes: number[] = [];
      updateUnitsSync((prev) =>
        prev
          .map((u) => {
            if (u.dueño !== activeP) {
              const spellDmg = calculateSpellDamageWithShield(u, 1);
              if (spellDmg.shieldBroken) {
                gameAudio.playShieldBlock();
                spawnFloatingText(
                  spellDmg.effectiveDmg === 0 ? '🛡️ BARRERA ABSORBIÓ' : `🛡️ -${spellDmg.effectiveDmg} HP`,
                  u.posicion,
                  '#34d399'
                );
              } else {
                spawnFloatingText(`-${spellDmg.effectiveDmg} HP`, u.posicion, '#60a5fa');
              }
              triggerSpellVFX('rayo', u.posicion, '#60a5fa');
              if (spellDmg.remainingHp <= 0 && u.esMaestra) {
                rivalMasterKilled = true;
              } else if (spellDmg.remainingHp <= 0 && isUnresurrectedPhoenix(u)) {
                phoenixRevivedHexes.push(u.posicion);
                return {
                  ...u,
                  hpActual: 10,
                  hasResurrected: true,
                  ...(spellDmg.shieldBroken ? consumeUnitShieldCharge(u) : {}),
                };
              } else if (spellDmg.remainingHp <= 0 && !u.esMaestra) {
                killedEnemyMinions++;
              }
              return {
                ...u,
                hpActual: spellDmg.remainingHp,
                ...(spellDmg.shieldBroken ? consumeUnitShieldCharge(u) : {}),
              };
            }
            return u;
          })
          .filter((u) => u.hpActual > 0 || u.esMaestra)
      );

      if (phoenixRevivedHexes.length > 0) {
        gameAudio.playVictoryFanfare();
        phoenixRevivedHexes.forEach((pos) => {
          spawnFloatingText('🔥 ¡RENACER ÍGNEO (10 HP)!', pos, '#f97316');
        });
        triggerBattleMessage('🔥 ¡El Fénix Eterno renace de sus cenizas con 10 HP!', '#f97316');
      }
      if (activeP === 1 && killedEnemyMinions > 0) {
        advanceMinionSlayerContract(killedEnemyMinions);
      }
      if (rivalMasterKilled) {
        handleMasterDefeated(activeP);
      }
      setSpellToConfirm(null);
    } else if (spell.id === 'supremo') {
      // Hechizo Definitivo: Elimina fulminantemente a la criatura rival más fuerte (mayor nivel)
      const rivalMinions = unitsRef.current.filter((u) => u.dueño !== activeP && !u.esMaestra);
      if (rivalMinions.length === 0) {
        triggerBattleMessage('No hay criaturas rivales en el tablero para eliminar.', '#f87171');
        setSpellToConfirm(null);
        return;
      }
      const strongest = [...rivalMinions].sort(
        (a, b) => b.nivel - a.nivel || b.hpActual - a.hpActual
      )[0];
      setLastPlayerMoveAction(null);
      gameAudio.playChiptuneExplosion();
      triggerSpellVFX('supremo', strongest.posicion, '#fbbf24');
      spendManaSync(activeP, cost);
      checkTutorialStepProgression('CAST_SPELL');
      if (activeP === 1) {
        advanceArcaneMightContract();
      }
      if (isUnresurrectedPhoenix(strongest)) {
        gameAudio.playVictoryFanfare();
        spawnFloatingText('🔥 ¡RENACER ÍGNEO (10 HP)!', strongest.posicion, '#f97316');
        triggerBattleMessage('🔥 ¡El Fénix Eterno resiste la Sentencia Sagrada y renace con 10 HP!', '#f97316');
        updateUnitsSync((prev) =>
          prev.map((u) =>
            u.id === strongest.id ? { ...u, hpActual: 10, hasResurrected: true } : u
          )
        );
      } else {
        spawnFloatingText('¡FULMINADO!', strongest.posicion, '#fbbf24');
        triggerBattleMessage(`¡Sentencia Sagrada: ${strongest.nombre} ha sido destruido!`, '#fbbf24');
        updateUnitsSync((prev) => prev.filter((u) => u.id !== strongest.id));
        if (activeP === 1) {
          advanceMinionSlayerContract(1);
        }
      }
      setSpellToConfirm(null);
    } else if (spell.id === 'gravedad') {
      // Gravedad: Bloquea temporalmente las casillas adyacentes a tu Maestra (2 turnos rivales) y repele esbirros rivales adyacentes
      const master = unitsRef.current.find((u) => u.dueño === activeP && u.esMaestra);
      if (!master) {
        triggerBattleMessage('No se encontró a tu Soberano en el tablero.', '#ef4444');
        setSpellToConfirm(null);
        return;
      }
      if ((master.gravityTurns || 0) >= 2) {
        gameAudio.playErrorBuzz();
        triggerBattleMessage('🌌 ¡La barrera de Gravedad ya está activa al máximo (2 turnos)!', '#818cf8');
        setSpellToConfirm(null);
        return;
      }

      setLastPlayerMoveAction(null);
      gameAudio.playShieldBlock();
      spendManaSync(activeP, cost);
      checkTutorialStepProgression('CAST_SPELL');

      if (activeP === 1) {
        advanceArcaneMightContract();
      }

      let pushedCount = 0;
      const repelledVisuals: number[] = [];

      updateUnitsSync((prev) => {
        const liveMaster = prev.find((u) => u.id === master.id);
        if (!liveMaster) return prev;

        const occupiedSet = new Set(prev.map((u) => u.posicion));
        const enemyMaster = prev.find((u) => u.dueño !== activeP && u.esMaestra);
        const repelledPositions = new Map<string, number>();

        prev.forEach((u) => {
          if (
            u.dueño !== activeP &&
            !u.esMaestra &&
            getHexDistance(liveMaster.posicion, u.posicion) === 1
          ) {
            const pushCandidates = Object.keys(HEX_MAP)
              .map((k) => parseInt(k, 10))
              .filter(
                (hexId) =>
                  !occupiedSet.has(hexId) &&
                  getHexDistance(u.posicion, hexId) === 1 &&
                  getHexDistance(liveMaster.posicion, hexId) === 2
              );
            if (pushCandidates.length > 0) {
              if (enemyMaster) {
                pushCandidates.sort(
                  (a, b) => getHexDistance(a, enemyMaster.posicion) - getHexDistance(b, enemyMaster.posicion)
                );
              }
              const destHex = pushCandidates[0];
              occupiedSet.delete(u.posicion);
              occupiedSet.add(destHex);
              repelledPositions.set(u.id, destHex);
              repelledVisuals.push(destHex);
              pushedCount++;
            }
          }
        });

        return prev.map((u) => {
          if (u.id === liveMaster.id) {
            return { ...u, gravityTurns: 2 };
          }
          const pushedHex = repelledPositions.get(u.id);
          if (pushedHex !== undefined) {
            return { ...u, posicion: pushedHex };
          }
          return u;
        });
      });

      repelledVisuals.forEach((destHex) => {
        spawnFloatingText('🌌 REPELIDO', destHex, '#818cf8');
      });
      spawnFloatingText('🌌 GRAVEDAD ACTIVA (2T)', master.posicion, '#818cf8');
      triggerSpellVFX('gravedad', master.posicion, '#818cf8');
      triggerBattleMessage(
        pushedCount > 0
          ? `🌌 ¡Gravedad activa (2 turnos): ${pushedCount} rival(es) repelido(s) y casillas adyacentes bloqueadas!`
          : '🌌 ¡Gravedad activa (2 turnos): las casillas adyacentes a tu Soberano bloquean el paso rival!',
        '#818cf8'
      );
      setSpellToConfirm(null);
    } else {
      // Hechizos dirigidos a objetivo (Relámpago, Escudo, Transposición, Juicio, Vínculo, Prisión, Ira de Ra)
      clearSelection();
      cancelInvocation();
      setHechizoEnEspera(spell.id);
      setSpellToConfirm(null);
      triggerBattleMessage(
        `Selecciona la unidad objetivo para ${spell.name} (o pulsa Cancelar Hechizo)`,
        spell.color
      );
    }
  };

  const cancelSpellCast = useCallback(() => {
    setSpellToConfirm(null);
    setHechizoEnEspera(null);
    gameAudio.playCrispClick();
  }, [setHechizoEnEspera]);

  const castSpellOnTarget = (target: UnitData) => {
    if (!hechizoEnEspera) return;
    const spell = CATALOG_GRIMOIRE_SPELLS[hechizoEnEspera];
    if (!spell) {
      setHechizoEnEspera(null);
      return;
    }
    const cost = spell.cost;
    const activeP = jugadorActivoRef.current;
    const currentMana = manaRef.current[`J${activeP}`];
    if (currentMana < cost) {
      triggerBattleMessage('¡Maná insuficiente!', '#ef4444');
      setHechizoEnEspera(null);
      return;
    }

    const liveUnitsSnapshot = unitsRef.current;
    const myMaster = liveUnitsSnapshot.find((u) => u.dueño === activeP && u.esMaestra);

    if (hechizoEnEspera === 'rayo') {
      // Relámpago: Quita 2 HP a una unidad enemiga a máx 3 celdas de tu Maestra
      if (target.dueño === activeP) {
        triggerBattleMessage('Relámpago debe ser lanzado contra un enemigo.', '#f87171');
        return;
      }
      if (myMaster && getHexDistance(myMaster.posicion, target.posicion) > 3) {
        triggerBattleMessage('El objetivo está fuera del rango de 3 celdas de tu Maestra.', '#f87171');
        return;
      }
      setLastPlayerMoveAction(null);
      gameAudio.playArcadeLaser();
      triggerSpellVFX('rayo', target.posicion, '#38bdf8');
      spendManaSync(activeP, cost);
      spawnFloatingText('-2 Relámpago', target.posicion, '#38bdf8');
      triggerBattleMessage(`⚡ ¡Relámpago impactó a ${target.nombre} (-2 HP)!`, '#38bdf8');
      checkTutorialStepProgression('CAST_SPELL');

      // Progreso de contrato de cazador: Lanzar hechizos
      if (activeP === 1) {
        advanceArcaneMightContract();
      }

      const spellDmg = calculateSpellDamageWithShield(target, 2);
      if (spellDmg.shieldBroken) {
        gameAudio.playShieldBlock();
        spawnFloatingText(
          spellDmg.effectiveDmg === 0 ? '🛡️ BARRERA ABSORBIÓ' : `🛡️ -${spellDmg.effectiveDmg} HP`,
          target.posicion,
          '#34d399'
        );
        triggerBattleMessage(
          `🛡️ ¡El Escudo de ${target.nombre} absorbió el Relámpago (${spellDmg.effectiveDmg} HP)!`,
          '#34d399'
        );
      }
      let phoenixRevived = false;
      let minionKilled = false;
      updateUnitsSync((prev) =>
        prev
          .map((u) => {
            if (u.id !== target.id) return u;
            if (spellDmg.remainingHp <= 0 && isUnresurrectedPhoenix(u)) {
              phoenixRevived = true;
              return {
                ...u,
                hpActual: 10,
                hasResurrected: true,
                ...(spellDmg.shieldBroken ? consumeUnitShieldCharge(u) : {}),
              };
            }
            if (spellDmg.remainingHp <= 0 && !u.esMaestra) {
              minionKilled = true;
            }
            return {
              ...u,
              hpActual: spellDmg.remainingHp,
              ...(spellDmg.shieldBroken ? consumeUnitShieldCharge(u) : {}),
            };
          })
          .filter((u) => u.hpActual > 0 || u.esMaestra)
      );

      if (phoenixRevived) {
        gameAudio.playVictoryFanfare();
        spawnFloatingText('🔥 ¡RENACER ÍGNEO (10 HP)!', target.posicion, '#f97316');
        triggerBattleMessage('🔥 ¡El Fénix Eterno renace de sus cenizas con 10 HP!', '#f97316');
      } else if (activeP === 1 && minionKilled) {
        advanceMinionSlayerContract(1);
      }

      if (spellDmg.remainingHp <= 0 && target.esMaestra) {
        handleMasterDefeated(target.dueño === 2 ? 1 : 2);
      }
    } else if (hechizoEnEspera === 'escudo') {
      // Escudo: Otorga una barrera protectora permanente hasta que absorba el próximo ataque rival (-4 Daño)
      if (target.dueño !== activeP) {
        triggerBattleMessage('El Escudo solo puede ser otorgado a una unidad aliada.', '#f87171');
        return;
      }
      setLastPlayerMoveAction(null);
      gameAudio.playShieldBlock();
      triggerSpellVFX('escudo', target.posicion, '#34d399');
      spendManaSync(activeP, cost);
      spawnFloatingText('🛡️ BARRERA ACTIVA', target.posicion, '#34d399');
      triggerBattleMessage(
        `🛡️ ¡Escudo divino activo en ${target.nombre} (Absorberá el próximo daño recibido)!`,
        '#34d399'
      );
      checkTutorialStepProgression('CAST_SPELL');
      if (activeP === 1) {
        advanceArcaneMightContract();
      }
      updateUnitsSync((prev) =>
        prev.map((u) => {
          if (u.id === target.id) {
            const nextCharges = (u.shieldCharges ?? (u.hasShield ? 1 : 0)) + 1;
            return { ...u, hasShield: true, shieldCharges: nextCharges };
          }
          return u;
        })
      );
    } else if (hechizoEnEspera === 'transposicion') {
      // Transposición: Intercambia posiciones entre dos unidades
      if (!myMaster) return;
      if (target.id === myMaster.id) {
        triggerBattleMessage(
          'Selecciona otra unidad en el tablero para intercambiar lugares con tu Soberano.',
          '#f87171'
        );
        return;
      }
      setLastPlayerMoveAction(null);
      gameAudio.playConfirmSelect();
      triggerSpellVFX('transposicion', myMaster.posicion, '#a78bfa');
      triggerSpellVFX('transposicion', target.posicion, '#a78bfa');
      spendManaSync(activeP, cost);
      checkTutorialStepProgression('CAST_SPELL');
      if (activeP === 1) {
        advanceArcaneMightContract();
      }
      const pos1 = myMaster.posicion;
      const pos2 = target.posicion;
      updateUnitsSync((prev) =>
        prev.map((u) => {
          if (u.id === myMaster.id) return { ...u, posicion: pos2 };
          if (u.id === target.id) return { ...u, posicion: pos1 };
          return u;
        })
      );
      spawnFloatingText('🔄 TRANSPOSICIÓN', pos2, '#a78bfa');
      triggerBattleMessage(
        `🔄 ¡Transposición: ${myMaster.nombre} y ${target.nombre} han intercambiado lugares!`,
        '#a78bfa'
      );
    } else if (hechizoEnEspera === 'juicio') {
      // Juicio: Destruye instantáneamente a un enemigo en rango de ataque de una de tus unidades
      if (target.dueño === activeP || target.esMaestra) {
        triggerBattleMessage('Juicio solo destruye criaturas enemigas no Maestras.', '#f87171');
        return;
      }
      const hasAdjacentAlly = liveUnitsSnapshot.some(
        (u) => u.dueño === activeP && getHexDistance(u.posicion, target.posicion) === 1
      );
      if (!hasAdjacentAlly) {
        triggerBattleMessage('Juicio requiere que una de tus criaturas esté adyacente al objetivo.', '#f87171');
        return;
      }
      setLastPlayerMoveAction(null);
      gameAudio.playSwordClash();
      triggerSpellVFX('juicio', target.posicion, '#fbbf24');
      spendManaSync(activeP, cost);
      checkTutorialStepProgression('CAST_SPELL');
      if (activeP === 1) {
        advanceArcaneMightContract();
      }
      if (isUnresurrectedPhoenix(target)) {
        gameAudio.playVictoryFanfare();
        spawnFloatingText('🔥 ¡RENACER ÍGNEO (10 HP)!', target.posicion, '#f97316');
        triggerBattleMessage('🔥 ¡El Fénix Eterno resiste el Juicio y renace de sus cenizas con 10 HP!', '#f97316');
        updateUnitsSync((prev) =>
          prev.map((u) =>
            u.id === target.id ? { ...u, hpActual: 10, hasResurrected: true } : u
          )
        );
      } else {
        spawnFloatingText('⚖️ ¡JUICIO!', target.posicion, '#fbbf24');
        triggerBattleMessage(`¡Juicio: ${target.nombre} ha sido eliminado!`, '#fbbf24');
        updateUnitsSync((prev) => prev.filter((u) => u.id !== target.id));
        if (activeP === 1) {
          advanceMinionSlayerContract(1);
        }
      }
    } else if (hechizoEnEspera === 'vinculo') {
      // Vínculo: Sacrifica criatura aliada no Maestra para curar 5 HP a tu Maestra
      if (target.dueño !== activeP || target.esMaestra) {
        triggerBattleMessage('Debes sacrificar una criatura aliada no Maestra.', '#f87171');
        return;
      }
      setLastPlayerMoveAction(null);
      gameAudio.playPowerupChime();
      triggerSpellVFX('vinculo', target.posicion, '#f43f5e');
      spendManaSync(activeP, cost);
      checkTutorialStepProgression('CAST_SPELL');
      if (activeP === 1) {
        advanceArcaneMightContract();
      }
      if (myMaster) {
        triggerSpellVFX('escudo', myMaster.posicion, '#10b981');
        spawnFloatingText('+5 HP', myMaster.posicion, '#10b981');
      }
      triggerBattleMessage(`¡Vínculo: Sacrificio completado (+5 HP al Rey)!`, '#f43f5e');
      updateUnitsSync((prev) =>
        prev
          .filter((u) => u.id !== target.id)
          .map((u) =>
            u.esMaestra && u.dueño === activeP
              ? { ...u, hpActual: Math.min(u.hpMax, u.hpActual + 5) }
              : u
          )
      );
    } else if (hechizoEnEspera === 'prision') {
      // Prisión: Inmoviliza criatura enemiga
      if (target.dueño === activeP) {
        triggerBattleMessage('Prisión solo se aplica a criaturas enemigas.', '#f87171');
        return;
      }
      setLastPlayerMoveAction(null);
      gameAudio.playShieldBlock();
      triggerSpellVFX('prision', target.posicion, '#94a3b8');
      spendManaSync(activeP, cost);
      checkTutorialStepProgression('CAST_SPELL');
      if (activeP === 1) {
        advanceArcaneMightContract();
      }
      spawnFloatingText('⛓️ PRISIÓN', target.posicion, '#94a3b8');
      triggerBattleMessage(`¡Prisión: ${target.nombre} ha sido inmovilizado!`, '#94a3b8');
      updateUnitsSync((prev) =>
        prev.map((u) => (u.id === target.id ? { ...u, yaSeMovio: true, isFrozen: true } : u))
      );
    } else if (hechizoEnEspera === 'ira_ra') {
      // Ira de Ra: 4 puntos de daño en toda la fila de la celda seleccionada
      setLastPlayerMoveAction(null);
      gameAudio.playChiptuneExplosion();
      triggerSpellVFX('ira_ra', target.posicion, '#f97316');
      spendManaSync(activeP, cost);
      checkTutorialStepProgression('CAST_SPELL');
      if (activeP === 1) {
        advanceArcaneMightContract();
      }
      const targetCoord = HEX_MAP[target.posicion];
      const targetRow = targetCoord ? targetCoord.r : 0;
      spawnFloatingText('🔥 IRA DE RA', target.posicion, '#f97316');
      triggerBattleMessage('¡Ira de Ra: Línea de fuego calcinante (-4 HP)!', '#f97316');
      let rivalMasterKilled = false;
      let playerMasterKilled = false;
      let killedEnemyMinions = 0;
      const phoenixRevivedHexes: number[] = [];
      updateUnitsSync((prev) =>
        prev
          .map((u) => {
            const c = HEX_MAP[u.posicion];
            if (c && c.r === targetRow) {
              const spellDmg = calculateSpellDamageWithShield(u, 4);
              if (spellDmg.shieldBroken) {
                gameAudio.playShieldBlock();
                spawnFloatingText(
                  spellDmg.effectiveDmg === 0 ? '🛡️ BARRERA ABSORBIÓ' : `🛡️ -${spellDmg.effectiveDmg} HP`,
                  u.posicion,
                  '#34d399'
                );
              } else {
                spawnFloatingText(`-${spellDmg.effectiveDmg} HP`, u.posicion, '#f97316');
              }
              triggerSpellVFX('ira_ra', u.posicion, '#f97316');
              if (spellDmg.remainingHp <= 0 && u.esMaestra) {
                if (u.dueño === 2) rivalMasterKilled = true;
                else playerMasterKilled = true;
              } else if (spellDmg.remainingHp <= 0 && isUnresurrectedPhoenix(u)) {
                phoenixRevivedHexes.push(u.posicion);
                return {
                  ...u,
                  hpActual: 10,
                  hasResurrected: true,
                  ...(spellDmg.shieldBroken ? consumeUnitShieldCharge(u) : {}),
                };
              } else if (spellDmg.remainingHp <= 0 && !u.esMaestra && u.dueño !== activeP) {
                killedEnemyMinions++;
              }
              return {
                ...u,
                hpActual: spellDmg.remainingHp,
                ...(spellDmg.shieldBroken ? consumeUnitShieldCharge(u) : {}),
              };
            }
            return u;
          })
          .filter((u) => u.hpActual > 0 || u.esMaestra)
      );

      if (phoenixRevivedHexes.length > 0) {
        gameAudio.playVictoryFanfare();
        phoenixRevivedHexes.forEach((pos) => {
          spawnFloatingText('🔥 ¡RENACER ÍGNEO (10 HP)!', pos, '#f97316');
        });
        triggerBattleMessage('🔥 ¡El Fénix Eterno renace de sus cenizas con 10 HP!', '#f97316');
      }
      if (activeP === 1 && killedEnemyMinions > 0) {
        advanceMinionSlayerContract(killedEnemyMinions);
      }

      if (rivalMasterKilled) {
        handleMasterDefeated(1);
      } else if (playerMasterKilled) {
        handleMasterDefeated(2);
      }
    }

    setHechizoEnEspera(null);
  };

  return {
    spellToConfirm,
    setSpellToConfirm,
    executeMeleeAttack,
    selectSpell,
    confirmSpellCast,
    cancelSpellCast,
    castSpellOnTarget,
    clearCombatResolutionTimeouts,
  };
}
