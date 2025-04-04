'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

// Ground component with black and white checkerboard pattern
export default function Ground() {
  // Create a checkerboard texture
  const texture = useMemo(() => {
    const size = 512; // Size of the texture
    const squareSize = 32; // Size of each square in the checkerboard
    
    // Create a canvas to draw the checkerboard pattern
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    
    if (context) {
      // Fill with white first
      context.fillStyle = 'white';
      context.fillRect(0, 0, size, size);
      
      // Draw black squares
      context.fillStyle = 'black';
      
      // Draw the checkerboard pattern
      for (let x = 0; x < size; x += squareSize * 2) {
        for (let y = 0; y < size; y += squareSize * 2) {
          context.fillRect(x, y, squareSize, squareSize);
          context.fillRect(x + squareSize, y + squareSize, squareSize, squareSize);
        }
      }
    }
    
    // Create a texture from the canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(10, 10); // Adjust the repeat to control the density of the pattern
    
    return texture;
  }, []);
  
  // Clean up texture when component unmounts
  useEffect(() => {
    return () => {
      texture.dispose();
    };
  }, [texture]);
  
  return (
    <mesh 
      rotation={[-Math.PI / 2, 0, 0]} 
      position={[0, 0, 0]} 
      receiveShadow
    >
      <planeGeometry args={[50, 50]} />
      <meshStandardMaterial 
        map={texture}
        roughness={0.8}
        metalness={0.2}
      />
    </mesh>
  );
}
