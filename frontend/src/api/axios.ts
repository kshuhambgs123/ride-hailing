import axios from "axios";
import { API_URL } from "./config";
import { getAuthToken } from "./session";

const api = axios.create({
    baseURL: API_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

api.interceptors.request.use((requestConfig) => {
    const token = getAuthToken();
    if (token) {
        requestConfig.headers.Authorization = `Bearer ${token}`;
    }
    return requestConfig;
});

export default api;
