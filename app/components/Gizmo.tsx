'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameState } from '../context/GameState';

interface GizmoProps {
  size?: number;
  lineWidth?: number;
}

export function Gizmo({ size = 5, lineWidth = 2 }: GizmoProps) {
  const { state } = useGameState();
  const gizmoRef = useRef<THREE.Group>(null);
  
  // Create geometries for each axis
  const xAxisGeometry = useMemo(() => {
    const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(size, 0, 0)];
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [size]);
  
  const yAxisGeometry = useMemo(() => {
    const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, size, 0)];
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [size]);
  
  const zAxisGeometry = useMemo(() => {
    const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, size)];
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [size]);
  
  // Create materials for each axis
  const xAxisMaterial = useMemo(() => new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: lineWidth }), [lineWidth]); // Red for X
  const yAxisMaterial = useMemo(() => new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: lineWidth }), [lineWidth]); // Green for Y
  const zAxisMaterial = useMemo(() => new THREE.LineBasicMaterial({ color: 0x0000ff, linewidth: lineWidth }), [lineWidth]); // Blue for Z
  
  // Update gizmo position to match character position
  useFrame(() => {
    if (gizmoRef.current) {
      // Position the gizmo at the character's position
      gizmoRef.current.position.copy(state.playerPosition);
    }
  });
  
  return (
    <group ref={gizmoRef}>
      {/* X-axis (red) */}
      <primitive object={new THREE.Line(xAxisGeometry, xAxisMaterial)} />
      
      {/* Y-axis (green) */}
      <primitive object={new THREE.Line(yAxisGeometry, yAxisMaterial)} />
      
      {/* Z-axis (blue) */}
      <primitive object={new THREE.Line(zAxisGeometry, zAxisMaterial)} />
      
      {/* Small spheres at the end of each axis for better visibility */}
      <mesh position={[size, 0, 0]}>
        <sphereGeometry args={[0.3, 8, 8]} />
        <meshBasicMaterial color={0xff0000} />
      </mesh>
      
      <mesh position={[0, size, 0]}>
        <sphereGeometry args={[0.3, 8, 8]} />
        <meshBasicMaterial color={0x00ff00} />
      </mesh>
      
      <mesh position={[0, 0, size]}>
        <sphereGeometry args={[0.3, 8, 8]} />
        <meshBasicMaterial color={0x0000ff} />
      </mesh>
      
      {/* Text labels for axes */}
      <group position={[size + 0.5, 0, 0]}>
        <mesh>
          <boxGeometry args={[0.5, 0.5, 0.1]} />
          <meshBasicMaterial color={0xff0000} />
        </mesh>
      </group>
      
      <group position={[0, size + 0.5, 0]}>
        <mesh>
          <boxGeometry args={[0.5, 0.5, 0.1]} />
          <meshBasicMaterial color={0x00ff00} />
        </mesh>
      </group>
      
      <group position={[0, 0, size + 0.5]}>
        <mesh>
          <boxGeometry args={[0.5, 0.5, 0.1]} />
          <meshBasicMaterial color={0x0000ff} />
        </mesh>
      </group>
    </group>
  );
}
