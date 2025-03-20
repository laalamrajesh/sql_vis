import React, { useState } from 'react';
import { Upload, Button, message, Modal, Space, Tooltip } from 'antd';
import { UploadOutlined, DatabaseOutlined, DownloadOutlined } from '@ant-design/icons';
import { RcFile } from 'antd/lib/upload';
import { useAppStore } from '../store/appStore';
import { loadDatabaseFromFile, exportDatabaseToFile } from '../core/sqliteService';
import './DatabaseUploader.css';

const { Dragger } = Upload;

const DatabaseUploader: React.FC = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const { database, resetExecution } = useAppStore();
  
  const beforeUpload = (file: RcFile) => {
    // Check if file is a SQLite database file
    // SQLite files don't have a standard extension, so we'll just check size
    const isLt10M = file.size / 1024 / 1024 < 10;
    
    if (!isLt10M) {
      message.error('Database file must be smaller than 10MB!');
      return Upload.LIST_IGNORE;
    }
    
    // Handle file upload manually
    handleFileUpload(file);
    return false; // Prevent auto upload
  };
  
  const handleFileUpload = async (file: RcFile) => {
    setIsUploading(true);
    
    try {
      // Load the database from the file
      await loadDatabaseFromFile(file);
      
      // Reset any ongoing execution
      resetExecution();
      
      message.success(`${file.name} database loaded successfully.`);
      setIsModalVisible(false);
    } catch (error) {
      message.error(`Failed to load database: ${error}`);
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleExportDatabase = () => {
    if (!database) {
      message.error('No database to export');
      return;
    }
    
    try {
      // Export the database to a Uint8Array
      const uint8Array = exportDatabaseToFile(database);
      
      // Convert to a Blob and create a download URL
      const blob = new Blob([uint8Array], { type: 'application/x-sqlite3' });
      const url = URL.createObjectURL(blob);
      
      // Create a link and trigger the download
      const a = document.createElement('a');
      a.href = url;
      a.download = 'exported_database.sqlite';
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      message.success('Database exported successfully');
    } catch (error) {
      message.error(`Failed to export database: ${error}`);
    }
  };
  
  const showUploadModal = () => {
    setIsModalVisible(true);
  };
  
  const handleCancel = () => {
    setIsModalVisible(false);
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
        
        <Tooltip title="Export Current Database">
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExportDatabase}
            disabled={!database}
          >
            Export
          </Button>
        </Tooltip>
      </Space>
      
      <Modal
        title="Upload SQLite Database"
        open={isModalVisible}
        onCancel={handleCancel}
        footer={null}
        width={600}
        centered
        destroyOnClose
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
        
        {isUploading && <p className="upload-status">Uploading and processing database...</p>}
      </Modal>
    </div>
  );
};

export default DatabaseUploader; 