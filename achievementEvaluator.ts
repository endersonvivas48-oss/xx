import { Achievement } from './TrophyModal';
import { AchievementProgression, ColiseumDifficulty, DieData, Orb } from './types';
import { CATALOG_GRIMOIRE_SPELLS } from './gameCatalogData';

// MAPEO DE EQUIVALENCIAS MUTUAMENTE EXCLUYENTES:
// Vincula logros clásicos con los IDs y niveles reales de INITIAL_TIERED_ACHIEVEMENTS
export const MUTUAL_ACHIEVEMENT_LINKS: Record<string, { tieredId: string; levelNumber: number }> = {
  ach_coliseum_wave_5: { tieredId: 'tiered_maestro_supervivencia', levelNumber: 1 },
  ach_coliseum_wave_10: { tieredId: 'tiered_maestro_supervivencia', levelNumber: 2 },
  ach_all_grimoire_spells: { tieredId: 'tiered_alquimia_prohibida', levelNumber: 4 },
  ach_camp_2: { tieredId: 'tiered_gran_cruzada', levelNumber: 2 },
  ach_camp_3: { tieredId: 'tiered_gran_cruzada', levelNumber: 3 },
  ach_all_campaigns: { tieredId: 'tiered_gran_cruzada', levelNumber: 4 },
  ach_legendary_gemmed: { tieredId: 'tiered_senor_de_las_runas', levelNumber: 3 },
  ach_forge_legendary_throne: { tieredId: 'tiered_senor_de_las_runas', levelNumber: 4 },
};

export interface ClassicAchievementSnapshot {
  completedHouseTutorialsCount: number;
  defeatedAlleyOpponentsCount: number;
  campaignsProgress: Record<number, { completed?: boolean }>;
  playerDeck: DieData[];
  maxSpellSlots: number;
  unlockedSpells: string[];
  survivalHighScore: number;
  survivalWave: number;
  isSurvivalMode: boolean;
  orbBank: Orb[];
  forgeInventory: Record<string, number>;
  manaJ1: number;
  myMinionsCount: number;
  totalBankedCount: number;
  isTutorialBattleActive?: boolean;
}

export interface TieredAchievementSnapshot {
  statsWon: number;
  survivalHighScore: number;
  survivalWave: number;
  isSurvivalMode: boolean;
  survivalDifficulty: ColiseumDifficulty;
  campaignsProgress: Record<number, { completed?: boolean }>;
  unlockedSpells: string[];
  maxSpellSlots: number;
  playerDeck: DieData[];
  forgeMasteryLevel: number;
}

/**
 * Función pura que evalúa los ~30 logros clásicos contra un snapshot de progreso/combate.
 * Retorna la referencia original `prev` si ningún campo cambió.
 */
export function evaluateClassicAchievements(
  prev: Achievement[],
  snapshot: ClassicAchievementSnapshot
): Achievement[] {
  const {
    completedHouseTutorialsCount,
    defeatedAlleyOpponentsCount,
    campaignsProgress,
    playerDeck,
    maxSpellSlots,
    unlockedSpells,
    survivalHighScore,
    survivalWave,
    isSurvivalMode,
    orbBank,
    forgeInventory,
    manaJ1,
    myMinionsCount,
    totalBankedCount,
    isTutorialBattleActive = false,
  } = snapshot;

  const completedWaves = Math.max(
    0,
    survivalHighScore || 0,
    isSurvivalMode && survivalWave > 1 ? survivalWave - 1 : 0
  );

  let anyChanged = false;
  const updated = prev.map((a) => {
    if (isTutorialBattleActive && a.id !== 'ach_all_tutorials') {
      return a;
    }

    let newProgress = a.progress || 0;
    let isNowUnlocked = a.isUnlocked;

    if (a.id === 'ach_all_tutorials') {
      newProgress = Math.min(12, completedHouseTutorialsCount);
      if (newProgress >= 12) isNowUnlocked = true;
    } else if (a.id === 'ach_alley_first') {
      newProgress = Math.min(1, defeatedAlleyOpponentsCount);
      if (newProgress >= 1) isNowUnlocked = true;
    } else if (a.id === 'ach_alley_12') {
      newProgress = Math.min(12, defeatedAlleyOpponentsCount);
      if (newProgress >= 12) isNowUnlocked = true;
    } else if (a.id === 'ach_tourney_champ') {
      if (campaignsProgress[0]?.completed) {
        newProgress = 1;
        isNowUnlocked = true;
      }
    } else if (a.id === 'ach_camp_2') {
      if (campaignsProgress[1]?.completed) {
        newProgress = 1;
        isNowUnlocked = true;
      }
    } else if (a.id === 'ach_camp_3') {
      if (campaignsProgress[2]?.completed) {
        newProgress = 1;
        isNowUnlocked = true;
      }
    } else if (a.id === 'ach_camp_4') {
      if (campaignsProgress[3]?.completed) {
        newProgress = 1;
        isNowUnlocked = true;
      }
    } else if (a.id === 'ach_coliseum_first_win') {
      newProgress = Math.min(1, completedWaves);
      if (newProgress >= 1) isNowUnlocked = true;
    } else if (a.id === 'ach_coliseum_wave_3') {
      newProgress = Math.min(3, completedWaves);
      if (newProgress >= 3) isNowUnlocked = true;
    } else if (a.id === 'ach_coliseum_wave_5') {
      newProgress = Math.min(5, completedWaves);
      if (newProgress >= 5) isNowUnlocked = true;
    } else if (a.id === 'ach_coliseum_wave_10') {
      newProgress = Math.min(10, completedWaves);
      if (newProgress >= 10) isNowUnlocked = true;
    } else if (a.id === 'ach_all_campaigns') {
      const completedCount = [0, 1, 2, 3].filter((idx) => campaignsProgress[idx]?.completed).length;
      newProgress = completedCount;
      if (completedCount >= 4) {
        isNowUnlocked = true;
      }
    } else if (a.id === 'ach_deck_24') {
      newProgress = Math.min(24, playerDeck.filter((d) => d.enMazo).length);
      if (newProgress >= 24) isNowUnlocked = true;
    } else if (a.id === 'ach_forge_first_die') {
      const hasForgedDie = playerDeck.some((d) => d.id.startsWith('d_forge_'));
      if (hasForgedDie) {
        newProgress = 1;
        isNowUnlocked = true;
      }
    } else if (a.id === 'ach_forge_orb_crystal') {
      const hasForgedOrb =
        orbBank.some((o) => o.id.startsWith('o_forge_')) ||
        playerDeck.some((d) => d.attachedOrbs.some((o) => o.id.startsWith('o_forge_')));
      if (hasForgedOrb) {
        newProgress = 1;
        isNowUnlocked = true;
      }
    } else if (a.id === 'ach_forge_legendary_throne') {
      const hasThroneDie = playerDeck.some(
        (d) => d.id.startsWith('d_forge_') && d.rarity.name === 'Legendario'
      );
      if (hasThroneDie) {
        newProgress = 1;
        isNowUnlocked = true;
      }
    } else if (a.id === 'ach_forge_materials_hoarder') {
      const totalMats = Object.values(forgeInventory).reduce((acc, count) => acc + count, 0);
      newProgress = Math.min(15, totalMats);
      if (totalMats >= 15) {
        isNowUnlocked = true;
      }
    } else if (a.id === 'ach_spell_slot') {
      newProgress = Math.min(2, maxSpellSlots);
      if (maxSpellSlots >= 2) isNowUnlocked = true;
    } else if (a.id === 'ach_max_slots') {
      newProgress = Math.min(4, maxSpellSlots);
      if (maxSpellSlots >= 4) isNowUnlocked = true;
    } else if (a.id === 'ach_all_basic_spells') {
      const basicIds = ['rayo', 'escudo', 'transposicion', 'juicio'];
      const ownedBasics = basicIds.filter((id) => unlockedSpells.includes(id)).length;
      newProgress = ownedBasics;
      if (ownedBasics >= basicIds.length) isNowUnlocked = true;
    } else if (a.id === 'ach_all_advanced_spells') {
      const advIds = ['tormenta', 'vinculo', 'prision', 'ira_ra', 'gravedad', 'supremo'];
      const ownedAdv = advIds.filter((id) => unlockedSpells.includes(id)).length;
      newProgress = ownedAdv;
      if (ownedAdv >= advIds.length) isNowUnlocked = true;
    } else if (a.id === 'ach_all_grimoire_spells') {
      const totalCatalog = Object.keys(CATALOG_GRIMOIRE_SPELLS).length;
      const totalOwned = Object.keys(CATALOG_GRIMOIRE_SPELLS).filter((id) =>
        unlockedSpells.includes(id)
      ).length;
      newProgress = totalOwned;
      if (totalOwned >= totalCatalog) isNowUnlocked = true;
    } else if (a.id === 'ach_mana_surge') {
      newProgress = Math.max(newProgress, Math.min(10, manaJ1));
      if (manaJ1 >= 10) isNowUnlocked = true;
    } else if (a.id === 'ach_minions_4') {
      newProgress = Math.max(newProgress, Math.min(4, myMinionsCount));
      if (myMinionsCount >= 4) isNowUnlocked = true;
    } else if (a.id === 'ach_full_minion_limit') {
      newProgress = Math.max(newProgress, Math.min(6, myMinionsCount));
      if (myMinionsCount >= 6) isNowUnlocked = true;
    } else if (a.id === 'ach_bank_master') {
      newProgress = Math.max(newProgress, Math.min(5, totalBankedCount));
      if (totalBankedCount >= 5) isNowUnlocked = true;
    } else if (a.id === 'ach_orb_collector') {
      const distinctOrbTypes = new Set<string>();
      orbBank.forEach((o) => {
        distinctOrbTypes.add(o.name || o.element || o.id);
      });
      playerDeck.forEach((d) => {
        d.attachedOrbs.forEach((o) => {
          distinctOrbTypes.add(o.name || o.element || o.id);
        });
      });
      newProgress = Math.min(4, distinctOrbTypes.size);
      if (distinctOrbTypes.size >= 4) isNowUnlocked = true;
    } else if (a.id === 'ach_legendary_gemmed') {
      let maxDistinctCount = 0;
      playerDeck.forEach((d) => {
        if (d.rarity.name === 'Legendario' && d.attachedOrbs.length > 0) {
          const distinctTypes = new Set(
            d.attachedOrbs.map((o) => (o.element || o.name || '').trim().toLowerCase())
          );
          if (distinctTypes.size > maxDistinctCount) {
            maxDistinctCount = distinctTypes.size;
          }
        }
      });
      newProgress = Math.min(3, maxDistinctCount);
      if (maxDistinctCount >= 3) {
        isNowUnlocked = true;
      }
    } else if (a.id === 'ach_orb_equip') {
      const hasEquippedOrb = playerDeck.some((d) => d.attachedOrbs.length > 0);
      if (hasEquippedOrb) {
        newProgress = 1;
        isNowUnlocked = true;
      }
    }

    if (newProgress !== a.progress || isNowUnlocked !== a.isUnlocked) {
      anyChanged = true;
      return {
        ...a,
        progress: newProgress,
        isUnlocked: isNowUnlocked,
      };
    }
    return a;
  });

  return anyChanged ? updated : prev;
}

/**
 * Función pura que evalúa los logros escalonados de 4 niveles.
 * Retorna la referencia original `prev` si ningún campo cambió.
 */
export function evaluateTieredAchievements(
  prev: AchievementProgression[],
  snapshot: TieredAchievementSnapshot
): AchievementProgression[] {
  const {
    statsWon,
    survivalHighScore,
    survivalWave,
    isSurvivalMode,
    survivalDifficulty,
    campaignsProgress,
    unlockedSpells,
    maxSpellSlots,
    playerDeck,
    forgeMasteryLevel,
  } = snapshot;

  let anyChanged = false;
  const updated = prev.map((ach) => {
    let currentVal = ach.currentValue;
    let unlockedLvl = ach.unlockedLevel;

    if (ach.id === 'tiered_maestro_supervivencia') {
      const completedWaves = Math.max(
        0,
        survivalHighScore || 0,
        isSurvivalMode && (survivalWave || 0) > 1 ? (survivalWave || 0) - 1 : 0
      );
      currentVal = completedWaves;
      if (completedWaves >= 20 || (completedWaves >= 15 && survivalDifficulty === 'PESADILLA')) {
        unlockedLvl = Math.max(unlockedLvl, 4);
      } else if (completedWaves >= 15) {
        unlockedLvl = Math.max(unlockedLvl, 3);
      } else if (completedWaves >= 10) {
        unlockedLvl = Math.max(unlockedLvl, 2);
      } else if (completedWaves >= 5) {
        unlockedLvl = Math.max(unlockedLvl, 1);
      }
    } else if (ach.id === 'tiered_alquimia_prohibida') {
      const spellsCount = unlockedSpells.length;
      currentVal = spellsCount;
      if (spellsCount >= 10) {
        unlockedLvl = Math.max(unlockedLvl, 4);
      } else if (spellsCount >= 8) {
        unlockedLvl = Math.max(unlockedLvl, 3);
      } else if (spellsCount >= 6 && maxSpellSlots >= 2) {
        unlockedLvl = Math.max(unlockedLvl, 2);
      } else if (spellsCount >= 3) {
        unlockedLvl = Math.max(unlockedLvl, 1);
      }
    } else if (ach.id === 'tiered_gran_cruzada') {
      const completedCount = [0, 1, 2, 3].filter((idx) => campaignsProgress[idx]?.completed).length;
      currentVal = statsWon;
      if (statsWon >= 100 && campaignsProgress[3]?.completed) {
        unlockedLvl = Math.max(unlockedLvl, 4);
      } else if (statsWon >= 60 && completedCount >= 3) {
        unlockedLvl = Math.max(unlockedLvl, 3);
      } else if (statsWon >= 35 && completedCount >= 2) {
        unlockedLvl = Math.max(unlockedLvl, 2);
      } else if (statsWon >= 15) {
        unlockedLvl = Math.max(unlockedLvl, 1);
      }
    } else if (ach.id === 'tiered_senor_de_las_runas') {
      currentVal = forgeMasteryLevel;
      const multiGemmedCount = playerDeck.filter((d) => (d.attachedOrbs?.length || 0) >= 2).length;
      const tripleGemmedCount = playerDeck.filter((d) => (d.attachedOrbs?.length || 0) >= 3).length;

      if (forgeMasteryLevel >= 12 && playerDeck.length >= 24) {
        unlockedLvl = Math.max(unlockedLvl, 4);
      } else if (forgeMasteryLevel >= 9 && tripleGemmedCount >= 1) {
        unlockedLvl = Math.max(unlockedLvl, 3);
      } else if (forgeMasteryLevel >= 6 && multiGemmedCount >= 3) {
        unlockedLvl = Math.max(unlockedLvl, 2);
      } else if (forgeMasteryLevel >= 3) {
        unlockedLvl = Math.max(unlockedLvl, 1);
      }
    }

    if (currentVal !== ach.currentValue || unlockedLvl !== ach.unlockedLevel) {
      anyChanged = true;
      return {
        ...ach,
        currentValue: currentVal,
        unlockedLevel: unlockedLvl,
      };
    }
    return ach;
  });

  return anyChanged ? updated : prev;
}

/**
 * Sincroniza de forma pura los cobros mutuos entre logros clásicos y avanzados.
 */
export function syncMutualAchievementClaims(
  classic: Achievement[],
  tiered: AchievementProgression[]
): {
  nextClassic: Achievement[];
  nextTiered: AchievementProgression[];
  classicChanged: boolean;
  tieredChanged: boolean;
} {
  let needsTieredUpdate = false;
  let needsClassicUpdate = false;

  Object.entries(MUTUAL_ACHIEVEMENT_LINKS).forEach(([classicId, link]) => {
    const c = classic.find((a) => a.id === classicId);
    const t = tiered.find((ta) => ta.id === link.tieredId);
    if (c && t) {
      if (c.isClaimed && !t.claimedLevels.includes(link.levelNumber)) {
        needsTieredUpdate = true;
      } else if (t.claimedLevels.includes(link.levelNumber) && !c.isClaimed) {
        needsClassicUpdate = true;
      }
    }
  });

  const nextTiered = needsTieredUpdate
    ? tiered.map((ta) => {
        const linksToApply = Object.entries(MUTUAL_ACHIEVEMENT_LINKS).filter(
          ([classicId, link]) =>
            link.tieredId === ta.id &&
            classic.some((a) => a.id === classicId && a.isClaimed) &&
            !ta.claimedLevels.includes(link.levelNumber)
        );
        if (linksToApply.length === 0) return ta;
        const newLevels = linksToApply.map(([, l]) => l.levelNumber);
        return {
          ...ta,
          claimedLevels: Array.from(new Set([...ta.claimedLevels, ...newLevels])),
        };
      })
    : tiered;

  const nextClassic = needsClassicUpdate
    ? classic.map((a) => {
        const link = MUTUAL_ACHIEVEMENT_LINKS[a.id];
        if (!link) return a;
        const t = nextTiered.find((ta) => ta.id === link.tieredId);
        if (t && t.claimedLevels.includes(link.levelNumber) && !a.isClaimed) {
          return { ...a, isClaimed: true };
        }
        return a;
      })
    : classic;

  return {
    nextClassic,
    nextTiered,
    classicChanged: needsClassicUpdate,
    tieredChanged: needsTieredUpdate,
  };
}
