'use client';

import React from 'react';
import { useGameState } from '../context/GameState';

// Player HP and Stamina UI in Elden Ring style
function PlayerStats() {
  const { state } = useGameState();
  
  return (
    <div className="player-stats">
      <div className="player-icon"></div>
      
      <div className="player-bars">
        {/* HP Bar */}
        <div className="stat-container hp-container">
          <div className="stat-bar-container">
            <div 
              className="stat-bar hp-bar"
              style={{ width: `${(state.playerHp / 100) * 100}%` }}
            />
            <div className="stat-bar-background"></div>
          </div>
        </div>
        
        {/* Stamina Bar */}
        <div className="stat-container stamina-container">
          <div className="stat-bar-container">
            <div 
              className="stat-bar stamina-bar"
              style={{ width: `${(state.playerStamina / 100) * 100}%` }}
            />
            <div className="stat-bar-background"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Boss HP bar at the bottom of the screen
function BossBar() {
  const { state } = useGameState();
  const bossMaxHp = 2000; // Match the default in GameState
  
  // Always show the boss bar, matching Elden Ring style
  return (
    <div className="boss-bar">
      <div className="boss-name">VIBEN LORD</div>
      <div className="boss-hp-container">
        <div className="boss-hp-background"></div>
        <div 
          className="boss-hp-bar"
          style={{ width: `${(state.bossHp / bossMaxHp) * 100}%` }}
        />
      </div>
    </div>
  );
}



// Main HUD component that combines all UI elements
export function HUD() {
  return (
    <div className="hud">
      <PlayerStats />
      <BossBar />
      
      <style jsx global>{`
        /* HUD Container */
        .hud {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 10;
          font-family: 'Garamond', serif;
          color: #f0f0f0;
        }
        
        /* Player Stats (Top Left) - Elden Ring Style */
        .player-stats {
          position: absolute;
          top: 20px;
          left: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .player-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background-color: #1a1a1a;
          border: 1px solid #3a3a3a;
          box-shadow: 0 0 5px rgba(0, 0, 0, 0.8);
        }
        
        .player-bars {
          display: flex;
          flex-direction: column;
          gap: 4px;
          width: 300px;
        }
        
        .stat-container {
          position: relative;
          height: 8px;
        }
        
        .hp-container {
          margin-bottom: 2px;
        }
        
        .stat-bar-container {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }
        
        .stat-bar-background {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: #000;
          opacity: 0.7;
        }
        
        .stat-bar {
          position: relative;
          height: 100%;
          transition: width 0.3s ease-out;
          z-index: 1;
        }
        
        .hp-bar {
          background-color: #c92c2c;
          box-shadow: 0 0 5px #ff3333;
        }
        
        .stamina-bar {
          background-color: #2e9e2e;
          box-shadow: 0 0 5px #33ff33;
        }
        
        /* Boss Bar (Bottom) - Elden Ring Style */
        .boss-bar {
          position: absolute;
          bottom: 80px;
          left: 50%;
          transform: translateX(-50%);
          width: 70%;
          text-align: center;
        }
        
        .boss-name {
          font-size: 22px;
          font-weight: normal;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 4px;
          color: #e0c080;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.9);
        }
        
        .boss-hp-container {
          position: relative;
          height: 10px;
          width: 100%;
          overflow: hidden;
        }
        
        .boss-hp-background {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: #000;
          opacity: 0.7;
        }
        
        .boss-hp-bar {
          position: relative;
          height: 100%;
          background-color: #c92c2c;
          box-shadow: 0 0 8px #ff3333;
          transition: width 0.3s ease-out;
          z-index: 1;
        }
        
        /* Debug Panel (Top Right) */
        .debug-panel {
          position: absolute;
          top: 10px;
          right: 10px;
          background-color: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 10px;
          border-radius: 5px;
          font-family: monospace;
          font-size: 12px;
        }
        
        .debug-panel h3 {
          margin-top: 0;
          margin-bottom: 5px;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
}
