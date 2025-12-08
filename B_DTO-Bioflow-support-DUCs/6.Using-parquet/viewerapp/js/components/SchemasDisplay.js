// Schemas Display Component
export function SchemasDisplay({ schemas }) {
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
