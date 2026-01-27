# Viewerapp Frontend Assets

This directory contains the frontend assets for the Parquet Explorer FastAPI application. These files are served as static assets by the FastAPI backend.

## Overview

The viewerapp is no longer a standalone application. It is now integrated into the FastAPI backend (`parquet_explorer_app.py`) and serves as the frontend UI for exploring parquet files and DuckDB databases.

## File Structure

```
viewerapp/
├── css/
│   └── styles.css      # Application styling (shared across all components)
└── js/
    ├── fastapi_client.js    # FastAPI backend client (exports FastAPIClient class)
    └── integrated_app.js    # Main React application (all components inline)
```

## Active Files

### `css/styles.css`
- Contains all styling for the application
- Referenced by `templates/viewer.html`
- Includes styles for tables, cards, buttons, filters, and map components

### `js/fastapi_client.js`
- FastAPI backend client module
- Exports `FastAPIClient` class that communicates with FastAPI endpoints
- Replaces the old DuckDB WASM client
- Sets `window.FastAPIClient` for use by `integrated_app.js`
- Methods include: `connectToDatabase`, `getTables`, `getTableData`, `executeQuery`, `getFastMetadata`, etc.

### `js/integrated_app.js`
- Main React application (React 18)
- All components are defined inline using `React.createElement()` (no JSX)
- Components include:
  - `TabNavigation` - Tab switcher for Table/Map views
  - `DatabaseSelector` - Data source connection interface
  - `TableBrowser` - Grid of available tables
  - `DataViewer` - Main data display with filtering, sorting, pagination
  - `FilterPanel` - Advanced filtering interface
  - `ColumnSelector` - Column visibility controls
  - `SqlEditor` - Custom SQL query interface
  - `SampleQueries` - Example queries display
  - `MapViewerInline` - Geospatial map visualization (Leaflet)
- Uses `window.FastAPIClient` to communicate with backend
- Loaded by `templates/viewer.html` via Babel transformation

## Architecture

The application follows a client-server architecture:

1. **Backend**: FastAPI server (`parquet_explorer_app.py`)
   - Serves `templates/viewer.html` at `/`
   - Mounts `viewerapp/` as static files at `/viewerapp`
   - Provides REST API endpoints for data operations
   - Uses DuckDB (server-side) for querying parquet files

2. **Frontend**: React SPA
   - `templates/viewer.html` - Entry point HTML
   - `integrated_app.js` - React application
   - `fastapi_client.js` - API client
   - `styles.css` - Styling

3. **Data Flow**:
   - User connects to data source → `FastAPIClient.connectToDatabase()` → `/api/load-data-source`
   - User selects table → `FastAPIClient.getTableData()` → `/api/table-data`
   - User adds filters → Applied via `/api/table-data` with filter parameters
   - User views map → `fetch('/api/map-data')` → Returns geospatial points

## Usage

The viewerapp is automatically served by the FastAPI backend. To use it:

1. Start the FastAPI server: `python parquet_explorer_app.py`
2. Navigate to `http://localhost:8000/` in your browser
3. Connect to a parquet file or DuckDB database
4. Explore data using the table viewer or map viewer tabs

## Dependencies

- React 18 (loaded from CDN)
- ReactDOM 18 (loaded from CDN)
- Babel Standalone (for JSX transformation)
- Leaflet (for map visualization, loaded from CDN)

## Notes

- All React components are defined inline in `integrated_app.js` (no separate component files)
- The application uses `React.createElement()` instead of JSX for simplicity
- No build process required - runs directly in the browser
- The old standalone DuckDB WASM version has been removed


