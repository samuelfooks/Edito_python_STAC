// FastAPI Backend Client - replaces DuckDB WASM
export class FastAPIClient {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
    this.currentDataSource = null;
    this.currentDataType = null;
    this.logger = console;
  }

  // Utility function to convert BigInt to number (for compatibility)
  convertBigInt(value) {
    return typeof value === 'bigint' ? Number(value) : value;
  }

  async init() {
    // No initialization needed for FastAPI backend
    return true;
  }

  async connectToDatabase(url, dataType = null) {
    try {
      const response = await fetch(`${this.baseUrl}/api/load-data-source`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), data_type: dataType })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to connect');
      }

      const data = await response.json();
      this.currentDataSource = data.url;
      this.currentDataType = data.type;
      this.logger.log(`Connected to data source: ${data.url} (${data.type})`);
      return true;
    } catch (error) {
      this.logger.error('Failed to connect to database:', error);
      throw error;
    }
  }

  async connectToLocalFile(file) {
    // FastAPI backend doesn't support local file uploads directly
    // Would need to implement file upload endpoint or use URL
    throw new Error('Local file uploads not supported. Please use a URL to the data source.');
  }

  async getSchemas() {
    // For FastAPI backend, we return a virtual schema based on data type
    if (this.currentDataType === 'parquet') {
      return [{ schema_name: 'parquet' }];
    } else if (this.currentDataType === 'duckdb') {
      return [{ schema_name: 'main' }];
    }
    return [{ schema_name: 'parquet' }];
  }

  async getTables() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tables`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to get tables');
      }
      const data = await response.json();
      return data.tables || [];
    } catch (error) {
      this.logger.error('Failed to get tables:', error);
      throw error;
    }
  }

  async getTableColumns(schema, table) {
    try {
      const params = new URLSearchParams();
      if (schema) params.append('schema', schema);
      if (table) params.append('table', table);
      
      const response = await fetch(`${this.baseUrl}/api/table-columns?${params}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to get columns');
      }
      const data = await response.json();
      return data.columns || [];
    } catch (error) {
      this.logger.error('Failed to get table columns:', error);
      throw error;
    }
  }

  async getTableData(schema, table, options = {}) {
    try {
      const {
        limit = 1000,
        offset = 0,
        search = '',
        sortBy = null,
        sortOrder = 'asc',
        columns = null,
        filters = []
      } = options;

      const response = await fetch(`${this.baseUrl}/api/table-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schema: schema,
          table: table,
          columns: columns,
          filters: filters,
          search: search,
          sort_by: sortBy,
          sort_order: sortOrder,
          limit: limit,
          offset: offset
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to get table data');
      }

      const data = await response.json();
      
      // Convert to format expected by viewerapp
      return {
        data: data.data || [],
        columns: data.columns || [],
        total_rows: data.total_rows || 0,
        returned_rows: data.returned_rows || 0,
        limited: data.has_more || false
      };
    } catch (error) {
      this.logger.error('Failed to get table data:', error);
      throw error;
    }
  }

  async executeQuery(sql, limit = 1000) {
    try {
      const response = await fetch(`${this.baseUrl}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql, limit })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || error.error || 'Query failed');
      }

      const data = await response.json();
      
      // Convert to format expected by viewerapp
      return {
        data: data.data || [],
        columns: data.columns || [],
        total_rows: data.row_count || 0,
        limited: data.row_count >= limit
      };
    } catch (error) {
      this.logger.error('Failed to execute query:', error);
      throw error;
    }
  }

  async exportToCSV(schema, table, options = {}) {
    try {
      // Use the table-data endpoint to get all data, then convert to CSV client-side
      // This is simpler than building complex SQL queries
      const {
        search = '',
        sortBy = null,
        sortOrder = 'asc',
        columns = null,
        filters = []
      } = options;

      // Fetch all data (with a reasonable limit for export)
      const data = await this.getTableData(schema, table, {
        limit: 100000, // Max 100k rows for export
        offset: 0,
        search,
        sortBy,
        sortOrder,
        columns,
        filters
      });

      // Convert to CSV
      if (!data.columns || data.columns.length === 0) {
        throw new Error('No columns to export');
      }

      const csvRows = [];
      // Header row
      csvRows.push(data.columns.map(col => {
        const str = String(col);
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      }).join(','));

      // Data rows
      for (const row of data.data) {
        const csvRow = data.columns.map(col => {
          const value = row[col];
          if (value === null || value === undefined) return '';
          const str = String(value);
          return str.includes(',') || str.includes('"') || str.includes('\n')
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        }).join(',');
        csvRows.push(csvRow);
      }

      return csvRows.join('\n');
    } catch (error) {
      this.logger.error('Failed to export CSV:', error);
      throw error;
    }
  }

  async getFastMetadata(schema, table) {
    try {
      const params = new URLSearchParams();
      if (schema) params.append('schema', schema);
      if (table) params.append('table', table);
      
      const response = await fetch(`${this.baseUrl}/api/fast-metadata?${params}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to get fast metadata');
      }
      const data = await response.json();
      return {
        columns: data.columns || [],
        total_rows: data.total_rows || 0,
        query_time: data.query_time || 0
      };
    } catch (error) {
      this.logger.error('Failed to get fast metadata:', error);
      throw error;
    }
  }

  async getSampleQueries() {
    try {
      const response = await fetch(`${this.baseUrl}/api/examples`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to get sample queries');
      }
      const data = await response.json();
      return data.examples || [];
    } catch (error) {
      this.logger.error('Failed to get sample queries:', error);
      throw error;
    }
  }

  dispose() {
    // Nothing to dispose for FastAPI client
  }
}

// Make FastAPIClient available globally
window.FastAPIClient = FastAPIClient;

