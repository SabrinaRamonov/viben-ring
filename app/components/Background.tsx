'use client';

import React, { useRef, useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface BackgroundProps {
  treeCount?: number;
  radius?: number;
}

// The arena is scaled by 50, so we need to ensure trees are outside this boundary
// Assuming the arena model has a radius of around 2-3 units, that means 100-150 units in the scene
const ARENA_RADIUS = 150; // Safe estimate for the arena's radius after scaling

// Function to generate random positions within a radius, strictly outside the arena
const generateRandomPosition = (radius: number, minDistance: number = ARENA_RADIUS) => {
  // Ensure minimum distance is at least the arena radius plus some buffer
  const safeMinDistance = Math.max(minDistance, ARENA_RADIUS + 20); // Add 20 unit buffer
  
  // Generate random angle and distance
  const angle = Math.random() * Math.PI * 2;
  
  // Generate distance between safeMinDistance and radius
  const distance = safeMinDistance + Math.random() * (radius - safeMinDistance);
  
  // Convert polar to Cartesian coordinates
  const x = Math.cos(angle) * distance;
  const z = Math.sin(angle) * distance;
  
  // Trees should be on the ground level
  const y = -2;
  
  return new THREE.Vector3(x, y, z);
};

// Function to generate random scale with some variation
const generateRandomScale = (baseScale: number, variation: number = 0.5) => {
  // Create non-uniform scaling for more natural-looking trees
  const baseX = baseScale + (Math.random() * variation * 2 - variation);
  const baseY = baseScale * (1 + Math.random() * 0.3); // Trees are slightly taller than wide
  const baseZ = baseScale + (Math.random() * variation * 2 - variation);
  return new THREE.Vector3(baseX, baseY, baseZ);
};

// Function to generate random rotation around y-axis
const generateRandomRotation = () => {
  return new THREE.Euler(0, Math.random() * Math.PI * 2, 0);
};

export function Background({ treeCount = 100, radius = 500 }: BackgroundProps) {
  // Load tree model using useGLTF
  const treeModel = useGLTF('/models/env/tree01.glb');
  
  // Clone the model to avoid reference issues
  const treeScene = treeModel.scene.clone();
  
  // Fix materials for trees
  const fixMaterials = (scene: THREE.Object3D) => {
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // Enable shadows
        child.castShadow = true;
        child.receiveShadow = true;
        
        // Ensure materials are properly configured
        if (child.material) {
          // Make a copy of the material to avoid sharing between instances
          if (Array.isArray(child.material)) {
            child.material = child.material.map(mat => mat.clone());
          } else {
            child.material = child.material.clone();
          }
          
          // Apply material settings
          const material = Array.isArray(child.material) ? child.material[0] : child.material;
          
          // Common properties
          material.needsUpdate = true;
          material.roughness = 0.8;
          material.metalness = 0.2;
          material.envMapIntensity = 1;
          
          // Enhance tree colors
          if (material.color) {
            // Randomize tree colors slightly for a more natural forest
            const hueVariation = Math.random() * 0.1 - 0.05; // Small variation around green
            const satVariation = Math.random() * 0.2;
            const lightVariation = Math.random() * 0.2 - 0.1;
            
            material.color.setHSL(
              0.33 + hueVariation, // Green with slight variation
              0.7 + satVariation, 
              0.3 + lightVariation
            );
          }
        }
      }
    });
  };
  
  // Fix materials for trees
  useEffect(() => {
    fixMaterials(treeScene);
  }, []);
  
  // Define tree position type
  type TreePosition = {
    position: THREE.Vector3;
    scale: THREE.Vector3;
    rotation: THREE.Euler;
  };

  // Create tree positions with clustering for a more natural forest
  const createForestPositions = (count: number, radius: number): TreePosition[] => {
    const positions: TreePosition[] = [];
    
    // Create some initial trees
    const initialCount = Math.floor(count * 0.3);
    for (let i = 0; i < initialCount; i++) {
      positions.push({
        position: generateRandomPosition(radius), // Using ARENA_RADIUS as default minimum distance
        scale: generateRandomScale(8, 3), // Larger scale for trees
        rotation: generateRandomRotation()
      });
    }
    
    // Create clusters around initial trees
    for (let i = initialCount; i < count; i++) {
      // Randomly decide if this tree should be part of a cluster
      const isCluster = Math.random() > 0.3;
      
      if (isCluster && positions.length > 0) {
        // Pick a random existing tree to cluster around
        const baseIndex = Math.floor(Math.random() * positions.length);
        const baseTreePosition: THREE.Vector3 = positions[baseIndex].position;
        
        // Create an offset for clustering (closer trees)
        const clusterRadius = 20 + Math.random() * 30;
        const angle = Math.random() * Math.PI * 2;
        const offsetX = Math.cos(angle) * clusterRadius;
        const offsetZ = Math.sin(angle) * clusterRadius;
        
        const newTreePosition: THREE.Vector3 = new THREE.Vector3(
          baseTreePosition.x + offsetX,
          -2, // Ground level
          baseTreePosition.z + offsetZ
        );
        
        // Ensure it's strictly outside the arena boundary
        const distanceFromCenter = Math.sqrt(newTreePosition.x * newTreePosition.x + newTreePosition.z * newTreePosition.z);
        if (distanceFromCenter < ARENA_RADIUS + 20) {
          // If too close to arena, push it outward
          const directionVec = new THREE.Vector3(newTreePosition.x, 0, newTreePosition.z).normalize();
          newTreePosition.copy(directionVec.multiplyScalar(ARENA_RADIUS + 20 + Math.random() * 30));
          newTreePosition.y = -2; // Ensure ground level
        }
        
        positions.push({
          position: newTreePosition,
          // Trees in clusters are slightly smaller on average
          scale: generateRandomScale(7, 2),
          rotation: generateRandomRotation()
        });
      } else {
        // Create a standalone tree
        positions.push({
          position: generateRandomPosition(radius), // Using ARENA_RADIUS as default minimum distance
          scale: generateRandomScale(8, 3),
          rotation: generateRandomRotation()
        });
      }
    }
    
    return positions;
  };
  
  // Generate forest positions using useMemo to prevent regeneration on every render
  const treePositions = useMemo(() => {
    console.log('Generating forest positions - this should only happen once');
    return createForestPositions(treeCount, radius);
  }, [treeCount, radius]);
  
  // Group references for potential animations
  const backgroundRef = useRef<THREE.Group>(null);
  
  return (
    <group ref={backgroundRef}>
      {/* Render forest of trees */}
      {treePositions.map((tree, index) => {
        // Use a stable key based on position to prevent unnecessary re-renders
        const treeKey = `tree-${index}-${tree.position.x.toFixed(2)}-${tree.position.z.toFixed(2)}`;
        
        return (
          <primitive 
            key={treeKey}
            object={treeScene.clone()}
            position={tree.position}
            scale={tree.scale}
            rotation={tree.rotation}
          />
        );
      })}
    </group>
  );
}
