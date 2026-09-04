// 服务端错误体形状（见 backend/guantou/utils/exceptions/handler.py 与 middleware.py）：
// { code, message, data: { <field>: "<message>" | { code, message } }, request_id }
// DRF 端点的 data.<field> 为 { code, message }；legacy 视图的额外键经 ExceptionMiddleware
// 原样透传进 data，可能是字符串或数组。

function messageOf(value) {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || '';
  }
  if (Array.isArray(value)) return messageOf(value[0]);
  if (value && typeof value === 'object' && typeof value.message === 'string') {
    return messageOf(value.message);
  }
  return '';
}

export function extractFieldErrors(error) {
  const data = error && error.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
  const fields = {};
  Object.entries(data).forEach(([field, value]) => {
    const message = messageOf(value);
    if (message) fields[field] = message;
  });
  return fields;
}

// 把服务端字段错误落到页面的 errors 对象，只写已知字段；命中返回 true。
// 页面传入的 errors 是响应式数据对象，就地写入才能让行内错误即时更新。
export function applyFieldErrors(errors, error, fields) {
  const extracted = extractFieldErrors(error);
  const targets = fields || Object.keys(errors);
  let matched = false;
  targets.forEach((field) => {
    if (field in errors && extracted[field]) {
      // eslint-disable-next-line no-param-reassign
      errors[field] = extracted[field];
      matched = true;
    }
  });
  return matched;
}

// 空体错误响应会拿到英文 reason phrase（如 "Conflict"），对用户无意义；
// 此时优先使用调用方按 statusCode 提供的兜底文案。
const REASON_PHRASES = new Set([
  'Bad Request', 'Unauthorized', 'Payment Required', 'Forbidden', 'Not Found',
  'Method Not Allowed', 'Conflict', 'Gone', 'Unsupported Media Type',
  'Too Many Requests', 'Internal Server Error', 'Bad Gateway', 'Service Unavailable',
]);

export function readableErrorMessage(error, fallbackByStatus = {}) {
  const message = error && typeof error.message === 'string' ? error.message.trim() : '';
  const meaningful = message && !REASON_PHRASES.has(message);
  if (meaningful) return message;
  const statusCode = error && error.statusCode;
  return fallbackByStatus[statusCode] || message || '';
}

export default {
  applyFieldErrors,
  extractFieldErrors,
  readableErrorMessage,
};
