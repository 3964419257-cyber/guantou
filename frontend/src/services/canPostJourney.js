import { requireAuth } from '@/services/authGuard';
import { notify } from '@/services/feedback';

export function useSameUrl(canId) {
  return `/pages/posts/compose?can_id=${encodeURIComponent(canId)}`;
}

export function startUseSame(canId, context = {}) {
  if (!canId) return false;
  if (!requireAuth('use_same', {
    page: context.page || 'can_detail',
    canId,
    postId: context.postId,
  })) return false;
  uni.navigateTo({ url: useSameUrl(canId) });
  notify({ title: '已带入同款罐头' });
  return true;
}

export function openCanPost(postId, options = {}) {
  if (!postId) return false;
  const query = [`id=${encodeURIComponent(postId)}`];
  if (options.scrollTo) query.push(`scrollTo=${encodeURIComponent(options.scrollTo)}`);
  uni.navigateTo({
    url: `/pages/posts/details?${query.join('&')}`,
  });
  return true;
}

export function openCanDetail(canId, options = {}) {
  if (!canId) return false;
  const query = [`id=${encodeURIComponent(canId)}`];
  if (options.scrollTo) query.push(`scrollTo=${encodeURIComponent(options.scrollTo)}`);
  uni.navigateTo({
    url: `/pages/cans/details?${query.join('&')}`,
  });
  return true;
}

export default {
  openCanDetail,
  openCanPost,
  startUseSame,
  useSameUrl,
};
