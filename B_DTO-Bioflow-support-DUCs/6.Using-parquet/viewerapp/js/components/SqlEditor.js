// SQL Editor Component
export function SqlEditor({ onExecute, loading }) {
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
