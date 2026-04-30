import axios from "axios";
import { BASE_URL } from "../config.js";
import { getCredentials, saveCredentials, clearCredentials } from "./auth.js";

// ---------------------------------------------------------------------------
// Axios instance — all CLI requests go through this
// ---------------------------------------------------------------------------
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
    "X-API-Version": "1",
  },
});

// ---------------------------------------------------------------------------
// Request interceptor — attach access token to every outgoing request
// ---------------------------------------------------------------------------
api.interceptors.request.use(async (config) => {
  const credentials = await getCredentials();
  if (credentials?.access_token) {
    config.headers.Authorization = `Bearer ${credentials.access_token}`;
  }
  return config;
});

// ---------------------------------------------------------------------------
// Response interceptor — handle 401s by attempting a silent token refresh
// ---------------------------------------------------------------------------

// Flag to prevent infinite refresh loops if the refresh request itself 401s
let isRefreshing = false;

api.interceptors.response.use(
  // Success — pass response straight through
  (response) => response,

  // Error handler
  async (error) => {
    const originalRequest = error.config;

    // Only attempt refresh on 401 and only once per request (_retry flag)
    if (error.response?.status === 401 && !originalRequest._retry) {
      // If already refreshing, don't stack another refresh attempt
      if (isRefreshing) {
        await clearCredentials();
        throw new Error("Session expired. Please run: insighta login");
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const credentials = await getCredentials();

        if (!credentials?.refresh_token) {
          throw new Error("No refresh token available");
        }

        // Call the refresh endpoint directly with axios (not the instance)
        // to avoid triggering this interceptor again
        const { data } = await axios.post(
          `${BASE_URL}/auth/refresh`,
          { refresh_token: credentials.refresh_token },
          { headers: { "Content-Type": "application/json" } }
        );

        // Persist the new token pair
        await saveCredentials({
          ...credentials,
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });

        // Retry the original request with the new access token
        originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
        return api.request(originalRequest);

      } catch {
        // Refresh failed — clear credentials and tell the user to log in again
        await clearCredentials();
        throw new Error("Session expired. Please run: insighta login");
      } finally {
        isRefreshing = false;
      }
    }

    // For all other errors, reject with the original error
    return Promise.reject(error);
  }
);

export default api;
