import React, { useState } from 'react';

// Minimal test file for sensitiveLogging-iterative rule
// Contains only 2 specific pattern violations

interface AuthConfig {
  apiKey: string;
  awsKeyId: string;
}

const SensitiveDataLogger: React.FC = () => {
  const [config, setConfig] = useState<AuthConfig>({
    apiKey: 'sk-1234567890abcdef',
    awsKeyId: 'AKIA1234567890123456'
  });

  const handleLogin = () => {
    // Only 2 sensitive logging violations in this file
    console.log('User login with api_key:', config.apiKey); // Pattern: (api[_-]?key|auth[_-]?token|access[_-]?token|secret[_-]?key)
    console.log('AWS access key:', config.awsKeyId); // Pattern: (aws[_-]?access[_-]?key[_-]?id|aws[_-]?secret[_-]?access[_-]?key)
  };

  const handleDbConnection = () => {
    const connectionString = 'mongodb://admin:supersecret@prod-cluster.mongodb.net'; // For noDatabases rule
    console.log('Connecting to database...');
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Sensitive Data Logger (Test Component)</h2>
      <p>This component has minimal sensitive logging for testing</p>
      
      <button onClick={handleLogin}>
        Login (Logs API Key)
      </button>
      
      <button onClick={handleDbConnection}>
        Connect DB
      </button>
    </div>
  );
};

export default SensitiveDataLogger; 