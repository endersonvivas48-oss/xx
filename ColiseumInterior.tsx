import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { gameAudio } from './utils';
import { markGeometryAsShared } from './ThreeSceneCleanup';
import { isMobileOptimizationTarget } from './glbRuntimeOptimizer';
import { useInteriorNavigation } from './useInteriorNavigation';
import { InteriorShell, InteriorNpcItem } from './InteriorShell';

export interface ColiseumDialogueData {
  speaker: string;
  role: string;
  text: string;
  actionText?: string;
  action?: () => void;
  avatarImgUrl?: string;
  candidateAvatarUrls?: string[];
}

interface ColiseumInteriorProps {
  playerName: string;
  campaignPhase: 'ALLEY' | 'TOURNAMENT';
  alleyFightNumber: number;
  isColiseumCleared?: boolean;
  onExitColiseum: () => void;
  onStartTournamentBattle: () => void;
  onStartSurvivalColiseum: () => void;
  onOpenGladiatorDuel?: () => void;
  isModalActive?: boolean;
  activeDialogue: ColiseumDialogueData | null;
  setActiveDialogue: (d: ColiseumDialogueData | null) => void;
}

/**
 * Geometrías y recursos cacheados para el Gran Coliseo Subterráneo de Fantasía Oscura
 * Columnas macizas de obsidiana con runas arcanas azules brillantes, braseros de fuego rugiente
 * en balcones de piedra, estandartes de terciopelo carmesí y brasas ardientes en el aire.
 */
const coliseumFloorGeo = markGeometryAsShared(new THREE.CylinderGeometry(20.0, 20.6, 0.45, 32));
const arenaSandCircleGeo = markGeometryAsShared(new THREE.CylinderGeometry(13.5, 13.5, 0.05, 32));
const carpetImperialGeo = markGeometryAsShared(new THREE.PlaneGeometry(5.6, 22));

// Muro semicircular y tribunas monumentales de roca volcánica y obsidiana
const coliseumRotundaWallGeo = markGeometryAsShared(new THREE.CylinderGeometry(19.5, 19.8, 13.5, 32, 1, true, Math.PI / 2, Math.PI));
const coliseumBalconyTierGeo = markGeometryAsShared(new THREE.TorusGeometry(19.2, 0.55, 6, 32, Math.PI));
const triumphalArchGeo = markGeometryAsShared(new THREE.TorusGeometry(8.5, 0.9, 10, 24, Math.PI));

// Columnas de obsidiana con anillos rúnicos
const obsidianColumnBaseGeo = markGeometryAsShared(new THREE.CylinderGeometry(0.75, 0.95, 1.2, 12));
const obsidianColumnShaftGeo = markGeometryAsShared(new THREE.CylinderGeometry(0.55, 0.62, 10.5, 12));
const runeBandGeo = markGeometryAsShared(new THREE.CylinderGeometry(0.63, 0.63, 0.45, 12));

// Braseros de piedra con calderas de hierro y fuego
const brazierStandGeo = markGeometryAsShared(new THREE.CylinderGeometry(0.5, 0.7, 1.8, 12));
const brazierBowlGeo = markGeometryAsShared(new THREE.SphereGeometry(0.85, 14, 14, 0, Math.PI * 2, 0, Math.PI * 0.5));
const brazierFlameGeo = markGeometryAsShared(new THREE.ConeGeometry(0.65, 1.6, 12));

// Estandartes de terciopelo rojo carmesí (Red Velvet Banners)
const bannerFabricGeo = markGeometryAsShared(new THREE.PlaneGeometry(1.6, 6.2));
const bannerRodGeo = markGeometryAsShared(new THREE.CylinderGeometry(0.06, 0.06, 2.0, 8));

// Estrado imperial de piedra oscura
const imperialDaisGeo = markGeometryAsShared(new THREE.CylinderGeometry(7.5, 8.2, 1.6, 24, 1, false, Math.PI / 2, Math.PI));

export function ColiseumInterior({
  playerName,
  campaignPhase,
  alleyFightNumber,
  isColiseumCleared = false,
  onExitColiseum,
  onStartTournamentBattle,
  onStartSurvivalColiseum,
  onOpenGladiatorDuel,
  isModalActive = false,
  activeDialogue,
  setActiveDialogue,
}: ColiseumInteriorProps) {
  const isInputBlocked = Boolean(isModalActive || activeDialogue);

  // Fuego crepitante de braseros y brasas flotantes en el aire
  const mainBrazierLightRef = useRef<THREE.PointLight>(null);
  const embersPointsRef = useRef<THREE.Points>(null);
  const particleAccumRef = useRef(0);
  const isMobile = isMobileOptimizationTarget();

  // Pre-generar partículas de brasas ardientes (Glowing embers floating in the air)
  const embersData = useMemo(() => {
    const count = 75;
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 26;
      positions[i * 3 + 1] = Math.random() * 9.5 + 0.4;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 24 - 2.0;
      speeds[i] = 0.25 + Math.random() * 0.5;
    }
    return { positions, speeds, count };
  }, []);

  const coliseumNpcs = [
    {
      id: 'arena_herald',
      name: 'Heraldo Máximo de la Arena',
      title: 'Maestro de Ceremonias del Torneo',
      role: 'CHALLENGER' as const,
      pos: [0, 0, -5.8] as [number, number, number],
      color: '#f59e0b',
      dialogue:
        campaignPhase === 'TOURNAMENT'
          ? '¡Gloria al aspirante! Has superado las 12 pruebas de la callejuela y la Gran Arena abre sus puertas para la fase final de 8 Gladiadores de Élite. ¿Estás listo para batirte en el Gran Torneo del Legado?'
          : '¡Saludos, duelista! Para inscribirte en el cuadro oficial del Gran Torneo debes conquistar primero los 12 combates de la callejuela (' +
            alleyFightNumber +
            '/12 completados). Regresa cuando hayas clasificado como aspirante oficial para iniciar tu camino hacia la corona.',
      hasTournamentAction: campaignPhase === 'TOURNAMENT',
      portraits: [
        'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/imagnpc@main/heraldo.jpg',
        'https://raw.githubusercontent.com/endersonvivas48-oss/imagnpc/main/heraldo.jpg',
        'https://raw.githubusercontent.com/endersonvivas48-oss/imagnpc/main/heraldo.png',
        'https://raw.githubusercontent.com/endersonvivas48-oss/imagnpc/main/heraldo_maximo.jpg',
        'https://raw.githubusercontent.com/endersonvivas48-oss/imagnpc/main/gladiador_heraldo_maximo.jpg',
        'https://raw.githubusercontent.com/endersonvivas48-oss/gladiador/main/portraits/gladiador_heraldo_maximo.jpg',
        'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/gladiador@main/portraits/gladiador_valerius.jpg',
        'https://raw.githubusercontent.com/endersonvivas48-oss/gladiador/main/portraits/gladiador_valerius.jpg',
        'https://raw.githubusercontent.com/endersonvivas48-oss/gladiador/main/portraits/gladiador_sir_gareth.jpg',
        './assets/imagnpc/heraldo.jpg',
        './assets/imagnpc/heraldo.png',
        './assets/imagnpc/heraldo_maximo.jpg',
        './assets/heraldo.jpg',
        './assets/heraldo_maximo.jpg',
      ],
    },
    {
      id: 'gladiator_brutus',
      name: 'Brutus el Invicto',
      title: 'Gladiador de los Siete Asaltos',
      role: 'CHALLENGER' as const,
      pos: [-9.5, 0, 1.0] as [number, number, number],
      color: '#ef4444',
      dialogue: isColiseumCleared
        ? '¿Deseas batirte en duelo directo contra los 6 gladiadores del Gran Torneo? Has demostrado tu temple al conquistar el Coliseo. Selecciona a tu rival en el Desafío de Gladiadores y prueba tu mazo con modificadores de dificultad.'
        : 'El Desafío de Gladiadores solo está reservado para los campeones que hayan conquistado el Coliseo. Supera el Gran Torneo de la arena para que los gladiadores de élite acepten tus desafíos directos.',
      hasDuelAction: isColiseumCleared,
      portraits: [
        'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/imagnpc@main/brutus.jpg',
        'https://raw.githubusercontent.com/endersonvivas48-oss/imagnpc/main/brutus.jpg',
        'https://raw.githubusercontent.com/endersonvivas48-oss/imagnpc/main/brutus.png',
        'https://raw.githubusercontent.com/endersonvivas48-oss/imagnpc/main/gladiador_brutus.jpg',
        'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/gladiador@main/portraits/gladiador_brutus.jpg',
        'https://raw.githubusercontent.com/endersonvivas48-oss/gladiador/main/portraits/gladiador_brutus.jpg',
        'https://raw.githubusercontent.com/endersonvivas48-oss/gladiador/main/portraits/gladiador_varek.jpg',
        'https://raw.githubusercontent.com/endersonvivas48-oss/gladiador/main/portraits/gladiador_grom.jpg',
        './assets/imagnpc/brutus.jpg',
        './assets/imagnpc/brutus.png',
        './assets/brutus.jpg',
      ],
    },
    {
      id: 'coliseum_warden',
      name: 'Guardián del Foso Infinito',
      title: 'Custodio del Modo Supervivencia',
      role: 'CHALLENGER' as const,
      pos: [9.5, 0, 1.0] as [number, number, number],
      color: '#10b981',
      dialogue:
        'En el Coliseo Infinito las oleadas nunca cesan. Cuanto más resistas, más oro, títulos y minerales de meteorito obtendrás para forjar tu leyenda. ¿Te atreves a descender al foso?',
      hasSurvivalAction: true,
      portraits: [
        'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/imagnpc@main/guardian_foso.jpg',
        'https://raw.githubusercontent.com/endersonvivas48-oss/imagnpc/main/guardian_foso.jpg',
        'https://raw.githubusercontent.com/endersonvivas48-oss/imagnpc/main/guardian_foso.png',
        'https://raw.githubusercontent.com/endersonvivas48-oss/imagnpc/main/gladiador_guardian_foso.jpg',
        'https://raw.githubusercontent.com/endersonvivas48-oss/gladiador/main/portraits/gladiador_guardian_foso.jpg',
        'https://cdn.jsdelivr.net/gh/endersonvivas48-oss/gladiador@main/portraits/gladiador_centinela.jpg',
        'https://raw.githubusercontent.com/endersonvivas48-oss/gladiador/main/portraits/gladiador_centinela.jpg',
        'https://raw.githubusercontent.com/endersonvivas48-oss/gladiador/main/portraits/gladiador_morvath.jpg',
        './assets/imagnpc/guardian_foso.jpg',
        './assets/imagnpc/guardian_foso.png',
        './assets/guardian_foso.jpg',
      ],
    },
  ];

  const { playerRef, isPlayerWalking, nearestInteractable, setMoveTarget } =
    useInteriorNavigation({
      initialPosition: [0, 0, 7.5],
      speed: 9.5,
      bounds: { minX: -14.5, maxX: 14.5, minZ: -10.5, maxZ: 13.5 },
      footstepSound: 'stone',
      isInputBlocked,
      cameraConfig: {
        xFactor: 0.45,
        y: 10.2,
        zOffset: 11.2,
        lookAtXFactor: 0.35,
        lookAtY: 1.4,
        lookAtZOffset: -3.2,
      },
      exitZone: { minZ: 12.8, maxAbsX: 3.8, onExit: onExitColiseum },
      interactables: coliseumNpcs.map((npc) => ({
        id: npc.id,
        x: npc.pos[0],
        z: npc.pos[2],
        radius: 3.5,
      })),
      obstacles: [
        // Estrado central del Heraldo
        { type: 'aabb', minX: -5.2, maxX: 5.2, minZ: -7.2, maxZ: -4.2 },
        // Braseros laterales y frontales de fuego rugiente
        { type: 'circle', x: -11.5, z: 1.0, radius: 1.3 },
        { type: 'circle', x: 11.5, z: 1.0, radius: 1.3 },
        { type: 'circle', x: -5.5, z: -5.0, radius: 1.3 },
        { type: 'circle', x: 5.5, z: -5.0, radius: 1.3 },
      ],
    });

  useFrame((state, delta) => {
    if (isInputBlocked) return;
    const clampedDelta = Math.min(delta, 0.05);
    const time = state.clock.getElapsedTime();

    // Parpadeo rugiente del fuego en los braseros de la arena
    if (mainBrazierLightRef.current) {
      const flicker = Math.sin(time * 9.0) * 5.0 + Math.cos(time * 18.5) * 3.5 + Math.sin(time * 31.0) * 2.5;
      mainBrazierLightRef.current.intensity = 48 + flicker;
    }

    // Flotación ascendente de las brasas incandescentes (con throttling ~20 Hz en móviles)
    if (embersPointsRef.current) {
      let particleDelta = clampedDelta;
      if (isMobile) {
        particleAccumRef.current += clampedDelta;
        if (particleAccumRef.current < 1 / 20) return;
        particleDelta = particleAccumRef.current;
        particleAccumRef.current = 0;
      }
      const posAttr = embersPointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      for (let i = 0; i < embersData.count; i++) {
        let y = arr[i * 3 + 1];
        y += embersData.speeds[i] * particleDelta * 0.9;
        if (y > 10.5) {
          y = 0.4;
          arr[i * 3 + 0] = (Math.random() - 0.5) * 26;
          arr[i * 3 + 2] = (Math.random() - 0.5) * 24 - 2.0;
        }
        arr[i * 3 + 1] = y;
      }
      posAttr.needsUpdate = true;
    }
  });

  const shellNpcs: InteriorNpcItem[] = coliseumNpcs.map((npc) => ({
    id: npc.id,
    name: npc.name,
    title: npc.title,
    role: npc.role,
    pos: npc.pos,
    color: npc.color,
    onInteract: () => {
      if (activeDialogue) return;
      gameAudio.playCrispClick();
      if (npc.id === 'arena_herald') {
        if (campaignPhase === 'TOURNAMENT') {
          setActiveDialogue({
            speaker: npc.name,
            role: npc.title,
            text: npc.dialogue,
            actionText: '⚔️ Combatir en el Gran Torneo',
            avatarImgUrl: npc.portraits?.[0],
            candidateAvatarUrls: npc.portraits,
            action: () => {
              setActiveDialogue(null);
              onStartTournamentBattle();
            },
          });
        } else {
          setActiveDialogue({
            speaker: npc.name,
            role: npc.title,
            text: npc.dialogue,
            actionText: '🔒 Torneo Bloqueado (Supera 12 Duelos)',
            avatarImgUrl: npc.portraits?.[0],
            candidateAvatarUrls: npc.portraits,
            action: () => setActiveDialogue(null),
          });
        }
      } else if (npc.hasSurvivalAction) {
        setActiveDialogue({
          speaker: npc.name,
          role: npc.title,
          text: npc.dialogue,
          actionText: 'Desafiar Coliseo Infinito',
          avatarImgUrl: npc.portraits?.[0],
          candidateAvatarUrls: npc.portraits,
          action: () => {
            setActiveDialogue(null);
            onStartSurvivalColiseum();
          },
        });
      } else if (npc.id === 'gladiator_brutus') {
        if (isColiseumCleared) {
          setActiveDialogue({
            speaker: npc.name,
            role: npc.title,
            text: npc.dialogue,
            actionText: '⚔️ Desafío de Gladiadores',
            avatarImgUrl: npc.portraits?.[0],
            candidateAvatarUrls: npc.portraits,
            action: () => {
              setActiveDialogue(null);
              if (onOpenGladiatorDuel) onOpenGladiatorDuel();
            },
          });
        } else {
          setActiveDialogue({
            speaker: npc.name,
            role: npc.title,
            text: npc.dialogue,
            actionText: '🔒 Bloqueado (Supera el Coliseo)',
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
          actionText: '¡Por la gloria!',
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
      initialPlayerPos={[0, 0, 7.5]}
      isPlayerWalking={isPlayerWalking}
      nearestInteractable={nearestInteractable}
      exitConfig={{
        position: [0, 1.8, 13.0],
        distanceFactor: 18,
        label: 'SALIR A LA CIUDAD',
        visible: !isInputBlocked,
        onExit: onExitColiseum,
      }}
      npcs={shellNpcs}
      showNpcs={!isInputBlocked}
      showNpcLabels={!isInputBlocked}
      npcLabelDistanceFactor={18}
      npcTheme="amber"
      disableNpcClicks={Boolean(activeDialogue)}
    >
      {/* Fondo y Neblina Subterránea Profunda */}
      <color attach="background" args={['#090306']} />
      <ambientLight intensity={1.2} color="#450a0a" />
      <directionalLight position={[0, 24, 6]} intensity={2.0} color="#fed7aa" />

      {/* Iluminación Atmosférica Épica: Reducida a 2 luces puntuales clave para GPUs móviles */}
      <pointLight ref={mainBrazierLightRef} position={[0, 5.2, -10.5]} intensity={52} color="#f97316" distance={28} decay={1.3} />
      <pointLight position={[0, 5.0, 3.0]} intensity={24} color="#ea580c" distance={18} decay={1.5} />

      {/* Partículas de Brasas Ardientes en Suspensión (Glowing Embers) */}
      <points ref={embersPointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[embersData.positions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.16}
          color="#fb923c"
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* 1. Suelo Monumental de Roca Volcánica de la Arena Subterránea */}
      <mesh
        geometry={coliseumFloorGeo}
        position={[0, -0.22, 0]}
        receiveShadow
        onPointerDown={(e) => {
          if (isInputBlocked) return;
          e.stopPropagation();
          setMoveTarget(e.point.x, e.point.z);
        }}
      >
        <meshStandardMaterial color="#1c0707" roughness={0.7} metalness={0.25} />
      </mesh>

      {/* Círculo Central de Arena y Polvo de Duelo */}
      <mesh geometry={arenaSandCircleGeo} position={[0, 0.01, 0]}>
        <meshStandardMaterial color="#2d1009" roughness={0.9} />
      </mesh>

      {/* 2. Alfombra de Terciopelo Carmesí de los Campeones */}
      <mesh geometry={carpetImperialGeo} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 1.5]}>
        <meshStandardMaterial color="#7f1d1d" roughness={0.85} />
      </mesh>

      {/* 3. Balcones y Muros Curvos de Piedra Volcánica y Balcones con Braseros */}
      <mesh geometry={coliseumRotundaWallGeo} position={[0, 6.75, 0]} rotation={[0, 0, 0]}>
        <meshStandardMaterial color="#140404" roughness={0.92} side={THREE.DoubleSide} />
      </mesh>
      {/* Moldura / Cornisa del Balcón Imperial */}
      <mesh geometry={coliseumBalconyTierGeo} position={[0, 13.0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#78350f" metalness={0.5} roughness={0.4} />
      </mesh>

      {/* 4. Gran Arco del Triunfo Subterráneo */}
      <mesh geometry={triumphalArchGeo} position={[0, 7.5, -11.5]} rotation={[0, 0, Math.PI]}>
        <meshStandardMaterial color="#0f0202" roughness={0.7} metalness={0.3} />
      </mesh>

      {/* 5. COLUMNAS MACIZAS DE OBSIDIANA GRABADAS CON RUNAS ARCANAS AZULES */}
      {[-8.5, -4.5, 4.5, 8.5].map((cx, idx) => (
        <group key={idx} position={[cx, 0, -10.5]}>
          {/* Base de obsidiana */}
          <mesh geometry={obsidianColumnBaseGeo} position={[0, 0.6, 0]} castShadow>
            <meshStandardMaterial color="#050505" roughness={0.3} metalness={0.8} />
          </mesh>
          {/* Fuste cilíndrico de obsidiana negra pulida */}
          <mesh geometry={obsidianColumnShaftGeo} position={[0, 5.8, 0]} castShadow>
            <meshStandardMaterial color="#0a0a0a" roughness={0.2} metalness={0.85} />
          </mesh>
          {/* Capiteles superiores */}
          <mesh geometry={obsidianColumnBaseGeo} position={[0, 11.2, 0]} rotation={[Math.PI, 0, 0]}>
            <meshStandardMaterial color="#171717" roughness={0.35} metalness={0.7} />
          </mesh>

          {/* ANILLOS Y RUNAS ARCANAS AZULES BRILLANTES GRABADAS */}
          {[2.5, 5.5, 8.5].map((ry, rIdx) => (
            <group key={rIdx} position={[0, ry, 0]}>
              <mesh geometry={runeBandGeo}>
                <meshStandardMaterial
                  color="#06b6d4"
                  emissive="#0891b2"
                  emissiveIntensity={3.2}
                  roughness={0.1}
                />
              </mesh>
            </group>
          ))}
        </group>
      ))}

      {/* 6. ESTANDARTES DE TERCIOPELO ROJO CARMESÍ (RED VELVET BANNERS) EN LAS PAREDES */}
      {[-12.5, -6.5, 6.5, 12.5].map((bx, bIdx) => (
        <group key={bIdx} position={[bx, 8.0, -11.2]}>
          {/* Vara dorada de soporte */}
          <mesh geometry={bannerRodGeo} rotation={[0, 0, Math.PI / 2]}>
            <meshStandardMaterial color="#d97706" metalness={0.9} roughness={0.2} />
          </mesh>
          {/* Estandarte de tela carmesí con caída vertical */}
          <mesh geometry={bannerFabricGeo} position={[0, -2.8, 0.05]}>
            <meshStandardMaterial color="#881337" roughness={0.85} side={THREE.DoubleSide} />
          </mesh>
          {/* Remate heráldico dorado */}
          <mesh position={[0, -5.8, 0.06]}>
            <coneGeometry args={[0.22, 0.45, 6]} />
            <meshStandardMaterial color="#f59e0b" metalness={0.9} roughness={0.2} />
          </mesh>
        </group>
      ))}

      {/* 7. BRASEROS DE FUEGO RUGIENTE (ROARING FIRE BRAZIERS) */}
      {[
        [-11.5, 0, 1.0],
        [11.5, 0, 1.0],
        [-5.5, 0, -5.0],
        [5.5, 0, -5.0],
        [0, 0, -10.8],
      ].map(([fx, fy, fz], fIdx) => (
        <group key={fIdx} position={[fx, fy, fz]}>
          <mesh geometry={brazierStandGeo} position={[0, 0.9, 0]} castShadow>
            <meshStandardMaterial color="#1c1917" metalness={0.75} roughness={0.4} />
          </mesh>
          <mesh geometry={brazierBowlGeo} position={[0, 1.8, 0]}>
            <meshStandardMaterial color="#292524" metalness={0.8} roughness={0.3} />
          </mesh>
          {/* Llamas de fuego rugientes con emisión naranja intensa (sin pointLight individual para aligerar shaders) */}
          <mesh geometry={brazierFlameGeo} position={[0, 2.4, 0]}>
            <meshStandardMaterial color="#ea580c" emissive="#f97316" emissiveIntensity={3.8} />
          </mesh>
        </group>
      ))}

      {/* 8. Estrado Semicircular Imperial */}
      <mesh geometry={imperialDaisGeo} position={[0, 0.8, -5.8]}>
        <meshStandardMaterial color="#4c0519" roughness={0.5} metalness={0.35} />
      </mesh>

    </InteriorShell>
  );
}
