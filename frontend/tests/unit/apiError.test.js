import { describe, expect, it } from 'vitest';
import {
  applyFieldErrors,
  extractFieldErrors,
  readableErrorMessage,
} from '@/utils/apiError';

describe('apiError helpers', () => {
  it('extracts DRF-style and plain string field errors', () => {
    expect(extractFieldErrors({
      statusCode: 400,
      message: '请求参数校验失败',
      data: {
        username: { code: 'unique', message: '用户名已存在' },
        email: ['该邮箱已被绑定'],
        code: '验证码错误',
        broken: [{ other: 1 }],
      },
    })).toEqual({
      username: '用户名已存在',
      email: '该邮箱已被绑定',
      code: '验证码错误',
    });
  });

  it('tolerates missing or malformed error data', () => {
    expect(extractFieldErrors(null)).toEqual({});
    expect(extractFieldErrors(new Error('boom'))).toEqual({});
    expect(extractFieldErrors({ data: 'oops' })).toEqual({});
  });

  it('applies only known fields and reports a match', () => {
    const errors = { username: '', email: '', code: '' };

    const matched = applyFieldErrors(errors, {
      data: { email: '该邮箱已被绑定', nickname: '未知字段' },
    }, ['username', 'email', 'code']);

    expect(matched).toBe(true);
    expect(errors).toEqual({ username: '', email: '该邮箱已被绑定', code: '' });
  });

  it('reports no match when no known field has a server error', () => {
    const errors = { phone: '', code: '' };

    const matched = applyFieldErrors(errors, { data: { nickname: '占用' } }, ['phone', 'code']);

    expect(matched).toBe(false);
    expect(errors).toEqual({ phone: '', code: '' });
  });

  it('prefers meaningful server messages over status fallbacks', () => {
    expect(readableErrorMessage(
      { statusCode: 409, message: '该微信已绑定账户' },
      { 409: 'x' },
    )).toBe('该微信已绑定账户');
    expect(readableErrorMessage(
      { statusCode: 409, message: 'Conflict' },
      { 409: '用户名或邮箱已存在' },
    )).toBe('用户名或邮箱已存在');
    expect(readableErrorMessage({ statusCode: 404, message: '' })).toBe('');
    expect(readableErrorMessage(
      { statusCode: 500, message: ' ' },
      { 500: '服务器开小差' },
    )).toBe('服务器开小差');
  });
});
