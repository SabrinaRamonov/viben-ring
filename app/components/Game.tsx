'use client';

import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';

// Import components
import Character from './Character';
import Ground from './Ground';

// Main game component
export default function Game() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Canvas shadows>
        {/* Basic lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight 
          position={[5, 10, 5]} 
          intensity={1.5} 
          castShadow 
        />
        
        {/* Character and ground */}
        <Character />
        <Ground />
      </Canvas>
    </div>
  );
}
