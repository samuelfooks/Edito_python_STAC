// Map Viewer Component
export function MapViewer({ dataSource, onMapReady }) {
  const mapRef = React.useRef(null);
  const [loading, setLoading] = React.useState(false);
  const [mapData, setMapData] = React.useState(null);
  const [region, setRegion] = React.useState('');
  const [datasetid, setDatasetid] = React.useState('');
  const [limit, setLimit] = React.useState(10000);

  React.useEffect(() => {
    if (!mapRef.current) return;

    // Initialize Leaflet map
    const map = L.map(mapRef.current).setView([51.0, 2.5], 6);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Store map instance
    window.mapInstance = map;
    if (onMapReady) onMapReady(map);

    return () => {
      if (map) {
        map.remove();
      }
    };
  }, []);

  const loadMapData = async () => {
    if (!dataSource) {
      alert('Please connect to a data source first');
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: limit.toString() });
      if (datasetid) params.append('datasetid', datasetid);
      if (region) params.append('region', region);

      const response = await fetch(`/api/map-data?${params}`);
      if (!response.ok) {
        throw new Error('Failed to load map data');
      }

      const data = await response.json();
      setMapData(data);

      // Update map with new data
      if (window.mapInstance && data.points) {
        // Clear existing markers
        if (window.markerLayer) {
          window.mapInstance.removeLayer(window.markerLayer);
        }

        // Create new marker layer
        window.markerLayer = L.layerGroup();
        const pointsToShow = data.points.length > 10000 
          ? data.points.slice(0, 10000) 
          : data.points;

        pointsToShow.forEach(point => {
          const marker = L.circleMarker(
            [point.coordinates[1], point.coordinates[0]], 
            {
              radius: 3,
              fillColor: '#0066ff',
              color: '#0066ff',
              weight: 1,
              opacity: 0.6,
              fillOpacity: 0.6
            }
          );

          if (point.parameter) {
            marker.bindPopup(`
              <strong>Parameter:</strong> ${point.parameter}<br/>
              <strong>Value:</strong> ${point.parameter_value || 'N/A'}<br/>
              <strong>Species ID:</strong> ${point.aphiaidaccepted || 'N/A'}
            `);
          }

          marker.addTo(window.markerLayer);
        });

        window.markerLayer.addTo(window.mapInstance);

        // Fit bounds
        if (data.bounds) {
          window.mapInstance.fitBounds([
            [data.bounds.min_lat, data.bounds.min_lon],
            [data.bounds.max_lat, data.bounds.max_lon]
          ], { padding: [50, 50] });
        }
      }
    } catch (error) {
      console.error('Error loading map data:', error);
      alert('Error loading map data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (dataSource) {
      loadMapData();
    }
  }, [dataSource]);

  return React.createElement('div', { 
    style: { 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%' 
    } 
  },
    React.createElement('div', {
      style: {
        background: 'white',
        padding: '16px',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap',
        alignItems: 'center'
      }
    },
      React.createElement('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
        React.createElement('label', { style: { fontWeight: '500' } }, 'Region:'),
        React.createElement('select', {
          value: region,
          onChange: (e) => setRegion(e.target.value),
          style: {
            padding: '6px 8px',
            border: '1px solid #d1d5db',
            borderRadius: '6px'
          }
        },
          React.createElement('option', { value: '' }, 'All regions'),
          React.createElement('option', { value: 'Belgian coast (51°N)' }, 'Belgian coast (51°N)'),
          React.createElement('option', { value: 'Bay of Biscay (47°N)' }, 'Bay of Biscay (47°N)'),
          React.createElement('option', { value: 'Gulf of Cádiz (36°N)' }, 'Gulf of Cádiz (36°N)')
        )
      ),
      React.createElement('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
        React.createElement('label', { style: { fontWeight: '500' } }, 'Dataset ID:'),
        React.createElement('input', {
          type: 'number',
          value: datasetid,
          onChange: (e) => setDatasetid(e.target.value),
          placeholder: 'e.g., 8357',
          style: {
            padding: '6px 8px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            width: '120px'
          }
        })
      ),
      React.createElement('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
        React.createElement('label', { style: { fontWeight: '500' } }, 'Max Points:'),
        React.createElement('input', {
          type: 'number',
          value: limit,
          onChange: (e) => setLimit(parseInt(e.target.value) || 10000),
          min: 100,
          max: 100000,
          step: 1000,
          style: {
            padding: '6px 8px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            width: '100px'
          }
        })
      ),
      React.createElement('button', {
        className: 'btn btn-primary',
        onClick: loadMapData,
        disabled: loading || !dataSource
      }, loading ? 'Loading...' : 'Load Map'),
      React.createElement('button', {
        className: 'btn btn-secondary',
        onClick: () => {
          setRegion('');
          setDatasetid('');
          setLimit(10000);
          loadMapData();
        }
      }, 'Reset')
    ),

    React.createElement('div', {
      style: {
        position: 'relative',
        flex: 1,
        minHeight: '500px'
      }
    },
      React.createElement('div', {
        ref: mapRef,
        style: {
          width: '100%',
          height: '100%'
        }
      }),
      loading && React.createElement('div', {
        style: {
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          zIndex: 1000
        }
      },
        React.createElement('div', { className: 'loading' }, 'Loading map data...')
      ),
      mapData && React.createElement('div', {
        style: {
          position: 'absolute',
          top: '16px',
          right: '16px',
          background: 'white',
          padding: '12px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          fontSize: '0.9rem',
          zIndex: 1000
        }
      },
        React.createElement('div', { style: { marginBottom: '4px' } },
          React.createElement('strong', null, 'Points: '),
          mapData.count.toLocaleString()
        ),
        React.createElement('div', { style: { marginBottom: '4px' } },
          React.createElement('strong', null, 'Query Time: '),
          mapData.query_time.toFixed(3), 's'
        ),
        mapData.bounds && React.createElement('div', null,
          React.createElement('strong', null, 'Bounds: '),
          `${mapData.bounds.min_lat.toFixed(2)}, ${mapData.bounds.max_lat.toFixed(2)} / `,
          `${mapData.bounds.min_lon.toFixed(2)}, ${mapData.bounds.max_lon.toFixed(2)}`
        )
      )
    )
  );
}

