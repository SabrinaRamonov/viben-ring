'use client';

import React, { useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { CubeTextureLoader } from 'three';
import * as THREE from 'three';

// This component loads a single image skybox and applies it to the scene background
export function Skybox() {
  const { scene } = useThree();
  const skyboxRef = useRef<boolean>(false);

  // Only set the skybox once to avoid reloading on every render
  if (!skyboxRef.current) {
    // Create a texture loader
    const loader = new THREE.TextureLoader();
    
    // Load the skybox texture
    const texture = loader.load('/textures/skybox.jpg', () => {
      console.log('Skybox texture loaded successfully');
    });
    
    // Set texture properties for proper skybox rendering
    texture.mapping = THREE.EquirectangularReflectionMapping;
    // In Three.js r139+, encoding is replaced with colorSpace
    texture.colorSpace = THREE.SRGBColorSpace;
    
    // Apply the texture to the scene background
    scene.background = texture;
    
    // Mark as loaded
    skyboxRef.current = true;
  }
  
  // This component doesn't render anything directly
  return null;
}
