'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameState } from '../context/GameState';
import { FBXLoader } from 'three-stdlib';
import { didSpheresCollide } from '../utils/collision';

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

export function Character() {
  const { state, setPlayerPosition, setPlayerRotation, applyDmgToBoss } = useGameState();
  const characterRef = useRef<THREE.Group>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());
  const actionsRef = useRef<{[key: string]: THREE.AnimationAction}>({});
  
  // Movement state
  const movementRef = useRef<{
    forward: boolean;
    backward: boolean;
    left: boolean;
    right: boolean;
    dodging: boolean;
  }>({ forward: false, backward: false, left: false, right: false, dodging: false });
  
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
        
        // Load forward animation (run/walk forward)
        const forwardAnim = await loadAnimation('/models/character/run-forward.fbx');
        forwardAnim.name = 'forward';
        
        // Load backward animation
        const backwardAnim = await loadAnimation('/models/character/walk-backward.fbx');
        backwardAnim.name = 'backward';
        
        // Load left animation
        const leftAnim = await loadAnimation('/models/character/walk-left.fbx');
        leftAnim.name = 'left';
        
        // Load right animation
        const rightAnim = await loadAnimation('/models/character/walk-right.fbx');
        rightAnim.name = 'right';
        
        // Load attack animation
        const attackAnim = await loadAnimation('/models/character/melee-light.fbx');
        attackAnim.name = 'attack';
        
        // Load dodge/roll animation
        const dodgeAnim = await loadAnimation('/models/character/roll.fbx');
        dodgeAnim.name = 'dodge';
        
        // Store all animations
        setAnimations({
          idle: idleAnim,
          forward: forwardAnim,
          backward: backwardAnim,
          left: leftAnim,
          right: rightAnim,
          attack: attackAnim,
          dodge: dodgeAnim
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
    if (!model || !animations.idle || !animations.forward || !animations.backward || 
        !animations.left || !animations.right || !animations.attack || !animations.dodge || !characterRef.current) return;
    
    console.log('Setting up character with animations');
    
    // Add model to scene
    characterRef.current.add(model);
    
    // Set initial position from game state
    characterRef.current.position.copy(state.playerPosition);
    
    // Create animation mixer
    const mixer = new THREE.AnimationMixer(model);
    mixerRef.current = mixer;
    
    // Create animation actions
    const idleAction = mixer.clipAction(animations.idle);
    idleAction.setLoop(THREE.LoopRepeat, Infinity);  // Loop indefinitely
    actionsRef.current.idle = idleAction;
    
    // Create forward animation action
    const forwardAction = mixer.clipAction(animations.forward);
    forwardAction.setLoop(THREE.LoopRepeat, Infinity);
    actionsRef.current.forward = forwardAction;
    
    // Create backward animation action
    const backwardAction = mixer.clipAction(animations.backward);
    backwardAction.setLoop(THREE.LoopRepeat, Infinity);
    actionsRef.current.backward = backwardAction;
    
    // Create left animation action
    const leftAction = mixer.clipAction(animations.left);
    leftAction.setLoop(THREE.LoopRepeat, Infinity);
    actionsRef.current.left = leftAction;
    
    // Create right animation action
    const rightAction = mixer.clipAction(animations.right);
    rightAction.setLoop(THREE.LoopRepeat, Infinity);
    actionsRef.current.right = rightAction;
    
    // Create attack animation action
    const attackAction = mixer.clipAction(animations.attack);
    attackAction.setLoop(THREE.LoopOnce, 1);  // Play only once
    attackAction.clampWhenFinished = true;    // Hold the last frame until manually reset
    attackAction.zeroSlopeAtEnd = true;      // Ensure smooth transition at the end
    attackAction.zeroSlopeAtStart = true;    // Ensure smooth transition at the start
    // Set a faster timeScale for a quick light attack
    attackAction.timeScale = 1.5;           // Speed up the animation by 1.5x
    actionsRef.current.attack = attackAction;
    
    // Create dodge animation action
    const dodgeAction = mixer.clipAction(animations.dodge);
    dodgeAction.setLoop(THREE.LoopOnce, 1);  // Play only once
    dodgeAction.clampWhenFinished = true;    // Hold the last frame until manually reset
    dodgeAction.zeroSlopeAtEnd = true;      // Ensure smooth transition at the end
    dodgeAction.zeroSlopeAtStart = true;    // Ensure smooth transition at the start
    // Set a slower timeScale for a more deliberate dodge
    dodgeAction.timeScale = 0.8;
    actionsRef.current.dodge = dodgeAction;
    
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
  
  // Reference to track if attack is in progress - defined at component level for useFrame access
  const isAttackingRef = useRef<boolean>(false);
  const isDodgingRef = useRef<boolean>(false);
  const dodgeStartTimeRef = useRef<number>(0);
  const dodgeDurationRef = useRef<number>(0.6); // Increased to 0.6 seconds (50% slower)
  const dodgeSpeedMultiplierRef = useRef<number>(1.5); // Reduced to 1.5x for slower movement
  const dodgeDistanceRef = useRef<number>(2.0); // Total distance to move during dodge (in units)
  const dodgeDirectionRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0)); // Stores the direction of the dodge
  
  // Function to trigger dodge - uses the state from component scope
  const triggerDodge = () => {
    // Don't allow dodging if already dodging or attacking
    if (isDodgingRef.current || isAttackingRef.current) return;
    
    console.log('Dodge triggered');
    
    // Set dodging state
    isDodgingRef.current = true;
    dodgeStartTimeRef.current = clockRef.current.getElapsedTime();
    
    // Store the direction the character is facing for consistent dodge direction
    // This ensures the dodge goes in the direction the character is facing when triggered
    // Use the character's current rotation rather than the camera
    const characterRotation = window.vibenRingGlobalState.playerRotation;
    
    // Create a forward vector and apply character rotation
    const forwardVector = new THREE.Vector3(0, 0, 1);
    forwardVector.applyEuler(new THREE.Euler(0, characterRotation.y, 0));
    forwardVector.normalize();
    
    // Store this direction for the duration of the dodge
    dodgeDirectionRef.current.copy(forwardVector);
    
    // Play dodge animation
    if (mixerRef.current && actionsRef.current.dodge) {
      // Stop all other animations
      Object.keys(actionsRef.current).forEach(key => {
        if (key !== 'dodge') {
          const action = actionsRef.current[key];
          if (action && action.isRunning && action.isRunning()) {
            action.fadeOut(0.1);
          }
        }
      });
      
      // Play dodge animation
      const dodgeAction = actionsRef.current.dodge;
      dodgeAction.reset();
      dodgeAction.setLoop(THREE.LoopOnce, 1);
      dodgeAction.clampWhenFinished = true;
      dodgeAction.timeScale = 0.8; // Match the user's preferred speed
      dodgeAction.fadeIn(0.1).play();
    }
  };
  
  // Function to end dodge
  const endDodge = () => {
    if (!isDodgingRef.current) return;
    
    console.log('Dodge ended');
    
    // Reset dodging state
    isDodgingRef.current = false;
    
    // Return to idle animation
    if (mixerRef.current && actionsRef.current.idle) {
      // Fade out dodge animation
      if (actionsRef.current.dodge && actionsRef.current.dodge.isRunning && actionsRef.current.dodge.isRunning()) {
        actionsRef.current.dodge.fadeOut(0.2);
      }
      
      // Return to idle animation
      actionsRef.current.idle.reset().fadeIn(0.2).play();
    }
  };
  
  // Handle mouse click for attack animation
  useEffect(() => {
    // Track last attack time for cooldown
    const lastAttackTimeRef = { current: 0 };
    // Attack cooldown in milliseconds
    const ATTACK_COOLDOWN = 600;  // Reduced for a quick light attack
    // Attack damage
    const MIN_ATTACK_DAMAGE = 69;
    const MAX_ATTACK_DAMAGE = 120;
    // Timeout reference for auto-resetting attack state
    const timeoutRef = { current: null as NodeJS.Timeout | null };
    
    const handleMouseClick = (e: MouseEvent) => {
      // Only process left mouse button (button 0)
      if (e.button !== 0) return;
      
      // Don't allow attacking if already attacking or dodging
      if (isAttackingRef.current || isDodgingRef.current) return;
      
      // Check if attack is in progress or on cooldown
      const now = Date.now();
      if (isAttackingRef.current || 
          now - lastAttackTimeRef.current < ATTACK_COOLDOWN || 
          !mixerRef.current || 
          !actionsRef.current.attack) return;
      
      console.log('Attack animation triggered');
      isAttackingRef.current = true;
      lastAttackTimeRef.current = now;
      
      // No collision detection needed - we're applying damage directly
      
      // Fade out current animations
      Object.keys(actionsRef.current).forEach(key => {
        if (key !== 'attack') {
          const action = actionsRef.current[key];
          if (action && action.isRunning && action.isRunning()) {
            action.fadeOut(0.2);
          }
        }
      });
      
      // Play attack animation
      const attackAction = actionsRef.current.attack;
      if (!attackAction) return;
      
      attackAction.reset();
      attackAction.fadeIn(0.2);
      attackAction.play();
      
      console.log('Attack started - damage will be applied after a short delay');
      
      // Apply damage after a short delay to match animation timing (like in Boss.tsx)
      setTimeout(() => {
        // Use global state to ensure we have the most up-to-date positions
        if (typeof window !== 'undefined' && window.vibenRingGlobalState) {
          // Calculate the player attack sphere position based on player rotation
          const playerAttackOffset = new THREE.Vector3().copy(window.vibenRingGlobalState.playerAttackSphereOffset);
          const playerRotationMatrix = new THREE.Matrix4().makeRotationFromEuler(window.vibenRingGlobalState.playerRotation);
          playerAttackOffset.applyMatrix4(playerRotationMatrix);
          
          // Calculate final sphere positions
          const playerAttackSpherePosition = new THREE.Vector3(
            window.vibenRingGlobalState.playerPosition.x + playerAttackOffset.x,
            window.vibenRingGlobalState.playerPosition.y + playerAttackOffset.y,
            window.vibenRingGlobalState.playerPosition.z + playerAttackOffset.z
          );
          
          const bossCollisionSpherePosition = new THREE.Vector3(
            window.vibenRingGlobalState.bossPosition.x + window.vibenRingGlobalState.bossCollisionSphereOffset.x,
            window.vibenRingGlobalState.bossPosition.y + window.vibenRingGlobalState.bossCollisionSphereOffset.y,
            window.vibenRingGlobalState.bossPosition.z + window.vibenRingGlobalState.bossCollisionSphereOffset.z
          );
          
          // Check for collision between player attack sphere and boss collision sphere
          const collision = didSpheresCollide(
            playerAttackSpherePosition,
            window.vibenRingGlobalState.playerAttackSphereRadius,
            bossCollisionSpherePosition,
            window.vibenRingGlobalState.bossCollisionSphereRadius
          );
          
          // Apply damage only if there's a collision and boss is still alive
          if (collision && window.vibenRingGlobalState.bossHp > 0) {
            const dmg = Math.random() * (MAX_ATTACK_DAMAGE - MIN_ATTACK_DAMAGE) + MIN_ATTACK_DAMAGE;
            applyDmgToBoss(dmg);
            console.log(`Attack hit! Collision detected. Damage: ${dmg}`);
          } else if (window.vibenRingGlobalState.bossHp > 0) {
            console.log('Attack missed - no collision detected');
          }
        } else {
          // Fallback to React state if global state is not available
          console.log('Global state not available, using React state for collision detection');
          
          // Calculate the player attack sphere position based on player rotation
          const playerAttackOffset = new THREE.Vector3().copy(state.playerAttackSphereOffset);
          const playerRotationMatrix = new THREE.Matrix4().makeRotationFromEuler(state.playerRotation);
          playerAttackOffset.applyMatrix4(playerRotationMatrix);
          
          // Calculate final sphere positions
          const playerAttackSpherePosition = new THREE.Vector3(
            state.playerPosition.x + playerAttackOffset.x,
            state.playerPosition.y + playerAttackOffset.y,
            state.playerPosition.z + playerAttackOffset.z
          );
          
          const bossCollisionSpherePosition = new THREE.Vector3(
            state.bossPosition.x + state.bossCollisionSphereOffset.x,
            state.bossPosition.y + state.bossCollisionSphereOffset.y,
            state.bossPosition.z + state.bossCollisionSphereOffset.z
          );
          
          // Check for collision between player attack sphere and boss collision sphere
          const collision = didSpheresCollide(
            playerAttackSpherePosition,
            state.playerAttackSphereRadius,
            bossCollisionSpherePosition,
            state.bossCollisionSphereRadius
          );
          
          // Apply damage only if there's a collision and boss is still alive
          if (collision && state.bossHp > 0) {
            const dmg = Math.random() * (MAX_ATTACK_DAMAGE - MIN_ATTACK_DAMAGE) + MIN_ATTACK_DAMAGE;
            applyDmgToBoss(dmg);
            console.log(`Attack hit! Collision detected. Damage: ${dmg}`);
          } else if (state.bossHp > 0) {
            console.log('Attack missed - no collision detected');
          }
        }
      }, 500); // Match the 500ms delay used in Boss.tsx
      
      // Listen for attack animation completion to reset state
      const onFinished = (e: any) => {
        if (e.action === attackAction) {
          console.log('Attack animation finished');
          
          // Fade out attack animation
          attackAction.fadeOut(0.2);
          
          // Return to appropriate animation based on movement state
          const { forward, backward, left, right } = movementRef.current;
          
          if (forward && actionsRef.current.forward) {
            actionsRef.current.forward.reset().fadeIn(0.2).play();
          } else if (backward && actionsRef.current.backward) {
            actionsRef.current.backward.reset().fadeIn(0.2).play();
          } else if (left && actionsRef.current.left) {
            actionsRef.current.left.reset().fadeIn(0.2).play();
          } else if (right && actionsRef.current.right) {
            actionsRef.current.right.reset().fadeIn(0.2).play();
          } else if (actionsRef.current.idle) {
            actionsRef.current.idle.reset().fadeIn(0.2).play();
          }
          
          // Reset attacking state
          isAttackingRef.current = false;
          
          // Remove event listener
          mixerRef.current?.removeEventListener('finished', onFinished);
        }
      };
      
      // Add listener for animation completion
      if (mixerRef.current) {
        mixerRef.current.addEventListener('finished', onFinished);
      }
      
      // Backup timeout to ensure attack state is reset even if the event doesn't fire
      // Animation should take about 0.7 seconds to complete with the faster timeScale (1.5x)
      timeoutRef.current = setTimeout(() => {
        // If we get here, the animation finished event didn't fire for some reason
        console.log('Attack animation timeout - forcing completion');
        
        // Only proceed if we're still in attacking state
        if (!isAttackingRef.current) return;
        
        // Remove event listener if mixer exists
        if (mixerRef.current) {
          mixerRef.current.removeEventListener('finished', onFinished);
        }
        
        // Reset attacking state and return to idle animation
        isAttackingRef.current = false;
        
        // Fade out attack animation
        if (attackAction.isRunning && attackAction.isRunning()) {
          attackAction.fadeOut(0.2);
        }
        
        // Return to idle animation
        if (actionsRef.current.idle) {
          actionsRef.current.idle.reset().fadeIn(0.2).play();
        }
      }, 700);
    };
    
    // Add click event listener
    window.addEventListener('mousedown', handleMouseClick);
    
    return () => {
      window.removeEventListener('mousedown', handleMouseClick);
      // Clear any pending timeouts on unmount
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  // Handle keyboard input for movement
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Log key presses for debugging
      console.log('Key down:', e.code);
      
      switch (e.code) {
        case 'KeyW':
          movementRef.current.forward = true;
          break;
        case 'KeyS':
          movementRef.current.backward = true;
          break;
        case 'KeyA':
          movementRef.current.left = true;
          break;
        case 'KeyD':
          movementRef.current.right = true;
          break;
        // Add Space for dodge/roll
        case 'Space':
          // Only trigger dodge if not already dodging
          if (!isDodgingRef.current && !isAttackingRef.current) {
            triggerDodge();
          }
          break;
        // Add arrow keys as alternatives
        case 'ArrowUp':
          movementRef.current.forward = true;
          break;
        case 'ArrowDown':
          movementRef.current.backward = true;
          break;
        case 'ArrowLeft':
          movementRef.current.left = true;
          break;
        case 'ArrowRight':
          movementRef.current.right = true;
          break;
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW':
          movementRef.current.forward = false;
          break;
        case 'KeyS':
          movementRef.current.backward = false;
          break;
        case 'KeyA':
          movementRef.current.left = false;
          break;
        case 'KeyD':
          movementRef.current.right = false;
          break;
        // Add arrow keys as alternatives
        case 'ArrowUp':
          movementRef.current.forward = false;
          break;
        case 'ArrowDown':
          movementRef.current.backward = false;
          break;
        case 'ArrowLeft':
          movementRef.current.left = false;
          break;
        case 'ArrowRight':
          movementRef.current.right = false;
          break;
      }
    };
    
    // Add event listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);
  
  // We already have the game state from the hook at the top of the component
  
  // Update character position and animations based on movement input
  useFrame((_, delta) => {
    if (!characterRef.current) return;
    
    // Update animation mixer - this is critical for animations to play
    if (mixerRef.current) {
      // Make sure we're updating with a reasonable delta time
      const safeDelta = Math.min(delta, 0.1); // Cap at 100ms to prevent huge jumps
      mixerRef.current.update(safeDelta);
    }
    
    // Check if we're currently attacking or dodging - if so, handle specially
    const isAttacking = isAttackingRef.current;
    const isDodging = isDodgingRef.current;
    
    // Handle dodge state
    if (isDodging) {
      // Calculate how long we've been dodging
      const currentTime = clockRef.current.getElapsedTime();
      const dodgeElapsed = currentTime - dodgeStartTimeRef.current;
      
      // Calculate dodge progress (0 to 1)
      const dodgeProgress = Math.min(dodgeElapsed / dodgeDurationRef.current, 1.0);
      
      // Get current position
      const position = characterRef.current.position.clone();
      
      // Calculate dodge movement based on a fixed total distance
      // This creates a more predictable dodge that always moves the same distance
      // Use a sine curve for acceleration/deceleration (smooth start and end)
      const dodgeProgressCurve = Math.sin(dodgeProgress * Math.PI);
      
      // Calculate the movement for this frame
      // We want the total movement over the entire dodge to equal dodgeDistanceRef.current
      const totalDodgeDistance = dodgeDistanceRef.current;
      const frameDistance = (totalDodgeDistance / dodgeDurationRef.current) * delta * dodgeProgressCurve;
      
      // Create the dodge movement vector using the calculated frame distance
      const dodgeMovement = dodgeDirectionRef.current.clone().multiplyScalar(frameDistance);
      characterRef.current.position.add(dodgeMovement);
      
      // Update player position in game state to ensure camera follows
      // This is critical - without this the camera won't follow the character during dodge
      setPlayerPosition(characterRef.current.position.clone());
      
      // If dodge duration is over, end the dodge
      if (dodgeElapsed >= dodgeDurationRef.current) {
        endDodge();
      }
    }
    
    // Only proceed with normal movement and animation changes if not attacking or dodging
    if (!isAttacking && !isDodging) {
      // Movement speed
      const speed = 5 * delta;
      
      // Get current position
      const position = characterRef.current.position.clone();
      
      // Track if character is moving
      const { forward, backward, left, right } = movementRef.current;
      const isMoving = forward || backward || left || right;
      
      // Handle animation transitions
      if (actionsRef.current) {
        // Determine which animation to play based on movement
        let currentAnimName = 'idle'; // Default to idle when no keys are pressed
        
        if (forward) {
          currentAnimName = 'forward';
        } else if (backward) {
          currentAnimName = 'backward';
        } else if (left) {
          currentAnimName = 'left';
        } else if (right) {
          currentAnimName = 'right';
        }
        
        // Get the current action and check if it's already playing
        const currentAction = actionsRef.current[currentAnimName];
        const isCurrentPlaying = currentAction && currentAction.isRunning ? currentAction.isRunning() : false;
        
        // Only transition if the animation isn't already playing
        if (!isCurrentPlaying) {
          console.log(`Transitioning to ${currentAnimName} animation`);
          
          // Fade out all other animations except attack
          Object.keys(actionsRef.current).forEach(key => {
            if (key !== currentAnimName && key !== 'attack') {
              const action = actionsRef.current[key];
              if (action && action.isRunning && action.isRunning()) {
                action.fadeOut(0.2);
              }
            }
          });
          
          // Fade in the new animation
          if (currentAction && currentAction.reset) {
            currentAction.reset().fadeIn(0.2).play();
          }
        }
      }
      
      // Calculate movement based on camera direction
      const forwardSpeed = speed;            // Normal speed for forward movement
      const backwardSpeed = speed * 0.6;     // 60% speed for backward movement
      const strafeSpeed = speed * 0.7;       // 70% speed for left/right movement
      // Dodge uses a speed multiplier when active
      const dodgeMultiplier = isDodging ? dodgeSpeedMultiplierRef.current : 1.0;
      
      // Get current player rotation from game state (controlled by camera)
      const currentRotation = state.playerRotation;
      
      // Create movement vector based on input and character direction
      const moveVector = new THREE.Vector3(0, 0, 0);
      
      // Calculate forward/backward movement (along character's Z axis)
      // Only apply normal movement controls if not dodging
      // (Dodge movement is handled separately in the dodge section)
      if (movementRef.current.forward) {
        const forward = new THREE.Vector3(0, 0, forwardSpeed);
        forward.applyEuler(new THREE.Euler(0, currentRotation.y, 0));
        moveVector.add(forward);
      }
      if (movementRef.current.backward) {
        const backward = new THREE.Vector3(0, 0, -backwardSpeed);
        backward.applyEuler(new THREE.Euler(0, currentRotation.y, 0));
        moveVector.add(backward);
      }
      
      // Calculate left/right movement (along character's X axis)
      if (movementRef.current.left) {
        const left = new THREE.Vector3(strafeSpeed, 0, 0);
        left.applyEuler(new THREE.Euler(0, currentRotation.y, 0));
        moveVector.add(left);
      }
      if (movementRef.current.right) {
        const right = new THREE.Vector3(-strafeSpeed, 0, 0);
        right.applyEuler(new THREE.Euler(0, currentRotation.y, 0));
        moveVector.add(right);
      }
      
      // Apply movement vector to position
      position.add(moveVector);
      
      // We already have the current player rotation from above
      
      // Update character model rotation to match the game state rotation
      // This ensures the character faces the direction the camera is pointing
      if (characterRef.current) {
        characterRef.current.rotation.copy(currentRotation);
      }
      
      // Calculate movement direction relative to camera rotation
      // This makes WASD controls relative to the camera view, just like in Elden Ring
      if (movementRef.current.forward || movementRef.current.backward || 
          movementRef.current.left || movementRef.current.right) {
        
        // Create a direction vector based on movement input
        const inputDirection = new THREE.Vector3(0, 0, 0);
        if (movementRef.current.forward) inputDirection.z += 1;  // Forward
        if (movementRef.current.backward) inputDirection.z -= 1; // Backward
        if (movementRef.current.left) inputDirection.x += 1;    // Left
        if (movementRef.current.right) inputDirection.x -= 1;   // Right
        
        // Normalize the direction vector
        inputDirection.normalize();
        
        // Apply camera rotation to movement direction
        // This makes movement relative to camera view
        inputDirection.applyEuler(new THREE.Euler(0, currentRotation.y, 0));
      }
      
      // Update position
      characterRef.current.position.copy(position);
      
      // Update game state with new position
      setPlayerPosition(position);
    }
    // When attacking, we don't update position or rotation - character stays locked in place
  });
  
  // Render the character
  return (
    <group ref={characterRef}>
      {loading && <mesh>
        <boxGeometry args={[1, 2, 1]} />
        <meshStandardMaterial color="red" />
      </mesh>}
      
      {error && <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="red" />
      </mesh>}
    </group>
  );
}
