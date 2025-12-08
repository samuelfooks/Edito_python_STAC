// Column Selector Component
export function ColumnSelector({
    columns,
    selectedColumns,
    onColumnToggle,
    onSelectAll,
    onSelectNone
}) {
    if (!columns || columns.length === 0) {
        return null;
    }

    const allSelected = selectedColumns.length === columns.length;
    const noneSelected = selectedColumns.length === 0;

    return React.createElement('div', { className: 'column-selector' },
        React.createElement('h4', { style: { marginBottom: '12px', color: '#0f172a' } }, 'Columns'),

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
    );
}
