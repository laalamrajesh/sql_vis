import React, { useState } from 'react';
import { Upload, Button, message, Modal, Space, Tooltip, Progress } from 'antd';
import { UploadOutlined, DatabaseOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { RcFile } from 'antd/lib/upload';
import { useAppStore } from '../store/appStore';
import { loadDatabaseFromFile } from '../core/sqliteService';
import './DatabaseUploader.css';

const { Dragger } = Upload;

// SQLite file headers (magic numbers)
const SQLITE_MAGIC_BYTES = [0x53, 0x51, 0x4c, 0x69, 0x74, 0x65, 0x20, 0x66, 0x6f, 0x72, 0x6d, 0x61, 0x74]; // "SQLite format"

const DatabaseUploader: React.FC = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [tableCount, setTableCount] = useState<number | null>(null);
  const { database, tables, resetExecution } = useAppStore();
  
  // Check if the file is a valid SQLite database by checking its header
  const checkSqliteHeader = async (file: File): Promise<boolean> => {
    // Read the first 16 bytes of the file
    const headerBytes = await readFileHeader(file, 16);
    
    // Check for SQLite header
    if (headerBytes) {
      const isSqliteFormat = SQLITE_MAGIC_BYTES.every((byte, index) => {
        return byte === headerBytes[index];
      });
      
      return isSqliteFormat;
    }
    
    return false;
  };
  
  // Helper to read the first n bytes of a file
  const readFileHeader = async (file: File, bytes: number): Promise<Uint8Array | null> => {
    const slice = file.slice(0, bytes);
    try {
      const buffer = await slice.arrayBuffer();
      return new Uint8Array(buffer);
    } catch (error) {
      console.error('Error reading file header:', error);
      return null;
    }
  };
  
  const beforeUpload = async (file: RcFile) => {
    // Size validation
    const isLt10M = file.size / 1024 / 1024 < 10;
    if (!isLt10M) {
      message.error('Database file must be smaller than 10MB!');
      return Upload.LIST_IGNORE;
    }
    
    // SQLite format validation
    const isValidSqlite = await checkSqliteHeader(file);
    if (!isValidSqlite) {
      message.error('Invalid SQLite database file format. Please upload a valid .db, .sqlite, or .sqlite3 file.');
      return Upload.LIST_IGNORE;
    }
    
    // Handle file upload
    handleFileUpload(file);
    return false; // Prevent auto upload
  };
  
  const handleFileUpload = async (file: RcFile) => {
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + Math.floor(Math.random() * 5) + 1;
          return newProgress >= 90 ? 90 : newProgress;
        });
      }, 100);
      
      // Load the database from the file
      const db = await loadDatabaseFromFile(file);
      
      // Complete progress
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Reset any ongoing execution
      resetExecution();
      
      // Set table count for feedback
      setTableCount(tables.length);
      
      message.success(`${file.name} database loaded successfully with ${tables.length} tables.`);
      
      // Close the modal after a small delay to show 100% progress
      setTimeout(() => {
        setIsModalVisible(false);
        setIsUploading(false);
        setUploadProgress(0);
      }, 800);
      
    } catch (error) {
      setUploadProgress(0);
      message.error(`Failed to load database: ${error}`);
      setIsUploading(false);
    }
  };
  
  const showUploadModal = () => {
    setIsModalVisible(true);
    setTableCount(null);
  };
  
  const handleCancel = () => {
    if (!isUploading) {
      setIsModalVisible(false);
    }
  };
  
  return (
    <div className="database-uploader">
      <Space size={[8, 8]} wrap>
        <Tooltip title="Upload SQLite Database File">
          <Button 
            icon={<DatabaseOutlined />} 
            onClick={showUploadModal}
            className="upload-database-btn"
          >
            Upload DB
          </Button>
        </Tooltip>
        
        {tables.length > 0 && (
          <Tooltip title={`${tables.length} tables loaded`}>
            <Button
              type="text"
              icon={<InfoCircleOutlined />}
            >
              {tables.length} Tables
            </Button>
          </Tooltip>
        )}
      </Space>
      
      <Modal
        title="Upload SQLite Database"
        open={isModalVisible}
        onCancel={handleCancel}
        footer={null}
        width={600}
        centered
        destroyOnClose
        maskClosable={!isUploading}
        closable={!isUploading}
      >
        <div className="upload-instructions">
          <p>Upload a SQLite database file (.db, .sqlite, .sqlite3) to use for your SQL queries.</p>
          <p>The database should contain the tables you want to query.</p>
        </div>
        
        <Dragger
          name="databaseFile"
          multiple={false}
          beforeUpload={beforeUpload}
          showUploadList={false}
          disabled={isUploading}
          accept=".db,.sqlite,.sqlite3,application/x-sqlite3,application/vnd.sqlite3"
        >
          <p className="ant-upload-drag-icon">
            <UploadOutlined />
          </p>
          <p className="ant-upload-text">Click or drag file to this area to upload</p>
          <p className="ant-upload-hint">
            Support for a single SQLite database file.
          </p>
        </Dragger>
        
        {isUploading && (
          <div className="upload-status">
            <Progress percent={uploadProgress} status={uploadProgress < 100 ? "active" : "success"} />
            <p>Processing database file{uploadProgress < 100 ? '...' : ' - Complete!'}</p>
          </div>
        )}
        
        {tableCount !== null && (
          <div className="upload-result">
            <p>Successfully loaded database with {tableCount} tables.</p>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DatabaseUploader; 