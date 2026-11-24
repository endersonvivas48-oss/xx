import { useState, useRef, useCallback } from 'react';
import { triggerHapticVibrate } from './utils';

export interface BattleToast {
  text: string;
  color: string;
}

export interface CombatLogEntry {
  id: string;
  text: string;
  color: string;
  time: string;
}

export function useTacticalBattleState() {
  const [battleMessage, setBattleMessage] = useState<BattleToast | null>(null);
  const [combatLog, setCombatLog] = useState<CombatLogEntry[]>([]);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [hapticEnabled, setHapticEnabled] = useState(true);

  // Banderas formales de Bloqueo de Entrada (Input Lock) y Animación Activa
  const [isActionLocked, setIsActionLocked] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const actionLockRef = useRef(false);

  const setActionLock = useCallback((locked: boolean) => {
    actionLockRef.current = locked;
    setIsActionLocked(locked);
  }, []);

  const triggerHapticFeedback = useCallback((duration: number | number[] = 20) => {
    if (!hapticEnabled) return;
    triggerHapticVibrate(duration);
  }, [hapticEnabled]);

  const triggerBattleMessage = useCallback((text: string, color = '#f59e0b') => {
    setBattleMessage({ text, color });
    const now = new Date();
    const timeStr = `${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    setCombatLog((prev) => [
      { id: Math.random().toString(), text, color, time: timeStr },
      ...prev.slice(0, 19),
    ]);
    setTimeout(() => {
      setBattleMessage(null);
    }, 2200);
  }, []);

  return {
    battleMessage,
    setBattleMessage,
    combatLog,
    setCombatLog,
    isLogOpen,
    setIsLogOpen,
    hapticEnabled,
    setHapticEnabled,
    triggerHapticFeedback,
    triggerBattleMessage,
    // Exposición de banderas de bloqueo de entrada
    isActionLocked,
    setIsActionLocked: setActionLock,
    actionLockRef,
    isAnimating,
    setIsAnimating,
  };
}
