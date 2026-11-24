import React, { useState, useRef } from 'react';
import { gameAudio, isAndroidDevice } from './utils';

export interface LevelUpChoiceModalProps {
  isOpen: boolean;
  newLevel: number;
  pendingRemainingCount?: number;
  maxPlayerHp: number;
  masterAtkBonus: number;
  masterStartingManaBonus: number;
  masterShieldChargeLevel: number;
  onUpgradeHp: () => void;
  onUpgradeAtk: () => void;
  onUpgradeStartingMana: () => void;
  onUpgradeShield: () => void;
  onClose: () => void;
}

export const LevelUpChoiceModal: React.FC<LevelUpChoiceModalProps> = ({
  isOpen,
  newLevel,
  pendingRemainingCount = 0,
  maxPlayerHp,
  masterAtkBonus,
  masterStartingManaBonus,
  masterShieldChargeLevel,
  onUpgradeHp,
  onUpgradeAtk,
  onUpgradeStartingMana,
  onUpgradeShield,
}) => {
  const [levelUpTab, setLevelUpTab] = useState<'ATRIBUTOS' | 'HABILIDADES'>('ATRIBUTOS');
  const submittedLevelRef = useRef<number | null>(null);
  const lastSeenLevelRef = useRef<number | null>(null);

  if (!isOpen) {
    submittedLevelRef.current = null;
    lastSeenLevelRef.current = null;
    return null;
  }

  if (lastSeenLevelRef.current !== newLevel) {
    lastSeenLevelRef.current = newLevel;
    submittedLevelRef.current = null;
  }

  const handleSelectUpgrade = (upgradeFn: () => void) => {
    if (submittedLevelRef.current === newLevel) return;
    submittedLevelRef.current = newLevel;
    upgradeFn();
  };

  return (
    <div className={`fixed inset-0 bg-black/90 z-[150] overflow-y-auto touch-auto p-4 flex flex-col items-center justify-center ${isAndroidDevice() ? '' : 'backdrop-blur-md'} animate-fadeIn [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden`}>
      <div className="m-auto max-w-lg w-full bg-black/95 border-2 border-emerald-400 rounded-3xl p-5 sm:p-7 shadow-[0_0_60px_rgba(16,185,129,0.5)] text-center flex flex-col items-center max-h-[92dvh] overflow-y-auto touch-pan-y [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="w-14 h-14 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-3xl mb-2 shadow-[0_0_20px_rgba(16,185,129,0.7)] animate-bounce shrink-0">
          👑
        </div>

        <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/40 mb-1">
          RANGO DEL SOBERANO AUMENTADO
        </span>

        <h2 className="text-xl sm:text-2xl font-black font-serif tracking-widest text-emerald-300 mb-1 leading-tight">
          ¡SUBIDA DE NIVEL: RANGO {newLevel}!
        </h2>

        {pendingRemainingCount > 0 && (
          <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/50 mb-2">
            +{pendingRemainingCount} {pendingRemainingCount === 1 ? 'mejora adicional pendiente' : 'mejoras adicionales pendientes'}
          </span>
        )}

        <p className="text-xs text-slate-300 font-sans mb-3.5">
          Elige qué característica permanente deseas potenciar en tu <strong>Ficha Maestra (Rey Soberano)</strong>:
        </p>

        {/* Pestañas de Características: Atributos Físicos vs Habilidades Arcanas */}
        <div className="flex w-full items-center gap-2 mb-4 shrink-0">
          <button
            type="button"
            onClick={() => {
              gameAudio.playCrispClick();
              setLevelUpTab('ATRIBUTOS');
            }}
            className={`flex-1 py-2 px-3 rounded-full font-serif font-black text-xs tracking-wider transition border ${
              levelUpTab === 'ATRIBUTOS'
                ? 'bg-emerald-950 text-emerald-200 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)] scale-[1.02]'
                : 'bg-black/70 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            ❤️ ATRIBUTOS FÍSICOS
          </button>
          <button
            type="button"
            onClick={() => {
              gameAudio.playCrispClick();
              setLevelUpTab('HABILIDADES');
            }}
            className={`flex-1 py-2 px-3 rounded-full font-serif font-black text-xs tracking-wider transition border ${
              levelUpTab === 'HABILIDADES'
                ? 'bg-cyan-950 text-cyan-200 border-cyan-400 shadow-[0_0_15px_rgba(56,189,248,0.5)] scale-[1.02]'
                : 'bg-black/70 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            ⚡ HABILIDADES ARCANAS
          </button>
        </div>

        {/* Contenido según la pestaña seleccionada */}
        <div className="flex flex-col gap-2.5 w-full mb-3">
          {levelUpTab === 'ATRIBUTOS' && (
            <>
              {/* Opción 1: Vitalidad Real (+4 HP Máx) */}
              <button
                type="button"
                onClick={() => handleSelectUpgrade(onUpgradeHp)}
                className="p-3.5 rounded-2xl bg-slate-950/90 border-2 border-emerald-500/60 hover:border-emerald-300 flex items-center justify-between text-left transition transform active:scale-95 group shadow-lg cursor-pointer hover:bg-slate-900"
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg">🛡️</span>
                    <span className="font-serif font-black text-xs sm:text-sm text-emerald-300 group-hover:text-emerald-200">
                      Constitución del Trono
                    </span>
                  </div>
                  <span className="text-[10px] sm:text-[11px] text-slate-300 block mt-0.5 font-sans">
                    Aumenta la salud máxima de tu Rey en <strong>+4 HP Máximo permanente</strong> (Actual: {maxPlayerHp} HP).
                  </span>
                </div>
                <span className="px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 text-[11px] font-serif font-black group-hover:bg-emerald-400 group-hover:text-black transition shrink-0">
                  +4 HP
                </span>
              </button>

              {/* Opción 2: Fuerza Marcial (+1 ATK de golpe directo) */}
              <button
                type="button"
                onClick={() => handleSelectUpgrade(onUpgradeAtk)}
                className="p-3.5 rounded-2xl bg-slate-950/90 border-2 border-amber-500/60 hover:border-amber-300 flex items-center justify-between text-left transition transform active:scale-95 group shadow-lg cursor-pointer hover:bg-slate-900"
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg">⚔️</span>
                    <span className="font-serif font-black text-xs sm:text-sm text-amber-300 group-hover:text-amber-200">
                      Filo del Soberano
                    </span>
                  </div>
                  <span className="text-[10px] sm:text-[11px] text-slate-300 block mt-0.5 font-sans">
                    Otorga <strong>+1 de Ataque (ATK) permanente</strong> al golpe cuerpo a cuerpo de tu Rey (Actual: {6 + masterAtkBonus} ATK).
                  </span>
                </div>
                <span className="px-3 py-1.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/50 text-[11px] font-serif font-black group-hover:bg-amber-400 group-hover:text-black transition shrink-0">
                  +1 ATK
                </span>
              </button>
            </>
          )}

          {levelUpTab === 'HABILIDADES' && (
            <>
              {/* Opción 3: Canalización de Maná Inicial (+1 Maná al comenzar cualquier combate) */}
              <button
                type="button"
                onClick={() => handleSelectUpgrade(onUpgradeStartingMana)}
                className="p-3.5 rounded-2xl bg-slate-950/90 border-2 border-cyan-500/60 hover:border-cyan-300 flex items-center justify-between text-left transition transform active:scale-95 group shadow-lg cursor-pointer hover:bg-slate-900"
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg">🔮</span>
                    <span className="font-serif font-black text-xs sm:text-sm text-cyan-300 group-hover:text-cyan-200">
                      Reserva Arcana Inicial
                    </span>
                  </div>
                  <span className="text-[10px] sm:text-[11px] text-slate-300 block mt-0.5 font-sans">
                    Empiezas todos tus combates con <strong>+{masterStartingManaBonus + 1} de Maná de reserva</strong> disponible inmediatamente (Actual: +{masterStartingManaBonus} Maná).
                  </span>
                </div>
                <span className="px-3 py-1.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 text-[11px] font-serif font-black group-hover:bg-cyan-400 group-hover:text-black transition shrink-0">
                  +1 Maná
                </span>
              </button>

              {/* Opción 4: Bastión Sagrado Inicial (Acumula cargas de Escudo Arcano al iniciar cada batalla) */}
              <button
                type="button"
                onClick={() => handleSelectUpgrade(onUpgradeShield)}
                className="p-3.5 rounded-2xl bg-slate-950/90 border-2 border-purple-500/60 hover:border-purple-300 flex items-center justify-between text-left transition transform active:scale-95 group shadow-lg cursor-pointer hover:bg-slate-900"
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-lg">✨</span>
                    <span className="font-serif font-black text-xs sm:text-sm text-purple-300 group-hover:text-purple-200">
                      Manto del Bastión
                    </span>
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-purple-950/80 text-purple-200 border border-purple-400/40">
                      Nv.{masterShieldChargeLevel} ➔ Nv.{masterShieldChargeLevel + 1}
                    </span>
                  </div>
                  <span className="text-[10px] sm:text-[11px] text-slate-300 block mt-0.5 font-sans">
                    {masterShieldChargeLevel === 0 ? (
                      <>
                        Tu Ficha Maestra empieza cada combate protegida con <strong>1 carga de Escudo Arcano</strong> (anula el primer ataque o hechizo rival).
                      </>
                    ) : (
                      <>
                        Acumula <strong>+1 carga adicional de Escudo Arcano inicial</strong> (Actual: {masterShieldChargeLevel} → {masterShieldChargeLevel + 1} cargas; cada carga anula un ataque o hechizo rival).
                      </>
                    )}
                  </span>
                </div>
                <span className="px-3 py-1.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/50 text-[11px] font-serif font-black group-hover:bg-purple-400 group-hover:text-black transition shrink-0">
                  +1 Carga
                </span>
              </button>
            </>
          )}
        </div>

        <div className="w-full bg-black/80 border border-slate-800 rounded-2xl p-2.5 text-[10.5px] font-serif text-slate-400 text-center">
          Estado actual del Rey: ❤️ {maxPlayerHp} HP Máx • ⚔️ {6 + masterAtkBonus} ATK • ⚡ +{masterStartingManaBonus} Maná inicial{' '}
          {masterShieldChargeLevel > 0
            ? `• 🛡️ Escudo inicial: ${masterShieldChargeLevel} ${masterShieldChargeLevel === 1 ? 'carga' : 'cargas'}`
            : '• 🛡️ Sin escudo inicial'}
        </div>
      </div>
    </div>
  );
};

export default LevelUpChoiceModal;
