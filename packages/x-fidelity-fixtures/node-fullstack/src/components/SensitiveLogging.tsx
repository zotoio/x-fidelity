import React, { useEffect, useState } from 'react';

// This file contains sensitive logging patterns that should be detected

export function SensitiveLogging() {
  const [user, setUser] = useState(null);
  const [config, setConfig] = useState({});

  useEffect(() => {
    // SENSITIVE: API key logging
    const api_key = 'sk-1234567890abcdef';
    console.log('Using API key:', api_key);
    
    // SENSITIVE: Auth token logging
    const auth_token = 'bearer_token_12345';
    console.log('Authentication with token: ' + auth_token);
    
    // SENSITIVE: Access token logging
    const access_token = localStorage.getItem('access_token');
    console.log(`Access token retrieved: ${access_token}`);
    
    // SENSITIVE: Secret key logging
    const secret_key = process.env.REACT_APP_SECRET_KEY;
    console.debug('Secret key loaded:', secret_key);
  }, []);

  const handleLogin = async (credentials: any) => {
    try {
      // SENSITIVE: AWS credentials logging
      const aws_access_key_id = credentials.aws_access_key_id;
      const aws_secret_access_key = credentials.aws_secret_access_key;
      
      console.log('AWS Access Key ID:', aws_access_key_id);
      console.log('AWS Secret Access Key:', aws_secret_access_key);
      
      // SENSITIVE: Private key logging
      const private_key = credentials.private_key;
      console.error('Private key for authentication:', private_key);
      
      // SENSITIVE: SSH key logging
      const ssh_key = credentials.ssh_key;
      console.warn('SSH key content:', ssh_key);
      
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleOAuth = (tokens: any) => {
    // SENSITIVE: OAuth token logging
    const oauth_token = tokens.oauth_token;
    const jwt_token = tokens.jwt_token;
    
    console.log('OAuth token received:', oauth_token);
    console.log('JWT token:', jwt_token);
    
    // SENSITIVE: Database password logging
    const db_password = tokens.db_password;
    console.log('Database password for connection:', db_password);
  };

  const debugConfig = () => {
    // Multiple sensitive patterns in one function
    const apiKey = 'api-key-value';
    const authToken = 'auth-token-value';
    const secretKey = 'secret-key-value';
    
    console.log({ 
      api_key: apiKey,
      auth_token: authToken, 
      secret_key: secretKey,
      db_password: 'db-password-123'
    });
  };

  return (
    <div className="sensitive-logging-component">
      <h2>Component with Sensitive Logging</h2>
      <p>This component demonstrates patterns that should trigger sensitive logging detection.</p>
      <button onClick={() => handleLogin({ 
        aws_access_key_id: 'AKIA123', 
        aws_secret_access_key: 'secret123',
        private_key: 'private-key-content',
        ssh_key: 'ssh-rsa AAAAB3...'
      })}>
        Test Login (with sensitive logging)
      </button>
      <button onClick={() => handleOAuth({
        oauth_token: 'oauth-123',
        jwt_token: 'jwt-456',
        db_password: 'password123'
      })}>
        Test OAuth (with sensitive logging)
      </button>
      <button onClick={debugConfig}>
        Debug Config (with sensitive logging)
      </button>
    </div>
  );
} 