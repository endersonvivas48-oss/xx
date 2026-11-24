// Ilustraciones de alta fidelidad para los Orbes del Códice y Tienda.
// En lugar de iconos o círculos con emojis, cada orbe cuenta con una ilustración digital
// vectorial completa con iluminación esférica, texturas de plasma, cristales, runas e hiper-detalles.

export interface OrbIllustrationProfile {
  name: string;
  element: string;
  palette: {
    core: string;
    glow: string;
    mid1: string;
    mid2: string;
    dark: string;
    sparkle: string;
  };
  svgDataUri: string;
}

// Generador de ilustraciones arcanas completas (estilo carta coleccionable de criatura)
export function generateOrbIllustrationSvg(element: string = 'Cosmos'): string {
  const norm = (element || '').trim().toLowerCase();

  let cCore = '#ffffff';
  let cGlow = '#f472b6';
  let c1 = '#ec4899';
  let c2 = '#be185d';
  let cDark = '#3b0764';
  let cSpark = '#fbcfe8';
  let detailPattern = '';

  switch (norm) {
    case 'fuego':
      cCore = '#fffbeb';
      cGlow = '#fb923c';
      c1 = '#ef4444';
      c2 = '#b91c1c';
      cDark = '#450a0a';
      cSpark = '#fde047';
      detailPattern = `
        <!-- Llamas solares envolventes -->
        <path d="M 100 30 Q 130 65 115 105 Q 150 75 140 125 Q 115 165 75 155 Q 50 140 60 100 Q 75 120 85 90 Q 70 70 100 30 Z" fill="${c1}" opacity="0.45" filter="blur(2px)"/>
        <path d="M 90 45 Q 120 75 105 110 Q 130 90 120 130 Q 100 155 75 145 Q 60 125 70 100 Q 80 110 85 85 Z" fill="${cSpark}" opacity="0.6"/>
        <circle cx="95" cy="85" r="18" fill="${cCore}" opacity="0.75" filter="blur(3px)"/>
      `;
      break;

    case 'hielo':
      cCore = '#ffffff';
      cGlow = '#38bdf8';
      c1 = '#0284c7';
      c2 = '#0369a1';
      cDark = '#082f49';
      cSpark = '#e0f2fe';
      detailPattern = `
        <!-- Cristales y fractales de hielo -->
        <polygon points="100,35 115,75 155,85 120,110 128,150 95,125 65,145 78,110 45,85 85,75" fill="${cSpark}" opacity="0.45"/>
        <line x1="100" y1="35" x2="100" y2="165" stroke="${cCore}" stroke-width="2" opacity="0.8"/>
        <line x1="35" y1="100" x2="165" y2="100" stroke="${cCore}" stroke-width="2" opacity="0.8"/>
        <line x1="55" y1="55" x2="145" y2="145" stroke="${cCore}" stroke-width="1.5" opacity="0.6"/>
        <line x1="55" y1="145" x2="145" y2="55" stroke="${cCore}" stroke-width="1.5" opacity="0.6"/>
        <circle cx="100" cy="100" r="15" fill="${cSpark}" opacity="0.5"/>
      `;
      break;

    case 'rayo':
      cCore = '#ffffff';
      cGlow = '#facc15';
      c1 = '#eab308';
      c2 = '#a16207';
      cDark = '#422006';
      cSpark = '#fef08a';
      detailPattern = `
        <!-- Rayos de plasma y arcos voltaicos -->
        <path d="M 105 25 L 75 80 L 110 80 L 85 145 L 135 75 L 105 75 L 125 25 Z" fill="${cCore}" opacity="0.9" filter="drop-shadow(0 0 8px ${cGlow})"/>
        <path d="M 65 70 L 85 95 L 70 125" stroke="${cSpark}" stroke-width="2.5" fill="none" opacity="0.8"/>
        <path d="M 135 65 L 115 100 L 130 130" stroke="${cSpark}" stroke-width="2.5" fill="none" opacity="0.8"/>
      `;
      break;

    case 'oscuro':
    case 'vampirico':
      cCore = '#fda4af';
      cGlow = '#e11d48';
      c1 = '#9333ea';
      c2 = '#581c87';
      cDark = '#1e0533';
      cSpark = '#fb7185';
      detailPattern = `
        <!-- Vórtice abisal y orbe de sangre -->
        <circle cx="100" cy="100" r="38" fill="none" stroke="${cGlow}" stroke-width="4" stroke-dasharray="16 8" opacity="0.85"/>
        <path d="M 100 45 C 130 45 145 75 100 135 C 55 75 70 45 100 45 Z" fill="${cGlow}" opacity="0.75" filter="drop-shadow(0 0 10px #e11d48)"/>
        <circle cx="100" cy="80" r="12" fill="${cCore}" opacity="0.85"/>
        <circle cx="100" cy="100" r="48" fill="none" stroke="${c1}" stroke-width="2" stroke-dasharray="6 12" opacity="0.5"/>
      `;
      break;

    case 'sombra':
      cCore = '#e0e7ff';
      cGlow = '#8b5cf6';
      c1 = '#6d28d9';
      c2 = '#4c1d95';
      cDark = '#090514';
      cSpark = '#c4b5fd';
      detailPattern = `
        <!-- Corona sombría y singularidad oscura -->
        <circle cx="100" cy="100" r="32" fill="#000000" stroke="${cGlow}" stroke-width="3" filter="drop-shadow(0 0 12px ${cGlow})"/>
        <path d="M 70 60 A 35 35 0 1 0 130 140 A 28 28 0 1 1 70 60 Z" fill="${cSpark}" opacity="0.6"/>
        <circle cx="100" cy="100" r="8" fill="${cCore}" opacity="0.9"/>
      `;
      break;

    case 'viento':
      cCore = '#ffffff';
      cGlow = '#34d399';
      c1 = '#059669';
      c2 = '#047857';
      cDark = '#022c22';
      cSpark = '#a7f3d0';
      detailPattern = `
        <!-- Espirales de viento y corrientes aerodinámicas -->
        <path d="M 45 80 Q 75 55 110 70 T 155 75" fill="none" stroke="${cCore}" stroke-width="3.5" stroke-linecap="round" opacity="0.85"/>
        <path d="M 35 105 Q 75 85 120 100 T 165 95" fill="none" stroke="${cSpark}" stroke-width="3" stroke-linecap="round" opacity="0.75"/>
        <path d="M 55 130 Q 95 115 135 125 T 150 120" fill="none" stroke="${cGlow}" stroke-width="2.5" stroke-linecap="round" opacity="0.65"/>
        <circle cx="95" cy="88" r="14" fill="${cCore}" opacity="0.4" filter="blur(2px)"/>
      `;
      break;

    case 'tierra':
      cCore = '#fef08a';
      cGlow = '#a3e635';
      c1 = '#65a30d';
      c2 = '#4d7c0f';
      cDark = '#1a2e05';
      cSpark = '#d9f99d';
      detailPattern = `
        <!-- Núcleo de geoda y cristales de cuarzo terrestre -->
        <polygon points="100,40 135,65 145,115 105,150 65,130 55,80" fill="${c2}" stroke="${cSpark}" stroke-width="2.5"/>
        <polygon points="100,55 125,75 120,110 95,130 75,105 75,75" fill="${c1}" opacity="0.85"/>
        <polygon points="100,70 115,85 105,110 88,100" fill="${cCore}" opacity="0.8"/>
      `;
      break;

    case 'veneno':
      cCore = '#f0fdf4';
      cGlow = '#4ade80';
      c1 = '#16a34a';
      c2 = '#15803d';
      cDark = '#052e16';
      cSpark = '#bbf7d0';
      detailPattern = `
        <!-- Gotas de toxina y burbujas arcanas -->
        <circle cx="85" cy="85" r="18" fill="${cSpark}" opacity="0.5"/>
        <circle cx="120" cy="115" r="12" fill="${cSpark}" opacity="0.4"/>
        <circle cx="105" cy="65" r="9" fill="${cCore}" opacity="0.6"/>
        <path d="M 100 45 C 120 70 130 95 100 135 C 70 95 80 70 100 45 Z" fill="${cGlow}" opacity="0.65" filter="blur(1px)"/>
        <circle cx="96" cy="85" r="6" fill="${cCore}" opacity="0.9"/>
      `;
      break;

    case 'luz':
      cCore = '#ffffff';
      cGlow = '#fbbf24';
      c1 = '#f59e0b';
      c2 = '#b45309';
      cDark = '#451a03';
      cSpark = '#fef3c7';
      detailPattern = `
        <!-- Corona solar y destellos de estrella sacra -->
        <polygon points="100,20 108,75 160,50 120,95 175,120 118,125 135,175 98,135 60,170 82,122 25,120 80,95 40,50 92,75" fill="${cSpark}" opacity="0.75" filter="drop-shadow(0 0 8px ${cGlow})"/>
        <circle cx="100" cy="100" r="28" fill="${cCore}" opacity="0.95"/>
      `;
      break;

    case 'metal':
      cCore = '#ffffff';
      cGlow = '#cbd5e1';
      c1 = '#64748b';
      c2 = '#334155';
      cDark = '#0f172a';
      cSpark = '#f8fafc';
      detailPattern = `
        <!-- Blindaje de acero y bandas metálicas concéntricas -->
        <circle cx="100" cy="100" r="50" fill="none" stroke="${cSpark}" stroke-width="4" opacity="0.8"/>
        <circle cx="100" cy="100" r="35" fill="none" stroke="${c1}" stroke-width="3" stroke-dasharray="14 6" opacity="0.9"/>
        <line x1="50" y1="100" x2="150" y2="100" stroke="${cSpark}" stroke-width="2.5" opacity="0.7"/>
        <line x1="100" y1="50" x2="100" y2="150" stroke="${cSpark}" stroke-width="2.5" opacity="0.7"/>
        <circle cx="100" cy="100" r="16" fill="${cCore}" opacity="0.85"/>
      `;
      break;

    case 'cosmos':
    default:
      cCore = '#ffffff';
      cGlow = '#ec4899';
      c1 = '#d946ef';
      c2 = '#86198f';
      cDark = '#2e1065';
      cSpark = '#fae8ff';
      detailPattern = `
        <!-- Galaxia espiral y estrellas cósmicas -->
        <ellipse cx="100" cy="100" rx="48" ry="18" fill="none" stroke="${cSpark}" stroke-width="3" stroke-dasharray="12 6" transform="rotate(-30 100 100)" opacity="0.85"/>
        <ellipse cx="100" cy="100" rx="48" ry="18" fill="none" stroke="${cGlow}" stroke-width="2.5" stroke-dasharray="8 8" transform="rotate(40 100 100)" opacity="0.75"/>
        <circle cx="100" cy="100" r="22" fill="${cCore}" opacity="0.9" filter="drop-shadow(0 0 10px ${cGlow})"/>
        <circle cx="75" cy="65" r="3" fill="#ffffff"/>
        <circle cx="130" cy="135" r="3.5" fill="#ffffff"/>
        <circle cx="135" cy="70" r="2.5" fill="${cSpark}"/>
      `;
      break;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%">
    <defs>
      <!-- Gradiente volumétrico cósmico de fondo -->
      <radialGradient id="spaceBack" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${cGlow}" stop-opacity="0.35"/>
        <stop offset="60%" stop-color="${cDark}" stop-opacity="0.8"/>
        <stop offset="100%" stop-color="#020205" stop-opacity="0.95"/>
      </radialGradient>

      <!-- Resplandor del aura externa -->
      <radialGradient id="auraGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${cGlow}" stop-opacity="0.9"/>
        <stop offset="50%" stop-color="${c1}" stop-opacity="0.5"/>
        <stop offset="85%" stop-color="${c2}" stop-opacity="0.15"/>
        <stop offset="100%" stop-color="${c2}" stop-opacity="0"/>
      </radialGradient>

      <!-- Esfera mágica principal 3D fotorrealista -->
      <radialGradient id="sphere3D" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stop-color="${cCore}" stop-opacity="1"/>
        <stop offset="18%" stop-color="${cSpark}" stop-opacity="0.98"/>
        <stop offset="42%" stop-color="${cGlow}" stop-opacity="0.95"/>
        <stop offset="70%" stop-color="${c1}" stop-opacity="0.9"/>
        <stop offset="90%" stop-color="${c2}" stop-opacity="0.95"/>
        <stop offset="100%" stop-color="${cDark}" stop-opacity="1"/>
      </radialGradient>

      <!-- Reflejo cristalino curvado superior (brillo especular de vidrio pulido) -->
      <linearGradient id="specularGlint" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9"/>
        <stop offset="35%" stop-color="${cSpark}" stop-opacity="0.4"/>
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
      </linearGradient>

      <!-- Reflejo inferior secundario (rebote de luz en el cristal) -->
      <radialGradient id="bottomRim" cx="50%" cy="90%" r="40%">
        <stop offset="0%" stop-color="${cSpark}" stop-opacity="0.65"/>
        <stop offset="100%" stop-color="${c1}" stop-opacity="0"/>
      </radialGradient>
    </defs>

    <!-- Fondo de pedestal oscuro con viñeta -->
    <rect width="200" height="200" rx="16" fill="url(#spaceBack)"/>

    <!-- Anillos rúnicos exteriores concéntricos -->
    <circle cx="100" cy="100" r="88" fill="none" stroke="${cGlow}" stroke-width="1.2" stroke-dasharray="4 6" opacity="0.5"/>
    <circle cx="100" cy="100" r="78" fill="none" stroke="${cSpark}" stroke-width="1.8" stroke-dasharray="12 18" opacity="0.65"/>

    <!-- Resplandor exterior difuso -->
    <circle cx="100" cy="100" r="74" fill="url(#auraGlow)"/>

    <!-- Cuerpo esférico 3D principal -->
    <circle cx="100" cy="100" r="56" fill="url(#sphere3D)" stroke="${cSpark}" stroke-width="1.8" stroke-opacity="0.75" filter="drop-shadow(0 10px 20px rgba(0,0,0,0.8))"/>

    <!-- Patrón de energía interna específico del elemento -->
    ${detailPattern}

    <!-- Capa de brillo especular superior en media luna -->
    <ellipse cx="88" cy="72" rx="30" ry="16" fill="url(#specularGlint)" transform="rotate(-24 88 72)"/>

    <!-- Rebote de luz en borde inferior -->
    <ellipse cx="100" cy="138" rx="32" ry="10" fill="url(#bottomRim)"/>

    <!-- Puntos de destello blanco cristalino -->
    <circle cx="78" cy="60" r="4.5" fill="#ffffff" opacity="0.95"/>
    <circle cx="90" cy="54" r="2.2" fill="#ffffff" opacity="0.9"/>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
