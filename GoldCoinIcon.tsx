import React from 'react';

/**
 * Componente vectorial SVG de Moneda de Oro circular con alto relieve
 * Evita la caja/cuadro de emojis de algunos sistemas operativos o fuentes
 */
export function GoldCoinIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={`inline-block shrink-0 align-middle ${className}`}
      style={{ minWidth: size, minHeight: size }}
    >
      {/* Sombra suave */}
      <circle cx="12" cy="12" r="10" fill="#78350f" opacity="0.3" />
      
      {/* Borde exterior dorado */}
      <circle cx="12" cy="12" r="9.5" fill="#f59e0b" stroke="#fef08a" strokeWidth="1" />
      
      {/* Círculo interior troquelado */}
      <circle cx="12" cy="12" r="7.5" fill="#d97706" stroke="#b45309" strokeWidth="0.8" />
      
      {/* Estrella heráldica central */}
      <polygon
        points="12,7 13.5,10.5 17,11 14.5,13.5 15,17 12,15.2 9,17 9.5,13.5 7,11 10.5,10.5"
        fill="#fef08a"
      />
    </svg>
  );
}
