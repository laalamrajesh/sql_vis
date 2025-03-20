import gsap from 'gsap';
import { useAppStore, ExecutionStep } from '../store/appStore';

interface AnimationOptions {
  duration?: number;
  delay?: number;
  ease?: string;
  onComplete?: () => void;
}

// Animation timeline controller
export class AnimationController {
  private timeline: gsap.core.Timeline;
  private activeAnimations: Map<string, gsap.core.Tween> = new Map();
  private speed: number = 1;
  
  constructor() {
    this.timeline = gsap.timeline({
      paused: true,
      onComplete: () => {
        const { setExecutionState } = useAppStore.getState();
        setExecutionState('completed');
      }
    });
  }
  
  // Clear existing timeline
  public reset(): void {
    this.timeline.clear();
    this.activeAnimations.clear();
    this.timeline = gsap.timeline({ paused: true });
  }
  
  // Set the animation playback speed
  public setSpeed(speed: number): void {
    this.speed = speed;
    this.timeline.timeScale(speed);
  }
  
  // Add step animations to the timeline
  public buildTimeline(steps: ExecutionStep[]): void {
    this.reset();
    
    let position = 0;
    
    steps.forEach((step, index) => {
      // Create a label at the step's position in the timeline
      this.timeline.addLabel(`step_${index}`, position);
      
      // Add appropriate animation based on step type
      switch (step.type) {
        case 'FROM':
          this.addFromAnimation(step, index, { duration: step.duration / 1000 });
          break;
        case 'WHERE':
          this.addWhereAnimation(step, index, { duration: step.duration / 1000 });
          break;
        case 'JOIN':
          this.addJoinAnimation(step, index, { duration: step.duration / 1000 });
          break;
        case 'GROUP BY':
          this.addGroupByAnimation(step, index, { duration: step.duration / 1000 });
          break;
        case 'SELECT':
          this.addSelectAnimation(step, index, { duration: step.duration / 1000 });
          break;
        case 'ORDER BY':
          this.addOrderByAnimation(step, index, { duration: step.duration / 1000 });
          break;
        case 'LIMIT':
          this.addLimitAnimation(step, index, { duration: step.duration / 1000 });
          break;
      }
      
      position += step.duration / 1000;
    });
    
    // Add final label for completion
    this.timeline.addLabel('completed', position);
    
    // Apply current speed setting
    this.timeline.timeScale(this.speed);
  }
  
  // Play the timeline from beginning or current position
  public play(): void {
    this.timeline.play();
    const { setExecutionState } = useAppStore.getState();
    setExecutionState('running');
  }
  
  // Pause the timeline
  public pause(): void {
    this.timeline.pause();
    const { setExecutionState } = useAppStore.getState();
    setExecutionState('paused');
  }
  
  // Go to a specific step
  public goToStep(stepIndex: number): void {
    const labelPosition = this.timeline.labels[`step_${stepIndex}`] || 0;
    this.timeline.pause(labelPosition);
    const { setCurrentStepIndex, setExecutionState } = useAppStore.getState();
    setCurrentStepIndex(stepIndex);
    setExecutionState('paused');
  }
  
  // Step forward to next step
  public nextStep(): void {
    const { currentStepIndex, executionSteps } = useAppStore.getState();
    if (currentStepIndex < executionSteps.length - 1) {
      this.goToStep(currentStepIndex + 1);
    }
  }
  
  // Step back to previous step
  public prevStep(): void {
    const { currentStepIndex } = useAppStore.getState();
    if (currentStepIndex > 0) {
      this.goToStep(currentStepIndex - 1);
    }
  }
  
  // Get total duration of the timeline in milliseconds
  public getTotalDuration(): number {
    return this.timeline.duration() * 1000;
  }
  
  // Get current progress as a percentage
  public getProgress(): number {
    return this.timeline.progress() * 100;
  }
  
  // Animation implementation for each step type
  private addFromAnimation(step: ExecutionStep, index: number, options: AnimationOptions): void {
    // FROM animation would typically:
    // 1. Show the table being loaded
    // 2. Highlight the table with a zoom effect
    const animationId = `from_${index}`;
    
    // Note: These animations are meant to be applied using refs in React components
    // This is a placeholder for the actual animation implementation
    this.timeline.to(`#table-${step.metadata?.tableName}`, {
      scale: 1.05,
      boxShadow: '0 0 20px rgba(66, 102, 245, 0.5)',
      duration: options.duration ? options.duration * 0.3 : 0.6,
      ease: 'power2.inOut'
    }).to(`#table-${step.metadata?.tableName}`, {
      scale: 1,
      boxShadow: '0 0 0px rgba(66, 102, 245, 0)',
      duration: options.duration ? options.duration * 0.3 : 0.6,
      ease: 'power2.inOut',
      onStart: () => {
        const { setCurrentStepIndex } = useAppStore.getState();
        setCurrentStepIndex(index);
      }
    });
    
    this.activeAnimations.set(animationId, this.timeline.recent());
  }
  
  private addWhereAnimation(step: ExecutionStep, index: number, options: AnimationOptions): void {
    // WHERE animation would:
    // 1. Scan through rows one by one
    // 2. Highlight matching rows with green
    // 3. Cross out non-matching rows with red
    const animationId = `where_${index}`;
    
    this.timeline.to(`#query-clause-where`, {
      className: '+=active-clause',
      duration: 0.3,
      onStart: () => {
        const { setCurrentStepIndex } = useAppStore.getState();
        setCurrentStepIndex(index);
      }
    });
    
    // Row-by-row scanning animation would be implemented here
    // This is a simplified placeholder
    const totalRows = (step.data[0]?.values?.length || 10);
    const perRowDuration = options.duration ? options.duration / totalRows * 0.7 : 0.05;
    
    for (let i = 0; i < totalRows; i++) {
      // Check if the row matches the condition
      const matches = (step.data[0]?.values[i]?.at(-1) === 1); // Assuming last column is condition result
      
      this.timeline.to(`#row-${step.metadata?.tableName}-${i}`, {
        backgroundColor: matches ? 'rgba(66, 245, 111, 0.3)' : 'rgba(245, 66, 66, 0.3)',
        className: matches ? '+=matched-data' : '+=filtered-data',
        duration: perRowDuration,
        delay: 0.02 // Small delay between rows
      }, `-=${perRowDuration * 0.5}`); // Overlap animations slightly
    }
    
    this.timeline.to(`#query-clause-where`, {
      className: '-=active-clause',
      duration: 0.3,
      delay: 0.2
    });
    
    this.activeAnimations.set(animationId, this.timeline.recent());
  }
  
  private addJoinAnimation(step: ExecutionStep, index: number, options: AnimationOptions): void {
    // JOIN animation would:
    // 1. Show both tables side by side
    // 2. Draw connecting lines between matching rows
    // 3. Create temporary joined result table
    const animationId = `join_${index}`;
    
    this.timeline.to(`#query-clause-join`, {
      className: '+=active-clause',
      duration: 0.3,
      onStart: () => {
        const { setCurrentStepIndex } = useAppStore.getState();
        setCurrentStepIndex(index);
      }
    });
    
    // Animate the join tables connection
    // These would be connected to actual DOM elements in React
    this.timeline.fromTo(`#join-lines-container`, {
      opacity: 0,
      width: 0
    }, {
      opacity: 1,
      width: '100%',
      duration: options.duration ? options.duration * 0.4 : 0.6
    });
    
    // Show the result table with matches
    this.timeline.fromTo(`#join-result-table`, {
      opacity: 0,
      y: 20
    }, {
      opacity: 1,
      y: 0,
      className: '+=temp-result',
      duration: options.duration ? options.duration * 0.4 : 0.6
    });
    
    this.timeline.to(`#query-clause-join`, {
      className: '-=active-clause',
      duration: 0.3,
      delay: 0.2
    });
    
    this.activeAnimations.set(animationId, this.timeline.recent());
  }
  
  private addGroupByAnimation(step: ExecutionStep, index: number, options: AnimationOptions): void {
    // GROUP BY animation would:
    // 1. Sort rows by group columns
    // 2. Collapse rows with same groups
    // 3. Show aggregation calculations
    const animationId = `groupby_${index}`;
    
    this.timeline.to(`#query-clause-groupby`, {
      className: '+=active-clause',
      duration: 0.3,
      onStart: () => {
        const { setCurrentStepIndex } = useAppStore.getState();
        setCurrentStepIndex(index);
      }
    });
    
    // Group collapse animation
    const totalGroups = (step.data[0]?.values?.length || 5);
    const perGroupDuration = options.duration ? options.duration / totalGroups * 0.6 : 0.15;
    
    for (let i = 0; i < totalGroups; i++) {
      this.timeline.to(`#group-${i}-rows`, {
        y: (j: number) => j * -30, // Stack the rows
        opacity: (j: number) => j === 0 ? 1 : 0.3, // Fade out duplicates
        duration: perGroupDuration
      });
      
      this.timeline.to(`#group-${i}-aggregate`, {
        opacity: 1,
        scale: 1.1,
        duration: perGroupDuration * 0.5,
        delay: 0.1
      }).to(`#group-${i}-aggregate`, {
        scale: 1,
        duration: perGroupDuration * 0.3
      });
    }
    
    this.timeline.to(`#query-clause-groupby`, {
      className: '-=active-clause',
      duration: 0.3,
      delay: 0.2
    });
    
    this.activeAnimations.set(animationId, this.timeline.recent());
  }
  
  private addSelectAnimation(step: ExecutionStep, index: number, options: AnimationOptions): void {
    // SELECT animation would:
    // 1. Highlight the selected columns
    // 2. Show only those columns in the final result
    const animationId = `select_${index}`;
    
    this.timeline.to(`#query-clause-select`, {
      className: '+=active-clause',
      duration: 0.3,
      onStart: () => {
        const { setCurrentStepIndex } = useAppStore.getState();
        setCurrentStepIndex(index);
      }
    });
    
    // Extract column names from step metadata
    const columns = step.metadata?.selectColumns.split(',').map((c: string) => c.trim());
    
    // Highlight each selected column
    columns.forEach((column: string, i: number) => {
      this.timeline.to(`#column-${column}`, {
        backgroundColor: 'rgba(66, 102, 245, 0.2)',
        boxShadow: '0 0 10px rgba(66, 102, 245, 0.4)',
        duration: options.duration ? options.duration / columns.length * 0.5 : 0.3
      });
    });
    
    // Show the selected columns result
    this.timeline.fromTo(`#select-result-table`, {
      opacity: 0,
      scale: 0.95
    }, {
      opacity: 1,
      scale: 1,
      duration: options.duration ? options.duration * 0.3 : 0.5
    });
    
    this.timeline.to(`#query-clause-select`, {
      className: '-=active-clause',
      duration: 0.3,
      delay: 0.2
    });
    
    this.activeAnimations.set(animationId, this.timeline.recent());
  }
  
  private addOrderByAnimation(step: ExecutionStep, index: number, options: AnimationOptions): void {
    // ORDER BY animation would:
    // 1. Show the sorting column highlighted
    // 2. Animate the rows rearranging in sorted order
    const animationId = `orderby_${index}`;
    
    this.timeline.to(`#query-clause-orderby`, {
      className: '+=active-clause',
      duration: 0.3,
      onStart: () => {
        const { setCurrentStepIndex } = useAppStore.getState();
        setCurrentStepIndex(index);
      }
    });
    
    // Highlighting the sorted column
    const sortColumns = step.metadata?.orderByColumns.split(',').map((c: string) => c.trim());
    
    sortColumns.forEach((column: string) => {
      this.timeline.to(`#column-${column.replace(/\s+DESC|\s+ASC/i, '')}`, {
        backgroundColor: 'rgba(245, 182, 66, 0.3)',
        duration: options.duration ? options.duration * 0.2 : 0.3
      });
    });
    
    // Animation for rows swapping positions
    // This would require information about the original and sorted positions
    // For simplicity, we'll just show a generic animation
    const totalRows = (step.data[0]?.values?.length || 10);
    const perSwapDuration = options.duration ? options.duration * 0.6 / totalRows : 0.08;
    
    // Random swaps for visualization only
    for (let i = 0; i < totalRows / 2; i++) {
      const row1 = Math.floor(Math.random() * totalRows);
      const row2 = Math.floor(Math.random() * totalRows);
      
      if (row1 !== row2) {
        const y1 = row1 * 40; // Assuming 40px row height
        const y2 = row2 * 40;
        
        this.timeline.to(`#row-order-${row1}`, {
          y: y2 - y1,
          duration: perSwapDuration,
          ease: 'power1.inOut'
        }, `-=${perSwapDuration}`);
        
        this.timeline.to(`#row-order-${row2}`, {
          y: y1 - y2,
          duration: perSwapDuration,
          ease: 'power1.inOut'
        }, `-=${perSwapDuration}`);
      }
    }
    
    // Reset row positions and show the final sorted table
    this.timeline.to('[id^=row-order-]', {
      y: 0,
      duration: perSwapDuration * 2
    }).fromTo(`#ordered-result-table`, {
      opacity: 0,
      y: 10
    }, {
      opacity: 1,
      y: 0,
      duration: options.duration ? options.duration * 0.2 : 0.3
    });
    
    this.timeline.to(`#query-clause-orderby`, {
      className: '-=active-clause',
      duration: 0.3,
      delay: 0.2
    });
    
    this.activeAnimations.set(animationId, this.timeline.recent());
  }
  
  private addLimitAnimation(step: ExecutionStep, index: number, options: AnimationOptions): void {
    // LIMIT animation would:
    // 1. Show a selector highlighting the limited rows
    // 2. Fade out the excluded rows
    const animationId = `limit_${index}`;
    
    this.timeline.to(`#query-clause-limit`, {
      className: '+=active-clause',
      duration: 0.3,
      onStart: () => {
        const { setCurrentStepIndex } = useAppStore.getState();
        setCurrentStepIndex(index);
      }
    });
    
    const limit = parseInt(step.metadata?.limit) || 10;
    const offset = parseInt(step.metadata?.offset) || 0;
    
    // Animation for the limit selector
    this.timeline.fromTo(`#limit-selector`, {
      height: '0%',
      opacity: 0
    }, {
      height: `${limit * 40}px`, // Assuming 40px per row
      opacity: 0.3,
      top: `${offset * 40}px`, // Position based on offset
      duration: options.duration ? options.duration * 0.5 : 0.5,
      ease: 'power2.out'
    });
    
    // Fade out rows outside the limit
    this.timeline.to(`[id^=row-result-]:not([id^=row-result-${offset}]):not([id^=row-result-${offset + 1}]):not([id^=row-result-${offset + 2}])`, {
      opacity: 0.2,
      duration: options.duration ? options.duration * 0.3 : 0.3
    }, `-=${options.duration ? options.duration * 0.3 : 0.3}`);
    
    // Show the final limited result
    this.timeline.fromTo(`#limited-result-table`, {
      opacity: 0,
      scale: 0.95
    }, {
      opacity: 1,
      scale: 1,
      duration: options.duration ? options.duration * 0.3 : 0.4
    });
    
    this.timeline.to(`#query-clause-limit`, {
      className: '-=active-clause',
      duration: 0.3,
      delay: 0.2
    });
    
    this.activeAnimations.set(animationId, this.timeline.recent());
  }
} 