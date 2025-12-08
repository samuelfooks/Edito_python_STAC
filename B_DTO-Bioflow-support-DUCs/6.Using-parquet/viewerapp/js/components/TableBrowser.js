// Table Browser Component
export function TableBrowser({ tables, selectedTable, onTableSelect }) {
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

// Table Card Component
function TableCard({ table, isSelected, onClick }) {
    return React.createElement('div', {
        className: `table-card ${isSelected ? 'selected' : ''}`,
        onClick: onClick
    },
        React.createElement('div', { className: 'table-name' }, table.table_name),
        React.createElement('div', { className: 'table-schema' }, table.table_schema),
        React.createElement('div', { className: 'table-rows' },
            table.rows.toLocaleString() + ' rows'
        )
    );
}
