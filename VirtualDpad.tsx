import React, { useEffect } from 'react';
import { virtualInput } from './virtualInput';
import { isAndroidDevice, useIsMobile } from './utils';

export const VirtualDpad: React.FC = () => {
  const isMobile = useIsMobile();
  const shouldShow = isMobile || isAndroidDevice();

  useEffect(() => {
    return () => {
      virtualInput.reset();
    };
  }, []);

  if (!shouldShow) return null;

  return (
    <div className={`absolute bottom-4 right-4 z-30 pointer-events-auto flex flex-col items-center gap-1.5 p-2 rounded-2xl border border-amber-500/40 select-none touch-none ${isAndroidDevice() ? 'bg-black/85' : 'bg-black/60 backdrop-blur-sm'}`}>
      <button
        type="button"
        onPointerDown={(e) => { e.preventDefault(); virtualInput.setUp(true); }}
        onPointerUp={(e) => { e.preventDefault(); virtualInput.setUp(false); }}
        onPointerLeave={() => { virtualInput.setUp(false); }}
        onPointerCancel={() => { virtualInput.setUp(false); }}
        className="w-11 h-11 rounded-full bg-slate-800 text-amber-300 font-bold border border-amber-500/60 active:bg-amber-500 active:text-black shadow flex items-center justify-center text-sm active:scale-95 touch-none"
      >
        ▲
      </button>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onPointerDown={(e) => { e.preventDefault(); virtualInput.setLeft(true); }}
          onPointerUp={(e) => { e.preventDefault(); virtualInput.setLeft(false); }}
          onPointerLeave={() => { virtualInput.setLeft(false); }}
          onPointerCancel={() => { virtualInput.setLeft(false); }}
          className="w-11 h-11 rounded-full bg-slate-800 text-amber-300 font-bold border border-amber-500/60 active:bg-amber-500 active:text-black shadow flex items-center justify-center text-sm active:scale-95 touch-none"
        >
          ◀
        </button>
        <button
          type="button"
          onPointerDown={(e) => { e.preventDefault(); virtualInput.setDown(true); }}
          onPointerUp={(e) => { e.preventDefault(); virtualInput.setDown(false); }}
          onPointerLeave={() => { virtualInput.setDown(false); }}
          onPointerCancel={() => { virtualInput.setDown(false); }}
          className="w-11 h-11 rounded-full bg-slate-800 text-amber-300 font-bold border border-amber-500/60 active:bg-amber-500 active:text-black shadow flex items-center justify-center text-sm active:scale-95 touch-none"
        >
          ▼
        </button>
        <button
          type="button"
          onPointerDown={(e) => { e.preventDefault(); virtualInput.setRight(true); }}
          onPointerUp={(e) => { e.preventDefault(); virtualInput.setRight(false); }}
          onPointerLeave={() => { virtualInput.setRight(false); }}
          onPointerCancel={() => { virtualInput.setRight(false); }}
          className="w-11 h-11 rounded-full bg-slate-800 text-amber-300 font-bold border border-amber-500/60 active:bg-amber-500 active:text-black shadow flex items-center justify-center text-sm active:scale-95 touch-none"
        >
          ▶
        </button>
      </div>
    </div>
  );
};

export default VirtualDpad;
