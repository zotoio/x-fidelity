// Intentionally problematic database utility
// This file contains multiple violations:
// 1. Direct database connections (noDatabases rule)
// 2. Sensitive data logging (sensitiveLogging rule)

// Note: These require() calls will trigger the noDatabases rule
// even without the packages being installed
class DatabaseManager {
  constructor() {
    // Sensitive configuration exposed - triggers sensitiveLogging rule
    this.config = {
      api_key: 'live-api-key-12345',
      auth_token: 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9',
      access_token: 'gho_16C7e42F292c6912E7710c838347Ae178B4a',
      secret_key: 'production-secret-key',
      private_key: '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKC...',
      ssh_key: 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQ...',
      jwt_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      oauth_token: 'ya29.A0ARrdaM-2xK8H9D7f...',
      db_password: 'super-secret-db-password-2023',
      aws_access_key_id: 'AKIAIOSFODNN7EXAMPLE',
      aws_secret_access_key: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
    };
  }

  // Direct Oracle connection - triggers noDatabases rule
  async connectToOracle() {
    console.log('Connecting to Oracle with credentials:', this.config);
    
    // This require() call will be detected by the noDatabases rule
    const oracle = require('oracle');
    
    const connection = await oracle.createConnection({
      user: 'admin',
      password: this.config.db_password,  // Sensitive data exposure
      connectString: 'localhost:1521/xe'
    });
    
    console.log('Oracle connection established with api_key:', this.config.api_key);
    return connection;
  }

  // Direct PostgreSQL connection - triggers noDatabases rule  
  async connectToPostgres() {
    console.log('Setting up postgres connection...');
    console.log('Using auth_token for postgres:', this.config.auth_token);
    
    // This require() call will be detected by the noDatabases rule
    const postgres = require('postgres');
    const sql = postgres('postgres://username:password@localhost:5432/database');
    
    console.log('Postgres connected with secret_key:', this.config.secret_key);
    return sql;
  }

  // Direct MongoDB connection - triggers noDatabases rule
  async connectToMongodb() {
    console.log('Initializing mongodb connection...');
    console.log('MongoDB auth using private_key:', this.config.private_key);
    
    // This require() call will be detected by the noDatabases rule
    const mongodb = require('mongodb');
    const client = new mongodb.MongoClient('mongodb://localhost:27017', {
      auth: {
        username: 'admin',
        password: this.config.db_password
      }
    });
    
    await client.connect();
    console.log('MongoDB connected with jwt_token:', this.config.jwt_token);
    return client;
  }

  // Method that logs all sensitive data at once
  logSensitiveData() {
    console.log('=== SENSITIVE DATA DUMP (NEVER DO THIS!) ===');
    console.log('API Key:', this.config.api_key);
    console.log('Auth Token:', this.config.auth_token);
    console.log('Access Token:', this.config.access_token);
    console.log('Secret Key:', this.config.secret_key);
    console.log('Private Key:', this.config.private_key);
    console.log('SSH Key:', this.config.ssh_key);
    console.log('JWT Token:', this.config.jwt_token);
    console.log('OAuth Token:', this.config.oauth_token);
    console.log('DB Password:', this.config.db_password);
    console.log('AWS Access Key ID:', this.config.aws_access_key_id);
    console.log('AWS Secret Access Key:', this.config.aws_secret_access_key);
    console.log('=== END SENSITIVE DATA DUMP ===');
  }

  // Initialize all database connections - multiple rule violations
  async initializeAll() {
    console.log('Starting database initialization with sensitive credentials...');
    
    // All of these should trigger noDatabases rule
    await this.connectToOracle();
    await this.connectToPostgres();
    await this.connectToMongodb();
    
    // This should trigger multiple sensitiveLogging violations
    this.logSensitiveData();
    
    console.log('All databases connected using production secrets!');
  }
}

module.exports = DatabaseManager; 