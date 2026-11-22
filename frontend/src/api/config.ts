import Constants from 'expo-constants';

// EXPO_PUBLIC_API_BASE_URL (set in frontend/.env, e.g. https://volo-api.onrender.com)
// takes over once the backend is deployed; standalone/EAS builds have no
// debuggerHost to auto-detect from, so without this they'd fall back to
// localhost and silently fail to reach the real API.
const deployedBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

// Auto-detect backend IP for local dev (Expo Go on a physical device/emulator)
const debuggerHost = Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoGo?.debuggerHost;
const host = debuggerHost ? debuggerHost.split(':')[0] : 'localhost';

export const BASE_URL = deployedBaseUrl || `http://${host}:5000`;
export const API_URL = `${BASE_URL}/api`;

// Baked in per white-labeled build (frontend/eas.json's build.<profile>.env)
// — tells the shared backend which operator's data this build belongs to.
// Unset falls back to the original "volo" tenant (see
// backend/src/middleware/tenant.middleware.ts), so existing single-tenant
// builds keep working with no changes.
export const TENANT_SLUG = process.env.EXPO_PUBLIC_TENANT_SLUG || "volo";
