import { toLoginPage } from '@/routers/login';
import {
  clearInterceptIntent,
  saveInterceptIntent,
} from '@/services/authGuard';
import { likeCan } from '@/services/canSocial';
import { notify, notifySuccess } from '@/services/feedback';
import { followUser } from '@/services/following';

export const AUTH_DESTINATION_KINDS = {
  ADJACENT_CAN_DRAFT: 'adjacent_can_draft',
  DEFAULT: 'default',
  FALLBACK: 'fallback',
  URL: 'url',
};

export const AUTH_RESUME_ACTIONS = {
  FOLLOW: 'follow',
  LIKE: 'like',
  USE_SAME: 'use_same',
};

function canDetailsUrl(canId, extra = {}) {
  if (!canId) return '';
  const query = [`id=${encodeURIComponent(canId)}`];
  if (extra.scrollTo) query.push(`scrollTo=${encodeURIComponent(extra.scrollTo)}`);
  return `/pages/cans/details?${query.join('&')}`;
}

function postDetailsUrl(postId, extra = {}) {
  if (!postId) return '';
  const query = [`id=${encodeURIComponent(postId)}`];
  if (extra.scrollTo) query.push(`scrollTo=${encodeURIComponent(extra.scrollTo)}`);
  return `/pages/posts/details?${query.join('&')}`;
}

function userDetailsUrl(userId) {
  return userId ? `/pages/users/details?id=${encodeURIComponent(userId)}` : '';
}

function publisherDestination(context = {}) {
  const flavorId = context.flavorId || context.wordId;
  if (flavorId) {
    const name = context.flavorName
      ? `&flavor_name=${encodeURIComponent(context.flavorName)}`
      : '';
    return {
      kind: AUTH_DESTINATION_KINDS.URL,
      route: 'pages/cans/create',
      url: `/pages/cans/create?flavor=${encodeURIComponent(flavorId)}${name}`,
    };
  }
  if (context.dialectId) {
    return {
      kind: AUTH_DESTINATION_KINDS.URL,
      route: 'pages/cans/create',
      url: `/pages/cans/create?dialect=${encodeURIComponent(context.dialectId)}`,
    };
  }
  return {
    kind: AUTH_DESTINATION_KINDS.URL,
    route: 'pages/cans/create',
    url: '/pages/cans/create',
  };
}

function fallbackDestination(toast) {
  return {
    kind: AUTH_DESTINATION_KINDS.FALLBACK,
    toast: toast || '',
  };
}

export function resolveAuthDestination(intent) {
  if (!intent) return { kind: AUTH_DESTINATION_KINDS.DEFAULT };

  const context = intent.context || {};
  if (intent.voluntary || intent.action === 'open_mine') {
    return {
      kind: AUTH_DESTINATION_KINDS.URL,
      route: 'pages/users/me',
      url: '/pages/users/me',
    };
  }

  if (
    intent.action === 'tab_publish'
    || intent.action === 'publish_post'
  ) {
    return publisherDestination(context);
  }

  if (intent.action === 'record_can') {
    if (context.page === 'can_create' && context.returnRoute === '/pages/cans/create') {
      return {
        kind: AUTH_DESTINATION_KINDS.ADJACENT_CAN_DRAFT,
        ownerScope: context.ownerScope || '',
      };
    }
    if (context.page === 'discovery' && !context.flavorId && !context.wordId && !context.dialectId) {
      return {
        kind: AUTH_DESTINATION_KINDS.URL,
        route: 'pages/discovery/index',
        url: '/pages/discovery/index',
      };
    }
    return publisherDestination(context);
  }

  if (intent.action === 'nameplate_support' || intent.action === 'nameplate_create') {
    const url = canDetailsUrl(context.canId);
    if (!url) return fallbackDestination('无法回到原内容');
    return {
      kind: AUTH_DESTINATION_KINDS.URL,
      route: 'pages/cans/details',
      url,
    };
  }

  if (intent.action === 'follow' || intent.action === 'tab_follow') {
    const url = userDetailsUrl(context.userId);
    if (!url) return fallbackDestination('无法回到该用户');
    return {
      kind: AUTH_DESTINATION_KINDS.URL,
      route: 'pages/users/details',
      url,
      resumeAction: AUTH_RESUME_ACTIONS.FOLLOW,
    };
  }

  if (intent.action === 'circle_join' && context.circleId) {
    return {
      kind: AUTH_DESTINATION_KINDS.URL,
      route: 'pages/circles/details',
      url: `/pages/circles/details?id=${encodeURIComponent(context.circleId)}`,
    };
  }

  if (
    intent.action === 'like'
    || intent.action === 'tab_like'
    || intent.action === 'comment'
    || intent.action === 'repost'
  ) {
    if (context.postId) {
      return {
        kind: AUTH_DESTINATION_KINDS.URL,
        route: 'pages/posts/details',
        url: postDetailsUrl(context.postId, {
          scrollTo: context.scrollTo || (intent.action === 'comment' ? 'comments' : ''),
        }),
        resumeAction: intent.action === 'like' ? AUTH_RESUME_ACTIONS.LIKE : '',
      };
    }
    if (context.canId) {
      const destination = {
        kind: AUTH_DESTINATION_KINDS.URL,
        route: 'pages/cans/details',
        url: canDetailsUrl(context.canId, {
          scrollTo: context.scrollTo || (intent.action === 'comment' ? 'comments' : ''),
        }),
      };
      if (intent.action === 'like' || intent.action === 'tab_like') {
        destination.resumeAction = AUTH_RESUME_ACTIONS.LIKE;
      }
      return destination;
    }
    return fallbackDestination('无法回到原内容');
  }

  if (intent.action === 'use_same') {
    if (!context.canId) return fallbackDestination('无法回到原内容');
    return {
      kind: AUTH_DESTINATION_KINDS.URL,
      route: 'pages/posts/compose',
      url: `/pages/posts/compose?can_id=${encodeURIComponent(context.canId)}`,
      resumeAction: AUTH_RESUME_ACTIONS.USE_SAME,
    };
  }

  return fallbackDestination();
}

export async function tryResumeAction(destination, intent) {
  if (!destination) return;
  if (destination.toast && !destination.resumeAction) {
    notify({ title: destination.toast });
    return;
  }

  const context = (intent && intent.context) || {};
  const action = destination.resumeAction;
  if (!action) return;

  try {
    if (action === AUTH_RESUME_ACTIONS.FOLLOW && context.userId) {
      await followUser(context.userId);
      notifySuccess('已关注');
      return;
    }
    if (action === AUTH_RESUME_ACTIONS.LIKE && context.canId) {
      await likeCan(context.canId);
      notifySuccess('已点赞');
      return;
    }
    if (action === AUTH_RESUME_ACTIONS.USE_SAME) {
      notify({ title: '已带入同款罐头' });
    }
  } catch (error) {
    notify({ title: (error && error.message) || '操作未能自动完成' });
  }
}

export function openLoginFromMine() {
  saveInterceptIntent({
    action: 'open_mine',
    context: { page: 'mine' },
    voluntary: true,
  });
  toLoginPage();
}

export function cancelLoginToSearch() {
  clearInterceptIntent();
  uni.reLaunch({ url: '/pages/search' });
}

export default {
  AUTH_DESTINATION_KINDS,
  AUTH_RESUME_ACTIONS,
  cancelLoginToSearch,
  openLoginFromMine,
  resolveAuthDestination,
  tryResumeAction,
};
