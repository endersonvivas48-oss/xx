import React from 'react';
import { getOrbAllCandidateUrls, getExactOrbFileName } from './irvbeOrbImages';
import { GoldCoinIcon } from './GoldCoinIcon';
import { Orb } from './types';
import { CachedImage } from './CachedImage';

interface ShopOrbCardProps {
  orb: Orb;
  playerLevel: number;
  onBuy: (orb: Orb) => void;
  onInspect?: (orb: Orb) => void;
  fontSize?: number;
}

export const ShopOrbCard: React.FC<ShopOrbCardProps> = ({
  orb,
  playerLevel,
  onBuy,
  onInspect,
  fontSize = 12,
}) => {
  const isLevelLocked = Boolean(orb.minHeroLevel && playerLevel < orb.minHeroLevel);
  const exactFile = getExactOrbFileName(orb.name, orb.element, orb.id);
  const cacheKey = `orb_${exactFile}`;
  const candidateUrls = getOrbAllCandidateUrls(orb.name, orb.element, orb.id);

  return (
    <div
      onClick={() => {
        if (onInspect) onInspect(orb);
      }}
      className={`relative overflow-hidden p-4 rounded-2xl bg-slate-950/85 border flex flex-col justify-between shadow-xl transition-all duration-300 group hover:border-amber-400 cursor-pointer ${
        isLevelLocked ? 'border-slate-800 opacity-60' : 'border-purple-800/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.25)]'
      }`}
    >
      {/* IMAGEN DE FONDO MÁS VISIBLE DETRÁS DEL CONTENIDO */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center opacity-60 group-hover:opacity-80 transition-opacity duration-300">
        <CachedImage
          cacheKey={cacheKey}
          candidateUrls={candidateUrls}
          alt={orb.name}
          className="w-48 h-48 object-contain filter drop-shadow-[0_0_24px_rgba(168,85,247,0.5)] transform scale-110 group-hover:scale-125 transition-transform duration-500"
        />
        {/* Capa de contraste equilibrada para resaltar el orbe sin perder legibilidad */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/40 to-slate-950/30" />
      </div>

      {/* CONTENIDO EN PRIMER PLANO CON ALTO CONTRASTE */}
      <div className="relative z-10">
        <div className="mb-2">
          <div className="flex items-center justify-between gap-2">
            <span className="font-serif font-black text-slate-100 text-sm sm:text-base truncate drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
              {orb.name}
            </span>
            <span className="text-[10px] uppercase font-bold text-purple-200 bg-purple-950/90 px-2.5 py-0.5 rounded-full border border-purple-400/50 shrink-0 shadow-sm backdrop-blur-sm">
              {orb.element}
            </span>
          </div>
        </div>

        <p
          style={{ fontSize: `${fontSize}px` }}
          className="text-cyan-200 font-medium mt-1 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] leading-relaxed"
        >
          {orb.effect}
        </p>

        {orb.minHeroLevel && (
          <div className="mt-2.5 text-[10px] font-bold text-amber-300 bg-black/85 backdrop-blur-sm px-2.5 py-0.5 rounded-full border border-amber-500/50 inline-flex items-center gap-1 shadow">
            <span>{isLevelLocked ? '🔒' : '✓'}</span>
            <span>Nivel Requerido: Lv.{orb.minHeroLevel}</span>
          </div>
        )}
      </div>

      <div className="relative z-10 mt-4 flex items-center justify-between pt-2 border-t border-slate-800/80">
        <span className="text-xs font-serif font-bold text-amber-400 flex items-center gap-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
          <span>{orb.price}</span>
          <GoldCoinIcon size={14} />
        </span>
        <button
          disabled={isLevelLocked}
          onClick={(e) => {
            e.stopPropagation();
            onBuy(orb);
          }}
          className={`py-1.5 px-4 rounded-full text-xs font-serif font-black tracking-wider border transition transform active:scale-95 shadow-md ${
            isLevelLocked
              ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
              : 'bg-gradient-to-r from-purple-800 to-indigo-800 hover:from-purple-700 hover:to-indigo-700 text-purple-100 border-purple-400/60 shadow-[0_0_12px_rgba(168,85,247,0.3)]'
          }`}
        >
          {isLevelLocked ? `Bloqueado (Lv.${orb.minHeroLevel})` : 'Comprar'}
        </button>
      </div>
    </div>
  );
};
