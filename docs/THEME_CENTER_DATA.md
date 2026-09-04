# 主题中心数据结构与存储架构

**文档状态：** 独立拆分（一期 MVP 底层核心；字段名、枚举与 C 端接口以本文为准）
**产品：** 乡声集盒 · 主题中心 · 标准化数据结构
**对应实现：** `backend/guantou/themes/models.py`、`serializers.py`、`views.py`；前端 `frontend/src/services/themeSchema.js`、`themeCenter.js`、`themeFault.js`

本文只定 **字段名、枚举、模型、接口路径、空值兜底与版本兼容**。H5 与微信小程序解析同一套字段，终端差异由前端按 `support_terminal` 判断。同步时机与换号见 [`THEME_CENTER_SYNC.md`](THEME_CENTER_SYNC.md)。失败 Toast 见 [`THEME_CENTER_FAULT.md`](THEME_CENTER_FAULT.md)。启用校验与账号隔离见 [`THEME_CENTER_SECURITY.md`](THEME_CENTER_SECURITY.md)。热度计数见 [`THEME_CENTER_SOCIAL.md`](THEME_CENTER_SOCIAL.md)。埋点事件名见 [`THEME_CENTER_ANALYTICS.md`](THEME_CENTER_ANALYTICS.md)。后台 CMS 与定时见 [`THEME_CENTER_ADMIN.md`](THEME_CENTER_ADMIN.md)。目录缓存与 `catalog_version` 见 [`THEME_CENTER_PERF.md`](THEME_CENTER_PERF.md)。

相关文档：总览 [`THEME_CENTER.md`](THEME_CENTER.md)，我的装扮汇总 [`THEME_CENTER_OUTFIT.md`](THEME_CENTER_OUTFIT.md)，历史搭配 [`THEME_CENTER_MIX.md`](THEME_CENTER_MIX.md)，三层预览 [`THEME_CENTER_PREVIEW.md`](THEME_CENTER_PREVIEW.md)，最近使用 [`THEME_CENTER_RECENT.md`](THEME_CENTER_RECENT.md)，搜索筛选 [`THEME_CENTER_SEARCH.md`](THEME_CENTER_SEARCH.md)，四维权限 [`THEME_CENTER_PRIVILEGE.md`](THEME_CENTER_PRIVILEGE.md)，收藏分享热度 [`THEME_CENTER_SOCIAL.md`](THEME_CENTER_SOCIAL.md)，空态标识 [`THEME_CENTER_STATUS.md`](THEME_CENTER_STATUS.md)，双端存储与同步 [`THEME_CENTER_SYNC.md`](THEME_CENTER_SYNC.md)，容错 [`THEME_CENTER_FAULT.md`](THEME_CENTER_FAULT.md)，埋点 [`THEME_CENTER_ANALYTICS.md`](THEME_CENTER_ANALYTICS.md)，分期 [`THEME_CENTER_ROADMAP.md`](THEME_CENTER_ROADMAP.md)，跳转 [`THEME_CENTER_NAV.md`](THEME_CENTER_NAV.md)，后台 [`THEME_CENTER_ADMIN.md`](THEME_CENTER_ADMIN.md)，性能 [`THEME_CENTER_PERF.md`](THEME_CENTER_PERF.md)，安全 [`THEME_CENTER_SECURITY.md`](THEME_CENTER_SECURITY.md)，用户投稿（三期）[`THEME_CENTER_UGC.md`](THEME_CENTER_UGC.md)，商业化生态（三期）[`THEME_CENTER_ECO.md`](THEME_CENTER_ECO.md)。

需求原文若把排序权重、综合热度、用户配置增量版本、收藏资源快照、四套资源状态、热搜/空态文案 CMS、最近使用独立表、每模型 `extra` 垃圾袋写成一期闸门，规划仍以 ROADMAP / SYNC / ADMIN / ANALYTICS 为准。**字段以本文 JSON 为准，不要另写 `THEME_CENTER_SCHEMA.md`。** 前端内部可用 `access` / `kind`，对外接口和后台只用契约名。

对外文案不用「作品」「短视频」。空态 / Toast 已落地句不得改。

## 分期范围

| 现在做 | 不做（三期 / 需求原文不采用） |
| --- | --- |
| 主题 / 装扮目录、当前配置、收藏、搭配、权益、目录版本、事件入库 | `sort_weight`、`is_recommended`、曝光量、综合 `heat_score` |
| `status` 三值：`coming` / `available` / `deprecated`（下架与绝版同一值） | 第四套「已上线 / 已下架 / 已绝版」拆开 |
| 热度 = `like_count` + `collect_count` + `share_count`；列表 `sort=heat` | 独立曝光/启用计数字段 |
| `support_terminal`：`h5` \| `miniprogram` | `is_h5` / `is_mp` 布尔；目录里的降级提示文案（FAULT 固定句） |
| 活动窗 `activity_start_at` / `activity_end_at`；`create_time` | 另开上线时间、绝版时间、用户配置 `config_version` |
| 配置全量 `PUT /users/theme/config/`；`catalog_version` 管目录缓存 | 增量同步协议、按用户配置版本号拉 diff |
| 最近使用嵌在 `recent_use_list`（最多 8） | 最近使用独立表 |
| 收藏：有行即收藏，`DELETE` 删行；展示 hydrate 目录 | 取消收藏状态行、收藏时资源快照 |
| 搭配只存 id + 覆盖开关；满 10 拦截；应用时跳过失效件 | 自定义备注、排序序号、失效 id 列表、最后应用时间 |
| 权益 `is_member` / `creator_unlocked` / `activity_ids`；C 端不回 `user_id` | 私有数据 payload 带账号 |
| 标签取值见本文枚举；`clean_catalog_item` 拦非法 JSON | 标签字典表、热搜/空态/分享文案 CMS（ADMIN 三期） |
| `ThemeEventLog` 收 C 端事件；热度走 SOCIAL 计数 | 转化率/偏好聚合表、看板（ANALYTICS / ADMIN 三期） |
| 新列默认空值；未知键写入时丢弃 | 每模型预留 `extra` JSON 垃圾袋 |

一期必须能换主题、换核心装扮、配置能存住：目录字段、`user_current_config`、列表不下发 `style_json` 是闸门。收藏 / 搭配 / 权益字段二期业务才对用户承诺，但模型与序列化已经按本文落地，不要再改名。

## 原则

1. **一套字段两端解析。** 差异只看 `support_terminal` 和前端是否注入原生 nav/tab，不另开 H5 / 小程序两套 schema。
2. **命名唯一。** `privilege_type` 不是 `access`；`activity` 不是 `event`（后者仅前端内部）。`item_type` 只有 `theme` \| `decoration`。
3. **状态三值够用。** `deprecated` 覆盖已下架与已绝版；前端用 `removed` / `ended` 只是内部映射。
4. **私有数据按 token 隔离。** C 端配置 / 收藏 / 搭配 / 权益响应 **不带** `user` / `user_id`。
5. **客户端不能写权威元数据。** PUT 配置忽略 `style_json`、计数、`privilege_type`、会员标记。
6. **缺字段兜底，不白屏。** 字符串缺省 `""`，列表 `[]`，对象 `{}`，计数 `0`。活动时间非活动件可为 JSON `null`。缺 `theme_id` / `decoration_id` 的行丢弃；缺名称前端显示「装扮」。
7. **拓展加列，不加垃圾袋。** 后续投稿 / 碎片 / 搭配复刻新开模型或新列，默认空，旧客户端忽略未知键。

```text
公开目录 GET /themes/ /decorations/
  → 列表无 style_json + catalog_version
  → 详情才带 style_json
登录私有 GET/PUT /users/theme/*
  → 只当前 token 的行
  → 不回 user_id
写配置 PUT 全量
  → 只信 id 与覆盖开关
  → 样式由服务端读目录
```

---

## 一、整体架构

| 层 | 职责 |
| --- | --- |
| 服务端 | 主题/装扮元数据、收藏、搭配方案、当前生效配置、权益、目录版本、事件日志 |
| H5 | `localStorage` 本地缓存与降级；登录后同步 |
| 微信小程序 | `uni.setStorageSync` 本地缓存与降级；登录后同步 |
| 渲染 | 读 `style_json`，注入 CSS 变量；小程序原生 nav/tab **跳过** |
| 降级 | 列表请求失败用缓存；`style_json` 损坏回退系统默认 |

登录账号的权威数据在云端 `user_current_config`。未登录、或同步失败时使用 `local_current_config`。

```text
进入主题中心
  ├─ 已登录 → GET /users/theme/config/ ，失败则读 local_current_config
  └─ 未登录 → 只读 local_current_config，不上报
启用/收藏/保存搭配
  ├─ 先写本地（H5 / 小程序 storage）
  └─ 已登录再排队同步云端；失败后台重试
```

## 二、标准化枚举

### 终端 `support_terminal`

`h5` | `miniprogram`。当前环境不在列表中则卡片置灰。小程序原生导航栏、原生 tabBar 即使列表包含 `miniprogram` 也不注入样式。不要拆成 `is_h5` / `is_mp`。

### 权限 `privilege_type`

| 契约值 | 前端内部 `access` | 含义 |
| --- | --- | --- |
| `free` | `free` | 免费 |
| `member` | `member` | 会员专属 |
| `activity` | `event` | 活动限定 |
| `creator` | `creator` | 方言创作者专属 |

筛选、展示、接口一律用契约值 `activity`，不要再发明第四套权限名。

### 状态 `status`

| 契约值 | 含义 | 与旧筛选映射 |
| --- | --- | --- |
| `available` | 可用 | `usable` |
| `coming` | 待上线 | `upcoming` |
| `deprecated` | 已下架 / 已绝版 | `ended` / `removed` |

资源下架或绝版只改 `status`，**不删** 用户配置、收藏、搭配行；前端停渲染并提示，见 [`THEME_CENTER_PRIVILEGE.md`](THEME_CENTER_PRIVILEGE.md)、[`THEME_CENTER_FAULT.md`](THEME_CENTER_FAULT.md)。

C 端 DTO：`coming` → `available=false`；`deprecated` → `available=true` 且 `eventStatus=ended`（与内置绝版包一致，**可收藏不可启用**），不要把绝版再映射成待上线。

### 方言地域 `dialect_tags`

存展示文案，取值只能是：`川渝`、`江南吴语`、`岭南粤韵`、`闽台闽南`、`北方晋陕`、`湘楚潇湘`、`云贵滇黔`。内部筛选码仍用 `chuankiang` / `wuyu` / `yue` / `minnan` / `jinshan` / `xiangchu` / `yungui`。不是运营 CMS 标签表；字典变更走发版，见 [`THEME_CENTER_ADMIN.md`](THEME_CENTER_ADMIN.md)。

### 风格 `style_tags`

全局主题：`简约`、`地域方言风`、`复古`、`赛博`、`国风`、`市井烟火`、`节日限定`、`节日风俗`、`季节时令`、`二次元`、`极简暗色`。
局部装扮另可含：`导航栏`、`底部Tab`、`交互按钮`、`罐头卡片`、`个人主页`、`头像挂件`、`评论区`、`话题卡片`、`弹窗输入框`。

### 组件 `component_type`

`nav_bar` | `tab_bar` | `button` | `card` | `home_bg` | `avatar_frame` | `comment_bubble` | `topic_card` | `input_box`

原生不可装扮：`nav_bar`、`tab_bar`（仅小程序跳过渲染）。一个 `component_type` 同时只生效一件局部装扮。

## 三、全局主题 `theme_item`

对应模型 `ThemeItem`。主键 `theme_id`。

```json
{
  "theme_id": "chuankiang",
  "name": "川渝烟火",
  "desc": "巴蜀市井热辣风格",
  "cover_img": "dialect",
  "detail_img": "",
  "poster_img": "",
  "style_json": {
    "accent": "pine",
    "primaryLook": "fill",
    "ghostLook": "line",
    "effect": "none"
  },
  "style_tags": ["地域方言风"],
  "dialect_tags": ["川渝"],
  "privilege_type": "free",
  "get_condition": "免费启用",
  "activity_start_at": null,
  "activity_end_at": null,
  "status": "coming",
  "support_terminal": ["h5", "miniprogram"],
  "create_time": 0,
  "like_count": 0,
  "collect_count": 0,
  "share_count": 0
}
```

`style_json` 里的外观字段对应主题 token（`accent` / `primaryLook` / `ghostLook` / `effect`），不要在页面里写死色值。列表接口 **不下发** `style_json`，详情才带。

`detail_img`、`poster_img` 缺省用 `cover_img`。`activity_start_at` / `activity_end_at` 仅 `privilege_type=activity` 使用（ISO 时间，非活动件为 `null`）；后台定时与校验见 [`THEME_CENTER_ADMIN.md`](THEME_CENTER_ADMIN.md)。

`create_time` 服务端为 ISO 日期时间；前端 DTO 可用毫秒时间戳或原字符串，缺省 `0`。不要另加 `update_time` / `online_at` / `eol_at` / `sort_weight`。

## 四、局部装扮 `decoration_item`

对应模型 `DecorationItem`。主键 `decoration_id`。

```json
{
  "decoration_id": "avatar-frame",
  "name": "青瓦圆框",
  "desc": "头像外加一圈青瓦框。",
  "cover_img": "avatar",
  "detail_img": "",
  "poster_img": "",
  "style_json": {
    "borderColor": "var(--accent-color)",
    "borderWidth": "4px",
    "borderRadius": "50%",
    "shadow": "0 0 8px var(--accent-color)"
  },
  "component_type": "avatar_frame",
  "group": "avatar",
  "style_tags": ["头像挂件"],
  "dialect_tags": ["江南吴语"],
  "privilege_type": "free",
  "get_condition": "",
  "activity_start_at": null,
  "activity_end_at": null,
  "status": "coming",
  "support_terminal": ["h5", "miniprogram"],
  "create_time": 0,
  "like_count": 0,
  "collect_count": 0,
  "share_count": 0
}
```

`group` 是 C 端货架分组（如 `navbar` / `cards`），**不是** 第二套 `component_type`。渲染与 `decoration_map` 的 key 一律用 `component_type`。

导航栏、Tab 栏装扮：`support_terminal` 仅为 `["h5"]`（小程序原生栏无法自定义）。缺省样式由前端系统默认 token 兜底，不另存 `fallback_style_json`。动效若有，放在该件 `style_json` 里，不另开资源表。

## 五、收藏 `user_collect`

对应模型 `UserThemeCollect`。有行即有效收藏；取消是 `DELETE`，不留「已取消」行，不存资源快照（名称/封面始终 hydrate 当前目录）。

```json
{
  "collect_list": [
    {
      "item_id": "default",
      "item_type": "theme",
      "collect_time": 1710000000000
    },
    {
      "item_id": "cards-plain",
      "item_type": "decoration",
      "collect_time": 1710000000000
    }
  ]
}
```

`item_type` 只能是 `theme` | `decoration`。收藏不是解锁。**新增收藏：** `coming` 禁止（409，FAULT/SOCIAL 已落地句「待上线装扮暂不支持收藏」）；`available` 与 `deprecated` 可以。已收藏后资源改成 `coming` / `deprecated`，行仍保留，前端按 STATUS 标失效，不级联删除。

## 六、历史搭配 `user_saved_mix`

对应模型 `UserThemeMix`。最多 **10** 套。`mix_name` 1～20 字，存纯文本（安全文档：剥 HTML）。只存 id，不存 `style_json`。服务端超限 409 `mix_cap`，组合重复 409 `mix_dup`。

```json
{
  "mix_id": "outfit-1",
  "mix_name": "川渝全套搭配",
  "global_theme_id": "default",
  "decoration_ids": ["cards-plain", "actions-plain"],
  "decoration_map": {
    "card": "cards-plain",
    "button": "actions-plain"
  },
  "is_cover_local_decoration": true,
  "create_time": 1710000000000
}
```

`decoration_map` 的 key 必须是 `component_type`。应用时按 map 还原；`decoration_ids` 便于列表展示。`is_cover_local_decoration` 与当前配置同名，保存 / 应用时一并还原覆盖开关。绑定资源下架后 **不删方案**；一键应用时跳过失效件，见 [`THEME_CENTER_MIX.md`](THEME_CENTER_MIX.md)、[`THEME_CENTER_FAULT.md`](THEME_CENTER_FAULT.md)。不要存备注、排序序号、失效 id 列表、最后应用时间。

## 七、当前生效配置 `user_current_config`

对应模型 `UserThemeConfig`。一行一账号。`updated_at` 仅服务端冲突/审计用，**不**出现在 C 端 JSON。没有 `config_version`；增量同步见 SYNC：全量 PUT。

```json
{
  "global_theme_id": "default",
  "decoration_map": {
    "nav_bar": "navbar-plain",
    "button": "actions-plain",
    "card": "cards-plain"
  },
  "is_cover_local_decoration": true,
  "recent_use_list": [
    {
      "item_id": "default",
      "item_type": "theme",
      "use_time": 1710000000000
    }
  ]
}
```

最近使用最多 **8** 条，嵌在配置里，见 [`THEME_CENTER_RECENT.md`](THEME_CENTER_RECENT.md)。超限由服务端截断旧记录，不另开表。`is_cover_local_decoration` 为 true 时局部装扮 **不渲染**，但 `decoration_map` 仍保存，关掉开关后应能恢复。详见 [`THEME_CENTER_OVERLAY.md`](THEME_CENTER_OVERLAY.md)。

目录资源变为 `deprecated` 后，已写入的 id **保留**（停渲染不删），`coming` 不保留，见 SECURITY。

## 八、账号权益 `user_theme_entitlement`

对应模型 `UserThemeEntitlement`。C 端 `GET /users/theme/entitlement/`：

```json
{
  "is_member": false,
  "creator_unlocked": false,
  "activity_ids": []
}
```

不回 `user` / `user_id`。领取走 `POST /users/theme/entitlement/`，body `{ item_type, item_id }`。校验与过期见 [`THEME_CENTER_PRIVILEGE.md`](THEME_CENTER_PRIVILEGE.md)。客户端不得用该接口伪造会员。

## 九、目录版本 `catalog_version`

单例 `CatalogVersion`。列表响应顶层整数，用于本地 `theme_cache` / `decoration_cache` 失效，见 [`THEME_CENTER_PERF.md`](THEME_CENTER_PERF.md)。**不是** 用户配置版本，不能拿它做增量 PUT。

运营改目录（上下架、改 `style_json`、改终端）后 bump。C 端发现版本变化则丢弃列表缓存，再拉列表；已启用配置仍按 id 生效，缺件走 FAULT 兜底。

## 十、埋点入库 `ThemeEventLog`

`POST /users/theme/events/` 落库字段：`event_name`、`item_id`、可选关联用户（服务端从 token 取，C 端 body **禁止** `user_id` / `visitor_id`）。事件名与参数见 [`THEME_CENTER_ANALYTICS.md`](THEME_CENTER_ANALYTICS.md)。热度展示仍用目录上的 `like_count` / `collect_count` / `share_count`，不在本文另造转化率表。

## 十一、本地存储

H5 `localStorage` 与小程序 storage 字段名相同。

| 契约键 | 内容 | 何时使用 |
| --- | --- | --- |
| `theme_cache` | 全局主题 **列表元数据**（不含 `style_json`） | 目录失败或 TTL 内弱网 |
| `decoration_cache` | 局部装扮列表元数据（不含 `style_json`） | 同上 |
| `local_current_config` | 当前生效配置快照 | 未登录；云端失败降级 |
| `local_collect_list` | 收藏快照 | 同上 |
| `local_saved_mix` | 搭配方案快照 | 同上 |

实现上仍保留 `ui_theme_pack`、`ui_local_dress`、`ui_theme_overlay_local`、`ui_theme_recent`、`ui_theme_query`、`ui_theme_search_cache` 等拆分键，每次写入配置时同步刷新上表快照。检索条件只留在本地，**不**写入 `user_current_config`。账号切换时这些键与 `ui_theme_*` 一并清空。最近使用规则见 [`THEME_CENTER_RECENT.md`](THEME_CENTER_RECENT.md)。搜索筛选见 [`THEME_CENTER_SEARCH.md`](THEME_CENTER_SEARCH.md)。

目录缓存 TTL 与 `catalog_version`、禁止把整份 `style_json` 写入本地存储，见 [`THEME_CENTER_PERF.md`](THEME_CENTER_PERF.md)。现网内置清单仍可能整表写入，接分页接口后收口。联网后合并规则见 SYNC：全量配置对齐，不另做字段级 diff。

## 十二、`style_json` 规范

- 只存样式，不存业务逻辑、接口路径、用户 id。
- 允许：CSS 变量名（`--dress-border-color`）、驼峰别名（`borderColor`）、外观 token（`accent` 等）。
- 取值优先 `var(--token)`；允许长度、`none`。禁止 `;` `{` `}` 以免注入。
- Vue / WXSS 继续引用设计 token，不写死 hex。
- 损坏或非法字段：丢弃该层，回退上一层或系统默认，Toast「装扮样式加载异常，已恢复默认」。入库前 `clean_catalog_item` 拦截，见 ADMIN / SECURITY。

小程序原生 `nav_bar` / `tab_bar`：前端过滤，不调用注入。

## 十三、渲染优先级

1. 读 `is_cover_local_decoration`。
2. **true**：只用全局主题 `style_json`，局部装扮全部跳过。
3. **false**：该 `component_type` 有局部装扮则用其 `style_json`；否则用全局主题对应字段；再没有用系统默认。
4. 当前终端不在 `support_terminal`，或小程序原生组件：跳过该层，不污染真实页面。
5. 当前账号对该层 **无启用权限**（会员过期、创作者降级、活动绝版等）：**不注入**该层样式，配置 id **保留**。见 [`THEME_CENTER_PRIVILEGE.md`](THEME_CENTER_PRIVILEGE.md)。

实现：`resolveOutfitStyle` → `applyOutfitStyle`（启动与每次保存后调用 `hydrateOutfitStyle`）。

## 十四、接口清单

无 `/api` 前缀，与现有资源路径一致。App 启动时注入 `themeApi.js` 的 catalog / config / member fetcher；单测未注入时仍走内置清单，不会对目录接口发请求。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/themes/` | 全局主题列表。Query：`keyword` `privilege_type` `style_tag` `dialect_tag` `status` `sort`（`newest` `heat` `free` `name`）`support_terminal` `page` `page_size`（默认 20，最大 200）。响应带 `catalog_version`。检索规则见 [`THEME_CENTER_SEARCH.md`](THEME_CENTER_SEARCH.md) |
| GET | `/themes/{theme_id}/` | 主题详情 |
| GET | `/decorations/` | 局部装扮列表。另支持 `component_type`；分页同 `/themes/` |
| GET | `/decorations/{decoration_id}/` | 装扮详情 |
| GET | `/users/theme/collects/` | 当前用户收藏。需登录 |
| POST | `/users/theme/collects/` | body：`{ item_id, item_type }` |
| DELETE | `/users/theme/collects/{item_id}/` | Query：`item_type` |
| GET | `/users/theme/mixes/` | 搭配列表，最多 10 |
| POST | `/users/theme/mixes/` | 新增。满 10 返回 409 `mix_cap`；组合重复 409 `mix_dup` |
| PATCH | `/users/theme/mixes/{mix_id}/` | 重命名 `mix_name`（1～20 字） |
| DELETE | `/users/theme/mixes/{mix_id}/` | 删除 |
| GET | `/users/theme/config/` | `user_current_config` |
| PUT | `/users/theme/config/` | 全量更新当前配置。只接受 id 与覆盖开关；忽略客户端 `style_json` 与计数。服务端按权益重算，见安全文档 |
| POST | `/users/theme/apply/` | `{ item_type, item_id }` 应用单件 |
| GET | `/users/theme/entitlement/` | 当前账号会员 / 创作者 / 活动领取。需登录 |
| POST | `/users/theme/entitlement/` | 领取活动 / 创作者装扮。body：`{ item_type, item_id }`。见 [`THEME_CENTER_PRIVILEGE.md`](THEME_CENTER_PRIVILEGE.md) |
| POST | `/users/theme/events/` | 埋点，字段见分析文档，无 PII |

列表响应建议：`{ results, next, count, catalog_version }`。列表项可不带 `style_json`（详情接口再给），避免一次下发上千份样式。错误：网络由客户端重试；4xx 用产品 Toast，不白屏。

路径常量：`THEME_API_PATHS`（`themeSchema.js`）。运营增删改走 `/manage/`，见后台文档，C 端不要调用。

## 十五、两端兼容

1. 每条装扮带 `support_terminal`。
2. 当前端不在列表：置灰，文案「拥有权限，但小程序环境暂不支持该装扮」或「当前小程序环境暂不支持该装扮」（FAULT 固定句，不从目录字段下发）。
3. 原生 nav/tab：有 `style_json` 也不注入。
4. 会员状态 H5 / 小程序同一账号云端一份。
5. 新增字段旧客户端忽略；未知写入键服务端丢弃。

## 十六、同步规则

游客 / 登录 / 弱网 / 换号 / 缓存生命周期的产品策略见 [`THEME_CENTER_SYNC.md`](THEME_CENTER_SYNC.md)。本节只钉接口时序与字段边界。

1. **未登录**：只写本地快照，禁止 POST/PUT 用户配置。
2. **登录进入主题中心**：拉 `GET /users/theme/config/`，再按容错文档做本地合并。有未确认游客快照时不得用云端覆盖本地。
3. **网络异常**：本地配置继续生效，`ui_theme_pack_cloud` 排队，网络恢复 flush。配置同步为全量 `PUT /users/theme/config/`，不另做增量协议。
4. **账号切换 / 登出**：清空本地主题相关键；登录再加载新账号云端配置。
5. **启用/写配置**：服务端校验存在性、状态、权益、终端；失败不落库。细节见 [`THEME_CENTER_SECURITY.md`](THEME_CENTER_SECURITY.md)。

DTO 转换：`toThemeItem` / `toDecorationItem` / `toCurrentConfig` / `toSavedMix` / `toCollectList`。

## 十七、数据联动

| 变化 | 配置 / 搭配 / 收藏 | 热度 | 权限 |
| --- | --- | --- | --- |
| 目录 `status→deprecated` | 已启用 id 保留、停渲染；搭配不删，应用跳过失效件；收藏行保留 | 计数不清零 | 过期立即不可新启用 |
| 目录 `coming` | 不得新写入配置 | — | 不可启用 |
| 用户启用 / 收藏 / 分享 | — | `collect_count` / `share_count` 等按 SOCIAL 更新；`sort=heat` 用三计数字段 | — |
| 会员过期 / 活动结束 | 配置 id 保留 | — | 权益字段即时生效，停渲染 |
| `catalog_version` bump | 本地列表缓存失效 | — | — |

不要因为资源下架物理删除用户私有行。

## 十八、空值、兼容与拓展

| 情况 | 行为 |
| --- | --- |
| 字符串缺 | `""`，不因缺 `desc` 报错 |
| 列表 / 对象缺 | `[]` / `{}` |
| 计数缺 | `0` |
| 活动时间非活动件 | JSON `null`（这是唯一允许的业务 null） |
| 非法 `style_json` | 不入库；已下发则前端丢弃该层 |
| 搭配超过 10 / 最近使用超过 8 | 拦截新增或截断旧记录 |
| 新列 | 默认空；旧客户端忽略 |
| 废弃列 | 服务端可读可不写；不在 C 端文档里继续承诺 |
| 投稿 / 碎片 / 积分 / 搭配复刻 | 三期新模型，不塞进现有 JSON。投稿草稿见 [`THEME_CENTER_UGC.md`](THEME_CENTER_UGC.md)。账本 / 公开搭配见 [`THEME_CENTER_ECO.md`](THEME_CENTER_ECO.md) |

## 十九、需求原文对照

| 需求原文 | 本文 |
| --- | --- |
| 主题排序权重、是否推荐、曝光、综合热度 | 用 `sort=newest\|heat\|free\|name` 与三计数字段 |
| 上线时间 / 绝版时间 / 更新时间（C 端） | 活动窗 + `create_time`；配置 `updated_at` 不出 C 端 |
| 已上线 / 已下架 / 已绝版 四态 | `available` / `coming` / `deprecated` |
| 是否适配 H5 / 小程序、降级文案字段 | `support_terminal` + FAULT 句 |
| 用户配置版本号、增量同步 | `catalog_version` + 全量 PUT |
| 搭配备注、排序、失效 id 列表、最后应用 | 应用时前端跳过失效件 |
| 收藏取消状态、资源快照 | DELETE 删行；hydrate 目录 |
| 最近使用独立表 | `recent_use_list` |
| 标签 / 热搜 / 文案 CMS、定时任务表 | 枚举在本文；CMS / 看板三期 ADMIN |
| 埋点聚合仓、转化率 | ANALYTICS + 事件日志；看板三期 |
| C 端 `user_id`、每模型 `extra` | 禁止 |
| 待上线可新增收藏 | `coming` 禁止；`deprecated` 可收藏不能启用 |

## 二十、验收

- 列表无 `style_json`，详情有；无 `sort_weight` / `heat_score` / `config_version` / `user_id`。
- H5 / 小程序同一套字段能渲染、置灰、降级。
- 资源绝版不删用户配置 / 收藏 / 搭配。
- 缺名称显示「装扮」；坏 JSON 回退默认，不白屏。
- 游客写配置 401；换号后看不到上一账号私有数据。
- 后续加列不必改主键与现有 JSON 形。
