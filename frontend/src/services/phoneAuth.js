import rawRequest from '@/utils/rawRequest';
import { afterLogin } from '@/services/login';

export const PHONE_PATTERN = /^1\d{10}$/;
export const INVALID_PHONE_MESSAGE = '请输入合法的11位手机号';
export const NETWORK_ERROR_MESSAGE = '网络异常，请稍后重试';

function validationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function toPhoneAuthError(error) {
  if (!error) {
    return validationError(NETWORK_ERROR_MESSAGE);
  }
  if (error.statusCode) {
    return error;
  }
  const wrapped = new Error(NETWORK_ERROR_MESSAGE);
  wrapped.statusCode = 0;
  wrapped.cause = error;
  return wrapped;
}

export function normalizePhone(phone) {
  return String(phone || '').replace(/[\s-]+/g, '').trim();
}

export function isValidPhone(phone) {
  return PHONE_PATTERN.test(normalizePhone(phone));
}

export function requestPhoneCode(phone) {
  const normalized = normalizePhone(phone);
  if (!isValidPhone(normalized)) {
    return Promise.reject(validationError(INVALID_PHONE_MESSAGE));
  }
  return rawRequest.post('/users/phone-code', {
    phone: normalized,
  }, { auth: false }).catch((error) => {
    throw toPhoneAuthError(error);
  });
}

export async function loginWithPhone(phone, code) {
  const normalized = normalizePhone(phone);
  if (!isValidPhone(normalized)) {
    throw validationError(INVALID_PHONE_MESSAGE);
  }
  if (!String(code || '').trim()) {
    throw validationError('请输入验证码');
  }
  try {
    const response = await rawRequest.post('/login/phone', {
      phone: normalized,
      code: String(code).trim(),
    }, { auth: false });
    await afterLogin(response, { isNew: Boolean(response.is_new) });
    return response;
  } catch (error) {
    throw toPhoneAuthError(error);
  }
}
