import axios from "axios";
import { API_URL, TENANT_SLUG } from "./config";
import { getAuthToken } from "./session";

const api = axios.create({
    baseURL: API_URL,
    headers: {
        "Content-Type": "application/json",
        "X-Tenant-Slug": TENANT_SLUG,
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
