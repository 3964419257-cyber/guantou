/**
 * 方言身份选项（与词库方言族对齐）。
 * 优先用 GET /dialects/?region_level=family 覆盖 name；例词/试听在此兜底。
 * 约定：跳过次方言时 dialects = [primaryDialect]
 */
export const IDENTITY_DIALECTS = [
  {
    code: 'sichuan',
    name: '四川话',
    example: '巴适',
    exampleMeaning: '舒服、好',
    audioUrl: '',
  },
  {
    code: 'cantonese',
    name: '粤语',
    example: '靓仔',
    exampleMeaning: '帅哥',
    audioUrl: '',
  },
  {
    code: 'wu',
    name: '吴语',
    example: '侬好',
    exampleMeaning: '你好',
    audioUrl: '',
  },
  {
    code: 'minnan',
    name: '闽南语',
    example: '呷饱未',
    exampleMeaning: '吃饱了吗',
    audioUrl: '',
  },
  {
    code: 'hakka',
    name: '客家话',
    example: '食饭',
    exampleMeaning: '吃饭',
    audioUrl: '',
  },
  {
    code: 'xiang',
    name: '湘语',
    example: '里头',
    exampleMeaning: '里面',
    audioUrl: '',
  },
  {
    code: 'gan',
    name: '赣语',
    example: '晓得',
    exampleMeaning: '知道',
    audioUrl: '',
  },
  {
    code: 'jin',
    name: '晋语',
    example: '甚',
    exampleMeaning: '什么',
    audioUrl: '',
  },
  {
    code: 'minbei',
    name: '闽北语',
    example: '伓是',
    exampleMeaning: '不是',
    audioUrl: '',
  },
  {
    code: 'putian',
    name: '莆仙话',
    example: '好否',
    exampleMeaning: '好不好',
    audioUrl: '',
  },
  {
    code: 'northeast',
    name: '东北官话',
    example: '整明白',
    exampleMeaning: '弄清楚',
    audioUrl: '',
  },
  {
    code: 'beijing',
    name: '北京官话',
    example: '倍儿',
    exampleMeaning: '特别',
    audioUrl: '',
  },
];

/** 家乡/常住地城市列表（第一版静态；同城流后续再接） */
export const REGION_OPTIONS = [
  '北京', '上海', '广州', '深圳', '成都', '重庆', '杭州', '武汉',
  '西安', '南京', '苏州', '天津', '长沙', '郑州', '青岛', '厦门',
  '福州', '莆田', '泉州', '漳州', '宁波', '温州', '合肥', '南昌',
  '昆明', '贵阳', '南宁', '海口', '哈尔滨', '沈阳', '大连', '济南',
];

/**
 * 合并词库方言族与本地例词元数据。
 * @param {Array<{name?: string, code?: string, metadata?: object}>} apiDialects
 */
export function mergeIdentityDialects(apiDialects = []) {
  const byName = new Map(IDENTITY_DIALECTS.map((item) => [item.name, { ...item }]));
  const byCode = new Map(IDENTITY_DIALECTS.map((item) => [item.code, item.name]));

  (apiDialects || []).forEach((item) => {
    const name = item.name || byCode.get(item.code);
    if (!name) {
      byName.set(item.name, {
        code: item.code || item.name,
        name: item.name,
        example: (item.metadata && item.metadata.example) || '',
        exampleMeaning: (item.metadata && item.metadata.exampleMeaning) || '',
        audioUrl: (item.metadata && item.metadata.audioUrl) || '',
      });
      return;
    }
    const base = byName.get(name) || {
      code: item.code || name,
      name,
      example: '',
      exampleMeaning: '',
      audioUrl: '',
    };
    byName.set(name, {
      ...base,
      code: item.code || base.code,
      example: (item.metadata && item.metadata.example) || base.example,
      exampleMeaning: (item.metadata && item.metadata.exampleMeaning) || base.exampleMeaning,
      audioUrl: (item.metadata && item.metadata.audioUrl) || base.audioUrl,
    });
  });

  return Array.from(byName.values());
}
