import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { ResidentialHouseData } from './MedievalHouse';
import { gameAudio } from './utils';
import { markGeometryAsShared } from './ThreeSceneCleanup';
import { useInteriorNavigation } from './useInteriorNavigation';
import { InteriorShell, InteriorNpcItem } from './InteriorShell';

interface HouseInteriorSceneProps {
  house: ResidentialHouseData;
  playerName: string;
  isModalActive?: boolean;
  onExit: () => void;
  isDialogueOpen?: boolean;
  onOpenDialogue?: () => void;
}

/**
 * Geometrías compartidas a nivel de módulo para el interior de las 12 casas medievales.
 * Evitan realojar buffers en VRAM cada vez que el jugador entra o cambia de residencia.
 */
const houseFloorGeo = markGeometryAsShared(new THREE.PlaneGeometry(18, 15));
const houseCarpetGeo = markGeometryAsShared(new THREE.PlaneGeometry(5.2, 10));
const houseBackWallGeo = markGeometryAsShared(new THREE.BoxGeometry(18, 10, 0.8));
const houseSideWallGeo = markGeometryAsShared(new THREE.BoxGeometry(0.8, 10, 15));
const chimneyBodyGeo = markGeometryAsShared(new THREE.BoxGeometry(3.2, 4.0, 1.2));
const chimneyHearthGeo = markGeometryAsShared(new THREE.BoxGeometry(2.0, 1.8, 0.9));
const chimneyFireGeo = markGeometryAsShared(new THREE.SphereGeometry(0.65, 14, 14));
const bookshelfFrameGeo = markGeometryAsShared(new THREE.BoxGeometry(1.5, 5.5, 5.0));
const bookshelfBookRowGeo = markGeometryAsShared(new THREE.BoxGeometry(0.7, 0.6, 1.2));
const mapTableTopGeo = markGeometryAsShared(new THREE.BoxGeometry(5.2, 0.22, 2.4));
const mapTableLegGeo = markGeometryAsShared(new THREE.CylinderGeometry(0.12, 0.15, 0.7, 8));
const tableMapGeo = markGeometryAsShared(new THREE.PlaneGeometry(1.6, 1.1));
const tableTomeGeo = markGeometryAsShared(new THREE.BoxGeometry(0.8, 0.14, 0.9));

/**
 * Escena 3D inmersiva del interior de cada casa medieval.
 * Completamente transitable en tiempo real con controles unificados via `useInteriorNavigation`.
 */
export function HouseInteriorScene({
  house,
  isModalActive = false,
  onExit,
  isDialogueOpen = false,
  onOpenDialogue,
}: HouseInteriorSceneProps) {
  const { resident } = house;
  const isInputBlocked = Boolean(isModalActive || isDialogueOpen);

  const fireLightRef = useRef<THREE.PointLight>(null);
  const fireFlameRef = useRef<THREE.Mesh>(null);

  const { playerRef, isPlayerWalking, nearestInteractable, setMoveTarget } =
    useInteriorNavigation({
      initialPosition: [0, 0, 4.5],
      speed: 8.5,
      bounds: { minX: -7.5, maxX: 7.5, minZ: -5.5, maxZ: 6.0 },
      footstepSound: 'stone',
      isInputBlocked,
      cameraConfig: {
        xFactor: 0.45,
        y: 8.5,
        zOffset: 8.5,
        lookAtXFactor: 0.3,
        lookAtY: 1.4,
        lookAtZOffset: -3.2,
      },
      exitZone: { minZ: 5.6, maxAbsX: 2.5, onExit },
      interactables: [{ id: house.id, x: 0, z: -3.2, radius: 3.2 }],
      obstacles: [
        // Mesa noble de cartografía ([ 0, 0, -3.2 ])
        { type: 'aabb', minX: -3.05, maxX: 3.05, minZ: -4.85, maxZ: -1.55 },
        // Chimenea medieval ([ -6.8, 0, -4.5 ])
        { type: 'aabb', minX: -8.85, maxX: -4.75, minZ: -5.55, maxZ: -3.4 },
        // Gran biblioteca y estantería ([ 7.5, 2.8, -3.5 ])
        { type: 'aabb', minX: 5.95, maxX: 8.7, minZ: -6.45, maxZ: -0.55 },
      ],
    });

  useFrame((state) => {
    if (isInputBlocked) return;
    const time = state.clock.getElapsedTime();

    if (fireLightRef.current) {
      const flicker = Math.sin(time * 8.5) * 4.0 + Math.cos(time * 18.2) * 2.5;
      fireLightRef.current.intensity = 38 + flicker;
    }
    if (fireFlameRef.current) {
      const pulse = 1.0 + Math.sin(time * 9.5) * 0.08 + Math.cos(time * 15.0) * 0.05;
      fireFlameRef.current.scale.set(pulse, pulse * 1.12, pulse);
    }
  });

  const handleInstructorInteract = () => {
    if (isDialogueOpen) return;
    gameAudio.playCrispClick();
    if (onOpenDialogue) onOpenDialogue();
  };

  const shellNpcs: InteriorNpcItem[] = [
    {
      id: house.id,
      name: resident.name,
      title: resident.topic,
      role: 'CITIZEN',
      pos: [0, 0, -4.8],
      color: resident.color,
      buttonLabel: `Hablar con ${resident.name.split(' ')[0]}`,
      buttonIcon: resident.icon,
      onInteract: handleInstructorInteract,
    },
  ];

  return (
    <InteriorShell
      playerRef={playerRef}
      initialPlayerPos={[0, 0, 4.5]}
      isPlayerWalking={isPlayerWalking}
      nearestInteractable={nearestInteractable}
      exitConfig={{
        position: [0, 1.8, 6.2],
        distanceFactor: 15,
        label: 'SALIR A LA CALLE',
        icon: '🚪',
        visible: !isInputBlocked,
        onExit,
      }}
      npcs={shellNpcs}
      showNpcs={!isModalActive}
      showNpcLabels={!isInputBlocked}
      npcLabelDistanceFactor={16}
      npcTheme="amber"
      disableNpcClicks={isInputBlocked}
    >
      {/* Iluminación cálida de mansión medieval */}
      <ambientLight intensity={2.4} color="#fed7aa" />
      <directionalLight position={[0, 16, 6]} intensity={3.0} color="#ffedd5" />

      {/* Luz cálida parpadeante de la chimenea y luz ambiente central */}
      <pointLight
        ref={fireLightRef}
        position={[-6.0, 2.2, -4.5]}
        intensity={38}
        color="#ea580c"
        distance={16}
        decay={1.3}
      />
      <pointLight position={[0, 4.0, 1.0]} intensity={24} color="#f59e0b" distance={14} decay={1.5} />

      {/* 1. SUELO ESPACIOSO DE TABLONES DE ROBLE ENVEJECIDO (18x15) */}
      <mesh
        geometry={houseFloorGeo}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
        onPointerDown={(e) => {
          if (isInputBlocked) return;
          e.stopPropagation();
          setMoveTarget(e.point.x, e.point.z);
        }}
      >
        <meshStandardMaterial color="#854d0e" roughness={0.55} metalness={0.15} />
      </mesh>

      {/* Alfombra ceremonial espaciosa bordada con galón noble */}
      <mesh geometry={houseCarpetGeo} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0.5]}>
        <meshStandardMaterial color={resident.color} roughness={0.7} />
      </mesh>

      {/* 2. PAREDES DE PIEDRA Y MADERA (Pared Sur abierta en diorama sin bloquear la cámara) */}
      {/* Pared Trasera (Norte: Z = -7.5) */}
      <mesh geometry={houseBackWallGeo} position={[0, 5, -7.5]}>
        <meshStandardMaterial color="#3b1d11" roughness={0.8} />
      </mesh>

      {/* Pared Lateral Izquierda (Oeste: X = -9) */}
      <mesh geometry={houseSideWallGeo} position={[-9, 5, 0]}>
        <meshStandardMaterial color="#331e11" roughness={0.85} />
      </mesh>

      {/* Pared Lateral Derecha (Este: X = 9) */}
      <mesh geometry={houseSideWallGeo} position={[9, 5, 0]}>
        <meshStandardMaterial color="#331e11" roughness={0.85} />
      </mesh>

      {/* 3. CHIMENEA MEDIEVAL CON FUEGO */}
      <group position={[-6.8, 0, -4.5]}>
        <mesh geometry={chimneyBodyGeo} position={[0, 2.0, 0]}>
          <meshStandardMaterial color="#57534e" roughness={0.8} />
        </mesh>
        <mesh geometry={chimneyHearthGeo} position={[0, 1.0, 0.2]}>
          <meshStandardMaterial color="#1c1917" roughness={0.9} />
        </mesh>
        <mesh ref={fireFlameRef} geometry={chimneyFireGeo} position={[0, 0.7, 0.2]}>
          <meshStandardMaterial color="#ea580c" emissive="#f97316" emissiveIntensity={3.8} />
        </mesh>
      </group>

      {/* 4. GRAN BIBLIOTECA Y ESTANTERÍAS DE CÓDICES */}
      <group position={[7.5, 2.8, -3.5]}>
        <mesh geometry={bookshelfFrameGeo}>
          <meshStandardMaterial color="#292524" roughness={0.8} />
        </mesh>
        {[-1.6, -0.4, 0.8, 1.8].map((by, idx) => (
          <group key={idx} position={[-0.4, by, 0]}>
            <mesh geometry={bookshelfBookRowGeo} position={[0, 0, -1.2]}>
              <meshStandardMaterial color={idx % 2 === 0 ? '#b91c1c' : '#1e3a8a'} />
            </mesh>
            <mesh geometry={bookshelfBookRowGeo} position={[0, 0, 1.2]}>
              <meshStandardMaterial color={idx % 2 === 0 ? '#047857' : '#78350f'} />
            </mesh>
          </group>
        ))}
      </group>

      {/* 5. MESA NOBLE DE CARTOGRAFÍA Y ESTRATEGIA */}
      <group position={[0, 0, -3.2]}>
        <mesh geometry={mapTableTopGeo} position={[0, 0.7, 0]}>
          <meshStandardMaterial color="#59290a" roughness={0.6} />
        </mesh>
        {[
          [-2.2, 0.35, -0.95],
          [2.2, 0.35, -0.95],
          [-2.2, 0.35, 0.95],
          [2.2, 0.35, 0.95],
        ].map((lp, i) => (
          <mesh key={i} geometry={mapTableLegGeo} position={lp as [number, number, number]}>
            <meshStandardMaterial color="#1c1917" roughness={0.8} />
          </mesh>
        ))}
        {/* Mapa y candelabro sobre la mesa */}
        <mesh geometry={tableMapGeo} position={[-0.8, 0.82, 0]} rotation={[-Math.PI / 2, 0, 0.08]}>
          <meshStandardMaterial color="#fef08a" roughness={0.85} />
        </mesh>
        <mesh geometry={tableTomeGeo} position={[1.2, 0.84, -0.2]}>
          <meshStandardMaterial color="#7f1d1d" roughness={0.7} />
        </mesh>
      </group>
    </InteriorShell>
  );
}
