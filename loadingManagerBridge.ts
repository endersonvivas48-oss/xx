import * as THREE from 'three';

type ProgressListener = (url: string, itemsLoaded: number, itemsTotal: number) => void;
type VoidListener = () => void;
type ErrorListener = (url: string) => void;

class LoadingManagerBridge {
  private progressListeners = new Set<ProgressListener>();
  private loadListeners = new Set<VoidListener>();
  private errorListeners = new Set<ErrorListener>();
  private isInitialized = false;

  private init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    THREE.DefaultLoadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
      this.progressListeners.forEach((fn) => {
        try { fn(url, itemsLoaded, itemsTotal); } catch (_) {}
      });
    };

    THREE.DefaultLoadingManager.onLoad = () => {
      this.loadListeners.forEach((fn) => {
        try { fn(); } catch (_) {}
      });
    };

    THREE.DefaultLoadingManager.onError = (url) => {
      this.errorListeners.forEach((fn) => {
        try { fn(url); } catch (_) {}
      });
    };
  }

  public subscribe(callbacks: {
    onProgress?: ProgressListener;
    onLoad?: VoidListener;
    onError?: ErrorListener;
  }): () => void {
    this.init();

    if (callbacks.onProgress) this.progressListeners.add(callbacks.onProgress);
    if (callbacks.onLoad) this.loadListeners.add(callbacks.onLoad);
    if (callbacks.onError) this.errorListeners.add(callbacks.onError);

    return () => {
      if (callbacks.onProgress) this.progressListeners.delete(callbacks.onProgress);
      if (callbacks.onLoad) this.loadListeners.delete(callbacks.onLoad);
      if (callbacks.onError) this.errorListeners.delete(callbacks.onError);
    };
  }
}

export const loadingManagerBridge = new LoadingManagerBridge();
