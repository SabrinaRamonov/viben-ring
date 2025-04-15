/**
 * Simple Behavior Tree implementation for game AI
 */

// Node types
export enum NodeType {
  SELECTOR,  // Runs children until one succeeds
  SEQUENCE,  // Runs children until one fails
  ACTION,    // Performs an action
  CONDITION  // Checks a condition
}

// Node status
export enum NodeStatus {
  SUCCESS,
  FAILURE,
  RUNNING
}

// Node interface
export interface BehaviorNode {
  type: NodeType;
  execute: () => NodeStatus;
}

// Composite node (has children)
export class CompositeNode implements BehaviorNode {
  type: NodeType;
  children: BehaviorNode[];
  currentChild: number = 0;

  constructor(type: NodeType, children: BehaviorNode[]) {
    this.type = type;
    this.children = children;
  }

  execute(): NodeStatus {
    // Reset current child if we're starting fresh
    if (this.currentChild >= this.children.length) {
      this.currentChild = 0;
    }

    // Selector: return on first success, continue on failure
    if (this.type === NodeType.SELECTOR) {
      while (this.currentChild < this.children.length) {
        const status = this.children[this.currentChild].execute();
        
        if (status === NodeStatus.RUNNING) {
          return NodeStatus.RUNNING;
        } else if (status === NodeStatus.SUCCESS) {
          this.currentChild = 0; // Reset for next time
          return NodeStatus.SUCCESS;
        }
        
        // Move to next child on failure
        this.currentChild++;
      }
      
      // All children failed
      this.currentChild = 0;
      return NodeStatus.FAILURE;
    }
    
    // Sequence: return on first failure, continue on success
    if (this.type === NodeType.SEQUENCE) {
      while (this.currentChild < this.children.length) {
        const status = this.children[this.currentChild].execute();
        
        if (status === NodeStatus.RUNNING) {
          return NodeStatus.RUNNING;
        } else if (status === NodeStatus.FAILURE) {
          this.currentChild = 0; // Reset for next time
          return NodeStatus.FAILURE;
        }
        
        // Move to next child on success
        this.currentChild++;
      }
      
      // All children succeeded
      this.currentChild = 0;
      return NodeStatus.SUCCESS;
    }
    
    // Should never reach here
    return NodeStatus.FAILURE;
  }
}

// Leaf node (action or condition)
export class LeafNode implements BehaviorNode {
  type: NodeType;
  action: () => NodeStatus;

  constructor(type: NodeType, action: () => NodeStatus) {
    this.type = type;
    this.action = action;
  }

  execute(): NodeStatus {
    return this.action();
  }
}
