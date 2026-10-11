import axios from 'axios';
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

  describe('401 handling', () => {
    const rejected = () => apiClient.interceptors.response.handlers[0].rejected;

    beforeEach(() => {
      localStorage.setItem('hms_token', 'expired_token');
      localStorage.setItem('hms_refresh_token', 'refresh_1');
      localStorage.setItem('hms_user', JSON.stringify({ username: 'benhnhan' }));
    });

    it('does not refresh or purge the session when the login call itself returns 401', async () => {
      const err = { config: { url: '/auth/login', _retry: false }, response: { status: 401 } };
      await expect(rejected()(err)).rejects.toEqual(err);
      expect(localStorage.getItem('hms_token')).toBe('expired_token');
    });

    it('purges the session when there is no refresh token', async () => {
      localStorage.removeItem('hms_refresh_token');
      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
      const err = { config: { url: '/visits', _retry: false, headers: {} }, response: { status: 401 } };

      await expect(rejected()(err)).rejects.toEqual(err);

      expect(localStorage.getItem('hms_token')).toBeNull();
      expect(localStorage.getItem('hms_user')).toBeNull();
      expect(dispatchSpy).toHaveBeenCalled();
    });

    it('refreshes once for parallel 401s and retries each original request with the new token', async () => {
      const postSpy = vi.spyOn(axios, 'post').mockResolvedValue({ data: { data: { accessToken: 'new_token' } } });
      const retried = [];
      const adapter = apiClient.defaults.adapter;
      apiClient.defaults.adapter = (config) => {
        retried.push({ url: config.url, auth: config.headers.Authorization });
        return Promise.resolve({ data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config });
      };

      try {
        const mk = (url) => ({ config: { url, _retry: false, headers: {} }, response: { status: 401 } });
        const results = await Promise.all([rejected()(mk('/a')), rejected()(mk('/b'))]);

        expect(postSpy).toHaveBeenCalledTimes(1);
        expect(postSpy.mock.calls[0][1]).toEqual({ refreshToken: 'refresh_1' });
        expect(localStorage.getItem('hms_token')).toBe('new_token');
        expect(retried.map((r) => r.auth)).toEqual(['Bearer new_token', 'Bearer new_token']);
        expect(results.every((r) => r.ok === true)).toBe(true);
      } finally {
        apiClient.defaults.adapter = adapter;
        postSpy.mockRestore();
      }
    });

    it('keeps the session when the refresh call fails only because the network is down', async () => {
      const postSpy = vi.spyOn(axios, 'post').mockRejectedValue(
        Object.assign(new Error('Network Error'), { isAxiosError: true, code: 'ERR_NETWORK' }));
      const err = { config: { url: '/visits', _retry: false, headers: {} }, response: { status: 401 } };

      await expect(rejected()(err)).rejects.toEqual(err);

      expect(localStorage.getItem('hms_token')).toBe('expired_token');
      expect(localStorage.getItem('hms_refresh_token')).toBe('refresh_1');
      postSpy.mockRestore();
    });

    it('logs out when the refresh token is rejected', async () => {
      const postSpy = vi.spyOn(axios, 'post').mockRejectedValue(
        Object.assign(new Error('401'), { isAxiosError: true, response: { status: 400 } }));
      const err = { config: { url: '/visits', _retry: false, headers: {} }, response: { status: 401 } };

      await expect(rejected()(err)).rejects.toEqual(err);

      expect(localStorage.getItem('hms_token')).toBeNull();
      expect(localStorage.getItem('hms_refresh_token')).toBeNull();
      postSpy.mockRestore();
    });
  });
});
