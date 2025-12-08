"""
Parquet Data Exploration with PyArrow, DuckDB, and Lonboard

This script demonstrates different approaches to querying and visualizing
parquet files from S3:
- PyArrow for direct parquet reading and filtering
- DuckDB for SQL queries on parquet files
- Lonboard for interactive geospatial visualization
"""

import pyarrow.parquet as pq
import pyarrow.fs
import pyarrow.dataset as ds
import pyarrow.compute as pc
import pandas as pd
import geopandas as gpd
import matplotlib.pyplot as plt
import contextily as ctx
from shapely.geometry import Point
from urllib.parse import urlparse
import time
import duckdb
from lonboard import ScatterplotLayer, Map
import numpy as np

# Configuration
occurrence_data = "https://s3.waw3-1.cloudferro.com/emodnet/emodnet_biology/12639/marine_biodiversity_observations_2025-09-22.parquet"

parsed_url = urlparse(occurrence_data)
host = parsed_url.hostname
bucket_name = parsed_url.path.split('/')[1]
key = '/'.join(parsed_url.path.split('/')[2:])

s3 = pyarrow.fs.S3FileSystem(endpoint_override=host, anonymous=True)
s3_path = f"{bucket_name}/{key}"

print("=" * 80)
print("PART 1: PyArrow - Direct Parquet Reading")
print("=" * 80)

# PyArrow approach
dataset = ds.dataset(s3_path, filesystem=s3, format="parquet")
print("\nSchema:")
print(dataset.schema)

start_time = time.time()
filtered_table = dataset.to_table(
    filter=(
        (pc.field("datasetid") == pc.scalar(8357)) &
        (pc.field("latitude") >= 51) &
        (pc.field("latitude") <= 51.5) &
        (pc.field("longitude") >= 2.5) &
        (pc.field("longitude") <= 3.3)
    ),
    columns=["datasetid", "latitude", "longitude",
             "parameter", "parameter_value", "aphiaidaccepted"]
)
pyarrow_time = time.time() - start_time

df_pyarrow = filtered_table.to_pandas()
print(f"\nPyArrow query time: {pyarrow_time:.3f} seconds")
print(f"Rows returned: {len(df_pyarrow)}")
print("\nFirst few rows:")
print(df_pyarrow.head())

print("\n" + "=" * 80)
print("PART 2: DuckDB - SQL Queries on Parquet Files")
print("=" * 80)

# DuckDB approach
conn = duckdb.connect()

# Register the parquet file
start_time = time.time()
conn.execute(f"""
    CREATE VIEW occurrences AS 
    SELECT * FROM read_parquet('{occurrence_data}')
""")
duckdb_setup_time = time.time() - start_time

# Equivalent SQL query
start_time = time.time()
df_duckdb = conn.execute("""
    SELECT 
        datasetid, 
        latitude, 
        longitude,
        parameter, 
        parameter_value, 
        aphiaidaccepted
    FROM occurrences
    WHERE datasetid = 8357
      AND latitude >= 51 
      AND latitude <= 51.5
      AND longitude >= 2.5 
      AND longitude <= 3.3
""").df()
duckdb_query_time = time.time() - start_time

print(f"\nDuckDB setup time: {duckdb_setup_time:.3f} seconds")
print(f"DuckDB query time: {duckdb_query_time:.3f} seconds")
print(f"Total DuckDB time: {duckdb_setup_time + duckdb_query_time:.3f} seconds")
print(f"Rows returned: {len(df_duckdb)}")
print("\nFirst few rows:")
print(df_duckdb.head())

# More complex DuckDB query example
print("\n--- Complex DuckDB Query: Aggregations ---")
start_time = time.time()
agg_results = conn.execute("""
    SELECT 
        parameter,
        COUNT(*) as count,
        COUNT(DISTINCT aphiaidaccepted) as unique_species,
        AVG(CAST(parameter_value AS DOUBLE)) as avg_value
    FROM occurrences
    WHERE datasetid = 8357
      AND latitude >= 51 
      AND latitude <= 51.5
      AND longitude >= 2.5 
      AND longitude <= 3.3
      AND parameter_value IS NOT NULL
    GROUP BY parameter
    ORDER BY count DESC
""").df()
complex_query_time = time.time() - start_time

print(f"Complex query time: {complex_query_time:.3f} seconds")
print("\nAggregation results:")
print(agg_results)

# Multiple regions query with DuckDB
print("\n--- DuckDB: Multiple Regions Query ---")
regions = [
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

start_time = time.time()
region_conditions = []
for region in regions:
    region_conditions.append(f"""
        (latitude >= {region['latitude'][0]} 
         AND latitude <= {region['latitude'][1]}
         AND longitude >= {region['longitude'][0]} 
         AND longitude <= {region['longitude'][1]})
    """)

multi_region_query = f"""
    SELECT 
        datasetid,
        latitude,
        longitude,
        parameter,
        parameter_value,
        aphiaidaccepted,
        CASE
            WHEN {' OR '.join(region_conditions)} THEN
                CASE 
                    WHEN {region_conditions[0]} THEN '{regions[0]["name"]}'
                    WHEN {region_conditions[1]} THEN '{regions[1]["name"]}'
                    WHEN {region_conditions[2]} THEN '{regions[2]["name"]}'
                END
            ELSE 'Other'
        END as region
    FROM occurrences
    WHERE datasetid = 8357
      AND ({' OR '.join(region_conditions)})
"""

multi_df_duckdb = conn.execute(multi_region_query).df()
multi_region_time = time.time() - start_time

print(f"Multi-region query time: {multi_region_time:.3f} seconds")
print(f"Rows returned: {len(multi_df_duckdb)}")
print("\nRegion counts:")
print(multi_df_duckdb.groupby("region").size().to_frame("count"))

conn.close()

print("\n" + "=" * 80)
print("PART 3: Visualization with Matplotlib (Traditional)")
print("=" * 80)

# Traditional matplotlib visualization
gdf = gpd.GeoDataFrame(
    df_pyarrow,
    geometry=gpd.points_from_xy(df_pyarrow.longitude, df_pyarrow.latitude),
    crs="EPSG:4326"
)

fig, ax = plt.subplots(figsize=(10, 10))
gdf_mercator = gdf.to_crs(epsg=3857)
gdf_mercator.plot(ax=ax, color="blue", markersize=10, alpha=0.6, label="Occurrences")
ctx.add_basemap(ax, source=ctx.providers.OpenStreetMap.Mapnik, zoom=10)
ax.set_title("Map of Filtered Occurrences with Background Map (Matplotlib)")
ax.set_xlabel("Longitude")
ax.set_ylabel("Latitude")
plt.legend()
plt.savefig("matplotlib_map.png", dpi=150, bbox_inches='tight')
print("Saved matplotlib map to matplotlib_map.png")
plt.close()

# Multi-region plot
if not multi_df_duckdb.empty:
    multi_gdf = gpd.GeoDataFrame(
        multi_df_duckdb,
        geometry=gpd.points_from_xy(multi_df_duckdb.longitude, multi_df_duckdb.latitude),
        crs="EPSG:4326",
    )
    multi_gdf_mercator = multi_gdf.to_crs(epsg=3857)
    
    fig, ax = plt.subplots(figsize=(10, 10))
    multi_gdf_mercator.plot(
        ax=ax,
        column="region",
        categorical=True,
        legend=True,
        alpha=0.6,
        markersize=12,
    )
    ctx.add_basemap(ax, source=ctx.providers.OpenStreetMap.Mapnik, zoom=5)
    ax.set_title("ARMS occurrences across multiple regions (Matplotlib)")
    ax.set_xlabel("Longitude")
    ax.set_ylabel("Latitude")
    plt.savefig("matplotlib_multi_region.png", dpi=150, bbox_inches='tight')
    print("Saved multi-region matplotlib map to matplotlib_multi_region.png")
    plt.close()

print("\n" + "=" * 80)
print("PART 4: Interactive Visualization with Lonboard")
print("=" * 80)

# Lonboard visualization
if not df_pyarrow.empty:
    # Prepare data for Lonboard
    lons = df_pyarrow.longitude.values
    lats = df_pyarrow.latitude.values
    
    # Create scatterplot layer
    layer = ScatterplotLayer(
        data=pd.DataFrame({
            'coordinates': [[lon, lat] for lon, lat in zip(lons, lats)]
        }),
        get_position='coordinates',
        get_radius=100,
        get_fill_color=[0, 100, 255, 180],
        radius_units='meters',
        radius_min_pixels=2,
        radius_max_pixels=10,
    )
    
    # Create map
    m = Map(layers=[layer], initial_view_state={
        'longitude': lons.mean(),
        'latitude': lats.mean(),
        'zoom': 8,
        'pitch': 0,
    })
    
    # Save to HTML
    m.to_html("lonboard_map.html")
    print("Saved interactive Lonboard map to lonboard_map.html")
    print("Open lonboard_map.html in a browser to interact with the map")

# Multi-region Lonboard visualization
if not multi_df_duckdb.empty:
    # Group by region for different colors
    region_colors = {
        "Belgian coast (51°N)": [255, 0, 0, 180],
        "Bay of Biscay (47°N)": [0, 255, 0, 180],
        "Gulf of Cádiz (36°N)": [255, 165, 0, 180],
    }
    
    layers = []
    for region_name, color in region_colors.items():
        region_data = multi_df_duckdb[multi_df_duckdb['region'] == region_name]
        if not region_data.empty:
            lons = region_data.longitude.values
            lats = region_data.latitude.values
            
            layer = ScatterplotLayer(
                data=pd.DataFrame({
                    'coordinates': [[lon, lat] for lon, lat in zip(lons, lats)]
                }),
                get_position='coordinates',
                get_radius=150,
                get_fill_color=color,
                radius_units='meters',
                radius_min_pixels=2,
                radius_max_pixels=12,
            )
            layers.append(layer)
    
    if layers:
        # Calculate center from all regions
        all_lons = multi_df_duckdb.longitude.values
        all_lats = multi_df_duckdb.latitude.values
        
        m = Map(layers=layers, initial_view_state={
            'longitude': all_lons.mean(),
            'latitude': all_lats.mean(),
            'zoom': 5,
            'pitch': 0,
        })
        
        m.to_html("lonboard_multi_region.html")
        print("Saved interactive multi-region Lonboard map to lonboard_multi_region.html")

print("\n" + "=" * 80)
print("Summary")
print("=" * 80)
print(f"PyArrow query time: {pyarrow_time:.3f} seconds")
print(f"DuckDB total time: {duckdb_setup_time + duckdb_query_time:.3f} seconds")
print(f"DuckDB complex query time: {complex_query_time:.3f} seconds")
print(f"DuckDB multi-region query time: {multi_region_time:.3f} seconds")
print("\nDuckDB excels at complex SQL queries and aggregations!")
print("Lonboard provides interactive WebGL-based visualization for large datasets!")

