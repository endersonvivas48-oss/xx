import React from 'react';
import * as THREE from 'three';
import { markGeometryAsShared, markMaterialAsShared } from './ThreeSceneCleanup';

interface CreatureModelProps {
  level: number;
  isJ1: boolean;
  trimColor: string;
  primaryColor: string;
}

// ========================================================
// CACHÉ DE MATERIALES A NIVEL DE MÓDULO (Evita recompilar shaders por instancia)
// ========================================================
const standardMaterialCache = new Map<string, THREE.MeshStandardMaterial>();
const basicMaterialCache = new Map<string, THREE.MeshBasicMaterial>();

function getCachedStandardMat(params: {
  color: string;
  roughness?: number;
  metalness?: number;
  emissive?: string;
  emissiveIntensity?: number;
  side?: THREE.Side;
}): THREE.MeshStandardMaterial {
  const key = `${params.color}|r:${params.roughness ?? 1}|m:${params.metalness ?? 0}|e:${params.emissive ?? ''}|ei:${params.emissiveIntensity ?? 0}|s:${params.side ?? THREE.FrontSide}`;
  let mat = standardMaterialCache.get(key);
  if (!mat) {
    mat = markMaterialAsShared(
      new THREE.MeshStandardMaterial({
        color: params.color,
        roughness: params.roughness ?? 1,
        metalness: params.metalness ?? 0,
        emissive: params.emissive ? new THREE.Color(params.emissive) : new THREE.Color(0x000000),
        emissiveIntensity: params.emissiveIntensity ?? 1,
        side: params.side ?? THREE.FrontSide,
      })
    );
    standardMaterialCache.set(key, mat);
  }
  return mat;
}

function getCachedBasicMat(color: string): THREE.MeshBasicMaterial {
  let mat = basicMaterialCache.get(color);
  if (!mat) {
    mat = markMaterialAsShared(new THREE.MeshBasicMaterial({ color }));
    basicMaterialCache.set(color, mat);
  }
  return mat;
}

// ========================================================
// GEOMETRÍAS COMPARTIDAS POR NIVEL DE CRIATURA Y TITÁN
// ========================================================
const sharedCreatureGeos = {
  // Nivel 1
  l1Leg: markGeometryAsShared(new THREE.CapsuleGeometry(0.075, 0.32, 6, 12)),
  l1Boot: markGeometryAsShared(new THREE.CapsuleGeometry(0.065, 0.14, 6, 10)),
  l1Torso: markGeometryAsShared(new THREE.CapsuleGeometry(0.2, 0.32, 8, 16)),
  l1Chest: markGeometryAsShared(new THREE.SphereGeometry(0.2, 14, 14)),
  l1Head: markGeometryAsShared(new THREE.SphereGeometry(0.18, 16, 16)),
  l1Visor: markGeometryAsShared(new THREE.TorusGeometry(0.12, 0.035, 6, 14, Math.PI * 0.8)),
  l1ShieldDome: markGeometryAsShared(new THREE.SphereGeometry(0.24, 14, 14, 0, Math.PI * 2, 0, Math.PI * 0.45)),
  l1ShieldRim: markGeometryAsShared(new THREE.TorusGeometry(0.22, 0.025, 8, 20)),
  l1SwordBlade: markGeometryAsShared(new THREE.CapsuleGeometry(0.035, 0.46, 6, 12)),
  l1SwordGuard: markGeometryAsShared(new THREE.CapsuleGeometry(0.025, 0.16, 6, 10)),

  // Nivel 2
  l2Leg: markGeometryAsShared(new THREE.CapsuleGeometry(0.07, 0.3, 6, 12)),
  l2Torso: markGeometryAsShared(new THREE.CapsuleGeometry(0.19, 0.34, 8, 16)),
  l2Vest: markGeometryAsShared(new THREE.SphereGeometry(0.18, 12, 12)),
  l2Hood: markGeometryAsShared(new THREE.ConeGeometry(0.22, 0.36, 14)),
  l2Bow: markGeometryAsShared(new THREE.TorusGeometry(0.36, 0.028, 8, 24, Math.PI * 0.9)),
  l2BowString: markGeometryAsShared(
    new THREE.CylinderGeometry(0.008, 0.008, 2 * 0.36 * Math.sin(Math.PI * 0.45), 6)
  ),
  l2Quiver: markGeometryAsShared(new THREE.CylinderGeometry(0.07, 0.05, 0.48, 12)),
  l2Fletching: markGeometryAsShared(new THREE.SphereGeometry(0.06, 8, 8)),

  // Nivel 3
  l3Leg: markGeometryAsShared(new THREE.CapsuleGeometry(0.09, 0.34, 8, 14)),
  l3Torso: markGeometryAsShared(new THREE.CapsuleGeometry(0.26, 0.38, 10, 18)),
  l3Pauldron: markGeometryAsShared(new THREE.SphereGeometry(0.18, 14, 14)),
  l3Helm: markGeometryAsShared(new THREE.SphereGeometry(0.2, 16, 16)),
  l3Plume: markGeometryAsShared(new THREE.CapsuleGeometry(0.06, 0.32, 8, 14)),
  l3LanceShaft: markGeometryAsShared(new THREE.CylinderGeometry(0.025, 0.035, 1.7, 10)),
  l3LanceTip: markGeometryAsShared(new THREE.ConeGeometry(0.07, 0.35, 10)),

  // Nivel 4
  l4Robe: markGeometryAsShared(new THREE.ConeGeometry(0.38, 0.85, 18)),
  l4Shoulders: markGeometryAsShared(new THREE.SphereGeometry(0.24, 14, 14)),
  l4HatBrim: markGeometryAsShared(new THREE.TorusGeometry(0.3, 0.05, 8, 20)),
  l4HatCone: markGeometryAsShared(new THREE.ConeGeometry(0.24, 0.55, 14)),
  l4StaffShaft: markGeometryAsShared(new THREE.CylinderGeometry(0.035, 0.035, 1.5, 10)),
  l4StaffRing: markGeometryAsShared(new THREE.TorusGeometry(0.13, 0.03, 8, 16)),
  l4StaffOrb: markGeometryAsShared(new THREE.SphereGeometry(0.1, 16, 16)),

  // Nivel 5
  l5Body: markGeometryAsShared(new THREE.CapsuleGeometry(0.24, 0.52, 10, 18)),
  l5Beak: markGeometryAsShared(new THREE.ConeGeometry(0.08, 0.22, 10)),
  l5Eye: markGeometryAsShared(new THREE.SphereGeometry(0.045, 8, 8)),
  l5Wing: markGeometryAsShared(new THREE.CapsuleGeometry(0.12, 0.6, 8, 16)),
  l5Tail: markGeometryAsShared(new THREE.CapsuleGeometry(0.05, 0.38, 6, 12)),

  // Nivel 6
  l6Leg: markGeometryAsShared(new THREE.CapsuleGeometry(0.14, 0.38, 8, 16)),
  l6Torso: markGeometryAsShared(new THREE.CapsuleGeometry(0.36, 0.44, 10, 20)),
  l6CoreRing: markGeometryAsShared(new THREE.TorusGeometry(0.16, 0.04, 8, 20)),
  l6CoreOrb: markGeometryAsShared(new THREE.SphereGeometry(0.12, 14, 14)),
  l6Pauldron: markGeometryAsShared(new THREE.SphereGeometry(0.25, 16, 16)),
  l6Head: markGeometryAsShared(new THREE.SphereGeometry(0.22, 16, 16)),
  l6Visor: markGeometryAsShared(new THREE.TorusGeometry(0.11, 0.035, 6, 16, Math.PI * 0.9)),
  l6HammerShaft: markGeometryAsShared(new THREE.CylinderGeometry(0.05, 0.05, 1.5, 10)),
  l6HammerHead: markGeometryAsShared(new THREE.CapsuleGeometry(0.18, 0.36, 8, 16)),

  // Titán Ascendido
  titanHalo: markGeometryAsShared(new THREE.TorusGeometry(0.55, 0.045, 12, 32)),
  titanHaloSpike: markGeometryAsShared(new THREE.ConeGeometry(0.07, 0.22, 6)),
  titanUpperWing: markGeometryAsShared(new THREE.CapsuleGeometry(0.11, 0.85, 8, 16)),
  titanLowerWing: markGeometryAsShared(new THREE.CapsuleGeometry(0.08, 0.65, 8, 14)),
  titanLeg: markGeometryAsShared(new THREE.CapsuleGeometry(0.13, 0.44, 8, 16)),
  titanBoot: markGeometryAsShared(new THREE.SphereGeometry(0.12, 12, 12)),
  titanTorso: markGeometryAsShared(new THREE.CapsuleGeometry(0.33, 0.52, 10, 20)),
  titanCoreRing: markGeometryAsShared(new THREE.TorusGeometry(0.15, 0.04, 8, 20)),
  titanCoreOrb: markGeometryAsShared(new THREE.SphereGeometry(0.11, 16, 16)),
  titanPauldron: markGeometryAsShared(new THREE.SphereGeometry(0.24, 16, 16)),
  titanHead: markGeometryAsShared(new THREE.SphereGeometry(0.23, 20, 20)),
  titanVisor: markGeometryAsShared(new THREE.TorusGeometry(0.12, 0.038, 8, 18, Math.PI * 0.9)),
  titanScepterShaft: markGeometryAsShared(new THREE.CylinderGeometry(0.04, 0.045, 1.8, 12)),
  titanScepterRing: markGeometryAsShared(new THREE.TorusGeometry(0.18, 0.035, 8, 20)),
  titanScepterOrb: markGeometryAsShared(new THREE.SphereGeometry(0.12, 16, 16)),
};

/**
 * Modelos 3D orgánicos, anatómicos y estilizados de alta resolución para cada criatura,
 * optimizados con geometrías compartidas y caché de materiales a nivel de módulo.
 */
export function DetailedCreatureMesh({
  level,
  isJ1,
}: CreatureModelProps) {
  const armorMetal = isJ1 ? '#38bdf8' : '#e11d48';
  const armorShade = isJ1 ? '#0284c7' : '#be123c';
  const clothColor = isJ1 ? '#1e3a8a' : '#881337';
  const goldTrim = '#f59e0b';
  const steelBright = '#e2e8f0';

  const matGoldTrim = getCachedStandardMat({ color: goldTrim, metalness: 0.9, roughness: 0.2 });
  const matSteelBright = getCachedStandardMat({ color: steelBright, metalness: 0.92, roughness: 0.15 });
  const matCloth = getCachedStandardMat({ color: clothColor, roughness: 0.5 });

  // ========================================================
  // NIVEL 1: INFANTERÍA / ESPADACHÍN ÁGIL CURVO
  // ========================================================
  if (level === 1) {
    const matLeg = getCachedStandardMat({ color: '#1e293b', roughness: 0.6 });
    const matBoot = getCachedStandardMat({ color: '#0f172a', roughness: 0.7 });
    const matChestPlate = getCachedStandardMat({ color: armorMetal, metalness: 0.75, roughness: 0.25 });
    const matHelm = getCachedStandardMat({ color: '#64748b', metalness: 0.8, roughness: 0.25 });
    const matVisor = getCachedStandardMat({
      color: isJ1 ? '#38bdf8' : '#f43f5e',
      emissive: isJ1 ? '#0284c7' : '#be123c',
      emissiveIntensity: 1.2,
    });
    const matShield = getCachedStandardMat({
      color: armorMetal,
      metalness: 0.8,
      roughness: 0.2,
      side: THREE.DoubleSide,
    });

    return (
      <group position={[0, 0.12, 0]}>
        {/* Piernas orgánicas (cápsulas compartidas) */}
        <group position={[-0.14, 0.28, 0]}>
          <mesh geometry={sharedCreatureGeos.l1Leg} material={matLeg} castShadow />
          <mesh
            geometry={sharedCreatureGeos.l1Boot}
            material={matBoot}
            position={[0, -0.22, 0.03]}
            rotation={[-Math.PI / 2, 0, 0]}
            castShadow
          />
        </group>
        <group position={[0.14, 0.28, 0]}>
          <mesh geometry={sharedCreatureGeos.l1Leg} material={matLeg} castShadow />
          <mesh
            geometry={sharedCreatureGeos.l1Boot}
            material={matBoot}
            position={[0, -0.22, 0.03]}
            rotation={[-Math.PI / 2, 0, 0]}
            castShadow
          />
        </group>

        {/* Torso anatómico redondeado */}
        <mesh geometry={sharedCreatureGeos.l1Torso} material={matCloth} position={[0, 0.58, 0]} castShadow />
        {/* Pectoral curvo de placas */}
        <mesh geometry={sharedCreatureGeos.l1Chest} material={matChestPlate} position={[0, 0.62, 0.07]} castShadow />

        {/* Cabeza / Yelmo redondo */}
        <mesh geometry={sharedCreatureGeos.l1Head} material={matHelm} position={[0, 0.94, 0]} castShadow />
        {/* Visera curva luminosa */}
        <mesh
          geometry={sharedCreatureGeos.l1Visor}
          material={matVisor}
          position={[0, 0.94, 0.13]}
          rotation={[Math.PI / 2, 0, 0]}
        />

        {/* Escudo Heráldico Abombado (Brazo Izquierdo) */}
        <group position={[-0.34, 0.6, 0.08]} rotation={[0, 0.4, 0]}>
          <mesh geometry={sharedCreatureGeos.l1ShieldDome} material={matShield} castShadow />
          <mesh geometry={sharedCreatureGeos.l1ShieldRim} material={matGoldTrim} rotation={[Math.PI / 2, 0, 0]} />
        </group>

        {/* Espada de Acero Curva (Mano Derecha) */}
        <group position={[0.32, 0.52, 0.1]} rotation={[0.3, 0, -0.2]}>
          <mesh geometry={sharedCreatureGeos.l1SwordBlade} material={matSteelBright} position={[0, 0.22, 0]} castShadow />
          <mesh
            geometry={sharedCreatureGeos.l1SwordGuard}
            material={matGoldTrim}
            position={[0, -0.04, 0]}
            rotation={[0, 0, Math.PI / 2]}
          />
        </group>
      </group>
    );
  }

  // ========================================================
  // NIVEL 2: ARQUERO / EXPLORADOR SILVESTRE CON ARCO ORGÁNICO
  // ========================================================
  if (level === 2) {
    const matLeg = getCachedStandardMat({ color: '#14532d', roughness: 0.7 });
    const matTorso = getCachedStandardMat({ color: '#166534', roughness: 0.65 });
    const matVest = getCachedStandardMat({ color: '#78350f', roughness: 0.8 });
    const matSkin = getCachedStandardMat({ color: '#fed7aa', roughness: 0.7 });
    const matHood = getCachedStandardMat({ color: '#14532d', roughness: 0.75 });
    const matBow = getCachedStandardMat({ color: '#78350f', roughness: 0.5 });
    const matString = getCachedBasicMat('#fef08a');
    const matQuiver = getCachedStandardMat({ color: '#451a03', roughness: 0.8 });
    const matFletch = getCachedStandardMat({ color: '#fef08a' });

    return (
      <group position={[0, 0.12, 0]}>
        {/* Piernas ágiles */}
        <group position={[-0.13, 0.26, 0]}>
          <mesh geometry={sharedCreatureGeos.l2Leg} material={matLeg} castShadow />
        </group>
        <group position={[0.13, 0.26, 0]}>
          <mesh geometry={sharedCreatureGeos.l2Leg} material={matLeg} castShadow />
        </group>

        {/* Torso flexible de cuero verde bosque */}
        <mesh geometry={sharedCreatureGeos.l2Torso} material={matTorso} position={[0, 0.56, 0]} castShadow />
        {/* Chaleco de arquero con relieve */}
        <mesh geometry={sharedCreatureGeos.l2Vest} material={matVest} position={[0, 0.58, 0.05]} castShadow />

        {/* Cabeza y Capucha orgánica suave */}
        <mesh geometry={sharedCreatureGeos.l1Head} material={matSkin} position={[0, 0.9, 0]} castShadow />
        <mesh
          geometry={sharedCreatureGeos.l2Hood}
          material={matHood}
          position={[0, 0.96, -0.04]}
          rotation={[-0.2, 0, 0]}
          castShadow
        />

        {/* Arco Curvo Elíptico */}
        <group position={[-0.32, 0.58, 0.1]} rotation={[0.1, 0.4, 0.2]}>
          <mesh
            geometry={sharedCreatureGeos.l2Bow}
            material={matBow}
            rotation={[0, -Math.PI / 2, -Math.PI * 0.45]}
            castShadow
          />
          <mesh
            geometry={sharedCreatureGeos.l2BowString}
            material={matString}
            position={[0, 0, 0.36 * Math.cos(Math.PI * 0.45)]}
          />
        </group>

        {/* Carcaj cilíndrico suave con flechas a la espalda */}
        <group position={[0.14, 0.66, -0.16]} rotation={[-0.3, 0.2, 0.3]}>
          <mesh geometry={sharedCreatureGeos.l2Quiver} material={matQuiver} castShadow />
          <mesh geometry={sharedCreatureGeos.l2Fletching} material={matFletch} position={[0, 0.26, 0]} />
        </group>
      </group>
    );
  }

  // ========================================================
  // NIVEL 3: CABALLERO DE PLACAS Y LANZA DE TORNEO
  // ========================================================
  if (level === 3) {
    const matGreaves = getCachedStandardMat({ color: '#334155', metalness: 0.8, roughness: 0.25 });
    const matPlate = getCachedStandardMat({ color: armorMetal, metalness: 0.85, roughness: 0.2 });
    const matPauldron = getCachedStandardMat({ color: goldTrim, metalness: 0.92, roughness: 0.2 });
    const matHelm = getCachedStandardMat({ color: steelBright, metalness: 0.9, roughness: 0.2 });
    const matPlume = getCachedStandardMat({ color: isJ1 ? '#38bdf8' : '#ef4444', roughness: 0.3 });
    const matShaft = getCachedStandardMat({ color: '#78350f', roughness: 0.6 });
    const matTip = getCachedStandardMat({ color: steelBright, metalness: 0.95, roughness: 0.15 });

    return (
      <group position={[0, 0.14, 0]}>
        {/* Piernas acorazadas con grebas curvas */}
        <group position={[-0.16, 0.3, 0]}>
          <mesh geometry={sharedCreatureGeos.l3Leg} material={matGreaves} castShadow />
        </group>
        <group position={[0.16, 0.3, 0]}>
          <mesh geometry={sharedCreatureGeos.l3Leg} material={matGreaves} castShadow />
        </group>

        {/* Pectoral macizo entallado */}
        <mesh geometry={sharedCreatureGeos.l3Torso} material={matPlate} position={[0, 0.64, 0]} castShadow />
        {/* Hombreras esféricas dobles de torneo */}
        <mesh geometry={sharedCreatureGeos.l3Pauldron} material={matPauldron} position={[-0.36, 0.82, 0]} castShadow />
        <mesh geometry={sharedCreatureGeos.l3Pauldron} material={matPauldron} position={[0.36, 0.82, 0]} castShadow />

        {/* Yelmo con celada y penacho plumado curvo */}
        <mesh geometry={sharedCreatureGeos.l3Helm} material={matHelm} position={[0, 1.05, 0]} castShadow />
        <mesh
          geometry={sharedCreatureGeos.l3Plume}
          material={matPlume}
          position={[0, 1.28, -0.05]}
          rotation={[0.4, 0, 0]}
          castShadow
        />

        {/* Lanza larga de torneo esbelta */}
        <group position={[0.4, 0.9, 0.12]} rotation={[0.15, 0, -0.08]}>
          <mesh geometry={sharedCreatureGeos.l3LanceShaft} material={matShaft} castShadow />
          <mesh geometry={sharedCreatureGeos.l3LanceTip} material={matTip} position={[0, 0.92, 0]} castShadow />
        </group>
      </group>
    );
  }

  // ========================================================
  // NIVEL 4: HECHICERO ELEMENTAL CON TÚNICA FLUIDA Y BÁCULO
  // ========================================================
  if (level === 4) {
    const matMantle = getCachedStandardMat({ color: armorShade, roughness: 0.4 });
    const matSkin = getCachedStandardMat({ color: '#fed7aa', roughness: 0.7 });
    const matHat = getCachedStandardMat({ color: clothColor, roughness: 0.6 });
    const matStaff = getCachedStandardMat({ color: '#451a03', roughness: 0.7 });
    const matStaffRing = getCachedStandardMat({ color: goldTrim, metalness: 0.95, roughness: 0.2 });
    const matOrb = getCachedStandardMat({
      color: isJ1 ? '#38bdf8' : '#c084fc',
      emissive: isJ1 ? '#0284c7' : '#9333ea',
      emissiveIntensity: 3.0,
    });

    return (
      <group position={[0, 0.12, 0]}>
        {/* Túnica acampanada con caída de tela suave */}
        <mesh geometry={sharedCreatureGeos.l4Robe} material={matCloth} position={[0, 0.48, 0]} castShadow />
        <mesh geometry={sharedCreatureGeos.l4Shoulders} material={matMantle} position={[0, 0.76, 0]} castShadow />

        {/* Cabeza suave y rostro */}
        <mesh geometry={sharedCreatureGeos.l1Head} material={matSkin} position={[0, 1.05, 0]} castShadow />
        {/* Sombrero de hechicero */}
        <group position={[0, 1.15, 0]}>
          <mesh geometry={sharedCreatureGeos.l4HatBrim} material={matHat} rotation={[Math.PI / 2, 0, 0]} castShadow />
          <mesh
            geometry={sharedCreatureGeos.l4HatCone}
            material={matHat}
            position={[0, 0.28, -0.04]}
            rotation={[0.2, 0, 0]}
            castShadow
          />
        </group>

        {/* Báculo Arcano Esculpido */}
        <group position={[0.42, 0.85, 0.1]}>
          <mesh geometry={sharedCreatureGeos.l4StaffShaft} material={matStaff} castShadow />
          <mesh
            geometry={sharedCreatureGeos.l4StaffRing}
            material={matStaffRing}
            position={[0, 0.8, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            castShadow
          />
          <mesh geometry={sharedCreatureGeos.l4StaffOrb} material={matOrb} position={[0, 0.8, 0]} />
        </group>
      </group>
    );
  }

  // ========================================================
  // NIVEL 5: BESTIA SAGRADA / GRIFO ALADO GUARDÍAN
  // ========================================================
  if (level === 5) {
    const matBody = getCachedStandardMat({ color: armorMetal, roughness: 0.4, metalness: 0.4 });
    const matChest = getCachedStandardMat({ color: goldTrim, metalness: 0.8, roughness: 0.25 });
    const matHead = getCachedStandardMat({ color: goldTrim, metalness: 0.85, roughness: 0.2 });
    const matBeak = getCachedStandardMat({ color: '#d97706', metalness: 0.8, roughness: 0.2 });
    const matEye = getCachedBasicMat('#ffffff');
    const matTail = getCachedStandardMat({ color: goldTrim, metalness: 0.7 });

    return (
      <group position={[0, 0.16, 0]}>
        {/* Cuerpo felino aerodinámico redondeado */}
        <mesh
          geometry={sharedCreatureGeos.l5Body}
          material={matBody}
          position={[0, 0.44, 0]}
          rotation={[0.15, 0, 0]}
          castShadow
        />

        {/* Pecho dorado */}
        <mesh
          geometry={sharedCreatureGeos.l4Shoulders}
          material={matChest}
          position={[0, 0.65, 0.22]}
          rotation={[0.4, 0, 0]}
          castShadow
        />

        {/* Cabeza de águila majestuosa */}
        <group position={[0, 0.88, 0.35]}>
          <mesh geometry={sharedCreatureGeos.l3Helm} material={matHead} castShadow />
          <mesh
            geometry={sharedCreatureGeos.l5Beak}
            material={matBeak}
            position={[0, -0.06, 0.18]}
            rotation={[0.4, 0, 0]}
            castShadow
          />
          <mesh geometry={sharedCreatureGeos.l5Eye} material={matEye} position={[0.11, 0.04, 0.1]} />
          <mesh geometry={sharedCreatureGeos.l5Eye} material={matEye} position={[-0.11, 0.04, 0.1]} />
        </group>

        {/* Alas curvas estilizadas */}
        <group position={[-0.38, 0.68, -0.05]} rotation={[0.2, 0.4, 0.5]}>
          <mesh geometry={sharedCreatureGeos.l5Wing} material={matCloth} castShadow />
        </group>
        <group position={[0.38, 0.68, -0.05]} rotation={[0.2, -0.4, -0.5]}>
          <mesh geometry={sharedCreatureGeos.l5Wing} material={matCloth} castShadow />
        </group>

        {/* Cola felina */}
        <mesh
          geometry={sharedCreatureGeos.l5Tail}
          material={matTail}
          position={[0, 0.38, -0.42]}
          rotation={[-0.4, 0, 0]}
          castShadow
        />
      </group>
    );
  }

  // ========================================================
  // NIVEL 6: TITÁN DE ADAMANTIO / COLOSO RÚNICO CON MARTILLO
  // ========================================================
  const matTitanLeg = getCachedStandardMat({ color: '#1e293b', roughness: 0.6, metalness: 0.5 });
  const matTitanTorso = getCachedStandardMat({ color: '#334155', roughness: 0.6, metalness: 0.4 });
  const matTitanCore = getCachedStandardMat({
    color: isJ1 ? '#38bdf8' : '#ef4444',
    emissive: isJ1 ? '#0284c7' : '#dc2626',
    emissiveIntensity: 3.2,
  });
  const matTitanPauldron = getCachedStandardMat({ color: '#1e293b', metalness: 0.7, roughness: 0.3 });
  const matTitanHead = getCachedStandardMat({ color: '#475569', metalness: 0.7, roughness: 0.3 });
  const matTitanVisor = getCachedBasicMat(isJ1 ? '#38bdf8' : '#ef4444');
  const matHammerShaft = getCachedStandardMat({ color: '#0f172a', roughness: 0.8 });
  const matHammerHead = getCachedStandardMat({ color: '#1e293b', metalness: 0.85, roughness: 0.2 });

  return (
    <group position={[0, 0.18, 0]}>
      {/* Piernas macizas */}
      <group position={[-0.26, 0.34, 0]}>
        <mesh geometry={sharedCreatureGeos.l6Leg} material={matTitanLeg} castShadow />
      </group>
      <group position={[0.26, 0.34, 0]}>
        <mesh geometry={sharedCreatureGeos.l6Leg} material={matTitanLeg} castShadow />
      </group>

      {/* Torso colosal de roca adamantina */}
      <mesh geometry={sharedCreatureGeos.l6Torso} material={matTitanTorso} position={[0, 0.74, 0]} castShadow />

      {/* Núcleo Rúnico Cósmico pulsante */}
      <group position={[0, 0.78, 0.3]}>
        <mesh geometry={sharedCreatureGeos.l6CoreRing} material={matGoldTrim} rotation={[Math.PI / 2, 0, 0]} />
        <mesh geometry={sharedCreatureGeos.l6CoreOrb} material={matTitanCore} />
      </group>

      {/* Hombreras esféricas de roca colosales */}
      <mesh geometry={sharedCreatureGeos.l6Pauldron} material={matTitanPauldron} position={[-0.48, 1.02, 0]} castShadow />
      <mesh geometry={sharedCreatureGeos.l6Pauldron} material={matTitanPauldron} position={[0.48, 1.02, 0]} castShadow />

      {/* Cabeza blindada del Gólem */}
      <mesh geometry={sharedCreatureGeos.l6Head} material={matTitanHead} position={[0, 1.18, 0]} castShadow />
      <mesh
        geometry={sharedCreatureGeos.l6Visor}
        material={matTitanVisor}
        position={[0, 1.18, 0.16]}
        rotation={[Math.PI / 2, 0, 0]}
      />

      {/* Martillo Colosal de Guerra */}
      <group position={[0.56, 0.72, 0.15]} rotation={[0.3, 0, -0.15]}>
        <mesh geometry={sharedCreatureGeos.l6HammerShaft} material={matHammerShaft} castShadow />
        <mesh
          geometry={sharedCreatureGeos.l6HammerHead}
          material={matHammerHead}
          position={[0, 0.65, 0]}
          rotation={[0, 0, Math.PI / 2]}
          castShadow
        />
      </group>
    </group>
  );
}

/**
 * TITÁN ASCENDIDO CÓSMICO (Unidad Suprema despierta por tiradas triples legendarias)
 * Optimizado con geometrías compartidas y materiales cacheados por bando.
 */
export function AscendedTitanMesh({ isJ1 }: { isJ1: boolean }) {
  const energyColor = isJ1 ? '#38bdf8' : '#c084fc';
  const emissiveColor = isJ1 ? '#0284c7' : '#9333ea';
  const armorColor = isJ1 ? '#1e1b4b' : '#3b0764';
  const goldTrim = '#f59e0b';

  const matHalo = getCachedStandardMat({
    color: goldTrim,
    emissive: energyColor,
    emissiveIntensity: 1.5,
    metalness: 0.95,
    roughness: 0.15,
  });
  const matGoldCrown = getCachedStandardMat({ color: goldTrim, metalness: 0.95, roughness: 0.15 });
  const matWingUpper = getCachedStandardMat({
    color: armorColor,
    emissive: emissiveColor,
    emissiveIntensity: 0.8,
    roughness: 0.3,
  });
  const matWingLower = getCachedStandardMat({
    color: armorColor,
    emissive: emissiveColor,
    emissiveIntensity: 0.6,
    roughness: 0.3,
  });
  const matLeg = getCachedStandardMat({ color: armorColor, roughness: 0.35, metalness: 0.7 });
  const matBoot = getCachedStandardMat({ color: goldTrim, metalness: 0.92, roughness: 0.2 });
  const matTorso = getCachedStandardMat({ color: armorColor, roughness: 0.25, metalness: 0.8 });
  const matCoreOrb = getCachedStandardMat({
    color: energyColor,
    emissive: energyColor,
    emissiveIntensity: 3.8,
    roughness: 0.05,
  });
  const matPauldron = getCachedStandardMat({ color: goldTrim, metalness: 0.95, roughness: 0.18 });
  const matHead = getCachedStandardMat({ color: '#e2e8f0', metalness: 0.9, roughness: 0.2 });
  const matVisor = getCachedBasicMat(energyColor);
  const matScepterShaft = getCachedStandardMat({ color: goldTrim, metalness: 0.9, roughness: 0.2 });
  const matScepterOrb = getCachedStandardMat({
    color: energyColor,
    emissive: energyColor,
    emissiveIntensity: 3.5,
  });

  return (
    <group position={[0, 0.2, 0]}>
      {/* Halo Rúnico Levitante Trasero */}
      <group position={[0, 1.35, -0.25]}>
        <mesh geometry={sharedCreatureGeos.titanHalo} material={matHalo} />
        {[0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2].map((ang, i) => (
          <mesh
            key={i}
            geometry={sharedCreatureGeos.titanHaloSpike}
            material={matGoldCrown}
            position={[Math.cos(ang) * 0.55, Math.sin(ang) * 0.55, 0]}
            rotation={[0, 0, ang - Math.PI / 2]}
          />
        ))}
      </group>

      {/* 4 Alas Cósmicas Curvas Fluidas en abanico */}
      <group position={[-0.42, 1.25, -0.15]} rotation={[0.2, 0.5, 0.6]}>
        <mesh geometry={sharedCreatureGeos.titanUpperWing} material={matWingUpper} castShadow />
      </group>
      <group position={[-0.32, 0.85, -0.12]} rotation={[0.1, 0.3, 0.8]}>
        <mesh geometry={sharedCreatureGeos.titanLowerWing} material={matWingLower} castShadow />
      </group>

      <group position={[0.42, 1.25, -0.15]} rotation={[0.2, -0.5, -0.6]}>
        <mesh geometry={sharedCreatureGeos.titanUpperWing} material={matWingUpper} castShadow />
      </group>
      <group position={[0.32, 0.85, -0.12]} rotation={[0.1, -0.3, -0.8]}>
        <mesh geometry={sharedCreatureGeos.titanLowerWing} material={matWingLower} castShadow />
      </group>

      {/* Piernas acorazadas musculosas */}
      <group position={[-0.24, 0.38, 0]}>
        <mesh geometry={sharedCreatureGeos.titanLeg} material={matLeg} castShadow />
        <mesh geometry={sharedCreatureGeos.titanBoot} material={matBoot} position={[0, -0.28, 0.08]} castShadow />
      </group>
      <group position={[0.24, 0.38, 0]}>
        <mesh geometry={sharedCreatureGeos.titanLeg} material={matLeg} castShadow />
        <mesh geometry={sharedCreatureGeos.titanBoot} material={matBoot} position={[0, -0.28, 0.08]} castShadow />
      </group>

      {/* Torso imponente */}
      <mesh geometry={sharedCreatureGeos.titanTorso} material={matTorso} position={[0, 0.86, 0]} castShadow />

      {/* Núcleo de Supernova Cósmico pulsante */}
      <group position={[0, 0.94, 0.28]}>
        <mesh geometry={sharedCreatureGeos.titanCoreRing} material={matGoldCrown} rotation={[Math.PI / 2, 0, 0]} />
        <mesh geometry={sharedCreatureGeos.titanCoreOrb} material={matCoreOrb} />
      </group>

      {/* Hombreras dobles divinas */}
      <mesh geometry={sharedCreatureGeos.titanPauldron} material={matPauldron} position={[-0.48, 1.15, 0]} castShadow />
      <mesh geometry={sharedCreatureGeos.titanPauldron} material={matPauldron} position={[0.48, 1.15, 0]} castShadow />

      {/* Cabeza y visera astral */}
      <mesh geometry={sharedCreatureGeos.titanHead} material={matHead} position={[0, 1.36, 0]} castShadow />
      <mesh
        geometry={sharedCreatureGeos.titanVisor}
        material={matVisor}
        position={[0, 1.36, 0.17]}
        rotation={[Math.PI / 2, 0, 0]}
      />

      {/* Gran Cetro Astral del Juicio */}
      <group position={[0.55, 0.9, 0.15]} rotation={[0.2, 0, -0.1]}>
        <mesh geometry={sharedCreatureGeos.titanScepterShaft} material={matScepterShaft} castShadow />
        <group position={[0, 0.95, 0]}>
          <mesh geometry={sharedCreatureGeos.titanScepterRing} material={matGoldCrown} rotation={[Math.PI / 2, 0, 0]} />
          <mesh geometry={sharedCreatureGeos.titanScepterOrb} material={matScepterOrb} />
        </group>
      </group>
    </group>
  );
}
