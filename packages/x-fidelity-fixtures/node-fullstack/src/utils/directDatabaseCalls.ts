// Second file to trigger noDatabases-iterative rule
// Contains different database access patterns than database.js

import { EventEmitter } from 'events';

// Direct database imports - triggers noDatabases rule
// Note: These don't need to be installed, just referenced in code
const oracleDB = require('oracle');
const postgresClient = require('postgres');  
const mongoClient = require('mongodb');

export class DirectDatabaseService extends EventEmitter {
  private connectionPool: any;
  
  constructor() {
    super();
    this.connectionPool = null;
  }

  // Oracle database operations
  async connectOracle() {
    console.log('Establishing Oracle connection...');
    this.connectionPool = await oracleDB.getConnection({
      user: 'system',
      password: process.env.ORACLE_PASSWORD,
      connectString: 'localhost:1521/XE'
    });
    return this.connectionPool;
  }

  async queryOracle(sql: string) {
    const connection = await this.connectOracle();
    return await connection.execute(sql);
  }

  // PostgreSQL database operations  
  async connectPostgres() {
    console.log('Setting up Postgres connection...');
    const postgres = require('postgres');
    const sql = postgres({
      host: 'localhost',
      port: 5432,
      database: 'testdb',
      username: 'postgres',
      password: process.env.POSTGRES_PASSWORD
    });
    return sql;
  }

  async queryPostgres(query: string) {
    const sql = await this.connectPostgres();
    return await sql`${query}`;
  }

  // MongoDB database operations
  async connectMongodb() {
    console.log('Initializing MongoDB connection...');
    const mongodb = require('mongodb');
    const client = new mongodb.MongoClient(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    await client.connect();
    return client.db('testdb');
  }

  async queryMongodb(collection: string, filter: any) {
    const db = await this.connectMongodb();
    return await db.collection(collection).find(filter).toArray();
  }

  // Method that uses all database types
  async syncAllDatabases() {
    console.log('Syncing data across all database systems...');
    
    // Multiple database calls in sequence
    const oracleData = await this.queryOracle('SELECT * FROM users');
    const postgresData = await this.queryPostgres('SELECT * FROM products');
    const mongoData = await this.queryMongodb('orders', {});
    
    return {
      oracle: oracleData,
      postgres: postgresData,
      mongodb: mongoData
    };
  }
}

// Utility functions that also violate the rule
export const createOracleConnection = () => {
  const oracle = require('oracle');
  return oracle.createConnection();
};

export const createPostgresPool = () => {
  const postgres = require('postgres');
  return postgres('postgres://localhost/db');
};

export const createMongoClient = () => {
  const mongodb = require('mongodb');
  return new mongodb.MongoClient('mongodb://localhost:27017');
};

export default DirectDatabaseService; 