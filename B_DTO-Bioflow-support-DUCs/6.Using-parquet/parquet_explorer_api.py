"""
FastAPI Server for Parquet Explorer

A web-based parquet explorer with interactive maps and SQL query capabilities.
Uses DuckDB for querying parquet files and Lonboard for visualization.
"""

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import HTMLResponse, JSONResponse, StreamingResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import duckdb
import pandas as pd
import numpy as np
import time
from pathlib import Path
import io
from openpyxl import Workbook
from openpyxl.utils.dataframe import dataframe_to_rows

app = FastAPI(
    title="Parquet Explorer",
    description="Interactive parquet file explorer with DuckDB and Lonboard"
)

# Get the directory of this file
BASE_DIR = Path(__file__).parent

# Mount static files and templates
static_dir = BASE_DIR / "static"
if static_dir.exists():
    app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))

# Mount viewerapp static files
viewerapp_dir = BASE_DIR / "viewerapp"
if viewerapp_dir.exists():
    app.mount("/viewerapp", StaticFiles(directory=str(viewerapp_dir)),
              name="viewerapp")

# Configuration - Current data source URL (can be changed via API)
# Supports both parquet files and DuckDB databases
current_data_source = "https://s3.waw3-1.cloudferro.com/emodnet/emodnet_biology/12639/marine_biodiversity_observations_2025-09-22.parquet"
current_data_type = "parquet"  # "parquet" or "duckdb"

# Initialize DuckDB connection
conn = duckdb.connect()

# Schema cache for performance optimization
schema_cache = {}
CACHE_KEY_FORMAT = "{url}_{data_type}"


def get_cache_key(url: str, data_type: str) -> str:
    """Generate cache key for schema"""
    return CACHE_KEY_FORMAT.format(url=url, data_type=data_type)


def get_cached_schema(table_ref: str) -> pd.DataFrame:
    """Get schema from cache or query DuckDB"""
    cache_key = get_cache_key(current_data_source, current_data_type)

    if cache_key in schema_cache and "schema_info" in schema_cache[cache_key]:
        return schema_cache[cache_key]["schema_info"]

    # Query schema
    schema_info = conn.execute(
        f"DESCRIBE SELECT * FROM {table_ref} LIMIT 0").df()

    # Cache it
    if cache_key not in schema_cache:
        schema_cache[cache_key] = {}
    schema_cache[cache_key]["schema_info"] = schema_info

    return schema_info


def clear_schema_cache():
    """Clear schema cache when data source changes"""
    global schema_cache
    schema_cache = {}


# Predefined regions
REGIONS = [
    {
        "name": "Belgian coast (51°N)",
        "latitude": (51.0, 51.5),
        "longitude": (2.5, 3.3),
    },
    {
        "name": "Bay of Biscay (47°N)",
        "latitude": (46.5, 47.5),
        "longitude": (-3.5, -1.5),
    },
    {
        "name": "Gulf of Cádiz (36°N)",
        "latitude": (36.0, 36.8),
        "longitude": (-7.5, -6.0),
    },
]


class QueryRequest(BaseModel):
    sql: str
    limit: Optional[int] = 10000


class QueryResponse(BaseModel):
    data: List[Dict[str, Any]]
    columns: List[str]
    row_count: int
    query_time: float
    error: Optional[str] = None


class DataSourceLoadRequest(BaseModel):
    url: str
    # "parquet" or "duckdb", auto-detect if None
    data_type: Optional[str] = None
    # For DuckDB databases, specify table name
    table_name: Optional[str] = None


class ParquetLoadRequest(BaseModel):
    """Backward compatibility model for loading parquet files"""
    url: str


class FilterRequest(BaseModel):
    """Filter specification"""
    column: str
    operator: str  # =, !=, >, <, >=, <=, LIKE, NOT LIKE
    value: str


class TableDataRequest(BaseModel):
    """Request for table data with filtering, column selection, etc."""
    # For DuckDB databases, specify schema and table
    schema: Optional[str] = None
    table: Optional[str] = None
    # Column selection
    columns: Optional[List[str]] = None
    # Filters
    filters: Optional[List[FilterRequest]] = None
    # Search term (searches across all columns)
    search: Optional[str] = None
    # Sorting
    sort_by: Optional[str] = None
    sort_order: Optional[str] = "asc"  # "asc" or "desc"
    # Pagination
    limit: Optional[int] = 1000
    offset: Optional[int] = 0


def detect_data_type(url: str) -> str:
    """Detect if URL is a DuckDB database or parquet file"""
    url_lower = url.lower()
    if url_lower.endswith('.duckdb') or url_lower.endswith('.db'):
        return "duckdb"
    elif url_lower.endswith('.parquet'):
        return "parquet"
    # Try to detect by attempting to read
    # Default to parquet for now
    return "parquet"


def reload_data_view(url: str, data_type: Optional[str] = None, table_name: Optional[str] = None):
    """Reload the DuckDB view with a new data source (parquet or DuckDB)"""
    global current_data_type

    try:
        # Auto-detect data type if not provided
        if data_type is None:
            data_type = detect_data_type(url)

        current_data_type = data_type

        # Clear schema cache when data source changes
        clear_schema_cache()

        # Drop existing view if it exists
        conn.execute("DROP VIEW IF EXISTS occurrences")

        if data_type == "duckdb":
            # For DuckDB databases, attach the database
            # First, detach if already attached
            try:
                conn.execute("DETACH IF EXISTS source_db")
            except Exception:
                pass

            # Attach the database with a unique name
            attach_name = "source_db"
            conn.execute(f"ATTACH '{url}' AS {attach_name} (READ_ONLY)")

            # If table_name is provided, use it; otherwise, try to find the first table
            if table_name:
                table_ref = f"{attach_name}.{table_name}"
            else:
                # Get list of tables from the attached database
                tables_df = conn.execute(f"""
                    SELECT table_name 
                    FROM {attach_name}.information_schema.tables 
                    WHERE table_schema = 'main'
                    LIMIT 1
                """).df()

                if len(tables_df) == 0:
                    return False, "No tables found in DuckDB database"

                table_ref = f"{attach_name}.{tables_df.iloc[0]['table_name']}"

            # Create view from the table
            conn.execute(f"""
                CREATE VIEW occurrences AS
                SELECT * FROM {table_ref}
            """)
        else:
            # For parquet files
            conn.execute(f"""
                CREATE VIEW occurrences AS
                SELECT * FROM read_parquet('{url}')
            """)

        return True, None
    except Exception as e:
        return False, str(e)


@app.on_event("startup")
async def startup_event():
    """Initialize DuckDB view on startup"""
    global current_data_source
    success, error = reload_data_view(current_data_source)
    if success:
        print(
            f"✓ DuckDB view created successfully with: {current_data_source} ({current_data_type})")
    else:
        print(f"⚠ Warning: Could not create DuckDB view: {error}")


@app.on_event("shutdown")
async def shutdown_event():
    """Close DuckDB connection on shutdown"""
    conn.close()
    print("✓ DuckDB connection closed")


@app.get("/", response_class=RedirectResponse)
async def root():
    """Redirect root to unified viewer"""
    return RedirectResponse(url="/viewer", status_code=301)


@app.get("/explorer", response_class=RedirectResponse)
async def explorer():
    """Redirect explorer to unified viewer"""
    return RedirectResponse(url="/viewer", status_code=301)


@app.get("/query", response_class=RedirectResponse)
async def query_page():
    """Redirect query page to unified viewer"""
    return RedirectResponse(url="/viewer", status_code=301)


@app.get("/api/schema")
async def get_schema():
    """Get parquet file schema"""
    try:
        schema_info = conn.execute("""
            DESCRIBE SELECT * FROM occurrences LIMIT 0
        """).df()

        schema_dict = {
            "columns": [
                {
                    "name": row["column_name"],
                    "type": str(row["column_type"]),
                    "null": str(row["null"]),
                }
                for _, row in schema_info.iterrows()
            ],
            "total_columns": len(schema_info)
        }

        return JSONResponse(content=schema_dict)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error getting schema: {str(e)}")


@app.get("/api/stats")
async def get_stats():
    """Get dataset statistics"""
    try:
        start_time = time.time()

        stats = conn.execute("""
            SELECT 
                COUNT(*) as total_rows,
                COUNT(DISTINCT datasetid) as unique_datasets,
                COUNT(DISTINCT aphiaidaccepted) as unique_species,
                MIN(latitude) as min_lat,
                MAX(latitude) as max_lat,
                MIN(longitude) as min_lon,
                MAX(longitude) as max_lon
            FROM occurrences
        """).df()

        query_time = time.time() - start_time

        return JSONResponse(content={
            "stats": stats.to_dict('records')[0],
            "query_time": query_time
        })
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error getting stats: {str(e)}")


@app.get("/api/regions")
async def get_regions():
    """Get predefined region bounding boxes"""
    return JSONResponse(content={"regions": REGIONS})


@app.post("/api/query", response_model=QueryResponse)
async def execute_query(request: QueryRequest):
    """Execute SQL query on parquet file"""
    try:
        start_time = time.time()

        # Add LIMIT if not present and limit is specified
        sql = request.sql.strip()
        if request.limit and "LIMIT" not in sql.upper():
            sql = f"{sql} LIMIT {request.limit}"

        # Execute query
        result_df = conn.execute(sql).df()
        query_time = time.time() - start_time

        # Convert to JSON-serializable format with proper encoding handling
        data = dataframe_to_dict_records(result_df)
        columns = list(result_df.columns)

        return QueryResponse(
            data=data,
            columns=columns,
            row_count=len(result_df),
            query_time=query_time
        )
    except Exception as e:
        return QueryResponse(
            data=[],
            columns=[],
            row_count=0,
            query_time=0,
            error=str(e)
        )


@app.post("/api/export/csv")
async def export_csv(request: QueryRequest):
    """Export query results to CSV"""
    try:
        sql = request.sql.strip()

        # Execute query
        result_df = conn.execute(sql).df()

        # Create CSV in memory
        output = io.StringIO()
        result_df.to_csv(output, index=False)
        output.seek(0)

        # Create streaming response
        def generate():
            yield output.getvalue()

        return StreamingResponse(
            generate(),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=export_{int(time.time())}.csv"
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error exporting CSV: {str(e)}")


@app.post("/api/export/xlsx")
async def export_xlsx(request: QueryRequest):
    """Export query results to XLSX"""
    try:
        sql = request.sql.strip()

        # Execute query
        result_df = conn.execute(sql).df()

        # Create Excel workbook in memory
        wb = Workbook()
        ws = wb.active
        ws.title = "Data"

        # Write dataframe to worksheet
        for r in dataframe_to_rows(result_df, index=False, header=True):
            ws.append(r)

        # Auto-adjust column widths
        for column in ws.columns:
            max_length = 0
            column_letter = column[0].column_letter
            for cell in column:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except Exception:
                    pass
            adjusted_width = min(max_length + 2, 50)
            ws.column_dimensions[column_letter].width = adjusted_width

        # Save to bytes
        output = io.BytesIO()
        wb.save(output)
        output.seek(0)

        return StreamingResponse(
            io.BytesIO(output.read()),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f"attachment; filename=export_{int(time.time())}.xlsx"
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error exporting XLSX: {str(e)}")


@app.get("/api/map-data")
async def get_map_data(
    datasetid: Optional[int] = Query(None, description="Filter by dataset ID"),
    min_lat: Optional[float] = Query(None, description="Minimum latitude"),
    max_lat: Optional[float] = Query(None, description="Maximum latitude"),
    min_lon: Optional[float] = Query(None, description="Minimum longitude"),
    max_lon: Optional[float] = Query(None, description="Maximum longitude"),
    limit: int = Query(10000, description="Maximum number of points"),
    region: Optional[str] = Query(None, description="Predefined region name"),
    search: Optional[str] = Query(
        None, description="Search term to filter data"),
    filters_json: Optional[str] = Query(
        None, description="JSON-encoded filters array")
):
    """Get geospatial data for map visualization"""
    try:
        start_time = time.time()
        global current_data_type

        # Use same table reference logic as table-data endpoint (which works)
        # This ensures consistency between table explorer and map
        if current_data_type == "duckdb":
            # For DuckDB, we need schema and table - but map doesn't have them
            # So get the first available table
            try:
                tables_df = conn.execute("""
                    SELECT table_schema, table_name
                    FROM source_db.information_schema.tables
                    WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
                    ORDER BY table_name
                    LIMIT 1
                """).df()
                if len(tables_df) > 0:
                    table_ref = f"source_db.{tables_df.iloc[0]['table_schema']}.{tables_df.iloc[0]['table_name']}"
                else:
                    raise HTTPException(
                        status_code=400,
                        detail="No tables found in DuckDB database"
                    )
            except HTTPException:
                raise
            except Exception as e:
                raise HTTPException(
                    status_code=400,
                    detail=f"Error accessing DuckDB tables: {str(e)}"
                )
        else:
            # For parquet files, use occurrences view (created by reload_data_view)
            table_ref = "occurrences"

        # Get schema to detect available columns
        schema_info = get_cached_schema(table_ref)
        available_columns = [str(row["column_name"]).lower()
                             for _, row in schema_info.iterrows()]

        # Detect latitude/longitude column names (case-insensitive)
        lat_col = None
        lon_col = None

        # Common variations
        lat_variants = ["latitude", "lat", "y", "decimallatitude"]
        lon_variants = ["longitude", "lon", "lng", "x", "decimallongitude"]

        for col in available_columns:
            if col in lat_variants and lat_col is None:
                # Find the actual column name (case-sensitive)
                for _, row in schema_info.iterrows():
                    if str(row["column_name"]).lower() == col:
                        lat_col = str(row["column_name"])
                        break
            if col in lon_variants and lon_col is None:
                for _, row in schema_info.iterrows():
                    if str(row["column_name"]).lower() == col:
                        lon_col = str(row["column_name"])
                        break

        if not lat_col or not lon_col:
            available_cols_str = ', '.join(
                [str(row['column_name']) for _, row in schema_info.iterrows()])
            raise HTTPException(
                status_code=400,
                detail=f"Geospatial columns (latitude/longitude) not found in table '{table_ref}'. Available columns: {available_cols_str}"
            )

        # Build WHERE clause
        conditions = []

        if datasetid:
            # Check if datasetid column exists
            if "datasetid" in available_columns:
                conditions.append(f"datasetid = {datasetid}")

        if region:
            # Use predefined region
            region_data = next(
                (r for r in REGIONS if r["name"] == region), None)
            if region_data:
                conditions.append(f"""
                    {lat_col} >= {region_data['latitude'][0]} 
                    AND {lat_col} <= {region_data['latitude'][1]}
                    AND {lon_col} >= {region_data['longitude'][0]} 
                    AND {lon_col} <= {region_data['longitude'][1]}
                """)
        else:
            # Use custom bounds if provided
            if min_lat is not None:
                conditions.append(f"{lat_col} >= {min_lat}")
            if max_lat is not None:
                conditions.append(f"{lat_col} <= {max_lat}")
            if min_lon is not None:
                conditions.append(f"{lon_col} >= {min_lon}")
            if max_lon is not None:
                conditions.append(f"{lon_col} <= {max_lon}")

        # Add search condition (searches across all columns)
        if search:
            all_columns = [str(row["column_name"])
                           for _, row in schema_info.iterrows()]
            search_conditions = []
            escaped_search = search.replace("'", "''")
            for col in all_columns:
                search_conditions.append(
                    f'CAST("{col}" AS VARCHAR) ILIKE \'%{escaped_search}%\'')
            if search_conditions:
                conditions.append(f"({' OR '.join(search_conditions)})")

        # Add filter conditions from filters_json
        if filters_json:
            try:
                import json
                filters = json.loads(filters_json)
                if isinstance(filters, list):
                    for filter_req in filters:
                        if not isinstance(filter_req, dict) or not filter_req.get("column") or not filter_req.get("operator"):
                            continue

                        # Find matching column (case-insensitive)
                        col_lower = filter_req["column"].lower()
                        matching_col = None
                        for _, row in schema_info.iterrows():
                            if str(row["column_name"]).lower() == col_lower:
                                matching_col = str(row["column_name"])
                                break

                        if not matching_col:
                            continue

                        # Build condition based on operator
                        operator = filter_req["operator"]
                        value = filter_req.get("value", "")
                        escaped_value = str(value).replace("'", "''")

                        if operator == "=":
                            conditions.append(
                                f'"{matching_col}" = \'{escaped_value}\'')
                        elif operator == "!=":
                            conditions.append(
                                f'"{matching_col}" != \'{escaped_value}\'')
                        elif operator == ">":
                            conditions.append(
                                f'"{matching_col}" > \'{escaped_value}\'')
                        elif operator == "<":
                            conditions.append(
                                f'"{matching_col}" < \'{escaped_value}\'')
                        elif operator == ">=":
                            conditions.append(
                                f'"{matching_col}" >= \'{escaped_value}\'')
                        elif operator == "<=":
                            conditions.append(
                                f'"{matching_col}" <= \'{escaped_value}\'')
                        elif operator == "LIKE":
                            conditions.append(
                                f'"{matching_col}" LIKE \'%{escaped_value}%\'')
                        elif operator == "NOT LIKE":
                            conditions.append(
                                f'"{matching_col}" NOT LIKE \'%{escaped_value}%\'')
            except Exception as e:
                # If filters_json is invalid, just ignore it
                pass

        where_clause = " AND ".join(conditions) if conditions else "1=1"

        # Build SELECT clause with optional columns
        select_cols = [lat_col, lon_col]
        optional_cols = {
            "datasetid": "datasetid" if "datasetid" in available_columns else None,
            "parameter": "parameter" if "parameter" in available_columns else None,
            "parameter_value": "parameter_value" if "parameter_value" in available_columns else None,
            "aphiaidaccepted": "aphiaidaccepted" if "aphiaidaccepted" in available_columns else None,
        }

        for col_name, col_value in optional_cols.items():
            if col_value:
                select_cols.append(col_value)

        query = f"""
            SELECT 
                {', '.join(select_cols)}
            FROM {table_ref}
            WHERE {where_clause}
            LIMIT {limit}
        """

        try:
            result_df = conn.execute(query).df()
        except Exception as query_error:
            import traceback
            error_detail = f"Query failed: {str(query_error)}\nQuery: {query}\nTraceback: {traceback.format_exc()}"
            raise HTTPException(status_code=500, detail=error_detail)

        query_time = time.time() - start_time

        if len(result_df) == 0:
            return JSONResponse(content={
                "points": [],
                "count": 0,
                "bounds": None,
                "query_time": query_time,
                "message": "No data found matching the criteria"
            })

        # Format for map visualization
        points = []
        for _, row in result_df.iterrows():
            point = {
                "coordinates": [
                    float(row[lon_col]),
                    float(row[lat_col])
                ]
            }

            # Add optional fields if they exist
            if optional_cols["datasetid"]:
                val = row[optional_cols["datasetid"]]
                point["datasetid"] = int(val) if pd.notna(val) else None

            if optional_cols["parameter"]:
                val = row[optional_cols["parameter"]]
                point["parameter"] = str(val) if pd.notna(val) else None

            if optional_cols["parameter_value"]:
                val = row[optional_cols["parameter_value"]]
                point["parameter_value"] = str(val) if pd.notna(val) else None

            if optional_cols["aphiaidaccepted"]:
                val = row[optional_cols["aphiaidaccepted"]]
                point["aphiaidaccepted"] = int(val) if pd.notna(val) else None

            points.append(point)

        # Calculate bounds
        bounds = {
            "min_lat": float(result_df[lat_col].min()),
            "max_lat": float(result_df[lat_col].max()),
            "min_lon": float(result_df[lon_col].min()),
            "max_lon": float(result_df[lon_col].max()),
        }

        return JSONResponse(content={
            "points": points,
            "count": len(points),
            "bounds": bounds,
            "query_time": query_time
        })
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_detail = f"Error getting map data: {str(e)}\n{traceback.format_exc()}"
        raise HTTPException(status_code=500, detail=error_detail)


@app.get("/api/data-source-info")
async def get_data_source_info():
    """Get information about the currently loaded data source"""
    global current_data_source, current_data_type
    return JSONResponse(content={
        "url": current_data_source,
        "type": current_data_type,
        "status": "loaded"
    })


@app.get("/api/fast-metadata")
async def get_fast_metadata(
    schema: Optional[str] = Query(
        None, description="Schema name (for DuckDB)"),
    table: Optional[str] = Query(None, description="Table name (for DuckDB)")
):
    """Get fast metadata (column names and total row count) for a table/view."""
    try:
        global current_data_type, current_data_source
        start_time = time.time()

        table_ref = "occurrences"  # Default for parquet or single view

        if current_data_type == "duckdb" and schema and table:
            table_ref = f"source_db.{schema}.{table}"

        # Get cached schema
        schema_info = get_cached_schema(table_ref)
        columns = [str(row["column_name"])
                   for _, row in schema_info.iterrows()]

        # Get total row count (use cache if available)
        cache_key = get_cache_key(current_data_source, current_data_type)
        if cache_key in schema_cache and "total_rows" in schema_cache[cache_key]:
            total_rows = schema_cache[cache_key]["total_rows"]
        else:
            count_query = f"SELECT COUNT(*) as count FROM {table_ref}"
            count_result = conn.execute(count_query).df()
            total_rows = int(count_result.iloc[0]['count'])
            if cache_key not in schema_cache:
                schema_cache[cache_key] = {}
            schema_cache[cache_key]["total_rows"] = total_rows

        query_time = time.time() - start_time

        return JSONResponse(content={
            "columns": columns,
            "total_rows": total_rows,
            "query_time": query_time
        })
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error getting fast metadata: {str(e)}")


@app.get("/api/metadata")
async def get_metadata():
    """Fast metadata endpoint - returns cached columns and row count instantly"""
    try:
        global current_data_source, current_data_type
        cache_key = get_cache_key(current_data_source, current_data_type)

        # Get or cache schema
        table_ref = "occurrences"
        if cache_key not in schema_cache or "schema_info" not in schema_cache[cache_key]:
            schema_info = get_cached_schema(table_ref)
        else:
            schema_info = schema_cache[cache_key]["schema_info"]

        # Get or cache total rows
        if "total_rows" not in schema_cache[cache_key]:
            count_query = f"SELECT COUNT(*) as count FROM {table_ref}"
            count_result = conn.execute(count_query).df()
            total_rows = int(count_result.iloc[0]['count'])
            schema_cache[cache_key]["total_rows"] = total_rows
        else:
            total_rows = schema_cache[cache_key]["total_rows"]

        columns = [
            {
                "name": str(row["column_name"]),
                "type": str(row["column_type"]),
                "nullable": True,
                "default": None
            }
            for _, row in schema_info.iterrows()
        ]

        return JSONResponse(content={
            "columns": columns,
            "total_rows": total_rows,
            "data_type": current_data_type,
            "url": current_data_source
        })
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error getting metadata: {str(e)}")


@app.post("/api/load-data-source")
async def load_data_source(request: DataSourceLoadRequest):
    """Load a new data source (parquet file or DuckDB database)"""
    global current_data_source, current_data_type

    # Validate URL
    if not request.url or not request.url.strip():
        raise HTTPException(
            status_code=400, detail="URL cannot be empty")

    url = request.url.strip()

    # Try to reload the view with the new URL
    success, error = reload_data_view(
        url,
        data_type=request.data_type,
        table_name=request.table_name
    )

    if success:
        current_data_source = url
        return JSONResponse(content={
            "success": True,
            "url": url,
            "type": current_data_type,
            "message": f"{current_data_type.upper()} data source loaded successfully"
        })
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to load data source: {error}"
        )


# Keep old endpoint for backward compatibility
@app.get("/api/parquet-info")
async def get_parquet_info():
    """Get information about the currently loaded data source (backward compatibility)"""
    return await get_data_source_info()


@app.post("/api/load-parquet")
async def load_parquet(request: ParquetLoadRequest):
    """Load a new parquet file (backward compatibility)"""
    load_request = DataSourceLoadRequest(url=request.url, data_type="parquet")
    return await load_data_source(load_request)


@app.get("/api/tables")
async def get_tables():
    """Get list of tables (for DuckDB databases)"""
    try:
        global current_data_type

        if current_data_type == "duckdb":
            # Get tables from attached database
            tables_df = conn.execute("""
                SELECT 
                    table_schema,
                    table_name,
                    (SELECT COUNT(*) FROM information_schema.columns 
                     WHERE table_schema = t.table_schema AND table_name = t.table_name) as column_count
                FROM source_db.information_schema.tables t
                WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
                ORDER BY table_schema, table_name
            """).df()

            # Get row counts for each table
            tables = []
            for _, row in tables_df.iterrows():
                try:
                    count_result = conn.execute(f"""
                        SELECT COUNT(*) as count 
                        FROM source_db.{row['table_schema']}.{row['table_name']}
                    """).df()
                    row_count = int(count_result.iloc[0]['count'])
                except Exception:
                    row_count = 0

                tables.append({
                    "table_schema": str(row['table_schema']),
                    "table_name": str(row['table_name']),
                    "column_count": int(row['column_count']),
                    "rows": row_count
                })

            return JSONResponse(content={"tables": tables})
        else:
            # For parquet files, return a virtual table
            try:
                count_result = conn.execute(
                    "SELECT COUNT(*) as count FROM occurrences").df()
                row_count = int(count_result.iloc[0]['count'])

                schema_info = conn.execute(
                    "DESCRIBE SELECT * FROM occurrences LIMIT 0").df()
                column_count = len(schema_info)

                return JSONResponse(content={
                    "tables": [{
                        "table_schema": "parquet",
                        "table_name": "occurrences",
                        "column_count": column_count,
                        "rows": row_count
                    }]
                })
            except Exception as e:
                raise HTTPException(
                    status_code=500, detail=f"Error getting parquet info: {str(e)}")

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error getting tables: {str(e)}")


@app.get("/api/table-columns")
async def get_table_columns(
    schema: Optional[str] = Query(
        None, description="Schema name (for DuckDB)"),
    table: Optional[str] = Query(None, description="Table name (for DuckDB)")
):
    """Get columns for a specific table with types - uses cached schema"""
    try:
        global current_data_type, current_data_source

        if current_data_type == "duckdb" and schema and table:
            # Get columns from DuckDB table
            columns_df = conn.execute(f"""
                SELECT 
                    column_name,
                    data_type,
                    is_nullable,
                    column_default
                FROM source_db.information_schema.columns
                WHERE table_schema = '{schema}' AND table_name = '{table}'
                ORDER BY ordinal_position
            """).df()

            columns = [
                {
                    "name": str(row["column_name"]),
                    "type": str(row["data_type"]),
                    "nullable": str(row["is_nullable"]) == "YES",
                    "default": str(row["column_default"]) if pd.notna(row["column_default"]) else None
                }
                for _, row in columns_df.iterrows()
            ]
        else:
            # Get columns from cached schema (parquet or default DuckDB table)
            table_ref = "occurrences"
            schema_info = get_cached_schema(table_ref)

            columns = [
                {
                    "name": str(row["column_name"]),
                    "type": str(row["column_type"]),
                    "nullable": True,  # Parquet doesn't provide this info
                    "default": None
                }
                for _, row in schema_info.iterrows()
            ]

        return JSONResponse(content={"columns": columns})
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error getting columns: {str(e)}")


@app.post("/api/table-data")
async def get_table_data(request: TableDataRequest):
    """Get table data with filtering, column selection, search, sorting, and pagination"""
    try:
        global current_data_type, current_data_source

        # Determine table reference
        if current_data_type == "duckdb" and request.schema and request.table:
            table_ref = f"source_db.{request.schema}.{request.table}"
        else:
            # Use the occurrences view (parquet or default DuckDB table)
            table_ref = "occurrences"

        # Get schema once (cached) and reuse throughout
        schema_info = get_cached_schema(table_ref)
        valid_columns_set = set(schema_info["column_name"].str.lower())
        all_columns_list = schema_info["column_name"].tolist()

        # Build SELECT clause
        if request.columns and len(request.columns) > 0:
            # Validate columns exist using cached schema
            selected_columns = []
            for col in request.columns:
                # Case-insensitive matching
                col_lower = col.lower()
                matching_col = None
                for valid_col in schema_info["column_name"]:
                    if valid_col.lower() == col_lower:
                        matching_col = valid_col
                        break

                if matching_col:
                    selected_columns.append(f'"{matching_col}"')

            if not selected_columns:
                raise HTTPException(
                    status_code=400, detail="No valid columns selected")

            select_clause = ", ".join(selected_columns)
        else:
            select_clause = "*"

        # Build WHERE clause
        where_conditions = []

        # Add search conditions (searches across all columns) - use cached schema
        if request.search:
            all_columns = all_columns_list

            search_conditions = []
            # Escape single quotes in search term before using in f-string
            escaped_search = request.search.replace("'", "''")
            for col in all_columns:
                search_conditions.append(
                    f'CAST("{col}" AS VARCHAR) ILIKE \'%{escaped_search}%\'')

            if search_conditions:
                where_conditions.append(f"({' OR '.join(search_conditions)})")

        # Add filter conditions - use cached schema
        if request.filters:

            for filter_req in request.filters:
                if not filter_req.column or not filter_req.operator:
                    continue

                # Find matching column (case-insensitive)
                col_lower = filter_req.column.lower()
                matching_col = None
                for valid_col in schema_info["column_name"]:
                    if valid_col.lower() == col_lower:
                        matching_col = valid_col
                        break

                if not matching_col:
                    continue

                # Build condition based on operator
                operator = filter_req.operator.upper()
                value = filter_req.value

                if operator in ["LIKE", "NOT LIKE"]:
                    # Escape single quotes before using in f-string
                    escaped_value = value.replace("'", "''")
                    condition = f'"{matching_col}" {operator} \'%{escaped_value}%\''
                elif operator in ["=", "!="]:
                    # Try to determine if value is numeric
                    try:
                        numeric_value = float(value)
                        condition = f'"{matching_col}" {operator} {numeric_value}'
                    except ValueError:
                        # String value - escape single quotes before using in f-string
                        escaped_value = value.replace("'", "''")
                        condition = f'"{matching_col}" {operator} \'{escaped_value}\''
                elif operator in [">", "<", ">=", "<="]:
                    # Comparison operators - assume numeric
                    try:
                        numeric_value = float(value)
                        condition = f'"{matching_col}" {operator} {numeric_value}'
                    except ValueError:
                        # If not numeric, skip this filter
                        continue
                else:
                    continue

                where_conditions.append(condition)

        where_clause = ""
        if where_conditions:
            where_clause = "WHERE " + " AND ".join(where_conditions)

        # Build ORDER BY clause - use cached schema
        order_clause = ""
        if request.sort_by:
            # Validate sort column exists using cached schema
            sort_col_lower = request.sort_by.lower()
            matching_sort_col = None
            for valid_col in schema_info["column_name"]:
                if valid_col.lower() == sort_col_lower:
                    matching_sort_col = valid_col
                    break

            if matching_sort_col:
                sort_order = request.sort_order.upper() if request.sort_order else "ASC"
                if sort_order not in ["ASC", "DESC"]:
                    sort_order = "ASC"
                order_clause = f'ORDER BY "{matching_sort_col}" {sort_order}'

        # Build final query
        limit = request.limit if request.limit else 1000
        offset = request.offset if request.offset else 0

        query = f"""
            SELECT {select_clause}
            FROM {table_ref}
            {where_clause}
            {order_clause}
            LIMIT {limit} OFFSET {offset}
        """

        start_time = time.time()
        result_df = conn.execute(query).df()
        query_time = time.time() - start_time

        # Get total count (for pagination info)
        # Use cached count if available and no filters/search
        cache_key = get_cache_key(current_data_source, current_data_type)

        if not where_clause:
            # No filters - use cached count if available
            if cache_key in schema_cache and "total_rows" in schema_cache[cache_key]:
                total_rows = schema_cache[cache_key]["total_rows"]
            else:
                # Calculate and cache
                count_query = f"SELECT COUNT(*) as count FROM {table_ref}"
                count_result = conn.execute(count_query).df()
                total_rows = int(count_result.iloc[0]['count'])
                # Ensure cache entry exists
                if cache_key not in schema_cache:
                    schema_cache[cache_key] = {}
                schema_cache[cache_key]["total_rows"] = total_rows
        else:
            # With filters, always calculate (can't use cached count)
            count_query = f"SELECT COUNT(*) as count FROM {table_ref} {where_clause}"
            count_result = conn.execute(count_query).df()
            total_rows = int(count_result.iloc[0]['count'])

        # Convert to JSON-serializable format with proper type conversion
        data = dataframe_to_dict_records(result_df)
        columns = list(result_df.columns)

        return JSONResponse(content={
            "data": data,
            "columns": columns,
            "total_rows": int(total_rows),
            "returned_rows": len(data),
            "limit": int(limit),
            "offset": int(offset),
            "has_more": (offset + len(data)) < total_rows,
            "query_time": float(query_time)
        })

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error getting table data: {str(e)}")


@app.get("/api/columns")
async def get_columns():
    """Get column names from the parquet file"""
    try:
        # Get column names from schema
        schema_info = conn.execute("""
            DESCRIBE SELECT * FROM occurrences LIMIT 0
        """).df()

        columns = [row["column_name"] for _, row in schema_info.iterrows()]

        # Check if latitude/longitude columns exist
        has_geo = "latitude" in columns and "longitude" in columns

        return JSONResponse(content={
            "columns": columns,
            "has_geospatial": has_geo
        })
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error getting columns: {str(e)}")


@app.get("/api/examples")
async def get_example_queries():
    """Get example SQL queries with dynamic column names"""
    try:
        # Get actual column names
        schema_info = conn.execute("""
            DESCRIBE SELECT * FROM occurrences LIMIT 0
        """).df()
        columns = [row["column_name"] for _, row in schema_info.iterrows()]

        # Build examples with actual column names
        lat_col = "latitude" if "latitude" in columns else columns[0] if columns else "latitude"
        lon_col = "longitude" if "longitude" in columns else columns[1] if len(
            columns) > 1 else "longitude"
        dataset_col = "datasetid" if "datasetid" in columns else (
            columns[0] if columns else "datasetid")
        param_col = "parameter" if "parameter" in columns else None
        species_col = "aphiaidaccepted" if "aphiaidaccepted" in columns else None

        examples = [
            {
                "name": "Basic filter",
                "sql": f"SELECT * FROM occurrences WHERE {dataset_col} = 8357 LIMIT 100",
                "description": f"Get first 100 rows for {dataset_col} = 8357"
            },
            {
                "name": "Multiple values filter (IN clause)",
                "sql": f"SELECT * FROM occurrences WHERE {dataset_col} IN (8617, 8633, 8743) LIMIT 100",
                "description": f"Filter by multiple {dataset_col} values using IN clause"
            },
            {
                "name": "Range filter",
                "sql": f"SELECT * FROM occurrences WHERE {dataset_col} >= 8000 AND {dataset_col} <= 9000 LIMIT 100",
                "description": f"Filter {dataset_col} within a range"
            }
        ]

        # Add spatial filter if geospatial columns exist
        if lat_col in columns and lon_col in columns:
            examples.append({
                "name": "Spatial filter",
                "sql": f"""SELECT {lat_col}, {lon_col}, {param_col if param_col else '*'} 
                          FROM occurrences 
                          WHERE {lat_col} BETWEEN 51 AND 51.5 
                            AND {lon_col} BETWEEN 2.5 AND 3.3 
                          LIMIT 1000""",
                "description": "Filter by geographic bounding box"
            })

            examples.append({
                "name": "Multiple regions (IN clause)",
                "sql": f"""SELECT {lat_col}, {lon_col}, {dataset_col}
                          FROM occurrences 
                          WHERE ({lat_col} BETWEEN 51 AND 51.5 AND {lon_col} BETWEEN 2.5 AND 3.3)
                             OR ({lat_col} BETWEEN 46.5 AND 47.5 AND {lon_col} BETWEEN -3.5 AND -1.5)
                          LIMIT 1000""",
                "description": "Filter by multiple geographic regions"
            })

        # Add aggregation if parameter column exists
        if param_col:
            examples.append({
                "name": "Aggregation",
                "sql": f"""SELECT {param_col}, COUNT(*) as count 
                          FROM occurrences 
                          WHERE {dataset_col} = 8357 
                          GROUP BY {param_col} 
                          ORDER BY count DESC 
                          LIMIT 10""",
                "description": f"Count occurrences by {param_col}"
            })

            examples.append({
                "name": "Multiple datasets aggregation",
                "sql": f"""SELECT {dataset_col}, {param_col}, COUNT(*) as count 
                          FROM occurrences 
                          WHERE {dataset_col} IN (8357, 8617, 8633)
                          GROUP BY {dataset_col}, {param_col} 
                          ORDER BY {dataset_col}, count DESC 
                          LIMIT 20""",
                "description": f"Aggregate across multiple {dataset_col} values"
            })

        # Add species count if species column exists
        if species_col:
            examples.append({
                "name": "Species count",
                "sql": f"""SELECT COUNT(DISTINCT {species_col}) as unique_species 
                          FROM occurrences 
                          WHERE {dataset_col} = 8357 
                            AND {species_col} IS NOT NULL""",
                "description": "Count unique species"
            })

            examples.append({
                "name": "Multiple datasets species count",
                "sql": f"""SELECT {dataset_col}, COUNT(DISTINCT {species_col}) as unique_species 
                          FROM occurrences 
                          WHERE {dataset_col} IN (8357, 8617, 8633)
                            AND {species_col} IS NOT NULL
                          GROUP BY {dataset_col}
                          ORDER BY unique_species DESC""",
                "description": "Count unique species per dataset"
            })

        # Add geographic bounds if geospatial columns exist
        if lat_col in columns and lon_col in columns:
            examples.append({
                "name": "Geographic bounds",
                "sql": f"""SELECT 
                             MIN({lat_col}) as min_lat,
                             MAX({lat_col}) as max_lat,
                             MIN({lon_col}) as min_lon,
                             MAX({lon_col}) as max_lon
                          FROM occurrences 
                          WHERE {dataset_col} = 8357""",
                "description": "Get geographic extent of dataset"
            })

        return JSONResponse(content={"examples": examples})
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error getting examples: {str(e)}")


@app.get("/table-explorer", response_class=RedirectResponse)
async def table_explorer():
    """Redirect table explorer to the new unified viewer"""
    return RedirectResponse(url="/viewer", status_code=301)


@app.get("/viewer", response_class=HTMLResponse)
async def viewer(request: Request):
    """Integrated viewer app with table explorer and map"""
    return templates.TemplateResponse("viewer.html", {"request": request})


@app.post("/api/map-data-from-query")
async def get_map_data_from_query(request: QueryRequest):
    """Get map data from a custom SQL query"""
    try:
        start_time = time.time()

        sql = request.sql.strip()

        # Execute query
        result_df = conn.execute(sql).df()
        query_time = time.time() - start_time

        # Check if latitude/longitude columns exist
        if "latitude" not in result_df.columns or "longitude" not in result_df.columns:
            raise HTTPException(
                status_code=400,
                detail="Query must return 'latitude' and 'longitude' columns for map visualization"
            )

        # Format for map
        points = []
        for _, row in result_df.iterrows():
            point = {
                "coordinates": [
                    float(row["longitude"]),
                    float(row["latitude"])
                ]
            }

            # Add all other columns as properties
            for col in result_df.columns:
                if col not in ["latitude", "longitude"]:
                    value = row[col]
                    if pd.notna(value):
                        if isinstance(value, (int, float)):
                            point[col] = float(value)
                        else:
                            point[col] = str(value)
                    else:
                        point[col] = None

            points.append(point)

        # Calculate bounds
        if len(result_df) > 0:
            bounds = {
                "min_lat": float(result_df["latitude"].min()),
                "max_lat": float(result_df["latitude"].max()),
                "min_lon": float(result_df["longitude"].min()),
                "max_lon": float(result_df["longitude"].max()),
            }
        else:
            bounds = None

        return JSONResponse(content={
            "points": points,
            "count": len(points),
            "bounds": bounds,
            "query_time": query_time
        })
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error getting map data: {str(e)}")


def convert_to_json_serializable(obj):
    """Convert pandas/numpy types to native Python types for JSON serialization"""
    # Check if obj is array-like first (before pd.isna which can return array)
    if isinstance(obj, (pd.Series, np.ndarray)):
        # Convert array-like objects to list
        return [convert_to_json_serializable(item) for item in obj]

    # Check for NaN/null values (only for scalar values)
    try:
        if pd.isna(obj):
            return None
    except (ValueError, TypeError):
        # pd.isna() can fail for some types, continue with other checks
        pass

    # Handle binary data types (bytearray, bytes, memoryview)
    if isinstance(obj, (bytearray, bytes, memoryview)):
        # Convert bytearray/memoryview to bytes first
        if isinstance(obj, bytearray):
            obj = bytes(obj)
        elif isinstance(obj, memoryview):
            obj = obj.tobytes()

        # Try to decode as UTF-8 if it looks like text
        try:
            decoded = obj.decode('utf-8')
            # Check if it's actually readable text (not just binary that happened to decode)
            if len(decoded) > 0 and all(32 <= ord(c) <= 126 or c in '\n\r\t' for c in decoded[:100]):
                return decoded
            else:
                # Binary data that decoded but isn't readable text
                return f"<binary: {len(obj)} bytes>"
        except (UnicodeDecodeError, AttributeError):
            # Binary data that can't be decoded as UTF-8
            return f"<binary: {len(obj)} bytes>"

    elif isinstance(obj, (np.integer, np.int64, np.int32, np.int8, np.int16, np.uint8, np.uint16, np.uint32, np.uint64)):
        return int(obj)
    elif isinstance(obj, (np.floating, np.float64, np.float32, np.float16)):
        return float(obj)
    elif isinstance(obj, np.bool_):
        return bool(obj)
    elif isinstance(obj, pd.Timestamp):
        return obj.isoformat()
    elif isinstance(obj, str):
        # Ensure string is valid UTF-8
        try:
            # Try to encode/decode to ensure it's valid UTF-8
            obj.encode('utf-8')
            return obj
        except UnicodeEncodeError:
            # If encoding fails, try to fix it
            try:
                return obj.encode('utf-8', errors='replace').decode('utf-8')
            except Exception:
                return obj.encode('utf-8', errors='ignore').decode('utf-8', errors='ignore')
    elif isinstance(obj, (list, tuple)):
        return [convert_to_json_serializable(item) for item in obj]
    elif isinstance(obj, dict):
        return {key: convert_to_json_serializable(value) for key, value in obj.items()}
    else:
        # For bytearray and other binary types that weren't caught
        type_name = type(obj).__name__
        if 'byte' in type_name.lower():
            try:
                if hasattr(obj, '__len__'):
                    return f"<binary: {len(obj)} bytes>"
                else:
                    return f"<{type_name}>"
            except Exception:
                return f"<{type_name}>"
        else:
            try:
                return str(obj)
            except Exception:
                return f"<{type(obj).__name__}>"


def dataframe_to_dict_records(df):
    """Convert DataFrame to list of dicts with proper type conversion"""
    records = []
    for _, row in df.iterrows():
        record = {}
        for col in df.columns:
            value = row[col]
            record[col] = convert_to_json_serializable(value)
        records.append(record)
    return records


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
