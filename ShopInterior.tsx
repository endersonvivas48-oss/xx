import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { gameAudio } from './utils';
import { markGeometryAsShared } from './ThreeSceneCleanup';
import { isMobileOptimizationTarget } from './glbRuntimeOptimizer';
import { useInteriorNavigation } from './useInteriorNavigation';
import { InteriorShell, InteriorNpcItem } from './InteriorShell';

export interface ShopDialogueData {
  speaker: string;
  role: string;
  text: string;
  actionText?: string;
  action?: () => void;
  avatarImgUrl?: string;
  candidateAvatarUrls?: string[];
}

interface ShopInteriorProps {
  playerName: string;
  onExitShop: () => void;
  onOpenStoreCatalog: () => void;
  isModalActive?: boolean;
  activeDialogue: ShopDialogueData | null;
  setActiveDialogue: (d: ShopDialogueData | null) => void;
}

/**
 * Geometrías cacheadas para la Tienda Arcana Medieval
 * Estantes de madera, frascos de pociones brillantes, grimorios antiguos de cuero,
 * cristales mágicos, mostrador de hierro oscuro con balanza de latón y monedas de oro.
 */
const shopFloorGeo = markGeometryAsShared(new THREE.CylinderGeometry(18.0, 18.6, 0.4, 30));
const velvetCarpetGeo = markGeometryAsShared(new THREE.PlaneGeometry(5.4, 22));
const shopRotundaWallGeo = markGeometryAsShared(new THREE.CylinderGeometry(17.5, 17.8, 11.5, 30, 1, true, Math.PI / 2, Math.PI));
const shopCorniceGeo = markGeometryAsShared(new THREE.TorusGeometry(17.5, 0.38, 6, 30, Math.PI));
const counterCurveGeo = markGeometryAsShared(new THREE.CylinderGeometry(6.6, 7.2, 1.45, 24, 1, false, Math.PI / 2, Math.PI));
const counterTrimGeo = markGeometryAsShared(new THREE.TorusGeometry(7.3, 0.08, 6, 24, Math.PI));
const columnBaseGeo = markGeometryAsShared(new THREE.CylinderGeometry(0.52, 0.62, 0.75, 10));
const columnShaftGeo = markGeometryAsShared(new THREE.CylinderGeometry(0.35, 0.38, 8.2, 10));
const timberBeamGeo = markGeometryAsShared(new THREE.BoxGeometry(0.48, 0.55, 35));
const timberCrossBeamGeo = markGeometryAsShared(new THREE.BoxGeometry(35, 0.48, 0.55));

// Mobiliario arcano
const shelfBackGeo = markGeometryAsShared(new THREE.BoxGeometry(4.2, 5.2, 0.4));
const shelfPlankGeo = markGeometryAsShared(new THREE.BoxGeometry(4.0, 0.12, 0.85));
const potionFlaskGeo = markGeometryAsShared(new THREE.CylinderGeometry(0.12, 0.18, 0.45, 10));
const potionSphericalGeo = markGeometryAsShared(new THREE.SphereGeometry(0.18, 10, 10));
const bookGeo = markGeometryAsShared(new THREE.BoxGeometry(0.65, 0.14, 0.45));
const crystalShardGeo = markGeometryAsShared(new THREE.OctahedronGeometry(0.35, 0));
const scaleBaseGeo = markGeometryAsShared(new THREE.CylinderGeometry(0.25, 0.3, 0.1, 10));
const scalePillarGeo = markGeometryAsShared(new THREE.CylinderGeometry(0.04, 0.04, 0.7, 8));
const scaleBeamGeo = markGeometryAsShared(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 8));
const coinPileGeo = markGeometryAsShared(new THREE.CylinderGeometry(0.22, 0.25, 0.12, 10));
const leadedWindowFrameGeo = markGeometryAsShared(new THREE.BoxGeometry(1.6, 2.6, 0.15));
const leadedGlassPaneGeo = markGeometryAsShared(new THREE.PlaneGeometry(1.4, 2.4));

export function ShopInterior({
  playerName,
  onExitShop,
  onOpenStoreCatalog,
  isModalActive = false,
  activeDialogue,
  setActiveDialogue,
}: ShopInteriorProps) {
  const isInputBlocked = Boolean(isModalActive || activeDialogue);

  // Efecto de niebla atmosférica y polvo de maná volumétrico
  const manaDustPointsRef = useRef<THREE.Points>(null);
  const crystalPulsingLightRef = useRef<THREE.PointLight>(null);
  const particleAccumRef = useRef(0);
  const isMobile = isMobileOptimizationTarget();

  const manaDustData = useMemo(() => {
    const count = 60;
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 22;
      positions[i * 3 + 1] = Math.random() * 8.0 + 0.4;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20 - 1.5;
      speeds[i] = 0.15 + Math.random() * 0.35;
    }
    return { positions, speeds, count };
  }, []);

  const shopNpcs = [
    {
      id: 'merchant_solomon',
      name: 'Solomon el Mercader',
      title: 'Maestro de Dados y Reliquias',
      role: 'MERCHANT' as const,
      pos: [0, 0, -6.5] as [number, number, number],
      color: '#c084fc',
      dialogue:
        '¡Bienvenido a mi Gran Bazar Arcano, ' +
        playerName +
        '! Frascos de maná destilado, dados tallados en meteorito astral y tomos de encantamiento descansan en mis vitrinas. ¿Examinamos el Catálogo de Compra o buscas una tasación oficial?',
      hasCatalogAction: true,
      portraits: [
        'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main/solomon.webp',
        'https://raw.githubusercontent.com/endersonvivas48-oss/main/main/solomon.webp',
        'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main/solomon.jpg',
        'https://raw.githubusercontent.com/endersonvivas48-oss/main/main/solomon.jpg',
        'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/imagnpc@main/solomon.jpg',
        'https://raw.githubusercontent.com/endersonvivas48-oss/imagnpc/main/solomon.jpg',
        'https://raw.githubusercontent.com/endersonvivas48-oss/imagnpc/main/solomon.png',
        'https://raw.githubusercontent.com/endersonvivas48-oss/imagnpc/main/mercader.jpg',
        'https://raw.githubusercontent.com/endersonvivas48-oss/imagnpc/main/mercader.png',
        'https://raw.githubusercontent.com/endersonvivas48-oss/imagnpc/main/gladiador_mercader.jpg',
        'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/gladiador@main/portraits/gladiador_mercader.jpg',
        'https://raw.githubusercontent.com/endersonvivas48-oss/gladiador/main/portraits/gladiador_mercader.jpg',
        'https://raw.githubusercontent.com/endersonvivas48-oss/gladiador/main/portraits/gladiador_solomon.jpg',
        'https://raw.githubusercontent.com/endersonvivas48-oss/gladiador/main/portraits/gladiador_darian.jpg',
        './assets/imagnpc/solomon.jpg',
        './assets/imagnpc/solomon.png',
        './assets/imagnpc/mercader.jpg',
        './assets/imagnpc/mercader.png',
        './assets/solomon.jpg',
        './assets/mercader.jpg',
      ],
    },
    {
      id: 'gem_collector_silas',
      name: 'Silas el Joyero',
      title: 'Tasador de Orbes Legendarios',
      role: 'CITIZEN' as const,
      pos: [-8.5, 0, -0.5] as [number, number, number],
      color: '#38bdf8',
      dialogue:
        'Los orbes con ranura en dados épicos multiplican tus estadísticas de ataque y resistencia. Si encuentras un Orbe Cósmico o de Fuego, no dudes en engarzarlo en tu mejor dado en el taller.',
      portraits: [
        'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main/silas.webp',
        'https://raw.githubusercontent.com/endersonvivas48-oss/main/main/silas.webp',
        'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main/silas.jpg',
        'https://raw.githubusercontent.com/endersonvivas48-oss/main/main/silas.jpg',
        'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/imagnpc@main/silas.jpg',
        'https://raw.githubusercontent.com/endersonvivas48-oss/imagnpc/main/silas.jpg',
        'https://raw.githubusercontent.com/endersonvivas48-oss/imagnpc/main/silas.png',
        'https://raw.githubusercontent.com/endersonvivas48-oss/imagnpc/main/gladiador_silas.jpg',
        'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/gladiador@main/portraits/gladiador_silas.jpg',
        'https://raw.githubusercontent.com/endersonvivas48-oss/gladiador/main/portraits/gladiador_silas.jpg',
        'https://raw.githubusercontent.com/endersonvivas48-oss/gladiador/main/portraits/gladiador_erudito.jpg',
        'https://raw.githubusercontent.com/endersonvivas48-oss/gladiador/main/portraits/gladiador_kaelen.jpg',
        './assets/imagnpc/silas.jpg',
        './assets/imagnpc/silas.png',
        './assets/silas.jpg',
      ],
    },
    {
      id: 'apprentice_milo',
      name: 'Milo el Aprendiz',
      title: 'Guardián del Almacén',
      role: 'CITIZEN' as const,
      pos: [8.5, 0, -2.5] as [number, number, number],
      color: '#34d399',
      dialogue:
        '¡Cuidado con tocar los frascos de extracto de relámpago! Si se rompen desatan chispas en arco voltaico. El maestro Solomon renueva las provisiones con cada victoria en el torneo.',
      portraits: [
        'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/imagnpc@main/milo.jpg',
        'https://raw.githubusercontent.com/endersonvivas48-oss/imagnpc/main/milo.jpg',
        'https://raw.githubusercontent.com/endersonvivas48-oss/imagnpc/main/milo.png',
        'https://raw.githubusercontent.com/endersonvivas48-oss/imagnpc/main/gladiador_milo.jpg',
        'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/gladiador@main/portraits/gladiador_milo.jpg',
        'https://raw.githubusercontent.com/endersonvivas48-oss/gladiador/main/portraits/gladiador_milo.jpg',
        'https://raw.githubusercontent.com/endersonvivas48-oss/gladiador/main/portraits/gladiador_forjador.jpg',
        'https://raw.githubusercontent.com/endersonvivas48-oss/gladiador/main/portraits/gladiador_zephyr.jpg',
        './assets/imagnpc/milo.jpg',
        './assets/imagnpc/milo.png',
        './assets/milo.jpg',
      ],
    },
  ];

  const { playerRef, isPlayerWalking, nearestInteractable, setMoveTarget } =
    useInteriorNavigation({
      initialPosition: [0, 0, 6.5],
      speed: 9.2,
      bounds: { minX: -13.0, maxX: 13.0, minZ: -9.5, maxZ: 12.5 },
      footstepSound: 'stone',
      isInputBlocked,
      cameraConfig: {
        xFactor: 0.45,
        y: 9.2,
        zOffset: 10.0,
        lookAtXFactor: 0.35,
        lookAtY: 1.3,
        lookAtZOffset: -3.6,
      },
      exitZone: { minZ: 11.5, maxAbsX: 3.5, onExit: onExitShop },
      interactables: shopNpcs.map((npc) => ({
        id: npc.id,
        x: npc.pos[0],
        z: npc.pos[2],
        radius: 3.5,
      })),
      obstacles: [
        // Mostrador semicircular central
        { type: 'aabb', minX: -5.2, maxX: 5.2, minZ: -7.2, maxZ: -4.2 },
        // Estante lateral izquierdo ([ -12.2, 0, -1.5 ])
        { type: 'aabb', minX: -13.1, maxX: -11.3, minZ: -4.05, maxZ: 1.05 },
        // Estante lateral derecho ([ 12.2, 0, -1.5 ])
        { type: 'aabb', minX: 11.3, maxX: 13.1, minZ: -4.05, maxZ: 1.05 },
        // Pedestales con cristales mágicos ([ ±8.5, 0, 1.5 ])
        { type: 'circle', x: -8.5, z: 1.5, radius: 1.1 },
        { type: 'circle', x: 8.5, z: 1.5, radius: 1.1 },
      ],
    });

  useFrame((state, delta) => {
    if (isInputBlocked) return;
    const clampedDelta = Math.min(delta, 0.05);
    const time = state.clock.getElapsedTime();

    // Pulso místico cian y ámbar en los cristales
    if (crystalPulsingLightRef.current) {
      crystalPulsingLightRef.current.intensity = 24 + Math.sin(time * 3.5) * 6.0;
    }

    // Polvo de maná flotando en suspensión (con throttling ~20 Hz en móviles para evitar subir buffer cada frame)
    if (manaDustPointsRef.current) {
      let particleDelta = clampedDelta;
      if (isMobile) {
        particleAccumRef.current += clampedDelta;
        if (particleAccumRef.current < 1 / 20) return;
        particleDelta = particleAccumRef.current;
        particleAccumRef.current = 0;
      }
      const posAttr = manaDustPointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      for (let i = 0; i < manaDustData.count; i++) {
        let y = arr[i * 3 + 1];
        y += manaDustData.speeds[i] * particleDelta * 0.7;
        if (y > 9.0) {
          y = 0.4;
          arr[i * 3 + 0] = (Math.random() - 0.5) * 22;
          arr[i * 3 + 2] = (Math.random() - 0.5) * 20 - 1.5;
        }
        arr[i * 3 + 1] = y;
      }
      posAttr.needsUpdate = true;
    }
  });

  const shellNpcs: InteriorNpcItem[] = shopNpcs.map((npc) => ({
    id: npc.id,
    name: npc.name,
    title: npc.title,
    role: npc.role,
    pos: npc.pos,
    color: npc.color,
    onInteract: () => {
      if (activeDialogue) return;
      gameAudio.playCrispClick();
      if (npc.hasCatalogAction) {
        setActiveDialogue({
          speaker: npc.name,
          role: npc.title,
          text: npc.dialogue,
          actionText: '🛒 Abrir Catálogo',
          avatarImgUrl: npc.portraits?.[0],
          candidateAvatarUrls: npc.portraits,
          action: () => {
            setActiveDialogue(null);
            onOpenStoreCatalog();
          },
        });
      } else {
        setActiveDialogue({
          speaker: npc.name,
          role: npc.title,
          text: npc.dialogue,
          actionText: 'Entendido, gracias',
          avatarImgUrl: npc.portraits?.[0],
          candidateAvatarUrls: npc.portraits,
          action: () => setActiveDialogue(null),
        });
      }
    },
  }));

  return (
    <InteriorShell
      playerRef={playerRef}
      initialPlayerPos={[0, 0, 6.5]}
      isPlayerWalking={isPlayerWalking}
      nearestInteractable={nearestInteractable}
      exitConfig={{
        position: [0, 1.8, 11.8],
        distanceFactor: 18,
        label: 'SALIR A LA CIUDAD',
        visible: !isInputBlocked,
        onExit: onExitShop,
      }}
      npcs={shellNpcs}
      showNpcs={!isModalActive}
      showNpcLabels={!isInputBlocked}
      npcLabelDistanceFactor={18}
      npcTheme="purple"
      disableNpcClicks={Boolean(activeDialogue)}
    >
      {/* Atmósfera de Fantasía Oscura: Mármol carbón, violeta abisal, acentos cian y ámbar */}
      <color attach="background" args={['#0a0614']} />
      <ambientLight intensity={1.4} color="#581c87" />
      <directionalLight position={[0, 22, 8]} intensity={2.2} color="#f8fafc" />

      {/* Iluminación dramática optimizada para móviles: Luz principal de mostrador y pulso místico */}
      <pointLight position={[0, 4.8, -6.5]} intensity={42} color="#c084fc" distance={24} decay={1.4} />
      <pointLight ref={crystalPulsingLightRef} position={[-8.5, 4.2, 0.5]} intensity={26} color="#06b6d4" distance={18} decay={1.5} />

      {/* Polvo de maná mágico y neblina volumétrica */}
      <points ref={manaDustPointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[manaDustData.positions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.14}
          color="#38bdf8"
          transparent
          opacity={0.7}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* 1. Suelo Curvo Monumental de Mármol Oscuro Pulido */}
      <mesh
        geometry={shopFloorGeo}
        position={[0, -0.2, 0]}
        receiveShadow
        onPointerDown={(e) => {
          if (isInputBlocked) return;
          e.stopPropagation();
          setMoveTarget(e.point.x, e.point.z);
        }}
      >
        <meshStandardMaterial color="#1a0e2e" roughness={0.3} metalness={0.45} />
      </mesh>

      {/* 2. Alfombra de Terciopelo Púrpura Abisal con Bordes Dorados */}
      <mesh geometry={velvetCarpetGeo} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 1.2]}>
        <meshStandardMaterial color="#4c1d95" roughness={0.75} />
      </mesh>

      {/* 3. Rotonda Curva del Bazar Arcano */}
      <mesh geometry={shopRotundaWallGeo} position={[0, 5.8, 0]} rotation={[0, 0, 0]}>
        <meshStandardMaterial color="#110722" roughness={0.88} side={THREE.DoubleSide} />
      </mesh>
      {/* Moldura de la Cornisa en Bronce Envejecido */}
      <mesh geometry={shopCorniceGeo} position={[0, 11.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#b45309" metalness={0.65} roughness={0.4} />
      </mesh>

      {/* Vigas Macizas de Roble Oscuro Arcano */}
      <mesh geometry={timberBeamGeo} position={[0, 11.0, 0]} castShadow>
        <meshStandardMaterial color="#170c04" roughness={0.85} />
      </mesh>
      <mesh geometry={timberBeamGeo} position={[-5.8, 11.0, 0]} castShadow>
        <meshStandardMaterial color="#170c04" roughness={0.85} />
      </mesh>
      <mesh geometry={timberBeamGeo} position={[5.8, 11.0, 0]} castShadow>
        <meshStandardMaterial color="#170c04" roughness={0.85} />
      </mesh>
      <mesh geometry={timberCrossBeamGeo} position={[0, 10.8, -4.0]} castShadow>
        <meshStandardMaterial color="#1a0e05" roughness={0.85} />
      </mesh>
      <mesh geometry={timberCrossBeamGeo} position={[0, 10.8, 4.0]} castShadow>
        <meshStandardMaterial color="#1a0e05" roughness={0.85} />
      </mesh>

      {/* Ventanas Arqueadas de Vidrio Emplomado con Haces de Luz */}
      {[-9.5, 9.5].map((wx, wIdx) => (
        <group key={wIdx} position={[wx, 5.2, -10.5]} rotation={[0, wIdx === 0 ? 0.35 : -0.35, 0]}>
          <mesh geometry={leadedWindowFrameGeo}>
            <meshStandardMaterial color="#1e293b" metalness={0.85} roughness={0.3} />
          </mesh>
          <mesh geometry={leadedGlassPaneGeo} position={[0, 0, 0.05]}>
            <meshStandardMaterial
              color={wIdx === 0 ? '#06b6d4' : '#f59e0b'}
              emissive={wIdx === 0 ? '#0891b2' : '#d97706'}
              emissiveIntensity={2.5}
              roughness={0.15}
              transparent
              opacity={0.85}
            />
          </mesh>
        </group>
      ))}

      {/* Columnatas de Piedra Violeta Oscura */}
      {[-6.8, -2.8, 2.8, 6.8].map((cx, idx) => (
        <group key={idx} position={[cx, 0, -9.5]}>
          <mesh geometry={columnBaseGeo} position={[0, 0.38, 0]} castShadow>
            <meshStandardMaterial color="#2e1065" roughness={0.5} />
          </mesh>
          <mesh geometry={columnShaftGeo} position={[0, 4.4, 0]} castShadow>
            <meshStandardMaterial color="#3b0764" roughness={0.4} metalness={0.25} />
          </mesh>
          <mesh geometry={columnBaseGeo} position={[0, 8.5, 0]} rotation={[Math.PI, 0, 0]}>
            <meshStandardMaterial color="#f59e0b" metalness={0.85} roughness={0.3} />
          </mesh>
        </group>
      ))}

      {/* ESTANTES DE MADERA REPLETOS DE FRASCOS DE POCIONES BRILLANTES Y GRIMORIOS */}
      {/* Estante Lateral Izquierdo (Oeste) */}
      <group position={[-12.2, 0, -1.5]} rotation={[0, Math.PI / 2, 0]}>
        <mesh geometry={shelfBackGeo} position={[0, 2.6, -0.2]}>
          <meshStandardMaterial color="#241006" roughness={0.8} />
        </mesh>
        {/* Baldas y frascos de pociones con brillo cian y amatista */}
        {[0.8, 2.2, 3.6].map((sy, sIdx) => (
          <group key={sIdx} position={[0, sy, 0]}>
            <mesh geometry={shelfPlankGeo}>
              <meshStandardMaterial color="#3a1a09" roughness={0.7} />
            </mesh>
            {/* Pociones en la balda */}
            <mesh geometry={potionFlaskGeo} position={[-1.2, 0.28, 0]}>
              <meshStandardMaterial color="#06b6d4" emissive="#0891b2" emissiveIntensity={2.4} roughness={0.1} />
            </mesh>
            <mesh geometry={potionSphericalGeo} position={[-0.5, 0.22, 0]}>
              <meshStandardMaterial color="#c084fc" emissive="#9333ea" emissiveIntensity={2.2} roughness={0.1} />
            </mesh>
            <mesh geometry={potionFlaskGeo} position={[0.4, 0.28, 0]}>
              <meshStandardMaterial color="#10b981" emissive="#059669" emissiveIntensity={2.2} roughness={0.1} />
            </mesh>
            {/* Libros de hechizos encuadernados en cuero */}
            <mesh geometry={bookGeo} position={[1.2, 0.15, 0]} rotation={[0, 0.1, 0]}>
              <meshStandardMaterial color="#7f1d1d" roughness={0.65} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Estante Lateral Derecho (Este) */}
      <group position={[12.2, 0, -1.5]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh geometry={shelfBackGeo} position={[0, 2.6, -0.2]}>
          <meshStandardMaterial color="#241006" roughness={0.8} />
        </mesh>
        {[0.8, 2.2, 3.6].map((sy, sIdx) => (
          <group key={sIdx} position={[0, sy, 0]}>
            <mesh geometry={shelfPlankGeo}>
              <meshStandardMaterial color="#3a1a09" roughness={0.7} />
            </mesh>
            <mesh geometry={potionFlaskGeo} position={[-1.0, 0.28, 0]}>
              <meshStandardMaterial color="#f59e0b" emissive="#d97706" emissiveIntensity={2.4} roughness={0.1} />
            </mesh>
            <mesh geometry={potionSphericalGeo} position={[-0.2, 0.22, 0]}>
              <meshStandardMaterial color="#ec4899" emissive="#db2777" emissiveIntensity={2.2} roughness={0.1} />
            </mesh>
            <mesh geometry={crystalShardGeo} position={[0.7, 0.35, 0]} rotation={[0.2, 0.4, 0.3]}>
              <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={3.2} roughness={0.05} />
            </mesh>
            <mesh geometry={bookGeo} position={[1.4, 0.15, 0]} rotation={[0, -0.15, 0]}>
              <meshStandardMaterial color="#1e1b4b" roughness={0.65} />
            </mesh>
          </group>
        ))}
      </group>

      {/* 5. Gran Mostrador Semicircular de Hierro Oscuro y Caoba */}
      <mesh geometry={counterCurveGeo} position={[0, 0.72, -5.5]}>
        <meshStandardMaterial color="#1e1b2e" roughness={0.45} metalness={0.6} />
      </mesh>
      <mesh geometry={counterTrimGeo} position={[0, 1.45, -5.5]} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#f59e0b" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* BALANZA DE LATÓN Y MONEDAS DE ORO SOBRE EL MOSTRADOR */}
      <group position={[-1.8, 1.5, -4.6]}>
        <mesh geometry={scaleBaseGeo}>
          <meshStandardMaterial color="#d97706" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh geometry={scalePillarGeo} position={[0, 0.35, 0]}>
          <meshStandardMaterial color="#f59e0b" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh geometry={scaleBeamGeo} position={[0, 0.65, 0]} rotation={[0, 0, Math.PI / 2]}>
          <meshStandardMaterial color="#f59e0b" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>

      {/* Pilas de Monedas de Oro relucientes */}
      <mesh geometry={coinPileGeo} position={[-0.8, 1.5, -4.6]}>
        <meshStandardMaterial color="#fbbf24" metalness={0.95} roughness={0.15} />
      </mesh>
      <mesh geometry={coinPileGeo} position={[1.5, 1.5, -4.6]}>
        <meshStandardMaterial color="#fbbf24" metalness={0.95} roughness={0.15} />
      </mesh>

      {/* Tomo de Encantamientos Abierto en el centro del mostrador */}
      <group position={[0.3, 1.52, -4.6]} rotation={[-0.2, 0, 0]}>
        <mesh geometry={bookGeo}>
          <meshStandardMaterial color="#450a0a" roughness={0.7} />
        </mesh>
      </group>

      {/* Cristales Mágicos Flotantes sobre Pedestales (resplandor simulado con emisión) */}
      <group position={[-8.5, 0, 1.5]}>
        <mesh geometry={columnBaseGeo} position={[0, 0.6, 0]}>
          <meshStandardMaterial color="#1e1b4b" roughness={0.5} />
        </mesh>
        <mesh geometry={crystalShardGeo} position={[0, 1.8, 0]} rotation={[0.4, 0.5, 0.2]}>
          <meshStandardMaterial color="#06b6d4" emissive="#0891b2" emissiveIntensity={4.0} roughness={0.1} />
        </mesh>
      </group>

      <group position={[8.5, 0, 1.5]}>
        <mesh geometry={columnBaseGeo} position={[0, 0.6, 0]}>
          <meshStandardMaterial color="#1e1b4b" roughness={0.5} />
        </mesh>
        <mesh geometry={crystalShardGeo} position={[0, 1.8, 0]} rotation={[-0.3, 0.6, -0.2]}>
          <meshStandardMaterial color="#f59e0b" emissive="#d97706" emissiveIntensity={4.0} roughness={0.1} />
        </mesh>
      </group>

    </InteriorShell>
  );
}
