/**
 * Gestor Unificado de Assets Locales y Remotos (Asset Manager)
 * Prioriza la carga de la carpeta local `./assets/` antes de consultar cualquier CDN o repositorio externo.
 */

export interface AssetCandidates {
  local: string[];
  remote: string[];
}

/**
 * Resuelve una lista ordenada en cascada:
 * 1. Primero las rutas locales en ./assets/
 * 2. Luego los repositorios remotos de respaldo
 */
export function buildCascadingAssetUrls(
  subfolder: 'backgrounds' | 'avatars' | 'halos' | 'dice' | 'orbs' | 'materials',
  filename: string,
  remoteUrls: string[] = []
): string[] {
  const cleanName = filename.trim().toLowerCase();
  const nameWithoutExt = cleanName.replace(/\.[^/.]+$/, '');
  const extensions = ['.png', '.jpg', '.jpeg', '.webp'];

  const localCandidates: string[] = [];

  // Agregar la variante directa
  localCandidates.push(`./assets/${subfolder}/${filename}`);
  localCandidates.push(`./assets/${filename}`);

  // Si no tiene extensión o para soportar png/jpg indistintamente:
  extensions.forEach((ext) => {
    localCandidates.push(`./assets/${subfolder}/${nameWithoutExt}${ext}`);
    localCandidates.push(`./assets/${nameWithoutExt}${ext}`);
  });

  // Eliminar duplicados
  const uniqueLocal = Array.from(new Set(localCandidates));

  return [...uniqueLocal, ...remoteUrls];
}
