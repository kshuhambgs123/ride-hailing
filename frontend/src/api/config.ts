import Constants from 'expo-constants';

// Auto-detect backend IP for mobile/web universal connectivity
const debuggerHost = Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoGo?.debuggerHost;
const host = debuggerHost ? debuggerHost.split(':')[0] : 'localhost';

export const BASE_URL = `http://${host}:5000`;
export const API_URL = `${BASE_URL}/api`;
