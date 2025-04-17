'use client';

import React from 'react';
import { Canvas } from '@react-three/fiber';
import { GameStateProvider, useGameState } from '../context/GameState';
import { Arena } from './Arena';
import { Character } from './Character';
import { Boss } from './Boss';
import { Gizmo } from './Gizmo';
import { Skybox } from './Skybox';
import { Background } from './Background';
import { HUD } from './HUD';
import { DebugInfo, CollisionSpheres } from './DebugInfo';
import { GameOverSplash } from './GameOverSplash';
import { ThirdPersonCamera } from './ThirdPersonCamera';

// Main game scene
function GameScene() {
  const { state } = useGameState();
  
  return (
    <Canvas camera={{ position: [0, 1.2, -2.5], fov: 60 }} shadows>
      {/* Third-person camera controller */}
      <ThirdPersonCamera />
      
      {/* Scene lighting */}
      <ambientLight intensity={0.3} color="#b9d5ff" />
      <directionalLight 
        position={[50, 100, 50]} 
        intensity={1} 
        castShadow 
        shadow-mapSize={[2048, 2048]} 
        shadow-bias={-0.0001}
      />
      <hemisphereLight 
        args={['#b1e1ff', '#b97a20', 0.7]} 
        position={[0, 50, 0]} 
      />
      
      {/* Custom skybox using the provided image */}
      <Skybox />
      
      {/* Background environment with forest */}
      <Background treeCount={150} radius={600} />
      
      {/* Game environment */}
      <Arena />
      
      {/* Player character */}
      <Character />
      
      {/* Boss character */}
      <Boss />
      
      {/* Coordinate gizmo that follows the character - only visible in debug mode */}
      {state.isDebugMode && <Gizmo size={2} lineWidth={3} />}
      
      {/* Debug collision spheres */}
      <CollisionSpheres />
    </Canvas>
  );
}

// Main game component wrapped with context provider
export function Game() {
  return (
    <GameStateProvider>
      <div className="game-container" style={{ width: '100vw', height: '100vh', position: 'relative' }}>
        <HUD />
        <DebugInfo />
        <GameScene />
        <GameOverSplash />
      </div>
    </GameStateProvider>
  );
}
