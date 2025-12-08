// Data Viewer Component
export function DataViewer({
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
    onToggleSqlEditor
}) {
    if (!selectedTable) {
        return null;
    }

    const currentData = tableData;
    const currentColumns = currentData?.columns || [];

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
                onSelectNone: onSelectNoneColumns
            }),

            React.createElement(FilterPanel, {
                columns: tableColumns,
                filters: filters,
                onAddFilter: onAddFilter,
                onRemoveFilter: onRemoveFilter,
                onClearFilters: onClearFilters
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
                    columns.map((col, index) =>
                        React.createElement('th', {
                            key: index,
                            className: sortBy === col ? 'sorted' : '',
                            onClick: () => onSort(col),
                            style: { cursor: 'pointer' }
                        },
                            col,
                            sortBy === col && React.createElement('span', {
                                className: 'sort-indicator'
                            }, sortOrder === 'asc' ? '↑' : '↓')
                        )
                    )
                )
            ),
            React.createElement('tbody', null,
                data.map((row, rowIndex) =>
                    React.createElement('tr', { key: rowIndex },
                        columns.map((col, colIndex) =>
                            React.createElement('td', { key: colIndex },
                                row[col] !== null && row[col] !== undefined
                                    ? String(row[col])
                                    : React.createElement('span', {
                                        style: { color: '#9ca3af' }
                                    }, 'null')
                            )
                        )
                    )
                )
            )
        )
    );
}
