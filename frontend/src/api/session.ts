// In-memory only — lost on app restart. This unblocks the backend's new
// socket auth requirement (chat/live-tracking now reject unauthenticated
// connections) without introducing a new storage dependency. Before a real
// launch, replace this with persisted storage (expo-secure-store) so users
// aren't logged out every time the app is closed.
let authToken: string | null = null;

export type CurrentUser = { id: string; role: string; displayName?: string };
let currentUser: CurrentUser | null = null;

export const setAuthToken = (token: string | null) => {
    authToken = token;
};

export const getAuthToken = () => authToken;

// Used only to decide what to show (e.g. hiding the Admin button). Every
// admin/driver action is still checked server-side; this is never the gate.
export const setCurrentUser = (user: CurrentUser | null) => {
    currentUser = user;
};

export const getCurrentUser = () => currentUser;
