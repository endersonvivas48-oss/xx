import React from 'react';
import { isAndroidDevice } from './utils';
import { UnitData, RolledDieResult, Orb } from './types';

export interface BankedCrestItem {
  id: string;
  level: number;
  maestria: number;
  rangoNombre: string;
  orbs: Orb[];
  name?: string;
  catalystHp?: number;
  catalystAtk?: number;
}

export interface CombatSpellItem {
  id: string;
  name: string;
  category: 'Básico' | 'Avanzado';
  cost: number;
  desc: string;
  icon: string;
  color: string;
  price?: number;
}

export interface BankedCrestModalData {
  level: number;
  crests: BankedCrestItem[];
}

export interface LimitModalData {
  lvl: number;
  maestria: number;
  esAscendido: boolean;
  reason?: 'MAX_MINIONS' | 'NO_FREE_CELLS';
}

export interface DoubleModalData {
  lvl: number;
  level?: number;
  maestria?: number;
  crestDie?: RolledDieResult;
  faceValue?: number;
}

export interface LadderModalData {
  d1: number;
  d2: number;
  d3: number;
  sorted?: number[];
  count?: number;
}

export interface SpellConfirmModalData extends CombatSpellItem {}

export interface CombatDecisionModalsProps {
  // Modal para elegir qué ficha específica desplegar si hay varias del mismo nivel
  selectBankedCrestModal: BankedCrestModalData | null;
  onCloseBankedCrestModal: () => void;
  onExecuteSummonFromBank: (lvl: number, crest?: BankedCrestItem) => void;

  // Modal de advertencia de Límite de Criaturas (máx 6 tropas no maestras)
  modalLimiteCriaturas: LimitModalData | null;
  onCloseModalLimiteCriaturas: () => void;
  onBankCrestFromLimit: (lvl: number) => void;
  onConvertCrestToMana: () => void;

  // Modal de Confirmación de Rendición
  showRetireConfirm: boolean;
  onCloseRetireConfirm: () => void;
  onExecuteRetire: () => void;

  // Modal de Elección Táctica para Pareja / Doble
  modalEleccionDoble: DoubleModalData | null;
  onCloseModalEleccionDoble: () => void;
  onSummonDouble: () => void;
  onBankDouble: () => void;
  maxMinionsReached: boolean;
  noFreeInvocationCells?: boolean;

  // Modal de Elección Táctica para Escalera Consecutiva
  modalEscalera: LadderModalData | null;
  onCloseModalEscalera: () => void;
  onChooseLadderBuff: (choice: 'HP' | 'MANA' | 'ATK') => void;

  // Modal de Confirmación de Hechizo Seleccionado
  spellToConfirm: SpellConfirmModalData | null;
  onCloseSpellToConfirm: () => void;
  onConfirmCastSpell: (spell: CombatSpellItem) => void;
  playerMana: number;
}

export const CombatDecisionModals: React.FC<CombatDecisionModalsProps> = React.memo(({
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
  maxMinionsReached,
  noFreeInvocationCells = false,
  modalEscalera,
  onCloseModalEscalera,
  onChooseLadderBuff,
  spellToConfirm,
  onCloseSpellToConfirm,
  onConfirmCastSpell,
  playerMana,
}) => {
  return (
    <>
      {/* 1. MODAL SELECTOR DE FICHA GUARDADA EN RESERVA */}
      {selectBankedCrestModal && (
        <div
          className={`fixed inset-0 bg-black/85 z-[90] flex items-center justify-center p-3 animate-fadeIn ${isAndroidDevice() ? '' : 'backdrop-blur-md'}`}
          onClick={onCloseBankedCrestModal}
        >
          <div
            className="w-full max-w-md bg-slate-900 border-2 border-amber-500 rounded-3xl p-5 shadow-[0_0_40px_rgba(245,158,11,0.5)] text-center flex flex-col items-center pointer-events-auto max-h-[90dvh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-2xl mb-2 shadow-[0_0_15px_rgba(245,158,11,0.5)] shrink-0">
              🪙
            </div>
            <h3 className="text-base font-black font-serif text-amber-300 mb-1 tracking-wider uppercase">
              FICHAS GUARDADAS DE NIVEL {selectBankedCrestModal.level}
            </h3>
            <p className="text-xs text-slate-300 mb-3 font-sans leading-relaxed">
              Tienes <strong>{selectBankedCrestModal.crests.length} fichas</strong> de Nivel {selectBankedCrestModal.level} en reserva. Elige cuál deseas desplegar en el tablero:
            </p>

            <div className="flex flex-col gap-2 w-full mb-4 max-h-56 overflow-y-auto pr-1">
              {selectBankedCrestModal.crests.map((crest, idx) => {
                const orbs = crest.orbs || [];
                const bonusHp = orbs.reduce((acc, o) => acc + (o.bonusHp || 0), 0);
                const bonusAtk = orbs.reduce((acc, o) => acc + (o.bonusAtk || 0), 0);
                const catHp = crest.catalystHp || 0;
                const catAtk = crest.catalystAtk || 0;
                const totalBonusHp = bonusHp + catHp;
                const totalBonusAtk = bonusAtk + catAtk;

                return (
                  <button
                    key={crest.id || idx}
                    type="button"
                    onClick={() => {
                      onExecuteSummonFromBank(selectBankedCrestModal.level, crest);
                      onCloseBankedCrestModal();
                    }}
                    className="p-3 rounded-2xl bg-slate-950/90 border border-amber-500/60 hover:border-amber-400 hover:bg-slate-900 flex items-center justify-between text-left transition transform active:scale-95 group shadow-md cursor-pointer"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-serif font-black text-xs text-slate-100 group-hover:text-amber-300 truncate">
                          {crest.name || `Criatura Lv.${crest.level}`} [{crest.rangoNombre || 'Iniciado'}]
                        </span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 shrink-0">
                          #{idx + 1}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-emerald-400 mt-0.5">
                        {totalBonusHp > 0 || totalBonusAtk > 0
                          ? `+${totalBonusHp} HP / +${totalBonusAtk} ATK${catHp > 0 || catAtk > 0 ? ' (Orbes + Catalizador)' : ' por Orbes'}`
                          : 'Stats Base'}
                      </div>
                      {orbs.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {orbs.map((orb, oIdx) => (
                            <span
                              key={oIdx}
                              className="text-[8.5px] px-1.5 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-500/40"
                            >
                              🔮 {orb.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-serif font-black text-xs shadow group-hover:scale-105 transition shrink-0">
                      Invocar ➔
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={onCloseBankedCrestModal}
              className="py-2 px-6 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition active:scale-95 cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* 2. MODAL DE ADVERTENCIA DE LÍMITE DE CRIATURAS EN CAMPO O SIN CASILLAS LIBRES */}
      {modalLimiteCriaturas && (() => {
        const isAscendedTitan = Boolean(modalLimiteCriaturas.esAscendido || modalLimiteCriaturas.lvl >= 7);
        const isNoFreeCells = modalLimiteCriaturas.reason === 'NO_FREE_CELLS';

        return (
          <div
            className={`fixed inset-0 bg-black/85 z-[90] flex items-center justify-center p-3 animate-fadeIn ${isAndroidDevice() ? '' : 'backdrop-blur-md'}`}
          >
            <div
              className="w-full max-w-sm bg-slate-900 border-2 border-amber-500 rounded-3xl p-5 shadow-[0_0_40px_rgba(245,158,11,0.5)] text-center flex flex-col items-center pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-2xl mb-2 shadow-[0_0_15px_rgba(245,158,11,0.5)]">
                {isAscendedTitan ? '⚡' : '⚠️'}
              </div>
              <h3 className="text-base font-black font-serif text-amber-300 mb-1 tracking-wider">
                {isNoFreeCells ? 'SIN CASILLAS LIBRES JUNTO AL REY' : 'LÍMITE DE TROPAS EN CAMPO (6/6)'}
              </h3>
              <p className="text-xs text-slate-300 mb-4 font-sans leading-relaxed">
                {isNoFreeCells ? (
                  isAscendedTitan ? (
                    <>
                      Todas las casillas adyacentes a tu Soberano están ocupadas o bloqueadas. Los <strong>Titanes Ascendidos</strong> no pueden guardarse en reserva, pero puedes canalizar su poder en maná cósmico.
                    </>
                  ) : (
                    <>
                      Todas las casillas adyacentes a tu Soberano están ocupadas o bloqueadas. ¿Deseas guardar la ficha en tu reserva o convertirla en maná?
                    </>
                  )
                ) : isAscendedTitan ? (
                  <>
                    Ya tienes el máximo de <strong>6 criaturas invocadas</strong> en combate. Los <strong>Titanes Ascendidos</strong> no pueden guardarse en reserva, pero puedes canalizar su poder en maná cósmico.
                  </>
                ) : (
                  <>
                    Ya tienes el máximo de <strong>6 criaturas invocadas</strong> en combate. ¿Deseas guardar la ficha en tu reserva o convertirla en maná?
                  </>
                )}
              </p>
              {isAscendedTitan ? (
                <button
                  type="button"
                  onClick={() => onBankCrestFromLimit(modalLimiteCriaturas.lvl)}
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-purple-900/90 to-amber-900/80 hover:from-purple-800 hover:to-amber-800 text-amber-200 font-serif font-black text-xs border border-amber-400/70 shadow-lg transition transform active:scale-95 flex flex-col items-center gap-0.5 cursor-pointer"
                >
                  <span>⚡ CANALIZAR ENERGÍA DEL TITÁN</span>
                  <span className="text-[10px] text-purple-200 font-sans font-normal">
                    +3 Maná Cósmico (No acumulable en reserva)
                  </span>
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2.5 w-full">
                  <button
                    type="button"
                    onClick={() => onBankCrestFromLimit(modalLimiteCriaturas.lvl)}
                    className="py-2.5 px-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-serif font-black text-xs border border-amber-500/60 shadow transition transform active:scale-95 flex flex-col items-center gap-0.5 cursor-pointer"
                  >
                    <span>📥 GUARDAR FICHA</span>
                    <span className="text-[9px] text-slate-400 font-sans font-normal">Reserva (+1 Maná)</span>
                  </button>
                  <button
                    type="button"
                    onClick={onConvertCrestToMana}
                    className="py-2.5 px-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-purple-300 font-serif font-black text-xs border border-purple-500/60 shadow transition transform active:scale-95 flex flex-col items-center gap-0.5 cursor-pointer"
                  >
                    <span>⚡ CONVERTIR EN MANÁ</span>
                    <span className="text-[9px] text-slate-400 font-sans font-normal">+3 Maná Cósmico</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* 3. MODAL DE CONFIRMACIÓN DE RENDICIÓN */}
      {showRetireConfirm && (
        <div
          className={`fixed inset-0 bg-black/85 z-[90] flex items-center justify-center p-3 animate-fadeIn ${isAndroidDevice() ? '' : 'backdrop-blur-md'}`}
          onClick={onCloseRetireConfirm}
        >
          <div
            className="w-full max-w-sm bg-slate-900 border-2 border-rose-500 rounded-3xl p-5 shadow-[0_0_40px_rgba(244,63,94,0.5)] text-center flex flex-col items-center pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-rose-500/20 border-2 border-rose-400 flex items-center justify-center text-2xl mb-2 shadow-[0_0_15px_rgba(244,63,94,0.5)]">
              🏳️
            </div>
            <h3 className="text-base font-black font-serif text-rose-400 mb-1 tracking-wider">
              ¿RENDIRSE EN COMBATE?
            </h3>
            <p className="text-xs text-slate-300 mb-4 font-sans leading-relaxed">
              Al abandonar esta batalla se declarará la victoria del rival y regresarás al campamento.
            </p>
            <div className="grid grid-cols-2 gap-2.5 w-full">
              <button
                type="button"
                onClick={onCloseRetireConfirm}
                className="py-2.5 px-4 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition active:scale-95 cursor-pointer"
              >
                Continuar Batalla
              </button>
              <button
                type="button"
                onClick={onExecuteRetire}
                className="py-2.5 px-4 rounded-full bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-xs transition shadow-lg transform active:scale-95 cursor-pointer border border-rose-400"
              >
                Sí, Rendirse
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. MODAL DE ELECCIÓN TÁCTICA PARA PAREJA / DOBLE */}
      {modalEleccionDoble && (() => {
        const doubleLevel = modalEleccionDoble.lvl ?? modalEleccionDoble.level ?? 1;
        const doubleMaestria = modalEleccionDoble.maestria;

        return (
          <div className={`fixed inset-0 bg-black/85 z-[90] flex items-center justify-center p-3 animate-fadeIn ${isAndroidDevice() ? '' : 'backdrop-blur-md'}`}>
            <div
              className="w-full max-w-sm bg-slate-900 border-2 border-amber-500 rounded-3xl p-5 shadow-[0_0_40px_rgba(245,158,11,0.5)] text-center flex flex-col items-center pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-2xl mb-2 shadow-[0_0_15px_rgba(245,158,11,0.5)]">
                🎲
              </div>
              <h3 className="text-base font-black font-serif text-amber-300 mb-1 tracking-wider uppercase">
                ¡PAREJA DE DADOS OBTENIDA!
              </h3>
              <p className="text-xs text-slate-300 mb-4 font-sans leading-relaxed">
                Has sacado una pareja de <strong>Nivel {doubleLevel}</strong>
                {doubleMaestria ? ` [Maestría del 3er Dado: ${doubleMaestria}]` : ''}. ¿Qué deseas hacer con esta recompensa rúnica?
              </p>
              <div className="flex flex-col gap-2.5 w-full">
                {(() => {
                  const summonBlocked = maxMinionsReached || noFreeInvocationCells;
                  return (
                    <button
                      type="button"
                      disabled={summonBlocked}
                      onClick={onSummonDouble}
                      className={`py-2.5 px-4 rounded-2xl flex items-center justify-between border transition transform active:scale-95 ${
                        !summonBlocked
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border-emerald-300 text-white font-black shadow-lg cursor-pointer'
                          : 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed opacity-50'
                      }`}
                    >
                      <div className="flex flex-col text-left">
                        <span className="text-xs font-serif font-black">1. Invocar en Tablero</span>
                        <span className="text-[10px] text-emerald-200 font-sans">
                          {maxMinionsReached
                            ? 'Límite de tropas alcanzado'
                            : noFreeInvocationCells
                            ? 'Sin casillas libres junto al Rey'
                            : `Criatura Nivel ${doubleLevel}`}
                        </span>
                      </div>
                      <span className="text-lg">⚔️</span>
                    </button>
                  );
                })()}
                <button
                  type="button"
                  onClick={onBankDouble}
                  className="py-2.5 px-4 rounded-2xl flex items-center justify-between bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 border border-amber-300 text-black font-black shadow-lg transition transform active:scale-95 cursor-pointer"
                >
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-serif font-black">2. Guardar Ficha (+1 Maná)</span>
                    <span className="text-[10px] text-black/80 font-sans">Acumula en reserva para otro turno</span>
                  </div>
                  <span className="text-lg">🪙</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 5. MODAL DE ELECCIÓN TÁCTICA PARA ESCALERA CONSECUTIVA */}
      {modalEscalera && (() => {
        const sortedDice = modalEscalera.sorted ?? [modalEscalera.d1, modalEscalera.d2, modalEscalera.d3];
        const displaySequence = `${sortedDice[0] ?? 1}-${sortedDice[1] ?? 2}-${sortedDice[2] ?? 3}`;

        return (
          <div className={`fixed inset-0 bg-black/85 z-[90] flex items-center justify-center p-3 animate-fadeIn ${isAndroidDevice() ? '' : 'backdrop-blur-md'}`}>
            <div
              className="w-full max-w-sm bg-slate-900 border-2 border-amber-500 rounded-3xl p-5 shadow-[0_0_40px_rgba(245,158,11,0.5)] text-center flex flex-col items-center pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-2xl mb-2 shadow-[0_0_15px_rgba(245,158,11,0.5)]">
                ✨
              </div>
              <h3 className="text-base font-black font-serif text-amber-300 mb-1 tracking-wider uppercase">
                ¡ESCALERA TÁCTICA OBTENIDA!
              </h3>
              <p className="text-xs text-slate-300 mb-4 font-sans leading-relaxed">
                Tirada consecutiva ({displaySequence}). Selecciona tu bonificación rúnica inmediata:
              </p>
              <div className="grid grid-cols-3 gap-2 w-full mb-3">
                <button
                  type="button"
                  onClick={() => onChooseLadderBuff('HP')}
                  className="py-3 px-1 rounded-2xl bg-gradient-to-b from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 border border-emerald-300 text-white flex flex-col items-center justify-center shadow-lg transition transform active:scale-95 cursor-pointer"
                >
                  <span className="text-lg mb-0.5">💧</span>
                  <span className="text-xs font-black font-serif">+3 HP</span>
                  <span className="text-[9px] text-emerald-200 mt-0.5 font-sans">& Escudo</span>
                </button>
                <button
                  type="button"
                  onClick={() => onChooseLadderBuff('MANA')}
                  className="py-3 px-1 rounded-2xl bg-gradient-to-b from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 border border-cyan-300 text-white flex flex-col items-center justify-center shadow-lg transition transform active:scale-95 cursor-pointer"
                >
                  <span className="text-lg mb-0.5">⚡</span>
                  <span className="text-xs font-black font-serif">+2 MANÁ</span>
                  <span className="text-[9px] text-cyan-200 mt-0.5 font-sans">Inmediato</span>
                </button>
                <button
                  type="button"
                  onClick={() => onChooseLadderBuff('ATK')}
                  className="py-3 px-1 rounded-2xl bg-gradient-to-b from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 border border-rose-300 text-white flex flex-col items-center justify-center shadow-lg transition transform active:scale-95 cursor-pointer"
                >
                  <span className="text-lg mb-0.5">⚔️</span>
                  <span className="text-xs font-black font-serif">+1 ATK</span>
                  <span className="text-[9px] text-rose-200 mt-0.5 font-sans">Global</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 6. MODAL DE CONFIRMACIÓN DE HECHIZO SELECCIONADO */}
      {spellToConfirm && (
        <div
          className={`fixed inset-0 bg-black/85 z-[90] flex items-center justify-center p-3 animate-fadeIn ${isAndroidDevice() ? '' : 'backdrop-blur-md'}`}
          onClick={onCloseSpellToConfirm}
        >
          <div
            className="w-full max-w-sm bg-slate-900 border-2 rounded-3xl p-5 shadow-2xl text-center flex flex-col items-center pointer-events-auto"
            style={{ borderColor: spellToConfirm.color, boxShadow: `0 0 35px ${spellToConfirm.color}50` }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div
              className="w-14 h-14 rounded-2xl border-2 flex items-center justify-center text-3xl mb-2"
              style={{ backgroundColor: `${spellToConfirm.color}20`, borderColor: spellToConfirm.color }}
            >
              {spellToConfirm.icon}
            </div>
            <h3 className="text-base font-black font-serif mb-0.5 tracking-wider" style={{ color: spellToConfirm.color }}>
              {spellToConfirm.name.toUpperCase()}
            </h3>
            <span className="text-[11px] font-mono font-bold text-amber-300 mb-2">
              Coste: {spellToConfirm.cost} Maná {playerMana < spellToConfirm.cost && '(Insuficiente)'}
            </span>
            <p className="text-xs text-slate-300 mb-4 font-sans leading-relaxed">
              {spellToConfirm.desc}
            </p>
            <div className="grid grid-cols-2 gap-2.5 w-full">
              <button
                type="button"
                onClick={onCloseSpellToConfirm}
                className="py-2.5 px-4 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition active:scale-95 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={playerMana < spellToConfirm.cost}
                onClick={() => onConfirmCastSpell(spellToConfirm)}
                className={`py-2.5 px-4 rounded-full font-black text-xs transition shadow-lg transform active:scale-95 cursor-pointer border ${
                  playerMana >= spellToConfirm.cost
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black border-amber-300'
                    : 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed opacity-50'
                }`}
              >
                Lanzar Hechizo
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

CombatDecisionModals.displayName = 'CombatDecisionModals';
