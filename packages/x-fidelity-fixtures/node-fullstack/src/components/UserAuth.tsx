import React, { useState } from 'react';

// Intentionally problematic React component to trigger multiple rules

export const UserAuth: React.FC = () => {
  const [credentials, setCredentials] = useState({
    authToken: 'ya29.a0ARrdaM-abcdef123456789',
    privateKey: '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBg...'
  });

  const handleAuth = async () => {
    try {
      // These trigger noDatabases-iterative (just logging, not actual requires)
      console.log('About to require oracle database package...');
      console.log('About to require postgres database package...');
      console.log('About to require mongodb database package oracle...');

      // Only 2 sensitive logging violations in this file
      console.log('Using auth_token:', credentials.authToken); // Pattern: (api[_-]?key|auth[_-]?token|access[_-]?token|secret[_-]?key)
      console.log('Private key loaded:', credentials.privateKey); // Pattern: (private[_-]?key|ssh[_-]?key)

      // Mock database initialization logging (triggers noDatabases rule)
      console.log('Initializing oracle connection...');
      console.log('Setting up postgres database...');
      console.log('Configuring mongodb instance...');

    } catch (error) {
      console.error('Auth error:', error);
    }
  };

  return (
    <div>
      <h2>User Authentication</h2>
      <button onClick={handleAuth}>
        Authenticate
      </button>
    </div>
  );
}; 