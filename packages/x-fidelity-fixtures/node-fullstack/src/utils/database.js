// Minimal database utility - triggers sensitiveLogging-iterative and noDatabases-iterative
// Contains only 2 specific sensitive data patterns

class DatabaseManager {
  constructor() {
    this.config = {
      keyValue: 'prod-secret-key-2024', 
      passwordValue: 'production_password_2023'
    };
  }

  async connectOracle() {
    try {
      // This triggers noDatabases-iterative rule
      const oracle = require('oracle');
      console.log('Oracle connection established');
      const connection = await oracle.createConnection({
        host: 'localhost',
        user: 'admin',
        password: this.config.passwordValue
      });
      
      return connection;
    } catch (error) {
      console.error('Oracle connection failed');
    }
  }

  async connectPostgres() {
    try {
      console.log('Setting up postgres connection...');
      
      // This triggers noDatabases-iterative rule  
      const postgres = require('postgres');
      return postgres('postgresql://localhost/testdb');
    } catch (error) {
      console.error('Postgres connection failed');
    }
  }

  async connectMongoDB() {
    try {
      console.log('Initializing mongodb connection...');
      
      // This triggers noDatabases-iterative rule
      const mongodb = require('mongodb');
      const client = new mongodb.MongoClient('mongodb://localhost:27017/testdb');
      
      // Only 2 sensitive logging violations in this file
      console.log('MongoDB secret_key:', this.config.keyValue); // Pattern: (api[_-]?key|auth[_-]?token|access[_-]?token|secret[_-]?key)
      console.log('Using db_password for connection'); // Pattern: db[_-]?password
      return client;
    } catch (error) {
      console.error('MongoDB connection failed');
    }
  }
}

module.exports = DatabaseManager; 