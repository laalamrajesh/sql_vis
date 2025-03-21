import React from 'react';
import { Card, Steps, Button, Space, Slider, Row, Col, Empty } from 'antd';
import type { StepProps } from 'antd';
import { 
  DatabaseOutlined, 
  FilterOutlined, 
  MergeCellsOutlined, 
  GroupOutlined, 
  ColumnWidthOutlined, 
  SortAscendingOutlined, 
  OrderedListOutlined
} from '@ant-design/icons';
import { useAppStore, ExecutionStep } from '../store/appStore';
import { AnimationController } from '../animations/animationController';
import './ExecutionTimeline.css';

// Reuse the singleton animation controller
const animationController = new AnimationController();

const ExecutionTimeline: React.FC = () => {
  const { executionSteps, currentStepIndex, executionState, setExecutionState } = useAppStore();
  
  // Map step types to appropriate icons
  const getStepIcon = (type: string) => {
    switch (type) {
      case 'FROM':
        return <DatabaseOutlined />;
      case 'WHERE':
        return <FilterOutlined />;
      case 'JOIN':
        return <MergeCellsOutlined />;
      case 'GROUP BY':
        return <GroupOutlined />;
      case 'SELECT':
        return <ColumnWidthOutlined />;
      case 'ORDER BY':
        return <SortAscendingOutlined />;
      case 'LIMIT':
        return <OrderedListOutlined />;
      default:
        return null;
    }
  };
  
  // Get step items for the Steps component
  const getStepItems = () => {
    return executionSteps.map((step, index) => {
      let status: StepProps["status"] = 'wait';
      
      if (index === currentStepIndex) {
        status = 'process';
      } else if (index < currentStepIndex) {
        status = 'finish';
      }
      
      // Create an appropriate step item element instead of returning step objects
      return (
        <div
          key={`step-${index}`}
          className={`step-item ${index === currentStepIndex ? 'active' : ''} ${index < currentStepIndex ? 'completed' : ''}`}
          onClick={() => handleStepClick(index)}
        >
          <span className="step-type">{step.type}</span>
          <span className="step-item-text">{step.description}</span>
        </div>
      );
    });
  };
  
  // Determine step status based on current execution state
  const getStepStatus = (index: number): 'wait' | 'process' | 'finish' | 'error' => {
    if (executionState === 'idle') {
      return 'wait';
    }
    
    if (index < currentStepIndex) {
      return 'finish';
    } else if (index === currentStepIndex) {
      // Always mark the current step as 'process' (active) regardless of execution state
      return 'process';
    } else {
      return 'wait';
    }
  };
  
  // Handler for step click
  const handleStepClick = (index: number) => {
    if (executionSteps.length > 0 && index >= 0 && index < executionSteps.length) {
      animationController.goToStep(index);
    }
  };
  
  // Handlers for playback controls
  const handleNextStep = () => {
    animationController.nextStep();
  };
  
  const handlePrevStep = () => {
    animationController.prevStep();
  };
  
  const handleSliderChange = (value: number) => {
    animationController.goToStep(value);
  };
  
  // Show timeline only when there are execution steps
  if (executionSteps.length === 0) {
    return null;
  }
  
  // Create marks for the slider
  const sliderMarks: Record<number, string> = {};
  if (executionSteps.length > 0) {
    sliderMarks[0] = executionSteps[0].type;
    if (executionSteps.length > 1) {
      sliderMarks[executionSteps.length - 1] = executionSteps[executionSteps.length - 1].type;
    }
  }
  
  return (
    <div className="execution-timeline-container">
      {executionSteps.length > 0 ? (
        <>
          <div className="execution-steps">
            {getStepItems()}
          </div>
          <div className="execution-controls">
            <div className="nav-buttons">
              <Button 
                onClick={handlePrevStep}
                disabled={currentStepIndex <= 0}
                className="nav-button"
              >
                Previous
              </Button>
              <Button 
                onClick={handleNextStep}
                disabled={currentStepIndex >= executionSteps.length - 1}
                type="primary"
                className="nav-button"
              >
                Next
              </Button>
            </div>
          </div>
        </>
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Run a query to see execution steps"
          style={{ margin: '12px 0' }}
        />
      )}
    </div>
  );
};

export default ExecutionTimeline; 