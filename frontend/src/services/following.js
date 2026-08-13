import request from '@/utils/request';

const RECOMMEND_FOLLOW_SEEN_KEY = 'recommend_follow_seen';

export function listFollowRecommendations(dialectId, limit = 6) {
  return request.get('/users/recommendations', {
    dialect_id: dialectId,
    limit,
  });
}

export function followDialect(dialectId) {
  return request.put(`/dialects/${dialectId}/follow/`);
}

export function unfollowDialect(dialectId) {
  return request.del(`/dialects/${dialectId}/follow/`);
}

export function followUser(userId) {
  return request.put(`/users/${userId}/follow`);
}

export function unfollowUser(userId) {
  return request.del(`/users/${userId}/follow`);
}

/** 批量关注：复用单用户接口，部分失败不抛整批 */
export async function batchFollowUsers(userIds = []) {
  const ids = [...new Set((userIds || []).map(Number).filter(Boolean))];
  const results = await Promise.allSettled(ids.map((id) => followUser(id)));
  const succeeded = [];
  const failed = [];
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') succeeded.push(ids[index]);
    else failed.push(ids[index]);
  });
  return { succeeded, failed, total: ids.length };
}

export function markRecommendFollowSeen() {
  uni.setStorageSync(RECOMMEND_FOLLOW_SEEN_KEY, true);
}

export function hasSeenRecommendFollow() {
  return Boolean(uni.getStorageSync(RECOMMEND_FOLLOW_SEEN_KEY));
}

export default {
  batchFollowUsers,
  followDialect,
  followUser,
  hasSeenRecommendFollow,
  listFollowRecommendations,
  markRecommendFollowSeen,
  unfollowDialect,
  unfollowUser,
};
