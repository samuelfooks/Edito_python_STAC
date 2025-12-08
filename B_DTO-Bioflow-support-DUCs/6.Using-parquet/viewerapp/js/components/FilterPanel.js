// Filter Panel Component
export function FilterPanel({
    columns,
    filters,
    onAddFilter,
    onRemoveFilter,
    onClearFilters
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
        React.createElement('h4', { style: { marginBottom: '12px', color: '#0f172a' } }, 'Filters'),

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
    );
}
