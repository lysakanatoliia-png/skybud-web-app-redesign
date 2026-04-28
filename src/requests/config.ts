import axios, { AxiosRequestConfig, AxiosResponse, Method } from "axios";
import { getApiBaseUrl } from "../lib/apiConfig";
import { ensureValidToken, getAuthToken } from "../lib/tokenManager";
import { BOT_API_URL, BOT_API_TOKEN } from "../lib/env";

// Use environment variable if set, otherwise use the configurable API URL
const getBaseUrl = (): string => {
  const envUrl = BOT_API_URL;
  if (envUrl) {
    return envUrl.endsWith('/api/v1') ? envUrl : envUrl + "/api/v1";
  }
  return getApiBaseUrl() + "/api/v1";
};

const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 300000, // Увеличенный timeout по умолчанию для больших запросов (5 минут)
  maxContentLength: Infinity, // Разрешаем неограниченный размер ответа
  maxBodyLength: Infinity, // Разрешаем неограниченный размер тела запроса
});

// Update baseURL when environment changes
export const updateApiBaseUrl = () => {
  api.defaults.baseURL = getBaseUrl();
};

// Flag to prevent multiple simultaneous token validations
let isTokenValidationInProgress = false;

api.interceptors.request.use(async (config) => {
  // Check if this is a request to CRM API (not bot-api)
  const isCrmApiRequest = config.baseURL?.includes('api-crm') || 
                          config.url?.includes('api-crm') ||
                          getBaseUrl().includes('api-crm');
  
  // For CRM API requests, validate and regenerate token if needed
  // CRM API uses default user info@skybud.de
  if (isCrmApiRequest && !isTokenValidationInProgress) {
    try {
      isTokenValidationInProgress = true;
      const validToken = await ensureValidToken();
      
      if (validToken) {
        // Try different token formats - some APIs expect Bearer prefix, some don't
        // First try with Bearer prefix (most common)
        let authHeader = validToken;
        if (!validToken.startsWith('Bearer ')) {
          authHeader = `Bearer ${validToken}`;
        }
        config.headers["Authorization"] = authHeader;
        console.log('[Config] Using token for CRM API request:', config.url);
      } else {
        // Failed to get token - this shouldn't happen, but throw error to prevent request
        console.error('[Config] Failed to get valid token for CRM API');
        throw new Error('Failed to get authentication token for CRM API.');
      }
    } catch (error) {
      console.error('[Config] Error validating token:', error);
      // Try one more time to get default token
      try {
        const { getDefaultCrmToken } = await import('../lib/tokenManager');
        const defaultToken = await getDefaultCrmToken();
        if (defaultToken) {
          // Try with Bearer prefix
          const authHeader = defaultToken.startsWith('Bearer ') ? defaultToken : `Bearer ${defaultToken}`;
          config.headers["Authorization"] = authHeader;
          console.log('[Config] Using fallback default token for CRM API request');
        } else {
          console.error('[Config] Failed to get default token as fallback');
          throw error;
        }
      } catch (fallbackError) {
        console.error('[Config] Fallback token retrieval also failed:', fallbackError);
        throw error;
      }
    } finally {
      isTokenValidationInProgress = false;
    }
  } else {
    // For non-CRM API requests (bot-api), use static token or user's token
    // bot-api uses static token, not user-specific tokens
    const authToken = getAuthToken();
    if (authToken) {
      // Use user's token if available
      config.headers["Authorization"] = authToken;
    } else {
      // For bot-api, we might need a static token, but don't use VITE_API_TOKEN for user data
      // Only use it if explicitly needed for bot-api operations
      if (BOT_API_TOKEN && !isCrmApiRequest) {
        config.headers["Authorization"] = BOT_API_TOKEN;
      }
    }
  }
  
  // Для FormData не устанавливаем Content-Type - браузер сам установит правильный заголовок с boundary
  // Это особенно важно для Android и больших файлов
  if (config.data instanceof FormData) {
    // Удаляем явно установленный Content-Type, если он есть
    delete config.headers['Content-Type'];
  }
  
  return config;
});

type ApiRequestOptions = AxiosRequestConfig;

const apiRequest = async <T>(
  method: Method,
  route: string,
  options: ApiRequestOptions = {},
  body: object | null = null
): Promise<{ data: T; error?: unknown; status?: number }> => {
  try {
    const config: ApiRequestOptions = { ...options };
    if (body) {
      config.data = body;
    }

    const response: AxiosResponse<T> = await api.request({
      method,
      url: route,
      ...config,
    });

    return { data: response.data };
  } catch (e: unknown) {
    const errorResponse = e as { response?: AxiosResponse<T> };
    return {
      data: (errorResponse.response?.data ?? {}) as T,
      error: e,
      status: errorResponse.response?.status,
    };
  }
};

export default apiRequest;