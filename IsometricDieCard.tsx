import React from 'react';
import { DieData } from './types';
import { getDieImageCandidateUrls, getDieImageCacheKey } from './diceImageMap';
import { CachedImage } from './CachedImage';

// Renderizado de respaldo en caso de que ninguna imagen cargue
function DieFaceDots({ value, dotColor = '#ffffff' }: { value: number; dotColor?: string }) {
  const dotsMap: Record<number, [number, number][]> = {
    1: [[50, 50]],
    2: [[30, 30], [70, 70]],
    3: [[28, 28], [50, 50], [72, 72]],
    4: [[30, 30], [70, 30], [30, 70], [70, 70]],
    5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
    6: [[30, 25], [70, 25], [30, 50], [70, 50], [30, 75], [70, 75]],
  };

  const points = dotsMap[value] || dotsMap[1];

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full block">
      {points.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={9} fill={dotColor} filter="drop-shadow(0 1px 2px rgba(0,0,0,0.6))" />
      ))}
    </svg>
  );
}

/**
 * Componente visual de tarjeta de dado para el Taller de Dados y Gestión.
 * Delega la carga, caché verificada y cascada de fallback en el componente unificado CachedImage.
 */
export function IsometricDieCard({
  die,
  isSelected = false,
  onClick,
  onAction,
  actionLabel,
  actionClass,
}: {
  die: DieData;
  isSelected?: boolean;
  onClick?: () => void;
  onAction?: () => void;
  actionLabel?: string;
  actionClass?: string;
}) {
  const rarityName = die?.rarity?.name || 'Normal';
  const raritySlots = die?.rarity?.slots ?? 0;
  const fallbackRarityClass =
    rarityName === 'Legendario'
      ? 'text-amber-400 border-amber-500'
      : rarityName === 'Épico'
      ? 'text-purple-400 border-purple-500'
      : rarityName === 'Raro'
      ? 'text-cyan-400 border-cyan-500'
      : 'text-slate-300 border-slate-600';
  const rawRarityClass = die?.rarity?.class || '';
  const rarityClass = rawRarityClass.includes('text-') ? rawRarityClass : fallbackRarityClass;

  const isLegendary = rarityName === 'Legendario';
  const isEpic = rarityName === 'Épico';
  const isRare = rarityName === 'Raro';

  const cacheKey = getDieImageCacheKey(die.name, die.id, rarityName);
  const candidateUrls = getDieImageCandidateUrls(die.name, die.id, rarityName);

  const cubeBg = isLegendary
    ? 'bg-gradient-to-br from-amber-500 via-yellow-400 to-amber-600 text-black'
    : isEpic
    ? 'bg-gradient-to-br from-purple-600 via-fuchsia-500 to-purple-800 text-white'
    : isRare
    ? 'bg-gradient-to-br from-cyan-500 via-sky-400 to-blue-600 text-white'
    : 'bg-gradient-to-br from-slate-600 via-slate-500 to-slate-700 text-white';

  const borderColor = isLegendary
    ? 'border-amber-400'
    : isEpic
    ? 'border-purple-400'
    : isRare
    ? 'border-cyan-400'
    : 'border-slate-500';

  const glowClass = isSelected
    ? isLegendary
      ? 'border-amber-300 ring-2 ring-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.6)]'
      : isEpic
      ? 'border-purple-300 ring-2 ring-purple-400 shadow-[0_0_20px_rgba(192,132,252,0.6)]'
      : 'border-cyan-300 ring-2 ring-cyan-400 shadow-[0_0_20px_rgba(56,189,248,0.6)]'
    : 'hover:border-amber-400/80';

  return (
    <div
      onClick={onClick}
      className={`relative w-full p-3.5 rounded-2xl bg-slate-950/90 border-2 ${borderColor} ${glowClass} transition duration-150 cursor-pointer flex flex-col justify-between shadow-lg group`}
    >
      <div className="flex items-center gap-3">
        {/* VITRINA OFICIAL DE LA IMAGEN REAL DEL DADO */}
        <div className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-xl bg-black/90 border border-slate-700/80 overflow-hidden flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-300">
          <CachedImage
            key={cacheKey}
            cacheKey={cacheKey}
            candidateUrls={candidateUrls}
            alt={die.name}
            loading="eager"
            decoding="async"
            className="w-full h-full object-cover filter drop-shadow-[0_0_10px_rgba(0,0,0,0.8)]"
            fallbackPlaceholder={
              <div className={`w-full h-full p-2 flex items-center justify-center ${cubeBg}`}>
                <DieFaceDots
                  value={Math.min(6, Math.max(1, die.level || 1))}
                  dotColor={isLegendary ? '#000000' : '#ffffff'}
                />
              </div>
            }
          />

          {/* Badge de Rareza / Ranuras sobre la imagen */}
          <span className="absolute top-1 right-1 px-1.5 py-0.2 rounded-md bg-black/85 border border-amber-400/80 text-[8.5px] font-mono font-black text-amber-300 shadow">
            {raritySlots === 0 ? 'Sin ranura' : `${raritySlots}R`}
          </span>
        </div>

        {/* INFORMACIÓN DEL DADO */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <h4 className="font-serif font-black text-xs sm:text-sm text-white group-hover:text-amber-300 transition truncate">
              {die.name}
            </h4>
            <span className={`text-[9.5px] sm:text-[10px] font-serif font-bold ${rarityClass} shrink-0`}>
              {rarityName}
            </span>
          </div>

          {/* Ranuras de Orbes con indicadores claros */}
          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
            {raritySlots === 0 ? (
              <span className="text-[10px] text-slate-400 font-sans italic">Sin ranuras</span>
            ) : (
              Array.from({ length: raritySlots }).map((_, slotIdx) => {
                const orb = (die.attachedOrbs || [])[slotIdx];
                return (
                  <div
                    key={slotIdx}
                    className={`w-4 h-4 rounded-full border flex items-center justify-center transition ${
                      orb
                        ? 'border-amber-300 bg-purple-600 shadow-[0_0_6px_rgba(245,158,11,0.8)]'
                        : 'border-slate-600 bg-black/60 border-dashed'
                    }`}
                  >
                    {orb ? <div className="w-2 h-2 rounded-full bg-amber-300 shadow" /> : null}
                  </div>
                );
              })
            )}

            {die.attachedOrbs && die.attachedOrbs.length > 0 && (
              <span className="text-[9.5px] text-cyan-300 font-sans truncate block max-w-[120px]">
                {die.attachedOrbs.map((o) => (o.name || '').replace('Orbe de ', '')).join(', ')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* BOTONES DE ACCIÓN: GESTIONAR ORBES Y AÑADIR / RETIRAR DEL MAZO */}
      <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClick}
          className="py-1 px-3 rounded-full bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/50 text-[10px] font-serif font-bold shadow transition active:scale-95 flex items-center gap-1 cursor-pointer"
        >
          <span>⚙️</span>
          <span>Orbes</span>
        </button>

        {onAction && actionLabel && (
          <button
            type="button"
            onClick={onAction}
            className={`py-1 px-3.5 rounded-full text-[10px] font-serif font-bold border transition transform active:scale-95 shadow cursor-pointer ${
              actionClass || 'bg-slate-900 hover:bg-slate-800 text-amber-200 border-amber-600/50'
            }`}
          >
            {actionLabel.replace(/^[^\w\s]+\s*/, '')}
          </button>
        )}
      </div>
    </div>
  );
}
