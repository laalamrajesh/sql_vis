import { create } from 'zustand';
import { Database } from 'sql.js';

export type ExecutionStep = {
  id: string;
  type: 'FROM' | 'WHERE' | 'GROUP BY' | 'JOIN' | 'SELECT' | 'ORDER BY' | 'LIMIT';
  description: string;
  data: any;
  duration: number;
  metadata?: Record<string, any>;
};

export type TableSchema = {
  name: string;
  columns: { name: string; type: string }[];
};

export type ExecutionState = 'idle' | 'running' | 'paused' | 'completed' | 'error';

interface AppState {
  database: Database | null;
  tables: TableSchema[];
  currentQuery: string;
  executionSteps: ExecutionStep[];
  currentStepIndex: number;
  executionState: ExecutionState;
  error: string | null;
  
  setDatabase: (database: Database) => void;
  setTables: (tables: TableSchema[]) => void;
  setCurrentQuery: (query: string) => void;
  setExecutionSteps: (steps: ExecutionStep[]) => void;
  setCurrentStepIndex: (index: number) => void;
  setExecutionState: (state: ExecutionState) => void;
  setError: (error: string | null) => void;
  resetExecution: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  database: null,
  tables: [],
  currentQuery: '',
  executionSteps: [],
  currentStepIndex: -1,
  executionState: 'idle',
  error: null,
  
  setDatabase: (database) => set({ database }),
  setTables: (tables) => set({ tables }),
  setCurrentQuery: (currentQuery) => set({ currentQuery }),
  setExecutionSteps: (executionSteps) => set({ executionSteps }),
  setCurrentStepIndex: (currentStepIndex) => set({ currentStepIndex }),
  setExecutionState: (executionState) => set({ executionState }),
  setError: (error) => set({ error }),
  resetExecution: () => set({
    executionSteps: [],
    currentStepIndex: -1,
    executionState: 'idle',
    error: null,
  }),
})); 