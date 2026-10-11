import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  BASE_URL: ''
}));

import apiClient from '../services/api';
import { chatService, chatTokenHeaders, rememberChatToken } from '../services/chatService';

describe('Mã truy cập phiên chat (X-Chat-Token)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('createSession ghi nhớ sessionToken do backend cấp và chỉ gửi lại cho đúng phiên đó', async () => {
    apiClient.post.mockResolvedValue({ data: { id: 7, sessionToken: 'tok-7' } });

    await chatService.createSession();

    expect(chatTokenHeaders(7)).toEqual({ 'X-Chat-Token': 'tok-7' });
    expect(chatTokenHeaders(8)).toEqual({});
    expect(chatTokenHeaders(null)).toEqual({});
  });

  it('getSessionMessages gửi header X-Chat-Token của phiên', async () => {
    rememberChatToken(12, 'tok-12');
    apiClient.get.mockResolvedValue({ data: [] });

    await chatService.getSessionMessages(12);

    expect(apiClient.get).toHaveBeenCalledWith(
      '/chat/sessions/12/messages',
      expect.objectContaining({ headers: { 'X-Chat-Token': 'tok-12' } })
    );
  });

  it('mã được lưu trong sessionStorage (không phải localStorage) để mất khi đóng tab', () => {
    rememberChatToken(3, 'tok-3');
    expect(JSON.parse(sessionStorage.getItem('hms_chat_tokens'))).toMatchObject({ 3: 'tok-3' });
    expect(localStorage.getItem('hms_chat_tokens')).toBeNull();
  });

  it('bỏ qua khi thiếu id hoặc mã', () => {
    rememberChatToken(null, 'x');
    rememberChatToken(5, undefined);
    expect(chatTokenHeaders(5)).toEqual({});
  });
});
