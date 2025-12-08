// Main App Component
const { useState, useEffect, useCallback } = React;

// Database Selector Component
function DatabaseSelector({ dbClient, onDatabaseConnected, onDatabaseDisconnected }) {
  const [dbPath, setDbPath] = React.useState('https://s3.waw3-1.cloudferro.com/emodnet/minkadata/newseawatchb.duckdb');

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [isConnected, setIsConnected] = React.useState(false);

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    try {
      await dbClient.connectToLocalFile(file);
      setIsConnected(true);
      onDatabaseConnected();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUrlConnect = async () => {
    if (!dbPath.trim()) return;

    setLoading(true);
    setError(null);
    try {
      await dbClient.connectToDatabase(dbPath.trim());
      setIsConnected(true);
      onDatabaseConnected();
      setDbPath('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    onDatabaseDisconnected();
  };

  return React.createElement('div', { className: 'database-selector' },
    React.createElement('h3', { style: { marginBottom: '16px', color: '#0f172a' } }, 'Database Connection'),

    !isConnected ? React.createElement('div', null,
      React.createElement('p', { style: { marginBottom: '16px', color: '#64748b' } },
        'Connect to a DuckDB database or Parquet file by selecting a local file or entering a URL:'
      ),

      error && React.createElement('div', {
        style: {
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#dc2626',
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '16px',
          fontSize: '0.9rem'
        }
      },
        React.createElement('strong', null, 'Connection Error: '), error,

      ),

      React.createElement('div', {
        style: { display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }
      },
        React.createElement('input', {
          type: 'file',
          id: 'file-input',
          className: 'file-input',
          accept: '.duckdb,.parquet,.csv,.json',
          onChange: handleFileSelect
        }),
        React.createElement('label', {
          htmlFor: 'file-input',
          className: 'btn btn-secondary',
          style: { cursor: 'pointer' }
        }, '📁 Select Local File'),
        React.createElement('span', { style: { color: '#64748b', fontSize: '0.9rem' } }, 'or')
      ),

      React.createElement('div', {
        style: { display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }
      },
        React.createElement('input', {
          type: 'text',
          className: 'search-box',
          placeholder: 'Enter URL (e.g., https://s3.../file.duckdb or .parquet)',
          value: dbPath,
          onChange: (e) => setDbPath(e.target.value),
          onKeyPress: (e) => e.key === 'Enter' && handleUrlConnect(),
          style: { flex: 1 }
        }),
        React.createElement('button', {
          className: 'btn btn-primary',
          onClick: handleUrlConnect,
          disabled: !dbPath.trim() || loading
        }, loading ? 'Connecting...' : 'Connect URL')
      ),

      React.createElement('div', {
        style: { marginBottom: '8px' }
      },
      )
    ) : React.createElement('div', null,
      React.createElement('div', {
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }
      },
        React.createElement('div', { className: 'status-indicator status-connected' },
          '✓ Connected to Data Source'
        ),
        React.createElement('button', {
          className: 'btn btn-secondary',
          onClick: handleDisconnect
        }, 'Disconnect')
      )
    )
  );
}

// Schemas Display Component
function SchemasDisplay({ schemas }) {
  if (!schemas || schemas.length === 0) return null;

  return React.createElement('div', {
    style: {
      background: 'white',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '20px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      border: '1px solid #e2e8f0'
    }
  },
    React.createElement('h3', {
      style: { marginBottom: '16px', color: '#0f172a' }
    }, 'Available Schemas'),
    React.createElement('div', {
      style: { display: 'flex', flexWrap: 'wrap', gap: '8px' }
    },
      schemas.map((schema, index) =>
        React.createElement('span', {
          key: index,
          style: {
            background: '#dbeafe',
            color: '#1e40af',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '0.9rem',
            fontWeight: '500'
          }
        }, schema.schema_name)
      )
    )
  );
}

// SQL Editor Component
function SqlEditor({ onExecute, loading }) {
  const [sql, setSql] = React.useState('SELECT * FROM ');
  const [limit, setLimit] = React.useState(1000);

  const handleExecute = () => {
    if (sql.trim()) {
      onExecute(sql.trim(), limit);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleExecute();
    }
  };

  return React.createElement('div', { className: 'sql-editor' },
    React.createElement('h3', {
      style: { marginBottom: '16px', color: '#0f172a' }
    }, 'Custom SQL Query'),

    React.createElement('textarea', {
      value: sql,
      onChange: (e) => setSql(e.target.value),
      onKeyDown: handleKeyDown,
      placeholder: 'Enter your SQL query here...'
    }),

    React.createElement('div', { className: 'sql-controls' },
      React.createElement('div', { className: 'sql-info' },
        'Press Ctrl+Enter to execute'
      ),
      React.createElement('div', {
        style: { display: 'flex', gap: '8px', alignItems: 'center' }
      },
        React.createElement('input', {
          type: 'number',
          value: limit,
          onChange: (e) => setLimit(parseInt(e.target.value) || 1000),
          style: {
            width: '80px',
            padding: '4px 8px',
            border: '1px solid #d1d5db',
            borderRadius: '4px'
          },
          min: '1',
          max: '10000'
        }),
        React.createElement('button', {
          className: 'btn btn-primary',
          onClick: handleExecute,
          disabled: loading
        }, loading ? 'Executing...' : 'Execute')
      )
    )
  );
}

// Table Card Component
function TableCard({ table, isSelected, onClick }) {
  return React.createElement('div', {
    className: `table-card ${isSelected ? 'selected' : ''}`,
    onClick: onClick
  },
    React.createElement('div', { className: 'table-name' }, table.table_name),
    React.createElement('div', { className: 'table-schema' }, table.table_schema),
    React.createElement('div', { className: 'table-rows' },
      (() => {
        if (typeof table.rows === 'number') {
          if (table.rows > 1000000) {
            return `${(table.rows / 1000000).toFixed(1)}M rows`;
          }
          return table.rows.toLocaleString() + ' rows';
        }
        return table.rows + ' rows';
      })()
    )
  );
}

// Table Browser Component
function TableBrowser({ tables, selectedTable, onTableSelect }) {
  if (!tables || tables.length === 0) {
    return React.createElement('div', { className: 'empty-state' },
      React.createElement('h3', null, 'No Tables Found'),
      React.createElement('p', null, 'Connect to a database to view available tables')
    );
  }

  return React.createElement('div', { className: 'tables-grid' },
    tables.map((table) =>
      React.createElement(TableCard, {
        key: `${table.table_schema}.${table.table_name}`,
        table: table,
        isSelected: selectedTable?.table_name === table.table_name &&
          selectedTable?.table_schema === table.table_schema,
        onClick: () => onTableSelect(table)
      })
    )
  );
}

// Filter Panel Component
function FilterPanel({
  columns,
  filters,
  onAddFilter,
  onRemoveFilter,
  onClearFilters,
  isExpanded,
  onToggle
}) {
  const [newFilter, setNewFilter] = React.useState({
    column: '',
    operator: '=',
    value: ''
  });

  const handleAddFilter = () => {
    if (newFilter.column && newFilter.operator && newFilter.value.trim()) {
      onAddFilter({ ...newFilter, value: newFilter.value.trim() });
      setNewFilter({ column: '', operator: '=', value: '' });
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleAddFilter();
    }
  };

  return React.createElement('div', { className: 'filter-panel' },
    React.createElement('div', {
      className: 'panel-header',
      onClick: onToggle,
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        cursor: 'pointer',
        padding: '8px 0',
        borderBottom: isExpanded ? '1px solid #e2e8f0' : 'none',
        marginBottom: isExpanded ? '12px' : '0'
      }
    },
      React.createElement('h4', {
        style: {
          margin: 0,
          color: '#0f172a',
          fontSize: '1rem',
          fontWeight: '600'
        }
      }, 'Filter Data'),
      React.createElement('span', {
        style: {
          fontSize: '1.2rem',
          color: '#64748b',
          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease'
        }
      }, '▼')
    ),

    isExpanded && React.createElement('div', { className: 'panel-content' },
      React.createElement('div', { className: 'filter-row' },
        React.createElement('select', {
          className: 'filter-select',
          value: newFilter.column,
          onChange: (e) => setNewFilter({ ...newFilter, column: e.target.value })
        },
          React.createElement('option', { value: '' }, 'Select column...'),
          columns.map(col =>
            React.createElement('option', { key: col.name, value: col.name }, col.name)
          )
        ),

        React.createElement('select', {
          className: 'filter-select',
          value: newFilter.operator,
          onChange: (e) => setNewFilter({ ...newFilter, operator: e.target.value })
        },
          React.createElement('option', { value: '=' }, '='),
          React.createElement('option', { value: '!=' }, '!='),
          React.createElement('option', { value: '>' }, '>'),
          React.createElement('option', { value: '<' }, '<'),
          React.createElement('option', { value: '>=' }, '>='),
          React.createElement('option', { value: '<=' }, '<='),
          React.createElement('option', { value: 'LIKE' }, 'LIKE'),
          React.createElement('option', { value: 'NOT LIKE' }, 'NOT LIKE')
        ),

        React.createElement('input', {
          type: 'text',
          className: 'filter-input',
          placeholder: 'Value...',
          value: newFilter.value,
          onChange: (e) => setNewFilter({ ...newFilter, value: e.target.value }),
          onKeyPress: handleKeyPress
        }),

        React.createElement('button', {
          className: 'btn btn-primary btn-sm',
          onClick: handleAddFilter,
          disabled: !newFilter.column || !newFilter.value.trim()
        }, 'Add Filter')
      ),

      filters.length > 0 && React.createElement('div', { className: 'active-filters' },
        React.createElement('div', {
          style: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px'
          }
        },
          React.createElement('span', {
            style: { fontSize: '0.9rem', color: '#64748b' }
          }, `${filters.length} active filter${filters.length !== 1 ? 's' : ''}`),
          React.createElement('button', {
            className: 'btn btn-secondary btn-sm',
            onClick: onClearFilters
          }, 'Clear All')
        ),

        React.createElement('div', { className: 'filter-tags' },
          filters.map((filter, index) =>
            React.createElement('div', {
              key: index,
              className: 'filter-tag'
            },
              React.createElement('span', { className: 'filter-tag-text' },
                `${filter.column} ${filter.operator} ${filter.value}`
              ),
              React.createElement('button', {
                className: 'filter-tag-remove',
                onClick: () => onRemoveFilter(index)
              }, '×')
            )
          )
        )
      )
    )
  );
}

// Column Selector Component
function ColumnSelector({
  columns,
  selectedColumns,
  onColumnToggle,
  onSelectAll,
  onSelectNone,
  isExpanded,
  onToggle
}) {
  if (!columns || columns.length === 0) {
    return null;
  }

  const allSelected = selectedColumns.length === columns.length;
  const noneSelected = selectedColumns.length === 0;

  return React.createElement('div', { className: 'column-selector' },
    React.createElement('div', {
      className: 'panel-header',
      onClick: onToggle,
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        cursor: 'pointer',
        padding: '8px 0',
        borderBottom: isExpanded ? '1px solid #e2e8f0' : 'none',
        marginBottom: isExpanded ? '12px' : '0'
      }
    },
      React.createElement('h4', {
        style: {
          margin: 0,
          color: '#0f172a',
          fontSize: '1rem',
          fontWeight: '600'
        }
      }, 'Select Columns'),
      React.createElement('span', {
        style: {
          fontSize: '1.2rem',
          color: '#64748b',
          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease'
        }
      }, '▼')
    ),

    isExpanded && React.createElement('div', { className: 'panel-content' },
      React.createElement('div', {
        style: {
          display: 'flex',
          gap: '8px',
          marginBottom: '12px'
        }
      },
        React.createElement('button', {
          className: 'btn btn-secondary btn-sm',
          onClick: onSelectAll,
          disabled: allSelected
        }, 'Select All'),
        React.createElement('button', {
          className: 'btn btn-secondary btn-sm',
          onClick: onSelectNone,
          disabled: noneSelected
        }, 'Select None')
      ),

      React.createElement('div', { className: 'column-list' },
        columns.map(column =>
          React.createElement('label', {
            key: column.name,
            className: 'column-item',
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '4px 0',
              cursor: 'pointer'
            }
          },
            React.createElement('input', {
              type: 'checkbox',
              checked: selectedColumns.includes(column.name),
              onChange: () => onColumnToggle(column.name)
            }),
            React.createElement('span', {
              style: { fontSize: '0.9rem' }
            }, column.name),
            React.createElement('span', {
              style: {
                fontSize: '0.8rem',
                color: '#64748b',
                fontStyle: 'italic'
              }
            }, `(${column.type})`)
          )
        )
      )
    )
  );
}

// Data Table Component
function DataTable({ data, columns, onSort, sortBy, sortOrder, loading }) {

  if (loading) {
    return React.createElement('div', { className: 'loading' }, 'Loading data...');
  }

  if (!data || data.length === 0) {
    return React.createElement('div', { className: 'empty-state' },
      React.createElement('h3', null, 'No data found'),
      React.createElement('p', null, 'Try adjusting your search or filters')
    );
  }

  return React.createElement('div', { className: 'data-table-container' },
    React.createElement('table', { className: 'data-table' },
      React.createElement('thead', null,
        React.createElement('tr', null,
          columns.map((col, index) => {
            const isWideColumn = col.toLowerCase().includes('validator_feedback') ||
              col.toLowerCase().includes('remarks') ||
              col.toLowerCase().includes('validatorfeedback') ||
              col.toLowerCase().includes('validator feedback');


            const className = [
              sortBy === col ? 'sorted' : '',
              isWideColumn ? 'wide-column' : ''
            ].filter(Boolean).join(' ');

            return React.createElement('th', {
              key: index,
              className: className,
              onClick: () => onSort(col),
              style: { cursor: 'pointer' }
            },
              col,
              sortBy === col && React.createElement('span', {
                className: 'sort-indicator'
              }, sortOrder === 'asc' ? '↑' : '↓')
            );
          })
        )
      ),
      React.createElement('tbody', null,
        data.map((row, rowIndex) =>
          React.createElement('tr', { key: rowIndex },
            columns.map((col, colIndex) => {
              const isWideColumn = col.toLowerCase().includes('validator_feedback') ||
                col.toLowerCase().includes('remarks') ||
                col.toLowerCase().includes('validatorfeedback') ||
                col.toLowerCase().includes('validator feedback');

              const className = isWideColumn ? 'wide-column' : '';

              return React.createElement('td', {
                key: colIndex,
                className: className
              },
                row[col] !== null && row[col] !== undefined
                  ? (col.toLowerCase().includes('temperature') && typeof row[col] === 'number' && row[col] % 1 === 0
                      ? row[col].toFixed(1)
                      : String(row[col]))
                  : React.createElement('span', {
                    style: { color: '#9ca3af' }
                  }, 'null')
              );
            })
          )
        )
      )
    )
  );
}

// Data Viewer Component
function DataViewer({
  selectedTable,
  tableData,
  tableColumns,
  selectedColumns,
  filters,
  searchTerm,
  sortBy,
  sortOrder,
  currentPage,
  pageSize,
  loading,
  onSearch,
  onSort,
  onPageChange,
  onColumnToggle,
  onSelectAllColumns,
  onSelectNoneColumns,
  onAddFilter,
  onRemoveFilter,
  onClearFilters,
  onExportCSV,
  showSqlEditor,
  onToggleSqlEditor,
  showColumnSelector,
  showFilterPanel,
  onToggleColumnSelector,
  onToggleFilterPanel
}) {
  if (!selectedTable) {
    return null;
  }

  const currentData = tableData;
  const currentColumns = selectedColumns || [];

  return React.createElement('div', { className: 'data-viewer' },
    React.createElement('div', { className: 'data-header' },
      React.createElement('div', { className: 'data-title' },
        `${selectedTable.table_schema}.${selectedTable.table_name}`
      ),
      React.createElement('div', { className: 'controls' },
        React.createElement('input', {
          type: 'text',
          className: 'search-box',
          placeholder: 'Search in all columns...',
          value: searchTerm,
          onChange: (e) => onSearch(e.target.value)
        }),
        React.createElement('button', {
          className: 'btn btn-secondary',
          onClick: onToggleSqlEditor
        }, showSqlEditor ? 'Hide' : 'Show', ' SQL Editor'),
        React.createElement('button', {
          className: 'btn btn-primary',
          onClick: onExportCSV,
          disabled: loading
        }, '📊 Export CSV')
      )
    ),

    React.createElement('div', { className: 'data-controls' },
      React.createElement(ColumnSelector, {
        columns: tableColumns,
        selectedColumns: selectedColumns,
        onColumnToggle: onColumnToggle,
        onSelectAll: onSelectAllColumns,
        onSelectNone: onSelectNoneColumns,
        isExpanded: showColumnSelector,
        onToggle: onToggleColumnSelector
      }),

      React.createElement(FilterPanel, {
        columns: tableColumns,
        filters: filters,
        onAddFilter: onAddFilter,
        onRemoveFilter: onRemoveFilter,
        onClearFilters: onClearFilters,
        isExpanded: showFilterPanel,
        onToggle: onToggleFilterPanel
      })
    ),

    currentData && React.createElement('div', {
      style: {
        display: 'flex',
        gap: '20px',
        marginBottom: '16px',
        padding: '12px',
        background: '#f8fafc',
        borderRadius: '8px',
        fontSize: '0.9rem'
      }
    },
      React.createElement('div', null,
        React.createElement('div', {
          style: { color: '#64748b', fontSize: '0.8rem' }
        }, 'Total Rows'),
        React.createElement('div', {
          style: { fontWeight: '600', color: '#0f172a' }
        }, currentData.total_rows.toLocaleString())
      ),
      React.createElement('div', null,
        React.createElement('div', {
          style: { color: '#64748b', fontSize: '0.8rem' }
        }, 'Showing'),
        React.createElement('div', {
          style: { fontWeight: '600', color: '#0f172a' }
        }, currentData.data.length)
      ),
      React.createElement('div', null,
        React.createElement('div', {
          style: { color: '#64748b', fontSize: '0.8rem' }
        }, 'Columns'),
        React.createElement('div', {
          style: { fontWeight: '600', color: '#0f172a' }
        }, currentColumns.length)
      )
    ),

    React.createElement(DataTable, {
      data: currentData?.data,
      columns: currentColumns,
      onSort: onSort,
      sortBy: sortBy,
      sortOrder: sortOrder,
      loading: loading
    }),

    currentData && React.createElement('div', {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '20px',
        paddingTop: '20px',
        borderTop: '1px solid #e5e7eb'
      }
    },
      React.createElement('div', {
        style: { color: '#6b7280', fontSize: '0.9rem' }
      },
        `Showing ${currentPage * pageSize + 1} to ${Math.min((currentPage + 1) * pageSize, currentData.total_rows)} of ${currentData.total_rows.toLocaleString()} rows`,
        currentData.limited && ' (limited)'
      ),
      React.createElement('div', {
        style: { display: 'flex', gap: '8px' }
      },
        React.createElement('button', {
          className: 'btn btn-secondary',
          onClick: () => onPageChange(currentPage - 1),
          disabled: currentPage === 0
        }, 'Previous'),
        React.createElement('button', {
          className: 'btn btn-secondary',
          onClick: () => onPageChange(currentPage + 1),
          disabled: !currentData.limited || (currentPage + 1) * pageSize >= currentData.total_rows
        }, 'Next')
      )
    )
  );
}

// Main App Component
function App() {
  const [dbClient, setDbClient] = useState(null);
  const [isDbInitialized, setIsDbInitialized] = useState(false);
  const [schemas, setSchemas] = useState([]);
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableData, setTableData] = useState(null);
  const [tableColumns, setTableColumns] = useState([]);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [filters, setFilters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState(null);
  const [sortOrder, setSortOrder] = useState('asc');
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(100);
  const [showSqlEditor, setShowSqlEditor] = useState(false);
  const [queryData, setQueryData] = useState(null);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  // Initialize DuckDB WASM
  useEffect(() => {
    const initDb = async () => {
      const client = new window.DuckDBWasmClient();
      const success = await client.init();
      if (success) {
        setDbClient(client);
        setIsDbInitialized(true);
      } else {
        setError('Failed to initialize DuckDB WASM');
      }
    };
    initDb();

    return () => {
      if (dbClient) {
        dbClient.dispose();
      }
    };
  }, []);

  const loadSchemasAndTables = async () => {
    if (!dbClient) return;

    try {
      setLoading(true);
      setError(null);
      const schemasData = await dbClient.getSchemas();
      setSchemas(schemasData);
      const tablesData = await dbClient.getTables();
      setTables(tablesData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDatabaseConnected = () => {
    loadSchemasAndTables();
  };

  const handleDatabaseDisconnected = () => {
    setSchemas([]);
    setTables([]);
    setSelectedTable(null);
    setTableData(null);
    setTableColumns([]);
    setSelectedColumns([]);
    setFilters([]);
    setQueryData(null);
  };

  const loadTableColumns = async (table) => {
    try {
      console.log(`Loading columns for table: ${table.table_schema}.${table.table_name}`);
      const columns = await dbClient.getTableColumns(table.table_schema, table.table_name);
      console.log('Loaded columns:', columns.map(col => col.name));
      setTableColumns(columns);
      const allColumnNames = columns.map(col => col.name);
      setSelectedColumns(allColumnNames);
      // Load data immediately after columns are loaded
      console.log('Loading data with columns:', allColumnNames);
      loadTableData(table, 0, '', null, 'asc', allColumnNames, []);
    } catch (err) {
      console.error('Failed to load columns:', err);
    }
  };

  const loadTableData = useCallback(async (table, page = 0, search = '', sort = null, order = 'asc', columns = null, customFilters = []) => {
    if (!table || !dbClient) return;

    try {
      setLoading(true);
      setError(null);
      const data = await dbClient.getTableData(table.table_schema, table.table_name, {
        limit: pageSize,
        offset: page * pageSize,
        search,
        sortBy: sort,
        sortOrder: order,
        columns: columns || selectedColumns,
        filters: customFilters
      });
      setTableData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [pageSize, selectedColumns, dbClient]);

  const handleTableSelect = async (table) => {
    setSelectedTable(table);
    setCurrentPage(0);
    setSearchTerm('');
    setSortBy(null);
    setSortOrder('asc');
    setQueryData(null);
    setFilters([]);
    setTableData(null); // Clear old data immediately
    setTableColumns([]); // Clear old columns immediately
    setSelectedColumns([]); // Clear old selected columns immediately
    await loadTableColumns(table);
  };

  const handleSearch = (term) => {
    setSearchTerm(term);
    setCurrentPage(0);
    loadTableData(selectedTable, 0, term, sortBy, sortOrder, selectedColumns, filters);
  };

  const handleSort = (column) => {
    const newOrder = sortBy === column && sortOrder === 'asc' ? 'desc' : 'asc';
    setSortBy(column);
    setSortOrder(newOrder);
    setCurrentPage(0);
    loadTableData(selectedTable, 0, searchTerm, column, newOrder, selectedColumns, filters);
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    loadTableData(selectedTable, newPage, searchTerm, sortBy, sortOrder, selectedColumns, filters);
  };

  const handleColumnToggle = (columnName) => {
    const newSelected = selectedColumns.includes(columnName)
      ? selectedColumns.filter(col => col !== columnName)
      : [...selectedColumns, columnName];
    setSelectedColumns(newSelected);
    setCurrentPage(0);
    loadTableData(selectedTable, 0, searchTerm, sortBy, sortOrder, newSelected, filters);
  };

  const handleSelectAllColumns = () => {
    setSelectedColumns(tableColumns.map(col => col.name));
    setCurrentPage(0);
    loadTableData(selectedTable, 0, searchTerm, sortBy, sortOrder, tableColumns.map(col => col.name), filters);
  };

  const handleSelectNoneColumns = () => {
    setSelectedColumns([]);
    setTableData(null);
  };

  const handleAddFilter = (filter) => {
    const newFilters = [...filters, filter];
    setFilters(newFilters);
    setCurrentPage(0);
    loadTableData(selectedTable, 0, searchTerm, sortBy, sortOrder, selectedColumns, newFilters);
  };

  const handleRemoveFilter = (index) => {
    const newFilters = filters.filter((_, i) => i !== index);
    setFilters(newFilters);
    setCurrentPage(0);
    loadTableData(selectedTable, 0, searchTerm, sortBy, sortOrder, selectedColumns, newFilters);
  };

  const handleClearFilters = () => {
    setFilters([]);
    setCurrentPage(0);
    loadTableData(selectedTable, 0, searchTerm, sortBy, sortOrder, selectedColumns, []);
  };

  const handleSqlExecute = async (sql, limit) => {
    if (!dbClient) return;

    try {
      setLoading(true);
      setError(null);
      const data = await dbClient.executeQuery(sql, limit);
      setQueryData(data);
      setSelectedTable(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    if (!selectedTable || !dbClient) return;

    try {
      setLoading(true);
      setError(null);
      const csvContent = await dbClient.exportToCSV(selectedTable.table_schema, selectedTable.table_name, {
        search: searchTerm,
        sortBy: sortBy,
        sortOrder: sortOrder,
        columns: selectedColumns,
        filters: filters
      });

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedTable.table_schema}_${selectedTable.table_name}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSqlEditor = () => {
    setShowSqlEditor(!showSqlEditor);
  };

  const handleToggleColumnSelector = () => {
    setShowColumnSelector(!showColumnSelector);
  };

  const handleToggleFilterPanel = () => {
    setShowFilterPanel(!showFilterPanel);
  };

  useEffect(() => {
    // Only reload data for search, sort, or filter changes, not for initial table selection
    if (selectedTable && tableColumns.length > 0 && selectedColumns.length > 0) {
      // Only reload if we have search, sort, or filters (not initial load)
      if (searchTerm || sortBy || filters.length > 0) {
        loadTableData(selectedTable, 0, searchTerm, sortBy, sortOrder, selectedColumns, filters);
      }
    }
  }, [searchTerm, sortBy, sortOrder, filters]);

  if (!isDbInitialized) {
    return React.createElement('div', { className: 'container' },
      React.createElement('div', { className: 'loading' }, 'Initializing DuckDB WASM...')
    );
  }

  return React.createElement('div', { className: 'container' },
    React.createElement('div', { className: 'header' },
      React.createElement('h1', null, 'Minka DMT Web Explorer'),
      React.createElement('p', null, 'Explore your marine survey data with powerful filtering and SQL queries!')
    ),

    React.createElement(DatabaseSelector, {
      dbClient: dbClient,
      onDatabaseConnected: handleDatabaseConnected,
      onDatabaseDisconnected: handleDatabaseDisconnected
    }),

    React.createElement(SchemasDisplay, { schemas: schemas }),

    error && React.createElement('div', { className: 'error' },
      React.createElement('strong', null, 'Error: '), error
    ),

    showSqlEditor && React.createElement(SqlEditor, {
      onExecute: handleSqlExecute,
      loading: loading
    }),

    tables.length > 0 && React.createElement('div', { className: 'tables-grid' },
      tables.map((table) =>
        React.createElement(TableCard, {
          key: `${table.table_schema}.${table.table_name}`,
          table: table,
          isSelected: selectedTable?.table_name === table.table_name &&
            selectedTable?.table_schema === table.table_schema,
          onClick: () => handleTableSelect(table)
        })
      )
    ),

    tables.length === 0 && dbClient && React.createElement('div', { className: 'empty-state' },
      React.createElement('h3', null, 'No Database Connected'),
      React.createElement('p', null, 'Please connect to a DuckDB database to view tables and data')
    ),

    React.createElement(DataViewer, {
      selectedTable: selectedTable,
      tableData: tableData,
      tableColumns: tableColumns,
      selectedColumns: selectedColumns,
      filters: filters,
      searchTerm: searchTerm,
      sortBy: sortBy,
      sortOrder: sortOrder,
      currentPage: currentPage,
      pageSize: pageSize,
      loading: loading,
      onSearch: handleSearch,
      onSort: handleSort,
      onPageChange: handlePageChange,
      onColumnToggle: handleColumnToggle,
      onSelectAllColumns: handleSelectAllColumns,
      onSelectNoneColumns: handleSelectNoneColumns,
      onAddFilter: handleAddFilter,
      onRemoveFilter: handleRemoveFilter,
      onClearFilters: handleClearFilters,
      onExportCSV: handleExportCSV,
      showSqlEditor: showSqlEditor,
      onToggleSqlEditor: handleToggleSqlEditor,
      showColumnSelector: showColumnSelector,
      showFilterPanel: showFilterPanel,
      onToggleColumnSelector: handleToggleColumnSelector,
      onToggleFilterPanel: handleToggleFilterPanel
    }),

    queryData && React.createElement('div', { className: 'data-viewer' },
      React.createElement('div', { className: 'data-header' },
        React.createElement('div', { className: 'data-title' }, 'Query Results'),
        React.createElement('button', {
          className: 'btn btn-secondary',
          onClick: () => {
            setQueryData(null);
            setShowSqlEditor(false);
          }
        }, 'Clear Results')
      ),

      React.createElement('div', { className: 'data-table-container' },
        React.createElement('table', { className: 'data-table' },
          React.createElement('thead', null,
            React.createElement('tr', null,
              queryData.columns.map((col, index) =>
                React.createElement('th', { key: index }, col)
              )
            )
          ),
          React.createElement('tbody', null,
            queryData.data.map((row, rowIndex) =>
              React.createElement('tr', { key: rowIndex },
                queryData.columns.map((col, colIndex) =>
                  React.createElement('td', { key: colIndex },
                    row[col] !== null && row[col] !== undefined
                      ? (col.toLowerCase().includes('temperature') && typeof row[col] === 'number' && row[col] % 1 === 0
                          ? row[col].toFixed(1)
                          : String(row[col]))
                      : React.createElement('span', {
                        style: { color: '#9ca3af' }
                      }, 'null')
                  )
                )
              )
            )
          )
        )
      ),

      React.createElement('div', {
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '20px',
          paddingTop: '20px',
          borderTop: '1px solid #e5e7eb'
        }
      },
        React.createElement('div', {
          style: { color: '#6b7280', fontSize: '0.9rem' }
        },
          `${queryData.data.length} rows returned`,
          queryData.limited && ' (limited)'
        )
      )
    )
  );
}

// Render the app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));