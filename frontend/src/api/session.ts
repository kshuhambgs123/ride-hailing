// In-memory only — lost on app restart. This unblocks the backend's new
// socket auth requirement (chat/live-tracking now reject unauthenticated
// connections) without introducing a new storage dependency. Before a real
// launch, replace this with persisted storage (expo-secure-store) so users
// aren't logged out every time the app is closed.
let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
    authToken = token;
};

export const getAuthToken = () => authToken;
