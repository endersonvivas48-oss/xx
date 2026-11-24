import {MusicTrack} from './utils/helper';

/** Game configuration schema. */
export const CONFIG = {
  // --- Game ---
  title: {
    value: 'Dungeon Dice Battle: El Legado',
    type: 'string',
    label: 'Game Title',
    group: 'Game',
  },
  baseCanvasWidth: {
    value: 1280,
    type: 'number',
    label: 'Base Canvas Width',
    group: 'Game',
  },
  baseCanvasHeight: {
    value: 720,
    type: 'number',
    label: 'Base Canvas Height',
    group: 'Game',
  },

  // --- Rules ---
  masterMaxHp: {
    value: 22,
    type: 'number',
    label: 'Master Max HP',
    group: 'Rules',
    min: 10,
    max: 50,
    step: 1,
  },
  startingGold: {
    value: 500,
    type: 'number',
    label: 'Starting Gold',
    group: 'Rules',
    min: 100,
    max: 2000,
    step: 50,
  },
  aiDifficulty: {
    value: 2, // 1: Easy, 2: Normal, 3: Hard
    type: 'number',
    label: 'AI Difficulty (1-3)',
    group: 'Rules',
    min: 1,
    max: 3,
    step: 1,
  },
  spellCostMana: {
    value: 3,
    type: 'number',
    label: 'Spell Mana Cost',
    group: 'Rules',
    min: 1,
    max: 10,
    step: 1,
  },

  // --- Camera ---
  fov: {
    value: 46,
    type: 'number',
    label: 'Field of View',
    group: 'Camera',
    min: 30,
    max: 90,
    step: 2,
  },
  cameraX: {
    value: 0,
    type: 'number',
    label: 'Camera X',
    group: 'Camera',
  },
  cameraY: {
    value: 15.5,
    type: 'number',
    label: 'Camera Y',
    group: 'Camera',
  },
  cameraZ: {
    value: 13.5,
    type: 'number',
    label: 'Camera Z',
    group: 'Camera',
  },

  // --- Visuals ---
  backgroundColor: {
    value: '#111827',
    type: 'color',
    label: 'Background Color',
    group: 'Visuals',
  },
  primaryColor: {
    value: '#38bdf8',
    type: 'color',
    label: 'Primary Color',
    group: 'Visuals',
  },
  fontFamily: {
    value: 'Cinzel, sans-serif',
    type: 'string',
    label: 'Font Family',
    group: 'Visuals',
  },
  ambientColor: {
    value: '#818cf8',
    type: 'color',
    label: 'Ambient Light Color',
    group: 'Visuals',
  },
  ambientIntensity: {
    value: 1.6,
    type: 'number',
    label: 'Ambient Intensity',
    group: 'Visuals',
    min: 1.5,
    max: 4,
    step: 0.1,
  },
  sunColor: {
    value: '#ffffff',
    type: 'color',
    label: 'Sun Color',
    group: 'Visuals',
  },
  sunIntensity: {
    value: 3.2,
    type: 'number',
    label: 'Sun Intensity',
    group: 'Visuals',
    min: 3.0,
    max: 8,
    step: 0.2,
  },
  hemiSkyColor: {
    value: '#93c5fd',
    type: 'color',
    label: 'Hemisphere Sky Color',
    group: 'Visuals',
  },
  hemiGroundColor: {
    value: '#374151',
    type: 'color',
    label: 'Hemisphere Ground Color',
    group: 'Visuals',
  },
  hemiIntensity: {
    value: 1.2,
    type: 'number',
    label: 'Hemisphere Intensity',
    group: 'Visuals',
    min: 0,
    max: 2,
    step: 0.1,
  },

  // --- Physics ---
  gravity: {
    value: -9.81,
    type: 'number',
    label: 'Gravity',
    group: 'Physics',
    min: -30,
    max: 0,
    step: 0.5,
  },

  // --- System ---
  targetFPS: {
    value: 60,
    type: 'number',
    label: 'Target FPS',
    group: 'System',
  },
  stepMs: {
    value: 1000 / 60,
    type: 'number',
    label: 'Step MS',
    group: 'System',
  },
  maxSubSteps: {
    value: 5,
    type: 'number',
    label: 'Max Sub Steps',
    group: 'System',
  },

  // --- Audio ---
  defaultMusicVolume: {
    value: 0.35,
    type: 'number',
    label: 'Default Music Volume',
    group: 'Audio',
    min: 0,
    max: 1,
    step: 0.05,
  },
  defaultSfxVolume: {
    value: 0.6,
    type: 'number',
    label: 'Default SFX Volume',
    group: 'Audio',
    min: 0,
    max: 1,
    step: 0.05,
  },
  backgroundMusicUrl: {
    value: 'https://storage.googleapis.com/assets-gen-playground/musiclibrary/titan_clash.mp3',
    type: 'string',
    label: 'Background Music URL',
    group: 'Audio',
  },
};

// Merge customized config values if present (injected by Playground)
const {playgroundConfig} = globalThis as {
  playgroundConfig?: Record<string, unknown>;
};
if (playgroundConfig) {
  for (const [key, value] of Object.entries(playgroundConfig)) {
    if (key in CONFIG) {
      Object.assign(CONFIG[key as keyof typeof CONFIG], {value});
    }
  }
}

/** Type helper for reading values in game code. */
export type ConfigKey = keyof typeof CONFIG;

/**
 * Gets a configuration value by key.
 * @param key The configuration key.
 * @return The configuration value.
 */
export function getConfig<K extends ConfigKey>(
  key: K,
): (typeof CONFIG)[K]['value'] {
  return CONFIG[key].value;
}

export const PRESETS = {};

/** Background music tracks available for the game to use. */
export const AVAILABLE_MUSIC_TRACKS: readonly MusicTrack[] = [
  {
    name: 'titan_clash',
    url: 'https://storage.googleapis.com/assets-gen-playground/musiclibrary/titan_clash.mp3',
    description: 'Epic, relentless orchestral battle music with war drums and brass.',
  },
  {
    name: 'heroes_journey',
    url: 'https://storage.googleapis.com/assets-gen-playground/musiclibrary/heroes_journey.mp3',
    description: 'Uplifting orchestral adventure with horns, flute and harp.',
  },
  {
    name: 'neon_runner',
    url: 'https://storage.googleapis.com/assets-gen-playground/musiclibrary/neon_runner.mp3',
    description: 'Driving high-energy electronic synthesizer track.',
  },
  {
    name: 'tavern_tales',
    url: 'https://storage.googleapis.com/assets-gen-playground/musiclibrary/tavern_tales.mp3',
    description: 'Lively medieval folk dance with lute and hurdy-gurdy.',
  },
];
