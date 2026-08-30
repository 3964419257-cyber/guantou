import { isLoggedIn } from '@/services/authGuard';
import {
  bindThemeNetworkFlush,
  guestThemeSnapshot,
  handleThemeAccountLogin,
  setThemeCatalogFetcher,
  setThemeCloudFlusher,
  setThemeMemberFetcher,
} from '@/services/themeFault';
import {
  currentTerminal,
  fromCurrentConfig,
  fromDecorationItem,
  fromThemeItem,
  THEME_API_PATHS,
  toCollectList,
  toCurrentConfig,
  toSavedMix,
} from '@/services/themeSchema';
import { request } from '@/utils/httpClient';

const silent = {
  silent: true,
  loading: false,
  redirectOnUnauthorized: false,
};

async function fetchPaged(path) {
  const data = await request('GET', path, { page: 1, page_size: 50 }, {
    ...silent,
    auth: false,
  });
  return {
    results: data?.results || [],
    catalog_version: data?.catalog_version || 1,
  };
}

export async function fetchThemeCatalog() {
  const [themes, decorations] = await Promise.all([
    fetchPaged(THEME_API_PATHS.themes),
    fetchPaged(THEME_API_PATHS.decorations),
  ]);
  return {
    themes: (themes.results || []).map(fromThemeItem).filter(Boolean),
    dresses: (decorations.results || []).map(fromDecorationItem).filter(Boolean),
    catalog_version: themes.catalog_version || decorations.catalog_version,
  };
}

export async function fetchThemeMemberStatus() {
  const data = await request('GET', THEME_API_PATHS.entitlement, {}, silent);
  return Boolean(data?.is_member);
}

export async function fetchThemeConfig() {
  return request('GET', THEME_API_PATHS.config, {}, silent);
}

function collectKey(row) {
  return `${row.item_type}:${row.item_id}`;
}

async function syncCollects(favorites) {
  if (!favorites) return;
  const local = toCollectList(favorites).collect_list || [];
  const remote = await request('GET', THEME_API_PATHS.collects, {}, silent);
  const remoteList = remote?.collect_list || [];
  const remoteKeys = new Set(remoteList.map(collectKey));
  const localKeys = new Set(local.map(collectKey));
  await Promise.all(local
    .filter((row) => !remoteKeys.has(collectKey(row)))
    .map((row) => request('POST', THEME_API_PATHS.collects, {
      item_id: row.item_id,
      item_type: row.item_type,
    }, silent)));
  await Promise.all(remoteList
    .filter((row) => !localKeys.has(collectKey(row)))
    .map((row) => request(
      'DELETE',
      `${THEME_API_PATHS.collects}${row.item_id}/?item_type=${encodeURIComponent(row.item_type)}`,
      {},
      silent,
    )));
}

async function syncMixes(outfits) {
  if (!Array.isArray(outfits)) return;
  const local = outfits.map((outfit) => toSavedMix(outfit)).filter(Boolean);
  const remote = await request('GET', THEME_API_PATHS.mixes, {}, silent);
  const remoteList = Array.isArray(remote) ? remote : [];
  const remoteIds = new Set(remoteList.map((row) => row.mix_id));
  const localIds = new Set(local.map((row) => row.mix_id));
  await Promise.all(local
    .filter((row) => !remoteIds.has(row.mix_id))
    .map((row) => request('POST', THEME_API_PATHS.mixes, row, silent)));
  await Promise.all(remoteList
    .filter((row) => !localIds.has(row.mix_id))
    .map((row) => request('DELETE', `${THEME_API_PATHS.mixes}${row.mix_id}/`, {}, silent)));
}

export async function flushThemeConfig(payload = {}) {
  const body = toCurrentConfig({
    themeId: payload.themeId,
    localDress: payload.localDress || {},
    overlay: payload.overlay !== false,
    recent: payload.recent || [],
  });
  await request('PUT', THEME_API_PATHS.config, {
    ...body,
    platform: currentTerminal(),
  }, silent);
  try {
    await syncCollects(payload.favorites);
    await syncMixes(payload.outfits);
  } catch {
    // Social lists are best-effort; the current outfit is already on the server.
  }
  return { ok: true };
}

export async function pullThemeCloudState() {
  if (!isLoggedIn()) return { ok: false, reason: 'guest' };
  if (guestThemeSnapshot()) return { ok: false, reason: 'merge-pending' };
  const config = await fetchThemeConfig();
  const { hydrateFromCloudConfig } = await import('@/services/themeCenter');
  hydrateFromCloudConfig(config);
  return { ok: true, config };
}

export async function afterThemeLogin(userId) {
  const result = await handleThemeAccountLogin(userId);
  if (!result.merge) {
    try {
      await pullThemeCloudState();
    } catch {
      // Keep the local snapshot; theme-center can retry.
    }
  }
  return result;
}

export function postThemeEvent(event, itemId = '') {
  return request('POST', THEME_API_PATHS.events, {
    event,
    item_id: itemId || '',
  }, {
    ...silent,
    auth: isLoggedIn(),
  }).catch(() => null);
}

export function bindThemeAdapters() {
  setThemeCatalogFetcher(fetchThemeCatalog);
  setThemeCloudFlusher(flushThemeConfig);
  setThemeMemberFetcher(fetchThemeMemberStatus);
  bindThemeNetworkFlush();
}

export { fromCurrentConfig };
