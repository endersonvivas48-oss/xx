import React, { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { gameAudio } from './utils';
import { markGeometryAsShared } from './ThreeSceneCleanup';
import { isMobileOptimizationTarget } from './glbRuntimeOptimizer';
import { useInteriorNavigation } from './useInteriorNavigation';
import { InteriorShell, InteriorNpcItem } from './InteriorShell';

export interface DailyContract {
  id: string;
  title: string;
  desc: string;
  targetCount: number;
  currentCount: number;
  rewardGold: number;
  rewardType: 'GOLD' | 'ORB' | 'DIE';
  rewardLabel: string;
  isCompleted: boolean;
  isClaimed: boolean;
  category: 'COMBAT' | 'TITAN' | 'SPELL' | 'VICTORY' | 'DUNGEON' | 'RECRUIT' | 'SHADOW';
  campaignRequirement?: number;
  requiredPlayerLevel?: number;
  missionTypeKey?: 'ASESINO' | 'TANQUE' | 'MAGO' | 'TRAMPERO' | 'CAMPEON' | 'DUNGEON_ABYSS' | 'RECRUIT_HONOR' | 'SHADOW_PURGE';
}

export interface TavernDialogueData {
  speaker: string;
  role: string;
  text: string;
  actionText?: string;
  action?: () => void;
  avatarImgUrl?: string;
  candidateAvatarUrls?: string[];
}

interface TavernInteriorProps {
  playerName: string;
  onExitTavern: () => void;
  contracts: DailyContract[];
  onClaimContract: (contractId: string) => void;
  onOpenSpellbook: () => void;
  onOpenCodex: () => void;
  isModalActive?: boolean;
  activeDialogue: TavernDialogueData | null;
  setActiveDialogue: (d: TavernDialogueData | null) => void;
  isContractBoardOpen: boolean;
  setIsContractBoardOpen: (b: boolean) => void;
}

/**
 * Geometrías cacheadas para la Gran Taberna Medieval Nocturna (Ampliación Espaciosa)
 * Radio expandido a 20.0 para mayor amplitud y comodidad de movimiento
 */
const tavernFloorGeo = markGeometryAsShared(new THREE.CylinderGeometry(20.0, 20.6, 0.4, 32));
const tavernCarpetGeo = markGeometryAsShared(new THREE.PlaneGeometry(5.6, 22));
const tavernRotundaWallGeo = markGeometryAsShared(new THREE.CylinderGeometry(19.5, 19.8, 12.0, 32, 1, true, Math.PI / 2, Math.PI));
const tavernCorniceGeo = markGeometryAsShared(new THREE.TorusGeometry(19.5, 0.4, 6, 32, Math.PI));
const tavernBarCurveGeo = markGeometryAsShared(new THREE.CylinderGeometry(7.2, 7.8, 1.5, 24, 1, false, Math.PI / 2, Math.PI));
const tavernBarFootrestGeo = markGeometryAsShared(new THREE.TorusGeometry(8.0, 0.09, 6, 24, Math.PI));
const tavernColumnBaseGeo = markGeometryAsShared(new THREE.CylinderGeometry(0.55, 0.68, 0.8, 10));
const tavernColumnShaftGeo = markGeometryAsShared(new THREE.CylinderGeometry(0.38, 0.42, 9.2, 10));
const timberBeamGeo = markGeometryAsShared(new THREE.BoxGeometry(0.5, 0.6, 39));
const timberCrossBeamGeo = markGeometryAsShared(new THREE.BoxGeometry(39, 0.5, 0.6));
const hearthDomeGeo = markGeometryAsShared(new THREE.SphereGeometry(3.6, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.5));
const hearthFlueGeo = markGeometryAsShared(new THREE.BoxGeometry(3.0, 6.5, 2.0));
const barrelGeo = markGeometryAsShared(new THREE.CylinderGeometry(0.65, 0.78, 1.5, 12));
const mugGeo = markGeometryAsShared(new THREE.CylinderGeometry(0.12, 0.15, 0.3, 8));
const tableTopGeo = markGeometryAsShared(new THREE.CylinderGeometry(1.7, 1.7, 0.16, 16));
const tableLegGeo = markGeometryAsShared(new THREE.CylinderGeometry(0.28, 0.38, 0.75, 10));
const benchSeatGeo = markGeometryAsShared(new THREE.BoxGeometry(2.4, 0.12, 0.6));
const lanternChainGeo = markGeometryAsShared(new THREE.CylinderGeometry(0.02, 0.02, 3.2, 6));
const lanternBodyGeo = markGeometryAsShared(new THREE.BoxGeometry(0.46, 0.68, 0.46));

export function TavernInterior({
  playerName,
  onExitTavern,
  contracts,
  onClaimContract,
  onOpenSpellbook,
  onOpenCodex,
  isModalActive = false,
  activeDialogue,
  setActiveDialogue,
  isContractBoardOpen,
  setIsContractBoardOpen,
}: TavernInteriorProps) {
  const isInputBlocked = Boolean(isModalActive || activeDialogue || isContractBoardOpen);

  // Fuego parpadeante y partículas de brasas/polvo volumétrico en suspensión
  const fireLightRef = useRef<THREE.PointLight>(null);
  const fireFlameRef = useRef<THREE.Mesh>(null);
  const emberPointsRef = useRef<THREE.Points>(null);
  const particleAccumRef = useRef(0);
  const isMobile = isMobileOptimizationTarget();

  // Pre-generar posiciones de polvo atmosférico y brasas flotantes
  const emberData = useMemo(() => {
    const count = 55;
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 24;
      positions[i * 3 + 1] = Math.random() * 8.0 + 0.3;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 22 - 1.0;
      speeds[i] = 0.2 + Math.random() * 0.4;
    }
    return { positions, speeds, count };
  }, []);

  /**
   * Disposición de NPCs completamente separada de las mesas:
   * - Tabernero Brom: detrás de la barra en [0, 0, -6.8]
   * - Capitán Valen: frente al Tablón de Contratos en [-10.5, 0, -2.5] (mesas a Z = 3.5)
   * - Darek el Tahúr: de pie junto al tonel de dados en [9.5, 0, -2.5] (mesas a Z = 3.5)
   * - Trovadora Lyra: en su tarima acústica en [6.5, 0, -6.0]
   */
  const tavernNpcs = [
    {
      id: 'barkeeper_brom',
      name: 'Tabernero Brom',
      title: 'Anfitrión de la Taberna',
      role: 'MERCHANT' as const,
      pos: [0, 0, -6.8] as [number, number, number],
      color: '#f59e0b',
      dialogue:
        '¡Saludos, ' +
        playerName +
        '! Bienvenido a la Gran Taberna del Dragón Astral. El hogar de leña y piedra calienta a los duelistas exhaustos tras luchar en la Callejuela. ¿Deseas consultar tu Libro de Hechizos o revisar el tablón de contratos?',
      hasSpellbookAction: true,
      portraits: [
        'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main/brom.webp',
        'https://raw.githubusercontent.com/endersonvivas48-oss/main/main/brom.webp',
        'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/main@main/brom.jpg',
        'https://raw.githubusercontent.com/endersonvivas48-oss/main/main/brom.jpg',
        'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/imagnpc@main/brom.jpg',
        'https://raw.githubusercontent.com/endersonvivas48-oss/imagnpc/main/brom.jpg',
        'https://raw.githubusercontent.com/endersonvivas48-oss/imagnpc/main/brom.png',
        'https://raw.githubusercontent.com/endersonvivas48-oss/imagnpc/main/gladiador_brom.jpg',
        'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/gladiador@main/portraits/gladiador_brom.jpg',
        'https://raw.githubusercontent.com/endersonvivas48-oss/gladiador/main/portraits/gladiador_brom.jpg',
        'https://raw.githubusercontent.com/endersonvivas48-oss/gladiador/main/portraits/gladiador_varek.jpg',
        'https://raw.githubusercontent.com/endersonvivas48-oss/gladiador/main/portraits/gladiador_forjador.jpg',
        './assets/imagnpc/brom.jpg',
        './assets/imagnpc/brom.png',
        './assets/brom.jpg',
        './assets/brom.png',
      ],
    },
    {
      id: 'hunter_valen',
      name: 'Capitán Valen',
      title: 'Gremio de Cazadores',
      role: 'CHALLENGER' as const,
      pos: [-10.5, 0, -2.5] as [number, number, number],
      color: '#10b981',
      dialogue:
        'Cada amanecer clavo 3 nuevos Contratos de Cazador en el gran tablón de roble al fondo. Supera los desafíos en el Coliseo o la Callejuela y vuelve a reclamar tu recompensa en oro y reliquias.',
      isContractMaster: true,
      portraits: [
        'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/imagnpc@main/valen.jpg',
        'https://raw.githubusercontent.com/endersonvivas48-oss/imagnpc/main/valen.jpg',
        'https://raw.githubusercontent.com/endersonvivas48-oss/imagnpc/main/valen.png',
        'https://raw.githubusercontent.com/endersonvivas48-oss/imagnpc/main/gladiador_valen.jpg',
        'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/gladiador@main/portraits/gladiador_valen.jpg',
        'https://raw.githubusercontent.com/endersonvivas48-oss/gladiador/main/portraits/gladiador_valen.jpg',
        'https://raw.githubusercontent.com/endersonvivas48-oss/gladiador/main/portraits/gladiador_valeria.jpg',
        'https://raw.githubusercontent.com/endersonvivas48-oss/gladiador/main/portraits/gladiador_sir_gareth.jpg',
        './assets/imagnpc/valen.jpg',
        './assets/imagnpc/valen.png',
        './assets/valen.jpg',
        './assets/valen.png',
      ],
    },
    {
      id: 'gambler_darek',
      name: 'Darek el Tahúr',
      title: 'Apostador Veterano',
      role: 'CITIZEN' as const,
      pos: [9.5, 0, -2.5] as [number, number, number],
      color: '#c084fc',
      dialogue:
        'El secreto de los dados reside en no desesperar. Si logras una tirada triple idéntica (como 3-3-3 o 5-5-5), invocarás a un Titán Ascendido que puede voltear una partida perdida en un abrir y cerrar de ojos.',
      portraits: [
        'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/imagnpc@main/darek.jpg',
        'https://raw.githubusercontent.com/endersonvivas48-oss/imagnpc/main/darek.jpg',
        'https://raw.githubusercontent.com/endersonvivas48-oss/imagnpc/main/darek.png',
        'https://raw.githubusercontent.com/endersonvivas48-oss/imagnpc/main/gladiador_darek.jpg',
        'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/gladiador@main/portraits/gladiador_darek.jpg',
        'https://raw.githubusercontent.com/endersonvivas48-oss/gladiador/main/portraits/gladiador_darek.jpg',
        'https://raw.githubusercontent.com/endersonvivas48-oss/gladiador/main/portraits/gladiador_kaelen.jpg',
        'https://raw.githubusercontent.com/endersonvivas48-oss/gladiador/main/portraits/gladiador_silas.jpg',
        './assets/imagnpc/darek.jpg',
        './assets/imagnpc/darek.png',
        './assets/darek.jpg',
        './assets/darek.png',
      ],
    },
    {
      id: 'minstrel_lyra',
      name: 'Trovadora Lyra',
      title: 'Canta-Historias Astral',
      role: 'CITIZEN' as const,
      pos: [6.5, 0, -6.0] as [number, number, number],
      color: '#ec4899',
      dialogue:
        '«Brillan los dados, ruje el dragón, arden las llamas en el viejo mesón...» ¡Ah, la gloria de los campeones! ¿Te gustaría que revise tu Códice de criaturas místicas?',
      hasCodexAction: true,
      portraits: [
        'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/imagnpc@main/lyra.jpg',
        'https://raw.githubusercontent.com/endersonvivas48-oss/imagnpc/main/lyra.jpg',
        'https://raw.githubusercontent.com/endersonvivas48-oss/imagnpc/main/lyra.png',
        'https://raw.githubusercontent.com/endersonvivas48-oss/imagnpc/main/gladiador_lyra.jpg',
        'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/gladiador@main/portraits/gladiador_lyra.jpg',
        'https://raw.githubusercontent.com/endersonvivas48-oss/gladiador/main/portraits/gladiador_lyra.jpg',
        'https://raw.githubusercontent.com/endersonvivas48-oss/gladiador/main/portraits/gladiador_bardo.jpg',
        'https://raw.githubusercontent.com/endersonvivas48-oss/gladiador/main/portraits/gladiador_lyanna.jpg',
        'https://raw.githubusercontent.com/endersonvivas48-oss/gladiador/main/portraits/gladiador_sariel.jpg',
        './assets/imagnpc/lyra.jpg',
        './assets/imagnpc/lyra.png',
        './assets/lyra.jpg',
        './assets/lyra.png',
      ],
    },
  ];

  const { playerRef, isPlayerWalking, nearestInteractable, setMoveTarget } =
    useInteriorNavigation({
      initialPosition: [0, 0, 6.0],
      speed: 9.5,
      bounds: { minX: -14.5, maxX: 14.5, minZ: -10.5, maxZ: 13.5 },
      footstepSound: 'wood',
      isInputBlocked,
      cameraConfig: {
        xFactor: 0.45,
        y: 9.8,
        zOffset: 10.5,
        lookAtXFactor: 0.3,
        lookAtY: 1.4,
        lookAtZOffset: -3.8,
      },
      exitZone: { minZ: 12.8, maxAbsX: 3.8, onExit: onExitTavern },
      interactables: [
        { id: 'CONTRACT_BOARD', x: -11.5, z: -6.2, radius: 4.0 },
        ...tavernNpcs.map((npc) => ({
          id: npc.id,
          x: npc.pos[0],
          z: npc.pos[2],
          radius: 3.5,
        })),
      ],
      obstacles: [
        // Barra curva central
        { type: 'aabb', minX: -5.5, maxX: 5.5, minZ: -7.8, maxZ: -4.5 },
        // Mesa y bancos laterales izquierdos ([ -9.5, 0, 3.5 ])
        { type: 'aabb', minX: -11.65, maxX: -7.35, minZ: 0.95, maxZ: 6.05 },
        // Mesa y bancos laterales derechos ([ 9.5, 0, 3.5 ])
        { type: 'aabb', minX: 7.35, maxX: 11.65, minZ: 0.95, maxZ: 6.05 },
      ],
    });

  useFrame((state, delta) => {
    if (isInputBlocked) return;
    const clampedDelta = Math.min(delta, 0.05);
    const time = state.clock.getElapsedTime();

    // Efecto de parpadeo orgánico del hogar de fuego (chimenea de piedra)
    if (fireLightRef.current) {
      const flicker = Math.sin(time * 8.0) * 4.5 + Math.cos(time * 17.3) * 3.0 + Math.sin(time * 29.1) * 2.0;
      fireLightRef.current.intensity = 42 + flicker;
    }
    if (fireFlameRef.current) {
      const s = 1.0 + Math.sin(time * 9.5) * 0.08 + Math.cos(time * 16.0) * 0.05;
      fireFlameRef.current.scale.set(s, s * 1.15, s);
    }

    // Animación sutil ascendente de las brasas y polvo volumétrico (con throttling ~20 Hz en móviles)
    if (emberPointsRef.current) {
      let particleDelta = clampedDelta;
      if (isMobile) {
        particleAccumRef.current += clampedDelta;
        if (particleAccumRef.current < 1 / 20) return;
        particleDelta = particleAccumRef.current;
        particleAccumRef.current = 0;
      }
      const posAttr = emberPointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      for (let i = 0; i < emberData.count; i++) {
        let y = arr[i * 3 + 1];
        y += emberData.speeds[i] * particleDelta * 0.8;
        if (y > 9.0) {
          y = 0.4;
          arr[i * 3 + 0] = (Math.random() - 0.5) * 24;
          arr[i * 3 + 2] = (Math.random() - 0.5) * 22 - 1.0;
        }
        arr[i * 3 + 1] = y;
      }
      posAttr.needsUpdate = true;
    }
  });

  const shellNpcs: InteriorNpcItem[] = tavernNpcs.map((npc) => ({
    id: npc.id,
    name: npc.name,
    title: npc.title,
    role: npc.role,
    pos: npc.pos,
    color: npc.color,
    onInteract: () => {
      if (activeDialogue || isContractBoardOpen) return;
      gameAudio.playCrispClick();
      if (npc.isContractMaster) {
        setActiveDialogue({
          speaker: npc.name,
          role: npc.title,
          text: npc.dialogue,
          actionText: '📜 Ver Tablón de Contratos',
          avatarImgUrl: npc.portraits?.[0],
          candidateAvatarUrls: npc.portraits,
          action: () => {
            setActiveDialogue(null);
            setIsContractBoardOpen(true);
          },
        });
      } else if (npc.hasSpellbookAction) {
        setActiveDialogue({
          speaker: npc.name,
          role: npc.title,
          text: npc.dialogue,
          actionText: '📖 Abrir Grimorio',
          avatarImgUrl: npc.portraits?.[0],
          candidateAvatarUrls: npc.portraits,
          action: () => {
            setActiveDialogue(null);
            onOpenSpellbook();
          },
        });
      } else if (npc.hasCodexAction) {
        setActiveDialogue({
          speaker: npc.name,
          role: npc.title,
          text: npc.dialogue,
          actionText: '📜 Abrir Códice',
          avatarImgUrl: npc.portraits?.[0],
          candidateAvatarUrls: npc.portraits,
          action: () => {
            setActiveDialogue(null);
            onOpenCodex();
          },
        });
      } else {
        setActiveDialogue({
          speaker: npc.name,
          role: npc.title,
          text: npc.dialogue,
          actionText: 'Entendido, ¡salud!',
          avatarImgUrl: npc.portraits?.[0],
          candidateAvatarUrls: npc.portraits,
          action: () => setActiveDialogue(null),
        });
      }
    },
  }));

  const nearestInteractableRef = useRef<string | null>(null);
  nearestInteractableRef.current = nearestInteractable;
  const shellNpcsRef = useRef<InteriorNpcItem[]>([]);
  shellNpcsRef.current = shellNpcs;

  useEffect(() => {
    const handleInteractKey = (e: KeyboardEvent) => {
      if (isInputBlocked) return;
      if (e.key.toLowerCase() !== 'e') return;
      const targetId = nearestInteractableRef.current;
      if (!targetId) return;

      if (targetId === 'CONTRACT_BOARD') {
        e.preventDefault();
        gameAudio.playCrispClick();
        setIsContractBoardOpen(true);
        return;
      }

      const npcTarget = shellNpcsRef.current.find((n) => n.id === targetId);
      if (npcTarget) {
        e.preventDefault();
        npcTarget.onInteract();
      }
    };

    window.addEventListener('keydown', handleInteractKey);
    return () => window.removeEventListener('keydown', handleInteractKey);
  }, [isInputBlocked, setIsContractBoardOpen]);

  return (
    <InteriorShell
      playerRef={playerRef}
      initialPlayerPos={[0, 0, 6.0]}
      isPlayerWalking={isPlayerWalking}
      nearestInteractable={nearestInteractable}
      exitConfig={{
        position: [0, 1.8, 13.5],
        distanceFactor: 18,
        label: 'SALIR A LA CIUDAD',
        visible: !isInputBlocked,
        onExit: onExitTavern,
      }}
      npcs={shellNpcs}
      showNpcs={!isModalActive}
      showNpcLabels={!isInputBlocked}
      npcLabelDistanceFactor={18}
      npcTheme="amber"
      disableNpcClicks={Boolean(activeDialogue || isContractBoardOpen)}
    >
      {/* Atmósfera Nocturna Oscura: Bronce, carbón y humo tenue */}
      <color attach="background" args={['#0e0704']} />
      <ambientLight intensity={1.3} color="#7c2d12" />
      <directionalLight position={[0, 22, 8]} intensity={1.9} color="#fdba74" castShadow={false} />

      {/* Iluminación dramática optimizada para móviles: Chimenea principal con fuego cálido */}
      <pointLight ref={fireLightRef} position={[0, 2.8, -11.5]} intensity={50} color="#ea580c" distance={28} decay={1.3} />
      <pointLight position={[0, 5.5, 1.5]} intensity={22} color="#f59e0b" distance={16} decay={1.5} />

      {/* Polvo volumétrico / brasas tenues flotando en suspensión */}
      <points ref={emberPointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[emberData.positions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.14}
          color="#f97316"
          transparent
          opacity={0.65}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* 1. Suelo Monumental de Tablones de Roble Rústico Envejecido (Radio ampliado) */}
      <mesh
        geometry={tavernFloorGeo}
        position={[0, -0.2, 0]}
        receiveShadow
        onPointerDown={(e) => {
          if (isInputBlocked) return;
          e.stopPropagation();
          setMoveTarget(e.point.x, e.point.z);
        }}
      >
        <meshStandardMaterial color="#2d150b" roughness={0.85} metalness={0.08} />
      </mesh>

      {/* 2. Alfombra Tejida Desgastada de Color Carmesí Oscuro */}
      <mesh geometry={tavernCarpetGeo} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 1.5]}>
        <meshStandardMaterial color="#500724" roughness={0.9} />
      </mesh>

      {/* 3. Rotonda de Muros de Piedra de Sillería Oscura y Carbón */}
      <mesh geometry={tavernRotundaWallGeo} position={[0, 6.0, 0]} rotation={[0, 0, 0]}>
        <meshStandardMaterial color="#1c1917" roughness={0.92} side={THREE.DoubleSide} />
      </mesh>
      {/* Cornisa de Madera Labrada y Bronce Envejecido */}
      <mesh geometry={tavernCorniceGeo} position={[0, 11.8, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#78350f" metalness={0.35} roughness={0.6} />
      </mesh>

      {/* Vigas Macizas de Techo de Roble Oscuro (Timber Beams) */}
      <mesh geometry={timberBeamGeo} position={[0, 11.5, 0]} castShadow>
        <meshStandardMaterial color="#1a0c05" roughness={0.88} />
      </mesh>
      <mesh geometry={timberBeamGeo} position={[-6.5, 11.5, 0]} castShadow>
        <meshStandardMaterial color="#1a0c05" roughness={0.88} />
      </mesh>
      <mesh geometry={timberBeamGeo} position={[6.5, 11.5, 0]} castShadow>
        <meshStandardMaterial color="#1a0c05" roughness={0.88} />
      </mesh>
      <mesh geometry={timberCrossBeamGeo} position={[0, 11.3, -4.5]} castShadow>
        <meshStandardMaterial color="#1f0f07" roughness={0.88} />
      </mesh>
      <mesh geometry={timberCrossBeamGeo} position={[0, 11.3, 4.5]} castShadow>
        <meshStandardMaterial color="#1f0f07" roughness={0.88} />
      </mesh>

      {/* 4. Gran Chimenea de Piedra con Fuego Crepitante al Fondo */}
      <group position={[0, 1.4, -11.8]}>
        {/* Hogar de piedra de sillería */}
        <mesh geometry={hearthDomeGeo} castShadow>
          <meshStandardMaterial color="#1c1917" roughness={0.95} />
        </mesh>
        {/* Conducto / campana de la chimenea */}
        <mesh geometry={hearthFlueGeo} position={[0, 4.5, 0]}>
          <meshStandardMaterial color="#292524" roughness={0.9} />
        </mesh>
        {/* Leños ardientes en el hogar */}
        <mesh position={[-0.5, 0.3, 0]} rotation={[0, 0.3, 0.2]}>
          <cylinderGeometry args={[0.18, 0.22, 1.8, 8]} />
          <meshStandardMaterial color="#451a03" roughness={0.9} />
        </mesh>
        <mesh position={[0.5, 0.3, 0]} rotation={[0, -0.3, -0.2]}>
          <cylinderGeometry args={[0.18, 0.22, 1.8, 8]} />
          <meshStandardMaterial color="#451a03" roughness={0.9} />
        </mesh>
        {/* Fuego con llamas y emisión naranja cálida */}
        <mesh ref={fireFlameRef} position={[0, 0.8, 0]}>
          <coneGeometry args={[1.2, 2.4, 14]} />
          <meshStandardMaterial color="#ea580c" emissive="#f97316" emissiveIntensity={3.8} />
        </mesh>
      </group>

      {/* Columnas Monumentales de Madera de Roble */}
      {[-7.5, -3.5, 3.5, 7.5].map((cx, idx) => (
        <group key={idx} position={[cx, 0, -11.0]}>
          <mesh geometry={tavernColumnBaseGeo} position={[0, 0.4, 0]} castShadow>
            <meshStandardMaterial color="#1c0d06" roughness={0.85} />
          </mesh>
          <mesh geometry={tavernColumnShaftGeo} position={[0, 4.9, 0]} castShadow>
            <meshStandardMaterial color="#2d150b" roughness={0.78} />
          </mesh>
          <mesh geometry={tavernColumnBaseGeo} position={[0, 9.5, 0]} rotation={[Math.PI, 0, 0]}>
            <meshStandardMaterial color="#92400e" metalness={0.4} roughness={0.5} />
          </mesh>
        </group>
      ))}

      {/* Faroles Colgantes de Hierro Forjado (Iron Lanterns) */}
      {[
        [-6.5, 8.2, -1.5],
        [6.5, 8.2, -1.5],
        [0, 8.2, 4.5],
      ].map(([lx, ly, lz], lIdx) => (
        <group key={lIdx} position={[lx, ly, lz]}>
          <mesh geometry={lanternChainGeo} position={[0, 1.6, 0]}>
            <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh geometry={lanternBodyGeo}>
            <meshStandardMaterial color="#18181b" metalness={0.85} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.3, 0.48, 0.3]} />
            <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={2.8} />
          </mesh>
        </group>
      ))}

      {/* 5. Gran Barra Semicircular de Roble Rústico */}
      <mesh geometry={tavernBarCurveGeo} position={[0, 0.75, -5.8]}>
        <meshStandardMaterial color="#241006" roughness={0.65} metalness={0.12} />
      </mesh>
      <mesh geometry={tavernBarFootrestGeo} position={[0, 0.22, -5.8]} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#78350f" metalness={0.7} roughness={0.35} />
      </mesh>

      {/* Barriles de Cerveza y Licor sobre la barra y flancos */}
      {[-3.8, 0, 3.8].map((bx, bIdx) => (
        <mesh key={bIdx} geometry={barrelGeo} position={[bx, 2.2, -6.4]} rotation={[0, 0, Math.PI / 2]}>
          <meshStandardMaterial color="#451a03" roughness={0.75} />
        </mesh>
      ))}

      {/* Jarras de Arcilla y Jarros de Bronce sobre la barra */}
      {[-2.8, -1.0, 1.0, 2.8].map((jx, jIdx) => (
        <mesh key={jIdx} geometry={mugGeo} position={[jx, 1.6, -5.0]}>
          <meshStandardMaterial color={jIdx % 2 === 0 ? '#b45309' : '#78350f'} metalness={0.2} roughness={0.7} />
        </mesh>
      ))}

      {/* Mesas y Bancos Rústicos de Madera reubicados a Z = 3.5 (lejos de los NPCs que están en Z = -2.5) */}
      <group position={[-9.5, 0, 3.5]}>
        <mesh geometry={tableTopGeo} position={[0, 0.8, 0]}>
          <meshStandardMaterial color="#2e1407" roughness={0.7} />
        </mesh>
        <mesh geometry={tableLegGeo} position={[0, 0.4, 0]}>
          <meshStandardMaterial color="#1a0c05" roughness={0.85} />
        </mesh>
        {/* Jarras de arcilla en la mesa */}
        <mesh geometry={mugGeo} position={[0.4, 0.98, 0.3]}>
          <meshStandardMaterial color="#78350f" roughness={0.75} />
        </mesh>
        <mesh geometry={mugGeo} position={[-0.3, 0.98, -0.2]}>
          <meshStandardMaterial color="#92400e" roughness={0.7} />
        </mesh>
        {/* Bancos de madera */}
        <mesh geometry={benchSeatGeo} position={[0, 0.42, 1.8]}>
          <meshStandardMaterial color="#1a0c05" roughness={0.8} />
        </mesh>
        <mesh geometry={benchSeatGeo} position={[0, 0.42, -1.8]}>
          <meshStandardMaterial color="#1a0c05" roughness={0.8} />
        </mesh>
      </group>

      <group position={[9.5, 0, 3.5]}>
        <mesh geometry={tableTopGeo} position={[0, 0.8, 0]}>
          <meshStandardMaterial color="#2e1407" roughness={0.7} />
        </mesh>
        <mesh geometry={tableLegGeo} position={[0, 0.4, 0]}>
          <meshStandardMaterial color="#1a0c05" roughness={0.85} />
        </mesh>
        <mesh geometry={mugGeo} position={[-0.4, 0.98, 0.2]}>
          <meshStandardMaterial color="#78350f" roughness={0.75} />
        </mesh>
        <mesh geometry={benchSeatGeo} position={[0, 0.42, 1.8]}>
          <meshStandardMaterial color="#1a0c05" roughness={0.8} />
        </mesh>
        <mesh geometry={benchSeatGeo} position={[0, 0.42, -1.8]}>
          <meshStandardMaterial color="#1a0c05" roughness={0.8} />
        </mesh>
      </group>

      {/* TABLÓN DE CONTRATOS DE CAZADOR (Muro Curvo Noroeste) */}
      <group
        position={[-11.5, 3.2, -6.2]}
        rotation={[0, 0.45, 0]}
        onClick={(e) => {
          if (isInputBlocked) return;
          e.stopPropagation();
          gameAudio.playCrispClick();
          setIsContractBoardOpen(true);
        }}
      >
        <mesh castShadow>
          <cylinderGeometry args={[2.2, 2.4, 0.2, 16]} />
          <meshStandardMaterial color="#451a03" roughness={0.85} />
        </mesh>
        <mesh position={[0, 0, 0.12]} rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[2.0, 16]} />
          <meshStandardMaterial color="#fef3c7" roughness={0.92} />
        </mesh>

        {!isInputBlocked && (
          <Html position={[0, 2.0, 0]} center distanceFactor={18}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                gameAudio.playCrispClick();
                setIsContractBoardOpen(true);
              }}
              className="cursor-pointer py-1.5 px-3.5 rounded-full bg-amber-500 text-black font-serif font-black text-xs border-2 border-white shadow-[0_0_25px_rgba(245,158,11,0.95)] flex items-center gap-1.5 whitespace-nowrap animate-bounce pointer-events-auto"
            >
              <span>📜</span>
              <span>
                {nearestInteractable === 'CONTRACT_BOARD'
                  ? 'TABLÓN DE CONTRATOS (E)'
                  : 'TABLÓN DE CONTRATOS'}
              </span>
            </button>
          </Html>
        )}
      </group>
    </InteriorShell>
  );
}
