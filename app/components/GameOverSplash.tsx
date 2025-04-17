'use client';

import React, { useEffect, useState } from 'react';
import { useGameState } from '../context/GameState';

export function GameOverSplash() {
  const { state } = useGameState();
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [fadeIn, setFadeIn] = useState(false);

  useEffect(() => {
    // Check if player died
    if (state.playerHp <= 0) {
      setMessage('YOU DIED');
      setVisible(true);
      // Add a small delay before starting the fade-in animation
      setTimeout(() => setFadeIn(true), 100);
    }
    // Check if boss was defeated
    else if (state.bossHp <= 0) {
      setMessage('GREAT ENEMY FELLED');
      setVisible(true);
      // Add a small delay before starting the fade-in animation
      setTimeout(() => setFadeIn(true), 100);
    }
    // Reset visibility if both are alive again (e.g., after game reset)
    else {
      setVisible(false);
      setFadeIn(false);
    }
  }, [state.playerHp, state.bossHp]);

  if (!visible) return null;

  return (
    <div className={`splash-container ${fadeIn ? 'fade-in' : ''}`}>
      <div className={`splash-text ${message === 'YOU DIED' ? 'died-text' : 'victory-text'}`}>
        {message}
      </div>

      <style jsx>{`
        .splash-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
          opacity: 0;
          transition: opacity 2s ease-in;
          pointer-events: none; /* Allow clicking through */
          background-color: rgba(0, 0, 0, 0.4);
        }
        
        .fade-in {
          opacity: 1;
        }
        
        .splash-text {
          font-family: 'Times New Roman', serif;
          font-size: 6rem;
          letter-spacing: 0.2rem;
          text-align: center;
          text-transform: uppercase;
          font-weight: bold;
          opacity: 0.9;
        }
        
        .died-text {
          color: #b91c1c; /* Dark red for death */
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.7);
        }
        
        .victory-text {
          color: #d4af37; /* Gold for victory */
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.7);
        }
        
        @media (max-width: 768px) {
          .splash-text {
            font-size: 3rem;
          }
        }
      `}</style>
    </div>
  );
}
