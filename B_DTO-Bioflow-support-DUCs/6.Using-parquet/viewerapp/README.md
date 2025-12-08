# Minka DMT Web Explorer

A web-based data viewer for exploring marine survey data stored in DuckDB databases and Parquet files.

## Overview

The Minka DMT Web Explorer is a single-page React application that provides an intuitive interface for browsing, filtering, and querying marine data. It runs entirely in the browser using DuckDB WASM for data processing.

## Features

- **Database Connection**: Connect to remote DuckDB databases or Parquet files via URL
- **Local File Support**: Upload and explore local DuckDB, Parquet, CSV, or JSON files
- **Table Browser**: Visual grid showing all available tables with row counts
- **Data Viewer**: Interactive table with sorting, searching, and filtering
- **Column Selection**: Choose which columns to display
- **Advanced Filtering**: Add custom filters with various operators (=, !=, >, <, LIKE, etc.)
- **SQL Editor**: Execute custom SQL queries
- **Data Export**: Export filtered data to CSV
- **Real-time Search**: Search across all columns simultaneously

## File Structure

```
viewerapp/
├── index.html          # Main HTML file with React setup
├── css/
│   └── styles.css      # Application styling
└── js/
    ├── app.js          # Main React application (all components inline)
    ├── duckdb_client.js # DuckDB WASM client for data operations
    ├── components/     # Unused component files (legacy)
    └── ui/             # Unused UI files (legacy)
```

## Architecture

The application uses a simplified architecture with just two main JavaScript files:

- **`app.js`**: Contains all React components written using `React.createElement()` (no JSX)
- **`duckdb_client.js`**: Handles DuckDB WASM initialization and all database operations

All components are defined inline in `app.js`:
- `DatabaseSelector` - Connection interface
- `SchemasDisplay` - Shows available schemas
- `SqlEditor` - Custom SQL query interface
- `TableBrowser` - Grid of available tables
- `DataViewer` - Main data display with controls
- `FilterPanel` - Advanced filtering interface
- `ColumnSelector` - Column visibility controls
- `DataTable` - Data table with sorting

## Usage

1. **Open** `index.html` in a web browser
2. **Connect** to a data source:
   - Enter a URL to a remote DuckDB database or Parquet file
   - Or select a local file using the file picker
3. **Browse** available tables in the grid
4. **Click** on a table to view its data
5. **Use** the search box to find specific values
6. **Add filters** to narrow down results
7. **Select columns** to show/hide specific fields
8. **Execute SQL** queries for custom analysis
9. **Export** filtered data to CSV

## Supported Data Sources

- **DuckDB databases** (.duckdb files)
- **Parquet files** (.parquet files)
- **CSV files** (.csv files)
- **JSON files** (.json files)
- **Remote URLs** (HTTP/HTTPS/S3)

## Technical Details

- **Frontend**: React 18 with Babel for JSX transformation
- **Database Engine**: DuckDB WASM for client-side data processing
- **Styling**: Custom CSS with modern design
- **Icons**: Lucide icons
- **Data Format**: Apache Arrow for efficient data transfer

## Browser Requirements

- Modern browser with ES6+ support
- WebAssembly support
- Cross-Origin Isolation (COI) for optimal performance

## Development Notes

- The application uses `React.createElement()` instead of JSX for simplicity
- All components are defined in a single file (`app.js`)
- The `components/` and `ui/` directories contain unused legacy files
- DuckDB WASM handles all data processing client-side
- No build process required - runs directly in the browser
