import axios from 'axios';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Important for sending/receiving HTTP-only cookies
});

// A flag to prevent multiple refresh calls simultaneously
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only intercept 401 Unauthorized errors (excluding the refresh and login endpoints)
    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh') &&
      !originalRequest.url?.includes('/auth/login')
    ) {
      if (isRefreshing) {
        // If already refreshing, put this request in a queue to retry once refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Hit the refresh endpoint (which requires the refresh token cookie)
        // Note: the backend route is just /auth/refresh (if base URL is /api, then /api/auth/refresh)
        await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });
        
        // Refresh was successful, process the queued requests
        isRefreshing = false;
        processQueue(null);

        // Retry the original request that failed
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed (e.g., refresh token expired)
        isRefreshing = false;
        processQueue(refreshError);
        
        // Redirect to login (window check ensures we are on the client side)
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        
        return Promise.reject(refreshError);
      }
    }

    if (error.response && error.response.status === 403) {
      if (typeof window !== 'undefined') {
        window.location.href = '/dashboard';
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
