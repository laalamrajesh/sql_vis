# SQL Visual Tutor

An interactive visual SQL query execution tutor that demonstrates how SQL queries are executed through animated steps.

## Overview

SQL Visual Tutor is designed to help SQL learners, educators, and data enthusiasts understand the abstract SQL execution processes through visual metaphors and animations. The application breaks down SQL queries into logical steps and visually demonstrates how each part of the query is processed.

## Features

- **Interactive SQL Editor**: Write and execute SQL queries with syntax highlighting
- **Step-by-Step Visualization**: See how each clause (SELECT, FROM, WHERE, etc.) is processed
- **Animated Execution**: Watch how the database processes your query with smooth transitions
- **Timeline Controls**: Navigate forward and backward through execution steps
- **In-Memory Database**: Built-in SQLite database with sample data

## Technical Architecture

- **Frontend**: React with TypeScript
- **UI Framework**: Ant Design for components
- **SQL Engine**: SQLite compiled to WebAssembly (sql.js)
- **Animation**: GSAP for timeline-based animations
- **State Management**: Zustand for centralized state

## Getting Started

### Prerequisites

- Node.js 14+ and npm 6+

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/sql-visual-tutor.git
   cd sql-visual-tutor
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:3000`

## How to Use

1. The application loads with a sample SQL query in the editor
2. Click "Run Query" to start the visualization
3. Watch the animation or use the timeline controls to navigate through steps
4. Modify the query and run it again to see different execution paths

## Sample Queries

Try these queries to explore different SQL features:

```sql
-- Basic query with WHERE and ORDER BY
SELECT name, age 
FROM users 
WHERE status = 'active' 
ORDER BY age DESC 
LIMIT 5

-- Query with JOIN
SELECT u.name, o.product, o.amount 
FROM users u 
JOIN orders o ON u.id = o.user_id 
WHERE o.amount > 100

-- Query with GROUP BY and aggregation
SELECT department, AVG(age) as avg_age, COUNT(*) as employee_count 
FROM users 
GROUP BY department 
ORDER BY avg_age DESC
```

## Development Roadmap

- **Phase 1**: Core visualization for SELECT, FROM, WHERE
- **Phase 2**: Support for GROUP BY, ORDER BY, LIMIT
- **Phase 3**: Join visualizations and error highlighting
- **Phase 4**: Performance optimization and polish

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 