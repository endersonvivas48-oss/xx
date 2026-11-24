import React from 'react';
import { CachedImage } from './CachedImage';

export function InspectedImageRenderer({
  imgUrl,
  candidateUrls,
  alt,
  color,
}: {
  imgUrl: string;
  candidateUrls?: string[];
  alt: string;
  color: string;
}) {
  const cacheKey = `inspect_${alt}`;
  const urlList = (candidateUrls && candidateUrls.length > 0 ? candidateUrls : [imgUrl]).filter(Boolean);

  return (
    <CachedImage
      key={`${cacheKey}_${urlList.join('|')}`}
      cacheKey={cacheKey}
      candidateUrls={urlList}
      alt={alt}
      loading="eager"
      decoding="async"
      className="w-full h-full object-contain filter drop-shadow-2xl"
      fallbackPlaceholder={
        <div className="w-full h-full flex flex-col items-center justify-center p-4">
          <div
            className="w-20 h-20 rounded-full border-2 flex items-center justify-center text-4xl mb-2 shadow-lg"
            style={{ backgroundColor: `${color}20`, borderColor: color }}
          >
            🔮
          </div>
          <span className="font-serif font-black text-sm text-slate-100">{alt}</span>
        </div>
      }
    />
  );
}
