# Parquet Explorer with DuckDB and Lonboard

An interactive web application for exploring parquet files using DuckDB for SQL queries and Lonboard for interactive geospatial visualization.

## Features

- **DuckDB Integration**: Execute SQL queries directly on parquet files
- **Interactive Maps**: WebGL-based visualization with Lonboard for large datasets
- **Schema Explorer**: Browse parquet file structure and statistics
- **Query Interface**: Execute custom SQL queries with real-time results
- **FastAPI Backend**: RESTful API for querying and data access

## Installation

### Using uv (recommended)

```bash
cd 6.Using-parquet
uv sync
```

### Using pip

```bash
pip install -r ../../requirements.txt
```

## Usage

### Running the Script

Execute the Python script to see examples of PyArrow, DuckDB, and Lonboard:

```bash
python using_parquet.py
```

This will:
- Query parquet files using PyArrow
- Execute SQL queries with DuckDB
- Generate interactive HTML maps with Lonboard
- Create static matplotlib visualizations

### Running the FastAPI Server

Start the web application:

```bash
python parquet_explorer_api.py
```

Or using uvicorn directly:

```bash
uvicorn parquet_explorer_api:app --reload --host 0.0.0.0 --port 8000
```

Then open your browser to:
- **Interactive Map**: http://localhost:8000/
- **Schema Explorer**: http://localhost:8000/explorer
- **SQL Query Interface**: http://localhost:8000/query

## API Endpoints

### GET `/api/schema`
Get the schema of the parquet file.

### GET `/api/stats`
Get dataset statistics (row count, unique values, geographic bounds).

### GET `/api/regions`
Get predefined region bounding boxes.

### GET `/api/map-data`
Get geospatial data for map visualization.

**Query Parameters:**
- `datasetid` (optional): Filter by dataset ID
- `min_lat`, `max_lat`, `min_lon`, `max_lon` (optional): Geographic bounds
- `region` (optional): Predefined region name
- `limit` (default: 10000): Maximum number of points

### POST `/api/query`
Execute SQL query on parquet file.

**Request Body:**
```json
{
  "sql": "SELECT * FROM occurrences WHERE datasetid = 8357 LIMIT 100",
  "limit": 10000
}
```

### GET `/api/examples`
Get example SQL queries.

## Project Structure

```
6.Using-parquet/
├── using_parquet.py          # Example script with PyArrow, DuckDB, Lonboard
├── parquet_explorer_api.py   # FastAPI application
├── pyproject.toml            # uv/pip dependencies
├── templates/                # HTML templates
│   ├── index.html           # Interactive map page
│   ├── explorer.html        # Schema explorer
│   └── query.html           # SQL query interface
├── static/                   # Static files (if needed)
│   └── js/
└── README.md                 # This file
```

## Technologies

- **PyArrow**: Direct parquet file reading and filtering
- **DuckDB**: SQL queries on parquet files with excellent performance
- **Lonboard**: WebGL-based interactive geospatial visualization
- **FastAPI**: Modern Python web framework
- **Matplotlib**: Static map generation

## Example Queries

### Basic Filter
```sql
SELECT * FROM occurrences WHERE datasetid = 8357 LIMIT 100
```

### Spatial Filter
```sql
SELECT latitude, longitude, parameter
FROM occurrences
WHERE latitude BETWEEN 51 AND 51.5
  AND longitude BETWEEN 2.5 AND 3.3
LIMIT 1000
```

### Aggregation
```sql
SELECT parameter, COUNT(*) as count
FROM occurrences
WHERE datasetid = 8357
GROUP BY parameter
ORDER BY count DESC
LIMIT 10
```

## Performance Notes

- DuckDB excels at complex SQL queries and aggregations
- Lonboard handles large datasets efficiently with WebGL
- Parquet files are queried directly without full loading into memory
- Query results are limited by default to prevent memory issues

## License

See parent directory LICENSE file.

