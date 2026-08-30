import { APP_NAME } from '@/const/branding';
import { isWechatMiniProgram } from '@/services/platform';
import { setClipboardQuiet } from '@/utils/clipboard';

export function themeShareCopy(item, kind) {
  if (kind === 'dress') {
    if (item?.group === 'avatar') return '这个方言头像框好好看，一起来搭配吧';
    return `这个方言装扮「${item?.name || '乡音装扮'}」好好看，一起来搭配吧`;
  }
  return `快来看看这个【${item?.name || '方言主题'}】方言主题，太有家乡味道了！`;
}

export function themeSharePath(kind, item) {
  if (kind === 'dress') {
    return `/pages/users/theme-dress?group=${item.group}&id=${item.id}`;
  }
  return `/pages/users/theme-center?kind=theme&id=${item.id}`;
}

export function themeShareUrl(kind, item) {
  const path = themeSharePath(kind, item);
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${path}`;
  }
  return path;
}

export function themeSharePayload(kind, item) {
  return {
    title: `${themeShareCopy(item, kind)} · ${APP_NAME}`,
    path: themeSharePath(kind, item).replace(/^\//, ''),
  };
}

export function copyThemeShareLink(kind, item) {
  setClipboardQuiet(themeShareUrl(kind, item));
  return themeShareUrl(kind, item);
}

function readToken(name, fallback) {
  if (typeof document === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value || fallback;
}

function wrapPosterText(ctx, text, x, y, maxWidth, lineHeight) {
  const chars = String(text || '').split('');
  let line = '';
  let offset = 0;
  chars.forEach((ch) => {
    const next = `${line}${ch}`;
    if (ctx.measureText(next).width > maxWidth && line) {
      ctx.fillText(line, x, y + offset);
      line = ch;
      offset += lineHeight;
    } else {
      line = next;
    }
  });
  if (line) ctx.fillText(line, x, y + offset);
}

function saveH5Poster(kind, item) {
  const copy = themeShareCopy(item, kind);
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
    return { ok: true };
  }
  const canvas = document.createElement('canvas');
  canvas.width = 750;
  canvas.height = 1200;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { ok: true };
  ctx.fillStyle = readToken('--page-color', '#f6f7f3');
  ctx.fillRect(0, 0, 750, 1200);
  ctx.fillStyle = readToken('--surface-color', '#ffffff');
  ctx.fillRect(48, 80, 654, 1040);
  ctx.fillStyle = readToken('--accent-color', '#2f6b4f');
  ctx.font = 'bold 40px sans-serif';
  ctx.fillText(APP_NAME, 80, 160);
  ctx.fillStyle = readToken('--text-color', '#1d2a24');
  ctx.font = 'bold 48px sans-serif';
  ctx.fillText(String(item?.name || '').slice(0, 12), 80, 260);
  ctx.font = '28px sans-serif';
  ctx.fillStyle = readToken('--muted-color', '#5b6d64');
  wrapPosterText(ctx, copy, 80, 340, 590, 40);
  ctx.fillStyle = readToken('--accent-subtle-color', '#dce8e0');
  ctx.fillRect(80, 560, 590, 420);
  const url = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.href = url;
  link.download = `${item?.name || 'theme'}-${APP_NAME}.png`;
  link.click();
  return { ok: true };
}

function requestAlbumAuth() {
  return new Promise((resolve) => {
    if (typeof uni.getSetting !== 'function') {
      resolve(false);
      return;
    }
    uni.getSetting({
      success: (res) => {
        if (res.authSetting?.['scope.writePhotosAlbum']) {
          resolve(true);
          return;
        }
        if (typeof uni.authorize !== 'function') {
          resolve(false);
          return;
        }
        uni.authorize({
          scope: 'scope.writePhotosAlbum',
          success: () => resolve(true),
          fail: () => resolve(false),
        });
      },
      fail: () => resolve(false),
    });
  });
}

export async function saveThemePoster(kind, item) {
  if (!isWechatMiniProgram()) {
    return saveH5Poster(kind, item);
  }
  const allowed = await requestAlbumAuth();
  if (!allowed) return { ok: false, reason: 'album' };
  if (typeof uni.saveImageToPhotosAlbum !== 'function') {
    return { ok: false, reason: 'album' };
  }
  return new Promise((resolve) => {
    uni.saveImageToPhotosAlbum({
      filePath: themeSharePath(kind, item),
      success: () => resolve({ ok: true }),
      fail: () => resolve({ ok: false, reason: 'album' }),
    });
  });
}

export default {
  copyThemeShareLink,
  saveThemePoster,
  themeShareCopy,
  themeSharePath,
  themeSharePayload,
  themeShareUrl,
};
