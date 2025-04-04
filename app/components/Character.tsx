'use client';

import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FBXLoader } from 'three-stdlib';

// Simple function to load an FBX model
function loadFBX(url: string): Promise<THREE.Group> {
  return new Promise((resolve, reject) => {
    const loader = new FBXLoader();
    loader.load(
      url,
      (fbx) => {
        console.log('Model loaded successfully:', url);
        fbx.scale.set(0.01, 0.01, 0.01);
        resolve(fbx);
      },
      (xhr) => {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
      },
      (error) => {
        console.error('Error loading model:', error);
        reject(error);
      }
    );
  });
}

// Simple function to load an animation
function loadAnimation(url: string): Promise<THREE.AnimationClip> {
  return new Promise((resolve, reject) => {
    const loader = new FBXLoader();
    loader.load(
      url,
      (fbx) => {
        console.log('Animation loaded successfully:', url);
        console.log('Animations in file:', fbx.animations.length);
        
        if (fbx.animations.length > 0) {
          resolve(fbx.animations[0]);
        } else {
          reject(new Error('No animations found in file'));
        }
      },
      (xhr) => {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
      },
      (error) => {
        console.error('Error loading animation:', error);
        reject(error);
      }
    );
  });
}

// Character component with idle and attack animations
export default function Character() {
  const characterRef = useRef<THREE.Group>(null);
  const directionArrowRef = useRef<THREE.Group>(null); // Reference for the direction arrow
  const forwardVectorRef = useRef<THREE.Group>(null); // Reference for forward vector indicator
  const rightVectorRef = useRef<THREE.Group>(null); // Reference for right vector indicator
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());
  const actionsRef = useRef<{[key: string]: THREE.AnimationAction}>({});
  const isAttackingRef = useRef<boolean>(false);
  const isRollingRef = useRef<boolean>(false);
  const lastCameraRotationRef = useRef<number>(0);
  
  // Movement state references
  const movementRef = useRef<{
    forward: boolean;
    backward: boolean;
    left: boolean;
    right: boolean;
  }>({
    forward: false,
    backward: false,
    left: false,
    right: false
  });
  
  // Camera control references
  const cameraRotationRef = useRef<number>(0); // Horizontal rotation in radians
  const lastMouseXRef = useRef<number>(0);
  
  const [model, setModel] = useState<THREE.Group | null>(null);
  const [animations, setAnimations] = useState<{[key: string]: THREE.AnimationClip}>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Load model and animations
  useEffect(() => {
    async function loadModelAndAnimations() {
      try {
        // Load character model
        const characterModel = await loadFBX('/models/character/character.fbx');
        setModel(characterModel);
        
        // Load idle animation
        const idleAnim = await loadAnimation('/models/character/idle.fbx');
        idleAnim.name = 'idle';
        
        // Load attack animation (sword swing)
        const attackAnim = await loadAnimation('/models/character/melee-light.fbx');
        attackAnim.name = 'attack';
        
        // Load roll animation
        const rollAnim = await loadAnimation('/models/character/roll.fbx');
        rollAnim.name = 'roll';
        
        // Load run animation
        const runAnim = await loadAnimation('/models/character/run-forward.fbx');
        runAnim.name = 'run';
        
        // Load walk animations
        const walkBackwardAnim = await loadAnimation('/models/character/walk-backward.fbx');
        walkBackwardAnim.name = 'walkBackward';
        
        const walkLeftAnim = await loadAnimation('/models/character/walk-left.fbx');
        walkLeftAnim.name = 'walkLeft';
        
        const walkRightAnim = await loadAnimation('/models/character/walk-right.fbx');
        walkRightAnim.name = 'walkRight';
        
        // Store animations
        setAnimations({
          idle: idleAnim,
          attack: attackAnim,
          roll: rollAnim,
          run: runAnim,
          walkBackward: walkBackwardAnim,
          walkLeft: walkLeftAnim,
          walkRight: walkRightAnim
        });
        
        setLoading(false);
      } catch (err) {
        console.error('Failed to load model or animations:', err);
        setError('Failed to load model or animations');
        setLoading(false);
      }
    }
    
    loadModelAndAnimations();
  }, []);
  
  // Set up model and animations once loaded
  useEffect(() => {
    if (!model || !animations.idle || !animations.attack || !animations.roll || !animations.run || 
        !animations.walkBackward || !animations.walkLeft || !animations.walkRight || 
        !characterRef.current) return;
    
    console.log('Setting up character with animations');
    
    // Add model to scene and rotate it to face away from camera
    characterRef.current.add(model);
    
    // Rotate the model 180 degrees so it faces away from the camera
    model.rotation.y = Math.PI;
    
    // Create animation mixer
    const mixer = new THREE.AnimationMixer(model);
    mixerRef.current = mixer;
    
    // Create animation actions
    const idleAction = mixer.clipAction(animations.idle);
    idleAction.setLoop(THREE.LoopRepeat, Infinity);  // Loop indefinitely
    actionsRef.current.idle = idleAction;
    
    const attackAction = mixer.clipAction(animations.attack);
    attackAction.setLoop(THREE.LoopOnce, 1);  // Play once
    attackAction.clampWhenFinished = true;  // Stay at the end of the animation
    actionsRef.current.attack = attackAction;
    
    const rollAction = mixer.clipAction(animations.roll);
    rollAction.setLoop(THREE.LoopOnce, 1);  // Play once
    rollAction.clampWhenFinished = true;  // Stay at the end of the animation
    actionsRef.current.roll = rollAction;
    
    const runAction = mixer.clipAction(animations.run);
    runAction.setLoop(THREE.LoopRepeat, Infinity);  // Loop indefinitely
    actionsRef.current.run = runAction;
    
    // Set up walk animations
    const walkBackwardAction = mixer.clipAction(animations.walkBackward);
    walkBackwardAction.setLoop(THREE.LoopRepeat, Infinity);
    actionsRef.current.walkBackward = walkBackwardAction;
    
    const walkLeftAction = mixer.clipAction(animations.walkLeft);
    walkLeftAction.setLoop(THREE.LoopRepeat, Infinity);
    actionsRef.current.walkLeft = walkLeftAction;
    
    const walkRightAction = mixer.clipAction(animations.walkRight);
    walkRightAction.setLoop(THREE.LoopRepeat, Infinity);
    actionsRef.current.walkRight = walkRightAction;
    
    // Play idle animation by default
    idleAction.play();
    
    // Start the clock
    clockRef.current.start();
    
    return () => {
      // Clean up
      mixer.stopAllAction();
      if (characterRef.current && model) {
        characterRef.current.remove(model);
      }
    };
  }, [model, animations]);
  
  // Handle mouse movement for camera rotation
  useEffect(() => {
    // Initialize last mouse position on first render
    lastMouseXRef.current = window.innerWidth / 2;
    
    const handleMouseMove = (e: MouseEvent) => {
      // Calculate mouse movement delta
      const deltaX = e.clientX - lastMouseXRef.current;
      lastMouseXRef.current = e.clientX;
      
      // Convert mouse movement to rotation (adjust sensitivity as needed)
      const rotationSpeed = 0.005;
      cameraRotationRef.current -= deltaX * rotationSpeed;
    };
    
    // Add mouse event listener
    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);
  
  // Handle mouse click for attack animation
  useEffect(() => {
    const handleMouseClick = () => {
      if (isAttackingRef.current || !mixerRef.current || !actionsRef.current.idle || !actionsRef.current.attack) return;
      
      console.log('Attack animation triggered');
      isAttackingRef.current = true;
      
      // Determine which animation to fade out based on current state
      const { forward, backward, left, right } = movementRef.current;
      const isMoving = forward || backward || left || right;
      const currentAction = isMoving ? (forward ? actionsRef.current.run : backward ? actionsRef.current.walkBackward : left ? actionsRef.current.walkLeft : actionsRef.current.walkRight) : actionsRef.current.idle;
      currentAction.fadeOut(0.2);
      
      // Reset and play attack animation
      actionsRef.current.attack.reset();
      actionsRef.current.attack.fadeIn(0.2);
      actionsRef.current.attack.play();
      
      // Listen for attack animation completion
      const onFinished = (e: any) => {
        // Check if this is our attack animation finishing
        if (e.action === actionsRef.current.attack) {
          console.log('Attack animation finished');
          
          // Fade back to idle or run based on movement state
          actionsRef.current.attack.fadeOut(0.2);
          
          const { forward, backward, left, right } = movementRef.current;
          const isMoving = forward || backward || left || right;
          
          if (isMoving) {
            // Determine which animation to play based on current movement
            let targetAnimation = 'idle';
            
            if (forward) {
              targetAnimation = 'run';
            } else if (backward) {
              targetAnimation = 'walkBackward';
            } else if (left) {
              targetAnimation = 'walkLeft';
            } else if (right) {
              targetAnimation = 'walkRight';
            }
            
            actionsRef.current[targetAnimation].reset();
            actionsRef.current[targetAnimation].fadeIn(0.2);
            actionsRef.current[targetAnimation].play();
          } else {
            actionsRef.current.idle.reset();
            actionsRef.current.idle.fadeIn(0.2);
            actionsRef.current.idle.play();
          }
          
          isAttackingRef.current = false;
          
          // Remove this listener
          mixerRef.current?.removeEventListener('finished', onFinished);
        }
      };
      
      // Add listener for animation completion
      mixerRef.current.addEventListener('finished', onFinished);
    };
    
    // Add click event listener
    window.addEventListener('click', handleMouseClick);
    
    return () => {
      window.removeEventListener('click', handleMouseClick);
    };
  }, []);
  
  // Initialize character position for the Elden Ring terrain
  useEffect(() => {
    if (characterRef.current) {
      // Position the character slightly above ground level to prevent clipping
      // and place in a clear area of the Elden Ring environment
      characterRef.current.position.set(0, 0.5, 5);
      console.log('Character positioned for Elden Ring terrain');
    }
  }, []);

  // Handle space key for rolling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || isRollingRef.current || isAttackingRef.current) return;
      
      console.log('Roll animation triggered');
      isRollingRef.current = true;
      
      // Determine which animation to fade out based on current state
      const { forward, backward, left, right } = movementRef.current;
      const isMoving = forward || backward || left || right;
      
      // Fade out current animations
      Object.keys(actionsRef.current).forEach(key => {
        if (key !== 'roll') {
          actionsRef.current[key].fadeOut(0.2);
        }
      });
      
      // Reset and play roll animation
      actionsRef.current.roll.reset();
      actionsRef.current.roll.fadeIn(0.2);
      actionsRef.current.roll.play();
      
      // Listen for roll animation completion
      const onFinished = (e: any) => {
        // Check if this is our roll animation finishing
        if (e.action === actionsRef.current.roll) {
          console.log('Roll animation finished');
          
          // Fade back to appropriate animation
          actionsRef.current.roll.fadeOut(0.2);
          
          const { forward, backward, left, right } = movementRef.current;
          const isMoving = forward || backward || left || right;
          
          if (isMoving) {
            // Determine which animation to play based on current movement
            let targetAnimation = 'idle';
            
            if (forward) {
              targetAnimation = 'run';
            } else if (backward) {
              targetAnimation = 'walkBackward';
            } else if (left) {
              targetAnimation = 'walkLeft';
            } else if (right) {
              targetAnimation = 'walkRight';
            }
            
            actionsRef.current[targetAnimation].reset();
            actionsRef.current[targetAnimation].fadeIn(0.2);
            actionsRef.current[targetAnimation].play();
          } else {
            actionsRef.current.idle.reset();
            actionsRef.current.idle.fadeIn(0.2);
            actionsRef.current.idle.play();
          }
          
          isRollingRef.current = false;
          
          // No need to reset rotation here as it's handled in useFrame
          
          // Remove this listener
          mixerRef.current?.removeEventListener('finished', onFinished);
        }
      };
      
      // Add listener for animation completion
      mixerRef.current?.addEventListener('finished', onFinished);
    };
    
    // Add space key event listener
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
  
  // Handle WASD keys for movement
  useEffect(() => {
    // Helper function to update animation based on movement state
    const updateAnimation = () => {
      if (isAttackingRef.current || isRollingRef.current) return;
      
      const { forward, backward, left, right } = movementRef.current;
      const isMoving = forward || backward || left || right;
      
      // If not moving, transition to idle
      if (!isMoving) {
        // Fade out all movement animations
        Object.keys(actionsRef.current).forEach(key => {
          if (key !== 'idle' && key !== 'attack') {
            actionsRef.current[key].fadeOut(0.2);
          }
        });
        
        // Fade in idle animation
        actionsRef.current.idle.reset();
        actionsRef.current.idle.fadeIn(0.2);
        actionsRef.current.idle.play();
        return;
      }
      
      // Determine which animation to play based on movement direction
      let targetAnimation = 'idle';
      
      if (forward) {
        targetAnimation = 'run';  // W is run (faster)
      } else if (backward) {
        targetAnimation = 'walkBackward';  // S is walk backward
      } else if (left) {
        targetAnimation = 'walkLeft';  // A is walk left
      } else if (right) {
        targetAnimation = 'walkRight';  // D is walk right
      }
      
      // Fade out all other animations except the target one
      Object.keys(actionsRef.current).forEach(key => {
        if (key !== targetAnimation && key !== 'attack') {
          actionsRef.current[key].fadeOut(0.2);
        }
      });
      
      // Play the target animation
      actionsRef.current[targetAnimation].reset();
      actionsRef.current[targetAnimation].fadeIn(0.2);
      actionsRef.current[targetAnimation].play();
    };
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAttackingRef.current) return;
      
      const key = e.key.toLowerCase();
      let stateChanged = false;
      
      if (key === 'w' && !movementRef.current.forward) {
        movementRef.current.forward = true;
        stateChanged = true;
      } else if (key === 's' && !movementRef.current.backward) {
        movementRef.current.backward = true;
        stateChanged = true;
      } else if (key === 'a' && !movementRef.current.left) {
        movementRef.current.left = true;
        stateChanged = true;
      } else if (key === 'd' && !movementRef.current.right) {
        movementRef.current.right = true;
        stateChanged = true;
      }
      
      if (stateChanged) {
        updateAnimation();
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      let stateChanged = false;
      
      if (key === 'w' && movementRef.current.forward) {
        movementRef.current.forward = false;
        stateChanged = true;
      } else if (key === 's' && movementRef.current.backward) {
        movementRef.current.backward = false;
        stateChanged = true;
      } else if (key === 'a' && movementRef.current.left) {
        movementRef.current.left = false;
        stateChanged = true;
      } else if (key === 'd' && movementRef.current.right) {
        movementRef.current.right = false;
        stateChanged = true;
      }
      
      if (stateChanged) {
        updateAnimation();
      }
    };
    
    // Add key event listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);
  
  // Update animation and movement in each frame
  useFrame((state) => {
    if (mixerRef.current) {
      const delta = clockRef.current.getDelta();
      mixerRef.current.update(delta);
      
      // Handle character rotation to face camera direction
      if (characterRef.current) {
        // Check if camera rotation has changed
        if (cameraRotationRef.current !== lastCameraRotationRef.current) {
          // Calculate rotation difference
          const rotationDiff = cameraRotationRef.current - lastCameraRotationRef.current;
          lastCameraRotationRef.current = cameraRotationRef.current;
          
          // Always update character rotation to match camera direction
          // This ensures consistent behavior whether moving or not
          characterRef.current.rotation.y = cameraRotationRef.current;
          
          // Always update direction arrow to match character rotation
          if (directionArrowRef.current) {
            // Set the arrow to match character rotation
            directionArrowRef.current.rotation.y = characterRef.current.rotation.y;
          }
        }
      }
      
      // Handle roll movement
      if (characterRef.current && isRollingRef.current) {
        // Add forward movement during roll
        const rollSpeed = 5.0 * delta; // Faster than running for a quick roll
        
        // Get camera direction for roll movement
        const cameraDirection = cameraRotationRef.current;
        
        // Update character rotation to face camera direction
        characterRef.current.rotation.y = cameraDirection;
        
        // Update direction arrow to match character rotation
        if (directionArrowRef.current) {
          directionArrowRef.current.rotation.y = characterRef.current.rotation.y;
        }
        
        // Get camera's direction vector
        const direction = new THREE.Vector3();
        state.camera.getWorldDirection(direction);
        
        // We only want movement on the XZ plane (ignore vertical Y component)
        direction.y = 0;
        direction.normalize();
        
        // Move forward in the camera direction
        const rollMove = direction.clone().multiplyScalar(rollSpeed);
        const moveX = rollMove.x;
        const moveZ = rollMove.z;
        
        // Apply movement
        characterRef.current.position.x += moveX;
        characterRef.current.position.z += moveZ;
      }
      
      // Handle character movement based on WASD keys
      if (characterRef.current && !isAttackingRef.current && !isRollingRef.current) {
        const { forward, backward, left, right } = movementRef.current;
        const isMoving = forward || backward || left || right;
        
        if (isMoving) {
          // Base movement speeds
          const runSpeed = 3.0 * delta; // Units per second (faster)
          const walkSpeed = 1.5 * delta; // Units per second (slower)
          
          // Get camera direction for movement
          const cameraDirection = cameraRotationRef.current;
          
          // Update character rotation to face camera direction
          characterRef.current.rotation.y = cameraDirection;
          
          // Update direction arrow to match character rotation
          if (directionArrowRef.current) {
            directionArrowRef.current.rotation.y = characterRef.current.rotation.y;
          }
          
          // Prepare for movement calculation
          
          // Get camera's direction vector
          const direction = new THREE.Vector3();
          state.camera.getWorldDirection(direction);
          
          // We only want movement on the XZ plane (ignore vertical Y component)
          direction.y = 0;
          direction.normalize();
          
          // Create a right vector by crossing world up with camera forward (order matters)
          const worldUp = new THREE.Vector3(0, 1, 0);
          const rightVector = new THREE.Vector3().crossVectors(direction, worldUp).normalize();
          
          // Calculate movement direction and speed
          let moveX = 0;
          let moveZ = 0;
          
          // Update vector visualizers
          if (forwardVectorRef.current) {
            // Position the forward vector indicator
            forwardVectorRef.current.position.copy(characterRef.current.position);
            forwardVectorRef.current.position.y += 0.1; // Slightly above the ground
            
            // Set the forward vector direction
            forwardVectorRef.current.lookAt(
              forwardVectorRef.current.position.x + direction.x,
              forwardVectorRef.current.position.y,
              forwardVectorRef.current.position.z + direction.z
            );
          }
          
          if (rightVectorRef.current) {
            // Position the right vector indicator
            rightVectorRef.current.position.copy(characterRef.current.position);
            rightVectorRef.current.position.y += 0.1; // Slightly above the ground
            
            // Set the right vector direction
            rightVectorRef.current.lookAt(
              rightVectorRef.current.position.x + rightVector.x,
              rightVectorRef.current.position.y,
              rightVectorRef.current.position.z + rightVector.z
            );
          }
          
          if (forward) {
            // Run forward (W key) - move in direction camera is facing
            const forwardMove = direction.clone().multiplyScalar(runSpeed);
            moveX += forwardMove.x;
            moveZ += forwardMove.z;
          }
          
          if (backward) {
            // Walk backward (S key) - move opposite to direction camera is facing
            const backwardMove = direction.clone().multiplyScalar(-walkSpeed);
            moveX += backwardMove.x;
            moveZ += backwardMove.z;
          }
          
          if (left) {
            // Walk left (A key) - move perpendicular to direction camera is facing
            const leftMove = rightVector.clone().multiplyScalar(-walkSpeed);
            moveX += leftMove.x;
            moveZ += leftMove.z;
          }
          
          if (right) {
            // Walk right (D key) - move perpendicular to direction camera is facing
            const rightMove = rightVector.clone().multiplyScalar(walkSpeed);
            moveX += rightMove.x;
            moveZ += rightMove.z;
          }
          
          // Apply movement
          characterRef.current.position.x += moveX;
          characterRef.current.position.z += moveZ;
          
          // Character rotation is already set to camera direction above
        }
      }
    }
    
    // Elden Ring style orbiting camera
    if (characterRef.current) {
      const cameraDistance = 3;  // Distance from character
      const cameraHeight = 1.5;  // Height above ground
      const lookAtHeight = 1;    // Look at point height
      
      // Get character's current position
      const characterPosition = characterRef.current.position;
      
      // Calculate camera position based on rotation around character
      const cameraX = characterPosition.x + cameraDistance * Math.sin(cameraRotationRef.current);
      const cameraZ = characterPosition.z + cameraDistance * Math.cos(cameraRotationRef.current);
      
      // Position camera around character based on rotation
      state.camera.position.set(
        cameraX,
        characterPosition.y + cameraHeight,
        cameraZ
      );
      
      // Look at character
      state.camera.lookAt(
        characterPosition.x,
        characterPosition.y + lookAtHeight,
        characterPosition.z
      );
    }
  });
  
  // Show loading or error state
  if (loading) {
    return null;  // Or a loading indicator
  }
  
  if (error) {
    console.error('Error:', error);
    return null;  // Or an error message
  }

  // Create a direction arrow component for character direction
  const DirectionArrow = () => {
    return (
      <group ref={directionArrowRef} position={[0, 0.05, 0]} rotation={[0, Math.PI, 0]}>
        {/* Arrow body - pointing in the model's forward direction (negative Z) */}
        <mesh position={[0, 0, -0.5]}>
          <boxGeometry args={[0.1, 0.02, 1]} />
          <meshStandardMaterial color="red" />
        </mesh>
        {/* Arrow head - pointing in the model's forward direction */}
        <mesh position={[0, 0, -1.1]} rotation={[0, 0, 0]}>
          <coneGeometry args={[0.1, 0.2, 8]} />
          <meshStandardMaterial color="red" />
        </mesh>
      </group>
    );
  };
  
  // Create a vector arrow for camera forward direction
  const ForwardVectorArrow = () => {
    return (
      <group ref={forwardVectorRef} position={[0, 0.15, 0]}>
        {/* Arrow body */}
        <mesh position={[0, 0, 0.5]}>
          <boxGeometry args={[0.05, 0.02, 1]} />
          <meshStandardMaterial color="blue" />
        </mesh>
        {/* Arrow head */}
        <mesh position={[0, 0, 1.1]} rotation={[0, Math.PI, 0]}>
          <coneGeometry args={[0.05, 0.2, 8]} />
          <meshStandardMaterial color="blue" />
        </mesh>
      </group>
    );
  };
  
  // Create a vector arrow for camera right direction
  const RightVectorArrow = () => {
    return (
      <group ref={rightVectorRef} position={[0, 0.25, 0]}>
        {/* Arrow body */}
        <mesh position={[0, 0, 0.5]}>
          <boxGeometry args={[0.05, 0.02, 1]} />
          <meshStandardMaterial color="green" />
        </mesh>
        {/* Arrow head */}
        <mesh position={[0, 0, 1.1]} rotation={[0, Math.PI, 0]}>
          <coneGeometry args={[0.05, 0.2, 8]} />
          <meshStandardMaterial color="green" />
        </mesh>
      </group>
    );
  };

  return (
    <group ref={characterRef} position={[0, 0, 0]}>
      {/* Model will be added to this group via the useEffect */}
      <DirectionArrow />
      <ForwardVectorArrow />
      <RightVectorArrow />
    </group>
  );
}
