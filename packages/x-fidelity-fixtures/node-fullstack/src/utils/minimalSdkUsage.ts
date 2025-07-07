// Second file to trigger newSdkFeatureNotAdoped-global rule
// Has minimal adoption of new SDK features like "processUserData"

export interface LegacyUser {
  id: string;
  username: string;
  email: string;
  profile: any;
}

// Only ONE usage of processUserData across the entire project
// This should contribute to triggering the newSdkFeatureNotAdoped rule
// when combined with sdkUsage.ts (which also has only 1 usage)
export const handleUserRegistration = (userData: LegacyUser) => {
  console.log('Processing new user registration...');
  
  // This is the only call to the new SDK feature in this file
  const processed = processUserData(userData);
  
  console.log('User registered:', processed);
  return processed;
};

// All other functions use legacy patterns and don't adopt new SDK features
export const legacyUserValidator = (user: LegacyUser) => {
  return user.email && user.username && user.email.includes('@');
};

export const oldUserProcessor = (user: LegacyUser) => {
  return {
    ...user,
    legacyProcessed: true,
    oldTimestamp: new Date().getTime()
  };
};

export const deprecatedUserHandler = (users: LegacyUser[]) => {
  return users.map(user => ({
    ...user,
    handledWithOldMethod: true,
    version: 'legacy'
  }));
};

export const traditionalDataMapper = (input: any) => {
  return {
    id: input.id || 'unknown',
    name: input.username || input.name || 'anonymous',
    contact: input.email || 'no-email'
  };
};

export const conventionalValidator = (data: any) => {
  const errors: string[] = [];
  
  if (!data.id) errors.push('ID required');
  if (!data.username) errors.push('Username required');
  if (!data.email) errors.push('Email required');
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Many legacy utility functions that don't use new SDK
export const legacyStringUtils = {
  normalize: (str: string) => str.trim().toLowerCase(),
  validate: (str: string) => str.length > 0,
  format: (str: string) => str.replace(/\s+/g, ' ')
};

export const oldSchoolProcessor = {
  parse: (data: string) => JSON.parse(data),
  stringify: (data: any) => JSON.stringify(data),
  transform: (data: any) => ({ ...data, oldFormat: true })
};

export const legacyApiHelpers = {
  buildUrl: (base: string, params: Record<string, string>) => {
    const url = new URL(base);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
    return url.toString();
  },
  
  parseResponse: (response: any) => {
    return {
      data: response.data || null,
      success: response.status === 'ok',
      timestamp: Date.now()
    };
  }
}; 