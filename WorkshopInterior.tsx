import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { gameAudio } from './utils';
import { markGeometryAsShared } from './ThreeSceneCleanup';
import { isMobileOptimizationTarget } from './glbRuntimeOptimizer';
import { useInteriorNavigation } from './useInteriorNavigation';
import { InteriorShell, InteriorNpcItem } from './InteriorShell';

export interface WorkshopDialogueData {
  speaker: string;
  role: string;
  text: string;
  actionText?: string;
  action?: () => void;
  secondaryActionText?: string;
  secondaryAction?: () => void;
  avatarImgUrl?: string;
  candidateAvatarUrls?: string[];
}

interface WorkshopInteriorProps {
  playerName: string;
  isForgeUnlocked?: boolean;
  onExitWorkshop: () => void;
  onOpenWorkshopCatalog: () => void;
  onOpenForgeCatalog: () => void;
  isModalActive?: boolean;
  activeDialogue: WorkshopDialogueData | null;
  setActiveDialogue: (d: WorkshopDialogueData | null) => void;
}

/**
 * Geometrías y recursos cacheados para la Gran Forja y Herrería Medieval (Unreal Engine 5 Style)
 * Hogar de piedra masivo con fuego blanco/naranja al rojo vivo, yunque de hierro forjado
 * en primer plano rodeado de chispas, soportes de armas de acero recién forjadas con brillo,
 * martillos pesados y tenazas sobre bancos de roble oscuro, humo sutil y cenizas flotantes.
 */
const forgeFloorGeo = markGeometryAsShared(new THREE.CylinderGeometry(19.0, 19.6, 0.45, 30));
const stoneRunwayGeo = markGeometryAsShared(new THREE.PlaneGeometry(5.4, 22));
const forgeRotundaWallGeo = markGeometryAsShared(new THREE.CylinderGeometry(18.5, 18.8, 12.5, 30, 1, true, Math.PI / 2, Math.PI));
const forgeCorniceGeo = markGeometryAsShared(new THREE.TorusGeometry(18.5, 0.4, 6, 30, Math.PI));
const forgeCounterCurveGeo = markGeometryAsShared(new THREE.CylinderGeometry(6.8, 7.4, 1.45, 24, 1, false, Math.PI / 2, Math.PI));
const columnBaseGeo = markGeometryAsShared(new THREE.CylinderGeometry(0.55, 0.68, 0.8, 10));
const columnShaftGeo = markGeometryAsShared(new THREE.CylinderGeometry(0.38, 0.42, 9.2, 10));
const timberBeamGeo = markGeometryAsShared(new THREE.BoxGeometry(0.5, 0.6, 37));
const timberCrossBeamGeo = markGeometryAsShared(new THREE.BoxGeometry(37, 0.5, 0.6));

// Hogar masivo de piedra (Stone Hearth Forge) y Fuego blanco incandescente
const hearthCaveGeo = markGeometryAsShared(new THREE.SphereGeometry(3.8, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.5));
const hearthFlueGeo = markGeometryAsShared(new THREE.BoxGeometry(3.2, 6.8, 2.2));
const whiteHotCoreGeo = markGeometryAsShared(new THREE.SphereGeometry(1.6, 14, 14));

// Yunque pesado de hierro gastado en primer plano (Worn Iron Anvil)
const anvilBlockGeo = markGeometryAsShared(new THREE.CylinderGeometry(1.2, 1.45, 0.8, 12));
const anvilHornGeo = markGeometryAsShared(new THREE.ConeGeometry(0.42, 1.2, 10));
const anvilBodyGeo = markGeometryAsShared(new THREE.BoxGeometry(1.5, 0.7, 0.85));

// Bancos de roble oscuro y estantes de armas incandescentes
const workbenchGeo = markGeometryAsShared(new THREE.BoxGeometry(3.6, 0.9, 1.3));
const weaponRackPlankGeo = markGeometryAsShared(new THREE.BoxGeometry(2.8, 0.12, 0.5));
const swordBladeGeo = markGeometryAsShared(new THREE.BoxGeometry(0.12, 1.8, 0.04));
const swordCrossguardGeo = markGeometryAsShared(new THREE.BoxGeometry(0.45, 0.08, 0.08));
const heavyHammerHeadGeo = markGeometryAsShared(new THREE.BoxGeometry(0.42, 0.28, 0.26));
const heavyHammerHandleGeo = markGeometryAsShared(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 8));
const tongsGeo = markGeometryAsShared(new THREE.BoxGeometry(0.08, 0.75, 0.08));

export function WorkshopInterior({
  playerName,
  isForgeUnlocked = false,
  onExitWorkshop,
  onOpenWorkshopCatalog,
  onOpenForgeCatalog,
  isModalActive = false,
  activeDialogue,
  setActiveDialogue,
}: WorkshopInteriorProps) {
  const isInputBlocked = Boolean(isModalActive || activeDialogue);

  // Fuego al rojo blanco parpadeante y chispas/cenizas flotantes
  const whiteHotLightRef = useRef<THREE.PointLight>(null);
  const anvilSparksLightRef = useRef<THREE.PointLight>(null);
  const sparkPointsRef = useRef<THREE.Points>(null);
  const particleAccumRef = useRef(0);
  const isMobile = isMobileOptimizationTarget();

  // Pre-generar partículas de chispas incandescentes y cenizas en suspensión
  const sparkData = useMemo(() => {
    const count = 70;
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 24;
      positions[i * 3 + 1] = Math.random() * 8.5 + 0.3;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 22 - 1.5;
      speeds[i] = 0.3 + Math.random() * 0.6;
    }
    return { positions, speeds, count };
  }, []);

  const workshopNpcs = [
    {
      id: 'blacksmith_vulkan',
      name: 'Maestro Vulkan',
      title: 'Herrero de Dados Ancestrales',
      role: 'CHALLENGER' as const,
      pos: [0, 0, -5.8] as [number, number, number],
      color: '#f97316',
      dialogue:
        '¡Siente el calor de las brasas, ' +
        playerName +
        '! En este hogar fundimos el acero de batalla y engarzamos orbes elementales en tus dados. ¿Examinamos la mesa de engarce o buscas fundir dados en la Fragua de Meteorito?',
      hasWorkshopAction: true,
      hasForgeAction: true,
      portraits: [
        'https://raw.githubusercontent.com/endersonvivas48-oss/main/main/vulkan.jpg',
        'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main/vulkan.jpg',
        'https://raw.githubusercontent.com/endersonvivas48-oss/main/main/forjador.jpg',
        'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main/forjador.jpg',
        './assets/imagnpc/vulkan.jpg',
        './assets/vulkan.jpg',
      ],
    },
    {
      id: 'runesmith_brant',
      name: 'Brant el Grabador',
      title: 'Artesano de Ranuras Arcanas',
      role: 'CITIZEN' as const,
      pos: [-9.0, 0, 1.0] as [number, number, number],
      color: '#38bdf8',
      dialogue:
        'Cada dado alberga orbes según su rareza: los normales no tienen ranuras, los raros tienen 1, los épicos 2 y los legendarios hasta 3. No mezcles elementos incompatibles sin consultar el grimorio.',
      portraits: [
        'https://raw.githubusercontent.com/endersonvivas48-oss/main/main/brant.jpg',
        'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main/brant.jpg',
        './assets/imagnpc/brant.jpg',
        './assets/brant.jpg',
      ],
    },
    {
      id: 'smelter_tarek',
      name: 'Tarek el Fundidor',
      title: 'Custodio del Horno de Lava',
      role: 'CITIZEN' as const,
      pos: [9.0, 0, 1.0] as [number, number, number],
      color: '#ef4444',
      dialogue: isForgeUnlocked
        ? 'El mineral de meteorito arde a más de dos mil grados en el crisol. Solo con ese metal templado podemos moldear los dados de rango Titán en la Fragua de Meteorito.'
        : 'El horno de lava de meteorito aún está sellado por la Orden. Para desbloquear la Gran Fragua de Dados y Orbes debes avanzar y conquistar las campañas avanzadas del reino.',
      portraits: [
        'https://raw.githubusercontent.com/endersonvivas48-oss/main/main/tarek.jpg',
        'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main/tarek.jpg',
        './assets/imagnpc/tarek.jpg',
        './assets/tarek.jpg',
      ],
    },
  ];

  const { playerRef, isPlayerWalking, nearestInteractable, setMoveTarget } =
    useInteriorNavigation({
      initialPosition: [0, 0, 7.0],
      speed: 9.2,
      bounds: { minX: -13.5, maxX: 13.5, minZ: -9.5, maxZ: 12.5 },
      footstepSound: 'stone',
      isInputBlocked,
      cameraConfig: {
        xFactor: 0.45,
        y: 9.5,
        zOffset: 10.5,
        lookAtXFactor: 0.35,
        lookAtY: 1.3,
        lookAtZOffset: -3.5,
      },
      exitZone: { minZ: 11.8, maxAbsX: 3.5, onExit: onExitWorkshop },
      interactables: workshopNpcs.map((npc) => ({
        id: npc.id,
        x: npc.pos[0],
        z: npc.pos[2],
        radius: 3.5,
      })),
      obstacles: [
        // Gran mesa semicircular de forja
        { type: 'aabb', minX: -5.2, maxX: 5.2, minZ: -7.2, maxZ: -4.2 },
        // Yunque pesado de hierro ([ -2.5, 0, 2.0 ])
        { type: 'circle', x: -2.5, z: 2.0, radius: 1.85 },
        // Banco y armero lateral izquierdo ([ -11.5, 0, -1.5 ])
        { type: 'aabb', minX: -12.6, maxX: -10.4, minZ: -3.75, maxZ: 0.75 },
        // Banco y crisol de lava lateral derecho ([ 11.5, 0, -1.5 ])
        { type: 'aabb', minX: 9.95, maxX: 13.05, minZ: -3.75, maxZ: 0.75 },
      ],
    });

  useFrame((state, delta) => {
    if (isInputBlocked) return;
    const clampedDelta = Math.min(delta, 0.05);
    const time = state.clock.getElapsedTime();

    // Efecto de fuego blanco/naranja rugiente
    if (whiteHotLightRef.current) {
      const flicker = Math.sin(time * 11.0) * 6.0 + Math.cos(time * 23.4) * 4.0;
      whiteHotLightRef.current.intensity = 55 + flicker;
    }

    // Chispas del yunque en primer plano
    if (anvilSparksLightRef.current) {
      anvilSparksLightRef.current.intensity = 18 + Math.sin(time * 14.0) * 8.0;
    }

    // Animación de partículas de ceniza y chispas flotantes (con throttling ~20 Hz en móviles)
    if (sparkPointsRef.current) {
      let particleDelta = clampedDelta;
      if (isMobile) {
        particleAccumRef.current += clampedDelta;
        if (particleAccumRef.current < 1 / 20) return;
        particleDelta = particleAccumRef.current;
        particleAccumRef.current = 0;
      }
      const posAttr = sparkPointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      for (let i = 0; i < sparkData.count; i++) {
        let y = arr[i * 3 + 1];
        y += sparkData.speeds[i] * particleDelta * 1.1;
        if (y > 9.5) {
          y = 0.3;
          arr[i * 3 + 0] = (Math.random() - 0.5) * 24;
          arr[i * 3 + 2] = (Math.random() - 0.5) * 22 - 1.5;
        }
        arr[i * 3 + 1] = y;
      }
      posAttr.needsUpdate = true;
    }
  });

  const shellNpcs: InteriorNpcItem[] = workshopNpcs.map((npc) => ({
    id: npc.id,
    name: npc.name,
    title: npc.title,
    role: npc.role,
    pos: npc.pos,
    color: npc.color,
    onInteract: () => {
      if (activeDialogue) return;
      gameAudio.playCrispClick();
      if (npc.hasWorkshopAction) {
        setActiveDialogue({
          speaker: npc.name,
          role: npc.title,
          text: npc.dialogue,
          actionText: '⚙️ Abrir Taller de Dados',
          secondaryActionText: npc.hasForgeAction
            ? isForgeUnlocked
              ? '🔥 Fragua de Meteorito'
              : '🔒 Fragua de Meteorito'
            : undefined,
          avatarImgUrl: npc.portraits?.[0],
          candidateAvatarUrls: npc.portraits,
          action: () => {
            setActiveDialogue(null);
            onOpenWorkshopCatalog();
          },
          secondaryAction: npc.hasForgeAction
            ? () => {
                setActiveDialogue(null);
                onOpenForgeCatalog();
              }
            : undefined,
        });
      } else if (npc.id === 'smelter_tarek') {
        if (isForgeUnlocked) {
          setActiveDialogue({
            speaker: npc.name,
            role: npc.title,
            text: npc.dialogue,
            actionText: '🔥 Abrir Fragua de Meteorito',
            avatarImgUrl: npc.portraits?.[0],
            candidateAvatarUrls: npc.portraits,
            action: () => {
              setActiveDialogue(null);
              onOpenForgeCatalog();
            },
          });
        } else {
          setActiveDialogue({
            speaker: npc.name,
            role: npc.title,
            text: npc.dialogue,
            actionText: '🔒 Fragua Bloqueada (Supera Campañas)',
            avatarImgUrl: npc.portraits?.[0],
            candidateAvatarUrls: npc.portraits,
            action: () => setActiveDialogue(null),
          });
        }
      } else {
        setActiveDialogue({
          speaker: npc.name,
          role: npc.title,
          text: npc.dialogue,
          actionText: 'Entendido, maestro',
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
      initialPlayerPos={[0, 0, 7.0]}
      isPlayerWalking={isPlayerWalking}
      nearestInteractable={nearestInteractable}
      exitConfig={{
        position: [0, 1.8, 12.5],
        distanceFactor: 18,
        label: 'SALIR A LA CIUDAD',
        visible: !isInputBlocked,
        onExit: onExitWorkshop,
      }}
      npcs={shellNpcs}
      showNpcs={!isModalActive}
      showNpcLabels={!isInputBlocked}
      npcLabelDistanceFactor={18}
      npcTheme="orange"
      disableNpcClicks={Boolean(activeDialogue)}
    >
      {/* Atmósfera Cavernosa de Fantasía Oscura: Carbón, óxido y fuego al rojo vivo */}
      <color attach="background" args={['#100502']} />
      <ambientLight intensity={1.4} color="#7c2d12" />
      <directionalLight position={[0, 22, 6]} intensity={2.2} color="#ffedd5" />

      {/* Iluminación ígnea optimizada para móviles: Fuego blanco-caliente central */}
      <pointLight ref={whiteHotLightRef} position={[0, 4.2, -10.5]} intensity={60} color="#fed7aa" distance={26} decay={1.3} />
      <pointLight position={[0, 3.5, 1.5]} intensity={25} color="#f97316" distance={16} decay={1.5} />

      {/* Partículas de Chispas y Cenizas Volumétricas Flotantes */}
      <points ref={sparkPointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[sparkData.positions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.16}
          color="#fb923c"
          transparent
          opacity={0.85}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* 1. Suelo Curvo Monumental de Roca Basáltica y Escoria de Hierro */}
      <mesh
        geometry={forgeFloorGeo}
        position={[0, -0.22, 0]}
        receiveShadow
        onPointerDown={(e) => {
          if (isInputBlocked) return;
          e.stopPropagation();
          setMoveTarget(e.point.x, e.point.z);
        }}
      >
        <meshStandardMaterial color="#1c1917" roughness={0.7} metalness={0.45} />
      </mesh>

      {/* 2. Pasillo de Placas de Meteorito Templado */}
      <mesh geometry={stoneRunwayGeo} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 1.5]}>
        <meshStandardMaterial color="#110e0e" roughness={0.5} metalness={0.75} />
      </mesh>

      {/* 3. Rotonda de Piedra de Sillería Volcánica Oscura */}
      <mesh geometry={forgeRotundaWallGeo} position={[0, 6.2, 0]} rotation={[0, 0, 0]}>
        <meshStandardMaterial color="#140d0a" roughness={0.92} side={THREE.DoubleSide} />
      </mesh>
      {/* Moldura Tórica de la Cornisa en Bronce Forjado */}
      <mesh geometry={forgeCorniceGeo} position={[0, 12.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#b45309" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Vigas Macizas de Roble Oscuro y Acero (Timber Beams) */}
      <mesh geometry={timberBeamGeo} position={[0, 12.0, 0]} castShadow>
        <meshStandardMaterial color="#1c0f06" roughness={0.85} />
      </mesh>
      <mesh geometry={timberBeamGeo} position={[-6.2, 12.0, 0]} castShadow>
        <meshStandardMaterial color="#1c0f06" roughness={0.85} />
      </mesh>
      <mesh geometry={timberBeamGeo} position={[6.2, 12.0, 0]} castShadow>
        <meshStandardMaterial color="#1c0f06" roughness={0.85} />
      </mesh>
      <mesh geometry={timberCrossBeamGeo} position={[0, 11.8, -4.5]} castShadow>
        <meshStandardMaterial color="#1f1107" roughness={0.85} />
      </mesh>
      <mesh geometry={timberCrossBeamGeo} position={[0, 11.8, 4.5]} castShadow>
        <meshStandardMaterial color="#1f1107" roughness={0.85} />
      </mesh>

      {/* 4. GRAN HOGAR DE FORJA DE PIEDRA MASIVO CON FUEGO BLANCO-CALIENTE AL FONDO */}
      <group position={[0, 1.4, -11.2]}>
        {/* Hogar de piedra masivo cóncavo */}
        <mesh geometry={hearthCaveGeo} castShadow>
          <meshStandardMaterial color="#1c1917" roughness={0.95} />
        </mesh>
        {/* Conducto monumental de humos y campana de tiro */}
        <mesh geometry={hearthFlueGeo} position={[0, 4.5, 0]}>
          <meshStandardMaterial color="#292524" roughness={0.85} />
        </mesh>
        {/* Núcleo de fuego blanco-caliente rugiente (White-Hot Fire) */}
        <mesh geometry={whiteHotCoreGeo} position={[0, 0.8, 0]}>
          <meshStandardMaterial
            color="#fffbeb"
            emissive="#ffedd5"
            emissiveIntensity={5.0}
            roughness={0.1}
          />
        </mesh>
        {/* Brasas incandescentes naranjas circundantes */}
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[2.2, 2.6, 0.6, 16]} />
          <meshStandardMaterial color="#ea580c" emissive="#c2410c" emissiveIntensity={3.2} />
        </mesh>
      </group>

      {/* Columnas Monumentales de Acero Forjado y Obsidiana */}
      {[-7.2, -3.2, 3.2, 7.2].map((cx, idx) => (
        <group key={idx} position={[cx, 0, -10.5]}>
          <mesh geometry={columnBaseGeo} position={[0, 0.4, 0]} castShadow>
            <meshStandardMaterial color="#18181b" roughness={0.7} metalness={0.6} />
          </mesh>
          <mesh geometry={columnShaftGeo} position={[0, 4.8, 0]} castShadow>
            <meshStandardMaterial color="#27272a" roughness={0.5} metalness={0.7} />
          </mesh>
          <mesh geometry={columnBaseGeo} position={[0, 9.4, 0]} rotation={[Math.PI, 0, 0]}>
            <meshStandardMaterial color="#d97706" metalness={0.85} roughness={0.25} />
          </mesh>
        </group>
      ))}

      {/* 5. Mesa Semicircular de Forja del Maestro Vulkan */}
      <mesh geometry={forgeCounterCurveGeo} position={[0, 0.75, -5.5]}>
        <meshStandardMaterial color="#3f3f46" roughness={0.45} metalness={0.65} />
      </mesh>

      {/* 6. YUNQUE PESADO DE HIERRO GASTADO EN PRIMER PLANO (HEAVY WORN IRON ANVIL) */}
      <group position={[-2.5, 0, 2.0]}>
        {/* Bloque / cepo de roble donde descansa el yunque */}
        <mesh geometry={anvilBlockGeo} position={[0, 0.4, 0]} castShadow>
          <meshStandardMaterial color="#27150c" roughness={0.9} />
        </mesh>
        {/* Cuerpo del yunque de hierro macizo forjado */}
        <mesh geometry={anvilBodyGeo} position={[0, 0.95, 0]} castShadow>
          <meshStandardMaterial color="#18181b" metalness={0.9} roughness={0.35} />
        </mesh>
        {/* Punta / cuerno cónico del yunque */}
        <mesh geometry={anvilHornGeo} position={[0.9, 1.1, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <meshStandardMaterial color="#27272a" metalness={0.88} roughness={0.3} />
        </mesh>
        {/* Martillo pesado de forja apoyado sobre el yunque */}
        <group position={[-0.2, 1.35, 0]} rotation={[0, 0.3, 0.2]}>
          <mesh geometry={heavyHammerHeadGeo}>
            <meshStandardMaterial color="#09090b" metalness={0.9} roughness={0.3} />
          </mesh>
          <mesh geometry={heavyHammerHandleGeo} position={[0, -0.4, 0]}>
            <meshStandardMaterial color="#451a03" roughness={0.8} />
          </mesh>
        </group>
        {/* Tenazas de herrero apoyadas */}
        <mesh geometry={tongsGeo} position={[0.3, 1.32, 0.2]} rotation={[0, -0.4, 0]}>
          <meshStandardMaterial color="#27272a" metalness={0.85} roughness={0.4} />
        </mesh>
      </group>

      {/* 7. BANCOS DE TRABAJO DE ROBLE OSCURO (DARK OAK WORKBENCHES) Y SOPORTES DE ARMAS */}
      {/* Banco y Armero Lateral Izquierdo */}
      <group position={[-11.5, 0, -1.5]} rotation={[0, Math.PI / 2, 0]}>
        <mesh geometry={workbenchGeo} position={[0, 0.45, 0]} castShadow>
          <meshStandardMaterial color="#27150c" roughness={0.85} />
        </mesh>
        {/* Estante de armas de acero recién forjadas con brillo incandescente */}
        <mesh geometry={weaponRackPlankGeo} position={[0, 1.8, -0.4]}>
          <meshStandardMaterial color="#3a1d10" roughness={0.8} />
        </mesh>
        {/* Espadas forjadas al rojo con brillo en las hojas */}
        {[-0.8, 0, 0.8].map((sx, sIdx) => (
          <group key={sIdx} position={[sx, 2.2, -0.3]}>
            <mesh geometry={swordBladeGeo}>
              <meshStandardMaterial
                color="#ea580c"
                emissive="#f97316"
                emissiveIntensity={2.8}
                metalness={0.9}
                roughness={0.2}
              />
            </mesh>
            <mesh geometry={swordCrossguardGeo} position={[0, -0.7, 0]}>
              <meshStandardMaterial color="#18181b" metalness={0.85} roughness={0.3} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Crisol de Lava y Meteorito Lateral Derecho */}
      <group position={[11.5, 0, -1.5]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh geometry={workbenchGeo} position={[0, 0.45, 0]} castShadow>
          <meshStandardMaterial color="#27150c" roughness={0.85} />
        </mesh>
        {/* Crisol de fundición con lava al rojo vivo */}
        <mesh position={[0, 1.1, 0]}>
          <cylinderGeometry args={[0.9, 1.1, 0.8, 14]} />
          <meshStandardMaterial color="#18181b" metalness={0.8} roughness={0.4} />
        </mesh>
        <mesh position={[0, 1.45, 0]}>
          <circleGeometry args={[0.85, 14]} />
          <meshStandardMaterial
            color="#ef4444"
            emissive="#dc2626"
            emissiveIntensity={3.6}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

    </InteriorShell>
  );
}
