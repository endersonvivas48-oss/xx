import React from 'react';
import { gameAudio, isAndroidDevice } from './utils';

export interface TitleViewProps {
  hasSavedGame: boolean;
  checkHasActualSavedGame: () => boolean;
  titleSelectedIndex: number;
  setTitleSelectedIndex: (idx: number) => void;
  onContinue: () => void;
  onNewCampaign: () => void;
  onExit: () => void;
  onOpenAssetDownloader: () => void;
  FullscreenGameLogo: React.FC<{ className?: string }>;
}

export const TitleView: React.FC<TitleViewProps> = ({
  hasSavedGame,
  checkHasActualSavedGame,
  titleSelectedIndex,
  setTitleSelectedIndex,
  onContinue,
  onNewCampaign,
  onExit,
  onOpenAssetDownloader,
  FullscreenGameLogo,
}) => {
  const hasActualSave = hasSavedGame && checkHasActualSavedGame();
  const isAndroid = isAndroidDevice();
  const blurMd = isAndroid ? '' : 'backdrop-blur-md';

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-end bg-black overflow-hidden z-20 pb-8 sm:pb-12 px-4 pointer-events-auto animate-fadeIn">
      {/* Fondo de pantalla completa con el logo oficial del juego */}
      <FullscreenGameLogo />

      {/* Botón de Guardado en Disco Local (Cache Storage API / Modo Offline) */}
      <button
        type="button"
        onClick={() => {
          gameAudio.playCrispClick();
          onOpenAssetDownloader();
        }}
        className={`absolute top-4 left-4 z-40 w-11 h-11 rounded-2xl bg-black/85 hover:bg-slate-900 text-cyan-300 border-2 border-cyan-500/70 hover:border-cyan-300 shadow-[0_0_25px_rgba(6,182,212,0.5)] flex items-center justify-center text-xl transition transform active:scale-90 hover:scale-105 cursor-pointer ${blurMd} select-none group`}
        aria-label="Descargar Assets a Disco"
      >
        <span className="group-hover:animate-bounce">💾</span>
      </button>

      {/* Gradiente inferior para legibilidad óptima de los botones */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none" />

      {/* Panel de botones de acción */}
      <div className="relative z-30 flex flex-col items-center gap-2.5 w-full max-w-sm px-4 pointer-events-auto">
        {hasActualSave && (
          <button
            type="button"
            onClick={onContinue}
            onMouseEnter={() => setTitleSelectedIndex(0)}
            className={`w-full py-3 px-6 rounded-full bg-black/85 text-emerald-300 font-serif font-black text-xs sm:text-sm tracking-widest border transition transform active:scale-95 flex items-center justify-center ${blurMd} cursor-pointer pointer-events-auto select-none ${
              titleSelectedIndex === 0
                ? 'border-emerald-300 shadow-[0_0_35px_rgba(16,185,129,0.95)] ring-2 ring-emerald-400 scale-105 bg-black/95'
                : 'border-emerald-400/80 shadow-[0_0_25px_rgba(16,185,129,0.5)] hover:border-emerald-300'
            }`}
          >
            CONTINUAR CAMPAÑA
          </button>
        )}

        <button
          type="button"
          onClick={onNewCampaign}
          onMouseEnter={() => setTitleSelectedIndex(hasActualSave ? 1 : 0)}
          className={`w-full py-3 px-6 rounded-full bg-black/85 text-amber-300 font-serif font-black text-xs sm:text-sm tracking-widest border transition transform active:scale-95 flex items-center justify-center ${blurMd} cursor-pointer pointer-events-auto select-none ${
            (hasActualSave ? titleSelectedIndex === 1 : titleSelectedIndex === 0)
              ? 'border-amber-300 shadow-[0_0_35px_rgba(245,158,11,0.95)] ring-2 ring-amber-400 scale-105 bg-black/95'
              : 'border-amber-500/80 shadow-[0_0_25px_rgba(245,158,11,0.5)] hover:border-amber-400'
          }`}
        >
          NUEVA CAMPAÑA
        </button>

        <button
          type="button"
          onClick={onExit}
          onMouseEnter={() => setTitleSelectedIndex(hasActualSave ? 2 : 1)}
          className={`w-full py-2.5 px-6 rounded-full bg-black/85 text-rose-300 font-serif font-black text-xs tracking-widest border transition transform active:scale-95 flex items-center justify-center ${blurMd} cursor-pointer pointer-events-auto select-none ${
            (hasActualSave ? titleSelectedIndex === 2 : titleSelectedIndex === 1)
              ? 'border-rose-400 shadow-[0_0_25px_rgba(244,63,94,0.8)] ring-1 ring-rose-400 scale-105 bg-black/95'
              : 'border-rose-500/60 shadow hover:border-rose-400'
          }`}
        >
          SALIR DEL JUEGO
        </button>
      </div>
    </div>
  );
};

export default TitleView;
