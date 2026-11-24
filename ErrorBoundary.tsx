import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onResetToSafeScreen?: () => void;
  resetLabel?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
    };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
        ? error
        : 'Error inesperado al renderizar la escena.';
    return {
      hasError: true,
      errorMessage: message,
    };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo): void {
    console.error('[ErrorBoundary] Capturado error de renderizado:', error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  handleSafeReturn = () => {
    this.setState({ hasError: false, errorMessage: '' });
    if (this.props.onResetToSafeScreen) {
      this.props.onResetToSafeScreen();
    } else if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      const title = this.props.fallbackTitle || 'SE PRODUJO UN ERROR EN LA ESCENA';
      const message =
        this.props.fallbackMessage ||
        'No se pudo inicializar el motor visual o cargar un recurso 3D en este dispositivo.';
      const resetLabel =
        this.props.resetLabel ||
        (this.props.onResetToSafeScreen ? 'Volver al Campamento' : 'Recargar Juego');

      return (
        <div className="w-full h-full min-h-[260px] flex items-center justify-center bg-slate-950 text-white p-6 select-none">
          <div className="max-w-md w-full rounded-3xl bg-black/90 border-2 border-amber-500/70 p-6 text-center shadow-[0_0_40px_rgba(245,158,11,0.35)]">
            <div className="text-3xl mb-2">⚠️</div>
            <h2 className="font-serif font-black text-base sm:text-lg tracking-wider text-amber-300 uppercase mb-2">
              {title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed mb-3">
              {message}
            </p>
            {this.state.errorMessage && (
              <p className="text-[11px] font-mono text-rose-300/90 bg-slate-900/90 border border-rose-500/30 rounded-xl p-2 mb-4 break-words">
                {this.state.errorMessage}
              </p>
            )}
            <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
              <button
                type="button"
                onClick={this.handleRetry}
                className="py-2.5 px-5 rounded-full bg-amber-500 hover:bg-amber-400 text-black font-serif font-black text-xs tracking-wider uppercase transition active:scale-95 cursor-pointer"
              >
                Reintentar Escena
              </button>
              <button
                type="button"
                onClick={this.handleSafeReturn}
                className="py-2.5 px-5 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-600 font-serif font-bold text-xs tracking-wider uppercase transition active:scale-95 cursor-pointer"
              >
                {resetLabel}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
