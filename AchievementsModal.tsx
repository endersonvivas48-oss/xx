import React, { useState, useEffect, useRef } from 'react';
import { AchievementProgression } from './types';
import { gameAudio, isAndroidDevice } from './utils';
import { getTrophyBadgeCandidateUrls, getTrophyBackgroundCandidateUrls } from './trophyImageMap';
import { CachedImage } from './CachedImage';

// Mapeo a las insignias y medallas oficiales correspondientes
const TIERED_TROPHY_IMAGE_MAP: Record<string, string> = {
  tiered_maestro_supervivencia: 'ach_coliseum_wave_10',
  tiered_alquimia_prohibida: 'ach_all_grimoire_spells',
  tiered_gran_cruzada: 'ach_all_campaigns',
  tiered_senor_de_las_runas: 'ach_forge_legendary_throne',
};

const LOCKED_TIER_STYLE = {
  bgGradient: 'radial-gradient(circle at center, rgba(71,85,105,0.25) 0%, rgba(15,23,42,0.18) 55%, transparent 80%)',
  glowShadow: 'none',
  trailBorder: 'border-slate-700/80',
  textColor: '#64748b',
};

// Estilos de estela y resplandor dinámicos en el fondo según el nivel de dificultad
const TIER_GLOW_STYLES: Record<
  number,
  {
    bgGradient: string;
    glowShadow: string;
    trailBorder: string;
    textColor: string;
  }
> = {
  0: LOCKED_TIER_STYLE,
  1: {
    // Bronce
    bgGradient: 'radial-gradient(circle at center, rgba(205,127,50,0.4) 0%, rgba(120,53,15,0.2) 55%, transparent 80%)',
    glowShadow: '0 0 20px rgba(205,127,50,0.55)',
    trailBorder: 'border-amber-700/80',
    textColor: '#cd7f32',
  },
  2: {
    // Plata
    bgGradient: 'radial-gradient(circle at center, rgba(226,232,240,0.45) 0%, rgba(148,163,184,0.22) 55%, transparent 80%)',
    glowShadow: '0 0 22px rgba(226,232,240,0.65)',
    trailBorder: 'border-slate-300/80',
    textColor: '#e2e8f0',
  },
  3: {
    // Oro
    bgGradient: 'radial-gradient(circle at center, rgba(251,191,36,0.5) 0%, rgba(217,119,6,0.25) 55%, transparent 80%)',
    glowShadow: '0 0 26px rgba(251,191,36,0.75)',
    trailBorder: 'border-yellow-400',
    textColor: '#fbbf24',
  },
  4: {
    // Leyenda
    bgGradient: 'radial-gradient(circle at center, rgba(192,132,252,0.55) 0%, rgba(147,51,234,0.3) 55%, transparent 80%)',
    glowShadow: '0 0 32px rgba(192,132,252,0.9)',
    trailBorder: 'border-purple-400',
    textColor: '#c084fc',
  },
};

// Componente para renderizar la imagen oficial del logro con estela y resplandor dinámico según nivel
function TieredBadgeImg({
  achievementId,
  levelNumber,
  isUnlocked,
  className = '',
}: {
  achievementId: string;
  levelNumber: number;
  isUnlocked: boolean;
  className?: string;
}) {
  const trophyKey = TIERED_TROPHY_IMAGE_MAP[achievementId] || achievementId;
  const candidateUrls = getTrophyBadgeCandidateUrls(trophyKey);
  const cacheKey = `tiered_icon_${trophyKey}`;
  const tierGlow =
    !isUnlocked || levelNumber <= 0
      ? LOCKED_TIER_STYLE
      : TIER_GLOW_STYLES[levelNumber] || LOCKED_TIER_STYLE;

  return (
    <div
      className={`relative w-full h-full rounded-2xl p-1 flex items-center justify-center shrink-0 overflow-hidden transition-all duration-300 border ${tierGlow.trailBorder} ${className}`}
      style={{
        boxShadow: isUnlocked ? tierGlow.glowShadow : 'none',
      }}
    >
      {/* Fondo con estela de energía que evoluciona cromáticamente por nivel */}
      <div
        className={`absolute inset-0 transition-opacity duration-500 pointer-events-none ${
          isUnlocked ? 'opacity-100 animate-pulse' : 'opacity-25'
        }`}
        style={{
          background: tierGlow.bgGradient,
        }}
      />

      {/* Halo de luz rotatorio de estela */}
      {isUnlocked && levelNumber >= 2 && (
        <div
          className="absolute -inset-1 opacity-45 blur-sm pointer-events-none"
          style={{
            background: `conic-gradient(from 0deg, transparent 0deg, ${tierGlow.textColor} 180deg, transparent 360deg)`,
          }}
        />
      )}

      {/* Imagen oficial del logro */}
      <div className="relative z-10 w-full h-full flex items-center justify-center">
        <CachedImage
          cacheKey={cacheKey}
          candidateUrls={candidateUrls}
          alt="Insignia Logro"
          className={`w-full h-full object-contain filter transition-all ${
            isUnlocked
              ? 'brightness-110 contrast-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]'
              : 'grayscale contrast-125 opacity-60'
          }`}
        />
      </div>
    </div>
  );
}

// Fondo de pantalla completa oficial de la Sala de Logros Avanzados
function FullscreenTieredTrophyBackground() {
  const cacheKey = 'bg_trophy_tiered';
  const candidateUrls = getTrophyBackgroundCandidateUrls();

  return (
    <CachedImage
      cacheKey={cacheKey}
      candidateUrls={candidateUrls}
      alt="Fondo Sala de Logros"
      className="fixed inset-0 w-screen h-screen object-cover object-center filter brightness-90 contrast-105 pointer-events-none select-none z-0"
    />
  );
}

// 4 LOGROS AVANZADOS 100% EXCLUSIVOS Y DIFERENCIADOS DE LOS LOGROS CLÁSICOS:
// 1. "Maestro de la Fosa" (Supervivencia pura y rachas en el Coliseo Infinito)
// 2. "Alquimia Prohibida" (Lanzamiento masivo y sinergias del Grimorio)
// 3. "La Gran Cruzada" (Campañas secundarias, victorias acumuladas y duelos de gladiadores)
// 4. "Señor de las Runas" (Forja de nivel superior, dados de 3 ranuras y maestría de taller)
export const INITIAL_TIERED_ACHIEVEMENTS: AchievementProgression[] = [
  {
    id: 'tiered_maestro_supervivencia',
    name: 'Maestro de la Fosa',
    description: 'Récords de resistencia y dominio táctico en las oleadas progresivas del Coliseo Infinito.',
    category: 'COLISEO',
    currentValue: 0,
    unlockedLevel: 0,
    claimedLevels: [],
    tiers: [
      {
        tier: 'BRONZE',
        levelNumber: 1,
        tierName: 'Bronce',
        conditionDesc: 'Alcanza la Oleada 5 en el Coliseo Infinito.',
        target: 5,
        rewardGold: 180,
        rewardMaterials: '2x Obsidiana de las Sombras',
        materialAwards: { obsidiana_sombras: 2 },
        badgeIcon: '🥉',
        badgeColor: '#cd7f32',
      },
      {
        tier: 'SILVER',
        levelNumber: 2,
        tierName: 'Plata',
        conditionDesc: 'Alcanza la Oleada 10 y derrota al Campeón de la Fosa.',
        target: 10,
        rewardGold: 400,
        rewardMaterials: '2x Polvo de Estrella Astral',
        materialAwards: { polvo_astral: 2 },
        badgeIcon: '🥈',
        badgeColor: '#e2e8f0',
      },
      {
        tier: 'GOLD',
        levelNumber: 3,
        tierName: 'Oro',
        conditionDesc: 'Alcanza la Oleada 15 en dificultad Heroica.',
        target: 15,
        rewardGold: 750,
        rewardMaterials: '2x Lingote Rúnico Primordial',
        materialAwards: { lingote_runico: 2 },
        badgeIcon: '🥇',
        badgeColor: '#fbbf24',
      },
      {
        tier: 'LEGEND',
        levelNumber: 4,
        tierName: 'Leyenda',
        conditionDesc: 'Sobrevive hasta la Oleada 20 en Modo Pesadilla.',
        target: 20,
        rewardGold: 1600,
        rewardMaterials: '1x Piedra Filosofal Astral (Catalizador 100% Éxito)',
        materialAwards: { piedra_filosofal_astral: 1 },
        badgeIcon: '👑',
        badgeColor: '#c084fc',
      },
    ],
  },
  {
    id: 'tiered_alquimia_prohibida',
    name: 'Alquimia Prohibida',
    description: 'Canalización avanzada de hechizos arcanos, manipulación de maná y control de campo.',
    category: 'GRIMORIO',
    currentValue: 0,
    unlockedLevel: 0,
    claimedLevels: [],
    tiers: [
      {
        tier: 'BRONZE',
        levelNumber: 1,
        tierName: 'Bronce',
        conditionDesc: 'Desbloquea 3 hechizos en tu Grimorio y equípalos en combate.',
        target: 3,
        rewardGold: 150,
        rewardMaterials: '2x Polvo de Estrella Astral',
        materialAwards: { polvo_astral: 2 },
        badgeIcon: '🥉',
        badgeColor: '#cd7f32',
      },
      {
        tier: 'SILVER',
        levelNumber: 2,
        tierName: 'Plata',
        conditionDesc: 'Desbloquea 6 hechizos y amplía tu Grimorio a 2 ranuras activas.',
        target: 6,
        rewardGold: 350,
        rewardMaterials: '2x Cristal Etéreo Pulsante',
        materialAwards: { cristal_eterio: 2 },
        badgeIcon: '🥈',
        badgeColor: '#e2e8f0',
      },
      {
        tier: 'GOLD',
        levelNumber: 3,
        tierName: 'Oro',
        conditionDesc: 'Desbloquea 8 hechizos incluyendo Transposición y Tormenta.',
        target: 8,
        rewardGold: 700,
        rewardMaterials: '2x Chispa del Vacío',
        materialAwards: { chispa_vacio: 2 },
        badgeIcon: '🥇',
        badgeColor: '#fbbf24',
      },
      {
        tier: 'LEGEND',
        levelNumber: 4,
        tierName: 'Leyenda',
        conditionDesc: 'Domina los 10 hechizos del Grimorio Supremo incluyendo Sentencia Sagrada.',
        target: 10,
        rewardGold: 1500,
        rewardMaterials: '1x Esencia del Titán Bélico (Catalizador +4 ATK)',
        materialAwards: { esencia_del_titan_belico: 1 },
        badgeIcon: '👑',
        badgeColor: '#c084fc',
      },
    ],
  },
  {
    id: 'tiered_gran_cruzada',
    name: 'La Gran Cruzada',
    description: 'Consagración militar absoluta derrotando rivales de todas las ligas del reino.',
    category: 'CAMPAÑA',
    currentValue: 0,
    unlockedLevel: 0,
    claimedLevels: [],
    tiers: [
      {
        tier: 'BRONZE',
        levelNumber: 1,
        tierName: 'Bronce',
        conditionDesc: 'Acumula 15 victorias en combate militar.',
        target: 15,
        rewardGold: 160,
        rewardMaterials: '2x Obsidiana de las Sombras',
        materialAwards: { obsidiana_sombras: 2 },
        badgeIcon: '🥉',
        badgeColor: '#cd7f32',
      },
      {
        tier: 'SILVER',
        levelNumber: 2,
        tierName: 'Plata',
        conditionDesc: 'Acumula 35 victorias y conquista al menos 2 campañas distintas.',
        target: 35,
        rewardGold: 400,
        rewardMaterials: '2x Lingote Rúnico Primordial',
        materialAwards: { lingote_runico: 2 },
        badgeIcon: '🥈',
        badgeColor: '#e2e8f0',
      },
      {
        tier: 'GOLD',
        levelNumber: 3,
        tierName: 'Oro',
        conditionDesc: 'Acumula 60 victorias y corona 3 campañas del reino.',
        target: 60,
        rewardGold: 850,
        rewardMaterials: '1x Núcleo de Adamantio Puro (Catalizador +5 HP)',
        materialAwards: { nucleo_adamantio_puro: 1 },
        badgeIcon: '🥇',
        badgeColor: '#fbbf24',
      },
      {
        tier: 'LEGEND',
        levelNumber: 4,
        tierName: 'Leyenda',
        conditionDesc: 'Alcanza 100 victorias totales y derrota al Emperador del Trono de las Sombras.',
        target: 100,
        rewardGold: 2200,
        rewardMaterials: '1x Sello de Ranura Ancestral (Catalizador +1 Ranura)',
        materialAwards: { orbe_de_ranura_ancestral: 1 },
        badgeIcon: '👑',
        badgeColor: '#c084fc',
      },
    ],
  },
  {
    id: 'tiered_senor_de_las_runas',
    name: 'Señor de las Runas',
    description: 'Perfeccionamiento supremo de la forja, gemas elementales y dados de 3 ranuras.',
    category: 'FORJA',
    currentValue: 0,
    unlockedLevel: 0,
    claimedLevels: [],
    tiers: [
      {
        tier: 'BRONZE',
        levelNumber: 1,
        tierName: 'Bronce',
        conditionDesc: 'Alcanza el Nivel 3 de Maestría en la Forja.',
        target: 3,
        rewardGold: 150,
        rewardMaterials: '2x Polvo de Estrella Astral',
        materialAwards: { polvo_astral: 2 },
        badgeIcon: '🥉',
        badgeColor: '#cd7f32',
      },
      {
        tier: 'SILVER',
        levelNumber: 2,
        tierName: 'Plata',
        conditionDesc: 'Alcanza el Nivel 6 de Maestría y crea 3 dados con al menos 2 orbes engarzados.',
        target: 6,
        rewardGold: 350,
        rewardMaterials: '2x Lágrima Ígnea del Fénix',
        materialAwards: { lagrima_fenix: 2 },
        badgeIcon: '🥈',
        badgeColor: '#e2e8f0',
      },
      {
        tier: 'GOLD',
        levelNumber: 3,
        tierName: 'Oro',
        conditionDesc: 'Alcanza el Nivel 9 de Maestría y forja un dado Legendario de 3 orbes.',
        target: 9,
        rewardGold: 750,
        rewardMaterials: '2x Chispa del Vacío',
        materialAwards: { chispa_vacio: 2 },
        badgeIcon: '🥇',
        badgeColor: '#fbbf24',
      },
      {
        tier: 'LEGEND',
        levelNumber: 4,
        tierName: 'Leyenda',
        conditionDesc: 'Alcanza el Nivel 12 Máximo de Maestría en la Forja con un mazo de 24 dados reforzados.',
        target: 12,
        rewardGold: 1800,
        rewardMaterials: '1x Piedra Filosofal Astral + 1x Sello de Ranura Ancestral',
        materialAwards: { piedra_filosofal_astral: 1, orbe_de_ranura_ancestral: 1 },
        badgeIcon: '👑',
        badgeColor: '#c084fc',
      },
    ],
  },
];

export function mergeTieredAchievementsWithDefaults(
  saved?: AchievementProgression[] | null
): AchievementProgression[] {
  if (!Array.isArray(saved) || saved.length === 0) {
    return INITIAL_TIERED_ACHIEVEMENTS;
  }
  return INITIAL_TIERED_ACHIEVEMENTS.map((template) => {
    const match = saved.find((s) => s.id === template.id);
    if (!match) return template;
    return {
      ...template,
      currentValue: typeof match.currentValue === 'number' ? match.currentValue : template.currentValue,
      unlockedLevel: typeof match.unlockedLevel === 'number' ? match.unlockedLevel : template.unlockedLevel,
      claimedLevels: Array.isArray(match.claimedLevels) ? match.claimedLevels : template.claimedLevels,
    };
  });
}

interface TieredAchievementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  achievements: AchievementProgression[];
  onClaimTierReward: (achievementId: string, levelNumber: number) => void;
  onOpenClassicModal?: () => void;
  fontSize?: number;
}

export function TieredAchievementsModal({
  isOpen,
  onClose,
  achievements,
  onClaimTierReward,
  onOpenClassicModal,
  fontSize = 12,
}: TieredAchievementsModalProps) {
  const isAndroid = isAndroidDevice();
  const blurMd = isAndroid ? '' : 'backdrop-blur-md';
  const [filter, setFilter] = useState<'TODOS' | 'COLISEO' | 'CAMPAÑA' | 'GRIMORIO' | 'FORJA'>('TODOS');
  const [inspectedAchId, setInspectedAchId] = useState<string | null>(null);
  const [claimingKeys, setClaimingKeys] = useState<string[]>([]);
  const claimingKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isOpen) {
      setInspectedAchId(null);
      claimingKeysRef.current.clear();
      setClaimingKeys([]);
    }
  }, [isOpen]);

  useEffect(() => {
    const claimedSet = new Set<string>();
    achievements.forEach((a) => {
      a.claimedLevels.forEach((lvl) => claimedSet.add(`${a.id}:${lvl}`));
    });
    claimingKeysRef.current.forEach((key) => {
      if (claimedSet.has(key)) {
        claimingKeysRef.current.delete(key);
      }
    });
    setClaimingKeys((prev) => {
      const next = prev.filter((k) => !claimedSet.has(k));
      return next.length === prev.length ? prev : next;
    });
  }, [achievements]);

  const handleCloseModal = () => {
    setInspectedAchId(null);
    onClose();
  };

  if (!isOpen) return null;

  const filtered = achievements.filter((a) => filter === 'TODOS' || a.category === filter);
  const inspectedTierAch = inspectedAchId
    ? achievements.find((a) => a.id === inspectedAchId) || null
    : null;

  return (
    <div
      className={`fixed inset-0 z-[130] bg-black/95 overflow-y-auto touch-pan-y flex items-center justify-center p-2 sm:p-4 md:p-6 ${blurMd} animate-fadeIn [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden`}
      onClick={handleCloseModal}
    >
      {/* Fondo completo oficial */}
      <FullscreenTieredTrophyBackground />

      {/* Velo con viñeta suave */}
      <div className="fixed inset-0 bg-gradient-to-t from-black via-black/60 to-black/30 pointer-events-none z-[1]" />

      {/* VISTA PRINCIPAL: Cuadrícula limpia con SOLO LAS IMÁGENES de los logros (como el Salón de Trofeos) */}
      {!inspectedTierAch && (
        <div
          className="w-full max-w-5xl max-h-[92dvh] bg-black/90 border-2 border-amber-500/80 rounded-3xl p-3 sm:p-5 md:p-6 shadow-[0_0_60px_rgba(245,158,11,0.4)] flex flex-col relative z-10 overflow-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* CABECERA (Sin icono de trofeo, limpia y separada) */}
          <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-amber-500/30 shrink-0">
            <div className="text-left">
              <h2 className="text-lg sm:text-xl md:text-2xl font-serif font-black text-amber-300 tracking-wider">
                SALA DE LOGROS AVANZADOS
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-300">
                Retos exclusivos de alto nivel. Selecciona cualquier insignia para ampliar su detalle y reclamar sus recompensas.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {onOpenClassicModal && (
                <button
                  type="button"
                  onClick={() => {
                    gameAudio.playCrispClick();
                    setInspectedAchId(null);
                    onOpenClassicModal();
                  }}
                  className="py-1 px-3 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-serif font-black text-xs tracking-wider border border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.5)] transition transform active:scale-95 cursor-pointer shrink-0"
                >
                  <span>CLÁSICOS</span>
                </button>
              )}
              <button
                onClick={() => {
                  gameAudio.playCrispClick();
                  handleCloseModal();
                }}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center font-bold text-sm sm:text-base transition border border-amber-500/50 shadow active:scale-95 shrink-0 cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>

          {/* BARRA DE FILTROS TOTALMENTE DESPEJADA */}
          <div className="w-full flex items-center gap-1.5 sm:gap-2 mb-3.5 p-1.5 bg-black/80 rounded-2xl border border-amber-500/40 shrink-0 overflow-x-auto touch-pan-x [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {(['TODOS', 'COLISEO', 'CAMPAÑA', 'GRIMORIO', 'FORJA'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  gameAudio.playCrispClick();
                  setFilter(cat);
                }}
                className={`flex-1 min-w-[78px] sm:min-w-[95px] py-1.5 px-2 rounded-xl text-[10px] sm:text-xs font-serif font-bold transition shrink-0 whitespace-nowrap border cursor-pointer ${
                  filter === cat
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 border-amber-300 font-black shadow-[0_0_12px_rgba(245,158,11,0.6)]'
                    : 'bg-slate-950/70 text-slate-400 border-slate-800 hover:border-amber-500/40 hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* CUADRÍCULA CON SOLO LAS IMÁGENES DE LOS LOGROS (AL DAR CLICK SE EXPANDE LA DESCRIPCIÓN) */}
          <div className="w-full flex-1 min-h-0 overflow-y-auto touch-pan-y pr-0.5 grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-3.5 mb-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {filtered.map((ach) => {
              const isUnlocked = ach.unlockedLevel > 0;
              const hasUnclaimed = ach.tiers.some(
                (t) => ach.unlockedLevel >= t.levelNumber && !ach.claimedLevels.includes(t.levelNumber)
              );

              return (
                <div
                  key={ach.id}
                  onClick={() => {
                    gameAudio.playCrispClick();
                    setInspectedAchId(ach.id);
                  }}
                  className={`p-3 sm:p-3.5 rounded-2xl border-2 transition transform active:scale-95 text-left flex items-center gap-3.5 cursor-pointer group relative overflow-hidden shadow-lg min-h-[96px] ${
                    hasUnclaimed
                      ? 'border-amber-400 bg-slate-950/95 ring-2 ring-amber-400/50 shadow-[0_0_20px_rgba(245,158,11,0.4)] animate-pulse'
                      : isUnlocked
                      ? 'border-amber-400/80 bg-slate-950/90 hover:border-amber-300 hover:shadow-[0_0_20px_rgba(245,158,11,0.35)]'
                      : 'border-slate-800 bg-black/80 opacity-70 hover:opacity-90 hover:border-slate-700'
                  }`}
                >
                  {/* SOLO LA IMAGEN CON SU ESTELA CORRESPONDIENTE AL NIVEL ALCANZADO */}
                  <div className="w-16 h-16 sm:w-18 sm:h-18 min-w-[64px] min-h-[64px] shrink-0">
                    <TieredBadgeImg
                      achievementId={ach.id}
                      levelNumber={ach.unlockedLevel}
                      isUnlocked={isUnlocked}
                    />
                  </div>

                  {/* IDENTIFICACIÓN BÁSICA DEL LOGRO */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <h4 className="font-serif font-black text-sm sm:text-base text-amber-200 group-hover:text-amber-100 truncate">
                        {ach.name}
                      </h4>
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-full font-mono font-bold shrink-0 border ${
                          isUnlocked
                            ? 'border-amber-500/40 bg-black/80 text-amber-400'
                            : 'border-slate-700 bg-black/80 text-slate-400'
                        }`}
                      >
                        {ach.unlockedLevel === 0
                          ? 'BLOQUEADO'
                          : ach.unlockedLevel === 1
                          ? 'BRONCE'
                          : ach.unlockedLevel === 2
                          ? 'PLATA'
                          : ach.unlockedLevel === 3
                          ? 'ORO'
                          : 'LEYENDA'}
                      </span>
                    </div>

                    <p style={{ fontSize: `${fontSize}px` }} className="text-slate-300 line-clamp-1 mb-1.5">
                      {ach.description}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800/80 pt-1">
                      <span className="text-amber-400 font-mono text-[9px] uppercase font-bold">{ach.category}</span>
                      <span className="text-cyan-300 group-hover:text-cyan-200 font-sans flex items-center gap-1">
                        🔍 Toca para expandir
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* BOTÓN INFERIOR DE SALIR */}
          <div className="w-full max-w-xs mx-auto shrink-0 pt-1">
            <button
              type="button"
              onClick={() => {
                gameAudio.playCrispClick();
                handleCloseModal();
              }}
              className="w-full py-2 px-5 rounded-full bg-slate-900 hover:bg-slate-800 text-amber-200 font-serif font-bold text-xs tracking-wider border border-amber-500/60 shadow transition transform active:scale-95 cursor-pointer"
            >
              ← VOLVER
            </button>
          </div>
        </div>
      )}

      {/* MODAL EXPANDIDO DE DESCRIPCIÓN Y NIVELES (Al hacer clic en cualquier logro) */}
      {inspectedTierAch && (
        <div
          className={`m-auto w-[94vw] max-w-2xl max-h-[92dvh] overflow-y-auto touch-pan-y bg-slate-950/95 border-2 border-amber-400 rounded-3xl p-4 sm:p-6 shadow-[0_0_60px_rgba(245,158,11,0.5)] ${blurMd} flex flex-col relative z-20 animate-fadeIn pointer-events-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Botón de cerrar detalle */}
          <button
            onClick={() => setInspectedAchId(null)}
            className="absolute top-3 right-3 text-slate-400 hover:text-white text-base font-bold w-8 h-8 rounded-full bg-black/70 border border-slate-700 flex items-center justify-center transition hover:border-amber-400 cursor-pointer shrink-0"
            aria-label="Volver a la lista"
          >
            ✕
          </button>

          {/* Detalle cabecera expandida */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 mb-4 pb-4 border-b border-amber-500/30">
            <div className="w-24 h-24 sm:w-28 sm:h-28 shrink-0">
              <TieredBadgeImg
                achievementId={inspectedTierAch.id}
                levelNumber={inspectedTierAch.unlockedLevel}
                isUnlocked={inspectedTierAch.unlockedLevel > 0}
              />
            </div>
            <div className="text-center sm:text-left flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                <h3 className="font-serif font-black text-lg sm:text-xl text-amber-300 drop-shadow">
                  {inspectedTierAch.name}
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 border border-amber-500/40 text-amber-400 uppercase font-mono">
                  {inspectedTierAch.category}
                </span>
              </div>
              <p style={{ fontSize: `${Math.max(fontSize, 12)}px` }} className="text-slate-200 leading-relaxed mb-2">
                {inspectedTierAch.description}
              </p>
              <div className="text-xs text-amber-400 font-mono">
                Rango Actual:{' '}
                <span className="font-bold">
                  {inspectedTierAch.unlockedLevel === 0
                    ? '🔒 Sin desbloquear'
                    : inspectedTierAch.unlockedLevel === 1
                    ? '🥉 Nivel Bronce'
                    : inspectedTierAch.unlockedLevel === 2
                    ? '🥈 Nivel Plata'
                    : inspectedTierAch.unlockedLevel === 3
                    ? '🥇 Nivel Oro'
                    : '👑 Nivel Leyenda'}
                </span>
              </div>
            </div>
          </div>

          {/* 4 NIVELES DE PROGRESIÓN CON SUS ESTELAS Y RECOMPENSAS DINÁMICAS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            {inspectedTierAch.tiers.map((tier) => {
              const isUnlocked = inspectedTierAch.unlockedLevel >= tier.levelNumber;
              const isClaimed = inspectedTierAch.claimedLevels.includes(tier.levelNumber);
              const canClaim = isUnlocked && !isClaimed;
              const tierGlow = TIER_GLOW_STYLES[tier.levelNumber] || LOCKED_TIER_STYLE;

              return (
                <div
                  key={tier.levelNumber}
                  className={`rounded-2xl p-3 border flex flex-col justify-between transition relative overflow-hidden ${
                    isClaimed
                      ? 'bg-emerald-950/20 border-emerald-500/40 text-slate-400'
                      : canClaim
                      ? 'bg-amber-950/40 border-amber-400 shadow-[0_0_18px_rgba(245,158,11,0.4)] ring-1 ring-amber-300 animate-pulse'
                      : isUnlocked
                      ? 'bg-slate-900/80 border-slate-700 text-slate-200'
                      : 'bg-black/50 border-slate-800/80 opacity-60 text-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-11 h-11 shrink-0">
                      <TieredBadgeImg
                        achievementId={inspectedTierAch.id}
                        levelNumber={tier.levelNumber}
                        isUnlocked={isUnlocked}
                      />
                    </div>
                    <div>
                      <span
                        className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full font-serif"
                        style={{ color: tierGlow.textColor, backgroundColor: `${tierGlow.textColor}22` }}
                      >
                        Nivel {tier.levelNumber}: {tier.tierName}
                      </span>
                      <p style={{ fontSize: `${Math.max(11, fontSize - 1)}px` }} className="leading-snug text-slate-200 font-medium mt-1">
                        {tier.conditionDesc}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 text-[10px] space-y-1">
                    {/* Indicador numérico y barra de progreso hacia el objetivo del tier */}
                    <div className="space-y-1 my-1">
                      <div className="flex items-center justify-between font-mono text-[9.5px]">
                        <span className="text-slate-400">Progreso:</span>
                        <span className={isUnlocked ? 'text-emerald-400 font-bold' : 'text-amber-300 font-bold'}>
                          {Math.min(tier.target, inspectedTierAch.currentValue || 0)} / {tier.target}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-black rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-300"
                          style={{
                            width: `${Math.min(100, Math.max(0, ((inspectedTierAch.currentValue || 0) / tier.target) * 100))}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-amber-400 font-bold">
                      <span>Oro acumulable:</span>
                      <span>+{tier.rewardGold} 🪙</span>
                    </div>
                    <div className="text-purple-300 font-mono text-[9px] truncate">
                      💎 {tier.rewardMaterials}
                    </div>

                    <div className="pt-2">
                      {isClaimed ? (
                        <div className="w-full py-1 text-center font-serif text-[10px] font-bold text-emerald-400 bg-emerald-950/40 rounded-lg border border-emerald-600/40">
                          ✓ RECOMPENSA COBRADA
                        </div>
                      ) : canClaim ? (
                        <button
                          type="button"
                          disabled={claimingKeys.includes(`${inspectedTierAch.id}:${tier.levelNumber}`)}
                          onClick={() => {
                            const claimKey = `${inspectedTierAch.id}:${tier.levelNumber}`;
                            if (
                              claimingKeysRef.current.has(claimKey) ||
                              inspectedTierAch.unlockedLevel < tier.levelNumber ||
                              inspectedTierAch.claimedLevels.includes(tier.levelNumber)
                            ) {
                              return;
                            }
                            claimingKeysRef.current.add(claimKey);
                            setClaimingKeys((prev) => (prev.includes(claimKey) ? prev : [...prev, claimKey]));
                            gameAudio.playPowerupChime();
                            onClaimTierReward(inspectedTierAch.id, tier.levelNumber);
                          }}
                          className={`w-full py-1.5 text-center font-serif text-[11px] font-black rounded-lg shadow-md transition ${
                            claimingKeys.includes(`${inspectedTierAch.id}:${tier.levelNumber}`)
                              ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                              : 'text-slate-950 bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 transform active:scale-95 cursor-pointer'
                          }`}
                        >
                          {claimingKeys.includes(`${inspectedTierAch.id}:${tier.levelNumber}`)
                            ? 'RECLAMANDO...'
                            : `¡RECLAMAR NIVEL ${tier.tierName.toUpperCase()}!`}
                        </button>
                      ) : (
                        <div className="w-full py-1 text-center font-serif text-[10px] text-slate-500 bg-black/40 rounded-lg border border-slate-800">
                          {isUnlocked ? 'Desbloqueado' : 'Bloqueado'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Botón inferior de retorno */}
          <button
            onClick={() => setInspectedAchId(null)}
            className="w-full py-2.5 px-4 rounded-full bg-slate-900 hover:bg-slate-800 text-amber-200 font-serif font-bold text-xs sm:text-sm tracking-wider border border-amber-500/50 shadow transition transform active:scale-95 cursor-pointer shrink-0"
          >
            ← VOLVER A LA LISTA
          </button>
        </div>
      )}
    </div>
  );
}
