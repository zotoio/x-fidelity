import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Intentionally problematic React component to trigger multiple rules

interface User {
  id: string;
  username: string;
  api_key: string;  // Triggers sensitiveLogging rule
}

const UserAuth: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [password, setPassword] = useState('');  // Triggers sensitiveLogging rule
  const [auth_token, setAuthToken] = useState(''); // Triggers sensitiveLogging rule

  // Direct database connection patterns - triggers noDatabases rule
  const connectToDatabase = () => {
    // These patterns will be detected by the noDatabases rule
    console.log('About to require oracle database package...');
    console.log('About to require postgres database package...');
    console.log('About to require mongodb database package...');
    
    console.log('Connecting with credentials:', {
      api_key: 'sk-1234567890abcdef',  // Triggers sensitiveLogging rule
      db_password: 'mysecretpassword',  // Triggers sensitiveLogging rule
      aws_access_key_id: 'AKIA1234567890',  // Triggers sensitiveLogging rule
    });
  };

  // More sensitive data exposure
  const handleLogin = async (credentials: any) => {
    console.log('User login with private_key:', credentials.private_key);  // Triggers sensitiveLogging
    console.log('JWT token being used:', credentials.jwt_token);  // Triggers sensitiveLogging
    console.log('OAuth token:', credentials.oauth_token);  // Triggers sensitiveLogging
    
    try {
      const response = await axios.post('/api/login', {
        ...credentials,
        secret_key: 'super-secret-123'  // Triggers sensitiveLogging rule
      });
      
      setUser(response.data);
    } catch (error) {
      console.error('Login failed with ssh_key exposure:', error);  // Triggers sensitiveLogging
    }
  };

  useEffect(() => {
    // More database connections - triggers noDatabases rule
    const initializeConnections = () => {
      console.log('Initializing oracle connection...');
      console.log('Setting up postgres database...');
      console.log('Configuring mongodb instance...');
    };
    
    initializeConnections();
  }, []);

  return (
    <div>
      <h2>User Authentication</h2>
      <input 
        type="password" 
        placeholder="Password"
        value={password}
        onChange={(e) => {
          const newPassword = e.target.value;
          console.log('Password changed to:', newPassword);  // Triggers sensitiveLogging
          setPassword(newPassword);
        }}
      />
      <input
        type="text"
        placeholder="Auth Token"
        value={auth_token}
        onChange={(e) => {
          const token = e.target.value;
          console.log('Auth token updated:', token);  // Triggers sensitiveLogging
          setAuthToken(token);
        }}
      />
      <button onClick={() => handleLogin({ password, auth_token })}>
        Login
      </button>
    </div>
  );
};

export default UserAuth; 