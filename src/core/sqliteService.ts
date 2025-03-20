import initSqlJsLib, { Database } from 'sql.js';
import { useAppStore, TableSchema } from '../store/appStore';

// Sample data creation SQL - used as fallback if no file is uploaded
const SAMPLE_DATABASE_SQL = `
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  age INTEGER,
  department TEXT,
  status TEXT
);

INSERT INTO users (id, name, email, age, department, status) VALUES
  (1, 'John Doe', 'john@example.com', 28, 'Engineering', 'active'),
  (2, 'Jane Smith', 'jane@example.com', 34, 'Marketing', 'active'),
  (3, 'Bob Johnson', 'bob@example.com', 45, 'Engineering', 'inactive'),
  (4, 'Alice Brown', 'alice@example.com', 29, 'Sales', 'active'),
  (5, 'Charlie Green', 'charlie@example.com', 41, 'Marketing', 'active'),
  (6, 'Dave Wilson', 'dave@example.com', 38, 'Sales', 'inactive'),
  (7, 'Eva Davis', 'eva@example.com', 25, 'Engineering', 'active'),
  (8, 'Frank Miller', 'frank@example.com', 52, 'Sales', 'active'),
  (9, 'Grace Lee', 'grace@example.com', 31, 'Marketing', 'active'),
  (10, 'Henry Chen', 'henry@example.com', 27, 'Engineering', 'inactive');

CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  product TEXT NOT NULL,
  amount REAL NOT NULL,
  date TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

INSERT INTO orders (id, user_id, product, amount, date) VALUES
  (1, 1, 'Laptop', 1299.99, '2023-01-15'),
  (2, 1, 'Monitor', 349.99, '2023-01-15'),
  (3, 2, 'Keyboard', 129.99, '2023-01-20'),
  (4, 3, 'Mouse', 59.99, '2023-02-01'),
  (5, 4, 'Headphones', 199.99, '2023-02-05'),
  (6, 5, 'Laptop', 1499.99, '2023-02-10'),
  (7, 6, 'Tablet', 699.99, '2023-02-15'),
  (8, 7, 'Smartphone', 899.99, '2023-03-01'),
  (9, 8, 'Printer', 249.99, '2023-03-10'),
  (10, 9, 'External Drive', 129.99, '2023-03-15'),
  (11, 1, 'Webcam', 89.99, '2023-03-20'),
  (12, 2, 'Speakers', 149.99, '2023-04-01'),
  (13, 3, 'Docking Station', 199.99, '2023-04-05'),
  (14, 4, 'Wireless Charger', 49.99, '2023-04-10'),
  (15, 5, 'USB Hub', 39.99, '2023-04-15');
`;

let SQL: any;

export const initSqlJs = async (): Promise<Database> => {
  if (!SQL) {
    SQL = await initSqlJsLib({
      locateFile: file => `https://sql.js.org/dist/${file}`
    });
  }
  
  // Create empty database by default
  const db = new SQL.Database();
  
  // Create sample database
  db.run(SAMPLE_DATABASE_SQL);
  
  // Load tables metadata
  const tables = loadTables(db);
  const { setTables } = useAppStore.getState();
  setTables(tables);
  
  return db;
};

// Load database from a SQLite file
export const loadDatabaseFromFile = async (file: File): Promise<Database> => {
  if (!SQL) {
    SQL = await initSqlJsLib({
      locateFile: file => `https://sql.js.org/dist/${file}`
    });
  }
  
  try {
    // Read the file as an array buffer
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Create a database from the file content
    const db = new SQL.Database(uint8Array);
    
    // Load tables metadata
    const tables = loadTables(db);
    const { setTables, setDatabase } = useAppStore.getState();
    
    // Update the store with the new database and tables
    setTables(tables);
    setDatabase(db);
    
    return db;
  } catch (error) {
    console.error('Error loading database from file:', error);
    throw new Error('Invalid or corrupted SQLite database file.');
  }
};

// Export database to a file
export const exportDatabaseToFile = (db: Database): Uint8Array => {
  return db.export();
};

export const loadTables = (db: Database): TableSchema[] => {
  const tables: TableSchema[] = [];
  
  // Get all table names
  const tableQuery = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
  
  if (tableQuery[0]?.values) {
    for (const [tableName] of tableQuery[0].values) {
      const columns = [];
      
      // Get columns for each table
      const columnsQuery = db.exec(`PRAGMA table_info(${tableName})`);
      
      if (columnsQuery[0]?.values) {
        for (const columnData of columnsQuery[0].values) {
          columns.push({
            name: columnData[1] as string,
            type: columnData[2] as string
          });
        }
      }
      
      tables.push({
        name: tableName as string,
        columns
      });
    }
  }
  
  return tables;
};

export const executeQuery = (db: Database, query: string): any => {
  try {
    return db.exec(query);
  } catch (error) {
    console.error('Error executing query:', error);
    throw error;
  }
}; 