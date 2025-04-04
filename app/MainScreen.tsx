"use client";

import { Suspense, useRef, useEffect, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Environment, useTexture, Sky, Stars, Cloud, useGLTF, Plane } from "@react-three/drei";
import * as THREE from "three";
import { 
  EffectComposer, 
  Bloom, 
  Vignette, 
  DepthOfField, 
  ColorDepth, 
  HueSaturation, 
  ChromaticAberration, 
  GodRays,
  ToneMapping,
  BrightnessContrast,
  Noise
} from "@react-three/postprocessing";
import { SSAOEffect, BlendFunction, EffectPass } from "postprocessing";

// Type definitions
interface DeadTreeProps {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
}

interface StoneRuinsProps {
  position: [number, number, number];
}

interface RockProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  scale: number | [number, number, number];
  variant?: number; // To use different rock shapes
}

interface TreeProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}

// Terrain component to match Elden Ring's muted, darker landscape with realistic grass
function Terrain() {
  const terrainRef = useRef<THREE.Mesh>(null!);
  const grassRef = useRef<THREE.InstancedMesh>(null!);
  
  // Load textures once at component level for reuse
  const textures = useTexture({
    map: "/textures/grass/grass_diffuse.png",
    normalMap: "/textures/grass/grass_normal.png",
    // aoMap removed as it requires UV2 coordinates which we don't have
    // aoMap: "/textures/grass/grass_ao.png",
    roughnessMap: "/textures/grass/grass_roughness.png"
  });
  
  // Configure textures for authentic Elden Ring ground coverage
  useEffect(() => {
    // Skip if textures failed to load
    if (!textures.map || !textures.normalMap || !textures.roughnessMap) {
      console.error('Texture failed to load');
      return;
    }
    
    // Set texture repeat for tiling - optimized for Elden Ring terrain
    Object.values(textures).forEach(texture => {
      // Ensure textures are correctly set up for tiling across the entire terrain
      texture.repeat.set(2, 2); // Using 2x2 tiling as mentioned in memory to avoid strange patterns
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      // For better performance and visual quality
      texture.minFilter = THREE.LinearMipMapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.anisotropy = 16; // Maximum anisotropy for sharp textures at angles
      texture.needsUpdate = true; // Force texture update
    });
    
    // Remove normal map effect which causes banding issues
    if (textures.normalMap) {
      textures.normalMap.colorSpace = THREE.NoColorSpace;
    }
  }, [textures]);
  
  // Setup grass instances in useEffect
  useEffect(() => {
    if (grassRef.current) {
      // Create a temp matrix for setting grass blade instances
      const matrix = new THREE.Matrix4();
      const position = new THREE.Vector3();
      const rotation = new THREE.Euler();
      const quaternion = new THREE.Quaternion();
      const scale = new THREE.Vector3();
      
      // Loop for each grass blade instance - using full capacity with complete coverage strategy
      for (let i = 0; i < 10000; i++) {
        // Use a grid-based distribution with slight randomness for full coverage
        // Divide the terrain into a grid and place grass in each cell with some randomness
        
        // Define grid dimensions for complete coverage (larger than terrain to ensure full coverage)
        const gridSize = 600; // Match the reduced terrain size (70% smaller)
        const cellSize = 10; // Cell size for the reduced terrain
        const numCells = Math.floor(gridSize / cellSize);
        
        // Calculate grid position (ensuring full coverage)
        const gridX = Math.floor(i % numCells);
        const gridZ = Math.floor(i / numCells) % numCells;
        
        // Add randomness within each cell
        const offsetX = (Math.random() - 0.5) * cellSize * 0.8;
        const offsetZ = (Math.random() - 0.5) * cellSize * 0.8;
        
        // Convert to world coordinates (centered on origin)
        const x = (gridX - numCells/2) * cellSize + offsetX;
        const z = (gridZ - numCells/2) * cellSize + offsetZ;

        // For remaining grass blades (if any), add random distribution across terrain
        if (gridX * numCells + gridZ >= numCells * numCells) {
          const radius = 290; // Slightly smaller than terrain radius of 300 for better edge coverage
          const theta = Math.random() * Math.PI * 2;
          const r = Math.random() * radius;
          position.set(Math.cos(theta) * r, 0, Math.sin(theta) * r);
        } else {
          position.set(x, 0, z);
        }
        
        // Small random avoidance of pure center for pathways
        const distanceFromCenter = Math.sqrt(position.x * position.x + position.z * position.z);
        if (distanceFromCenter < 5) {
          position.normalize().multiplyScalar(5 + Math.random() * 3);
        }
        
        // Vary height based on noise pattern for natural landscape undulation
        const noiseValue = (Math.sin(position.x * 0.1) + Math.sin(position.z * 0.1)) * 0.25;
        position.y = noiseValue - 0.4; // Adjust base height
        
        // Random rotation for varied look
        rotation.y = Math.random() * Math.PI;
        quaternion.setFromEuler(rotation);
        
        // Vary the size of grass blades slightly
        const grassScale = 0.3 + Math.random() * 0.2;
        scale.set(grassScale, grassScale, grassScale);
        
        // Apply the transformations to the matrix
        matrix.compose(position, quaternion, scale);
        
        // Set the matrix for this grass instance
        grassRef.current.setMatrixAt(i, matrix);
      }
      
      // Update the instance buffer
      grassRef.current.instanceMatrix.needsUpdate = true;
    }
  }, []);
  
  return (
    <group>
      {/* Base terrain with textures for realistic appearance */}
      <mesh 
        ref={terrainRef} 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, -0.7, 0]} 
        receiveShadow
      >
        <planeGeometry args={[600, 600, 48, 48]} /> {/* Reduced terrain size by 70% as requested */}
        <meshStandardMaterial 
          map={textures.map}
          // Removed normalMap which caused rainbow banding issues
          roughnessMap={textures.roughnessMap}
          color="#5a6341" // Brighter green ground color to enhance visibility
          roughness={0.7}
          metalness={0.02}
          envMapIntensity={0.7}
          // No emissive effect on ground - not present in actual Elden Ring
          // No normalScale as we removed the normalMap
        />
      </mesh>
      
      {/* Muddy dark areas matching the image */}
      <mesh
        position={[0, -0.4, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[500, 500, 24, 24]} /> {/* Reduced for smaller terrain */}
        <meshStandardMaterial
          map={textures.map}
          // Reduce the use of normal maps which might be causing the banding
          // normalMap={textures.normalMap}
          roughnessMap={textures.roughnessMap}
          // No aoMap here either
          color="#50513c" // Brighter muddy green color for visibility
          roughness={0.85}
          metalness={0.02}
          // normalScale={[0.1, 0.1]}
          emissive="#282720" // Subtle base illumination
          emissiveIntensity={0.12}
          alphaTest={0}
          transparent={false}
        />
      </mesh>
      
      {/* Simplified patchy grass areas like in Elden Ring - with more natural coloration */}
      <group position={[0, -0.35, 0]}>
        {/* Main patches distributed across expanded terrain */}
        <mesh position={[0, 0.1, 8]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[180, 150, 16, 16]} />
          <meshStandardMaterial 
            map={textures.map}
            // Removed normal map which might be causing the strange patterns
            color="#4d5438" 
            roughness={0.9}
          />
        </mesh>
        
        {/* Larger scattered patches appropriate for the expanded terrain */}
        <mesh position={[-300, 0.15, -200]} rotation={[-Math.PI / 2, Math.PI / 6, 0]} receiveShadow>
          <planeGeometry args={[220, 180, 16, 16]} />
          <meshStandardMaterial color="#494b36" roughness={1} opacity={0.95} transparent={true} />
        </mesh>
        
        <mesh position={[350, 0, -280]} rotation={[-Math.PI / 2, -Math.PI / 8, 0]} receiveShadow>
          <planeGeometry args={[190, 160, 16, 16]} />
          <meshStandardMaterial color="#3a3d2e" roughness={1} opacity={0.85} transparent={true} />
        </mesh>
        
        <mesh position={[-400, 0.1, 350]} rotation={[-Math.PI / 2, Math.PI / 5, 0]} receiveShadow>
          <planeGeometry args={[220, 200, 16, 16]} />
          <meshStandardMaterial color="#4d5438" roughness={0.95} opacity={0.9} transparent={true} />
        </mesh>
        
        <mesh position={[500, 0.15, 400]} rotation={[-Math.PI / 2, -Math.PI / 7, 0]} receiveShadow>
          <planeGeometry args={[250, 230, 16, 16]} />
          <meshStandardMaterial color="#3a3d2e" roughness={0.9} opacity={0.85} transparent={true} />
        </mesh>
        
        {/* Water features/wet areas scattered across landscape */}
        <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[120, 100, 4, 4]} />
          <meshStandardMaterial color="#252521" roughness={0.3} metalness={0.6} opacity={0.3} transparent={true} />
        </mesh>
        
        <mesh position={[-600, -0.05, -500]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[180, 150, 4, 4]} />
          <meshStandardMaterial color="#252521" roughness={0.3} metalness={0.6} opacity={0.3} transparent={true} />
        </mesh>
        
        <mesh position={[550, -0.05, 500]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[200, 180, 4, 4]} />
          <meshStandardMaterial color="#252521" roughness={0.3} metalness={0.6} opacity={0.3} transparent={true} />
        </mesh>
      </group>
      
      {/* Procedural 3D grass blades using instanced mesh for better performance */}
      {/* Dense Elden Ring-style grass blades covering the landscape */}
      <instancedMesh 
        ref={grassRef} 
        args={[undefined, undefined, 20000]} // Reduced for smaller terrain but still dense
        castShadow 
        receiveShadow
      >
        <coneGeometry args={[0.07, 0.8, 3]} /> {/* Slightly larger grass blades */}
        <meshStandardMaterial 
          color="#597048" 
          roughness={0.9} 
          metalness={0.04}
          side={THREE.DoubleSide}
          alphaTest={0.3}
          emissive="#2c3522"
          emissiveIntensity={0.1}
        />
      </instancedMesh>
      
      {/* Second grass type - taller and darker for visual variety */}
      <instancedMesh
        args={[undefined, undefined, 5000]}
        castShadow
        receiveShadow
      >
        <coneGeometry args={[0.03, 1.2, 3]} />
        <meshStandardMaterial
          color="#3a3c2c"
          roughness={1}
          metalness={0.02}
          side={THREE.DoubleSide}
          alphaTest={0.3}
        />
      </instancedMesh>
    </group>
  );
}

// Rock component - creates varied rock formations commonly found in Elden Ring
function Rock({ position, rotation = [0, 0, 0], scale, variant = 0 }: RockProps) {
  const rockRef = useRef<THREE.Group>(null!);
  const rockColor = "#696660"; // Elden Ring's characteristic rocky gray
  const rockRoughness = 0.9;
  
  // Create different rock shapes based on variant
  const renderRockVariant = () => {
    switch(variant % 3) {
      case 0: // Larger boulder
        return (
          <>
            <mesh castShadow receiveShadow>
              <dodecahedronGeometry args={[1, 1]} />
              <meshStandardMaterial color={rockColor} roughness={rockRoughness} />
            </mesh>
            <mesh position={[0.6, -0.4, 0.3]} castShadow receiveShadow>
              <dodecahedronGeometry args={[0.6, 1]} />
              <meshStandardMaterial color={rockColor} roughness={rockRoughness} />
            </mesh>
          </>
        );
      case 1: // Jagged rock formation
        return (
          <>
            <mesh castShadow receiveShadow>
              <octahedronGeometry args={[0.8, 1]} />
              <meshStandardMaterial color={rockColor} roughness={rockRoughness} />
            </mesh>
            <mesh position={[-0.5, 0.2, 0.3]} rotation={[0.2, 0.5, 0.1]} castShadow receiveShadow>
              <octahedronGeometry args={[0.5, 1]} />
              <meshStandardMaterial color={rockColor} roughness={rockRoughness} />
            </mesh>
          </>
        );
      case 2: // Flatter rock
      default:
        return (
          <>
            <mesh castShadow receiveShadow rotation={[0.4, 0.1, 0.2]}>
              <boxGeometry args={[1.2, 0.5, 0.8]} />
              <meshStandardMaterial color={rockColor} roughness={rockRoughness} />
            </mesh>
            <mesh position={[0.4, 0.3, 0.1]} rotation={[0.1, 0.3, 0.1]} castShadow receiveShadow>
              <boxGeometry args={[0.6, 0.3, 0.7]} />
              <meshStandardMaterial color={rockColor} roughness={rockRoughness} />
            </mesh>
          </>
        );
    }
  };
  
  // Ensure we have a properly typed [x,y,z] scale vector
  const scaleVector: [number, number, number] = Array.isArray(scale) 
    ? [scale[0], scale[1], scale[2]] 
    : [scale, scale, scale];
  
  return (
    <group ref={rockRef} position={position} rotation={rotation} scale={scaleVector}>
      {renderRockVariant()}
    </group>
  );
}

// Dead tree component - truly skeletal dead trees like in Elden Ring
function DeadTree({ position, rotation, scale }: DeadTreeProps) {
  // Load the dead tree 3D model
  const { scene } = useGLTF('/textures/trees/dead_tree.glb');
  
  // Create a memoized clone of the scene to avoid performance issues when reusing model
  const deadTreeModel = useMemo(() => {
    if (!scene) {
      console.error('Dead tree model failed to load');
      return null;
    }
    
    // Clone the original scene so we can reuse it for multiple instances
    const clonedTree = scene.clone();
    
    // Set up shadow properties and enhance materials on all meshes in the model
    clonedTree.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        node.castShadow = true;
        node.receiveShadow = true;
        
        // Enhance material quality if it exists
        if (node.material) {
          // Apply Elden Ring-like material properties for dead trees
          node.material.envMapIntensity = 0.6;
          node.material.roughness = 0.9; 
          node.material.metalness = 0.02;
          
          // Adjust color to match Elden Ring's dead tree aesthetic
          node.material.color = new THREE.Color('#554a42');
          
          // Apply subtle emissive glow for better visibility in shadows
          node.material.emissive = new THREE.Color(0x1a1714);
          node.material.emissiveIntensity = 0.1;
        }
      }
    });
    
    return clonedTree;
  }, [scene]);
  
  // Fallback to the procedural tree if model fails to load
  if (!deadTreeModel) {
    return (
      <group position={position} rotation={rotation} scale={scale}>
        <mesh position={[0, 5, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.1, 0.2, 10, 5]} />
          <meshStandardMaterial color="#2b2722" roughness={1} />
        </mesh>
        <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.3, 0.2, 0.6, 5]} />
          <meshStandardMaterial color="#2b2722" roughness={1} />
        </mesh>
      </group>
    );
  }
  
  // The actual loaded model - scaled to match the pine trees height
  return (
    <primitive 
      object={deadTreeModel} 
      position={position} 
      rotation={rotation} 
      // Scale is adjusted to match the pine tree height
      scale={typeof scale === 'number' ? scale * 2.5 : scale} 
    />
  );
}

// Pine tree component using the GLB model
function Tree({ position, rotation = [0, 0, 0], scale = 1 }: TreeProps) {
  // Load the pine tree model from the correct path (found in public directory)
  const { scene } = useGLTF('/textures/trees/tree.glb'); // Path to the actual model file
  
  // Create a memoized clone of the scene to avoid performance issues when reusing model
  const treeModel = useMemo(() => {
    if (!scene) {
      console.error('Pine tree model failed to load');
      return null;
    }
    
    // Clone the original scene so we can reuse it for multiple instances
    const clonedTree = scene.clone();
    
    // Set up shadow properties and enhance materials on all meshes in the model
    clonedTree.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        node.castShadow = true;
        node.receiveShadow = true;
        
        // Enhance material quality if it exists
        if (node.material) {
          // Apply Elden Ring-like material properties
          node.material.envMapIntensity = 0.8;
          node.material.roughness = 0.7; 
          node.material.metalness = 0.05;
          
          // Apply emissive glow for better visibility
          node.material.emissive = new THREE.Color(0x0a1f12);
          node.material.emissiveIntensity = 0.15;
        }
      }
    });
    
    return clonedTree;
  }, [scene]);
  
  // Fallback to procedural tree if model fails to load
  if (!treeModel) {
    return (
      <group position={position} rotation={rotation} scale={scale}>
        {/* Fallback tree trunk */}
        <mesh castShadow receiveShadow position={[0, 2, 0]}>
          <cylinderGeometry args={[0.25, 0.5, 4, 8]} />
          <meshStandardMaterial color="#3d2817" roughness={0.9} />
        </mesh>
        
        {/* Fallback foliage */}
        <mesh castShadow receiveShadow position={[0, 5, 0]}>
          <coneGeometry args={[2, 6, 8]} />
          <meshStandardMaterial color="#1f5c38" roughness={0.8} metalness={0.05} />
        </mesh>
      </group>
    );
  }
  
  return (
    <primitive 
      object={treeModel} 
      position={position} 
      rotation={rotation} 
      // Scale adjusted to ensure consistent height with dead trees
      scale={typeof scale === 'number' ? scale * 2 : scale} 
    />
  );
}

// Preload both tree models for better performance
useGLTF.preload('/textures/trees/tree.glb');
useGLTF.preload('/textures/trees/dead_tree.glb');

// Stone ruins component - authentic Elden Ring ruins with weathered, broken architecture
function StoneRuins({ position }: StoneRuinsProps) {
  const ruinsRef = useRef<THREE.Group>(null!);
  
  // Stone color to exactly match the weathered ruins in Elden Ring
  const stoneColor = "#887f72";  // Slightly warmer, more authentic color
  const stoneRoughness = 0.9;
  const stoneDarkened = "#635c52"; // Darkened areas of the same stone
  
  return (
    <group ref={ruinsRef} position={position}>
      {/* Main archway structure - similar to the arch visible in the image */}
      <group position={[0, 0, 0]}>
        {/* Main stone arch with broken, crumbling appearance */}
        
        {/* Left pillar - weathered and broken */}
        <mesh position={[-4, 3, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.2, 7, 2.2]} />
          <meshStandardMaterial color={stoneColor} roughness={stoneRoughness} />
        </mesh>
        
        {/* Left pillar damage/erosion pieces */}
        <mesh position={[-3.5, 5, 1]} rotation={[0.1, 0.2, -0.1]} castShadow receiveShadow>
          <boxGeometry args={[1.2, 1.5, 0.8]} />
          <meshStandardMaterial color={stoneDarkened} roughness={stoneRoughness} />
        </mesh>
        
        {/* Right pillar - more severely damaged */}
        <mesh position={[4, 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.2, 4.5, 2.2]} />
          <meshStandardMaterial color={stoneColor} roughness={stoneRoughness} />
        </mesh>
        
        {/* Right pillar damage */}
        <mesh position={[4.2, 3.5, 0.8]} rotation={[0.2, -0.1, 0.15]} castShadow receiveShadow>
          <boxGeometry args={[1.4, 1.8, 0.9]} />
          <meshStandardMaterial color={stoneDarkened} roughness={stoneRoughness} />
        </mesh>
        
        {/* Top archway piece - cracked and tilted */}
        <mesh position={[0, 5.8, 0]} rotation={[0, 0, Math.PI / 25]} castShadow>
          <boxGeometry args={[9.5, 1.2, 2.4]} />
          <meshStandardMaterial color={stoneColor} roughness={stoneRoughness} />
        </mesh>
        
        {/* Top arch damage */}
        <mesh position={[2, 5.6, 0.6]} rotation={[0.1, 0.05, -0.08]} castShadow>
          <boxGeometry args={[2.2, 0.9, 0.8]} />
          <meshStandardMaterial color={stoneDarkened} roughness={stoneRoughness} />
        </mesh>
        
        {/* Architectural details - typical of Elden Ring's ornate ruins */}
        <mesh position={[-4, 6.8, 0]} castShadow>
          <boxGeometry args={[2.4, 0.8, 2.2]} />
          <meshStandardMaterial color={stoneColor} roughness={stoneRoughness} />
        </mesh>
      </group>
      
      {/* Broken wall structures */}
      <group position={[-8, 0, 3]} rotation={[0, Math.PI/6, 0]}>
        <mesh position={[0, 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[5, 4, 1.5]} />
          <meshStandardMaterial color={stoneColor} roughness={stoneRoughness} />
        </mesh>
        
        {/* Wall top details */}
        <mesh position={[0, 4.3, 0]} castShadow>
          <boxGeometry args={[5.5, 0.8, 1.7]} />
          <meshStandardMaterial color={stoneColor} roughness={stoneRoughness} />
        </mesh>
      </group>
      
      {/* Fallen/broken stone pieces scattered around */}
      <group position={[0, 0, 0]}>
        <mesh position={[2, 0.4, 4]} rotation={[0.2, -Math.PI/4, 0.1]} castShadow receiveShadow>
          <boxGeometry args={[2, 1, 1.2]} />
          <meshStandardMaterial color={stoneColor} roughness={stoneRoughness} />
        </mesh>
        
        <mesh position={[-5, 0.3, -3]} rotation={[0.1, Math.PI/5, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.8, 0.9, 1.5]} />
          <meshStandardMaterial color={stoneColor} roughness={stoneRoughness} />
        </mesh>
        
        <mesh position={[6, 0.25, 1]} rotation={[0, -Math.PI/8, 0.15]} castShadow receiveShadow>
          <boxGeometry args={[1.5, 0.7, 1.2]} />
          <meshStandardMaterial color={stoneColor} roughness={stoneRoughness} />
        </mesh>
      </group>
    </group>
  );
}

// Atmosphere component to create the authentic Elden Ring golden sky effect
function EldenAtmosphere() {
  const { scene } = useThree();
  
  useEffect(() => {
    // Set the scene background and fog to match the exact Elden Ring's amber/gold atmosphere
    scene.background = new THREE.Color("#b6915e");
    // Switch to regular Fog for more control over near/far values - less black at lower distances
    scene.fog = new THREE.Fog("#b6915e", 10, 150);
  }, [scene]);
  
  return (
    <>
      {/* Custom sky precisely matching Elden Ring's golden sky */}
      <Sky 
        distance={450000} 
        sunPosition={[50, 10, -10]} 
        inclination={0.5}
        azimuth={0.25}
        mieCoefficient={0.015}
        mieDirectionalG={0.85}
        rayleigh={0.3} 
        turbidity={10}
      />
      
      {/* Very subtle stars for depth - barely visible through the golden fog */}
      <Stars 
        radius={200} 
        depth={50} 
        count={500} 
        factor={2} 
        fade 
        speed={0.2}
      />
      
      {/* Atmospheric clouds */}
      <group position={[0, 40, -10]}>
        <Cloud
          opacity={0.6}
          speed={0.4}
          segments={20}
          color="#d4c18f"
        />
      </group>
      
      <group position={[-20, 45, 0]}>
        <Cloud
          opacity={0.4}
          speed={0.3}
          segments={15}
          color="#d4c18f"
        />
      </group>
    </>
  );
}

// Scene component that combines all elements
function EldenRingScene() {
  return (
    <>
      {/* Use an HDR environment map for high-quality lighting and reflections */}
      <Environment
        preset="sunset"  // Options: 'sunset', 'dawn', 'night', 'warehouse', 'forest', 'apartment', 'studio', 'city', 'park', 'lobby'
        background={false}  // Keep our custom skybox
        blur={0.5}         // Blur factor for reflections
      />
      
      {/* Brighter ambient lighting to make grass more visible */}
      <ambientLight intensity={1.2} color="#f0e0c2" />
      
      {/* Main directional sunlight with ultra-high quality shadows - the key to AAA visuals */}
      <directionalLight 
        position={[60, 100, -40]} 
        intensity={1.1} 
        color="#ffe0b2" 
        castShadow 
        shadow-mapSize-width={4096} 
        shadow-mapSize-height={4096} 
        shadow-camera-far={1000}
        shadow-camera-left={-500}
        shadow-camera-right={500}
        shadow-camera-top={500}
        shadow-camera-bottom={-500}
        shadow-bias={-0.00025}
        shadow-radius={2}
        shadow-blurSamples={25}
        shadow-normalBias={0.035}
        shadow-darkness={0.08}
      />
      {/* Secondary directional light - creates the signature Elden Ring backlight glow effect */}
      <directionalLight 
        position={[-50, 100, 100]} 
        intensity={0.6} 
        color="#ffecd8" 
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={500}
        shadow-camera-left={-200}
        shadow-camera-right={200}
        shadow-camera-top={200}
        shadow-camera-bottom={-200}
        shadow-radius={3}
        shadow-bias={-0.0002}
      />
      
      {/* Enhanced hemisphere light for authentic Elden Ring global illumination */}
      <hemisphereLight intensity={0.6} color="#f0dba3" groundColor="#2f2b26" />
      
      {/* Rim light for character silhouetting - essential for AAA cinematic look */}
      <directionalLight 
        position={[-100, 30, -80]}
        intensity={0.4}
        color="#ffd9a3"
      />
      
      {/* Subtle bounce light from environment - mimicking GI systems in AAA games */}
      <directionalLight
        position={[10, 20, 120]}
        intensity={0.3}
        color="#fff0d8"
      />
      {/* Additional ambient fill to ensure no part of the scene is too dark */}
      <ambientLight intensity={0.35} color="#d4ba8c" />
      
      {/* Environment */}
      <EldenAtmosphere />
      <Terrain />
      
      {/* Dead trees evenly distributed throughout the smaller landscape */}
      <DeadTree position={[-150, 0, -120]} rotation={[0, Math.PI / 5, 0.02]} scale={1.5} />
      <DeadTree position={[-80, 0, 90]} rotation={[0, Math.PI / 3, -0.03]} scale={1.2} />
      <DeadTree position={[50, 0, -170]} rotation={[0, -Math.PI / 4, 0.01]} scale={1.4} />
      <DeadTree position={[-210, 0, -50]} rotation={[0, -Math.PI / 6, 0]} scale={1.3} />
      <DeadTree position={[180, 0, -90]} rotation={[0, Math.PI / 8, 0.04]} scale={1.4} />
      <DeadTree position={[120, 0, 135]} rotation={[0, -Math.PI / 7, 0]} scale={1.3} />
      <DeadTree position={[-120, 0, 180]} rotation={[0, Math.PI / 9, -0.02]} scale={1.2} />
      <DeadTree position={[80, 0, -60]} rotation={[0, -Math.PI / 5, 0.03]} scale={1.4} />
      <DeadTree position={[-70, 0, -80]} rotation={[0, Math.PI / 4, -0.01]} scale={1.3} />
      <DeadTree position={[-25, 0, 160]} rotation={[0, Math.PI / 3, 0.02]} scale={1.2} />
      <DeadTree position={[190, 0, 70]} rotation={[0, Math.PI / 6, 0.03]} scale={1.3} />
      <DeadTree position={[0, 0, -150]} rotation={[0, -Math.PI / 4, 0.01]} scale={1.2} />
      <DeadTree position={[-160, 0, 10]} rotation={[0, Math.PI / 7, 0.02]} scale={1.3} />
      <DeadTree position={[130, 0, -130]} rotation={[0, -Math.PI / 5, 0.01]} scale={1.2} />
      
      {/* Pine trees evenly distributed across the reduced landscape */}
      <Tree position={[-90, 0, -140]} rotation={[0, Math.PI * 0.3, 0]} scale={0.9} />
      <Tree position={[95, 0, -80]} rotation={[0, Math.PI * 0.5, 0]} scale={0.8} />
      <Tree position={[-50, 0, 110]} rotation={[0, Math.PI * 0.2, 0]} scale={0.7} />
      <Tree position={[140, 0, 50]} rotation={[0, Math.PI * 0.4, 0]} scale={0.9} />
      <Tree position={[-160, 0, 50]} rotation={[0, Math.PI * 0.1, 0]} scale={0.8} />
      <Tree position={[60, 0, 160]} rotation={[0, Math.PI * 0.7, 0]} scale={0.7} />
      <Tree position={[170, 0, -30]} rotation={[0, Math.PI * 0.9, 0]} scale={0.8} />
      <Tree position={[-30, 0, -100]} rotation={[0, Math.PI * 0.6, 0]} scale={0.9} />
      <Tree position={[40, 0, -170]} rotation={[0, Math.PI * 0.8, 0]} scale={0.7} />
      <Tree position={[-130, 0, -40]} rotation={[0, Math.PI * 1.0, 0]} scale={0.8} />
      <Tree position={[120, 0, 110]} rotation={[0, Math.PI * 1.5, 0]} scale={0.9} />
      <Tree position={[-70, 0, 60]} rotation={[0, Math.PI * 1.3, 0]} scale={0.8} />
      <Tree position={[20, 0, 80]} rotation={[0, Math.PI * 1.4, 0]} scale={0.7} />
      <Tree position={[-180, 0, -70]} rotation={[0, Math.PI * 1.2, 0]} scale={0.9} />
      <Tree position={[-110, 0, 140]} rotation={[0, Math.PI * 1.6, 0]} scale={0.8} />
      
      {/* Stone ruins distributed throughout the landscape - increased quantity */}
      <StoneRuins position={[-22, 0, -15]} />
      <StoneRuins position={[24, 0, -14]} />
      <StoneRuins position={[-30, 0, -30]} />
      <StoneRuins position={[35, 0, -10]} />
      <StoneRuins position={[0, 0, -40]} />
      
      {/* Scattered rocks and boulders throughout the environment */}
      <Rock position={[-10, 0, -8]} scale={1.5} variant={0} />
      <Rock position={[12, 0, -15]} scale={1.2} variant={1} />
      <Rock position={[-15, 0, -25]} scale={1.8} variant={2} />
      <Rock position={[20, 0, -5]} scale={1.3} variant={0} />
      <Rock position={[5, 0, -18]} scale={0.9} variant={1} />
      <Rock position={[-8, 0, -30]} scale={1.4} variant={2} />
      <Rock position={[-25, 0, -5]} scale={1.1} variant={0} />
      <Rock position={[30, 0, -25]} scale={1.7} variant={1} />
      <Rock position={[0, 0, -12]} scale={0.8} variant={2} />
      <Rock position={[-18, 0, -18]} scale={1.0} variant={0} />
      
      {/* Additional smaller boulders and rocks for detail */}
      <Rock position={[8, 0, -3]} scale={0.5} variant={0} />
      <Rock position={[-3, 0, -7]} scale={0.6} variant={1} />
      <Rock position={[15, 0, -28]} scale={0.4} variant={2} />
      <Rock position={[-12, 0, -32]} scale={0.7} variant={0} />
      <Rock position={[22, 0, -8]} scale={0.6} variant={1} />
      <Rock position={[-28, 0, -22]} scale={0.5} variant={2} />
      <Rock position={[4, 0, -35]} scale={0.8} variant={0} />
      <Rock position={[-35, 0, -10]} scale={0.7} variant={1} />
      <Rock position={[25, 0, -30]} scale={0.5} variant={2} />
      <Rock position={[-5, 0, -15]} scale={0.4} variant={0} />
      <Rock position={[18, 0, -35]} scale={0.6} variant={1} />
      
      {/* Controls */}
      <OrbitControls 
        enableZoom={true}
        enablePan={true}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.2} 
      />
      
      {/* Enhanced AAA-quality post-processing effects */}
      <EffectComposer multisampling={8} stencilBuffer={true}>
        {/* Minimal film grain - barely noticeable */}
        <Noise opacity={0.015} />
        
        {/* Motion blur effect would go here but is not available in current version */}
        
        {/* Subtle bloom effect - reduced to improve clarity */}
        <Bloom 
          luminanceThreshold={0.2} 
          luminanceSmoothing={0.7} 
          height={300} 
          intensity={0.25} 
        />
        
        {/* Simplified tone mapping for better clarity */}
        <ToneMapping
          adaptive={true}
          resolution={256}
          middleGrey={0.5}
          maxLuminance={12.0}
          averageLuminance={0.8}
          adaptationRate={0.8}
        />
        
        {/* Minimal color adjustments for better clarity */}
        <HueSaturation 
          hue={0.01} /* Very subtle golden tint */
          saturation={0.08} /* Reduced saturation for more natural look */
        />
        
        <BrightnessContrast
          brightness={0.02}
          contrast={0.1}
        />
        
        {/* Disabled chromatic aberration to prevent edge blurring */}
        {/* <ChromaticAberration
          offset={[0.0001, 0.0001]}
        /> */}
        
        {/* Lighter vignette that doesn't darken edges as much */}
        <Vignette 
          eskil={false} 
          offset={0.1} 
          darkness={0.2} 
        />
      </EffectComposer>
    </>
  );
}

export function MainScreen() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Canvas 
        shadows 
        dpr={[1, 1.5]} 
        camera={{ position: [0, 20, 25], fov: 50, near: 0.1, far: 1000 }}
        gl={{ antialias: true, toneMappingExposure: 1.0, alpha: false }}
      >
        <Suspense fallback={null}>
          <EldenRingScene />
        </Suspense>
      </Canvas>
    </div>
  );
}
