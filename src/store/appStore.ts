import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

// Define types for the execution steps
export interface QueryData {
  columns: string[];
  values: any[][];
}

export interface ExecutionStep {
  id: string;
  type: 'SELECT' | 'FROM' | 'WHERE' | 'JOIN' | 'GROUP BY' | 'ORDER BY' | 'LIMIT';
  description: string;
  duration: number; // in milliseconds
  data: QueryData[];
  metadata?: {
    [key: string]: string;
  };
}

export interface AppState {
  // SQL and database state
  sqlInstance: any;
  db: any;
  databaseName: string;
  tables: string[];
  tableSchemas: Record<string, { name: string; type: string }[]>;
  
  // Query execution state
  currentQuery: string;
  queryResult: QueryData | null;
  executionSteps: ExecutionStep[];
  currentStepIndex: number;
  executionState: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  executionError: string | null;
  
  // UI state
  selectedTable: string | null;
  theme: 'light' | 'dark';
  
  // Actions
  setSqlInstance: (instance: any) => void;
  setDatabase: (db: any) => void;
  setDatabaseName: (name: string) => void;
  setTables: (tables: string[]) => void;
  setTableSchemas: (schemas: Record<string, { name: string; type: string }[]>) => void;
  
  setCurrentQuery: (query: string) => void;
  setQueryResult: (result: QueryData | null) => void;
  setExecutionSteps: (steps: ExecutionStep[]) => void;
  addExecutionStep: (step: Omit<ExecutionStep, 'id'>) => void;
  setCurrentStepIndex: (index: number) => void;
  setExecutionState: (state: 'idle' | 'running' | 'paused' | 'completed' | 'error') => void;
  setExecutionError: (error: string | null) => void;
  
  setSelectedTable: (table: string | null) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  
  // Reset functions
  resetExecutionState: () => void;
  resetDatabase: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Initial state
  sqlInstance: null,
  db: null,
  databaseName: '',
  tables: [],
  tableSchemas: {},
  
  currentQuery: '',
  queryResult: null,
  executionSteps: [],
  currentStepIndex: 0,
  executionState: 'idle',
  executionError: null,
  
  selectedTable: null,
  theme: 'dark',
  
  // Actions
  setSqlInstance: (instance) => set({ sqlInstance: instance }),
  
  setDatabase: (db) => set({ db }),
  
  setDatabaseName: (databaseName) => set({ databaseName }),
  
  setTables: (tables) => set({ tables }),
  
  setTableSchemas: (tableSchemas) => set({ tableSchemas }),
  
  setCurrentQuery: (currentQuery) => set({ currentQuery }),
  
  setQueryResult: (queryResult) => set({ queryResult }),
  
  setExecutionSteps: (executionSteps) => set({ executionSteps }),
  
  addExecutionStep: (step) => set((state) => ({
    executionSteps: [
      ...state.executionSteps,
      {
        ...step,
        id: uuidv4()
      }
    ]
  })),
  
  setCurrentStepIndex: (currentStepIndex) => set({ currentStepIndex }),
  
  setExecutionState: (executionState) => set({ executionState }),
  
  setExecutionError: (executionError) => set({ executionError }),
  
  setSelectedTable: (selectedTable) => set({ selectedTable }),
  
  setTheme: (theme) => set({ theme }),
  
  // Reset functions
  resetExecutionState: () => set({
    currentQuery: '',
    queryResult: null,
    executionSteps: [],
    currentStepIndex: 0,
    executionState: 'idle',
    executionError: null
  }),
  
  resetDatabase: () => set({
    db: null,
    databaseName: '',
    tables: [],
    tableSchemas: {},
    selectedTable: null,
    
    // Also reset the execution state
    currentQuery: '',
    queryResult: null,
    executionSteps: [],
    currentStepIndex: 0,
    executionState: 'idle',
    executionError: null
  })
})); 