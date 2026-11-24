/**
 * Control unificado del D-Pad / Joystick virtual táctil
 * Reemplaza propiedades globales en `window` con un canal reactivo/síncrono seguro
 */

export interface VirtualDpadState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

const virtualDpadState: VirtualDpadState = {
  up: false,
  down: false,
  left: false,
  right: false,
};

export const virtualInput = {
  getState(): Readonly<VirtualDpadState> {
    return virtualDpadState;
  },
  setUp(active: boolean) {
    virtualDpadState.up = active;
  },
  setDown(active: boolean) {
    virtualDpadState.down = active;
  },
  setLeft(active: boolean) {
    virtualDpadState.left = active;
  },
  setRight(active: boolean) {
    virtualDpadState.right = active;
  },
  reset() {
    virtualDpadState.up = false;
    virtualDpadState.down = false;
    virtualDpadState.left = false;
    virtualDpadState.right = false;
  },
};
