import { useEffect, useRef, type MutableRefObject, type RefObject } from 'react';

/** Actions that can be triggered by the user. */
export type InputAction =
  | 'left'
  | 'right'
  | 'up'
  | 'down'
  | 'confirm'
  | 'cancel'
  | 'tap';

/** Represents the state of the pointer (mouse/touch). */
export interface PointerState {
  nx: number;
  ny: number;
  clientX: number;
  clientY: number;
  down: boolean;
}

/** Snapshot of the input state at a given frame. */
export interface InputSnapshot {
  actions: Record<InputAction, boolean>;
  pointer: PointerState;
  /** Valores analógicos normalizados del joystick o stick gamepad (-1 a 1) */
  axisX: number;
  axisY: number;
  gamepadConnected: boolean;
}

const ACTION_KEYS: Record<string, InputAction> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
  a: 'left',
  d: 'right',
  w: 'up',
  s: 'down',
  A: 'left',
  D: 'right',
  W: 'up',
  S: 'down',
  Enter: 'confirm',
  ' ': 'confirm',
  Escape: 'cancel',
};

function createEmptyActions(): Record<InputAction, boolean> {
  return {
    left: false,
    right: false,
    up: false,
    down: false,
    confirm: false,
    cancel: false,
    tap: false,
  };
}

function getPointerNDC(
  event: PointerEvent,
  container: HTMLElement,
): { nx: number; ny: number; clientX: number; clientY: number } {
  const rect = container.getBoundingClientRect();
  const clientX = event.clientX - rect.left;
  const clientY = event.clientY - rect.top;
  const nx = (clientX / rect.width) * 2 - 1;
  const ny = -(clientY / rect.height) * 2 + 1;
  return { nx, ny, clientX, clientY };
}

/**
 * Hook de entradas con soporte completo para:
 * 1. Teclado estándar (WASD, Flechas, Enter, Espacio).
 * 2. Puntero táctil y ratón (NDC para raycasting 3D).
 * 3. Joysticks analógicos y Gamepads USB / Bluetooth (Standard Gamepad API de navegadores y Android).
 * 4. Joystick virtual en pantalla (expuesto en window.__virtualDpad).
 */
export function useInput(
  containerRef: RefObject<HTMLDivElement>,
  options: { enabled?: boolean } = {},
): MutableRefObject<InputSnapshot> {
  const { enabled = true } = options;
  const inputRef = useRef<InputSnapshot>({
    actions: createEmptyActions(),
    pointer: { nx: 0, ny: 0, clientX: 0, clientY: 0, down: false },
    axisX: 0,
    axisY: 0,
    gamepadConnected: false,
  });

  useEffect(() => {
    const keyboardActions: Record<InputAction, boolean> = createEmptyActions();
    const gamepadActions: Record<InputAction, boolean> = createEmptyActions();

    const syncCombinedActions = () => {
      inputRef.current.actions.left = keyboardActions.left || gamepadActions.left;
      inputRef.current.actions.right = keyboardActions.right || gamepadActions.right;
      inputRef.current.actions.up = keyboardActions.up || gamepadActions.up;
      inputRef.current.actions.down = keyboardActions.down || gamepadActions.down;
      inputRef.current.actions.confirm = keyboardActions.confirm || gamepadActions.confirm;
      inputRef.current.actions.cancel = keyboardActions.cancel || gamepadActions.cancel;

      (window as any).__virtualDpadLeft = inputRef.current.actions.left;
      (window as any).__virtualDpadRight = inputRef.current.actions.right;
      (window as any).__virtualDpadUp = inputRef.current.actions.up;
      (window as any).__virtualDpadDown = inputRef.current.actions.down;
    };

    const resetAllInputs = () => {
      (Object.keys(keyboardActions) as InputAction[]).forEach((k) => {
        keyboardActions[k] = false;
        gamepadActions[k] = false;
      });
      inputRef.current.actions = createEmptyActions();
      inputRef.current.pointer = { nx: 0, ny: 0, clientX: 0, clientY: 0, down: false };
      inputRef.current.axisX = 0;
      inputRef.current.axisY = 0;
      (window as any).__virtualDpadLeft = false;
      (window as any).__virtualDpadRight = false;
      (window as any).__virtualDpadUp = false;
      (window as any).__virtualDpadDown = false;
    };

    if (!enabled) {
      resetAllInputs();
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const action = ACTION_KEYS[event.key];
      if (!action) return;
      keyboardActions[action] = true;
      syncCombinedActions();
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const action = ACTION_KEYS[event.key];
      if (!action) return;
      keyboardActions[action] = false;
      syncCombinedActions();
    };

    const container = containerRef.current;
    const handlePointerDown = (event: PointerEvent) => {
      if (!container) return;
      const pos = getPointerNDC(event, container);
      inputRef.current.pointer = { ...pos, down: true };
      inputRef.current.actions.tap = true;
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!container) return;
      const pos = getPointerNDC(event, container);
      inputRef.current.pointer = { ...pos, down: inputRef.current.pointer.down };
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (!container) return;
      const pos = getPointerNDC(event, container);
      inputRef.current.pointer = { ...pos, down: false };
      inputRef.current.actions.tap = false;
    };

    const handleBlur = () => {
      resetAllInputs();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleBlur();
      }
    };

    // Soporte para Gamepad / Joystick físico mediante bucle periódico
    let animId: number;
    const pollGamepad = () => {
      if (typeof navigator !== 'undefined' && navigator.getGamepads) {
        const gamepads = navigator.getGamepads();
        const gp = gamepads[0] || gamepads[1] || gamepads[2] || gamepads[3];

        if (gp && gp.connected) {
          inputRef.current.gamepadConnected = true;

          // Ejes de la palanca izquierda (Stick izquierdo)
          const rawX = gp.axes[0] || 0;
          const rawY = gp.axes[1] || 0;

          // Zona muerta (deadzone) del 15% para evitar deriva
          const deadzone = 0.15;
          const stickX = Math.abs(rawX) > deadzone ? rawX : 0;
          const stickY = Math.abs(rawY) > deadzone ? rawY : 0;

          inputRef.current.axisX = stickX;
          inputRef.current.axisY = stickY;

          // Botones de dirección (D-Pad del mando)
          const dpadUp = Boolean(gp.buttons[12]?.pressed);
          const dpadDown = Boolean(gp.buttons[13]?.pressed);
          const dpadLeft = Boolean(gp.buttons[14]?.pressed);
          const dpadRight = Boolean(gp.buttons[15]?.pressed);

          // Botón A / X (Confirmar / Tirar / Interactuar)
          const btnA = Boolean(gp.buttons[0]?.pressed);
          // Botón B / Círculo (Cancelar / Menú)
          const btnB = Boolean(gp.buttons[1]?.pressed);

          // Recalcular en cada frame el estado del gamepad (true/false) sin quedar bloqueado al soltar
          gamepadActions.left = stickX < -0.3 || dpadLeft;
          gamepadActions.right = stickX > 0.3 || dpadRight;
          gamepadActions.up = stickY < -0.3 || dpadUp;
          gamepadActions.down = stickY > 0.3 || dpadDown;
          gamepadActions.confirm = btnA;
          gamepadActions.cancel = btnB;

          syncCombinedActions();
        } else {
          if (inputRef.current.gamepadConnected) {
            inputRef.current.gamepadConnected = false;
            inputRef.current.axisX = 0;
            inputRef.current.axisY = 0;
            gamepadActions.left = false;
            gamepadActions.right = false;
            gamepadActions.up = false;
            gamepadActions.down = false;
            gamepadActions.confirm = false;
            gamepadActions.cancel = false;
            syncCombinedActions();
          }
        }
      }
      animId = requestAnimationFrame(pollGamepad);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    if (container) {
      container.addEventListener('pointerdown', handlePointerDown);
      container.addEventListener('pointermove', handlePointerMove);
      container.addEventListener('pointerup', handlePointerUp);
      container.addEventListener('pointercancel', handlePointerUp);
    }

    animId = requestAnimationFrame(pollGamepad);

    return () => {
      cancelAnimationFrame(animId);
      resetAllInputs();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      if (container) {
        container.removeEventListener('pointerdown', handlePointerDown);
        container.removeEventListener('pointermove', handlePointerMove);
        container.removeEventListener('pointerup', handlePointerUp);
        container.removeEventListener('pointercancel', handlePointerUp);
      }
    };
  }, [containerRef, enabled]);

  return inputRef;
}
