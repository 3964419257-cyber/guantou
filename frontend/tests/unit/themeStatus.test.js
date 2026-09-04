import { describe, expect, it } from 'vitest';
import { THEME_FAULT_TOAST } from '@/services/themeFault';
import {
  THEME_EMPTY_COPY,
  THEME_EMPTY_SCENE,
  themeEmptyCopy,
} from '@/services/themeStatus';

describe('theme status copy', () => {
  it('keeps the landed empty-state sentences', () => {
    expect(themeEmptyCopy(THEME_EMPTY_SCENE.catalog).title)
      .toBe('暂无可用主题，更多方言主题正在制作中');
    expect(THEME_EMPTY_COPY.filter.title).toBe('当前筛选条件下暂无可用装扮');
    expect(THEME_EMPTY_COPY.search).toMatchObject({
      title: '没有找到相关主题或装扮，换个关键词试试',
      actionText: '返回列表',
    });
    expect(THEME_EMPTY_COPY.favorites.title)
      .toBe('你还没有收藏任何主题装扮，快去挑选喜欢的吧');
    expect(THEME_EMPTY_COPY.recent.title).toBe('暂无最近使用记录，快去挑选装扮吧');
    expect(THEME_EMPTY_COPY.mix.title)
      .toBe('还没有保存任何搭配方案，可将当前装扮保存为专属搭配');
    expect(THEME_EMPTY_COPY.dress_coming.title)
      .toBe('该分类装扮素材即将上线，敬请期待');
    expect(THEME_EMPTY_COPY.catalog_fail.title).toBe(THEME_FAULT_TOAST.catalogFail);
  });
});
