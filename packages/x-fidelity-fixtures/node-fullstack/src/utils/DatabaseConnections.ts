// This file contains direct database calls that should trigger the noDatabases rule

import { Pool } from 'pg';
import { MongoClient } from 'mongodb';

// Direct Oracle database connection - should be flagged
export class OracleConnection {
  private connection: any;

  async connect() {
    // Direct oracle connection
    const oracle = require('oracledb');
    this.connection = await oracle.getConnection({
      user: 'hr',
      password: 'welcome',
      connectString: 'localhost/XE'
    });
    
    console.log('Connected to Oracle database');
  }

  async query(sql: string) {
    const result = await this.connection.execute(sql);
    return result.rows;
  }
}

// Direct PostgreSQL database connection - should be flagged  
export class PostgresConnection {
  private pool: Pool;

  constructor() {
    // Direct postgres connection
    this.pool = new Pool({
      user: 'dbuser',
      host: 'localhost',
      database: 'mydb',
      password: 'secretpassword',
      port: 5432,
    });
    
    console.log('Connected to Postgres database');
  }

  async executeQuery(query: string, params: any[] = []) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(query, params);
      return result.rows;
    } finally {
      client.release();
    }
  }
}

// Direct MongoDB database connection - should be flagged
export class MongoConnection {
  private client: MongoClient;
  private db: any;

  async connect() {
    // Direct mongodb connection
    this.client = new MongoClient('mongodb://localhost:27017');
    await this.client.connect();
    this.db = this.client.db('myapp');
    
    console.log('Connected to MongoDB database');
  }

  async findDocuments(collection: string, query: any = {}) {
    const coll = this.db.collection(collection);
    return await coll.find(query).toArray();
  }

  async insertDocument(collection: string, document: any) {
    const coll = this.db.collection(collection);
    return await coll.insertOne(document);
  }
}

// Service that uses multiple database types
export class MultiDatabaseService {
  private oracleConn: OracleConnection;
  private postgresConn: PostgresConnection;
  private mongoConn: MongoConnection;

  constructor() {
    this.oracleConn = new OracleConnection();
    this.postgresConn = new PostgresConnection();
    this.mongoConn = new MongoConnection();
  }

  async initializeConnections() {
    await this.oracleConn.connect();
    await this.mongoConn.connect();
    console.log('All database connections initialized');
  }

  async getUserData(userId: string) {
    // Mixed database queries
    const oracleUserData = await this.oracleConn.query(
      `SELECT * FROM users WHERE id = '${userId}'`
    );
    
    const postgresUserPrefs = await this.postgresConn.executeQuery(
      'SELECT * FROM user_preferences WHERE user_id = $1',
      [userId]
    );
    
    const mongoUserActivity = await this.mongoConn.findDocuments(
      'user_activity',
      { userId: userId }
    );

    return {
      userData: oracleUserData,
      preferences: postgresUserPrefs,
      activity: mongoUserActivity
    };
  }
}

// Legacy database utility functions
export const legacyDbUtils = {
  // Direct oracle usage
  async queryOracle(sql: string) {
    const oracle = require('oracledb');
    const connection = await oracle.getConnection({
      user: 'system',
      password: 'oracle'
    });
    
    return await connection.execute(sql);
  },

  // Direct postgres usage
  async queryPostgres(sql: string) {
    const { Client } = require('pg');
    const client = new Client({
      host: 'localhost',
      port: 5432,
      database: 'postgres'
    });
    
    await client.connect();
    const result = await client.query(sql);
    await client.end();
    
    return result.rows;
  },

  // Direct mongodb usage
  async queryMongodb(collection: string, query: any) {
    const { MongoClient } = require('mongodb');
    const client = new MongoClient('mongodb://localhost:27017');
    
    await client.connect();
    const db = client.db('test');
    const result = await db.collection(collection).find(query).toArray();
    await client.close();
    
    return result;
  }
}; 