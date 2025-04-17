'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameState } from '../context/GameState';
import { FBXLoader } from 'three-stdlib';
import { initBossAIState, createBossBehaviorTree, BossAIState } from '../utils/bossAI';
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

export function Boss() {
  const { state, setBossPosition, setBossRotation, setPlayerHp } = useGameState();
  const bossRef = useRef<THREE.Group>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());
  const actionsRef = useRef<{[key: string]: THREE.AnimationAction}>({});
  
  const [model, setModel] = useState<THREE.Group | null>(null);
  const [animations, setAnimations] = useState<{[key: string]: THREE.AnimationClip}>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Boss AI state
  const bossAIRef = useRef<BossAIState>(initBossAIState());
  
  // Load model and animations
  useEffect(() => {
    async function loadModelAndAnimations() {
      try {
        // Load boss model
        const bossModel = await loadFBX('/models/boss/boss.fbx');
        // Scale up the boss 5x (the FBX loader already applies a 0.01 scale)
        bossModel.scale.set(0.05, 0.05, 0.05); // 5x larger than the character
        setModel(bossModel);
        
        // Use character's idle animation for now since boss might not have one
        // We'll use the character's idle animation as a fallback
        let idleAnim;
        try {
          // Try to load boss-specific idle animation if it exists
          idleAnim = await loadAnimation('/models/boss/idle.fbx');
        } catch (error) {
          console.log('Boss idle animation not found, using character idle as fallback');
          // Fallback to character idle animation
          idleAnim = await loadAnimation('/models/character/idle.fbx');
        }
        idleAnim.name = 'idle';
        
        // Load attack animation
        const attackAnim = await loadAnimation('/models/boss/melee-light.fbx');
        attackAnim.name = 'attack';
        
        // Load forward movement animation
        let forwardAnim;
        try {
          forwardAnim = await loadAnimation('/models/boss/run-forward.fbx');
        } catch (error) {
          console.log('Boss forward animation not found, using character forward as fallback');
          forwardAnim = await loadAnimation('/models/character/run-forward.fbx');
        }
        forwardAnim.name = 'forward';
        
        // Store animations
        setAnimations({
          idle: idleAnim,
          attack: attackAnim,
          forward: forwardAnim
        });
        
        setLoading(false);
      } catch (err) {
        console.error('Failed to load boss model or animations:', err);
        setError('Failed to load boss model or animations');
        setLoading(false);
      }
    }
    
    loadModelAndAnimations();
  }, []);
  
  // Set up model and animations once loaded
  useEffect(() => {
    if (!model || !animations.idle || !bossRef.current) return;
    
    console.log('Setting up boss with animations');
    
    // Add model to scene
    bossRef.current.add(model);
    
    // Use the boss position from GameState
    const bossPosition = state.bossPosition.clone();
    bossRef.current.position.copy(bossPosition);
    
    // Create animation mixer
    const mixer = new THREE.AnimationMixer(model);
    mixerRef.current = mixer;
    
    // Create idle animation action
    const idleAction = mixer.clipAction(animations.idle);
    idleAction.setLoop(THREE.LoopRepeat, Infinity);  // Loop indefinitely
    actionsRef.current.idle = idleAction;
    
    // Create attack animation action
    const attackAction = mixer.clipAction(animations.attack);
    attackAction.setLoop(THREE.LoopOnce, 1);  // Play only once
    attackAction.clampWhenFinished = true;    // Hold the last frame until manually reset
    attackAction.zeroSlopeAtEnd = true;      // Ensure smooth transition at the end
    attackAction.zeroSlopeAtStart = true;    // Ensure smooth transition at the start
    actionsRef.current.attack = attackAction;
    
    // Create forward animation action
    const forwardAction = mixer.clipAction(animations.forward);
    forwardAction.setLoop(THREE.LoopRepeat, Infinity);  // Loop indefinitely
    // Slow down the animation to match the faster movement speed
    forwardAction.timeScale = 0.7;  // Slow down the animation to 70% speed
    actionsRef.current.forward = forwardAction;
    
    // Play idle animation by default
    idleAction.play();
    
    // Start the clock
    clockRef.current.start();
    
    return () => {
      // Clean up
      mixer.stopAllAction();
      if (bossRef.current && model) {
        bossRef.current.remove(model);
      }
    };
  }, [model, animations]);
  
  // Function to trigger boss attack
  const triggerBossAttack = () => {
    if (!mixerRef.current || !actionsRef.current.attack) return;
    
    console.log('Boss attack triggered');
    
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
    attackAction.reset();
    attackAction.fadeIn(0.2);
    attackAction.play();
    
    // Deal damage to player if the attack cone intersects with the player's collision sphere
    const ATTACK_DAMAGE = 10;
    
    // Apply damage after a short delay to match animation timing
    setTimeout(() => {
      // Use global state to ensure we have the most up-to-date positions
      if (typeof window !== 'undefined' && window.vibenRingGlobalState) {
        // Calculate the boss attack sphere position based on boss rotation
        const bossAttackOffset = new THREE.Vector3().copy(window.vibenRingGlobalState.bossAttackSphereOffset);
        const bossRotationMatrix = new THREE.Matrix4().makeRotationFromEuler(window.vibenRingGlobalState.bossRotation);
        bossAttackOffset.applyMatrix4(bossRotationMatrix);
        
        // Calculate final sphere positions
        const bossAttackSpherePosition = new THREE.Vector3(
          window.vibenRingGlobalState.bossPosition.x + bossAttackOffset.x,
          window.vibenRingGlobalState.bossPosition.y + bossAttackOffset.y,
          window.vibenRingGlobalState.bossPosition.z - bossAttackOffset.z
        );
        
        const playerCollisionSpherePosition = new THREE.Vector3(
          window.vibenRingGlobalState.playerPosition.x + window.vibenRingGlobalState.playerCollisionSphereOffset.x,
          window.vibenRingGlobalState.playerPosition.y + window.vibenRingGlobalState.playerCollisionSphereOffset.y,
          window.vibenRingGlobalState.playerPosition.z + window.vibenRingGlobalState.playerCollisionSphereOffset.z
        );
        
        // Check for collision between boss attack sphere and player collision sphere
        const collision = didSpheresCollide(
          bossAttackSpherePosition,
          window.vibenRingGlobalState.bossAttackSphereRadius,
          playerCollisionSpherePosition,
          window.vibenRingGlobalState.playerCollisionSphereRadius
        );
        
        // Apply damage only if there's a collision and player is still alive
        if (collision && window.vibenRingGlobalState.playerHp > 0) {
          const newPlayerHp = Math.max(0, window.vibenRingGlobalState.playerHp - ATTACK_DAMAGE);
          setPlayerHp(newPlayerHp);
          console.log(`Boss attack hit! Collision detected. Player HP: ${newPlayerHp}`);
        } else if (window.vibenRingGlobalState.playerHp > 0) {
          console.log('Boss attack missed - no collision detected');
        }
      }
    }, 1200);
    
    // Listen for attack animation completion
    const onFinished = (e: any) => {
      if (e.action === attackAction) {
        console.log('Boss attack animation finished');
        
        // Fade out attack animation
        attackAction.fadeOut(0.2);
        
        // Return to idle animation
        actionsRef.current.idle.reset().fadeIn(0.2).play();
        
        // Set last attack time to now to enforce cooldown
        // This ensures the boss can't attack again for 2 seconds after animation completes
        if (bossAIRef.current) {
          bossAIRef.current.lastAttackTime = Date.now();
          bossAIRef.current.isAttacking = false;
          bossAIRef.current.currentAction = 'idle';
          console.log('Boss attack cooldown started - next attack in 2 seconds');
        }
        
        // Remove event listener
        mixerRef.current?.removeEventListener('finished', onFinished);
      }
    };
    
    // Add listener for animation completion
    mixerRef.current.addEventListener('finished', onFinished);
  };
  
  // Reference to store the last time we ran the AI logic
  const lastAIUpdateTimeRef = useRef(0);
  const AI_UPDATE_INTERVAL = 50; // Run AI logic more frequently (50ms) to be more responsive
  
  // Update boss animations and run AI behavior tree
  useFrame((_, delta) => {
    if (!bossRef.current) return;
    
    // Update animation mixer
    if (mixerRef.current) {
      const safeDelta = Math.min(delta, 0.1); // Cap at 100ms to prevent huge jumps
      mixerRef.current.update(safeDelta);
    }
    
    // Make sure boss position and rotation match the GameState
    bossRef.current.position.copy(state.bossPosition);
    bossRef.current.rotation.copy(state.bossRotation);
    
    // Only run AI logic at fixed intervals to prevent performance issues
    const now = performance.now();
    if (now - lastAIUpdateTimeRef.current > AI_UPDATE_INTERVAL) {
      lastAIUpdateTimeRef.current = now;
      
      // Always run the behavior tree if player is alive, even if attacking
      // This ensures movement continues and the boss can queue up the next action
      if (state.playerHp > 0) {
        // Only log boss AI state when in debug mode and only occasionally to reduce spam
        if (state.isDebugMode && Math.random() < 0.05) { // Log only ~5% of the time when in debug mode
          const now = Date.now();
          const onCooldown = (now - bossAIRef.current.lastAttackTime) < bossAIRef.current.attackCooldown;
          console.log(`Boss AI: isAttacking=${bossAIRef.current.isAttacking}, lastAttackTime=${bossAIRef.current.lastAttackTime}, now=${now}, cooldown=${onCooldown}`);
        }
        
        const behaviorTree = createBossBehaviorTree(
          state,
          bossAIRef.current,
          setBossPosition,
          setBossRotation,
          triggerBossAttack,
          delta * (AI_UPDATE_INTERVAL / 16.67) // Adjust delta for the interval
        );
        
        // Execute the behavior tree
        behaviorTree.execute();
      }
    }
    
    // Update animations based on current action - do this every frame
    if (actionsRef.current && mixerRef.current) {
      const currentAction = bossAIRef.current.currentAction;
      
      // Only change animation if not attacking
      if (!bossAIRef.current.isAttacking) {
        if (currentAction === 'moving' && actionsRef.current.forward) {
          // Check if forward animation is already playing
          if (!actionsRef.current.forward.isRunning()) {
            // Fade out other animations
            Object.keys(actionsRef.current).forEach(key => {
              if (key !== 'forward') {
                const action = actionsRef.current[key];
                if (action && action.isRunning && action.isRunning()) {
                  action.fadeOut(0.2);
                }
              }
            });
            
            // Play forward animation
            actionsRef.current.forward.reset().fadeIn(0.2).play();
          }
        } else if (currentAction === 'idle' && actionsRef.current.idle) {
          // Check if idle animation is already playing
          if (!actionsRef.current.idle.isRunning()) {
            // Fade out other animations
            Object.keys(actionsRef.current).forEach(key => {
              if (key !== 'idle') {
                const action = actionsRef.current[key];
                if (action && action.isRunning && action.isRunning()) {
                  action.fadeOut(0.2);
                }
              }
            });
            
            // Play idle animation
            actionsRef.current.idle.reset().fadeIn(0.2).play();
          }
        }
      }
    }
  });
  
  // Render the boss
  return (
    <group ref={bossRef}>
      {loading && <mesh>
        <boxGeometry args={[2, 3, 2]} />
        <meshStandardMaterial color="red" />
      </mesh>}
      
      {error && <mesh>
        <boxGeometry args={[2, 2, 2]} />
        <meshStandardMaterial color="red" />
      </mesh>}
    </group>
  );
}
