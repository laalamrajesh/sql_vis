import React, { useEffect, useState } from 'react';
import { Layout, message } from 'antd';
import SqlEditor from './components/SqlEditor';
import DatabaseExplorer from './components/DatabaseExplorer';
import VisualizationPane from './components/VisualizationPane';
import ExecutionTimeline from './components/ExecutionTimeline';
import DatabaseUploader from './components/DatabaseUploader';
import { initSqlJs } from './core/sqliteService';
import { useAppStore } from './store/appStore';
import './App.css';

const { Header, Sider, Content } = Layout;

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const { setDatabase } = useAppStore();
  
  useEffect(() => {
    const init = async () => {
      try {
        const db = await initSqlJs();
        setDatabase(db);
        setLoading(false);
      } catch (error) {
        console.error('Failed to initialize SQL.js:', error);
        message.error('Failed to initialize SQL engine. Please refresh the page.');
      }
    };
    
    init();
  }, [setDatabase]);
  
  if (loading) {
    return <div className="loading">Initializing SQL engine...</div>;
  }
  
  return (
    <Layout className="app-container">
      <Header className="app-header">
        <h1>SQL Visual Tutor</h1>
        <div className="header-controls">
          <DatabaseUploader />
        </div>
      </Header>
      <Layout>
        <Sider width={300} className="app-sider">
          <DatabaseExplorer />
        </Sider>
        <Content className="app-content">
          <SqlEditor />
          <VisualizationPane />
          <ExecutionTimeline />
        </Content>
      </Layout>
    </Layout>
  );
};

export default App; 