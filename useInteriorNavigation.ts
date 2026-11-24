import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { gameAudio } from './utils';
import { virtualInput } from './virtualInput';

export interface InteriorBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface InteriorInteractable {
  id: string;
  x: number;
  z: number;
  radius?: number;
}

export interface InteriorCameraConfig {
  xFactor?: number;
  y: number;
  zOffset: number;
  lookAtXFactor?: number;
  lookAtY?: number;
  lookAtZOffset?: number;
}

export interface InteriorExitZone {
  minZ: number;
  maxAbsX: number;
  onExit: () => void;
}

export type InteriorObstacle =
  | { type: 'aabb'; minX: number; maxX: number; minZ: number; maxZ: number }
  | { type: 'circle'; x: number; z: number; radius: number };

export interface UseInteriorNavigationOptions {
  initialPosition: [number, number, number];
  initialYaw?: number;
  speed?: number;
  bounds: InteriorBounds;
  footstepSound?: 'wood' | 'stone';
  isInputBlocked: boolean;
  cameraConfig: InteriorCameraConfig;
  exitZone: InteriorExitZone;
  interactables: InteriorInteractable[];
  defaultInteractRadius?: number;
  obstacles?: InteriorObstacle[];
  resolveCollision?: (
    nextX: number,
    nextZ: number,
    prevX: number,
    prevZ: number
  ) => { x: number; z: number };
}

export function useInteriorNavigation({
  initialPosition,
  initialYaw = Math.PI,
  speed = 9.2,
  bounds,
  footstepSound = 'stone',
  isInputBlocked,
  cameraConfig,
  exitZone,
  interactables,
  defaultInteractRadius = 3.5,
  obstacles = [],
  resolveCollision,
}: UseInteriorNavigationOptions) {
  const playerRef = useRef<THREE.Group>(null);
  const playerPos = useRef<{ x: number; z: number }>({
    x: initialPosition[0],
    z: initialPosition[2],
  });
  const targetClickPos = useRef<{ x: number; z: number } | null>(null);
  const playerYaw = useRef(initialYaw);
  const keysDown = useRef<Record<string, boolean>>({});
  const isWalkingRef = useRef(false);
  const [isPlayerWalking, setIsPlayerWalking] = useState(false);

  const nearestInteractableRef = useRef<string | null>(null);
  const [nearestInteractable, setNearestInteractable] = useState<string | null>(null);
  const hasExitedRef = useRef(false);
  const lastFootstepTimeRef = useRef(0);

  // Refs estables para evitar re-suscripciones y closures obsoletos dentro de useFrame
  const onExitRef = useRef(exitZone.onExit);
  onExitRef.current = exitZone.onExit;

  const resolveCollisionRef = useRef(resolveCollision);
  resolveCollisionRef.current = resolveCollision;

  const obstaclesRef = useRef(obstacles);
  obstaclesRef.current = obstacles;

  const interactablesRef = useRef(interactables);
  interactablesRef.current = interactables;

  const setMoveTarget = useCallback(
    (x: number, z: number) => {
      if (isInputBlocked) return;
      targetClickPos.current = { x, z };
    },
    [isInputBlocked]
  );

  const clearMoveTarget = useCallback(() => {
    targetClickPos.current = null;
  }, []);

  useEffect(() => {
    if (isInputBlocked) {
      keysDown.current = {};
      targetClickPos.current = null;
      if (isWalkingRef.current) {
        isWalkingRef.current = false;
        setIsPlayerWalking(false);
      }
    }
  }, [isInputBlocked]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isInputBlocked) return;
      keysDown.current[e.key.toLowerCase()] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysDown.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [isInputBlocked]);

  useFrame((state, delta) => {
    if (!playerRef.current) return;

    if (isInputBlocked) {
      targetClickPos.current = null;
      if (isWalkingRef.current) {
        isWalkingRef.current = false;
        setIsPlayerWalking(false);
      }
      return;
    }

    const clampedDelta = Math.min(delta, 0.05);

    let moveX = 0;
    let moveZ = 0;

    const keys = keysDown.current;
    const vInput = virtualInput.getState();

    if (keys['w'] || keys['arrowup'] || vInput.up) moveZ -= 1;
    if (keys['s'] || keys['arrowdown'] || vInput.down) moveZ += 1;
    if (keys['a'] || keys['arrowleft'] || vInput.left) moveX -= 1;
    if (keys['d'] || keys['arrowright'] || vInput.right) moveX += 1;

    if (moveX !== 0 || moveZ !== 0) {
      targetClickPos.current = null;
    } else if (targetClickPos.current) {
      const dx = targetClickPos.current.x - playerPos.current.x;
      const dz = targetClickPos.current.z - playerPos.current.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.4) {
        moveX = dx / dist;
        moveZ = dz / dist;
      } else {
        targetClickPos.current = null;
      }
    }

    const isMoving = Math.abs(moveX) > 0.05 || Math.abs(moveZ) > 0.05;
    if (isMoving !== isWalkingRef.current) {
      isWalkingRef.current = isMoving;
      setIsPlayerWalking(isMoving);
    }

    if (isMoving) {
      const len = Math.hypot(moveX, moveZ);
      const vx = (moveX / len) * speed * clampedDelta;
      const vz = (moveZ / len) * speed * clampedDelta;

      const prevX = playerPos.current.x;
      const prevZ = playerPos.current.z;
      let nextX = THREE.MathUtils.clamp(prevX + vx, bounds.minX, bounds.maxX);
      let nextZ = THREE.MathUtils.clamp(prevZ + vz, bounds.minZ, bounds.maxZ);

      const activeObstacles = obstaclesRef.current;
      if (activeObstacles.length > 0) {
        const hitsAnyAabb = (tx: number, tz: number) =>
          activeObstacles.some(
            (obs) =>
              obs.type === 'aabb' &&
              tx > obs.minX &&
              tx < obs.maxX &&
              tz > obs.minZ &&
              tz < obs.maxZ
          );

        if (hitsAnyAabb(nextX, prevZ)) {
          nextX = prevX;
        }
        if (hitsAnyAabb(nextX, nextZ)) {
          nextZ = prevZ;
        }

        for (const obs of activeObstacles) {
          if (obs.type !== 'circle') continue;
          const dx = nextX - obs.x;
          const dz = nextZ - obs.z;
          const dist = Math.hypot(dx, dz);
          if (dist < obs.radius) {
            if (dist > 0.0001) {
              nextX = obs.x + (dx / dist) * obs.radius;
              nextZ = obs.z + (dz / dist) * obs.radius;
            } else {
              nextX = prevX;
              nextZ = prevZ;
            }
          }
        }

        nextX = THREE.MathUtils.clamp(nextX, bounds.minX, bounds.maxX);
        nextZ = THREE.MathUtils.clamp(nextZ, bounds.minZ, bounds.maxZ);
        if (hitsAnyAabb(nextX, nextZ)) {
          nextX = prevX;
          nextZ = prevZ;
        }
      }

      if (resolveCollisionRef.current) {
        const resolved = resolveCollisionRef.current(nextX, nextZ, prevX, prevZ);
        nextX = resolved.x;
        nextZ = resolved.z;
      }

      if (targetClickPos.current && Math.hypot(nextX - prevX, nextZ - prevZ) < 0.0005) {
        targetClickPos.current = null;
        if (isWalkingRef.current) {
          isWalkingRef.current = false;
          setIsPlayerWalking(false);
        }
      }

      playerPos.current.x = nextX;
      playerPos.current.z = nextZ;

      const now = performance.now();
      if (now - lastFootstepTimeRef.current > 330) {
        lastFootstepTimeRef.current = now;
        if (footstepSound === 'wood') {
          gameAudio.playFootstepWood();
        } else {
          gameAudio.playFootstepStone();
        }
      }

      const targetAngle = Math.atan2(moveX, moveZ);
      const angleDiff = targetAngle - playerYaw.current;
      const wrappedDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
      playerYaw.current += wrappedDiff * Math.min(1, 14 * clampedDelta);
    }

    playerRef.current.position.set(playerPos.current.x, 0, playerPos.current.z);
    playerRef.current.rotation.y = playerYaw.current;

    const xFactor = cameraConfig.xFactor ?? 0.45;
    const lookAtXFactor = cameraConfig.lookAtXFactor ?? 0.35;
    const lookAtY = cameraConfig.lookAtY ?? 1.3;
    const lookAtZOffset = cameraConfig.lookAtZOffset ?? -3.5;

    const targetCamX = playerPos.current.x * xFactor;
    const targetCamY = cameraConfig.y;
    const targetCamZ = playerPos.current.z + cameraConfig.zOffset;

    const lerpFactor = 1 - Math.exp(-6 * clampedDelta);
    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, targetCamX, lerpFactor);
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, targetCamY, lerpFactor);
    state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, targetCamZ, lerpFactor);
    state.camera.lookAt(
      playerPos.current.x * lookAtXFactor,
      lookAtY,
      playerPos.current.z + lookAtZOffset
    );

    // Detección unificada de salida por la puerta sur
    if (
      playerPos.current.z > exitZone.minZ &&
      Math.abs(playerPos.current.x) < exitZone.maxAbsX
    ) {
      if (!hasExitedRef.current) {
        hasExitedRef.current = true;
        gameAudio.playCrispClick();
        onExitRef.current();
      }
      return;
    }

    // Detección de proximidad con puntos interactivos y NPCs (prioriza el más cercano dentro de su radio)
    let closest: string | null = null;
    let minDist = Infinity;
    for (const item of interactablesRef.current) {
      const dist = Math.hypot(playerPos.current.x - item.x, playerPos.current.z - item.z);
      const radius = item.radius ?? defaultInteractRadius;
      if (dist < radius && dist < minDist) {
        minDist = dist;
        closest = item.id;
      }
    }

    if (closest !== nearestInteractableRef.current) {
      nearestInteractableRef.current = closest;
      setNearestInteractable(closest);
    }
  });

  return {
    playerRef,
    playerPos,
    isPlayerWalking,
    nearestInteractable,
    setMoveTarget,
    clearMoveTarget,
  };
}
