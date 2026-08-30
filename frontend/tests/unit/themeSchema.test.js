import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import {
  applyOutfitStyle,
  COMPONENT_NAV_BAR,
  defaultSupportTerminal,
  flattenStyleJson,
  fromPrivilegeType,
  isNativeComponent,
  PRIVILEGE_ACTIVITY,
  resolveOutfitStyle,
  supportsTerminal,
  THEME_API_PATHS,
  THEME_DATA_KEYS,
  toCollectList,
  toCurrentConfig,
  toDecorationItem,
  toPrivilegeType,
  toSavedMix,
  toThemeItem,
} from '@/services/themeSchema';

vi.mock('@/services/platform', () => ({
  isWechatMiniProgram: vi.fn(() => false),
  default: vi.fn(() => false),
}));

describe('themeSchema contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.uni = {
      getStorageSync: vi.fn(() => ''),
      setStorageSync: vi.fn(),
      $emit: vi.fn(),
    };
  });

  it('maps privilege and terminals to the PRD enums', () => {
    expect(toPrivilegeType('event')).toBe(PRIVILEGE_ACTIVITY);
    expect(fromPrivilegeType(PRIVILEGE_ACTIVITY)).toBe('event');
    expect(defaultSupportTerminal(true)).toEqual(['h5']);
    expect(defaultSupportTerminal(false)).toEqual(['h5', 'miniprogram']);
    expect(isNativeComponent(COMPONENT_NAV_BAR)).toBe(true);
    expect(THEME_API_PATHS.config).toBe('/users/theme/config/');
    expect(THEME_DATA_KEYS.local_current_config).toBe('local_current_config');
  });

  it('serializes catalog items to theme_item and decoration_item', () => {
    const theme = toThemeItem({
      id: 'chuankiang',
      name: '川渝烟火',
      description: '巴蜀市井热辣风格',
      category: 'dialect',
      region: 'chuankiang',
      preview: 'dialect',
      available: false,
      access: 'free',
    });
    expect(theme).toMatchObject({
      theme_id: 'chuankiang',
      desc: '巴蜀市井热辣风格',
      dialect_tags: ['川渝'],
      style_tags: ['地域方言风'],
      privilege_type: 'free',
      status: 'coming',
      support_terminal: ['h5', 'miniprogram'],
    });

    const dress = toDecorationItem({
      id: 'navbar-plain',
      name: '系统默认顶栏',
      description: '跟随当前全局主题的顶栏。',
      group: 'navbar',
      preview: 'navbar',
      available: true,
      access: 'free',
    }, { id: 'navbar', mpBlocked: true, category: 'nav' });
    expect(dress).toMatchObject({
      decoration_id: 'navbar-plain',
      component_type: 'nav_bar',
      privilege_type: 'free',
      status: 'available',
      support_terminal: ['h5'],
    });
    expect(supportsTerminal(dress, {
      group: { mpBlocked: true },
      isMiniProgram: true,
    })).toBe(false);
  });

  it('builds user snapshots for collect, mix, and current config', () => {
    expect(toCollectList({ themes: ['default'], dresses: ['cards-plain'] })).toEqual({
      collect_list: [
        { item_id: 'default', item_type: 'theme', collect_time: 0 },
        { item_id: 'cards-plain', item_type: 'decoration', collect_time: 0 },
      ],
    });
    expect(toSavedMix({
      id: 'outfit-1',
      name: '川渝全套搭配',
      themeId: 'default',
      localDress: { cards: 'cards-plain' },
      savedAt: 9,
    })).toMatchObject({
      mix_id: 'outfit-1',
      mix_name: '川渝全套搭配',
      global_theme_id: 'default',
      decoration_ids: ['cards-plain'],
      decoration_map: { card: 'cards-plain' },
    });
    expect(toCurrentConfig({
      themeId: 'default',
      localDress: { navbar: 'navbar-plain', cards: 'cards-plain' },
      overlay: true,
      recent: [{ id: 'default', kind: 'theme', usedAt: 1 }],
    })).toMatchObject({
      global_theme_id: 'default',
      decoration_map: {
        nav_bar: 'navbar-plain',
        card: 'cards-plain',
      },
      is_cover_local_decoration: true,
      recent_use_list: [
        { item_id: 'default', item_type: 'theme', use_time: 1 },
      ],
    });
  });

  it('injects token style_json and skips native mini-program components', () => {
    const flat = flattenStyleJson({
      borderColor: 'var(--accent-color)',
      borderWidth: '4px',
      borderRadius: '50%',
      shadow: '0 0 8px var(--accent-color)',
    }, 'avatar_frame');
    expect(flat.ok).toBe(true);
    expect(flat.vars['--dress-avatar-frame-border-color']).toBe('var(--accent-color)');
    expect(flattenStyleJson({ borderColor: 'red;background:url(x)' }).vars).toEqual({});

    const resolved = resolveOutfitStyle({
      theme: {
        style_json: { accent: 'pine', primaryLook: 'fill' },
      },
      dressItems: [{
        item: {
          style_json: { borderColor: 'var(--accent-color)' },
          component_type: 'nav_bar',
          support_terminal: ['h5'],
        },
        group: { mpBlocked: true, id: 'navbar' },
      }],
      overlay: false,
      isMiniProgram: true,
    });
    expect(resolved.ok).toBe(true);
    expect(resolved.skipped[0].reason).toBe('native');
    expect(resolved.appearance.accent).toBe('pine');

    const covered = resolveOutfitStyle({
      theme: { style_json: { accent: 'ink' } },
      dressItems: [{ item: { style_json: { borderWidth: '8px' }, group: 'cards' } }],
      overlay: true,
    });
    expect(Object.keys(covered.vars)).toHaveLength(0);
    expect(covered.appearance.accent).toBe('ink');
  });

  it('falls back to default when style_json is corrupt', () => {
    const resolved = resolveOutfitStyle({
      theme: { style_json: '{bad' },
    });
    expect(resolved.ok).toBe(false);
    expect(applyOutfitStyle(resolved)).toMatchObject({ ok: false, fallback: 'default' });
  });
});
