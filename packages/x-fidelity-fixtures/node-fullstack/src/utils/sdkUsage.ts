// This file has minimal usage of new SDK features like "processUserData"
// Should trigger newSdkFeatureNotAdoped-global rule due to low usage count

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  preferences: Record<string, any>;
}

// Only one usage of "processUserData" - below threshold of 2
export const processUserData = (userData: UserProfile) => {
  console.log('Processing user data:', userData.email);
  return {
    ...userData,
    processed: true,
    timestamp: new Date().toISOString()
  };
};

// Other functions that don't use the new SDK features
export const validateUser = (user: UserProfile) => {
  return user.email.includes('@') && user.name.length > 0;
};

export const formatUserDisplay = (user: UserProfile) => {
  return `${user.name} (${user.email})`;
};

export const getUserPreferences = (user: UserProfile) => {
  return user.preferences || {};
};

export const updateUserSettings = (user: UserProfile, settings: Record<string, any>) => {
  return {
    ...user,
    preferences: { ...user.preferences, ...settings }
  };
};

// Legacy data processing functions that don't use new SDK
export const legacyDataHandler = (data: any) => {
  return data.map((item: any) => ({ ...item, legacy: true }));
};

export const oldStyleProcessor = (input: string) => {
  return input.toUpperCase().replace(/\s+/g, '_');
};

export const deprecatedFunction = (value: number) => {
  return value * 2;
}; 