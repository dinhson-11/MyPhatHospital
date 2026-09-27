import { describe, it, expect, beforeEach, vi } from 'vitest';
import apiClient, { BASE_URL } from '../services/api';

describe('API Client & Interceptor Suite (Enterprise Grade)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should initialize with correct default configuration and base URL', () => {
    expect(apiClient).toBeDefined();
    expect(BASE_URL).toContain('http');
    expect(apiClient.defaults.headers['Content-Type']).toBe('application/json');
  });

  it('should inject Bearer token into Authorization header when token exists in storage', async () => {
    const mockToken = 'mock_jwt_token_sample_12345';
    localStorage.setItem('hms_token', mockToken);

    // Run the request interceptor directly
    const config = { headers: {} };
    const interceptedConfig = await apiClient.interceptors.request.handlers[0].fulfilled(config);

    expect(interceptedConfig.headers.Authorization).toBe(`Bearer ${mockToken}`);
  });

  it('should not attach Authorization header if no token is stored in localStorage', async () => {
    const config = { headers: {} };
    const interceptedConfig = await apiClient.interceptors.request.handlers[0].fulfilled(config);

    expect(interceptedConfig.headers.Authorization).toBeUndefined();
  });

  it('should purge session and dispatch hms_auth_changed event on 401 Unauthorized', async () => {
    localStorage.setItem('hms_token', 'expired_token');
    localStorage.setItem('hms_user', JSON.stringify({ username: 'benhnhan' }));

    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    const mock401Error = {
      config: { _retry: false },
      response: { status: 401 }
    };

    // Run the response interceptor rejection handler
    const responseErrorHandler = apiClient.interceptors.response.handlers[0].rejected;

    await expect(responseErrorHandler(mock401Error)).rejects.toEqual(mock401Error);

    expect(localStorage.getItem('hms_token')).toBeNull();
    expect(localStorage.getItem('hms_user')).toBeNull();
    expect(dispatchSpy).toHaveBeenCalled();
  });
});
