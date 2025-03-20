import React from 'react';
import './Layout.css';

interface LayoutProps {
  header: React.ReactNode;
  sidebar: React.ReactNode;
  content: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ header, sidebar, content }) => {
  return (
    <div className="app-layout">
      <header className="app-header">
        {header}
      </header>
      <div className="app-body">
        <aside className="app-sidebar">
          {sidebar}
        </aside>
        <main className="app-content">
          {content}
        </main>
      </div>
    </div>
  );
}; 