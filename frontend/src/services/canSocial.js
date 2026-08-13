import request from '@/utils/request';

export function likeCan(canId) {
  return request.put(`/cans/${canId}/like/`);
}

export function unlikeCan(canId) {
  return request.del(`/cans/${canId}/like/`);
}

export function listCanComments(canId, params = {}) {
  return request.get('/comments/', { can_id: canId, ...params });
}

export function createCanComment(canId, content) {
  return request.post('/comments/', { can_id: canId, content });
}

export function deleteCanComment(commentId) {
  return request.del(`/comments/${commentId}/`);
}

export function likeCanComment(commentId) {
  return request.put(`/comments/${commentId}/like/`);
}

export function unlikeCanComment(commentId) {
  return request.del(`/comments/${commentId}/like/`);
}

export function listCanPosts(canId, params = {}) {
  return request.get('/posts/', { can_id: canId, ...params });
}

export function getCanPost(postId) {
  return request.get(`/posts/${postId}/`);
}

export function createCanPost(canId, text = '', visibility = 'public', extra = {}) {
  return request.post('/posts/', {
    can_id: Number(canId),
    text: String(text || '').trim(),
    visibility,
    kind: extra.kind || 'use_same',
    forward_from_post_id: extra.forwardFromPostId || undefined,
  });
}

export function repostCan(canId, { forwardFromPostId, text = '' } = {}) {
  return createCanPost(canId, text, 'public', {
    kind: 'repost',
    forwardFromPostId,
  });
}

export function deleteCanPost(postId) {
  return request.del(`/posts/${postId}/`);
}

export default {
  createCanComment,
  createCanPost,
  deleteCanComment,
  deleteCanPost,
  getCanPost,
  likeCan,
  likeCanComment,
  listCanComments,
  listCanPosts,
  repostCan,
  unlikeCan,
  unlikeCanComment,
};
