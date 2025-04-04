import { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { FBXLoader } from 'three-stdlib';

// Types for animation states
export type AnimationName = 'idle' | 'run';

export interface AnimationState {
  current: AnimationName;
  previous: AnimationName | null;
}

export interface AnimationActions {
  [key: string]: THREE.AnimationAction;
}

export interface CharacterAnimations {
  // Animation state
  animationState: AnimationState;
  setAnimation: (name: AnimationName) => void;
  
  // Animation actions
  actions: AnimationActions;
  
  // Animation mixer
  mixer: THREE.AnimationMixer | null;
  updateAnimations: (delta: number) => void;
  
  // Loading state
  loading: boolean;
  error: string | null;
}

/**
 * Custom hook to load and manage character animations
 * @param model The character model
 * @param animationPaths Paths to animation files
 */
export function useCharacterAnimations(
  model: THREE.Group | null,
  animationPaths: Record<AnimationName, string>
): CharacterAnimations {
  // Animation state
  const [animationState, setAnimationState] = useState<AnimationState>({
    current: 'idle',
    previous: null
  });
  
  // Animation references
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const actionsRef = useRef<AnimationActions>({});
  
  // Loading state
  const [animations, setAnimations] = useState<Record<string, THREE.AnimationClip>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Function to set current animation
  const setAnimation = (name: AnimationName) => {
    setAnimationState(prev => ({
      current: name,
      previous: prev.current
    }));
  };
  
  // Function to update animations
  const updateAnimations = (delta: number) => {
    if (mixerRef.current) {
      mixerRef.current.update(delta);
    }
  };
  
  // Load animations
  useEffect(() => {
    if (!model) return;
    
    const loadAnimations = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const loadedAnimations: Record<string, THREE.AnimationClip> = {};
        const loader = new FBXLoader();
        
        // Load each animation
        const animationEntries = Object.entries(animationPaths);
        for (const [name, path] of animationEntries) {
          const fbx = await new Promise<THREE.Group>((resolve, reject) => {
            loader.load(
              path,
              resolve,
              undefined,
              reject
            );
          });
          
          // Get animation from loaded FBX
          if (fbx.animations && fbx.animations.length > 0) {
            const clip = fbx.animations[0];
            clip.name = name;
            loadedAnimations[name] = clip;
            console.log(`Loaded animation: ${name}`);
          }
        }
        
        setAnimations(loadedAnimations);
        setLoading(false);
      } catch (err) {
        console.error('Failed to load animations:', err);
        setError('Failed to load animations');
        setLoading(false);
      }
    };
    
    loadAnimations();
  }, [model, animationPaths]);
  
  // Setup animation mixer and actions
  useEffect(() => {
    if (!model || !animations || Object.keys(animations).length === 0) return;
    
    console.log('Setting up animation mixer for model', model);
    
    // Create animation mixer
    const mixer = new THREE.AnimationMixer(model);
    mixerRef.current = mixer;
    
    // Create animation actions
    const actions: AnimationActions = {};
    Object.entries(animations).forEach(([name, clip]) => {
      console.log(`Creating action for animation: ${name}`);
      const action = mixer.clipAction(clip);
      action.setLoop(THREE.LoopRepeat, Infinity);
      action.clampWhenFinished = true;
      actions[name] = action;
    });
    
    actionsRef.current = actions;
    
    // Play default animation (idle)
    if (actions['idle']) {
      console.log('Playing idle animation');
      actions['idle'].play();
    }
    
    return () => {
      // Clean up
      console.log('Cleaning up animation mixer');
      mixer.stopAllAction();
    };
  }, [model, animations]);
  
  // Handle animation transitions
  useEffect(() => {
    const { current, previous } = animationState;
    const actions = actionsRef.current;
    
    if (!actions || Object.keys(actions).length === 0) return;
    
    // If we have a previous animation, transition from it
    if (previous && actions[previous] && current !== previous) {
      const prevAction = actions[previous];
      const nextAction = actions[current];
      
      if (nextAction) {
        // Start new animation
        prevAction.fadeOut(0.3);
        nextAction.reset().fadeIn(0.3).play();
        console.log(`Transitioning from ${previous} to ${current}`);
      }
    } else if (actions[current] && !actions[current].isRunning()) {
      // Just play current if no transition needed
      actions[current].reset().play();
      console.log(`Playing ${current} animation`);
    }
  }, [animationState]);
  
  return {
    animationState,
    setAnimation,
    actions: actionsRef.current,
    mixer: mixerRef.current,
    updateAnimations,
    loading,
    error
  };
}
