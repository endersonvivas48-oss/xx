import React, { useState, useEffect } from 'react';
import { RotateCw } from 'lucide-react';
import { isAndroidDevice } from './utils';
import { UnitData, RolledDieResult, SpecialHexRune } from './types';
import { CombatLogEntry } from './useTacticalBattleState';
import { SpellItem } from './GrimoireView';

export interface BattleHudProps {
  units: UnitData[];
  jugadorActivo: 1 | 2;
  mana: { J1: number; J2: number };
  playerName: string;
  dadosLanzados: boolean;
  rollingDiceAnimation: boolean;
  isActionLocked?: boolean;
  onRollDice: () => void;
  invocacionPendiente: boolean;
  nivelPendiente?: number;
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
  cityTimeOfDay: 0 | 1 | 2;
  battleCameraMode: 'TACTICAL' | 'ISOMETRIC' | 'CINEMATIC';
  setBattleCameraMode: React.Dispatch<React.SetStateAction<'TACTICAL' | 'ISOMETRIC' | 'CINEMATIC'>>;
  boardRotation: number;
  setBoardRotation: React.Dispatch<React.SetStateAction<number>>;
  manualHideHealthBars: boolean;
  setManualHideHealthBars: React.Dispatch<React.SetStateAction<boolean>>;
  hoveredSpecialRune: SpecialHexRune | null;
  setHoveredSpecialRune: (rune: SpecialHexRune | null) => void;
  fichas: { J1: Record<number, number>; J2: Record<number, number> };
  onSummonBankedCrest: (lvl: number) => void;
  isLogOpen: boolean;
  setIsLogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  combatLog: CombatLogEntry[];
  GRIMOIRE_SPELLS_DATA: Record<string, SpellItem>;
}

export const BattleHud: React.FC<BattleHudProps> = ({
  units,
  jugadorActivo,
  mana,
  playerName,
  dadosLanzados,
  rollingDiceAnimation,
  isActionLocked = false,
  onRollDice,
  invocacionPendiente,
  nivelPendiente = 0,
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
  cityTimeOfDay,
  battleCameraMode,
  setBattleCameraMode,
  boardRotation,
  setBoardRotation,
  manualHideHealthBars,
  setManualHideHealthBars,
  hoveredSpecialRune,
  setHoveredSpecialRune,
  fichas,
  onSummonBankedCrest,
  isLogOpen,
  setIsLogOpen,
  combatLog,
  GRIMOIRE_SPELLS_DATA,
}) => {
  const isRetireLocked = campaignPhase === 'TOURNAMENT' && !isSurvivalMode && !isGladiatorDuelMode;
  const isAndroid = isAndroidDevice();
  const hudPanelBlur = isAndroid ? '' : 'backdrop-blur-md';

  const [inspectedSpellId, setInspectedSpellId] = useState<string | null>(null);

  useEffect(() => {
    if (hechizoEnEspera) {
      setInspectedSpellId(null);
    }
  }, [hechizoEnEspera]);

  const playerUnitsCount = units.filter((u) => u.dueño === 1 && !u.esMaestra).length;
  const enemyUnitsCount = units.filter((u) => u.dueño === 2 && !u.esMaestra).length;
  const isOutnumbered = enemyUnitsCount > playerUnitsCount;
  const inspectedSpell = inspectedSpellId ? GRIMOIRE_SPELLS_DATA[inspectedSpellId] : null;

  return (
    <>
      {/* 1. CONTROLES FLOTANTES DE CÁMARA, ROTACIÓN Y SALUD (PARTE SUPERIOR) */}
      <div className="absolute top-[4.2rem] sm:top-[4.5rem] left-1/2 -translate-x-1/2 z-20 pointer-events-auto flex items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={() => setBoardRotation((prev) => prev - Math.PI / 3)}
          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center bg-black/85 hover:bg-slate-900 text-amber-300 border-2 border-amber-500/80 hover:border-amber-400 font-bold transition transform active:scale-90 cursor-pointer shadow-lg ${hudPanelBlur}`}
          aria-label="Girar campo a la izquierda"
        >
          <span className="text-sm sm:text-base leading-none select-none">↺</span>
        </button>

        <button
          type="button"
          onClick={() =>
            setBattleCameraMode((prev) =>
              prev === 'TACTICAL' ? 'ISOMETRIC' : prev === 'ISOMETRIC' ? 'CINEMATIC' : 'TACTICAL'
            )
          }
          className={`py-1.5 px-3 sm:px-3.5 rounded-full bg-black/85 hover:bg-slate-900 text-amber-300 border-2 border-amber-500/80 hover:border-amber-400 font-serif font-black text-[10px] sm:text-xs shadow-[0_0_20px_rgba(245,158,11,0.6)] ${hudPanelBlur} flex items-center gap-1.5 sm:gap-2 transition transform active:scale-95 cursor-pointer`}
        >
          <span className="text-sm">🎥</span>
          <span>
            {battleCameraMode === 'TACTICAL'
              ? 'TÁCTICA'
              : battleCameraMode === 'ISOMETRIC'
              ? 'ISOMÉTRICA'
              : 'CINEMÁTICA'}
          </span>
          <span className="text-[8px] sm:text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono border border-amber-500/40">
            {battleCameraMode === 'TACTICAL' ? '1x' : battleCameraMode === 'ISOMETRIC' ? '1.5x' : '2x'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setBoardRotation((prev) => prev + Math.PI / 3)}
          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center bg-black/85 hover:bg-slate-900 text-amber-300 border-2 border-amber-500/80 hover:border-amber-400 font-bold transition transform active:scale-90 cursor-pointer shadow-lg ${hudPanelBlur}`}
          aria-label="Girar campo a la derecha"
        >
          <span className="text-sm sm:text-base leading-none select-none">↻</span>
        </button>

        {Math.abs(boardRotation % (Math.PI * 2)) > 0.05 && (
          <button
            type="button"
            onClick={() => setBoardRotation(0)}
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center ${isAndroid ? 'bg-black/85' : 'bg-amber-500/20 backdrop-blur-md'} hover:bg-amber-500/40 text-amber-300 border border-amber-400 font-mono text-[9px] font-black transition transform active:scale-90 cursor-pointer shadow`}
            aria-label="Restablecer rotación"
          >
            0°
          </button>
        )}

        <button
          type="button"
          onClick={() => setManualHideHealthBars((prev) => !prev)}
          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center border-2 transition transform active:scale-90 cursor-pointer shadow-lg ${hudPanelBlur} ${
            manualHideHealthBars
              ? 'bg-black/85 text-slate-500 border-slate-700/80 hover:border-slate-500'
              : 'bg-black/85 text-emerald-400 border-emerald-500/80 hover:border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)]'
          }`}
          aria-label="Alternar visibilidad de barras de vida"
        >
          <span className="text-sm sm:text-base leading-none select-none">
            {manualHideHealthBars ? '🩶' : '❤️'}
          </span>
        </button>
      </div>

      {/* 2. INDICADOR CLIMÁTICO */}
      <div className={`absolute top-[4rem] sm:top-[4.3rem] left-2 sm:left-4 z-20 pointer-events-auto flex items-center gap-1.5 bg-black/85 border border-amber-500/60 px-2.5 py-1 rounded-full shadow-lg ${hudPanelBlur}`}>
        <span className="text-xs">
          {cityTimeOfDay === 0 ? '☀️' : cityTimeOfDay === 1 ? '🌅' : '🌙'}
        </span>
        <span className="text-[9.5px] sm:text-[10px] font-serif font-black tracking-wide text-amber-300">
          {cityTimeOfDay === 0 ? 'ALBA SOLAR' : cityTimeOfDay === 1 ? 'ATARDECER ÍGNEO' : 'NOCHE LUNAR'}
        </span>
        <span className="text-[8.5px] sm:text-[9px] font-sans text-cyan-300 border-l border-slate-700 pl-1.5">
          {cityTimeOfDay === 1
            ? '🔥 +1 Daño Fuego'
            : cityTimeOfDay === 2
            ? '🌙 +1 Daño & Robo Vampírico'
            : '☀️ Luz Sagrada'}
        </span>
      </div>

      {/* 3. TOOLTIP DE RUNA ESPECIAL */}
      {hoveredSpecialRune && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-35 pointer-events-auto animate-fadeIn max-w-[92vw] sm:max-w-md">
          <div
            className={`bg-black/95 border-2 rounded-2xl p-2.5 sm:p-3 shadow-[0_0_35px_rgba(0,0,0,0.95)] ${hudPanelBlur} flex items-center gap-2.5 text-left`}
            style={{
              borderColor: hoveredSpecialRune.color,
              boxShadow: `0 0 25px ${hoveredSpecialRune.emissive}70`,
            }}
          >
            <div
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border flex items-center justify-center text-lg sm:text-xl shrink-0 shadow animate-pulse"
              style={{
                backgroundColor: `${hoveredSpecialRune.color}25`,
                borderColor: hoveredSpecialRune.emissive,
              }}
            >
              {hoveredSpecialRune.symbol}
            </div>
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-serif font-black text-xs sm:text-sm" style={{ color: hoveredSpecialRune.emissive }}>
                  {hoveredSpecialRune.title}
                </span>
                <span className="text-[9px] font-mono text-slate-400">Casilla #{hoveredSpecialRune.hexId}</span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-200 font-sans leading-tight">
                {hoveredSpecialRune.desc}
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setHoveredSpecialRune(null);
              }}
              className="text-slate-400 hover:text-white text-xs px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 shrink-0"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 4. BARRA INFERIOR DERECHA: HISTORIAL Y FICHAS DE RESERVA */}
      <div className="absolute bottom-3 right-3 sm:right-6 pr-1 sm:pr-0 z-20 flex flex-col items-end gap-1.5 pointer-events-auto">
        {isLogOpen && (
          <div className={`mb-1 w-64 bg-black/95 border-2 border-amber-500/60 rounded-xl p-2 shadow-2xl ${hudPanelBlur} max-h-40 overflow-y-auto animate-fadeIn text-right`}>
            <div className="flex items-center justify-between border-b border-amber-500/30 pb-1 mb-1 shrink-0">
              <span className="text-[8.5px] font-serif font-bold text-amber-300">REGISTRO DE BATALLA</span>
              <button
                onClick={() => setIsLogOpen(false)}
                className="text-[8.5px] text-slate-400 hover:text-white px-1.5 py-0.2 rounded bg-slate-900 border border-slate-700"
              >
                ✕
              </button>
            </div>

            {combatLog.length === 0 ? (
              <p className="text-[8.5px] text-slate-500 italic text-center py-1">Sin acciones registradas aún.</p>
            ) : (
              <div className="space-y-1 pr-0.5 text-left">
                {combatLog.map((log) => (
                  <div
                    key={log.id}
                    className="text-[8.5px] leading-tight font-sans border-b border-slate-800/80 pb-0.5 last:border-0 last:pb-0"
                  >
                    <span className="text-[7px] text-slate-500 font-mono mr-1">[{log.time}]</span>
                    <span style={{ color: log.color }} className="font-semibold">
                      {log.text}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => setIsLogOpen((prev) => !prev)}
          className={`px-2 py-0.5 rounded-full hover:bg-black/90 text-amber-300 border border-amber-500/40 text-[8.5px] sm:text-[9px] font-serif font-bold shadow flex items-center gap-1 transition active:scale-95 ${isAndroid ? 'bg-black/85' : 'bg-black/75 backdrop-blur-sm'}`}
        >
          <span>📜 HISTORIAL ({combatLog.length})</span>
          <span className="text-[7.5px] text-slate-400">{isLogOpen ? '✕' : '▲'}</span>
        </button>

        <div className={`flex items-center gap-1 sm:gap-1.5 bg-black/85 border border-amber-500/50 px-2.5 py-1.5 rounded-xl shadow-2xl ${hudPanelBlur}`}>
          <span className="text-[9px] sm:text-[10px] font-serif font-bold text-amber-300 mr-0.5 shrink-0">Fichas:</span>
          {[1, 2, 3, 4, 5, 6].map((lvl) => {
            const count = fichas.J1[lvl] || 0;
            return (
              <button
                key={lvl}
                disabled={count === 0 || jugadorActivo !== 1 || invocacionPendiente || isActionLocked}
                onClick={() => {
                  if (isActionLocked) return;
                  onSummonBankedCrest(lvl);
                }}
                className={`px-1.5 py-0.5 rounded-full text-[8.5px] sm:text-[9px] font-mono font-black border transition shrink-0 ${
                  count > 0 && jugadorActivo === 1 && !invocacionPendiente && !isActionLocked
                    ? 'bg-amber-500/30 text-amber-300 border-amber-400 hover:bg-amber-500 hover:text-black shadow active:scale-95 cursor-pointer'
                    : 'bg-black/40 text-slate-600 border-slate-800/80 cursor-not-allowed'
                }`}
              >
                L{lvl}:{count}
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. PANEL TÁCTICO IZQUIERDO: ACCIONES PRINCIPALES, TIRAR DADOS, MAGIA Y TURNOS */}
      <div className="absolute top-[6.5rem] sm:top-[7.2rem] left-2 sm:left-4 z-20 flex flex-col items-start gap-2 pointer-events-auto max-w-[225px] sm:max-w-[260px]">
        {hechizoEnEspera ? (
          <div className={`w-full bg-black/95 border-2 border-cyan-400 rounded-2xl p-3 shadow-[0_0_30px_rgba(56,189,248,0.7)] ${hudPanelBlur} flex flex-col items-center gap-2 text-center animate-pulse`}>
            <div className="w-10 h-10 rounded-full bg-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center text-xl shadow">
              <span>{GRIMOIRE_SPELLS_DATA[hechizoEnEspera]?.icon || '✨'}</span>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-300 font-bold block">
                APUNTANDO HECHIZO
              </span>
              <h4 className="text-xs sm:text-sm font-black font-serif text-white">
                {GRIMOIRE_SPELLS_DATA[hechizoEnEspera]?.name.toUpperCase()}
              </h4>
              <p className="text-[9.5px] text-cyan-200/90 font-sans mt-0.5 leading-tight">
                Selecciona una ficha objetivo en el tablero o cancela.
              </p>
            </div>
            <button
              type="button"
              onClick={onCancelSpell}
              className="w-full py-2 px-3 rounded-full bg-rose-950/90 hover:bg-rose-900 text-rose-200 border-2 border-rose-500 font-serif font-black text-xs tracking-wider shadow-lg transition transform active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>✕</span>
              <span>CANCELAR HECHIZO</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-1.5 w-full">
            <button
              disabled={dadosLanzados || rollingDiceAnimation || jugadorActivo !== 1 || isActionLocked}
              onClick={onRollDice}
              className={`w-full h-11 sm:h-12 px-3 sm:px-4 rounded-2xl font-serif font-black text-xs sm:text-sm tracking-wider transition transform active:scale-95 shadow-2xl flex items-center gap-2 border ${
                dadosLanzados || jugadorActivo !== 1 || isActionLocked
                  ? 'bg-black/85 text-slate-500 cursor-not-allowed border-slate-800'
                  : 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black border-amber-300 shadow-[0_0_25px_rgba(245,158,11,0.75)] hover:scale-105'
              }`}
            >
              <RotateCw className={`w-4 h-4 sm:w-5 sm:h-5 ${rollingDiceAnimation ? 'animate-spin' : ''}`} />
              <span className="flex flex-col items-start leading-none">
                <span>{dadosLanzados ? 'LANZADOS' : 'TIRAR DADOS'}</span>
                <span className="text-[8.5px] font-sans font-normal text-black/80 mt-0.5">
                  {dadosLanzados ? '1 tirada por turno' : 'Toca para lanzar 3 dados'}
                </span>
              </span>
            </button>

            {invocacionPendiente && !esTransmutacionDirecta && (
              <button
                type="button"
                disabled={isActionLocked}
                onClick={() => {
                  if (isActionLocked) return;
                  onBankCrest();
                }}
                className={`w-full h-8 px-3 rounded-xl border text-[10px] font-serif font-black shadow-lg transition transform flex items-center justify-center gap-1.5 ${
                  isActionLocked
                    ? 'bg-black/40 text-slate-600 border-slate-800 cursor-not-allowed'
                    : 'bg-black/95 text-amber-300 border-amber-500 active:scale-95 cursor-pointer'
                }`}
              >
                {nivelPendiente === 7 ? '⚡ Canalizar Titán (+3 Maná)' : '📥 Guardar Ficha'}
              </button>
            )}

            {invocacionPendiente && esTransmutacionDirecta && (
              <button
                type="button"
                disabled={isActionLocked}
                onClick={() => {
                  if (isActionLocked) return;
                  onCancelInvocation();
                }}
                className={`w-full h-8 px-3 rounded-xl border text-[10px] font-serif font-black shadow-lg transition transform flex items-center justify-center gap-1.5 ${
                  isActionLocked
                    ? 'bg-black/40 text-slate-600 border-slate-800 cursor-not-allowed'
                    : 'bg-rose-950/80 text-rose-300 border-rose-500 active:scale-95 cursor-pointer'
                }`}
              >
                ✕ Cancelar Invocación
              </button>
            )}

            {!invocacionPendiente && mana.J1 >= 4 && jugadorActivo === 1 && isOutnumbered && (
              <button
                type="button"
                disabled={isActionLocked}
                onClick={() => {
                  if (isActionLocked) return;
                  onSummonWithMana();
                }}
                className={`w-full h-8 px-2 rounded-xl border text-[9px] font-serif font-black transition transform flex items-center justify-center gap-1 ${
                  isActionLocked
                    ? 'bg-black/40 text-slate-500 border-slate-800 cursor-not-allowed'
                    : 'bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white border-cyan-300 shadow-[0_0_15px_rgba(56,189,248,0.5)] active:scale-95 cursor-pointer'
                }`}
              >
                <span>⚡ TRANSMUTAR (4M • Lv.1-4 BASE)</span>
              </button>
            )}

            {equippedSpells.length > 0 && (
              <div className={`flex flex-col gap-1 bg-black/85 border border-amber-500/40 p-1.5 rounded-xl shadow-md ${hudPanelBlur} w-full`}>
                <div className="flex items-center justify-between px-0.5">
                  <span className="text-[8.5px] font-serif font-bold text-amber-300 uppercase tracking-wider">
                    Magia Equipada
                  </span>
                  <span className="text-[8px] font-mono text-cyan-300">{mana.J1}M disp.</span>
                </div>

                <div className="flex flex-col gap-1 w-full">
                  {equippedSpells.map((spId) => {
                    const sp = GRIMOIRE_SPELLS_DATA[spId];
                    if (!sp) return null;
                    const hasMana = mana.J1 >= sp.cost;
                    const canCast = jugadorActivo === 1 && hasMana && !isActionLocked;
                    const isInfoOpen = inspectedSpellId === sp.id;

                    return (
                      <div key={sp.id} className="flex items-center gap-1 w-full">
                        <button
                          type="button"
                          onClick={() => {
                            if (isActionLocked) return;
                            setInspectedSpellId(null);
                            onSelectSpell(sp.id);
                          }}
                          disabled={!canCast}
                          className={`flex-1 min-w-0 h-7 px-1.5 rounded-lg flex items-center justify-between gap-1 text-[9.5px] font-serif font-black transition border ${
                            canCast
                              ? 'bg-black/95 text-white active:scale-95 shadow hover:brightness-110 cursor-pointer'
                              : 'bg-black/45 text-slate-500 border-slate-800 cursor-not-allowed'
                          }`}
                          style={{
                            borderColor: canCast ? sp.color : '#334155',
                            color: canCast ? sp.color : '#64748b',
                          }}
                        >
                          <span className="flex items-center gap-1 min-w-0">
                            <span className="text-[11px] shrink-0">{sp.icon}</span>
                            <span className="truncate">{sp.name}</span>
                          </span>
                          <span
                            className={`text-[8.5px] font-mono font-black px-1 py-0.2 rounded shrink-0 ${
                              canCast ? 'bg-slate-900/90 text-cyan-300' : 'bg-slate-950 text-slate-500'
                            }`}
                          >
                            {sp.cost}M
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectedSpellId((prev) => (prev === sp.id ? null : sp.id));
                          }}
                          aria-label={`Ver descripción de ${sp.name}`}
                          className={`w-7 h-7 rounded-lg border flex items-center justify-center text-[10px] font-bold transition shrink-0 cursor-pointer active:scale-95 ${
                            isInfoOpen
                              ? 'bg-amber-500/30 border-amber-400 text-amber-200'
                              : 'bg-slate-950/90 border-slate-700 hover:border-amber-400/70 text-slate-300'
                          }`}
                        >
                          ⓘ
                        </button>
                      </div>
                    );
                  })}
                </div>

                {inspectedSpell && (
                  <div
                    className="mt-0.5 p-2 rounded-xl bg-slate-950/95 border text-left shadow-xl animate-fadeIn"
                    style={{ borderColor: inspectedSpell.color }}
                  >
                    <div className="flex items-center justify-between gap-1 border-b border-slate-800 pb-1 mb-1">
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="text-xs shrink-0">{inspectedSpell.icon}</span>
                        <span
                          className="text-[10px] font-serif font-black truncate"
                          style={{ color: inspectedSpell.color }}
                        >
                          {inspectedSpell.name}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setInspectedSpellId(null)}
                        className="text-[9px] text-slate-400 hover:text-white px-1 rounded bg-slate-900 border border-slate-700 shrink-0 cursor-pointer"
                        aria-label="Cerrar descripción de hechizo"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-[8.5px] font-mono text-amber-300 mb-1">
                      <span>{inspectedSpell.category}</span>
                      <span>Coste: {inspectedSpell.cost} Maná</span>
                    </div>
                    <p className="text-[9.5px] text-slate-200 font-sans leading-snug mb-1.5">
                      {inspectedSpell.desc}
                    </p>
                    {jugadorActivo === 1 && mana.J1 >= inspectedSpell.cost && !isActionLocked ? (
                      <button
                        type="button"
                        disabled={isActionLocked}
                        onClick={() => {
                          if (isActionLocked) return;
                          const spId = inspectedSpell.id;
                          setInspectedSpellId(null);
                          onSelectSpell(spId);
                        }}
                        className="w-full py-1 px-2 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-serif font-black text-[9.5px] cursor-pointer active:scale-95 transition"
                      >
                        Lanzar ({inspectedSpell.cost}M)
                      </button>
                    ) : (
                      <span className="text-[8.5px] font-mono text-slate-400 block text-center">
                        {jugadorActivo !== 1
                          ? 'Disponible en tu turno'
                          : isActionLocked
                          ? 'Acción en curso...'
                          : `Falta maná (${mana.J1}/${inspectedSpell.cost}M)`}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col gap-1.5 w-full mt-0.5">
              {lastPlayerMoveAction && jugadorActivo === 1 && (
                <button
                  type="button"
                  disabled={isActionLocked}
                  onClick={() => {
                    if (isActionLocked) return;
                    onUndoMove();
                  }}
                  className={`w-full h-8 px-2.5 rounded-xl font-serif font-black text-[10px] tracking-wider transition transform border flex items-center justify-center gap-1.5 ${
                    isActionLocked
                      ? 'bg-black/40 text-slate-600 border-slate-800 cursor-not-allowed'
                      : 'bg-gradient-to-r from-sky-900 to-indigo-900 text-sky-200 border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.5)] animate-pulse active:scale-95 cursor-pointer'
                  }`}
                >
                  <span>↩️</span>
                  <span>DESHACER PASO</span>
                </button>
              )}

              <div className="flex items-center gap-1.5 w-full">
                <button
                  onClick={onPassTurn}
                  disabled={jugadorActivo !== 1 || isActionLocked}
                  className={`flex-1 h-8 rounded-xl font-serif font-black text-[10px] tracking-wider transition transform active:scale-95 border flex items-center justify-center ${
                    jugadorActivo === 1 && !isActionLocked
                      ? 'bg-black/90 text-amber-300 border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.4)] hover:border-amber-400'
                      : 'bg-black/40 text-slate-600 border-slate-800 cursor-not-allowed'
                  }`}
                >
                  PASAR TURNO
                </button>

                <button
                  type="button"
                  disabled={isRetireLocked}
                  onClick={onRetire}
                  className={`h-8 px-2.5 rounded-xl font-serif font-black text-[10px] border transition flex items-center justify-center gap-1 shrink-0 ${
                    isRetireLocked
                      ? 'bg-black/40 text-slate-600 border-slate-800 cursor-not-allowed'
                      : 'bg-black/90 text-rose-300 border-rose-500/80 hover:border-rose-400 hover:bg-rose-950/40 transform active:scale-95 cursor-pointer'
                  }`}
                >
                  <span>{isRetireLocked ? '🔒' : '🏳️'}</span>
                  <span>RENDIRSE</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default BattleHud;
