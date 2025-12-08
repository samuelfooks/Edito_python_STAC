// Database Selector Component
export function DatabaseSelector({ dbClient, onDatabaseConnected, onDatabaseDisconnected }) {
    const [dbPath, setDbPath] = React.useState('');
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
                'Connect to a DuckDB database by selecting a local file or entering a URL:'
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
                style: { display: 'flex', gap: '8px', alignItems: 'center' }
            },
                React.createElement('input', {
                    type: 'text',
                    className: 'search-box',
                    placeholder: 'Enter URL (e.g., https://s3.../file.duckdb)',
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
                    '✓ Connected to Database'
                ),
                React.createElement('button', {
                    className: 'btn btn-secondary',
                    onClick: handleDisconnect
                }, 'Disconnect')
            )
        )
    );
}
