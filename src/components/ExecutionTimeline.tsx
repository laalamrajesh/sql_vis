import React from 'react';
import { Card, Steps, Button, Space, Slider, Row, Col, Tooltip } from 'antd';
import { 
  DatabaseOutlined, 
  FilterOutlined, 
  MergeCellsOutlined, 
  GroupOutlined, 
  ColumnWidthOutlined, 
  SortAscendingOutlined, 
  OrderedListOutlined,
  StepBackwardOutlined,
  StepForwardOutlined,
  PauseOutlined,
  PlayCircleOutlined
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
    const isMobile = window.innerWidth <= 768;
    
    return executionSteps.map((step: ExecutionStep, index: number) => ({
      title: step.type,
      description: isMobile ? null : step.description,
      icon: getStepIcon(step.type),
      status: getStepStatus(index)
    }));
  };
  
  // Determine step status based on current execution state
  const getStepStatus = (index: number) => {
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
  
  const handlePlayPause = () => {
    if (executionState === 'running') {
      animationController.pause();
    } else {
      animationController.play();
    }
  };
  
  const handleSliderChange = (value: number) => {
    animationController.goToStep(value);
  };
  
  // Control animation speed
  const handleSpeedChange = (value: number) => {
    animationController.setSpeed(value);
  };
  
  // Show timeline only when there are execution steps
  if (executionSteps.length === 0) {
    return null;
  }
  
  return (
    <Card className="execution-timeline-card">
      <div className="timeline-container">
        <Steps 
          current={currentStepIndex} 
          items={getStepItems()}
          onChange={handleStepClick}
          size={window.innerWidth <= 576 ? "small" : "default"}
          responsive={true}
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
              tooltip={{ formatter: (value) => executionSteps[value]?.type || 'Step' }}
              marks={window.innerWidth > 576 ? {
                0: executionSteps[0]?.type || 'Start',
                [executionSteps.length - 1]: executionSteps[executionSteps.length - 1]?.type || 'End'
              } : {}}
            />
          </Col>
          <Col xs={24} md={8}>
            <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <Tooltip title="Previous Step">
                <Button 
                  icon={<StepBackwardOutlined />}
                  onClick={handlePrevStep}
                  disabled={currentStepIndex <= 0}
                />
              </Tooltip>
              <Tooltip title={executionState === 'running' ? 'Pause' : 'Play'}>
                <Button 
                  icon={executionState === 'running' ? <PauseOutlined /> : <PlayCircleOutlined />}
                  onClick={handlePlayPause}
                  type="primary"
                  shape="circle"
                  size="large"
                />
              </Tooltip>
              <Tooltip title="Next Step">
                <Button 
                  icon={<StepForwardOutlined />}
                  onClick={handleNextStep}
                  disabled={currentStepIndex >= executionSteps.length - 1}
                />
              </Tooltip>
              <Tooltip title="Animation Speed">
                <div className="speed-slider">
                  <span>Speed:</span>
                  <Slider
                    min={0.5}
                    max={2}
                    step={0.25}
                    defaultValue={1}
                    onChange={handleSpeedChange}
                    style={{ width: window.innerWidth <= 576 ? '80px' : '100px', marginLeft: 10 }}
                  />
                </div>
              </Tooltip>
            </div>
          </Col>
        </Row>
      </div>
    </Card>
  );
};

export default ExecutionTimeline; 