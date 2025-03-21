import React from 'react';
import { Card, Steps, Button, Space, Slider, Row, Col } from 'antd';
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
  
  // Format step item for Steps component - simplified for mobile
  const getStepItems = () => {
    return executionSteps.map((step: ExecutionStep, index: number) => ({
      title: step.type,
      description: step.description,
      icon: getStepIcon(step.type),
      status: getStepStatus(index) as StepProps['status']
    }));
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
    <Card className="execution-timeline-card">
      <div className="timeline-container" style={{ marginBottom: '20px' }}>
        <Steps 
          current={currentStepIndex} 
          items={getStepItems()}
          onChange={handleStepClick}
          size="default"
          direction="horizontal"
          responsive={false}
          className="execution-steps"
          style={{ 
            overflowX: 'visible', 
            width: '100%',
            position: 'relative'
          }}
        />
      </div>
      
      <div className="timeline-controls">
        <Row gutter={[16, 16]} align="middle" style={{ width: '100%' }}>
          <Col xs={24} md={16}>
            <Slider
              min={0}
              max={executionSteps.length - 1}
              value={currentStepIndex}
              onChange={handleSliderChange}
              step={1}
              tooltip={{ formatter: (value: any) => executionSteps[value]?.type || 'Step' }}
              marks={sliderMarks}
            />
          </Col>
          <Col xs={24} md={8}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
              <Button 
                type="primary"
                onClick={handlePrevStep}
                disabled={currentStepIndex <= 0}
                style={{ width: '100px' }}
              >
                Previous
              </Button>
              <Button 
                type="primary"
                onClick={handleNextStep}
                disabled={currentStepIndex >= executionSteps.length - 1}
                style={{ width: '100px' }}
              >
                Next
              </Button>
            </div>
          </Col>
        </Row>
      </div>
    </Card>
  );
};

export default ExecutionTimeline; 