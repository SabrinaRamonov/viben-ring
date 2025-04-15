import * as THREE from 'three';
import { FBXLoader } from 'three-stdlib';

/**
 * Load an FBX model from the given URL
 * @param url Path to the FBX file
 * @param scale Scale factor for the model (default: 0.01)
 * @returns Promise that resolves to a THREE.Group containing the model
 */
export function loadFBX(url: string, scale: number = 0.01): Promise<THREE.Group> {
  const loader = new FBXLoader();
  
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (fbx) => {
        // Scale down the model (FBX models are often very large)
        fbx.scale.set(scale, scale, scale);
        
        // Traverse the model and set up materials
        fbx.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            // Enable shadows
            child.castShadow = true;
            child.receiveShadow = true;
            
            // Ensure materials are properly configured
            if (child.material) {
              const materials = Array.isArray(child.material) 
                ? child.material 
                : [child.material];
              
              materials.forEach(material => {
                // Set up PBR materials if needed
                if (material instanceof THREE.MeshStandardMaterial) {
                  material.roughness = 0.8;
                  material.metalness = 0.2;
                }
              });
            }
          }
        });
        
        resolve(fbx);
      },
      // Progress callback
      (xhr) => {
        console.log(`${url} ${(xhr.loaded / xhr.total) * 100}% loaded`);
      },
      // Error callback
      (error) => {
        console.error('Error loading FBX model:', error);
        reject(error);
      }
    );
  });
}

/**
 * Load an FBX animation from the given URL
 * @param url Path to the FBX file containing the animation
 * @param scale Scale factor for the animation (default: 0.01)
 * @returns Promise that resolves to a THREE.AnimationClip
 */
export function loadAnimation(url: string, scale: number = 0.01): Promise<THREE.AnimationClip> {
  return new Promise((resolve, reject) => {
    const loader = new FBXLoader();
    
    loader.load(
      url,
      (fbx) => {
        // Get the animation from the loaded FBX
        const animationClip = fbx.animations[0];
        
        if (!animationClip) {
          reject(new Error(`No animation found in ${url}`));
          return;
        }
        
        resolve(animationClip);
      },
      // Progress callback
      (xhr) => {
        console.log(`${url} animation ${(xhr.loaded / xhr.total) * 100}% loaded`);
      },
      // Error callback
      (error) => {
        console.error('Error loading animation:', error);
        reject(error);
      }
    );
  });
}
