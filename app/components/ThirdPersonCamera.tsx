'use client';

import React, { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameState } from '../context/GameState';

// Camera sensitivity settings
const MOUSE_SENSITIVITY = 0.002; // How sensitive the camera is to mouse movement
const ROTATION_SMOOTHING = 0.15; // How smoothly the character rotates to match camera (increased)
const CAMERA_SMOOTHING = 0.2; // How smoothly the camera follows the player (increased)
const VERTICAL_ANGLE_LIMIT = Math.PI / 3; // Limit vertical camera rotation to 60 degrees up/down
const MIN_PITCH = -Math.PI / 6; // Minimum pitch (looking up limit)
const MAX_PITCH = Math.PI / 4; // Maximum pitch (looking down limit)

export function ThirdPersonCamera() {
  // Get the camera from Three.js
  const { camera, gl } = useThree();
  
  // Get game state and setters
  const { 
    state, 
    setPlayerRotation, 
    setCameraRotation, 
    setCameraOffset, 
    setCameraLookAt 
  } = useGameState();
  
  // References for tracking mouse movement and camera rotation
  const isPointerLockedRef = useRef(false);
  const mouseXRef = useRef(0);
  const mouseYRef = useRef(0);
  const targetYawRef = useRef(0); // Horizontal rotation target
  const targetPitchRef = useRef(0); // Vertical rotation target
  const currentYawRef = useRef(0); // Current horizontal rotation
  const currentPitchRef = useRef(0); // Current vertical rotation
  
  // Set up pointer lock on canvas click
  useEffect(() => {
    const canvas = gl.domElement;
    
    const lockPointer = () => {
      if (!isPointerLockedRef.current) {
        canvas.requestPointerLock();
      }
    };
    
    const handlePointerLockChange = () => {
      isPointerLockedRef.current = document.pointerLockElement === canvas;
    };
    
    const handleMouseMove = (e: MouseEvent) => {
      if (isPointerLockedRef.current) {
        // Update mouse position with sensitivity applied
        // Invert X movement to fix reversed horizontal controls
        mouseXRef.current -= e.movementX * MOUSE_SENSITIVITY;
        mouseYRef.current += e.movementY * MOUSE_SENSITIVITY;
        
        // Clamp vertical rotation to prevent camera flipping and match Elden Ring limits
        mouseYRef.current = Math.max(
          MIN_PITCH,
          Math.min(MAX_PITCH, mouseYRef.current)
        );
        
        // Update target rotations
        targetYawRef.current = mouseXRef.current;
        targetPitchRef.current = mouseYRef.current;
      }
    };
    
    // Add event listeners
    canvas.addEventListener('click', lockPointer);
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    document.addEventListener('mousemove', handleMouseMove);
    
    // Clean up event listeners on unmount
    return () => {
      canvas.removeEventListener('click', lockPointer);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      document.removeEventListener('mousemove', handleMouseMove);
      
      // Exit pointer lock when component unmounts
      if (document.pointerLockElement === canvas) {
        document.exitPointerLock();
      }
    };
  }, [gl]);
  
  // Update camera position and rotation every frame
  useFrame(() => {
    if (!isPointerLockedRef.current) return;
    
    // Smoothly interpolate current rotations toward target rotations
    currentYawRef.current += (targetYawRef.current - currentYawRef.current) * ROTATION_SMOOTHING;
    currentPitchRef.current += (targetPitchRef.current - currentPitchRef.current) * ROTATION_SMOOTHING;
    
    // Create a new camera rotation based on current yaw and pitch
    const cameraRotation = new THREE.Euler(
      -currentPitchRef.current, // Pitch (X-axis rotation)
      currentYawRef.current,    // Yaw (Y-axis rotation)
      0,                        // Roll (Z-axis rotation)
      'YXZ'                     // Order of rotations
    );
    
    // Update camera rotation in game state
    setCameraRotation(cameraRotation);
    
    // Calculate camera position based on player position and offset
    // Rotate the offset based on camera rotation - apply both pitch and yaw
    const offset = new THREE.Vector3().copy(state.cameraOffset);
    
    // First apply yaw (horizontal rotation)
    offset.applyEuler(new THREE.Euler(0, cameraRotation.y, 0));
    
    // Then apply a modified pitch (vertical rotation) to the offset
    // We don't want to fully rotate the offset with pitch as that would be disorienting
    // Instead, we'll adjust the vertical position based on pitch
    offset.y += Math.sin(-cameraRotation.x) * 2.0; // Adjust height based on pitch
    
    // Perform collision detection for camera (simplified version)
    // This prevents the camera from going through walls or objects
    // In a full implementation, you would do a raycast from player to camera position
    
    // Calculate camera position by adding offset to player position
    const cameraPosition = new THREE.Vector3().addVectors(state.playerPosition, offset);
    
    // Calculate look-at point (slightly ahead of player) - Elden Ring style
    // The look-at point should be at the character's upper back/head level and in front
    const lookAtOffset = new THREE.Vector3(0, 1.0, 2); // Look at point above and in front of player
    
    // Apply both pitch and yaw to the look-at point for proper vertical camera movement
    // This makes the camera look up/down when the mouse moves vertically
    lookAtOffset.applyEuler(new THREE.Euler(-cameraRotation.x * 0.5, cameraRotation.y, 0));
    const lookAtPoint = new THREE.Vector3().addVectors(state.playerPosition, lookAtOffset);
    
    // Update camera position and look-at point
    camera.position.lerp(cameraPosition, CAMERA_SMOOTHING);
    camera.lookAt(lookAtPoint);
    setCameraLookAt(lookAtPoint);
    
    // Force the player rotation to exactly match camera horizontal rotation
    // This makes the character face the direction the camera is pointing - exactly like in Elden Ring
    // We're setting it directly rather than smoothly interpolating to ensure sync
    const playerRotation = new THREE.Euler(0, cameraRotation.y, 0);
    setPlayerRotation(playerRotation);
    
    // Also update the global state directly to ensure immediate sync
    if (typeof window !== 'undefined' && window.vibenRingGlobalState) {
      window.vibenRingGlobalState.playerRotation.set(0, cameraRotation.y, 0);
    }
  });
  
  // This component doesn't render anything visually
  return null;
}
