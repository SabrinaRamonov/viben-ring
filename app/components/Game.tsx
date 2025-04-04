'use client';

import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import * as THREE from 'three';

// Import components
import Character from './Character';
import { EldenRingScene } from '../MainScreen';

// Main game component - integrating Character with the Elden Ring environment
export default function Game() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Canvas
        shadows
        dpr={[1, 1.5]}
        camera={{ position: [0, 20, 25], fov: 50, near: 0.1, far: 1000 }}
        gl={{ antialias: true, toneMappingExposure: 1.0, alpha: false }}
      >
        <Suspense fallback={null}>
          {/* Elden Ring environment scene */}
          <EldenRingScene />
          
          {/* Player character */}
          <Character />
        </Suspense>
      </Canvas>
    </div>
  );
}
