import React from 'react';
import { gameAudio, isAndroidDevice } from './utils';
import { CachedImage } from './CachedImage';

export interface ConfirmationModalsProps {
  // 1. Reset / New Campaign Confirm
  showResetConfirmModal: boolean;
  setShowResetConfirmModal: (open: boolean) => void;
  onConfirmReset: () => void;

  // 2. Start New Campaign Overwrite Warning
  isConfirmNewCampaignOpen: boolean;
  setIsConfirmNewCampaignOpen: (open: boolean) => void;
  pendingCampaignTarget: number | null;
  onExecuteStartCampaign: (target: number) => void;

  // 3. Save Game Confirm Modal
  showSaveConfirmModal: boolean;
  setShowSaveConfirmModal: (open: boolean) => void;
  onExecuteSaveGame: () => void;

  // 4. Return to Title Confirm
  showReturnTitleConfirmModal: boolean;
  setShowReturnTitleConfirmModal: (open: boolean) => void;
  onConfirmReturnToTitle: () => void;

  // 5. Exit Game Confirm Modal
  showExitConfirmModal: boolean;
  setShowExitConfirmModal: (open: boolean) => void;
  onConfirmExitGame: () => void;
}

export const ConfirmationModals: React.FC<ConfirmationModalsProps> = ({
  showResetConfirmModal,
  setShowResetConfirmModal,
  onConfirmReset,
  isConfirmNewCampaignOpen,
  setIsConfirmNewCampaignOpen,
  pendingCampaignTarget,
  onExecuteStartCampaign,
  showSaveConfirmModal,
  setShowSaveConfirmModal,
  onExecuteSaveGame,
  showReturnTitleConfirmModal,
  setShowReturnTitleConfirmModal,
  onConfirmReturnToTitle,
  showExitConfirmModal,
  setShowExitConfirmModal,
  onConfirmExitGame,
}) => {
  const isAndroid = isAndroidDevice();
  const blurMd = isAndroid ? '' : 'backdrop-blur-md';
  const stoneBgCandidates = [
    'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main/fondo_guardar_piedra.jpg',
    'https://raw.githubusercontent.com/endersonvivas48-oss/main/main/fondo_guardar_piedra.jpg',
    'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main/guardar.jpg',
    'https://raw.githubusercontent.com/endersonvivas48-oss/main/main/guardar.jpg',
  ];

  return (
    <>
      {/* 1. MODAL DE CONFIRMACIÓN DE REINICIO DE CAMPAÑA */}
      {showResetConfirmModal && (
        <div
          className={`fixed inset-0 bg-black/90 z-[160] flex items-center justify-center p-4 ${blurMd} animate-fadeIn`}
          onClick={() => setShowResetConfirmModal(false)}
        >
          <div
            className="max-w-xs sm:max-w-sm w-full bg-slate-900 border-2 border-amber-500 rounded-3xl p-5 sm:p-6 shadow-[0_0_50px_rgba(245,158,11,0.5)] text-center flex flex-col items-center pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-2xl mb-2.5 shadow-[0_0_15px_rgba(245,158,11,0.5)]">
              ⚠️
            </div>
            <h3 className="text-base sm:text-lg font-black font-serif text-amber-300 mb-1 tracking-wider">
              ¿INICIAR NUEVA CAMPAÑA?
            </h3>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed font-sans">
              Tienes una partida guardada. No existe autoguardado automático: al iniciar una nueva campaña, <strong>tu partida anterior se conservará intacta</strong> hasta que pulses expresamente <strong>GUARDAR</strong> (desde el Campamento de Guerra o la barra superior de la Ciudad) y confirmes el guardado.
            </p>
            <div className="grid grid-cols-2 gap-2.5 w-full">
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(false)}
                className="py-2.5 px-3 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition active:scale-95 cursor-pointer"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowResetConfirmModal(false);
                  gameAudio.playConfirmSelect();
                  onConfirmReset();
                }}
                className="py-2.5 px-3 rounded-full bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black font-black text-xs transition shadow-lg transform active:scale-95 border border-amber-300 cursor-pointer"
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. MODAL DE CONFIRMACIÓN PARA NO SOBREESCRIBIR CAMPAÑA EN CURSO */}
      {isConfirmNewCampaignOpen && (
        <div
          className={`fixed inset-0 z-[160] overflow-hidden touch-none select-none bg-black/80 flex flex-col items-center justify-center p-3 sm:p-6 ${blurMd} animate-fadeIn`}
          onClick={() => setIsConfirmNewCampaignOpen(false)}
        >
          <div
            className="m-auto max-w-md w-full bg-slate-950/95 border-2 border-amber-500 rounded-3xl p-5 sm:p-6 shadow-[0_0_50px_rgba(245,158,11,0.5)] text-slate-200 text-center relative pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-2xl mx-auto mb-3">
              🛡️
            </div>
            <h3 className="font-serif font-black text-base sm:text-lg text-amber-300 mb-1">
              ¿INICIAR NUEVA CAMPAÑA?
            </h3>
            <p className="text-xs text-slate-300 font-sans leading-relaxed mb-4">
              Tienes una campaña en curso. No existe autoguardado automático: al iniciar una nueva aventura, tu partida anterior no se borrará ni se sobreescribirá hasta que pulses expresamente <strong>GUARDAR</strong> (desde el Campamento de Guerra o la barra superior de la Ciudad) y confirmes el guardado.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  gameAudio.playCrispClick();
                  setIsConfirmNewCampaignOpen(false);
                }}
                className="w-full sm:w-1/2 py-2 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 font-serif font-bold text-xs transition cursor-pointer"
              >
                Volver a la Actual
              </button>
              <button
                type="button"
                onClick={() => {
                  if (pendingCampaignTarget !== null) {
                    onExecuteStartCampaign(pendingCampaignTarget);
                  }
                  setIsConfirmNewCampaignOpen(false);
                }}
                className="w-full sm:w-1/2 py-2 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-serif font-black text-xs transition shadow-lg cursor-pointer"
              >
                Comenzar sin Borrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. MODAL DE CONFIRMACIÓN DE GUARDADO */}
      {showSaveConfirmModal && (
        <div
          className="fixed inset-0 z-[160] overflow-y-auto touch-auto p-3 sm:p-5 flex flex-col items-center justify-center animate-fadeIn [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          onClick={() => setShowSaveConfirmModal(false)}
        >
          <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-black">
            <CachedImage
              cacheKey="bg_save_stone"
              candidateUrls={stoneBgCandidates}
              alt="Fondo Piedra Grabada"
              loading="eager"
              className="w-full h-full object-cover filter brightness-85 contrast-125 scale-100 transition-all duration-700"
            />
            <div className="absolute inset-0 bg-radial-vignette from-transparent via-black/40 to-black/85" />
          </div>

          <div
            className={`m-auto max-w-xs sm:max-w-sm w-full bg-black/90 border-2 border-emerald-500 rounded-3xl p-5 sm:p-6 shadow-[0_0_60px_rgba(16,185,129,0.7)] text-center flex flex-col items-center pointer-events-auto relative overflow-hidden ${isAndroidDevice() ? '' : 'backdrop-blur-md'} z-10`}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="relative z-10 flex flex-col items-center w-full">
              <h3 className="text-base sm:text-lg font-black font-serif text-emerald-300 mb-1 tracking-wider drop-shadow-[0_2px_8px_rgba(0,0,0,1)]">
                ¿GUARDAR PARTIDA?
              </h3>
              <p className="text-xs text-slate-100 mb-4 leading-relaxed font-sans drop-shadow-[0_2px_6px_rgba(0,0,0,1)]">
                Se grabará en piedra tu avance actual, dados forjados, orbes y oro en este dispositivo.
              </p>
              <div className="grid grid-cols-2 gap-2.5 w-full">
                <button
                  type="button"
                  onClick={() => setShowSaveConfirmModal(false)}
                  className="py-2.5 px-3 rounded-full bg-black/90 hover:bg-black text-slate-300 hover:text-white font-serif font-bold text-xs border border-slate-700 shadow transition active:scale-95"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={onExecuteSaveGame}
                  className="py-2.5 px-3 rounded-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-black font-serif font-black text-xs transition shadow-lg transform active:scale-95 border border-emerald-300"
                >
                  Sí, Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. MODAL DE CONFIRMACIÓN DE REGRESAR A LA PORTADA */}
      {showReturnTitleConfirmModal && (
        <div
          className={`fixed inset-0 bg-black/90 z-[160] flex items-center justify-center p-4 ${blurMd} animate-fadeIn`}
          onClick={() => setShowReturnTitleConfirmModal(false)}
        >
          <div
            className="max-w-xs w-full bg-slate-900 border-2 border-amber-500 rounded-3xl p-5 sm:p-6 shadow-[0_0_50px_rgba(245,158,11,0.5)] text-center flex flex-col items-center pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-2xl mb-2.5 shadow-[0_0_15px_rgba(245,158,11,0.5)]">
              ⚠️
            </div>
            <h3 className="text-base font-black font-serif text-amber-300 mb-1 tracking-wider">
              ¿VOLVER A LA PORTADA?
            </h3>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed font-sans">
              Cualquier cambio o avance que <strong>no hayas guardado</strong> con el botón 💾 GUARDAR se perderá al regresar al título principal.
            </p>
            <div className="grid grid-cols-2 gap-2.5 w-full">
              <button
                type="button"
                onClick={() => setShowReturnTitleConfirmModal(false)}
                className="py-2.5 px-3 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition active:scale-95"
              >
                Permanecer
              </button>
              <button
                type="button"
                onClick={onConfirmReturnToTitle}
                className="py-2.5 px-3 rounded-full bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-xs transition shadow-lg transform active:scale-95 border border-rose-400"
              >
                Sí, Salir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL DE SALIR DEL JUEGO / CERRAR APP */}
      {showExitConfirmModal && (
        <div
          className={`fixed inset-0 bg-black/90 z-[170] flex items-center justify-center p-4 ${blurMd} animate-fadeIn`}
          onClick={() => setShowExitConfirmModal(false)}
        >
          <div
            className="max-w-xs sm:max-w-sm w-full bg-slate-900 border-2 border-rose-500 rounded-3xl p-5 sm:p-6 shadow-[0_0_50px_rgba(244,63,94,0.5)] text-center flex flex-col items-center pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center text-2xl mb-2.5 shadow-[0_0_15px_rgba(244,63,94,0.5)]">
              🚪
            </div>
            <h3 className="text-base sm:text-lg font-black font-serif text-rose-400 mb-1 tracking-wider">
              SALIR DEL JUEGO
            </h3>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed font-sans">
              En dispositivos móviles o APK, la aplicación se cerrará por completo. En navegador web o iframe puedes cerrar esta pestaña o volver al menú.
            </p>
            <div className="grid grid-cols-2 gap-2.5 w-full">
              <button
                type="button"
                onClick={() => setShowExitConfirmModal(false)}
                className="py-2.5 px-3 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition active:scale-95 cursor-pointer"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={onConfirmExitGame}
                className="py-2.5 px-3 rounded-full bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-xs transition shadow-lg transform active:scale-95 border border-rose-400 cursor-pointer"
              >
                Cerrar App
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ConfirmationModals;
