# 主题中心性能优化

**文档状态：** 独立拆分（一期稳、二期可提前分页/懒加载/版本缓存；虚拟列表按三期验收）
**产品：** 乡声集盒 · 主题中心 · 全链路性能
**对应实现：** `themeCenter.js` / `themeSchema.js` / `themeFault.js` / `themeAnalytics.js` 性能事件

本文只定列表、图片、样式注入、缓存、小程序、弱网和监控怎么做，不定 UI 稿。不能为了指标关掉启用、预览、筛选、收藏等已承诺能力。低端机和弱网先保证能看、能换、不闪退，再追求帧率。

相关：总览 [`THEME_CENTER.md`](THEME_CENTER.md)，三层预览 [`THEME_CENTER_PREVIEW.md`](THEME_CENTER_PREVIEW.md)，搜索筛选 [`THEME_CENTER_SEARCH.md`](THEME_CENTER_SEARCH.md)，四维权限 [`THEME_CENTER_PRIVILEGE.md`](THEME_CENTER_PRIVILEGE.md)，历史搭配 [`THEME_CENTER_MIX.md`](THEME_CENTER_MIX.md)，空态标识 [`THEME_CENTER_STATUS.md`](THEME_CENTER_STATUS.md)，双端存储与同步 [`THEME_CENTER_SYNC.md`](THEME_CENTER_SYNC.md)，标准化数据结构（独立拆分）[`THEME_CENTER_DATA.md`](THEME_CENTER_DATA.md)，容错 [`THEME_CENTER_FAULT.md`](THEME_CENTER_FAULT.md)，埋点 [`THEME_CENTER_ANALYTICS.md`](THEME_CENTER_ANALYTICS.md)，后台素材 [`THEME_CENTER_ADMIN.md`](THEME_CENTER_ADMIN.md)，分期 [`THEME_CENTER_ROADMAP.md`](THEME_CENTER_ROADMAP.md)，安全 [`THEME_CENTER_SECURITY.md`](THEME_CENTER_SECURITY.md)。

需求原文若把「全部列表立刻虚拟列表」「增量 PUT」「首屏硬性 1s」写成当前闸门，规划仍以 ROADMAP 为准：虚拟滚动、WebP 转码、性能看板是 **三期**；分页、缩略图懒加载、`catalog_version`、style LRU、性能事件可提前。配置同步仍是全量 PUT，见 SYNC。不要另做智能预加载中台。

对外文案不用「作品」「短视频」。下文「罐头卡片」对应需求里的作品卡片。

## 分期范围

| 现在做 | 不做（三期 / 已由别的分册钉死） |
| --- | --- |
| 列表图 `lazy-load`；详情才用 `detail_img` | 货架未过 50 条就上虚拟列表（一期内置清单全量渲染） |
| 目录缓存不含 `style_json`；版本变化整表作废 + 清内存 LRU | 增量同步变更字段（SYNC：全量 PUT） |
| `style_json` 内存 LRU（32）；hydrate 约 2s 节流打 `theme_perf_style` | 历史搭配虚拟列表（最多 10 套） |
| 关预览 `abortThemePreview` + `v-if` 卸实例 | 前端现转 WebP；后台转码见 ADMIN 三期 |
| 启用 800ms、云端 300ms、搜索提交而非按键打接口 | 首屏 ≤1s / 弱网 ≤2s 当验收闸门（先不白屏） |
| 小程序不注入原生栏；滚动埋点已节流 | `theme_perf_scroll` fps 采样随虚拟列表一起做 |

H5 少重排：只改 CSS 变量。小程序少 setData：配置变更才写 storage，预览关闭即卸。

## 原则

1. **稳 > 快**：解析失败回退默认，列表失败用缓存 + 重试，不白屏、不乱跳。
2. **样式用 CSS 变量注入**，按组件作用域更新；禁止每次切换拆卸整页 DOM。
3. **目录可变大**：分页 + 超过 50 条虚拟滚动，禁止一次把上千张卡和全部大图塞进 DOM。
4. **持久化只存 id 和轻量元数据**；完整 `style_json` 走接口和内存缓存。
5. 实时预览只在沙盒模拟，关闭即销毁，不改真实页、不长期占图。

一期目录是内置少量清单，不必上虚拟列表。分页、缩略图懒加载、缓存版本号可在二期货架变长时提前做。虚拟滚动、海报预生成、滚动 fps 采样按三期验收。

```text
列表：分页 20 → 可视区渲染（≥50 开虚拟列表）→ 缩略图懒加载
样式：内存解析缓存 → 防抖 hydrate → 按组件写 CSS 变量（小程序跳过原生栏）
存储：配置/搭配/收藏只存 id；目录缓存无 style_json；版本号不一致则整表作废
弱网：先画缓存列表 → 静默刷新 → 图失败用占位，不挡滚动
```

---

## 一、装扮列表渲染

### 1. 虚拟滚动

主题列表、局部装扮列表、搜索结果、收藏列表：**条数 > 50** 时开启虚拟滚动，只挂可视区及其上下各约 1 屏缓冲。少于等于 50 条可全量渲染，避免小列表还上虚拟列表带来的跳变。

| 端 | 要求 |
| --- | --- |
| H5 | 虚拟列表（回收 DOM），卡片高度尽量固定，减少测量 |
| 小程序 | 小程序虚拟列表；禁止 `wx:for` 一次铺上百节点 |

卡片离开可视区后卸预览图节点，保留占位高度，避免滚动跳动。进入可视区再挂缩略图。

虚拟列表 **不能** 关掉点击进详情、筛选、收藏星标。滚动位置在切 Tab 后按 Tab 分别记，返回列表尽量回到原位置；搜索进入/退出可重置到顶部。

### 2. 分页

目录接口分页，**默认 `page_size=20`**，最大 50。下拉或触底加载下一页。搜索、筛选、排序都带同样分页参数，服务端过滤后再切页，**禁止**一次返回全部货架。

C 端：`GET /themes/`、`GET /decorations/` 增加 `page`、`page_size`。响应 `{ results, next, count, catalog_version }`。`count` 用于是否还要加载，不要为了拿总数再拉全量。

收藏、最近使用条数有上限（收藏可变长则同样分页）。历史搭配最多 10 套，不必虚拟列表。

### 3. 卡片懒渲染

与虚拟滚动一起：非可视区不解码大图、不跑卡片内动画。低端机（见第七节设备档）关闭卡片微动效，只留静态缩略图。

---

## 二、图片资源

字段：`cover_img` 列表缩略图，`detail_img` 详情大图，`poster_img` 分享海报。缺省规则见数据契约。后台上传转 **WebP** 并压缩；JPEG/PNG 仅作不支持 WebP 时的兜底链（由 CDN / 文件服务按 Accept 或 URL 后缀提供）。

| 场景 | 加载 |
| --- | --- |
| 列表 / 最近使用 / 搜索 | 只请求缩略图 |
| 详情弹窗大图预览 | 再请求 `detail_img` |
| 分享海报 | 优先 `poster_img`（后台预生成） |

**懒加载：** 滚动进可视区才设 `src`。禁止进入主题中心时预拉全部大图、全部海报。

**失败：** 统一装扮占位图，卡片结构仍在，不留白、不打断列表。失败可打监控，不对用户连弹 Toast（弱网下滑列表会刷屏）。详情大图失败同样占位，启用按钮仍按权限/状态走，不因图 404 禁用免费装扮。

**海报：** 不在每次打开分享时用 canvas 现绘全幅大图。有 `poster_img` 则直接用。必须前端合成时：同一 `item_id` 节流（例如 3 秒内复用上次结果）；小程序 `saveImageToPhotosAlbum` 异步，保存中按钮 loading，**不**卡住列表滚动。拒权 Toast 仍用容错文档「保存海报失败，请授予相册权限」。

---

## 三、`style_json` 渲染

C 端用 `resolveOutfitStyle` → `applyOutfitStyle`（`hydrateOutfitStyle`）。局部层变量已按 `component_type` 加前缀（`--dress-card-*` 等），不要再注入无作用域的整页 CSS 文本。

### 1. 隔离

- 只改设计 token / `--dress-*` 变量，不改布局结构、不写死 hex。
- 局部装扮只覆盖对应组件变量；覆盖开关打开时不计算局部层。
- 小程序 `nav_bar`、`tab_bar`：**跳过注入，不做解析**（无效计算也不做）。

禁止：每次换装给整页加 `<style>`、改所有卡片 class 列表、强制 `uni.createSelectorQuery` 量全页。

### 2. 防抖

短时间多次点启用 / 一键应用 / 重置：同一渲染通道合并，只 hydrate **最后一次**。已有按键防抖（同一按钮约 800ms）继续保留；渲染侧再用一帧合并（rAF 或 ≤32ms），避免连续写 CSS 变量造成多次重排。

切 Tab、滚列表 **不得** 触发全量 hydrate。

### 3. 内存缓存

解析后的 `style_json` 按 `item_id` + 目录版本缓存在内存（LRU，建议上限 32 条）。同装扮反复进详情、反复预览不重复 `JSON.parse`。进程被杀后从接口再拉，不把该缓存写入 `localStorage`。

### 4. 降级

解析失败、字段非法：丢弃该层，回退系统默认（或上一合法层）。Toast「装扮样式加载异常，已恢复默认」。页面继续可点，不转圈死锁。规则与容错文档一致。

---

## 四、缓存（H5 + 小程序）

两端键名相同。过期与版本同时生效：**过期或版本变化都要重新拉目录**。

### 1. 目录元数据

缓存主题/装扮 **列表字段**：id、名称、简介、缩略图 URL、标签、权限、状态、终端、组件类型、时间。TTL **1 小时**。

弱网或请求失败：先展示未过期或过期仍可用的缓存，标「当前展示为缓存数据…」，后台静默再拉。无缓存：空态 + 重试，不跳错页。

**列表缓存不含 `style_json`、不含详情大图、不含海报文件。**

### 2. 用户配置

`local_current_config`、`local_collect_list`、`local_saved_mix`：只存 id 与开关、名称、时间。云端失败时本地配置继续生效（容错文档）。

当前正在生效的主题/装扮，允许额外缓存一份 **已解析的 CSS 变量**（体积小，为离线 hydrate），不是整份货架 JSON。

### 3. 防脏数据

目录接口带 `catalog_version`（后台每次上下架、改权限、改 `style_json`、改图则递增）。本地记录上次版本；不一致则丢弃 `theme_cache` / `decoration_cache` 和内存 style LRU，再拉第一页。

不要用「每次进页都清空缓存」换正确性，那会打爆弱网。

---

## 五、微信小程序专项

1. **原生栏：** 不注入、不预解析 nav/tab 的 `style_json`。二期置灰展示即可，不要为预览去 `setNavigationBarColor` 循环试错。
2. **setData：** 分页追加用 concat 一次写入；滚动虚拟列表只更新可视窗口数据。禁止每次 `theme_list_scroll` 把整表 setData（埋点已节流，视图更新更要合并）。
3. **预览内存：** 关预览调用 `abortThemePreview`，卸 `ThemeLivePreview`（`v-if`），丢掉模拟图。不要用隐藏节点把预览留在后台。
4. **图片：** `image` 走小程序缓存；同一缩略图 URL 复用。预览弹窗内图与列表缩略图尽量同一 URL，避免再下一份大图。
5. **包体：** 占位图放小体积本地资源；货架图全走 CDN，不打进小程序包。

---

## 六、弱网

1. 目录与详情请求超时（装扮接口 15s，见 FAULT）；失败提示重试，停留当前页。
2. 先渲染缓存列表，再静默更新；新数据到达后补页，尽量保持滚动位置。
3. 图失败占位，不阻塞滚动和启用。
4. 启用时若该 id 的 `style_json` 尚未取到：先按 id 记下配置（本地立刻「已启用」），样式待拉取成功再 hydrate；超时则默认皮 + 可重试，不回滚用户选中的 id。

---

## 七、监控与埋点

只报性能与故障，**无**昵称、手机、邮箱、头像、账号 id、openid。设备只用分档，不用机型串、不用 IDFA。

| 事件 | 时机 | 参数（字符串） |
| --- | --- | --- |
| `theme_perf_list_ready` | 首屏列表可交互 | `platform`，`ready_ms`，`from_cache`（cache/network），`item_count`，`device_tier`（low/mid/high） |
| `theme_perf_scroll` | 列表滑动抽样（约 2s 一次，可采样） | `fps_bucket`（lt30 / 30to50 / gt50），`virtual`（0/1） |
| `theme_perf_style` | hydrate 结束 | `hydrate_ms`，`layer_count` |
| `theme_perf_error` | 捕获异常 | `error_kind`：`render` / `style_json` / `image`，`item_id`（可空） |

`device_tier`：H5 可用 `navigator.deviceMemory`（≤2 为 low）；小程序可用性能等级 / 基准分。低端档：默认关卡片动效、预览简化（仍可开预览，减少模拟块数量）。

告警（运营侧，非 C 端 Toast）：低端档 `ready_ms` 持续偏高、`style_json` 错误率、小程序 `theme_perf_error` 突增。采样以免刷量；错误事件全量。

---

## 八、必须避开的坑

1. **不要把完整 `style_json` 写入 localStorage / 小程序 storage。** 货架缓存只存 id 与展示字段。样式从 `GET /themes/{id}/`、`GET /decorations/{id}/` 取，命中内存 LRU。
   现网内置清单仍可能整表进 `theme_cache`（含样式）；接上分页目录接口后按本节收口。
2. **历史搭配只存 id：** `global_theme_id` + `decoration_map` / `decoration_ids`，不存各件 `style_json`。应用时现解析；绝版件跳过（容错文档）。
3. **实时预览用独立沙盒**（`ThemeLivePreview` 模拟首页罐头流 / 个人中心 / 评论区 / 话题卡）。点「立即应用」前不调用面向真实页的 `applyOutfitStyle`。取消/关闭销毁实例。
4. 不要为预览预加载全部货架大图。
5. 不要用 `reLaunch` 换主题来「清内存」。
6. 监控事件不要带用户配置全文、不要带完整 `style_json`。

---

## 现状对照（不是开工指令）

| 约定 | 现网 |
| --- | --- |
| 分页 20、虚拟列表 >50 | 内置全量清单，页内一次渲染；目录未过 50 不上虚拟列表 |
| 缩略图 / 大图 / 海报分离 + WebP | 列表 `lazy-load` + `cover_img`；WebP 转码属三期后台 |
| 样式变量 + 解析失败回退 | 已落地；`flattenStyleJson` 内存 LRU 32 |
| 启用防抖、预览 abort | 已有；`ThemeLivePreview` `v-if` |
| 搭配/当前配置存 id | 已是 |
| 目录缓存不含 style_json | `theme_cache` / `decoration_cache` 写入前剥掉 `style_json` |
| `catalog_version` | 变化则丢目录缓存与 style LRU |
| 性能事件 | `theme_perf_list_ready` / `theme_perf_style` / `theme_perf_error` 已接；`theme_perf_scroll` 随三期虚拟列表 |

---

## 验收

- 目录 100+ 条时列表可滑，低端机不因一次铺全卡而明显卡死或闪退。（当前内置清单未到此量，三期闸门）
- 列表只出缩略图；详情才出大图；失败有占位。
- 连续点启用只看到最后一次皮；损坏 JSON 回退默认且页面仍可用。
- 弱网能先看缓存列表；配置 id 不丢。
- 后台改版本后，下次进入目录会换新数据，不长期展示已下架为「可用」。
- 小程序关预览后无残留预览层；原生栏无样式注入。
- 性能事件可在报表里看到首屏耗时与 `style_json` 错误，且无 PII。

## 后续（不在本期）

智能预加载、C 端自建 CDN、按机型千人千面、滚动 fps 与虚拟列表一起做。
