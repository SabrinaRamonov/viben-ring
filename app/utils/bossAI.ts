import * as THREE from 'three';
import { NodeType, NodeStatus, CompositeNode, LeafNode } from './behaviorTree';
import { GameStateType } from '../context/GameState';

// Boss AI state
export interface BossAIState {
  isAttacking: boolean;
  lastAttackTime: number;
  attackCooldown: number;
  attackRange: number;
  moveSpeed: number;
  turnSpeed: number;
  currentAction: string;
}

// Initialize the boss AI state
export function initBossAIState(): BossAIState {
  return {
    isAttacking: false,
    lastAttackTime: 0,
    attackCooldown: 2000, // 2 seconds between attacks
    attackRange: 10,      // Distance at which boss can attack player
    moveSpeed: 3.5,       // Units per second (increased from 2)
    turnSpeed: 2.5,       // Radians per second (slightly increased)
    currentAction: 'idle'
  };
}

// Calculate distance between boss and player
export function distanceToPlayer(bossPosition: THREE.Vector3, playerPosition: THREE.Vector3): number {
  return bossPosition.distanceTo(playerPosition);
}

// Calculate direction from boss to player (on XZ plane)
export function directionToPlayer(bossPosition: THREE.Vector3, playerPosition: THREE.Vector3): THREE.Vector3 {
  const direction = new THREE.Vector3(
    playerPosition.x - bossPosition.x,
    0, // Ignore Y axis
    playerPosition.z - bossPosition.z
  );
  return direction.normalize();
}

// Calculate angle to face player
export function angleToFacePlayer(bossPosition: THREE.Vector3, playerPosition: THREE.Vector3): number {
  const direction = directionToPlayer(bossPosition, playerPosition);
  return Math.atan2(direction.x, direction.z);
}

// Check if boss is facing player within a threshold
export function isFacingPlayer(
  bossRotation: THREE.Euler,
  bossPosition: THREE.Vector3,
  playerPosition: THREE.Vector3,
  threshold: number = 0.2 // Radians
): boolean {
  const targetAngle = angleToFacePlayer(bossPosition, playerPosition);
  const currentAngle = bossRotation.y;
  
  // Calculate the difference between angles (handling wrap-around)
  let angleDiff = targetAngle - currentAngle;
  while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
  while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
  
  return Math.abs(angleDiff) < threshold;
}

// Create the boss behavior tree
export function createBossBehaviorTree(
  gameState: GameStateType,
  bossAIState: BossAIState,
  setBossPosition: (position: THREE.Vector3) => void,
  setBossRotation: (rotation: THREE.Euler) => void,
  triggerBossAttack: () => void,
  delta: number
) {
  // Check if player is in attack range
  const inAttackRange = new LeafNode(NodeType.CONDITION, () => {
    const distance = distanceToPlayer(gameState.bossPosition, gameState.playerPosition);
    return distance <= bossAIState.attackRange ? NodeStatus.SUCCESS : NodeStatus.FAILURE;
  });
  
  // Check if attack is off cooldown
  const attackOffCooldown = new LeafNode(NodeType.CONDITION, () => {
    const now = Date.now();
    return (now - bossAIState.lastAttackTime) >= bossAIState.attackCooldown ? 
      NodeStatus.SUCCESS : NodeStatus.FAILURE;
  });
  
  // Perform attack
  const performAttack = new LeafNode(NodeType.ACTION, () => {
    if (!bossAIState.isAttacking) {
      console.log('Boss AI: Triggering attack');
      bossAIState.isAttacking = true;
      bossAIState.lastAttackTime = Date.now();
      bossAIState.currentAction = 'attack';
      triggerBossAttack();
      
      // Note: Attack state is now reset in the Boss.tsx component
      // when the animation finishes, so we don't need a setTimeout here
      
      return NodeStatus.SUCCESS;
    }
    
    // If already attacking, return RUNNING to block other behaviors
    return NodeStatus.RUNNING;
  });
  
  // Check if boss is facing player
  const isFacingPlayerNode = new LeafNode(NodeType.CONDITION, () => {
    return isFacingPlayer(
      gameState.bossRotation,
      gameState.bossPosition,
      gameState.playerPosition
    ) ? NodeStatus.SUCCESS : NodeStatus.FAILURE;
  });
  
  // Turn towards player
  const turnTowardsPlayer = new LeafNode(NodeType.ACTION, () => {
    const targetAngle = angleToFacePlayer(gameState.bossPosition, gameState.playerPosition);
    const currentRotation = gameState.bossRotation.clone();
    
    // Calculate the difference between angles (handling wrap-around)
    let angleDiff = targetAngle - currentRotation.y;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    
    // Calculate how much to rotate this frame
    const rotationAmount = Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), bossAIState.turnSpeed * delta);
    
    // Update rotation
    currentRotation.y += rotationAmount;
    setBossRotation(currentRotation);
    bossAIState.currentAction = 'turning';
    
    return Math.abs(angleDiff) < 0.1 ? NodeStatus.SUCCESS : NodeStatus.RUNNING;
  });
  
  // Move towards player
  const moveTowardsPlayer = new LeafNode(NodeType.ACTION, () => {
    // Don't move if attacking
    if (bossAIState.isAttacking) return NodeStatus.FAILURE;
    
    const direction = directionToPlayer(gameState.bossPosition, gameState.playerPosition);
    const distance = distanceToPlayer(gameState.bossPosition, gameState.playerPosition);
    
    // Only move if not already in attack range
    if (distance <= bossAIState.attackRange) {
      // In range but not attacking, set to idle
      bossAIState.currentAction = 'idle';
      return NodeStatus.SUCCESS;
    }
    
    // Calculate new position
    const moveDistance = bossAIState.moveSpeed * delta;
    const newPosition = gameState.bossPosition.clone().add(
      direction.multiplyScalar(moveDistance)
    );
    
    console.log(`Boss AI: Moving towards player, distance=${distance.toFixed(2)}, range=${bossAIState.attackRange}`);
    
    // Update position
    setBossPosition(newPosition);
    bossAIState.currentAction = 'moving';
    
    return distance <= bossAIState.attackRange ? NodeStatus.SUCCESS : NodeStatus.RUNNING;
  });
  
  // Attack sequence: in range + off cooldown + perform attack
  const attackSequence = new CompositeNode(NodeType.SEQUENCE, [
    inAttackRange,
    attackOffCooldown,
    performAttack
  ]);
  
  // Chase sequence: face player + move towards player
  const chaseSequence = new CompositeNode(NodeType.SEQUENCE, [
    new CompositeNode(NodeType.SELECTOR, [
      isFacingPlayerNode,
      turnTowardsPlayer
    ]),
    moveTowardsPlayer
  ]);
  
  // Root selector: try to attack, otherwise chase
  // Using PRIORITY selector to ensure it always tries to attack first when possible
  const rootNode = new CompositeNode(NodeType.SELECTOR, [
    attackSequence,
    chaseSequence
  ]);
  
  // Debug logging removed to prevent console spam
  
  return rootNode;
}
