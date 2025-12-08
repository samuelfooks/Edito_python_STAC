// Integrated App with Table Explorer and Map Explorer Tabs
// Based on viewerapp/js/app.js but adapted for FastAPI backend
const { useState, useEffect, useCallback } = React;

// Tab Navigation Component
function TabNavigation({ activeTab, onTabChange }) {
  return React.createElement('div', {
    style: {
      display: 'flex',
      gap: '8px',
      borderBottom: '2px solid #e2e8f0',
      marginBottom: '24px',
      paddingBottom: '0'
    }
  },
    React.createElement('button', {
      className: `tab ${activeTab === 'table' ? 'active' : ''}`,
      onClick: () => onTabChange('table'),
      style: {
        padding: '12px 24px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontSize: '1rem',
        fontWeight: '500',
        color: activeTab === 'table' ? '#3b82f6' : '#64748b',
        borderBottom: activeTab === 'table' ? '2px solid #3b82f6' : '2px solid transparent',
        marginBottom: '-2px',
        transition: 'all 0.2s'
      }
    }, 'Table Explorer'),
    React.createElement('button', {
      className: `tab ${activeTab === 'map' ? 'active' : ''}`,
      onClick: () => onTabChange('map'),
      style: {
        padding: '12px 24px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontSize: '1rem',
        fontWeight: '500',
        color: activeTab === 'map' ? '#3b82f6' : '#64748b',
        borderBottom: activeTab === 'map' ? '2px solid #3b82f6' : '2px solid transparent',
        marginBottom: '-2px',
        transition: 'all 0.2s'
      }
    }, 'Map Explorer')
  );
}

// Sample Queries Component
function SampleQueries({ queries, onSelectQuery, loading }) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  if (!queries || queries.length === 0) return null;

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
    React.createElement('div', {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        cursor: 'pointer',
        marginBottom: isExpanded ? '16px' : '0'
      },
      onClick: () => setIsExpanded(!isExpanded)
    },
      React.createElement('h3', {
        style: { margin: 0, color: '#0f172a' }
      }, 'Sample Queries'),
      React.createElement('span', {
        style: {
          fontSize: '1.2rem',
          color: '#64748b',
          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease'
        }
      }, '▼')
    ),
    isExpanded && React.createElement('div', {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '12px'
      }
    },
      queries.map((query, index) =>
        React.createElement('div', {
          key: index,
          style: {
            padding: '12px',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          },
          onMouseEnter: (e) => e.currentTarget.style.background = '#f8fafc',
          onMouseLeave: (e) => e.currentTarget.style.background = 'white',
          onClick: () => onSelectQuery(query.sql)
        },
          React.createElement('div', {
            style: {
              fontWeight: '600',
              color: '#0f172a',
              marginBottom: '4px'
            }
          }, query.name),
          React.createElement('div', {
            style: {
              fontSize: '0.85rem',
              color: '#64748b',
              marginBottom: '8px'
            }
          }, query.description),
          React.createElement('code', {
            style: {
              fontSize: '0.8rem',
              color: '#3b82f6',
              wordBreak: 'break-all'
            }
          }, query.sql)
        )
      )
    )
  );
}

// Database Selector Component (adapted for FastAPI - no local file handling)
function DatabaseSelector({ dbClient, onDatabaseConnected, onDatabaseDisconnected }) {
  const [dbPath, setDbPath] = React.useState('https://s3.waw3-1.cloudferro.com/emodnet/emodnet_biology/12639/marine_biodiversity_observations_2025-09-22.parquet');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [isConnected, setIsConnected] = React.useState(false);

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
        'Connect to a Parquet file or DuckDB database by entering a URL:'
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
        React.createElement('strong', null, 'Connection Error: '), error
      ),

      React.createElement('div', {
        style: { display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }
      },
        React.createElement('input', {
          type: 'text',
          className: 'search-box',
          placeholder: 'Enter URL (e.g., https://s3.../file.parquet or .duckdb)',
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
function SqlEditor({ onExecute, loading, initialSql }) {
  const [sql, setSql] = React.useState(initialSql || 'SELECT * FROM ');
  const [limit, setLimit] = React.useState(1000);

  React.useEffect(() => {
    if (initialSql) {
      setSql(initialSql);
    }
  }, [initialSql]);

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

    isExpanded && React.createElement('div', { 
      className: 'panel-content',
      onClick: (e) => e.stopPropagation()
    },
      React.createElement('div', { 
        className: 'filter-row',
        onClick: (e) => e.stopPropagation()
      },
        React.createElement('select', {
          className: 'filter-select',
          value: newFilter.column,
          onChange: (e) => {
            e.stopPropagation();
            setNewFilter({ ...newFilter, column: e.target.value });
          },
          onClick: (e) => e.stopPropagation()
        },
          React.createElement('option', { value: '' }, 'Select column...'),
          columns.map(col =>
            React.createElement('option', { key: col.name, value: col.name }, col.name)
          )
        ),

        React.createElement('select', {
          className: 'filter-select',
          value: newFilter.operator,
          onChange: (e) => {
            e.stopPropagation();
            setNewFilter({ ...newFilter, operator: e.target.value });
          },
          onClick: (e) => e.stopPropagation()
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
          onChange: (e) => {
            e.stopPropagation();
            setNewFilter({ ...newFilter, value: e.target.value });
          },
          onKeyPress: handleKeyPress,
          onClick: (e) => {
            e.stopPropagation();
            e.target.focus();
          },
          onFocus: (e) => e.stopPropagation(),
          onMouseDown: (e) => e.stopPropagation(),
          style: {
            pointerEvents: 'auto',
            zIndex: 10,
            position: 'relative'
          }
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

// Column Selector Component (with loading indicator)
function ColumnSelector({
  columns,
  selectedColumns,
  onColumnToggle,
  onSelectAll,
  onSelectNone,
  isExpanded,
  onToggle,
  loading
}) {
  if (loading) {
    return React.createElement('div', { className: 'column-selector' },
      React.createElement('div', {
        className: 'panel-header',
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 0'
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
        React.createElement('div', { className: 'loading' }, 'Loading columns...')
      )
    );
  }

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
      }, `Select Columns (${columns.length})`),
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
  columnsLoading,
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
        onToggle: onToggleColumnSelector,
        loading: columnsLoading
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

// Map Viewer Component (inline version)
function MapViewerInline({ dataSource, filters, searchTerm, selectedTable }) {
  const mapRef = React.useRef(null);
  const [loading, setLoading] = React.useState(false);
  const [mapData, setMapData] = React.useState(null);
  const [limit, setLimit] = React.useState(10000);

  const loadMapData = React.useCallback(async () => {
    if (!dataSource || !selectedTable) {
      return; // Don't load if no table selected
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: limit.toString() });
      // Pass filters and search from table explorer - map shows same data
      if (searchTerm) params.append('search', searchTerm);
      if (filters && filters.length > 0) {
        params.append('filters_json', JSON.stringify(filters));
      }

      const response = await fetch(`/api/map-data?${params}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || 'Failed to load map data');
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
  }, [dataSource, selectedTable, limit, filters, searchTerm]);

  // Initialize map when component mounts
  React.useEffect(() => {
    // Wait for Leaflet to be available
    const initMap = async () => {
      // Wait for Leaflet
      let retries = 0;
      while (!window.L && retries < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        retries++;
      }

      if (!window.L) {
        console.error('Leaflet not loaded');
        return;
      }

      if (!mapRef.current) {
        return;
      }

      // Check if map already exists
      if (window.mapInstance) {
        try {
          window.mapInstance.remove();
        } catch (e) {
          // Ignore errors
        }
      }

      // Initialize Leaflet map
      const map = L.map(mapRef.current).setView([51.0, 2.5], 6);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);

      // Store map instance
      window.mapInstance = map;

      // Auto-load map data if dataSource and table are available
      if (dataSource && selectedTable) {
        setTimeout(() => {
          loadMapData();
        }, 500);
      }
    };

    initMap();

    return () => {
      if (window.mapInstance) {
        try {
          window.mapInstance.remove();
          window.mapInstance = null;
        } catch (e) {
          // Ignore errors
        }
      }
    };
  }, []); // Only run once on mount

  // Auto-load map data when filters/search/table changes
  React.useEffect(() => {
    if (dataSource && selectedTable && window.mapInstance && window.L) {
      // Small delay to ensure map is fully initialized
      setTimeout(() => {
        loadMapData();
      }, 500);
    }
  }, [dataSource, selectedTable, filters, searchTerm, loadMapData]);

  return React.createElement('div', { 
    style: { 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      minHeight: '600px'
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
        alignItems: 'center',
        justifyContent: 'space-between'
      }
    },
      React.createElement('div', {
        style: {
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          flexWrap: 'wrap'
        }
      },
        React.createElement('div', {
          style: {
            padding: '8px 12px',
            background: '#f0f9ff',
            borderRadius: '6px',
            fontSize: '0.9rem',
            color: '#0369a1'
          }
        },
          selectedTable 
            ? `Showing map for: ${selectedTable.table_schema}.${selectedTable.table_name}`
            : 'Select a table in Table Explorer to view on map'
        ),
        (filters && filters.length > 0) && React.createElement('div', {
          style: {
            padding: '4px 8px',
            background: '#fef3c7',
            borderRadius: '4px',
            fontSize: '0.85rem',
            color: '#92400e'
          }
        }, `${filters.length} filter${filters.length !== 1 ? 's' : ''} applied`),
        searchTerm && React.createElement('div', {
          style: {
            padding: '4px 8px',
            background: '#fef3c7',
            borderRadius: '4px',
            fontSize: '0.85rem',
            color: '#92400e'
          }
        }, `Search: "${searchTerm}"`)
      ),
      React.createElement('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
        React.createElement('label', { style: { fontWeight: '500', fontSize: '0.9rem' } }, 'Max Points:'),
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
        }),
        React.createElement('button', {
          className: 'btn btn-primary btn-sm',
          onClick: loadMapData,
          disabled: loading || !dataSource || !selectedTable
        }, loading ? 'Loading...' : 'Refresh Map')
      )
    ),

      React.createElement('div', {
        style: {
          position: 'relative',
          flex: 1,
          minHeight: '500px',
          background: '#f8fafc'
        }
      },
        React.createElement('div', {
          ref: mapRef,
          id: 'map-viewer-container',
          style: {
            width: '100%',
            height: '100%',
            minHeight: '500px'
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

// Main App Component
function App() {
  const [dbClient, setDbClient] = useState(null);
  const [isDbInitialized, setIsDbInitialized] = useState(false);
  const [activeTab, setActiveTab] = useState('table');
  const [schemas, setSchemas] = useState([]);
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableData, setTableData] = useState(null);
  const [tableColumns, setTableColumns] = useState([]);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [filters, setFilters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [columnsLoading, setColumnsLoading] = useState(false);
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
  const [currentDataSource, setCurrentDataSource] = useState(null);
  const [sampleQueries, setSampleQueries] = useState([]);
  const [sqlEditorSql, setSqlEditorSql] = useState('SELECT * FROM ');

  // Initialize FastAPI Client
  useEffect(() => {
    const initClient = async () => {
      // Wait for FastAPIClient to be available
      let retries = 0;
      while (!window.FastAPIClient && retries < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        retries++;
      }
      
      if (!window.FastAPIClient) {
        setError('Failed to load FastAPI client. Please refresh the page.');
        return;
      }
      
      const client = new window.FastAPIClient();
      const success = await client.init();
      if (success) {
        setDbClient(client);
        setIsDbInitialized(true);
        
        // Check if already connected
        try {
          const response = await fetch('/api/data-source-info');
          const data = await response.json();
          if (data.url && data.url !== 'Loading...') {
            client.currentDataSource = data.url;
            client.currentDataType = data.type;
            setCurrentDataSource(data.url);
            // Load tables
            const schemasData = await client.getSchemas();
            setSchemas(schemasData);
            const tablesData = await client.getTables();
            setTables(tablesData);
            // Load sample queries
            try {
              const queries = await client.getSampleQueries();
              setSampleQueries(queries);
            } catch (err) {
              console.error('Failed to load sample queries:', err);
            }
          }
        } catch (err) {
          // Ignore errors on initial check
        }
      } else {
        setError('Failed to initialize FastAPI client');
      }
    };
    initClient();
  }, []);

  const loadSchemasAndTables = useCallback(async () => {
    if (!dbClient) return;

    try {
      setLoading(true);
      setError(null);
      const schemasData = await dbClient.getSchemas();
      setSchemas(schemasData);
      const tablesData = await dbClient.getTables();
      setTables(tablesData);
      setCurrentDataSource(dbClient.currentDataSource);
      
      // Load sample queries
      try {
        const queries = await dbClient.getSampleQueries();
        setSampleQueries(queries);
      } catch (err) {
        console.error('Failed to load sample queries:', err);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [dbClient]);

  const handleDatabaseConnected = useCallback(() => {
    loadSchemasAndTables();
    setCurrentDataSource(dbClient?.currentDataSource);
  }, [dbClient, loadSchemasAndTables]);

  const handleDatabaseDisconnected = () => {
    setSchemas([]);
    setTables([]);
    setSelectedTable(null);
    setTableData(null);
    setTableColumns([]);
    setSelectedColumns([]);
    setFilters([]);
    setQueryData(null);
    setCurrentDataSource(null);
    setSampleQueries([]);
  };

  const loadTableColumns = async (table) => {
    if (!dbClient) return;
    
    try {
      setColumnsLoading(true);
      console.log(`Loading columns for table: ${table.table_schema}.${table.table_name}`);
      
      // Try fast metadata first for instant feedback
      try {
        const fastMetadata = await dbClient.getFastMetadata(table.table_schema, table.table_name);
        // Use fast metadata columns temporarily
        const tempColumns = fastMetadata.columns.map(col => ({
          name: col,
          type: 'unknown' // Will be updated when full columns load
        }));
        setTableColumns(tempColumns);
        setSelectedColumns(fastMetadata.columns);
      } catch (err) {
        console.warn('Fast metadata failed, falling back to full column load:', err);
      }
      
      // Load full column details
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
      setError(err.message);
    } finally {
      setColumnsLoading(false);
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
    setTableData(null);
    setTableColumns([]);
    setSelectedColumns([]);
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

  const handleSelectSampleQuery = (sql) => {
    setSqlEditorSql(sql);
    setShowSqlEditor(true);
  };

  if (!isDbInitialized) {
    return React.createElement('div', { className: 'container' },
      React.createElement('div', { className: 'loading' }, 'Initializing...')
    );
  }

  return React.createElement('div', { className: 'container' },
    React.createElement('div', { className: 'header' },
      React.createElement('h1', null, 'Parquet Explorer'),
      React.createElement('p', null, 'Explore your data with powerful filtering, SQL queries, and map visualization!')
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

    currentDataSource && React.createElement(TabNavigation, {
      activeTab: activeTab,
      onTabChange: setActiveTab
    }),

    activeTab === 'table' && React.createElement('div', { className: 'tab-content active' },
      React.createElement(SampleQueries, {
        queries: sampleQueries,
        onSelectQuery: handleSelectSampleQuery,
        loading: loading
      }),

      showSqlEditor && React.createElement(SqlEditor, {
        onExecute: handleSqlExecute,
        loading: loading,
        initialSql: sqlEditorSql
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
        React.createElement('p', null, 'Please connect to a data source to view tables and data')
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
        columnsLoading: columnsLoading,
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
    ),

    activeTab === 'map' && currentDataSource && React.createElement('div', { className: 'tab-content active' },
      !selectedTable ? React.createElement('div', {
        style: {
          padding: '40px',
          textAlign: 'center',
          color: '#64748b'
        }
      },
        React.createElement('h3', null, 'No Table Selected'),
        React.createElement('p', null, 'Please select a table in the Table Explorer tab to view it on the map.')
      ) : React.createElement(MapViewerInline, { 
        dataSource: currentDataSource,
        filters: filters,
        searchTerm: searchTerm,
        selectedTable: selectedTable
      })
    )
  );
}

// Render the app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));
