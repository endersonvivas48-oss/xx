import React from 'react';
import { getOrbAllCandidateUrls, getExactOrbFileName } from './irvbeOrbImages';
import { CachedImage } from './CachedImage';

export interface OrbThumbnailProps {
  element: string;
  name: string;
  orbId?: string;
  className?: string;
  sizeClassName?: string;
  onInspect?: () => void;
  isLargeCard?: boolean;
}

export const OrbThumbnail: React.FC<OrbThumbnailProps> = ({
  element = 'Cosmos',
  name,
  orbId = '',
  className = '',
  sizeClassName = 'w-10 h-10',
  onInspect,
  isLargeCard = false,
}) => {
  const exactFile = getExactOrbFileName(name, element, orbId);
  const cacheKey = `orb_${exactFile}`;
  const candidateUrls = getOrbAllCandidateUrls(name, element, orbId);

  // Color temático para el foco de fondo
  const normElem = (element || '').toLowerCase();
  let themeColor = '#ec4899';
  if (normElem.includes('fuego')) themeColor = '#ef4444';
  else if (normElem.includes('hielo')) themeColor = '#38bdf8';
  else if (normElem.includes('rayo')) themeColor = '#eab308';
  else if (normElem.includes('vampir') || normElem.includes('oscur')) themeColor = '#a855f7';
  else if (normElem.includes('sombra')) themeColor = '#7c3aed';
  else if (normElem.includes('viento')) themeColor = '#10b981';
  else if (normElem.includes('tierra')) themeColor = '#84cc16';
  else if (normElem.includes('venen')) themeColor = '#22c55e';
  else if (normElem.includes('luz')) themeColor = '#f59e0b';
  else if (normElem.includes('metal')) themeColor = '#94a3b8';

  // Versión de tarjeta grande en el Códice
  if (isLargeCard) {
    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          if (onInspect) onInspect();
        }}
        className="w-full h-44 rounded-lg overflow-hidden bg-slate-950 border flex items-center justify-center relative mb-2.5 group p-1.5 cursor-pointer hover:border-amber-400/80 shadow-md"
        style={{ borderColor: `${themeColor}40` }}
      >
        {/* Resplandor ambiental de fondo */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{ background: `radial-gradient(circle, ${themeColor} 0%, transparent 70%)` }}
        />

        <CachedImage
          cacheKey={cacheKey}
          candidateUrls={candidateUrls}
          alt={name}
          className="w-full h-full object-contain object-center z-10 drop-shadow-md group-hover:scale-105 transition-all duration-300 pointer-events-none"
        />

        {onInspect && (
          <div className="absolute inset-x-2 bottom-2 z-20 flex justify-center opacity-90 group-hover:opacity-100 transition">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onInspect();
              }}
              className="px-2.5 py-1 rounded-md bg-black/90 text-[10px] font-bold text-amber-300 border border-amber-400/80 shadow flex items-center gap-1 backdrop-blur-sm hover:bg-amber-500 hover:text-black transition"
            >
              🔍 Click para Ampliar
            </button>
          </div>
        )}
      </div>
    );
  }

  // Versión compacta para tienda e inventarios
  return (
    <div
      className={`${sizeClassName} rounded-xl bg-slate-950 border border-slate-800 p-0.5 flex items-center justify-center overflow-hidden shrink-0 shadow-inner relative ${className}`}
    >
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{ background: `radial-gradient(circle, ${themeColor} 0%, transparent 70%)` }}
      />
      <CachedImage
        cacheKey={cacheKey}
        candidateUrls={candidateUrls}
        alt={name}
        className="w-full h-full object-contain filter drop-shadow-md relative z-10"
      />
    </div>
  );
};
