# 装扮状态 UI 兜底体系

**文档状态：** 二期（独立拆分；空态 / 占位 / 失效标识以本文 + FAULT / SEARCH / ROADMAP 为准）
**产品：** 乡声集盒 · 主题中心 · 全场景状态展示
**页面：** 主题中心各 Tab、搜索态、局部装扮分类页；统一走 `EmptyState` / `ThemeStatusPane`（不另开状态路由）

本文只定 **无数据、加载中、网络失败、待上线 / 绝版 / 下架 / 终端不支持** 怎么展示、点什么。列表货架见 [`THEME_CENTER_GLOBAL.md`](THEME_CENTER_GLOBAL.md)、[`THEME_CENTER_DRESS.md`](THEME_CENTER_DRESS.md)。搜索筛选见 [`THEME_CENTER_SEARCH.md`](THEME_CENTER_SEARCH.md)。收藏见 [`THEME_CENTER_SOCIAL.md`](THEME_CENTER_SOCIAL.md)。最近使用见 [`THEME_CENTER_RECENT.md`](THEME_CENTER_RECENT.md)。历史搭配见 [`THEME_CENTER_MIX.md`](THEME_CENTER_MIX.md)。权限引导见 [`THEME_CENTER_PRIVILEGE.md`](THEME_CENTER_PRIVILEGE.md)。预览拦截见 [`THEME_CENTER_PREVIEW.md`](THEME_CENTER_PREVIEW.md)。失败 Toast 见 [`THEME_CENTER_FAULT.md`](THEME_CENTER_FAULT.md)。埋点见 [`THEME_CENTER_ANALYTICS.md`](THEME_CENTER_ANALYTICS.md)。分期见 [`THEME_CENTER_ROADMAP.md`](THEME_CENTER_ROADMAP.md)。双端存储与同步见 [`THEME_CENTER_SYNC.md`](THEME_CENTER_SYNC.md)。标准化数据结构（独立拆分）见 [`THEME_CENTER_DATA.md`](THEME_CENTER_DATA.md)。

需求原文若另写一套空态句子、或把节日定制插画、后台可配文案写成必做，规划仍以 ROADMAP / FAULT 为准：这是 **二期体验收口**，不是一期闸门。**已落地文案不得改**（e2e 与单测锁句）。不要把自定义插画包、双按钮「返回首页」、永久骨架盖住内置货架一次做完。

对外文案不用「作品」「短视频」。Toast 仍不超过 32 字。

## 二期范围

| 做 | 不做 |
| --- | --- |
| 各场景空态走同一 `ThemeStatusPane`，文案集中在 `themeStatus.js` | 改已落地空态句子 |
| 目录请求中：顶部轻量 loading（有延迟），列表仍可先看内置/缓存货架 | 首屏用骨架把已有卡片藏掉（与 PERF「先画缓存」冲突） |
| 目录失败：FAULT 空态 +【重试】 | 「网络开小差啦」等另一套失败句 |
| 待上线 / 已绝版 / 已下架 / 小程序不支持：卡片置灰 + 已有标签，启用拦截 | 隐藏权限不足卡片 |
| 空态曝光 / 按钮点击埋点 `theme_empty_show` / `theme_empty_click` | 后台动态配文案、节日插画（三期） |

H5 / 小程序同一套文案与按钮。小程序 nav/tab 降级文案仍以 ROADMAP / FAULT 已有句为准，不另发明。

## 空态文案（已落地，禁止替换）

| 场景 | `scene` | 标题 | 操作 |
| --- | --- | --- | --- |
| 全局主题货架空 | `catalog` | 暂无可用主题，更多方言主题正在制作中 | 无 |
| 筛选无命中 | `filter` | 当前筛选条件下暂无可用装扮 | 【重置筛选】清掉已生效筛选 |
| 搜索无命中 | `search` | 没有找到相关主题或装扮，换个关键词试试 | 【返回列表】退出搜索态（页内还有同一按钮）。**不要**「返回首页」 |
| 我的收藏空 | `favorites` | 你还没有收藏任何主题装扮，快去挑选喜欢的吧 | 【去挑选】切全局主题 Tab |
| 最近使用空 | `recent` | 暂无最近使用记录，快去挑选装扮吧 | 无 |
| 历史搭配空 | `mix` | 还没有保存任何搭配方案，可将当前装扮保存为专属搭配 | 【保存当前搭配】 |
| 分类待上线 | `dress_coming` | 该分类装扮素材即将上线，敬请期待 | 无 |
| 我的装扮未设局部 | `dress_applied` | 暂未设置局部装扮，快去搭配你的专属界面 | 【去搭配】切局部装扮 Tab |
| 目录加载失败 | `catalog_fail` | 装扮列表加载失败，请检查网络后重试 | 【重试】 |

搜索无命中仍先 Toast「没有匹配的主题装扮，请更换关键词」（FAULT）。

需求原文里的「暂无装扮内容…」「未找到相关装扮…吧」「暂无收藏装扮…」「暂无保存的搭配方案…」「网络开小差啦」**均不采用**。

## 加载占位

- 内置清单保证主题中心 **不是空白首屏**。远程目录刷新时，顶部 `BaseLoading`（延迟约 200ms）提示「装扮目录加载中…」，**不**拆掉当前列表。
- 有缓存失败：继续展示列表 +「当前展示为缓存数据，部分内容可能不是最新」。
- 无缓存失败：切 `catalog_fail`，禁止永久转圈。
- 详情 / 预览数据来自已加载目录，打开即画沙盒；远程封面失败用 FAULT「装扮资源加载异常」，回 CSS 缩略，不卡死弹窗。
- 连点仍走 `beginThemeApply` 800ms 防抖。

完整卡片骨架屏、虚拟列表骨架随 PERF 三期目录变长再做。

## 资源生命周期标识

| 状态 | 卡片 | 启用 / 获取 | 预览 |
| --- | --- | --- | --- |
| 待上线 `coming` | 置灰，角标「敬请期待」 | 禁用 | 详情可开；实时预览按 PREVIEW 禁用 |
| 已绝版 `ended` / `deprecated` | 可看图，「已绝版」 | 不可启用、不可领取 | 可看详情 / 沙盒 |
| 已下架（目录没有该 id） | 「装扮已下架」 | 拦截复用 | 收藏/搭配里可留记录 |
| 小程序不支持 | 置灰；货架/检索「小程序暂不支持」；已拥有用 FAULT「拥有权限，但小程序环境暂不支持该装扮」 | 按钮锁定 | 可看，不注入原生栏样式 |
| 权限不足 | **不隐藏**，打会员/活动/创作者标签 | 弹引导，不静默 | 可预览 |

`style_json` 损坏：跳过该层，不因一张坏卡拆整页。搭配内失效件应用时 Toast 见 MIX / FAULT，不在空态体系另起一句。

## 埋点（二期）

| 事件 | 时机 | 参数 |
| --- | --- | --- |
| `theme_empty_show` | 空态 / 失败态露出 | `scene`（上表中文场景名） |
| `theme_empty_click` | 点空态按钮 | `scene`，`empty_action`（重试 / 重置 / 去挑选 / 保存当前搭配 / 返回列表 / 去搭配） |

不上报用户 id。失效件点击仍走已有 `theme_unsupported_env` / `theme_apply_invalid_item`。

## 后续（不在本期）

后台可配文案、节日空态插画、按空态曝光补货。空态句不以运营 CMS 为准，见 [`THEME_CENTER_ADMIN.md`](THEME_CENTER_ADMIN.md)。
