'use client';

import React, { useRef, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTF } from 'three-stdlib';

// Define the type for our GLTF result
type GLTFResult = GLTF & {
  nodes: {
    [key: string]: THREE.Mesh;
  };
  materials: {
    [key: string]: THREE.Material;
  };
};

export function Arena() {
  const arenaRef = useRef<THREE.Group>(null);
  
  // Load the arena model
  const { scene } = useGLTF('/models/env/arena.glb');
  
  // Clone the scene to avoid modifying the cached original
  const arenaScene = scene.clone();
  
  // Fix materials by traversing the scene and remove the rectangle in the middle
  useEffect(() => {
    // Traverse the scene to fix materials and identify problematic objects
    arenaScene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // Check for the rectangle in the middle (likely a plane with specific dimensions)
        // Typical characteristics: flat plane, positioned at center, possibly with a dark material
        const geometry = child.geometry;
        
        // Check if it's a plane geometry (or similar) positioned near the center
        if (
          (geometry instanceof THREE.PlaneGeometry || 
           geometry instanceof THREE.BufferGeometry || 
           geometry instanceof THREE.BoxGeometry) && 
          Math.abs(child.position.x) < 1 && 
          Math.abs(child.position.z) < 1 && 
          child.scale.x > 5 && child.scale.z > 5 && 
          child.scale.y < 1
        ) {
          console.log('Found and removing the rectangle in the middle:', child);
          // Make it invisible
          child.visible = false;
          // Or completely remove it from its parent
          if (child.parent) {
            child.parent.remove(child);
          }
          return; // Skip further processing for this object
        }
        
        // For remaining objects, enable shadows
        child.castShadow = true;
        child.receiveShadow = true;
        
        // Fix materials
        if (child.material) {
          // Handle both single materials and material arrays
          const materials = Array.isArray(child.material) 
            ? child.material 
            : [child.material];
          
          materials.forEach(material => {
            // Set material properties for better rendering
            material.needsUpdate = true;
            
            // For standard materials, adjust PBR properties
            if (material instanceof THREE.MeshStandardMaterial) {
              material.roughness = 0.7;
              material.metalness = 0.2;
              material.envMapIntensity = 1.5;
            }
            
            // For basic materials, ensure proper colors
            if (material instanceof THREE.MeshBasicMaterial) {
              material.color.convertSRGBToLinear();
            }
            
            // For phong materials, adjust shininess
            if (material instanceof THREE.MeshPhongMaterial) {
              material.shininess = 30;
              material.specular = new THREE.Color(0x333333);
            }
          });
        }
      }
    });
    
    // Material fixes complete
  }, [arenaScene]);
  
  // Apply any transformations or adjustments to the arena if needed
  useFrame(() => {
    if (arenaRef.current) {
      // You can add animations or transformations here if needed
      // For now, we'll just keep it static
    }
  });
  
  return (
    <group ref={arenaRef} dispose={null}>
      {/* Use primitive to render the entire GLTF scene */}
      <primitive object={arenaScene} position={[0, 0, 0]} scale={50} />
    </group>
  );
}

// Preload the model
useGLTF.preload('/models/env/arena.glb');
