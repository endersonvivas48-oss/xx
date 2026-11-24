import React from 'react';
import { isAndroidDevice } from './utils';

export interface SecondaryModalsProps {
  // Alerta de campaña bloqueada
  lockedCampaignAlertModal: {
    campaignTitle: string;
    description: string;
    requirement: string;
    accentColor: string;
  } | null;
  onCloseLockedCampaignAlert: () => void;

  // Modal de aviso cuando el mazo no tiene exactamente 24 dados
  deckIncompleteModal: {
    count: number;
    needed: number;
    destinationName: string;
  } | null;
  onCloseDeckIncomplete: () => void;

  // Modal cuando el mazo ya tiene los 24 dados equipados (límite máximo)
  deckFullModal: boolean;
  onCloseDeckFull: () => void;

  // Modal de notificación por código secreto activado
  secretCodeActivatedModal: boolean;
  onCloseSecretCodeModal: () => void;

  // Modal de desbloqueo secreto de Campaña 3 tras 20 derrotas
  showSecretUnlockModal: boolean;
  onCloseSecretUnlockModal: () => void;
}

export const SecondaryModals: React.FC<SecondaryModalsProps> = ({
  lockedCampaignAlertModal,
  onCloseLockedCampaignAlert,
  deckIncompleteModal,
  onCloseDeckIncomplete,
  deckFullModal,
  onCloseDeckFull,
  secretCodeActivatedModal,
  onCloseSecretCodeModal,
  showSecretUnlockModal,
  onCloseSecretUnlockModal,
}) => {
  return (
    <>
      {/* 1. MODAL DE ALERTA DE CAMPAÑA BLOQUEADA */}
      {lockedCampaignAlertModal && (
        <div
          className={`fixed inset-0 bg-black/85 z-[180] flex items-center justify-center p-4 ${isAndroidDevice() ? '' : 'backdrop-blur-md'} animate-fadeIn`}
          onClick={onCloseLockedCampaignAlert}
        >
          <div
            className="max-w-md w-full bg-slate-900 border-2 rounded-3xl p-6 sm:p-7 shadow-2xl text-center flex flex-col items-center pointer-events-auto"
            style={{
              borderColor: lockedCampaignAlertModal.accentColor,
              boxShadow: `0 0 45px ${lockedCampaignAlertModal.accentColor}50`,
            }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div
              className="w-14 h-14 rounded-full border-2 flex items-center justify-center text-3xl mb-3 shadow"
              style={{
                borderColor: lockedCampaignAlertModal.accentColor,
                backgroundColor: `${lockedCampaignAlertModal.accentColor}20`,
              }}
            >
              🔒
            </div>

            <span
              className="text-[10px] font-mono font-bold tracking-widest uppercase mb-1"
              style={{ color: lockedCampaignAlertModal.accentColor }}
            >
              ACCESO RESTRINGIDO
            </span>

            <h3 className="text-lg sm:text-xl font-black font-serif text-white mb-2 tracking-wide">
              {lockedCampaignAlertModal.campaignTitle}
            </h3>

            <p className="text-xs text-slate-300 font-sans leading-relaxed mb-4">
              {lockedCampaignAlertModal.description}
            </p>

            <div className="w-full p-3 rounded-2xl bg-black/70 border border-slate-700 mb-5 text-left">
              <span className="text-[10px] text-amber-300 font-mono font-bold uppercase block mb-1">
                ⚖️ REQUISITO DE DESBLOQUEO:
              </span>
              <p className="text-xs text-slate-200 font-sans">
                {lockedCampaignAlertModal.requirement}
              </p>
            </div>

            <button
              type="button"
              onClick={onCloseLockedCampaignAlert}
              className="w-full py-2.5 px-6 rounded-full font-serif font-black text-xs tracking-wider transition transform active:scale-95 cursor-pointer uppercase shadow-lg border-0"
              style={{
                backgroundColor: lockedCampaignAlertModal.accentColor,
                color: '#000000',
              }}
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* 2. MODAL DE AVISO DE MAZO INCOMPLETO (< 24 dados) */}
      {deckIncompleteModal && (
        <div
          className={`fixed inset-0 bg-black/85 z-[180] flex items-center justify-center p-4 ${isAndroidDevice() ? '' : 'backdrop-blur-md'} animate-fadeIn`}
          onClick={onCloseDeckIncomplete}
        >
          <div
            className="max-w-sm w-full bg-slate-900 border-2 border-amber-500 rounded-3xl p-6 shadow-[0_0_50px_rgba(245,158,11,0.5)] text-center flex flex-col items-center pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-2xl mb-2.5 shadow">
              ⚠️
            </div>
            <h3 className="text-base sm:text-lg font-black font-serif text-amber-300 mb-1 tracking-wider uppercase">
              {deckIncompleteModal.count > 24 ? 'EXCESO EN EL MAZO' : 'MAZO INCOMPLETO'}
            </h3>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed font-sans">
              Para {deckIncompleteModal.destinationName} debes llevar exactamente <strong>24 dados equipados</strong>.
              Actualmente tienes <strong>{deckIncompleteModal.count} dados</strong> (
              {deckIncompleteModal.count > 24
                ? `debes desequipar ${deckIncompleteModal.count - 24}`
                : `te faltan ${deckIncompleteModal.needed} por equipar`}
              ).
            </p>
            <button
              type="button"
              onClick={onCloseDeckIncomplete}
              className="w-full py-2.5 px-6 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-serif font-black text-xs transition transform active:scale-95 cursor-pointer uppercase shadow"
            >
              Configurar Mazo
            </button>
          </div>
        </div>
      )}

      {/* 3. MODAL DE AVISO DE MAZO LLENO (24 dados máximos alcanzados) */}
      {deckFullModal && (
        <div
          className={`fixed inset-0 bg-black/85 z-[180] flex items-center justify-center p-4 ${isAndroidDevice() ? '' : 'backdrop-blur-md'} animate-fadeIn`}
          onClick={onCloseDeckFull}
        >
          <div
            className="max-w-sm w-full bg-slate-900 border-2 border-amber-500 rounded-3xl p-6 shadow-[0_0_50px_rgba(245,158,11,0.5)] text-center flex flex-col items-center pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-2xl mb-2.5 shadow">
              🛡️
            </div>
            <h3 className="text-base sm:text-lg font-black font-serif text-amber-300 mb-1 tracking-wider uppercase">
              LÍMITE DE MAZO ALCANZADO (24/24)
            </h3>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed font-sans">
              Tu mazo activo ya cuenta con los <strong>24 dados reglamentarios</strong>. Si deseas equipar un nuevo dado, desequipa primero uno de tu mazo activo hacia la reserva.
            </p>
            <button
              type="button"
              onClick={onCloseDeckFull}
              className="w-full py-2.5 px-6 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-serif font-black text-xs transition transform active:scale-95 cursor-pointer uppercase shadow"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* 4. MODAL DE CÓDIGO SECRETO ACTIVADO */}
      {secretCodeActivatedModal && (
        <div
          className={`fixed inset-0 bg-black/85 z-[180] flex items-center justify-center p-4 ${isAndroidDevice() ? '' : 'backdrop-blur-md'} animate-fadeIn`}
          onClick={onCloseSecretCodeModal}
        >
          <div
            className="max-w-sm w-full bg-slate-900 border-2 border-amber-400 rounded-3xl p-6 shadow-[0_0_50px_rgba(245,158,11,0.7)] text-center flex flex-col items-center pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-black font-serif text-amber-300 mb-2 tracking-wider uppercase">
              ¡CÓDIGO SECRETO ACTIVADO!
            </h3>
            <p className="text-xs text-slate-200 mb-4 leading-relaxed font-sans">
              ¡Bienvenido, Maestro Shin! Todas las <strong>4 Campañas del Reino</strong> han sido desbloqueadas de inmediato para tu aventura.
            </p>
            <button
              type="button"
              onClick={onCloseSecretCodeModal}
              className="w-full py-2.5 px-6 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-serif font-black text-xs transition transform active:scale-95 cursor-pointer uppercase shadow"
            >
              Comenzar Aventura
            </button>
          </div>
        </div>
      )}

      {/* 5. MODAL DE DESBLOQUEO SECRETO DE CAMPAÑA 3 */}
      {showSecretUnlockModal && (
        <div
          className={`fixed inset-0 bg-black/85 z-[180] flex items-center justify-center p-4 ${isAndroidDevice() ? '' : 'backdrop-blur-md'} animate-fadeIn`}
          onClick={onCloseSecretUnlockModal}
        >
          <div
            className="max-w-sm w-full bg-slate-900 border-2 border-emerald-400 rounded-3xl p-6 shadow-[0_0_50px_rgba(52,211,153,0.7)] text-center flex flex-col items-center pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-3xl mb-2.5 shadow animate-pulse">
              🛡️
            </div>
            <h3 className="text-lg font-black font-serif text-emerald-300 mb-1 tracking-wider uppercase">
              ¡NUEVA CAMPAÑA DESBLOQUEADA!
            </h3>
            <p className="text-xs text-slate-200 mb-4 leading-relaxed font-sans">
              El Gran Maestro ha sido testigo de tu perseverancia indomable. Has desbloqueado <strong>Campaña 3: El Torneíllo del Recluta</strong> con combates didácticos y dados raros.
            </p>
            <button
              type="button"
              onClick={onCloseSecretUnlockModal}
              className="w-full py-2.5 px-6 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-serif font-black text-xs transition transform active:scale-95 cursor-pointer uppercase shadow"
            >
              Reclamar Desafío
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default SecondaryModals;
