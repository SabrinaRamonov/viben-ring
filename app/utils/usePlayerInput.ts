import { useState, useEffect } from 'react';
import * as THREE from 'three';

// Types for player input
export interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  run: boolean;
  jump: boolean;
  attack: boolean;
}

export interface MovementState {
  velocity: THREE.Vector3;
  direction: THREE.Vector3;
  rotation: number;
  isMoving: boolean;
  isRunning: boolean;
}

export interface PlayerInput {
  // Input state
  inputState: InputState;
  
  // Movement state
  movementState: MovementState;
  
  // Methods to update movement
  updateMovement: (delta: number) => void;
  resetMovement: () => void;
  
  // Helper methods
  getForwardDirection: () => THREE.Vector3;
  getRightDirection: () => THREE.Vector3;
}

/**
 * Custom hook to handle player input and movement
 * @param characterRef Reference to the character object
 * @param cameraRef Reference to the camera object (optional)
 */
export function usePlayerInput(
  characterRef: React.RefObject<THREE.Group | null>,
  cameraRef?: React.RefObject<THREE.Camera>
): PlayerInput {
  // Input state
  const [inputState, setInputState] = useState<InputState>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    run: false,
    jump: false,
    attack: false
  });
  
  // Movement state
  const [movementState, setMovementState] = useState<MovementState>({
    velocity: new THREE.Vector3(),
    direction: new THREE.Vector3(),
    rotation: 0,
    isMoving: false,
    isRunning: false
  });
  
  // Setup key listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return; // Prevent key repeat
      
      switch (e.key.toLowerCase()) {
        case 'w':
          setInputState(prev => ({ ...prev, forward: true }));
          break;
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case 'w':
          setInputState(prev => ({ ...prev, forward: false }));
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);
  
  // Update movement based on input
  const updateMovement = (delta: number) => {
    if (!characterRef.current) return;
    
    const speed = 2.5; // Units per second
    const isMoving = inputState.forward;
    
    // Update movement state
    setMovementState(prev => {
      const newState = { ...prev };
      
      // Calculate movement
      if (isMoving) {
        // Move forward
        const forwardDir = getForwardDirection();
        newState.velocity.copy(forwardDir).multiplyScalar(speed * delta);
        newState.isMoving = true;
      } else {
        // Stop movement
        newState.velocity.set(0, 0, 0);
        newState.isMoving = false;
      }
      
      // Apply movement to character
      if (characterRef.current) {
        characterRef.current.position.add(newState.velocity);
      }
      
      return newState;
    });
  };
  
  // Reset movement state
  const resetMovement = () => {
    setMovementState({
      velocity: new THREE.Vector3(),
      direction: new THREE.Vector3(),
      rotation: 0,
      isMoving: false,
      isRunning: false
    });
  };
  
  // Get forward direction (based on character rotation)
  const getForwardDirection = (): THREE.Vector3 => {
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), movementState.rotation);
    return forward.normalize();
  };
  
  // Get right direction (based on character rotation)
  const getRightDirection = (): THREE.Vector3 => {
    const right = new THREE.Vector3(1, 0, 0);
    right.applyAxisAngle(new THREE.Vector3(0, 1, 0), movementState.rotation);
    return right.normalize();
  };
  
  return {
    inputState,
    movementState,
    updateMovement,
    resetMovement,
    getForwardDirection,
    getRightDirection
  };
}
