import { Database } from 'sql.js';
import { v4 as uuidv4 } from 'uuid';
import { ExecutionStep } from '../store/appStore';

// Simple regex patterns for parsing SQL components
const FROM_REGEX = /FROM\s+([^\s,;()]+)/i;
const WHERE_REGEX = /WHERE\s+(.+?)(?=(GROUP BY|ORDER BY|LIMIT|;|$))/i;
const GROUP_BY_REGEX = /GROUP BY\s+(.+?)(?=(ORDER BY|LIMIT|;|$))/i;
const ORDER_BY_REGEX = /ORDER BY\s+(.+?)(?=(LIMIT|;|$))/i;
const LIMIT_REGEX = /LIMIT\s+(\d+)(?:\s*,\s*(\d+)|(?:\s+OFFSET\s+(\d+))?)?/i;
const SELECT_REGEX = /SELECT\s+(.+?)(?=\s+FROM)/i;
const JOIN_REGEX = /(LEFT|RIGHT|INNER|OUTER|CROSS)?\s*JOIN\s+([^\s]+)\s+ON\s+(.+?)(?=(LEFT|RIGHT|INNER|OUTER|CROSS)?\s*JOIN|WHERE|GROUP BY|ORDER BY|LIMIT|;|$)/gi;

// Basic type for AST nodes
interface ASTNode {
  type: string;
  value: string;
  [key: string]: any;
}

export interface QueryPlan {
  steps: ExecutionStep[];
}

export const parseQuery = (query: string, db: Database): QueryPlan => {
  const steps: ExecutionStep[] = [];
  const normalizedQuery = query.replace(/\s+/g, ' ').trim();
  
  // Parse FROM clause
  const fromMatch = FROM_REGEX.exec(normalizedQuery);
  if (fromMatch && fromMatch[1]) {
    const tableName = fromMatch[1];
    
    // Execute a simple query to get the table data
    const tableData = db.exec(`SELECT * FROM ${tableName} LIMIT 100`);
    
    steps.push({
      id: uuidv4(),
      type: 'FROM',
      description: `Load data from table: ${tableName}`,
      data: tableData,
      duration: 1200,
      metadata: {
        tableName
      }
    });
  }
  
  // Parse WHERE clause
  const whereMatch = WHERE_REGEX.exec(normalizedQuery);
  if (whereMatch && whereMatch[1]) {
    const condition = whereMatch[1].trim();
    
    // Get table name from previous FROM step
    const tableName = steps.find(s => s.type === 'FROM')?.metadata?.tableName;
    
    if (tableName) {
      // Execute a query to see which rows match the condition
      const matchData = db.exec(`SELECT *, (${condition}) as _condition_result FROM ${tableName} LIMIT 100`);
      
      steps.push({
        id: uuidv4(),
        type: 'WHERE',
        description: `Filter rows with condition: ${condition}`,
        data: matchData,
        duration: 800,
        metadata: {
          condition,
          tableName
        }
      });
    }
  }
  
  // Parse JOIN clauses if present
  let joinMatch;
  while ((joinMatch = JOIN_REGEX.exec(normalizedQuery)) !== null) {
    const joinType = joinMatch[1] || 'INNER';
    const joinTable = joinMatch[2];
    const joinCondition = joinMatch[3].trim();
    
    // Get main table name from previous FROM step
    const tableName = steps.find(s => s.type === 'FROM')?.metadata?.tableName;
    
    if (tableName) {
      // Get data for join visualization
      const joinData = db.exec(`
        SELECT * FROM ${tableName} 
        ${joinType} JOIN ${joinTable} 
        ON ${joinCondition} 
        LIMIT 100
      `);
      
      steps.push({
        id: uuidv4(),
        type: 'JOIN',
        description: `${joinType} JOIN with table ${joinTable} on condition: ${joinCondition}`,
        data: joinData,
        duration: 1500,
        metadata: {
          joinType,
          joinTable,
          joinCondition,
          mainTable: tableName
        }
      });
    }
  }
  
  // Parse GROUP BY clause
  const groupByMatch = GROUP_BY_REGEX.exec(normalizedQuery);
  if (groupByMatch && groupByMatch[1]) {
    const groupByColumns = groupByMatch[1].trim();
    
    // Execute a query to get the grouped data
    // For visualization purposes, we need to get the groups
    const tableName = steps.find(s => s.type === 'FROM')?.metadata?.tableName;
    
    if (tableName) {
      const groupData = db.exec(`
        SELECT ${groupByColumns}, COUNT(*) as _count 
        FROM ${tableName} 
        GROUP BY ${groupByColumns} 
        LIMIT 100
      `);
      
      steps.push({
        id: uuidv4(),
        type: 'GROUP BY',
        description: `Group results by: ${groupByColumns}`,
        data: groupData,
        duration: 1000,
        metadata: {
          groupByColumns,
          tableName
        }
      });
    }
  }
  
  // Store SELECT query information for later use
  let selectColumns = '*';
  const selectMatch = SELECT_REGEX.exec(normalizedQuery);
  if (selectMatch && selectMatch[1]) {
    selectColumns = selectMatch[1].trim();
  }
  
  // Parse ORDER BY clause
  const orderByMatch = ORDER_BY_REGEX.exec(normalizedQuery);
  if (orderByMatch && orderByMatch[1]) {
    const orderByColumns = orderByMatch[1].trim();
    
    // Get the source of data
    const tableName = steps.find(s => s.type === 'FROM')?.metadata?.tableName;
    
    if (tableName) {
      // Get data in specified order
      const orderData = db.exec(`
        SELECT * 
        FROM ${tableName} 
        ${steps.find(s => s.type === 'WHERE') ? `WHERE ${steps.find(s => s.type === 'WHERE')!.metadata.condition}` : ''}
        ${steps.find(s => s.type === 'GROUP BY') ? `GROUP BY ${steps.find(s => s.type === 'GROUP BY')!.metadata.groupByColumns}` : ''}
        ORDER BY ${orderByColumns} 
        LIMIT 100
      `);
      
      steps.push({
        id: uuidv4(),
        type: 'ORDER BY',
        description: `Order results by: ${orderByColumns}`,
        data: orderData,
        duration: 800,
        metadata: {
          orderByColumns,
          tableName
        }
      });
    }
  }
  
  // Parse LIMIT clause
  const limitMatch = LIMIT_REGEX.exec(normalizedQuery);
  let limit = '100';
  let offset = '0';
  
  if (limitMatch) {
    limit = limitMatch[1];
    offset = limitMatch[2] || limitMatch[3] || '0';
    
    // Get the source of data
    const tableName = steps.find(s => s.type === 'FROM')?.metadata?.tableName;
    
    if (tableName) {
      // Get limited data
      const limitData = db.exec(`
        SELECT * 
        FROM ${tableName} 
        ${steps.find(s => s.type === 'WHERE') ? `WHERE ${steps.find(s => s.type === 'WHERE')!.metadata.condition}` : ''}
        ${steps.find(s => s.type === 'GROUP BY') ? `GROUP BY ${steps.find(s => s.type === 'GROUP BY')!.metadata.groupByColumns}` : ''}
        ${steps.find(s => s.type === 'ORDER BY') ? `ORDER BY ${steps.find(s => s.type === 'ORDER BY')!.metadata.orderByColumns}` : ''}
        LIMIT ${limit} OFFSET ${offset}
      `);
      
      steps.push({
        id: uuidv4(),
        type: 'LIMIT',
        description: `Limit to ${limit} rows${offset !== '0' ? ` with offset ${offset}` : ''}`,
        data: limitData,
        duration: 400,
        metadata: {
          limit,
          offset,
          tableName
        }
      });
    }
  }
  
  // Process SELECT clause last
  if (selectMatch && selectMatch[1]) {
    // Get the source of data (could be LIMIT, ORDER BY, GROUP BY, etc.)
    let sourceStep = steps.length > 0 ? steps[steps.length - 1] : null;
    const tableName = steps.find(s => s.type === 'FROM')?.metadata?.tableName;
    
    if (tableName && sourceStep) {
      // Get the selected columns data
      const selectData = db.exec(`
        SELECT ${selectColumns} 
        FROM ${tableName} 
        ${steps.find(s => s.type === 'WHERE') ? `WHERE ${steps.find(s => s.type === 'WHERE')!.metadata.condition}` : ''}
        ${steps.find(s => s.type === 'GROUP BY') ? `GROUP BY ${steps.find(s => s.type === 'GROUP BY')!.metadata.groupByColumns}` : ''}
        ${steps.find(s => s.type === 'ORDER BY') ? `ORDER BY ${steps.find(s => s.type === 'ORDER BY')!.metadata.orderByColumns}` : ''}
        LIMIT ${limit} OFFSET ${offset}
      `);
      
      steps.push({
        id: uuidv4(),
        type: 'SELECT',
        description: `Select columns: ${selectColumns}`,
        data: selectData,
        duration: 600,
        metadata: {
          selectColumns,
          tableName
        }
      });
    }
  }
  
  return { steps };
}; 