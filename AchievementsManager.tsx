import React from 'react';
import { TrophyModal, Achievement } from './TrophyModal';
import { TieredAchievementsModal } from './AchievementsModal';
import { AchievementProgression } from './types';

export interface AchievementsManagerProps {
  isTrophyModalOpen: boolean;
  setIsTrophyModalOpen: (open: boolean) => void;
  isTieredModalOpen: boolean;
  setIsTieredModalOpen: (open: boolean) => void;
  onCloseTrophyModal?: () => void;
  onCloseTieredModal?: () => void;
  achievements: Achievement[];
  onClaimTrophyReward: (achId: string) => void;
  trophyCategory: 'ALL' | 'CONTRACTS' | 'COMBAT' | 'CAMPAIGN' | 'FORGE' | 'SPELLS' | 'COLISEUM';
  setTrophyCategory: (cat: 'ALL' | 'CONTRACTS' | 'COMBAT' | 'CAMPAIGN' | 'FORGE' | 'SPELLS' | 'COLISEUM') => void;
  isCampaign4Unlocked: boolean;
  descFontSize?: number;
  tieredAchievements: AchievementProgression[];
  onClaimTierReward: (achId: string, levelNumber: number) => void;
}

export const AchievementsManager: React.FC<AchievementsManagerProps> = ({
  isTrophyModalOpen,
  setIsTrophyModalOpen,
  isTieredModalOpen,
  setIsTieredModalOpen,
  onCloseTrophyModal,
  onCloseTieredModal,
  achievements,
  onClaimTrophyReward,
  trophyCategory,
  setTrophyCategory,
  isCampaign4Unlocked,
  descFontSize = 12,
  tieredAchievements,
  onClaimTierReward,
}) => {
  return (
    <>
      {/* SALÓN DE TROFEOS Y LOGROS CLÁSICO */}
      <TrophyModal
        isOpen={isTrophyModalOpen}
        onClose={() => {
          if (onCloseTrophyModal) onCloseTrophyModal();
          else setIsTrophyModalOpen(false);
        }}
        achievements={achievements}
        onClaimReward={onClaimTrophyReward}
        onOpenTieredModal={() => {
          setIsTrophyModalOpen(false);
          setIsTieredModalOpen(true);
        }}
        activeCategory={trophyCategory}
        setActiveCategory={setTrophyCategory}
        isCampaign4Unlocked={isCampaign4Unlocked}
        fontSize={descFontSize}
      />

      {/* SALA DE LOGROS ESCALONADOS CON 4 NIVELES DE PROGRESIÓN (BRONCE, PLATA, ORO Y LEYENDA) */}
      <TieredAchievementsModal
        isOpen={isTieredModalOpen}
        onClose={() => {
          if (onCloseTieredModal) onCloseTieredModal();
          else setIsTieredModalOpen(false);
        }}
        achievements={tieredAchievements}
        onClaimTierReward={onClaimTierReward}
        onOpenClassicModal={() => {
          setIsTieredModalOpen(false);
          setIsTrophyModalOpen(true);
        }}
        fontSize={descFontSize}
      />
    </>
  );
};

export default AchievementsManager;
