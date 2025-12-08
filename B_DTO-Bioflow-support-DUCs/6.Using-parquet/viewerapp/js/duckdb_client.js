// DuckDB WASM Client with enhanced filtering support
export class DuckDBWasmClient {
  constructor() {
    this.db = null;
    this.conn = null;
    this.workerUrl = null;
    this.currentDatabase = null;
    this.currentParquetFile = null;
    this.logger = console;
  }

  // Utility function to convert BigInt to number
  convertBigInt(value) {
    return typeof value === 'bigint' ? Number(value) : value;
  }

  async init() {
    try {
      // Import DuckDB WASM
      const duckdb = await import('https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@1.30.0/dist/duckdb-browser.mjs');

      // Store duckdb reference for later use
      this.duckdb = duckdb;

      // Detect COI
      const coi = self.crossOriginIsolated === true;

      // Select bundle
      const bundles = duckdb.getJsDelivrBundles();
      const bundle = await duckdb.selectBundle(bundles);
      this.logger.log('Selected bundle: ' + (bundle?.bundleName || 'unknown'));

      // Create worker
      this.workerUrl = URL.createObjectURL(new Blob([`importScripts("${bundle.mainWorker}");`], { type: 'text/javascript' }));
      const worker = new Worker(this.workerUrl);

      // Initialize DuckDB
      const logger = new duckdb.ConsoleLogger();
      this.db = new duckdb.AsyncDuckDB(logger, worker);
      await this.db.instantiate(bundle.mainModule, bundle.pthreadWorker);
      this.logger.log('DuckDB-WASM instantiated.');

      // Get connection
      this.conn = await this.db.connect();
      return true;
    } catch (error) {
      this.logger.error('Failed to initialize DuckDB WASM:', error);
      return false;
    }
  }

  async connectToDatabase(dbPath) {
    try {
      if (dbPath.startsWith('http://') || dbPath.startsWith('https://') || dbPath.startsWith('s3://')) {
        // S3 or HTTP URL
        const fileName = dbPath.split('/').pop() || 'remote.duckdb';
        this.logger.log(`Registering remote file: ${fileName} from ${dbPath}`);

        // Register the remote file - use HTTP protocol
        await this.db.registerFileURL(fileName, dbPath, this.duckdb.DuckDBDataProtocol.HTTP, true);
        this.logger.log(`File registered successfully`);

        if (fileName.toLowerCase().endsWith('.duckdb')) {
          // For DuckDB files, try to attach without READ_ONLY first
          try {
            await this.conn.query(`ATTACH '${fileName}' AS remote_db`);
            this.logger.log(`Database attached as remote_db`);
          } catch (error) {
            // If that fails, try with READ_ONLY
            this.logger.log(`Retrying with READ_ONLY mode: ${error.message}`);
            await this.conn.query(`ATTACH '${fileName}' AS remote_db (READ_ONLY)`);
            this.logger.log(`Database attached as remote_db (READ_ONLY)`);
          }
          this.currentDatabase = 'remote_db';
          this.currentParquetFile = null;
          this.logger.log(`Connected to remote database: ${dbPath}`);
        } else if (fileName.toLowerCase().endsWith('.parquet')) {
          // For remote Parquet files, set up similar to local parquet
          this.currentDatabase = null;
          this.currentParquetFile = fileName;
          this.logger.log(`Registered remote Parquet file: ${fileName}`);
        } else {
          // For other remote file types (CSV, JSON, etc.)
          this.currentDatabase = null;
          this.currentParquetFile = null;
          this.logger.log(`Registered remote file: ${fileName}`);
        }
      } else {
        // Local file - we need to handle this through file input
        throw new Error('Local files must be selected through file input');
      }
      return true;
    } catch (error) {
      this.logger.error('Failed to connect to database:', error);
      throw error;
    }
  }

  async connectToLocalFile(file) {
    try {
      const fileName = file.name;
      const buffer = new Uint8Array(await file.arrayBuffer());
      await this.db.registerFileBuffer(fileName, buffer);

      if (fileName.toLowerCase().endsWith('.duckdb')) {
        const alias = fileName.replace(/\.duckdb$/i, '').replace(/[^a-zA-Z0-9_]/g, '_') || 'local_db';
        try {
          await this.conn.query(`ATTACH '${fileName}' AS ${alias}`);
          this.logger.log(`Database attached as ${alias}`);
        } catch (error) {
          // Try with READ_ONLY if normal attach fails
          this.logger.log(`Retrying with READ_ONLY mode: ${error.message}`);
          await this.conn.query(`ATTACH '${fileName}' AS ${alias} (READ_ONLY)`);
          this.logger.log(`Database attached as ${alias} (READ_ONLY)`);
        }
        this.currentDatabase = alias;
        this.currentParquetFile = null;
        this.logger.log(`Connected to local database: ${fileName}`);
      } else if (fileName.toLowerCase().endsWith('.parquet')) {
        // For Parquet files, set up a virtual table
        this.currentDatabase = null;
        this.currentParquetFile = fileName;
        this.logger.log(`Registered Parquet file: ${fileName}`);
      } else {
        // For other file types (CSV, JSON, etc.), we can query directly
        this.currentDatabase = null;
        this.currentParquetFile = null;
        this.logger.log(`Registered file: ${fileName}`);
      }
      return true;
    } catch (error) {
      this.logger.error('Failed to connect to local file:', error);
      throw error;
    }
  }

  async getSchemas() {
    try {
      if (this.currentParquetFile) {
        // For Parquet files, return a virtual schema
        return [{ schema_name: 'parquet' }];
      }

      // Get schemas that have tables with actual data (non-zero row counts)
      const schemasResult = await this.conn.query(`
                SELECT DISTINCT t.table_schema as schema_name
                FROM information_schema.tables t
                WHERE t.table_schema NOT IN ('information_schema', 'pg_catalog')
                AND t.table_type = 'BASE TABLE'
                ORDER BY t.table_schema
            `);
      const schemas = schemasResult.toArray();
      this.logger.log('Available schemas with tables:', schemas);
      return schemas;
    } catch (error) {
      this.logger.error('Failed to get schemas:', error);
      throw error;
    }
  }

  async getTables() {
    try {
      if (this.currentParquetFile) {
        // For Parquet files, create a virtual table entry
        try {
          const countResult = await this.conn.query(`SELECT COUNT(*) as count FROM '${this.currentParquetFile}'`);
          const count = countResult.toArray()[0].count;
          const rowCount = this.convertBigInt(count);

          // Get column count
          const columnsResult = await this.conn.query(`DESCRIBE SELECT * FROM '${this.currentParquetFile}' LIMIT 1`);
          const columnCount = columnsResult.toArray().length;

          const tableName = this.currentParquetFile.replace(/\.[^/.]+$/, "");
          return [{
            table_schema: 'parquet',
            table_name: tableName,
            column_count: columnCount,
            rows: rowCount
          }];
        } catch (error) {
          this.logger.error('Failed to analyze Parquet file:', error);
          throw error;
        }
      }

      // Get all tables from all schemas, not just the attached one
      const query = `
                SELECT table_schema, table_name, 
                       (SELECT COUNT(*) FROM information_schema.columns 
                        WHERE table_schema = t.table_schema AND table_name = t.table_name) as column_count
                FROM information_schema.tables t
                WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
                ORDER BY table_schema, table_name
            `;

      this.logger.log('Executing query:', query);
      const result = await this.conn.query(query);
      const tables = result.toArray();
      this.logger.log('Found tables:', tables);

      // Get row counts for each table - use proper schema qualification
      const tablesWithCounts = await Promise.all(tables.map(async (table) => {
        try {
          // If we have a current database (attached), prefix the schema
          let countQuery;
          if (this.currentDatabase) {
            countQuery = `SELECT COUNT(*) as count FROM "${this.currentDatabase}"."${table.table_schema}"."${table.table_name}"`;
          } else {
            countQuery = `SELECT COUNT(*) as count FROM "${table.table_schema}"."${table.table_name}"`;
          }
          const countResult = await this.conn.query(countQuery);
          const count = countResult.toArray()[0].count;
          const rowCount = this.convertBigInt(count);
          return { ...table, rows: rowCount };
        } catch (error) {
          this.logger.error(`Failed to get count for ${table.table_schema}.${table.table_name}:`, error);
          return { ...table, rows: 0 };
        }
      }));

      return tablesWithCounts;
    } catch (error) {
      this.logger.error('Failed to get tables:', error);
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


      // Use proper schema-qualified table name with database prefix if attached
      let fullTableName;
      if (this.currentParquetFile && schema === 'parquet') {
        fullTableName = `'${this.currentParquetFile}'`;
      } else if (this.currentDatabase) {
        fullTableName = `"${this.currentDatabase}"."${schema}"."${table}"`;
      } else {
        fullTableName = `"${schema}"."${table}"`;
      }
      this.logger.log(`Getting data from table: ${fullTableName}`);

      let selectClause = '*';
      if (columns && columns.length > 0) {
        selectClause = columns.map(col => `"${col}"`).join(', ');
      }

      // Build WHERE clause
      const whereConditions = [];

      // Add search conditions
      if (search) {
        // Get all columns for search
        let columnsResult;
        if (this.currentParquetFile && schema === 'parquet') {
          columnsResult = await this.conn.query(`DESCRIBE SELECT * FROM '${this.currentParquetFile}' LIMIT 1`);
        } else {
          columnsResult = await this.conn.query(`
                      SELECT column_name FROM information_schema.columns 
                      WHERE table_schema = '${schema}' AND table_name = '${table}'
                  `);
        }
        const allColumns = columnsResult.toArray().map(row =>
          this.currentParquetFile && schema === 'parquet' ? row.column_name : row.column_name
        );

        const searchConditions = allColumns.map(col =>
          `CAST("${col}" AS VARCHAR) ILIKE '%${search}%'`
        );
        whereConditions.push(`(${searchConditions.join(' OR ')})`);
      }

      // Add custom filter conditions
      if (filters && filters.length > 0) {
        for (const filter of filters) {
          const { column, operator, value } = filter;
          if (column && operator && value !== null && value !== undefined && value !== '') {
            // Validate column exists
            let columnsResult;
            if (this.currentParquetFile && schema === 'parquet') {
              columnsResult = await this.conn.query(`DESCRIBE SELECT * FROM '${this.currentParquetFile}' LIMIT 1`);
            } else {
              columnsResult = await this.conn.query(`
                              SELECT column_name FROM information_schema.columns 
                              WHERE table_schema = '${schema}' AND table_name = '${table}'
                          `);
            }
            const validColumns = columnsResult.toArray().map(row => row.column_name);

            if (validColumns.includes(column)) {
              let condition;
              if (operator === 'LIKE' || operator === 'NOT LIKE') {
                condition = `"${column}" ${operator} '%${value}%'`;
              } else if (operator === '=' || operator === '!=') {
                // Handle string vs numeric values
                const isNumeric = !isNaN(value) && !isNaN(parseFloat(value));
                const formattedValue = isNumeric ? value : `'${value.replace(/'/g, "''")}'`;
                condition = `"${column}" ${operator} ${formattedValue}`;
              } else {
                // For comparison operators, assume numeric
                condition = `"${column}" ${operator} ${value}`;
              }
              whereConditions.push(condition);
            }
          }
        }
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      let orderClause = '';
      if (sortBy) {
        orderClause = `ORDER BY "${sortBy}" ${sortOrder.toUpperCase()}`;
      }

      const query = `
                SELECT ${selectClause} FROM ${fullTableName} 
                ${whereClause} 
                ${orderClause}
                LIMIT ${limit} OFFSET ${offset}
            `;

      this.logger.log(`Executing query: ${query}`);
      const result = await this.conn.query(query);
      const data = result.toArray();
      this.logger.log(`Retrieved ${data.length} rows`);

      // Get total count - avoid expensive COUNT on large Parquet files
      let totalRows;

      if (this.currentParquetFile) {
        // For Parquet files, try to use metadata for efficient counting
        try {
          const countQuery = `SELECT COUNT(*) as count FROM ${fullTableName} ${whereClause}`;
          const countResult = await this.conn.query(countQuery);
          const count = countResult.toArray()[0].count;
          totalRows = this.convertBigInt(count);
        } catch (countError) {
          this.logger.error('Count query failed, using data length as estimate:', countError.message);
          totalRows = data.length;
        }
      } else {
        // For small results or non-Parquet files, do the actual count
        try {
          const countQuery = `SELECT COUNT(*) as count FROM ${fullTableName} ${whereClause}`;
          const countResult = await this.conn.query(countQuery);
          const count = countResult.toArray()[0].count;
          totalRows = this.convertBigInt(count);
        } catch (countError) {
          this.logger.error('Count query failed, using data length as estimate:', countError.message);
          totalRows = data.length;
        }
      }

      return {
        data,
        columns: result.schema.fields.map(field => field.name),
        total_rows: totalRows,
        limited: data.length >= limit
      };
    } catch (error) {
      this.logger.error('Failed to get table data:', error);
      throw error;
    }
  }

  async executeQuery(sql, limit = 1000) {
    try {
      let query = sql.trim();
      if (!query.toUpperCase().startsWith('SELECT')) {
        throw new Error('Only SELECT queries are allowed');
      }

      if (!query.toUpperCase().includes('LIMIT')) {
        query += ` LIMIT ${limit}`;
      }

      const result = await this.conn.query(query);
      const data = result.toArray();

      return {
        data,
        columns: result.schema.fields.map(field => field.name),
        total_rows: data.length,
        limited: data.length >= limit
      };
    } catch (error) {
      this.logger.error('Failed to execute query:', error);
      throw error;
    }
  }

  async getTableColumns(schema, table) {
    try {
      if (this.currentParquetFile && schema === 'parquet') {
        // For Parquet files, use DESCRIBE to get column information
        const result = await this.conn.query(`DESCRIBE SELECT * FROM '${this.currentParquetFile}' LIMIT 1`);
        return result.toArray().map(row => ({
          name: row.column_name,
          type: row.column_type,
          nullable: true, // Parquet doesn't provide nullable info through DESCRIBE
          default: null
        }));
      }

      const result = await this.conn.query(`
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_schema = '${schema}' AND table_name = '${table}'
                ORDER BY ordinal_position
            `);

      return result.toArray().map(row => ({
        name: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable === 'YES',
        default: row.column_default
      }));
    } catch (error) {
      this.logger.error('Failed to get table columns:', error);
      throw error;
    }
  }

  async exportToCSV(schema, table, options = {}) {
    try {
      const {
        search = '',
        sortBy = null,
        sortOrder = 'asc',
        columns = null,
        filters = []
      } = options;

      // Use proper schema-qualified table name with database prefix if attached
      let fullTableName;
      if (this.currentParquetFile && schema === 'parquet') {
        fullTableName = `'${this.currentParquetFile}'`;
      } else if (this.currentDatabase) {
        fullTableName = `"${this.currentDatabase}"."${schema}"."${table}"`;
      } else {
        fullTableName = `"${schema}"."${table}"`;
      }

      let selectClause = '*';
      if (columns && columns.length > 0) {
        selectClause = columns.map(col => `"${col}"`).join(', ');
      }

      // Build WHERE clause (same logic as getTableData)
      const whereConditions = [];

      if (search) {
        let columnsResult;
        if (this.currentParquetFile && schema === 'parquet') {
          columnsResult = await this.conn.query(`DESCRIBE SELECT * FROM '${this.currentParquetFile}' LIMIT 1`);
        } else {
          columnsResult = await this.conn.query(`
                      SELECT column_name FROM information_schema.columns 
                      WHERE table_schema = '${schema}' AND table_name = '${table}'
                  `);
        }
        const allColumns = columnsResult.toArray().map(row => row.column_name);

        const searchConditions = allColumns.map(col =>
          `CAST("${col}" AS VARCHAR) ILIKE '%${search}%'`
        );
        whereConditions.push(`(${searchConditions.join(' OR ')})`);
      }

      if (filters && filters.length > 0) {
        for (const filter of filters) {
          const { column, operator, value } = filter;
          if (column && operator && value !== null && value !== undefined && value !== '') {
            let columnsResult;
            if (this.currentParquetFile && schema === 'parquet') {
              columnsResult = await this.conn.query(`DESCRIBE SELECT * FROM '${this.currentParquetFile}' LIMIT 1`);
            } else {
              columnsResult = await this.conn.query(`
                              SELECT column_name FROM information_schema.columns 
                              WHERE table_schema = '${schema}' AND table_name = '${table}'
                          `);
            }
            const validColumns = columnsResult.toArray().map(row => row.column_name);

            if (validColumns.includes(column)) {
              let condition;
              if (operator === 'LIKE' || operator === 'NOT LIKE') {
                condition = `"${column}" ${operator} '%${value}%'`;
              } else if (operator === '=' || operator === '!=') {
                const isNumeric = !isNaN(value) && !isNaN(parseFloat(value));
                const formattedValue = isNumeric ? value : `'${value.replace(/'/g, "''")}'`;
                condition = `"${column}" ${operator} ${formattedValue}`;
              } else {
                condition = `"${column}" ${operator} ${value}`;
              }
              whereConditions.push(condition);
            }
          }
        }
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      let orderClause = '';
      if (sortBy) {
        orderClause = `ORDER BY "${sortBy}" ${sortOrder.toUpperCase()}`;
      }

      const query = `
                SELECT ${selectClause} FROM ${fullTableName} 
                ${whereClause} 
                ${orderClause}
            `;

      const result = await this.conn.query(query);
      const data = result.toArray();
      const csvColumns = result.schema.fields.map(field => field.name);

      // Convert to CSV
      const csvContent = [
        csvColumns.join(','),
        ...data.map(row =>
          csvColumns.map(col => {
            const value = row[col];
            if (value === null || value === undefined) return '';
            const str = String(value);
            return str.includes(',') || str.includes('"') || str.includes('\n')
              ? `"${str.replace(/"/g, '""')}"`
              : str;
          }).join(',')
        )
      ].join('\n');

      return csvContent;
    } catch (error) {
      this.logger.error('Failed to export CSV:', error);
      throw error;
    }
  }

  dispose() {
    if (this.workerUrl) {
      URL.revokeObjectURL(this.workerUrl);
    }
  }
}

// Make DuckDBWasmClient available globally
window.DuckDBWasmClient = DuckDBWasmClient;