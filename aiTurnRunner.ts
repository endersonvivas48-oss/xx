import { MutableRefObject, Dispatch, SetStateAction } from 'react';
import { DieData, RolledDieResult, SpecialHexRune, UnitData } from './types';
import { getHexDistance, HEX_MAP } from './hexGrid';
import {
  CATALOG_ASCENDED_TITANS,
  CATALOG_CREATURES_J2,
  calculateCreatureStats,
} from './gameCatalogData';
import { AiTactic, planAiUnitAction } from './aiPlanner';
import {
  calculateAttackDamagePreview,
  calculateSpellDamageWithShield,
  calculateTitanEntryDirectDamageHp,
  consumeUnitShieldCharge,
} from './tacticalCombatFormulas';
import { SpellVFX } from './types';
import { gameAudio } from './utils';

export interface AscendedCutsceneState {
  titan: (typeof CATALOG_ASCENDED_TITANS)[0];
  ownerName: string;
  isPlayer: boolean;
}

export interface AiTurnRunnerParams {
  isAiRunningRef: MutableRefObject<boolean>;
  jugadorActivoRef: MutableRefObject<1 | 2>;
  setJugadorActivo: Dispatch<SetStateAction<1 | 2>>;
  setCombatLock: (locked: boolean) => void;
  unitsRef: MutableRefObject<UnitData[]>;
  updateUnitsSync: (updater: UnitData[] | ((prev: UnitData[]) => UnitData[])) => UnitData[];
  manaRef: MutableRefObject<{ J1: number; J2: number }>;
  setMana: Dispatch<SetStateAction<{ J1: number; J2: number }>>;
  currentAiTacticRef: MutableRefObject<AiTactic>;
  currentAiSpellsRef: MutableRefObject<string[]>;
  aiDrawPileRef: MutableRefObject<DieData[]>;
  aiDrawPile: DieData[];
  setAiDrawPile: Dispatch<SetStateAction<DieData[]>>;
  aiUsedPileRef: MutableRefObject<DieData[]>;
  aiUsedPile: DieData[];
  setAiUsedPile: Dispatch<SetStateAction<DieData[]>>;
  activeCampaignIndex: number;
  rollDieWithCampaignRng: (campIdx?: number) => number;
  specialRunes: SpecialHexRune[];
  cityTimeOfDay: 0 | 1 | 2;
  aiTimeoutsRef: MutableRefObject<number[]>;
  setAscendedCutscene: Dispatch<SetStateAction<AscendedCutsceneState | null>>;
  setFichas: Dispatch<
    SetStateAction<{ J1: Record<number, number>; J2: Record<number, number> }>
  >;
  setDadosLanzados: Dispatch<SetStateAction<boolean>>;
  setResultadoDados: Dispatch<SetStateAction<RolledDieResult[]>>;
  spawnFloatingText: (text: string, hexId: number, color?: string) => void;
  triggerSpellVFX?: (type: SpellVFX['type'], hexId: number, color?: string) => void;
  triggerBattleMessage: (text: string, color?: string) => void;
  handleMasterDefeated: (winner: 1 | 2) => void;
  cancelInvocation: () => void;
  clearSelection: () => void;
  refreshUnitsForNextTurn: (unitsList: UnitData[], startingPlayer?: 1 | 2) => UnitData[];
}

export function runAiTurn({
  isAiRunningRef,
  jugadorActivoRef,
  setJugadorActivo,
  setCombatLock,
  unitsRef,
  updateUnitsSync,
  manaRef,
  setMana,
  currentAiTacticRef,
  currentAiSpellsRef,
  aiDrawPileRef,
  aiDrawPile,
  setAiDrawPile,
  aiUsedPileRef,
  aiUsedPile,
  setAiUsedPile,
  activeCampaignIndex,
  rollDieWithCampaignRng,
  specialRunes,
  cityTimeOfDay,
  aiTimeoutsRef,
  setAscendedCutscene,
  setFichas,
  setDadosLanzados,
  setResultadoDados,
  spawnFloatingText,
  triggerSpellVFX,
  triggerBattleMessage,
  handleMasterDefeated,
  cancelInvocation,
  clearSelection,
  refreshUnitsForNextTurn,
}: AiTurnRunnerParams): void {
  // Evitar ejecución duplicada de IA o ejecución fuera de turno
  if (isAiRunningRef.current || jugadorActivoRef.current !== 2) return;
  isAiRunningRef.current = true;

  gameAudio.playConfirmSelect();
  let currentUnits = [...unitsRef.current];
  const aiMaster = currentUnits.find((u) => u.dueño === 2 && u.esMaestra);
  const playerMaster = currentUnits.find((u) => u.dueño === 1 && u.esMaestra);

  if (!aiMaster) {
    isAiRunningRef.current = false;
    setCombatLock(false);
    return;
  }

  const updateManaSync = (
    updater: (prev: { J1: number; J2: number }) => { J1: number; J2: number }
  ): { J1: number; J2: number } => {
    const nextMana = updater(manaRef.current);
    manaRef.current = nextMana;
    setMana(nextMana);
    return nextMana;
  };

  // 1. REGLAS IDÉNTICAS: La IA lee maná de manaRef síncrono para evitar stale closures
  let aiMana = manaRef.current.J2;

  // Si tiene maná legítimamente acumulado, puede lanzar hechizos según su perfil táctico
  const aiTactic = currentAiTacticRef.current;
  const aiSpells = currentAiSpellsRef.current;

  if (playerMaster && aiMana >= 2) {
    const distToPlayerMaster = getHexDistance(aiMaster.posicion, playerMaster.posicion);
    const playerMinionCount = currentUnits.filter((u) => u.dueño === 1 && !u.esMaestra).length;
    const targetRow = HEX_MAP[playerMaster.posicion]?.r ?? 0;
    const aiMasterRow = HEX_MAP[aiMaster.posicion]?.r;
    const iraRaWouldKillAiMaster =
      aiMasterRow === targetRow && !aiMaster.hasShield && aiMaster.hpActual <= 4;

    // COMPORTAMIENTOS TÁCTICOS DIFERENCIADOS POR PERFIL DE IA:
    // A) ASESINO SOMBRÍO: Prioridad a daño directo sobre el Soberano del jugador con Relámpago
    if (
      aiTactic === 'AGGRESSIVE_ASSASSIN' &&
      distToPlayerMaster <= 3 &&
      aiSpells.includes('rayo') &&
      aiMana >= 2
    ) {
      aiMana = updateManaSync((prev) => ({ ...prev, J2: Math.max(0, prev.J2 - 2) })).J2;
      gameAudio.playArcadeLaser();
      triggerSpellVFX?.('rayo', playerMaster.posicion, '#38bdf8');
      const spellDmg = calculateSpellDamageWithShield(playerMaster, 2);
      if (spellDmg.shieldBroken) {
        gameAudio.playShieldBlock();
        spawnFloatingText('🛡️ BARRERA ANULÓ RELÁMPAGO', playerMaster.posicion, '#34d399');
        triggerBattleMessage(
          `🛡️ ¡La Barrera Solar de ${playerMaster.nombre} absorbió la Estocada Relámpago rival!`,
          '#34d399'
        );
      } else {
        spawnFloatingText(`⚡ ESTOCADA RELÁMPAGO (-${spellDmg.effectiveDmg})`, playerMaster.posicion, '#f43f5e');
        triggerBattleMessage('¡El Asesino Sombrío descarga Relámpago directo a tu Rey!', '#f43f5e');
      }
      currentUnits = updateUnitsSync((prev) =>
        prev.map((u) =>
          u.id === playerMaster.id
            ? {
                ...u,
                hpActual: spellDmg.remainingHp,
                ...(spellDmg.shieldBroken ? consumeUnitShieldCharge(u) : {}),
              }
            : u
        )
      );
      if (spellDmg.remainingHp <= 0) {
        handleMasterDefeated(2);
        isAiRunningRef.current = false;
        setCombatLock(false);
        return;
      }
    }
    // B) BALUARTE DE PLACAS: Prioridad a otorgar Escudo sobre sí mismo o sus tanques
    else if (
      aiTactic === 'DEFENSIVE_TANK' &&
      aiSpells.includes('escudo') &&
      !aiMaster.hasShield &&
      aiMana >= 2
    ) {
      aiMana = updateManaSync((prev) => ({ ...prev, J2: Math.max(0, prev.J2 - 2) })).J2;
      currentUnits = updateUnitsSync((prev) =>
        prev.map((u) => {
          if (u.id === aiMaster.id) {
            const nextCharges = (u.shieldCharges ?? (u.hasShield ? 1 : 0)) + 1;
            return { ...u, hasShield: true, shieldCharges: nextCharges };
          }
          return u;
        })
      );
      triggerSpellVFX?.('escudo', aiMaster.posicion, '#34d399');
      spawnFloatingText('🛡️ BASTIÓN PESADO', aiMaster.posicion, '#38bdf8');
      gameAudio.playShieldBlock();
      triggerBattleMessage('¡El Baluarte activa Escudo Sagrado impenetrable!', '#38bdf8');
    }
    // C) MAGO DE ESCARCHA / CONTROL: Prioridad a Tormenta si el jugador tiene 2+ unidades
    else if (
      (aiTactic === 'SPELL_CONTROL' || aiTactic === 'ENDGAME_BOSS') &&
      playerMinionCount >= 2 &&
      aiSpells.includes('tormenta') &&
      aiMana >= 3
    ) {
      aiMana = updateManaSync((prev) => ({ ...prev, J2: Math.max(0, prev.J2 - 3) })).J2;
      spawnFloatingText('🌪️ VENTISCA TOTAL (-1)', aiMaster.posicion, '#60a5fa');
      gameAudio.playChiptuneExplosion();
      triggerBattleMessage('¡El Mago de Control desata Ventisca sobre todo tu ejército!', '#60a5fa');
      let playerKingDefeated = false;
      const phoenixRevivedHexes: number[] = [];
      currentUnits = updateUnitsSync((prev) =>
        prev
          .map((u) => {
            if (u.dueño === 1) {
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
              triggerSpellVFX?.('rayo', u.posicion, '#60a5fa');
              if (spellDmg.remainingHp <= 0 && u.esMaestra) {
                playerKingDefeated = true;
              } else if (
                spellDmg.remainingHp <= 0 &&
                !u.esMaestra &&
                u.esAscendido &&
                u.ascendidoTipo === 5 &&
                !u.hasResurrected
              ) {
                phoenixRevivedHexes.push(u.posicion);
                return {
                  ...u,
                  hpActual: 10,
                  hasResurrected: true,
                  ...(spellDmg.shieldBroken ? consumeUnitShieldCharge(u) : {}),
                };
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

      if (playerKingDefeated) {
        handleMasterDefeated(2);
        isAiRunningRef.current = false;
        setCombatLock(false);
        return;
      }
    }
    // D) ESPECIALISTA EN TRAMPAS / BOSS: Desata Ira de Ra sobre toda la fila del Soberano jugador
    else if (
      (aiTactic === 'TRAP_AMBUSH' || aiTactic === 'ENDGAME_BOSS') &&
      aiSpells.includes('ira_ra') &&
      aiMana >= 4 &&
      !iraRaWouldKillAiMaster
    ) {
      aiMana = updateManaSync((prev) => ({ ...prev, J2: Math.max(0, prev.J2 - 4) })).J2;
      spawnFloatingText('🔥 IRA DE RA', playerMaster.posicion, '#f97316');
      gameAudio.playChiptuneExplosion();
      triggerBattleMessage('¡El Especialista en Trampas detona Ira de Ra en toda la fila (-4 HP)!', '#f97316');
      let playerKingDefeated = false;
      let aiKingDefeated = false;
      const phoenixRevivedHexes: number[] = [];
      currentUnits = updateUnitsSync((prev) =>
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
              triggerSpellVFX?.('ira_ra', u.posicion, '#f97316');
              if (spellDmg.remainingHp <= 0 && u.esMaestra) {
                if (u.dueño === 1) playerKingDefeated = true;
                else aiKingDefeated = true;
              } else if (
                spellDmg.remainingHp <= 0 &&
                !u.esMaestra &&
                u.esAscendido &&
                u.ascendidoTipo === 5 &&
                !u.hasResurrected
              ) {
                phoenixRevivedHexes.push(u.posicion);
                return {
                  ...u,
                  hpActual: 10,
                  hasResurrected: true,
                  ...(spellDmg.shieldBroken ? consumeUnitShieldCharge(u) : {}),
                };
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
      if (playerKingDefeated) {
        handleMasterDefeated(2);
        isAiRunningRef.current = false;
        setCombatLock(false);
        return;
      } else if (aiKingDefeated) {
        handleMasterDefeated(1);
        isAiRunningRef.current = false;
        setCombatLock(false);
        return;
      }
    }
    // E) FALLBACK GENERAL: Relámpago estándar moderado
    else if (distToPlayerMaster <= 3 && aiMana >= 2 && Math.random() < 0.4) {
      aiMana = updateManaSync((prev) => ({ ...prev, J2: Math.max(0, prev.J2 - 2) })).J2;
      gameAudio.playArcadeLaser();
      triggerSpellVFX?.('rayo', playerMaster.posicion, '#38bdf8');
      const spellDmg = calculateSpellDamageWithShield(playerMaster, 2);
      if (spellDmg.shieldBroken) {
        gameAudio.playShieldBlock();
        spawnFloatingText('🛡️ BARRERA ANULÓ RELÁMPAGO', playerMaster.posicion, '#34d399');
        triggerBattleMessage(
          `🛡️ ¡El Escudo de ${playerMaster.nombre} absorbió el Relámpago rival!`,
          '#34d399'
        );
      } else {
        spawnFloatingText(`⚡ RELÁMPAGO RIVAL (-${spellDmg.effectiveDmg})`, playerMaster.posicion, '#f43f5e');
        triggerBattleMessage('¡La IA lanza Relámpago contra tu Soberano!', '#f43f5e');
      }
      currentUnits = updateUnitsSync((prev) =>
        prev.map((u) =>
          u.id === playerMaster.id
            ? {
                ...u,
                hpActual: spellDmg.remainingHp,
                ...(spellDmg.shieldBroken ? consumeUnitShieldCharge(u) : {}),
              }
            : u
        )
      );
      if (spellDmg.remainingHp <= 0) {
        handleMasterDefeated(2);
        isAiRunningRef.current = false;
        setCombatLock(false);
        return;
      }
    }
  }

  // 2. TIRADA DE DADOS DE LA IA (Mismas reglas y sistema de aceleración simétrico)
  let currentAiDraw = [...(aiDrawPileRef.current.length > 0 ? aiDrawPileRef.current : aiDrawPile)];
  let currentAiUsed = [...(aiUsedPileRef.current.length > 0 ? aiUsedPileRef.current : aiUsedPile)];
  const aiDrawn = currentAiDraw.splice(0, 3);
  if (aiDrawn.length < 3 && currentAiUsed.length > 0) {
    currentAiDraw = [...currentAiUsed];
    currentAiUsed = [];
    for (let i = currentAiDraw.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [currentAiDraw[i], currentAiDraw[j]] = [currentAiDraw[j], currentAiDraw[i]];
    }
    const needed = 3 - aiDrawn.length;
    aiDrawn.push(...currentAiDraw.splice(0, needed));
  }

  currentAiUsed.push(...aiDrawn);
  setAiDrawPile(currentAiDraw);
  aiDrawPileRef.current = currentAiDraw;
  setAiUsedPile(currentAiUsed);
  aiUsedPileRef.current = currentAiUsed;

  const aiD1 = rollDieWithCampaignRng(activeCampaignIndex);
  const aiD2 = rollDieWithCampaignRng(activeCampaignIndex);
  const aiD3 = rollDieWithCampaignRng(activeCampaignIndex);

  const aiEsTriple = aiD1 === aiD2 && aiD2 === aiD3;
  let aiEsDoble = false;
  let aiNivelBase = 1;
  let aiMaestria = 1;

  if (aiEsTriple) {
    // Triple genuino
  } else if (aiD1 === aiD2) {
    aiEsDoble = true;
    aiNivelBase = aiD1;
    aiMaestria = aiD3;
  } else if (aiD1 === aiD3) {
    aiEsDoble = true;
    aiNivelBase = aiD1;
    aiMaestria = aiD2;
  } else if (aiD2 === aiD3) {
    aiEsDoble = true;
    aiNivelBase = aiD2;
    aiMaestria = aiD1;
  }

  const aiSorted = [aiD1, aiD2, aiD3].sort((a, b) => a - b);
  const aiEsEscalera =
    !aiEsTriple &&
    !aiEsDoble &&
    aiSorted[0] + 1 === aiSorted[1] &&
    aiSorted[1] + 1 === aiSorted[2];

  triggerBattleMessage(
    `🎲 Rival lanzó: [${aiD1}, ${aiD2}, ${aiD3}] ${
      aiEsTriple
        ? '¡TRIPLE SAGRADO!'
        : aiEsDoble
        ? `(Doble Lv.${aiNivelBase} / Maestría ${aiMaestria})`
        : aiEsEscalera
        ? `¡ESCALERA TÁCTICA (${aiSorted[0]}-${aiSorted[1]}-${aiSorted[2]})!`
        : '(Sin pareja)'
    }`,
    '#f43f5e'
  );

  const occupied = new Set(currentUnits.map((u) => u.posicion));
  const playerGravityMasters = currentUnits.filter(
    (u) => u.dueño === 1 && u.esMaestra && (u.gravityTurns || 0) > 0
  );
  const openAdjacent: number[] = [];
  Object.keys(HEX_MAP).forEach((k) => {
    const id = parseInt(k, 10);
    const blockedByGravity = playerGravityMasters.some((gm) => getHexDistance(gm.posicion, id) === 1);
    if (!occupied.has(id) && !blockedByGravity && getHexDistance(aiMaster.posicion, id) === 1) {
      openAdjacent.push(id);
    }
  });

  const aiMinionCount = currentUnits.filter((u) => u.dueño === 2 && !u.esMaestra).length;

  if (aiEsTriple) {
    const titanId = Math.min(6, Math.max(1, aiD1));
    const titan =
      CATALOG_ASCENDED_TITANS.find((t) => t.id === titanId) || CATALOG_ASCENDED_TITANS[0];

    if (openAdjacent.length > 0 && aiMinionCount < 6) {
      openAdjacent.sort((a, b) => {
        const distA = playerMaster ? getHexDistance(a, playerMaster.posicion) : 0;
        const distB = playerMaster ? getHexDistance(b, playerMaster.posicion) : 0;
        return distA - distB;
      });
      const chosenPos = openAdjacent[0];

      const aiTitanMinion: UnitData = {
        id: `ai_titan_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        nombre: `Titán ${titan.name}`,
        nivel: 7,
        rangoNombre: `Ascendido (${titan.roll})`,
        hpActual: titan.hp,
        hpMax: titan.hp,
        daño: titan.atk,
        dueño: 2,
        posicion: chosenPos,
        yaSeMovio: true,
        esMaestra: false,
        esAscendido: true,
        ascendidoTipo: titanId,
      };
      currentUnits = updateUnitsSync((prev) => [...prev, aiTitanMinion]);
      spawnFloatingText(`¡DESPIERTA: ${titan.name}!`, chosenPos, titan.color);
      triggerBattleMessage(`¡LA IA DESPIERTA AL TITÁN ${titan.name.toUpperCase()}!`, titan.color);

      // HABILIDADES PASIVAS / ACTIVAS DEL TITÁN ASCENDIDO RIVAL AL ENTRAR AL TABLERO
      if (titanId === 1) {
        updateManaSync((prev) => ({ ...prev, J2: Math.min(10, prev.J2 + 2) }));
        const t1 = window.setTimeout(() => {
          spawnFloatingText('🌌 VACÍO RIVAL: +2 MANÁ', chosenPos, '#38bdf8');
        }, 300);
        aiTimeoutsRef.current.push(t1);
        triggerBattleMessage(
          `🌌 ¡Poder Cósmico de ${titan.name}: +2 de Maná para el Rival!`,
          '#38bdf8'
        );
      } else if (titanId === 2) {
        currentUnits = updateUnitsSync((prev) =>
          prev.map((u) => {
            if (u.dueño === 2 && u.esMaestra) {
              const nextCharges = (u.shieldCharges ?? (u.hasShield ? 1 : 0)) + 1;
              return { ...u, hasShield: true, shieldCharges: nextCharges };
            }
            return u;
          })
        );
        const t2 = window.setTimeout(() => {
          spawnFloatingText('🛡️ BARRERA SOLAR RIVAL', aiMaster.posicion, '#fbbf24');
        }, 300);
        aiTimeoutsRef.current.push(t2);
        triggerBattleMessage(
          `🛡️ ¡Barrera Solar de ${titan.name}: Escudo protector concedido al Soberano rival!`,
          '#fbbf24'
        );
      } else if (titanId === 3) {
        const t3 = window.setTimeout(() => {
          if (!isAiRunningRef.current) return;
          const playerAllies = unitsRef.current.filter((u) => u.dueño === 1);
          if (playerAllies.length > 0) {
            const nearest = [...playerAllies].sort(
              (a, b) => getHexDistance(chosenPos, a.posicion) - getHexDistance(chosenPos, b.posicion)
            )[0];
            let defeatedTarget = false;
            let defeatedPlayerMaster = false;
            let phoenixRevived = false;
            updateUnitsSync((prev) =>
              prev
                .map((u) => {
                  if (u.id !== nearest.id) return u;
                  const res = calculateTitanEntryDirectDamageHp(u, 2);
                  if (u.esMaestra && u.dueño === 1 && res.nextHp <= 0) {
                    defeatedPlayerMaster = true;
                  }
                  defeatedTarget = res.defeatedMinion;
                  phoenixRevived = res.phoenixResurrected;
                  return {
                    ...u,
                    hpActual: res.nextHp,
                    ...(res.phoenixResurrected ? { hasResurrected: true } : {}),
                  };
                })
                .filter((u) => u.hpActual > 0 || u.esMaestra)
            );
            spawnFloatingText(
              defeatedTarget || defeatedPlayerMaster
                ? '💀 DEVORADO (-2)'
                : phoenixRevived
                ? '🔥 ¡RENACER ÍGNEO (10 HP)!'
                : '🌑 DEVORADO (-2)',
              nearest.posicion,
              phoenixRevived ? '#f97316' : '#a855f7'
            );
            triggerBattleMessage(
              `🌑 ¡Golpe Abisal de ${titan.name}: infligió 2 de daño directo a ${nearest.nombre}${
                defeatedTarget || defeatedPlayerMaster
                  ? ' y lo eliminó'
                  : phoenixRevived
                  ? ' (¡el Fénix renace con 10 HP!)'
                  : ''
              }!`,
              '#a855f7'
            );
            if (defeatedPlayerMaster) {
              handleMasterDefeated(2);
              isAiRunningRef.current = false;
              setCombatLock(false);
            }
          }
        }, 400);
        aiTimeoutsRef.current.push(t3);
      } else if (titanId === 4) {
        const t4 = window.setTimeout(() => {
          if (!isAiRunningRef.current) return;
          const stunnedHexes: number[] = [];
          const killedHexes: number[] = [];
          const revivedHexes: number[] = [];
          let defeatedPlayerMaster = false;
          updateUnitsSync((prev) =>
            prev
              .map((u) => {
                if (u.dueño === 1 && getHexDistance(chosenPos, u.posicion) === 1) {
                  const res = calculateTitanEntryDirectDamageHp(u, 2);
                  if (u.esMaestra && u.dueño === 1 && res.nextHp <= 0) {
                    defeatedPlayerMaster = true;
                    killedHexes.push(u.posicion);
                  } else if (res.defeatedMinion) {
                    killedHexes.push(u.posicion);
                  } else if (res.phoenixResurrected) {
                    revivedHexes.push(u.posicion);
                  } else {
                    stunnedHexes.push(u.posicion);
                  }
                  return {
                    ...u,
                    hpActual: res.nextHp,
                    ...(res.phoenixResurrected ? { hasResurrected: true } : {}),
                    isFrozen: res.nextHp > 0 ? true : u.isFrozen,
                    yaSeMovio: true,
                  };
                }
                return u;
              })
              .filter((u) => u.hpActual > 0 || u.esMaestra)
          );
          stunnedHexes.forEach((p) => spawnFloatingText('⚡ ATURDIDO (-2)', p, '#60a5fa'));
          killedHexes.forEach((p) => spawnFloatingText('💀 FULMINADO (-2)', p, '#60a5fa'));
          revivedHexes.forEach((p) => spawnFloatingText('🔥 ¡RENACER ÍGNEO (10 HP)!', p, '#f97316'));
          triggerBattleMessage(
            `⚡ ¡Cólera del Trueno de ${titan.name}: aturdió y dañó a tus tropas adyacentes!`,
            '#60a5fa'
          );
          if (defeatedPlayerMaster) {
            handleMasterDefeated(2);
            isAiRunningRef.current = false;
            setCombatLock(false);
          }
        }, 350);
        aiTimeoutsRef.current.push(t4);
      } else if (titanId === 5) {
        currentUnits = updateUnitsSync((prev) =>
          prev.map((u) =>
            u.dueño === 2 && u.esMaestra
              ? { ...u, hpActual: Math.min(u.hpMax, u.hpActual + 4) }
              : u
          )
        );
        const t5 = window.setTimeout(() => {
          spawnFloatingText('🔥 LLAMA VITAL (+4 HP)', aiMaster.posicion, '#f97316');
        }, 300);
        aiTimeoutsRef.current.push(t5);
        triggerBattleMessage(
          `🔥 ¡Llama Vital de ${titan.name}: restauró +4 HP al Soberano rival!`,
          '#f97316'
        );
      } else if (titanId === 6) {
        const t6 = window.setTimeout(() => {
          if (!isAiRunningRef.current) return;
          updateUnitsSync((prev) =>
            prev.map((u) => {
              if (u.dueño === 2) {
                const nextCharges = (u.shieldCharges ?? (u.hasShield ? 1 : 0)) + 1;
                return { ...u, hasShield: true, shieldCharges: nextCharges };
              }
              return u;
            })
          );
          spawnFloatingText('⚖️ JUICIO: ESCUDO GLOBAL', chosenPos, '#e2e8f0');
          triggerBattleMessage(
            `⚖️ ¡Sentencia Celestial de ${titan.name}: Escudo protector a todo el ejército rival!`,
            '#e2e8f0'
          );
        }, 300);
        aiTimeoutsRef.current.push(t6);
      }

      gameAudio.playPowerupChime();
      setAscendedCutscene({
        titan,
        ownerName: aiMaster.nombre || 'El Rival',
        isPlayer: false,
      });
    } else {
      updateManaSync((prev) => ({ ...prev, J2: Math.min(10, prev.J2 + 3) }));
      triggerBattleMessage('La IA transmuta tirada triple en +3 Maná Astral', '#c084fc');
    }
  } else if (aiEsDoble) {
    const nivelBase = aiNivelBase;
    const maestria = aiMaestria;
    const stats = calculateCreatureStats(nivelBase, maestria);
    const catalogEntry =
      CATALOG_CREATURES_J2.find((c) => c.nivel === nivelBase) || CATALOG_CREATURES_J2[0];

    if (aiMinionCount >= 6 || openAdjacent.length === 0) {
      if (Math.random() < 0.5) {
        setFichas((prev) => ({
          ...prev,
          J2: { ...prev.J2, [nivelBase]: (prev.J2[nivelBase] || 0) + 1 },
        }));
        updateManaSync((prev) => ({ ...prev, J2: Math.min(10, prev.J2 + 1) }));
        triggerBattleMessage(`La IA guarda ficha Lv.${nivelBase} (+1 Maná)`, '#10b981');
      } else {
        updateManaSync((prev) => ({ ...prev, J2: Math.min(10, prev.J2 + 3) }));
        triggerBattleMessage('La IA convierte tirada en +3 Maná Astral', '#38bdf8');
      }
    } else {
      openAdjacent.sort((a, b) => {
        const distA = playerMaster ? getHexDistance(a, playerMaster.posicion) : 0;
        const distB = playerMaster ? getHexDistance(b, playerMaster.posicion) : 0;
        return distA - distB;
      });
      const chosenPos = openAdjacent[0];

      const aiMinion: UnitData = {
        id: `ai_minion_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        nombre: `${catalogEntry.nombre} [${stats.rangoNombre}]`,
        nivel: nivelBase,
        maestria,
        rangoNombre: stats.rangoNombre,
        hpActual: stats.hp,
        hpMax: stats.hp,
        daño: stats.atk,
        dueño: 2,
        posicion: chosenPos,
        yaSeMovio: true,
        esMaestra: false,
        esAscendido: false,
      };
      currentUnits = updateUnitsSync((prev) => [...prev, aiMinion]);
      spawnFloatingText(`+${aiMinion.nombre}`, chosenPos, '#f43f5e');
      triggerBattleMessage(`✨ Rival invocó a ${aiMinion.nombre} en casilla #${chosenPos}`, '#f43f5e');
    }
  } else if (aiEsEscalera) {
    if (aiMaster && aiMaster.hpActual <= aiMaster.hpMax * 0.5) {
      currentUnits = updateUnitsSync((prev) =>
        prev.map((u) => {
          if (u.id === aiMaster.id) {
            const nextCharges = (u.shieldCharges ?? (u.hasShield ? 1 : 0)) + 1;
            return { ...u, hpActual: Math.min(u.hpMax, u.hpActual + 3), hasShield: true, shieldCharges: nextCharges };
          }
          return u;
        })
      );
      gameAudio.playPowerupChime();
      spawnFloatingText('💧 +3 HP & 🛡️ ESCUDO', aiMaster.posicion, '#10b981');
      triggerBattleMessage(
        `✨ ¡El Rival sacó Escalera (${aiSorted[0]}-${aiSorted[1]}-${aiSorted[2]}) y activa Bálsamo (+3 HP & Escudo)!`,
        '#10b981'
      );
    } else if (aiMana < 2) {
      updateManaSync((prev) => ({ ...prev, J2: Math.min(10, prev.J2 + 2) }));
      gameAudio.playCoinPickup();
      spawnFloatingText('⚡ +2 MANÁ', aiMaster.posicion, '#38bdf8');
      triggerBattleMessage(
        `✨ ¡El Rival sacó Escalera (${aiSorted[0]}-${aiSorted[1]}-${aiSorted[2]}) y activa Sobrecarga (+2 Maná)!`,
        '#38bdf8'
      );
    } else {
      currentUnits = updateUnitsSync((prev) =>
        prev.map((u) => (u.dueño === 2 ? { ...u, daño: u.daño + 1 } : u))
      );
      gameAudio.playSwordClash();
      spawnFloatingText('⚔️ +1 ATK', aiMaster.posicion, '#f43f5e');
      triggerBattleMessage(
        `✨ ¡El Rival sacó Escalera (${aiSorted[0]}-${aiSorted[1]}-${aiSorted[2]}) y activa Fervor Marcial (+1 ATK)!`,
        '#f43f5e'
      );
    }
  }

  // 3. FASE DE COMBATE Y MOVIMIENTO TÁCTICO AVANZADO CON DEMORAS HUMANAS
  const mainAiTimer = window.setTimeout(() => {
    const battleUnits = [...unitsRef.current];
    const readyAiUnits = battleUnits.filter((u) => u.dueño === 2 && !u.yaSeMovio && !u.isFrozen);

    let currentStep = 0;

    const processNextUnit = () => {
      if (!isAiRunningRef.current || jugadorActivoRef.current !== 2) return;
      if (currentStep >= readyAiUnits.length) {
        const finishTimer = window.setTimeout(() => {
          if (!isAiRunningRef.current || jugadorActivoRef.current !== 2) return;
          if (specialRunes.length > 0) {
            let aiGainedMana = false;
            updateUnitsSync((prev) =>
              prev.map((u) => {
                if (u.dueño === 2) {
                  const runeOnHex = specialRunes.find((r) => r.hexId === u.posicion);
                  if (runeOnHex) {
                    if (runeOnHex.type === 'LAVA') {
                      const burnedHp = Math.max(1, u.hpActual - 1);
                      spawnFloatingText('🔥 LAVA (-1 HP / +2 ATK)', u.posicion, '#f97316');
                      return {
                        ...u,
                        hpActual: burnedHp,
                        bonusDamageNextTurn: (u.bonusDamageNextTurn || 0) + 2,
                      };
                    } else if (runeOnHex.type === 'HEAL') {
                      const healedHp = Math.min(u.hpMax, u.hpActual + 2);
                      spawnFloatingText('💧 MANANTIAL (+2 HP)', u.posicion, '#10b981');
                      return { ...u, hpActual: healedHp };
                    } else if (runeOnHex.type === 'MANA') {
                      aiGainedMana = true;
                      spawnFloatingText('⚡ MANÁ (+1M)', u.posicion, '#38bdf8');
                    }
                  }
                }
                return u;
              })
            );
            if (aiGainedMana) {
              updateManaSync((m) => ({ ...m, J2: Math.min(10, m.J2 + 1) }));
            }
          }

          isAiRunningRef.current = false;
          setCombatLock(false);
          jugadorActivoRef.current = 1;
          setJugadorActivo(1);
          setDadosLanzados(false);
          setResultadoDados([]);
          cancelInvocation();
          clearSelection();
          updateUnitsSync((prev) => refreshUnitsForNextTurn(prev, 1));
          triggerBattleMessage('TURNO: JUGADOR (AZUL)', '#38bdf8');
        }, 800);
        aiTimeoutsRef.current.push(finishTimer);
        return;
      }

      const aiU = readyAiUnits[currentStep];
      currentStep++;

      const stillAlive = unitsRef.current.find((u) => u.id === aiU.id);
      if (!stillAlive || stillAlive.yaSeMovio || stillAlive.isFrozen) {
        processNextUnit();
        return;
      }

      const freshBattleUnits = [...unitsRef.current];
      const plan = planAiUnitAction(stillAlive, freshBattleUnits);

      if (plan.type === 'ATTACK' && plan.targetUnit) {
        const target = plan.targetUnit;
        gameAudio.playMeleePunch();

        const aiCalc = calculateAttackDamagePreview(stillAlive, target, cityTimeOfDay);
        const effectiveDmg = aiCalc.effectiveDmg;
        const shieldBroken = aiCalc.shieldBrokenDefender;
        if (shieldBroken) {
          gameAudio.playShieldBlock();
          if (target.esMaestra) {
            spawnFloatingText('🛡️ BARRERA ANULÓ TODO EL DAÑO', target.posicion, '#34d399');
            triggerBattleMessage(
              `🛡️ ¡La Barrera Solar de ${target.nombre} anuló por completo el ataque de ${stillAlive.nombre} (0 Daño)!`,
              '#34d399'
            );
          } else {
            spawnFloatingText('🛡️ BARRERA ABSORBIÓ', target.posicion, '#34d399');
          }
        }

        spawnFloatingText(`-${effectiveDmg} HP`, target.posicion, '#ef4444');
        triggerBattleMessage(
          `⚔️ ¡El rival ${stillAlive.nombre} atacó a ${target.nombre} (-${effectiveDmg} HP)!`,
          '#f43f5e'
        );
        const newHp = aiCalc.remainingHp;
        if (aiCalc.isPhoenixWillResurrect) {
          gameAudio.playVictoryFanfare();
          spawnFloatingText('🔥 ¡RENACER ÍGNEO (10 HP)!', target.posicion, '#f97316');
          triggerBattleMessage(`🔥 ¡El Fénix Eterno renace de sus cenizas con 10 HP!`, '#f97316');
        }

        updateUnitsSync((prev) =>
          prev
            .map((u) => {
              if (u.id === target.id) {
                if (aiCalc.isPhoenixWillResurrect) {
                  return {
                    ...u,
                    hpActual: 10,
                    hasResurrected: true,
                    ...(shieldBroken ? consumeUnitShieldCharge(u) : {}),
                    isFrozen: aiCalc.hasFrost ? true : u.isFrozen,
                    yaSeMovio: aiCalc.hasFrost ? true : u.yaSeMovio,
                  };
                }
                return {
                  ...u,
                  hpActual: newHp,
                  ...(shieldBroken ? consumeUnitShieldCharge(u) : {}),
                  isFrozen: aiCalc.hasFrost ? true : u.isFrozen,
                  yaSeMovio: aiCalc.hasFrost ? true : u.yaSeMovio,
                };
              }
              if (u.id === stillAlive.id) {
                return {
                  ...u,
                  hpActual: Math.min(u.hpMax, u.hpActual + aiCalc.vampiricHealAmount),
                  yaSeMovio: true,
                  bonusDamageNextTurn: 0,
                  lastAttackSeq: (u.lastAttackSeq || 0) + 1,
                };
              }
              return u;
            })
            .filter((u) => u.hpActual > 0 || u.esMaestra)
        );

        if (newHp <= 0 && target.esMaestra) {
          handleMasterDefeated(2);
          isAiRunningRef.current = false;
          return;
        }

        const nextStepTimer = window.setTimeout(processNextUnit, 700);
        aiTimeoutsRef.current.push(nextStepTimer);
      } else if (plan.type === 'MOVE' && plan.bestMoveHex !== undefined) {
        const bestMove = plan.bestMoveHex;

        gameAudio.playCrispClick();
        triggerBattleMessage(`👟 Rival movió a ${stillAlive.nombre}`, '#a855f7');

        updateUnitsSync((prev) =>
          prev.map((u) => (u.id === stillAlive.id ? { ...u, posicion: bestMove, yaSeMovio: true } : u))
        );

        const nextStepTimer = window.setTimeout(processNextUnit, 750);
        aiTimeoutsRef.current.push(nextStepTimer);
      } else {
        const nextStepTimer = window.setTimeout(processNextUnit, 300);
        aiTimeoutsRef.current.push(nextStepTimer);
      }
    };

    processNextUnit();
  }, 900);
  aiTimeoutsRef.current.push(mainAiTimer);
}
