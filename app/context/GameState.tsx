'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as THREE from 'three';

// Define global state type for TypeScript
declare global {
  interface Window {
    vibenRingGlobalState: {
      playerPosition: THREE.Vector3;
      playerRotation: THREE.Euler;
      playerCollisionSphereOffset: THREE.Vector3;
      playerCollisionSphereRadius: number;
      playerAttackSphereOffset: THREE.Vector3;
      playerAttackSphereRadius: number;
      bossPosition: THREE.Vector3;
      bossRotation: THREE.Euler;
      bossCollisionSphereOffset: THREE.Vector3;
      bossCollisionSphereRadius: number;
      bossAttackSphereOffset: THREE.Vector3;
      bossAttackSphereRadius: number;
      playerHp: number;
      bossHp: number;
      // Camera parameters
      cameraOffset: THREE.Vector3;
      cameraTarget: THREE.Vector3;
      cameraRotation: THREE.Euler;
      cameraLookAt: THREE.Vector3;
    };
  }
}

// Collision detection removed

// Define the shape of our game state
export interface GameStateType {
  bossHp: number;
  playerHp: number;
  playerStamina: number;
  playerPosition: THREE.Vector3;
  playerRotation: THREE.Euler;
  bossPosition: THREE.Vector3;
  bossRotation: THREE.Euler;
  playerCollisionSphereOffset: THREE.Vector3; // Offset of the player collision sphere relative to player position
  playerCollisionSphereRadius: number; // Radius of the player collision sphere
  playerAttackSphereOffset: THREE.Vector3; // Offset of the player attack sphere relative to player position
  playerAttackSphereRadius: number; // Radius of the player attack sphere
  bossCollisionSphereOffset: THREE.Vector3; // Offset of the boss collision sphere relative to boss position
  bossCollisionSphereRadius: number; // Radius of the boss collision sphere
  bossAttackSphereOffset: THREE.Vector3; // Offset of the boss attack sphere relative to boss position
  bossAttackSphereRadius: number; // Radius of the boss attack sphere
  // Camera parameters
  cameraOffset: THREE.Vector3; // Offset from player position (third-person view)
  cameraTarget: THREE.Vector3; // Where the camera is looking at (usually player + some offset)
  cameraRotation: THREE.Euler; // Camera rotation angles
  cameraLookAt: THREE.Vector3; // Point that the camera is looking at
  isDebugMode: boolean;
}

// Define the shape of our context
interface GameStateContextType {
  state: GameStateType;
  setBossHp: (hp: number) => void;
  applyDmgToBoss: (dmg: number) => void;
  setPlayerHp: (hp: number) => void;
  setPlayerStamina: (stamina: number) => void;
  setPlayerPosition: (position: THREE.Vector3) => void;
  setPlayerRotation: (rotation: THREE.Euler) => void;
  setBossPosition: (position: THREE.Vector3) => void;
  setBossRotation: (rotation: THREE.Euler) => void;
  toggleDebugMode: () => void;
  resetGameState: () => void;
  // Camera control functions
  setCameraOffset: (offset: THREE.Vector3) => void;
  setCameraTarget: (target: THREE.Vector3) => void;
  setCameraRotation: (rotation: THREE.Euler) => void;
  setCameraLookAt: (lookAt: THREE.Vector3) => void;
}

// Default debug mode value (false)
const DEFAULT_DEBUG_MODE = false;

// Default values for our game state
const defaultGameState: GameStateType = {
  bossHp: 2000,
  playerHp: 100,
  playerStamina: 100,
  playerPosition: new THREE.Vector3(0, 0, 0),
  playerRotation: new THREE.Euler(0, 0, 0),
  bossPosition: new THREE.Vector3(0, 0, 20), // Position the boss 20 units in front of the origin
  bossRotation: new THREE.Euler(0, Math.PI, 0), // Boss initially faces the player (rotated 180 degrees)
  playerCollisionSphereOffset: new THREE.Vector3(0, 1.0, 0), // Centered at player's torso height
  playerCollisionSphereRadius: 0.6, // Half a unit radius for the player collision sphere
  playerAttackSphereOffset: new THREE.Vector3(0, 1.0, 1.5), // In front of the player at weapon reach
  playerAttackSphereRadius: 0.8, // Radius for the player attack sphere
  bossCollisionSphereOffset: new THREE.Vector3(0, 2.0, 0), // Centered at boss's torso height
  bossCollisionSphereRadius: 1.5, // Larger radius for the boss collision sphere
  bossAttackSphereOffset: new THREE.Vector3(0, 1.5, 10.0), // In front of the boss at blade height
  bossAttackSphereRadius: 1.2, // Radius for the boss attack sphere
  // Camera parameters - Elden Ring style third-person camera
  cameraOffset: new THREE.Vector3(0, 1.2, -2.5), // Position camera much closer behind and slightly above player
  cameraTarget: new THREE.Vector3(0, 1, 0), // Look at player's head/upper torso
  cameraRotation: new THREE.Euler(0, 0, 0), // Initial camera rotation
  cameraLookAt: new THREE.Vector3(0, 1, 3), // Look ahead of the player
  isDebugMode: false, // Will be overridden in useState with value from localStorage
};

// Create the context
const GameStateContext = createContext<GameStateContextType | undefined>(undefined);

// Provider component
export function GameStateProvider({ children }: { children: ReactNode }) {
  // Initialize with default state first (no localStorage access during SSR)
  const [state, setState] = useState<GameStateType>(defaultGameState);
  
  // Use useEffect to load debug mode from localStorage after component mounts
  // This avoids hydration errors since useEffect only runs on the client
  useEffect(() => {
    // Only run on client-side
    if (typeof window !== 'undefined') {
      // Initialize global state tracking
      window.vibenRingGlobalState = {
        playerPosition: new THREE.Vector3(),
        playerRotation: new THREE.Euler(),
        playerCollisionSphereOffset: new THREE.Vector3(),
        playerCollisionSphereRadius: defaultGameState.playerCollisionSphereRadius,
        playerAttackSphereOffset: new THREE.Vector3(),
        playerAttackSphereRadius: defaultGameState.playerAttackSphereRadius,
        bossPosition: new THREE.Vector3(),
        bossRotation: new THREE.Euler(),
        bossCollisionSphereOffset: new THREE.Vector3(),
        bossCollisionSphereRadius: defaultGameState.bossCollisionSphereRadius,
        bossAttackSphereOffset: new THREE.Vector3(),
        bossAttackSphereRadius: defaultGameState.bossAttackSphereRadius,
        playerHp: defaultGameState.playerHp,
        bossHp: defaultGameState.bossHp,
        // Camera parameters
        cameraOffset: new THREE.Vector3().copy(defaultGameState.cameraOffset),
        cameraTarget: new THREE.Vector3().copy(defaultGameState.cameraTarget),
        cameraRotation: new THREE.Euler().copy(defaultGameState.cameraRotation),
        cameraLookAt: new THREE.Vector3().copy(defaultGameState.cameraLookAt)
      };
      
      const savedDebugMode = localStorage.getItem('vibenRingDebugMode');
      if (savedDebugMode !== null) {
        setState(prev => ({
          ...prev,
          isDebugMode: savedDebugMode === 'true'
        }));
      }
    }
  }, []);

  // Update functions
  const setBossHp = (hp: number) => {
    setState(prev => ({ ...prev, bossHp: hp }));
  };

  const applyDmgToBoss = (dmg: number) => {
    // Update both React state and global state
    setState(prev => ({ ...prev, bossHp: Math.max(prev.bossHp - dmg, 0) }));
  };

  const setPlayerHp = (hp: number) => {
    // Update both React state and global state
    setState(prev => ({ ...prev, playerHp: hp }));
    if (typeof window !== 'undefined' && window.vibenRingGlobalState) {
      window.vibenRingGlobalState.playerHp = hp;
    }
  };

  const setPlayerStamina = (stamina: number) => {
    setState(prev => ({ ...prev, playerStamina: stamina }));
  };

  const setPlayerPosition = (position: THREE.Vector3) => {
    // Update both React state and global state
    setState(prev => ({ ...prev, playerPosition: position }));
    if (typeof window !== 'undefined' && window.vibenRingGlobalState) {
      window.vibenRingGlobalState.playerPosition.copy(position);
    }
  };

  const setPlayerRotation = (rotation: THREE.Euler) => {
    // Update both React state and global state
    setState(prev => ({ ...prev, playerRotation: rotation }));
    if (typeof window !== 'undefined' && window.vibenRingGlobalState) {
      window.vibenRingGlobalState.playerRotation.copy(rotation);
    }
  };

  const setBossPosition = (position: THREE.Vector3) => {
    // Update both React state and global state
    setState(prev => ({ 
      ...prev, 
      bossPosition: position
    }));
    if (typeof window !== 'undefined' && window.vibenRingGlobalState) {
      window.vibenRingGlobalState.bossPosition.copy(position);
    }
  };

  const setBossRotation = (rotation: THREE.Euler) => {
    // Update both React state and global state
    setState(prev => ({ ...prev, bossRotation: rotation }));
    if (typeof window !== 'undefined' && window.vibenRingGlobalState) {
      window.vibenRingGlobalState.bossRotation.copy(rotation);
    }
  };

  // Toggle debug mode and persist to localStorage
  const toggleDebugMode = () => {
    setState(prev => {
      const newDebugMode = !prev.isDebugMode;
      
      // Save to localStorage (safe to access here since this only runs on client)
      localStorage.setItem('vibenRingDebugMode', String(newDebugMode));
      
      return { ...prev, isDebugMode: newDebugMode };
    });
  };
  
  // Effect to sync collision parameters with global state
  useEffect(() => {
    if (typeof window !== 'undefined' && window.vibenRingGlobalState) {
      // Update collision parameters in global state
      window.vibenRingGlobalState.playerCollisionSphereOffset.copy(state.playerCollisionSphereOffset);
      window.vibenRingGlobalState.playerCollisionSphereRadius = state.playerCollisionSphereRadius;
      window.vibenRingGlobalState.playerAttackSphereOffset.copy(state.playerAttackSphereOffset);
      window.vibenRingGlobalState.playerAttackSphereRadius = state.playerAttackSphereRadius;
      window.vibenRingGlobalState.bossCollisionSphereOffset.copy(state.bossCollisionSphereOffset);
      window.vibenRingGlobalState.bossCollisionSphereRadius = state.bossCollisionSphereRadius;
      window.vibenRingGlobalState.bossAttackSphereOffset.copy(state.bossAttackSphereOffset);
      window.vibenRingGlobalState.bossAttackSphereRadius = state.bossAttackSphereRadius;
      
      // Update camera parameters
      window.vibenRingGlobalState.cameraOffset.copy(state.cameraOffset);
      window.vibenRingGlobalState.cameraTarget.copy(state.cameraTarget);
      window.vibenRingGlobalState.cameraRotation.copy(state.cameraRotation);
      window.vibenRingGlobalState.cameraLookAt.copy(state.cameraLookAt);
    }
  }, [state.playerCollisionSphereOffset, state.playerCollisionSphereRadius, 
      state.playerAttackSphereOffset, state.playerAttackSphereRadius,
      state.bossCollisionSphereOffset, state.bossCollisionSphereRadius,
      state.bossAttackSphereOffset, state.bossAttackSphereRadius,
      state.cameraOffset, state.cameraTarget, state.cameraRotation, state.cameraLookAt]);

  // Reset function
  const resetGameState = () => {
    setState(defaultGameState);
  };

  // Camera control functions
  const setCameraOffset = (offset: THREE.Vector3) => {
    setState(prev => ({ ...prev, cameraOffset: offset }));
    if (typeof window !== 'undefined' && window.vibenRingGlobalState) {
      window.vibenRingGlobalState.cameraOffset.copy(offset);
    }
  };

  const setCameraTarget = (target: THREE.Vector3) => {
    setState(prev => ({ ...prev, cameraTarget: target }));
    if (typeof window !== 'undefined' && window.vibenRingGlobalState) {
      window.vibenRingGlobalState.cameraTarget.copy(target);
    }
  };

  const setCameraRotation = (rotation: THREE.Euler) => {
    setState(prev => ({ ...prev, cameraRotation: rotation }));
    if (typeof window !== 'undefined' && window.vibenRingGlobalState) {
      window.vibenRingGlobalState.cameraRotation.copy(rotation);
    }
  };

  const setCameraLookAt = (lookAt: THREE.Vector3) => {
    setState(prev => ({ ...prev, cameraLookAt: lookAt }));
    if (typeof window !== 'undefined' && window.vibenRingGlobalState) {
      window.vibenRingGlobalState.cameraLookAt.copy(lookAt);
    }
  };

  // Value object to be provided by the context
  const value = {
    state,
    setBossHp,
    applyDmgToBoss,
    setPlayerHp,
    setPlayerStamina,
    setPlayerPosition,
    setPlayerRotation,
    setBossPosition,
    setBossRotation,
    toggleDebugMode,
    resetGameState,
    // Camera control functions
    setCameraOffset,
    setCameraTarget,
    setCameraRotation,
    setCameraLookAt,
  };

  return (
    <GameStateContext.Provider value={value}>
      {children}
    </GameStateContext.Provider>
  );
}

// Custom hook to use the game state
export function useGameState() {
  const context = useContext(GameStateContext);
  if (context === undefined) {
    throw new Error('useGameState must be used within a GameStateProvider');
  }
  return context;
}
