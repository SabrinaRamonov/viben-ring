'use client';

import React from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameState } from '../context/GameState';

// Debug panel showing game state with toggle button
export function DebugPanel() {
  const { state, toggleDebugMode } = useGameState();
  
  if (!state.isDebugMode) {
    return (
      <div className="debug-toggle">
        <button onClick={toggleDebugMode}>Show Debug</button>
        
        <style jsx>{`
          .debug-toggle {
            position: fixed;
            top: 10px;
            right: 10px;
            z-index: 100;
            pointer-events: auto;
          }
          
          button {
            background-color: rgba(0, 0, 0, 0.7);
            color: #f0f0f0;
            border: 1px solid #f0f0f0;
            padding: 5px 10px;
            cursor: pointer;
            font-family: 'Garamond', serif;
            font-size: 14px;
            border-radius: 4px;
          }
          
          button:hover {
            background-color: rgba(40, 40, 40, 0.8);
          }
        `}</style>
      </div>
    );
  }
  
  return (
    <div className="debug-panel">
      <div className="debug-header">
        <h3>Game State</h3>
        <button onClick={toggleDebugMode}>Hide Debug</button>
      </div>
      <div>Boss HP: {state.bossHp}</div>
      <div>Player HP: {state.playerHp}</div>
      <div>Player Stamina: {state.playerStamina}</div>
      <div>Player Position: [{state.playerPosition.x.toFixed(2)}, {state.playerPosition.y.toFixed(2)}, {state.playerPosition.z.toFixed(2)}]</div>
      <div>Boss Position: [{state.bossPosition.x.toFixed(2)}, {state.bossPosition.y.toFixed(2)}, {state.bossPosition.z.toFixed(2)}]</div>
      <div>Debug Mode: {state.isDebugMode ? 'On' : 'Off'}</div>
      {/* Collision parameters removed */}
      
      <style jsx>{`
        .debug-panel {
          position: fixed;
          top: 10px;
          right: 10px;
          background-color: rgba(0, 0, 0, 0.7);
          color: #f0f0f0;
          padding: 15px;
          border-radius: 5px;
          font-family: 'Courier New', monospace;
          font-size: 14px;
          z-index: 100;
          pointer-events: auto;
          max-width: 350px;
          border: 1px solid #f0f0f0;
        }
        
        .debug-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
          border-bottom: 1px solid #f0f0f0;
          padding-bottom: 5px;
        }
        
        h3 {
          margin: 0;
          font-size: 16px;
        }
        
        button {
          background-color: rgba(40, 40, 40, 0.8);
          color: #f0f0f0;
          border: 1px solid #f0f0f0;
          padding: 3px 8px;
          cursor: pointer;
          font-size: 12px;
          border-radius: 4px;
        }
        
        button:hover {
          background-color: rgba(60, 60, 60, 0.9);
        }
        
        div {
          margin: 5px 0;
        }
      `}</style>
    </div>
  );
}

// Collision visualization for debugging hitboxes
export function CollisionSpheres() {
  const { state } = useGameState();
  const playerRotation = state.playerRotation;
  const bossRotation = state.bossRotation;
  
  // Only render if debug mode is enabled
  if (!state.isDebugMode) return null;
  
  // Calculate the player attack sphere position based on player rotation
  const playerAttackOffset = new THREE.Vector3().copy(state.playerAttackSphereOffset);
  const playerRotationMatrix = new THREE.Matrix4().makeRotationFromEuler(state.playerRotation);
  playerAttackOffset.applyMatrix4(playerRotationMatrix);
  
  // Calculate the boss attack sphere position based on boss rotation
  const bossAttackOffset = new THREE.Vector3().copy(state.bossAttackSphereOffset);
  const bossRotationMatrix = new THREE.Matrix4().makeRotationFromEuler(state.bossRotation);
  bossAttackOffset.applyMatrix4(bossRotationMatrix);
  
  return (
    <>
      {/* Player collision sphere - Purple */}
      <mesh
        position={[
          state.playerPosition.x + state.playerCollisionSphereOffset.x,
          state.playerPosition.y + state.playerCollisionSphereOffset.y,
          state.playerPosition.z + state.playerCollisionSphereOffset.z
        ]}
      >
        <sphereGeometry args={[state.playerCollisionSphereRadius, 16, 16]} />
        <meshBasicMaterial color="purple" transparent opacity={0.3} />
      </mesh>
      
      {/* Player attack sphere - Blue */}
      <mesh
        position={[
          state.playerPosition.x + playerAttackOffset.x,
          state.playerPosition.y + playerAttackOffset.y,
          state.playerPosition.z + playerAttackOffset.z
        ]}
      >
        <sphereGeometry args={[state.playerAttackSphereRadius, 16, 16]} />
        <meshBasicMaterial color="blue" transparent opacity={0.3} />
      </mesh>
      
      {/* Boss collision sphere - Red */}
      <mesh
        position={[
          state.bossPosition.x + state.bossCollisionSphereOffset.x,
          state.bossPosition.y + state.bossCollisionSphereOffset.y,
          state.bossPosition.z + state.bossCollisionSphereOffset.z
        ]}
      >
        <sphereGeometry args={[state.bossCollisionSphereRadius, 16, 16]} />
        <meshBasicMaterial color="red" transparent opacity={0.3} />
      </mesh>
      
      {/* Boss attack sphere - Yellow */}
      <mesh
        position={[
          state.bossPosition.x + bossAttackOffset.x,
          state.bossPosition.y + bossAttackOffset.y,
          state.bossPosition.z + bossAttackOffset.z
        ]}
      >
        <sphereGeometry args={[state.bossAttackSphereRadius, 16, 16]} />
        <meshBasicMaterial color="yellow" transparent opacity={0.3} />
      </mesh>
    </>
  );
}

// Main DebugInfo component that combines all debug elements
export function DebugInfo() {
  return (
    <>
      <DebugPanel />
    </>
  );
}
