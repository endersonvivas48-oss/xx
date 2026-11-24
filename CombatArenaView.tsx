import React, { useState, useEffect } from 'react';
import Game from './Game';
import { useIsMobile, isAndroidDevice } from './utils';
import { getHexDistance, HEX_MAP } from './hexGrid';
import { BattleHud } from './BattleHud';
import { CombatDecisionModals, BankedCrestItem, BankedCrestModalData, CombatSpellItem, LimitModalData, SpellConfirmModalData } from './CombatDecisionModals';
import { getGladiatorPortraitUrls } from './gladiatorImageMap';
import { CachedImage } from './CachedImage';
import {
  UnitData,
  RolledDieResult,
  FloatingText,
  SpellVFX,
  SpecialHexRune,
} from './types';
import { CombatLogEntry } from './useTacticalBattleState';
import { HouseTutorialLesson } from './houseTutorialsData';
import { CATALOG_GRIMOIRE_SPELLS } from './gameCatalogData';
import { calculateAttackDamagePreview } from './tacticalCombatFormulas';

const MAIN_CDN_BASE = 'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main';
const MAIN_RAW_BASE = 'https://raw.githubusercontent.com/endersonvivas48-oss/main/main';

const PLAYER_MASTER_PORTRAIT_URLS = [
  `${MAIN_CDN_BASE}/master_avatar.webp`,
  `${MAIN_RAW_BASE}/master_avatar.webp`,
  `${MAIN_CDN_BASE}/master_avatar.jpg`,
  `${MAIN_RAW_BASE}/master_avatar.jpg`,
  `${MAIN_CDN_BASE}/rey_maestro.jpg`,
  `${MAIN_RAW_BASE}/rey_maestro.jpg`,
  'https://raw.githubusercontent.com/endersonvivas48-oss/jugador-2/main/l6.png',
  'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/jugador-2@main/l6.png',
  'https://raw.githubusercontent.com/endersonvivas48-oss/piezam/main/master_avatar.jpg',
];

function getCombatUnitPortraitUrls(unit: UnitData, currentOpponentId: string): string[] {
  if (unit.esAscendido) {
    const titanIndex = unit.ascendidoTipo || 1;
    return [
      `${MAIN_CDN_BASE}/asc${titanIndex}.webp`,
      `${MAIN_RAW_BASE}/asc${titanIndex}.webp`,
      `${MAIN_CDN_BASE}/asc${titanIndex}.png`,
      `${MAIN_RAW_BASE}/asc${titanIndex}.png`,
      `https://raw.githubusercontent.com/endersonvivas48-oss/jugador-2/main/asc${titanIndex}.png`,
      `https://cdn.jsdelivr.net/gh/endersonvivas48-oss/jugador-2@main/asc${titanIndex}.png`,
      `https://raw.githubusercontent.com/endersonvivas48-oss/logoin/main/asc${titanIndex}.png`,
    ];
  }
  if (unit.esMaestra) {
    if (unit.dueño === 1) {
      return PLAYER_MASTER_PORTRAIT_URLS;
    }
    return getGladiatorPortraitUrls(currentOpponentId, unit.nombre);
  }
  const lvl = unit.nivel || 1;
  return [
    `${MAIN_CDN_BASE}/l${lvl}.webp`,
    `${MAIN_RAW_BASE}/l${lvl}.webp`,
    `${MAIN_CDN_BASE}/l${lvl}.png`,
    `${MAIN_RAW_BASE}/l${lvl}.png`,
    `https://raw.githubusercontent.com/endersonvivas48-oss/jugador-2/main/l${lvl}.png`,
    `https://cdn.jsdelivr.net/gh/endersonvivas48-oss/jugador-2@main/l${lvl}.png`,
    `https://raw.githubusercontent.com/endersonvivas48-oss/logoin/main/l${lvl}.png`,
    `https://cdn.jsdelivr.net/gh/endersonvivas48-oss/logoin@main/l${lvl}.png`,
  ];
}

const HEX_PORTRAIT_CLIP = 'polygon(50% 4%, 93% 25%, 93% 75%, 50% 96%, 7% 75%, 7% 25%)';

function MasterCombatHUD({
  units,
  jugadorActivo,
  mana,
  playerName = 'Master 1',
  currentOpponentId = 'default',
}: {
  units: UnitData[];
  jugadorActivo: 1 | 2;
  mana: { J1: number; J2: number };
  playerName?: string;
  currentOpponentId?: string;
}) {
  const j1Master = units.find((u) => u.dueño === 1 && u.esMaestra);
  const j2Master = units.find((u) => u.dueño === 2 && u.esMaestra);

  const j1Hp = j1Master ? j1Master.hpActual : 0;
  const j1MaxHp = j1Master ? j1Master.hpMax : 24;
  const j2Hp = j2Master ? j2Master.hpActual : 0;
  const j2MaxHp = j2Master ? j2Master.hpMax : 24;

  const j1Percent = Math.max(0, Math.min(100, (j1Hp / j1MaxHp) * 100));
  const j2Percent = Math.max(0, Math.min(100, (j2Hp / j2MaxHp) * 100));

  const j1ManaPercent = Math.max(0, Math.min(100, (mana.J1 / 10) * 100));
  const j2ManaPercent = Math.max(0, Math.min(100, (mana.J2 / 10) * 100));

  const isJ1Active = jugadorActivo === 1;
  const isJ2Active = jugadorActivo === 2;
  const j1PortraitUrls = j1Master
    ? getCombatUnitPortraitUrls(j1Master, currentOpponentId)
    : PLAYER_MASTER_PORTRAIT_URLS;
  const j2PortraitUrls = j2Master
    ? getCombatUnitPortraitUrls(j2Master, currentOpponentId)
    : getGladiatorPortraitUrls(currentOpponentId, 'Rival');

  return (
    <div className="absolute top-0.5 inset-x-0 z-20 pointer-events-none flex justify-center px-1.5 sm:px-3">
      <div className={`relative w-full max-w-2xl flex items-center justify-between px-2 py-1 rounded-2xl border border-amber-500/30 shadow-md ${isAndroidDevice() ? 'bg-black/85' : 'bg-black/60 sm:bg-black/75 backdrop-blur-md'}`}>
        {/* LADO IZQUIERDO: MASTER 1 (JUGADOR 1) */}
        <div
          className={`flex items-center gap-1.5 sm:gap-2.5 transition-all duration-300 ${
            isJ1Active
              ? 'opacity-100 scale-100 filter drop-shadow-[0_0_12px_rgba(56,189,248,0.7)]'
              : 'opacity-70 scale-95'
          }`}
        >
          <div className="relative w-9 h-9 sm:w-11 sm:h-11 shrink-0 flex items-center justify-center">
            {isJ1Active && (
              <div className="absolute -inset-0.5 rounded-full bg-cyan-400/40 blur-xs animate-pulse pointer-events-none" />
            )}
            <div
              className="w-full h-full flex items-center justify-center p-[2px]"
              style={{
                clipPath: HEX_PORTRAIT_CLIP,
                backgroundColor: isJ1Active ? '#38bdf8' : '#eab308',
              }}
            >
              <div
                className="w-full h-full bg-slate-950 overflow-hidden flex items-center justify-center"
                style={{ clipPath: HEX_PORTRAIT_CLIP }}
              >
                <CachedImage
                  cacheKey="hud_master_j1"
                  candidateUrls={j1PortraitUrls}
                  alt={playerName}
                  className="w-full h-full object-cover object-top"
                  fallbackPlaceholder={<span className="text-sm">👑</span>}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 leading-none mb-0.5">
              <span className="font-serif font-black text-[10px] sm:text-xs text-slate-100 truncate max-w-[70px] sm:max-w-[120px]">
                {playerName}
              </span>
              {isJ1Active && (
                <span className="text-[7.5px] px-1 rounded bg-cyan-500/20 text-cyan-300 font-sans border border-cyan-400/40 shrink-0">
                  TURNO
                </span>
              )}
              <span className="text-[9px] sm:text-[10px] font-mono font-bold text-emerald-400 ml-auto">
                {j1Hp}/{j1MaxHp}
              </span>
            </div>

            <div className="relative w-20 sm:w-36 h-2 sm:h-2.5 bg-stone-950 rounded-sm border border-stone-700 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-600 via-green-500 to-emerald-400 transition-all duration-300"
                style={{ width: `${j1Percent}%` }}
              />
            </div>

            <div className="mt-0.5 flex items-center gap-1">
              <div className="relative w-16 sm:w-28 h-1 sm:h-1.5 bg-stone-950 rounded-xs border border-stone-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 via-cyan-500 to-sky-400 transition-all duration-300"
                  style={{ width: `${j1ManaPercent}%` }}
                />
              </div>
              <span className="text-[8px] font-mono font-bold text-cyan-300 leading-none">
                {mana.J1}M
              </span>
            </div>
          </div>
        </div>

        {/* CENTRO: GEMA ORNAMENTAL */}
        <div className="relative shrink-0 flex items-center justify-center px-1">
          <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-full bg-stone-900 border border-amber-500/80 flex items-center justify-center shadow">
            <div className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 rounded-full bg-gradient-to-br from-rose-400 to-red-600 border border-amber-300 shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
          </div>
        </div>

        {/* LADO DERECHO: MASTER 2 (IA / OPONENTE) */}
        <div
          className={`flex items-center gap-1.5 sm:gap-2.5 flex-row-reverse transition-all duration-300 ${
            isJ2Active
              ? 'opacity-100 scale-100 filter drop-shadow-[0_0_12px_rgba(244,63,94,0.7)]'
              : 'opacity-70 scale-95'
          }`}
        >
          <div className="relative w-9 h-9 sm:w-11 sm:h-11 shrink-0 flex items-center justify-center">
            {isJ2Active && (
              <div className="absolute -inset-0.5 rounded-full bg-rose-500/40 blur-xs animate-pulse pointer-events-none" />
            )}
            <div
              className="w-full h-full flex items-center justify-center p-[2px]"
              style={{
                clipPath: HEX_PORTRAIT_CLIP,
                backgroundColor: isJ2Active ? '#f43f5e' : '#eab308',
              }}
            >
              <div
                className="w-full h-full bg-slate-950 overflow-hidden flex items-center justify-center"
                style={{ clipPath: HEX_PORTRAIT_CLIP }}
              >
                <CachedImage
                  cacheKey={`hud_master_j2_${currentOpponentId}_${j2Master?.nombre || 'rival'}`}
                  candidateUrls={j2PortraitUrls}
                  alt={j2Master?.nombre || 'Rival'}
                  className="w-full h-full object-cover object-top"
                  fallbackPlaceholder={<span className="text-sm">⚔️</span>}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1.5 leading-none mb-0.5">
              <span className="text-[9px] sm:text-[10px] font-mono font-bold text-rose-400">
                {j2Hp}/{j2MaxHp}
              </span>
              {isJ2Active && (
                <span className="text-[7.5px] px-1 rounded bg-rose-500/20 text-rose-300 font-sans border border-rose-400/40 shrink-0">
                  TURNO
                </span>
              )}
              <span className="font-serif font-black text-[10px] sm:text-xs text-slate-100 truncate max-w-[70px] sm:max-w-[120px]">
                {j2Master?.nombre?.split(' ')[0] || 'Rival'}
              </span>
            </div>

            <div className="relative w-20 sm:w-36 h-2 sm:h-2.5 bg-stone-950 rounded-sm border border-stone-700 overflow-hidden flex justify-end">
              <div
                className="h-full bg-gradient-to-l from-rose-600 via-red-500 to-rose-400 transition-all duration-300"
                style={{ width: `${j2Percent}%` }}
              />
            </div>

            <div className="mt-0.5 flex items-center gap-1 flex-row-reverse">
              <div className="relative w-16 sm:w-28 h-1 sm:h-1.5 bg-stone-950 rounded-xs border border-stone-800 overflow-hidden flex justify-end">
                <div
                  className="h-full bg-gradient-to-l from-purple-600 via-indigo-500 to-violet-400 transition-all duration-300"
                  style={{ width: `${j2ManaPercent}%` }}
                />
              </div>
              <span className="text-[8px] font-mono font-bold text-purple-300 leading-none">
                {mana.J2}M
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export interface EmergentGladiatorBarkData {
  name: string;
  quote: string;
  portraitUrls: string[];
  color?: string;
}

export interface CombatArenaViewProps {
  units: UnitData[];
  selectedUnitId: string | null;
  cellMov: number[];
  cellAtq: number[];
  cellInv: number[];
  rollingDiceAnimation: boolean;
  floatingTexts: FloatingText[];
  spellVFXList: SpellVFX[];
  specialRunes: SpecialHexRune[];
  resultadoDados: RolledDieResult[];
  cityTimeOfDay: 0 | 1 | 2;
  isGameMenuOpen: boolean;
  isHowToPlayOpen: boolean;
  isCombatLoadingActive: boolean;
  gameStateStatus: string;
  onTileClick: (hexId: number) => void;
  onUnitClick: (unit: UnitData) => void;

  jugadorActivo: 1 | 2;
  mana: { J1: number; J2: number };
  playerName: string;
  dadosLanzados: boolean;
  isCombatActionLocked: boolean;
  onRollDice: () => void;
  invocacionPendiente: boolean;
  nivelPendiente: number;
  esTransmutacionDirecta: boolean;
  onBankCrest: () => void;
  onCancelInvocation: () => void;
  onSummonWithMana: () => void;
  equippedSpells: string[];
  hechizoEnEspera: string | null;
  onSelectSpell: (spellId: string) => void;
  onCancelSpell: () => void;
  lastPlayerMoveAction: { unitId: string; fromHex: number; toHex: number } | null;
  onUndoMove: () => void;
  onPassTurn: () => void;
  onRetire: () => void;
  campaignPhase: 'ALLEY' | 'TOURNAMENT';
  isSurvivalMode: boolean;
  isGladiatorDuelMode: boolean;
  fichas: { J1: Record<number, number>; J2: Record<number, number> };
  onSummonBankedCrest: (lvl: number) => void;
  isLogOpen: boolean;
  setIsLogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  combatLog: CombatLogEntry[];

  currentOpponentId: string;
  selectBankedCrestModal: BankedCrestModalData | null;
  onCloseBankedCrestModal: () => void;
  onExecuteSummonFromBank: (lvl: number, crest?: BankedCrestItem) => void;
  modalLimiteCriaturas: LimitModalData | null;
  onCloseModalLimiteCriaturas: () => void;
  onBankCrestFromLimit: (lvl: number) => void;
  onConvertCrestToMana: () => void;
  showRetireConfirm: boolean;
  onCloseRetireConfirm: () => void;
  onExecuteRetire: () => void;
  modalEleccionDoble: { lvl: number; maestria: number } | null;
  onCloseModalEleccionDoble: () => void;
  onSummonDouble: () => void;
  onBankDouble: () => void;
  modalEscalera: { d1: number; d2: number; d3: number } | null;
  onCloseModalEscalera: () => void;
  onChooseLadderBuff: (choice: 'HP' | 'MANA' | 'ATK') => void;
  spellToConfirm: SpellConfirmModalData | null;
  onCloseSpellToConfirm: () => void;
  onConfirmCastSpell: (spell: CombatSpellItem) => void;

  emergentGladiatorBark: EmergentGladiatorBarkData | null;
  setEmergentGladiatorBark: React.Dispatch<React.SetStateAction<EmergentGladiatorBarkData | null>>;
  activeHouseTutorial: HouseTutorialLesson | null;
  tutorialCurrentStep: number;
  completedHouseTutorials: string[];
  onFinishTutorialEarly?: () => void;

  hasBattleMessage: boolean;
  isOverlayBlockingHud: boolean;
}

export const CombatArenaView: React.FC<CombatArenaViewProps> = React.memo(({
  units,
  selectedUnitId,
  cellMov,
  cellAtq,
  cellInv,
  rollingDiceAnimation,
  floatingTexts,
  spellVFXList,
  specialRunes,
  resultadoDados,
  cityTimeOfDay,
  isGameMenuOpen,
  isHowToPlayOpen,
  isCombatLoadingActive,
  gameStateStatus,
  onTileClick,
  onUnitClick,
  jugadorActivo,
  mana,
  playerName,
  dadosLanzados,
  isCombatActionLocked,
  onRollDice,
  invocacionPendiente,
  nivelPendiente,
  esTransmutacionDirecta,
  onBankCrest,
  onCancelInvocation,
  onSummonWithMana,
  equippedSpells,
  hechizoEnEspera,
  onSelectSpell,
  onCancelSpell,
  lastPlayerMoveAction,
  onUndoMove,
  onPassTurn,
  onRetire,
  campaignPhase,
  isSurvivalMode,
  isGladiatorDuelMode,
  fichas,
  onSummonBankedCrest,
  isLogOpen,
  setIsLogOpen,
  combatLog,
  currentOpponentId,
  selectBankedCrestModal,
  onCloseBankedCrestModal,
  onExecuteSummonFromBank,
  modalLimiteCriaturas,
  onCloseModalLimiteCriaturas,
  onBankCrestFromLimit,
  onConvertCrestToMana,
  showRetireConfirm,
  onCloseRetireConfirm,
  onExecuteRetire,
  modalEleccionDoble,
  onCloseModalEleccionDoble,
  onSummonDouble,
  onBankDouble,
  modalEscalera,
  onCloseModalEscalera,
  onChooseLadderBuff,
  spellToConfirm,
  onCloseSpellToConfirm,
  onConfirmCastSpell,
  emergentGladiatorBark,
  setEmergentGladiatorBark,
  activeHouseTutorial,
  tutorialCurrentStep,
  completedHouseTutorials,
  onFinishTutorialEarly,
  hasBattleMessage,
  isOverlayBlockingHud,
}) => {
  // Estados transitorios encapsulados localmente para NO forzar re-renders del root App
  const isMobile = useIsMobile();
  const [battleCameraMode, setBattleCameraMode] = useState<'TACTICAL' | 'ISOMETRIC' | 'CINEMATIC'>('TACTICAL');
  const [boardRotation, setBoardRotation] = useState<number>(0);
  const [manualHideHealthBars, setManualHideHealthBars] = useState<boolean>(false);
  const [hoveredUnit, setHoveredUnit] = useState<UnitData | null>(null);
  const [hoveredSpecialRune, setHoveredSpecialRune] = useState<SpecialHexRune | null>(null);

  const selectedUnit = selectedUnitId ? units.find((u) => u.id === selectedUnitId) ?? null : null;
  const perspectiveOwner: 1 | 2 = selectedUnit ? selectedUnit.dueño : 1;

  // Sincronizar o limpiar automáticamente la ficha flotante al cambiar unidades, abrir modales o iniciar invocaciones
  useEffect(() => {
    if (invocacionPendiente || isOverlayBlockingHud || gameStateStatus !== 'PLAYING') {
      setHoveredUnit(null);
      return;
    }
    setHoveredUnit((prev) => {
      if (!prev) return null;
      const liveUnit = units.find((u) => u.id === prev.id);
      return liveUnit ?? null;
    });
  }, [units, invocacionPendiente, isOverlayBlockingHud, gameStateStatus]);

  const handleArenaTileClick = (hexId: number) => {
    setHoveredUnit(null);
    onTileClick(hexId);
  };

  const handleArenaUnitClick = (unit: UnitData) => {
    const isAttackingTarget = Boolean(
      selectedUnit && unit.dueño !== 1 && cellAtq.includes(unit.posicion)
    );
    const isSelectingReadyAlly = Boolean(
      jugadorActivo === 1 &&
        !invocacionPendiente &&
        !hechizoEnEspera &&
        unit.dueño === 1 &&
        !unit.yaSeMovio &&
        !unit.isFrozen &&
        unit.id !== selectedUnitId
    );

    onUnitClick(unit);

    if (invocacionPendiente || hechizoEnEspera || isAttackingTarget || isSelectingReadyAlly) {
      setHoveredUnit(null);
      return;
    }

    const isTouchEnv =
      isMobile ||
      (typeof window !== 'undefined' &&
        ('ontouchstart' in window || navigator.maxTouchPoints > 0));
    if (isTouchEnv) {
      if (unit.id === selectedUnitId) {
        setHoveredUnit(null);
      } else {
        setHoveredUnit((prev) => (prev?.id === unit.id ? null : unit));
      }
    }
  };

  return (
    <div className="flex-1 w-full min-h-0 relative flex flex-col">
      {/* 3D R3F WebGL Canvas */}
      <Game
        units={units}
        selectedUnitId={selectedUnitId}
        cellMov={cellMov}
        cellAtq={cellAtq}
        cellInv={cellInv}
        rollingDice={rollingDiceAnimation}
        floatingTexts={floatingTexts}
        spellVFXList={spellVFXList}
        specialRunes={specialRunes}
        hoveredEnemyUnit={hoveredUnit && hoveredUnit.dueño !== perspectiveOwner ? hoveredUnit : null}
        rolledDiceResults={resultadoDados}
        cameraMode={battleCameraMode}
        boardRotation={boardRotation}
        timeOfDay={cityTimeOfDay}
        weatherModifierName={
          cityTimeOfDay === 1
            ? 'Atardecer de Brasas Ígneas'
            : cityTimeOfDay === 2
            ? 'Noche Mística y Velo Lunar'
            : 'Sol del Alba Sagrada'
        }
        weatherModifierDesc={
          cityTimeOfDay === 1
            ? '+1 Daño adicional a criaturas con Orbe de Fuego / Magma'
            : cityTimeOfDay === 2
            ? '+1 Daño y +1 Curación adicional por Robo de Vida Vampírico / Hielo'
            : 'Curación pasiva potenciada para el Soberano'
        }
        hideHealthBars={
          manualHideHealthBars ||
          hasBattleMessage ||
          Boolean(invocacionPendiente) ||
          isCombatLoadingActive ||
          isGameMenuOpen ||
          isHowToPlayOpen ||
          isOverlayBlockingHud ||
          gameStateStatus === 'VICTORY' ||
          gameStateStatus === 'GAME_OVER'
        }
        onTileClick={handleArenaTileClick}
        onTileHover={(rune) => setHoveredSpecialRune(rune)}
        onUnitClick={handleArenaUnitClick}
        onUnitHover={(unit) => setHoveredUnit(unit)}
        isPaused={isGameMenuOpen || isHowToPlayOpen || isCombatLoadingActive}
      />

      {/* COMPONENTE MODULARIZADO DE INTERFAZ Y ACCIONES DE COMBATE (BattleHud.tsx) */}
      <BattleHud
        units={units}
        jugadorActivo={jugadorActivo}
        mana={mana}
        playerName={playerName}
        dadosLanzados={dadosLanzados}
        rollingDiceAnimation={rollingDiceAnimation}
        isActionLocked={isCombatActionLocked}
        onRollDice={onRollDice}
        invocacionPendiente={invocacionPendiente}
        nivelPendiente={nivelPendiente}
        esTransmutacionDirecta={esTransmutacionDirecta}
        onBankCrest={onBankCrest}
        onCancelInvocation={onCancelInvocation}
        onSummonWithMana={onSummonWithMana}
        equippedSpells={equippedSpells}
        hechizoEnEspera={hechizoEnEspera}
        onSelectSpell={onSelectSpell}
        onCancelSpell={onCancelSpell}
        lastPlayerMoveAction={lastPlayerMoveAction}
        onUndoMove={onUndoMove}
        onPassTurn={onPassTurn}
        onRetire={onRetire}
        campaignPhase={campaignPhase}
        isSurvivalMode={isSurvivalMode}
        isGladiatorDuelMode={isGladiatorDuelMode}
        cityTimeOfDay={cityTimeOfDay}
        battleCameraMode={battleCameraMode}
        setBattleCameraMode={setBattleCameraMode}
        boardRotation={boardRotation}
        setBoardRotation={setBoardRotation}
        manualHideHealthBars={manualHideHealthBars}
        setManualHideHealthBars={setManualHideHealthBars}
        hoveredSpecialRune={hoveredSpecialRune}
        setHoveredSpecialRune={setHoveredSpecialRune}
        fichas={fichas}
        onSummonBankedCrest={onSummonBankedCrest}
        isLogOpen={isLogOpen}
        setIsLogOpen={setIsLogOpen}
        combatLog={combatLog}
        GRIMOIRE_SPELLS_DATA={CATALOG_GRIMOIRE_SPELLS}
      />

      {/* BOTÓN COMPACTO PARA INSPECCIONAR LA UNIDAD SELECCIONADA EN MÓVIL SIN TAPAR EL TABLERO */}
      {selectedUnit && !hoveredUnit && !invocacionPendiente && !isOverlayBlockingHud && (
        <button
          type="button"
          onClick={() => setHoveredUnit(selectedUnit)}
          className={`absolute top-[6.8rem] sm:top-[4.5rem] right-2 sm:right-4 z-25 pointer-events-auto px-2.5 py-1 rounded-full hover:bg-slate-900 border border-amber-500/70 text-amber-300 text-[10px] font-serif font-bold shadow-lg flex items-center gap-1 transition active:scale-95 cursor-pointer max-w-[155px] sm:max-w-[190px] ${isAndroidDevice() ? 'bg-black/85' : 'bg-black/90 backdrop-blur-md'}`}
        >
          <span>🔍</span>
          <span className="truncate">{selectedUnit.nombre}</span>
        </button>
      )}

      {/* INSPECCIÓN DE UNIDAD SELECCIONADA / HOVER */}
      {hoveredUnit && (() => {
        const unit = hoveredUnit;
        const candidateUrls = getCombatUnitPortraitUrls(hoveredUnit, currentOpponentId);

        const isRival = unit.dueño !== perspectiveOwner;
        const canBeAttacked = Boolean(
          isRival &&
            selectedUnit &&
            jugadorActivo === perspectiveOwner &&
            !selectedUnit.yaSeMovio &&
            !selectedUnit.isFrozen &&
            cellAtq.includes(unit.posicion)
        );

        return (
          <div className={`absolute top-16 right-2 sm:right-4 w-[250px] sm:w-64 max-w-[75vw] max-h-[calc(100dvh-5rem)] border-2 border-amber-500/80 rounded-2xl p-2 sm:p-2.5 shadow-2xl z-30 pointer-events-auto flex flex-col animate-fadeIn ${isAndroidDevice() ? 'bg-black/90' : 'bg-slate-900/95 backdrop-blur-md'}`}>
            <div className="flex items-center justify-between border-b border-slate-800 pb-1 mb-1 shrink-0">
              <div className="flex items-center gap-1 min-w-0 pr-1">
                <span className="text-xs shrink-0">{hoveredUnit.esMaestra ? '👑' : hoveredUnit.esAscendido ? '⚡' : '🛡️'}</span>
                <span className="font-serif font-black text-xs text-amber-300 truncate">
                  {hoveredUnit.nombre}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span
                  className={`text-[8.5px] px-1.5 py-0.2 rounded font-bold ${
                    hoveredUnit.dueño === 1
                      ? 'bg-blue-600/30 text-cyan-300 border border-blue-500/50'
                      : 'bg-rose-600/30 text-rose-300 border border-rose-500/50'
                  }`}
                >
                  {hoveredUnit.dueño === 1 ? 'Aliado' : 'Rival'}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setHoveredUnit(null);
                  }}
                  className="w-5 h-5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-bold flex items-center justify-center border border-slate-600 transition"
                  aria-label="Cerrar ficha"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="overflow-y-auto pr-0.5 space-y-1.5 flex-1 min-h-0 touch-auto text-left">
              {canBeAttacked && (() => {
                const calc = calculateAttackDamagePreview(selectedUnit, unit, cityTimeOfDay);

                return (
                  <div className="p-1 rounded-lg bg-rose-950/80 border border-rose-500 text-center animate-pulse shadow-md">
                    <span className="text-[8.5px] font-serif font-black text-rose-300 block">
                      ⚔️ PREVISUALIZACIÓN DE ATAQUE
                    </span>
                    <span className="text-[10px] font-bold text-white">
                      Daño: <strong className="text-amber-300">-{calc.totalEstimatedDamage} HP</strong>
                      {calc.shieldNote && <span className="text-[8px] text-emerald-300">{calc.shieldNote}</span>}
                      {(calc.fireResidualDmg > 0 || calc.poisonDmg > 0) && (
                        <span className="text-[7.5px] text-orange-300 ml-1">
                          ({calc.effectiveDmg}{calc.fireResidualDmg ? '+1🔥' : ''}{calc.poisonDmg ? '+1☠️' : ''})
                        </span>
                      )}
                    </span>
                    <div className="text-[8.5px] text-slate-300">
                      Vida restante: <strong className={calc.willFall ? 'text-red-400' : calc.isPhoenixWillResurrect ? 'text-orange-400' : 'text-emerald-400'}>
                        {calc.isPhoenixWillResurrect ? '10 HP (RENACERÁ 🔥)' : `${calc.remainingHp} HP ${calc.willFall ? '(CAERÁ 💀)' : ''}`}
                      </strong>
                    </div>
                  </div>
                );
              })()}

              <div className="flex w-full h-24 sm:h-28 rounded-lg overflow-hidden bg-slate-950 border border-slate-800 relative items-center justify-center p-1 shrink-0">
                <div
                  className="absolute inset-0 opacity-20 pointer-events-none"
                  style={{
                    background: `radial-gradient(circle, ${
                      hoveredUnit.dueño === 1 ? '#38bdf8' : '#f43f5e'
                    } 0%, transparent 70%)`,
                  }}
                />
                <CachedImage
                  cacheKey={`unit_inspect_${hoveredUnit.id || hoveredUnit.nombre}`}
                  candidateUrls={candidateUrls}
                  alt={hoveredUnit.nombre}
                  className="w-full h-full object-contain object-center filter brightness-95 z-10 drop-shadow"
                />
              </div>

              <div className="grid grid-cols-3 gap-1 text-center text-xs shrink-0">
                <div className="bg-slate-950/80 p-1 rounded border border-slate-800">
                  <div className="text-[8.5px] text-slate-400">Vida</div>
                  <div className="font-black text-emerald-400 text-[11px]">
                    {hoveredUnit.hpActual} / {hoveredUnit.hpMax}
                  </div>
                </div>
                <div className="bg-slate-950/80 p-1 rounded border border-slate-800">
                  <div className="text-[8.5px] text-slate-400">Ataque</div>
                  <div className="font-black text-rose-400 text-[11px]">{hoveredUnit.daño} ATK</div>
                </div>
                <div className="bg-slate-950/80 p-1 rounded border border-slate-800">
                  <div className="text-[8.5px] text-slate-400">Nivel</div>
                  <div className="font-black text-cyan-400 text-[11px]">
                    {hoveredUnit.esMaestra ? 'Rey' : `Lv.${hoveredUnit.nivel}`}
                  </div>
                </div>
              </div>

              <div className="text-[8.5px] text-slate-400 flex items-center justify-between border-t border-slate-800/60 pt-1 shrink-0">
                <span>{hoveredUnit.isFrozen ? '❄️ Congelado' : hoveredUnit.yaSeMovio ? '⏳ Descansa / Ya actuó' : '✅ Listo'}</span>
                <span>Casilla: #{hoveredUnit.posicion}</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODALES DE DECISIÓN DE COMBATE */}
      <CombatDecisionModals
        selectBankedCrestModal={selectBankedCrestModal}
        onCloseBankedCrestModal={onCloseBankedCrestModal}
        onExecuteSummonFromBank={onExecuteSummonFromBank}
        modalLimiteCriaturas={modalLimiteCriaturas}
        onCloseModalLimiteCriaturas={onCloseModalLimiteCriaturas}
        onBankCrestFromLimit={onBankCrestFromLimit}
        onConvertCrestToMana={onConvertCrestToMana}
        showRetireConfirm={showRetireConfirm}
        onCloseRetireConfirm={onCloseRetireConfirm}
        onExecuteRetire={onExecuteRetire}
        modalEleccionDoble={
          modalEleccionDoble
            ? {
                lvl: modalEleccionDoble.lvl,
                level: modalEleccionDoble.lvl,
                maestria: modalEleccionDoble.maestria,
                crestDie: resultadoDados[0],
                faceValue: modalEleccionDoble.lvl,
              }
            : null
        }
        onCloseModalEleccionDoble={onCloseModalEleccionDoble}
        onSummonDouble={onSummonDouble}
        onBankDouble={onBankDouble}
        maxMinionsReached={units.filter((u) => u.dueño === 1 && !u.esMaestra).length >= 6}
        noFreeInvocationCells={(() => {
          if (!modalEleccionDoble) return false;
          const master = units.find((u) => u.dueño === 1 && u.esMaestra);
          if (!master) return true;
          const rivalGravityMasters = units.filter(
            (u) => u.dueño !== 1 && u.esMaestra && (u.gravityTurns || 0) > 0
          );
          return !Object.keys(HEX_MAP).some((key) => {
            const cellId = parseInt(key, 10);
            if (getHexDistance(master.posicion, cellId) !== 1) return false;
            if (units.some((u) => u.posicion === cellId)) return false;
            return !rivalGravityMasters.some((gm) => getHexDistance(gm.posicion, cellId) === 1);
          });
        })()}
        modalEscalera={
          modalEscalera
            ? {
                d1: modalEscalera.d1,
                d2: modalEscalera.d2,
                d3: modalEscalera.d3,
                sorted: [modalEscalera.d1, modalEscalera.d2, modalEscalera.d3],
                count: 3,
              }
            : null
        }
        onCloseModalEscalera={onCloseModalEscalera}
        onChooseLadderBuff={onChooseLadderBuff}
        spellToConfirm={spellToConfirm}
        onCloseSpellToConfirm={onCloseSpellToConfirm}
        onConfirmCastSpell={onConfirmCastSpell}
        playerMana={mana.J1}
      />

      {/* AVISO PERMANENTE FLOTANTE DURANTE INVOCACIÓN ACTIVA */}
      {invocacionPendiente && (
        <div className="absolute top-20 sm:top-24 right-3 sm:right-6 pointer-events-none z-45 max-w-[280px] sm:max-w-xs animate-fadeIn">
          <div className={`p-3.5 rounded-2xl border-2 border-amber-400 bg-black/95 shadow-[0_0_35px_rgba(245,158,11,0.5)] ${isAndroidDevice() ? '' : 'backdrop-blur-md'} flex flex-col gap-1.5 text-left`}>
            <div className="flex items-center gap-1.5">
              <span className="text-base animate-bounce">✨</span>
              <span className="font-serif font-black text-xs text-amber-300 uppercase tracking-wider">
                {nivelPendiente === 7 ? 'INVOCANDO TITÁN' : `INVOCANDO NIVEL ${nivelPendiente}`}
              </span>
            </div>
            <p className="text-[11px] text-slate-200 font-sans leading-tight">
              Toca una <strong>casilla dorada</strong> junto a tu Soberano en el tablero para colocar tu criatura.
            </p>
            <div className="text-[10px] text-amber-400/90 font-mono font-bold flex items-center justify-between pt-1 border-t border-slate-800">
              <span>Vista del campo despejada</span>
              <span>👁️ 100% visible</span>
            </div>
          </div>
        </div>
      )}

      {/* Top Ornate Boss / Master Health HUD Bar */}
      <MasterCombatHUD
        units={units}
        jugadorActivo={jugadorActivo}
        mana={mana}
        playerName={playerName}
        currentOpponentId={currentOpponentId}
      />

      {/* GLOBO / DIÁLOGO EMERGENTE DEL GLADIADOR EN COMBATE */}
      {emergentGladiatorBark && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-40 max-w-sm sm:max-w-md w-[92vw] pointer-events-auto animate-fadeIn">
          <div className={`bg-black/95 border-2 border-rose-500 rounded-2xl p-2.5 sm:p-3 shadow-[0_0_35px_rgba(244,63,94,0.7)] ${isAndroidDevice() ? '' : 'backdrop-blur-md'} flex items-center gap-3`}>
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden bg-slate-950 border border-rose-400 shrink-0 shadow-md relative flex items-center justify-center">
              <CachedImage
                cacheKey={`bark_${emergentGladiatorBark.name}`}
                candidateUrls={emergentGladiatorBark.portraitUrls}
                alt={emergentGladiatorBark.name}
                className="w-full h-full object-cover filter brightness-95"
              />
              <span className="text-xl absolute -z-10">⚔️</span>
            </div>

            <div className="flex-1 min-w-0 pr-1 text-left">
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-serif font-black text-xs text-rose-300 truncate">
                  {emergentGladiatorBark.name}
                </span>
                <span className="text-[8.5px] font-mono font-bold px-1.5 py-0.2 rounded bg-rose-950/80 text-rose-200 border border-rose-500/50">
                  ¡CRISIS BÉLICA!
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] font-serif italic text-amber-200 leading-snug drop-shadow">
                {emergentGladiatorBark.quote}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setEmergentGladiatorBark(null)}
              className="text-slate-400 hover:text-white text-xs px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 shrink-0 self-start cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* GUÍA DIDÁCTICA PASO A PASO EN PANTALLA (SI ES TUTORIAL) */}
      {activeHouseTutorial && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-40 max-w-lg w-[92vw] pointer-events-auto animate-fadeIn">
          <div className={`bg-black/95 border-2 border-amber-400 rounded-2xl p-2.5 sm:p-3 shadow-[0_0_35px_rgba(245,158,11,0.7)] ${isAndroidDevice() ? '' : 'backdrop-blur-md'} flex flex-col gap-1 text-center`}>
            <div className="flex items-center justify-between border-b border-amber-500/40 pb-1">
              <span className="text-[10px] font-serif font-black text-amber-300 tracking-wider flex items-center gap-1">
                <span>🎓 GUÍA DE ENTRENAMIENTO:</span>
                <span>{activeHouseTutorial.title}</span>
              </span>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40">
                Paso {tutorialCurrentStep} de {activeHouseTutorial.guideSteps.length}
              </span>
            </div>

            {(() => {
              const stepDef = activeHouseTutorial.guideSteps.find((s) => s.stepNumber === tutorialCurrentStep);
              const isAllDone = tutorialCurrentStep > activeHouseTutorial.guideSteps.length;

              if (isAllDone) {
                return (
                  <div className="py-1">
                    <p className="text-xs font-serif font-black text-emerald-400">
                      🎉 ¡LECCIÓN COMPLETADA CON ÉXITO!
                    </p>
                    <p className="text-[10px] text-slate-300 mt-0.5">
                      Has dominado la práctica de este consejo. Sin botín de oro, pero avanza tu progreso del Gran Logro ({completedHouseTutorials.length}/12).
                    </p>
                    {onFinishTutorialEarly && (
                      <button
                        onClick={onFinishTutorialEarly}
                        className="mt-2 py-1 px-4 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-serif font-black text-xs shadow cursor-pointer"
                      >
                        Regresar a la Ciudad ➔
                      </button>
                    )}
                  </div>
                );
              }

              return (
                <div className="py-0.5 text-left">
                  <p className="text-xs font-serif font-bold text-slate-100 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-black flex items-center justify-center text-[10px] shrink-0 font-mono">
                      {tutorialCurrentStep}
                    </span>
                    <span>{stepDef?.instruction}</span>
                  </p>
                  <p className="text-[10px] text-amber-300/90 font-sans italic ml-6.5 mt-0.5">
                    💡 Indicación: {stepDef?.hint}
                  </p>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
});

CombatArenaView.displayName = 'CombatArenaView';
