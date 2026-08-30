# 主题中心数据结构与存储架构

**文档状态：** 已落地契约层（H5 / 微信小程序）  
**对应实现：** `frontend/src/services/themeSchema.js`、`frontend/src/services/themeCenter.js`、`frontend/src/services/themeFault.js`

乡声集盒主题中心的元数据、用户配置、收藏与搭配方案，在浏览器 H5 与微信小程序使用同一套字段。样式只走 `style_json`，页面用 CSS 变量注入，不在 Vue 里写死配色。云端失败时降级本地；未登录不同步服务端。

相关文档：总览 [`THEME_CENTER.md`](THEME_CENTER.md)，容错 [`THEME_CENTER_FAULT.md`](THEME_CENTER_FAULT.md)，埋点 [`THEME_CENTER_ANALYTICS.md`](THEME_CENTER_ANALYTICS.md)，分期 [`THEME_CENTER_ROADMAP.md`](THEME_CENTER_ROADMAP.md)，跳转 [`THEME_CENTER_NAV.md`](THEME_CENTER_NAV.md)，后台 [`THEME_CENTER_ADMIN.md`](THEME_CENTER_ADMIN.md)，性能 [`THEME_CENTER_PERF.md`](THEME_CENTER_PERF.md)，安全 [`THEME_CENTER_SECURITY.md`](THEME_CENTER_SECURITY.md)。

## 一、整体架构

| 层 | 职责 |
| --- | --- |
| 服务端 | 主题/装扮元数据、收藏、搭配方案、当前生效配置 |
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

`h5` | `miniprogram`。当前环境不在列表中则卡片置灰。小程序原生导航栏、原生 tabBar 即使列表包含 `miniprogram` 也不注入样式。

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

### 方言地域 `dialect_tags`

存展示文案，取值只能是：`川渝`、`江南吴语`、`岭南粤韵`、`闽台闽南`、`北方晋陕`、`湘楚潇湘`、`云贵滇黔`。内部筛选码仍用 `chuankiang` / `wuyu` / `yue` / `minnan` / `jinshan` / `xiangchu` / `yungui`。

### 风格 `style_tags`

全局主题：`简约`、`地域方言风`、`复古`、`赛博`、`国风`、`市井烟火`、`节日限定`、`二次元`、`极简暗色`。  
局部装扮另可含：`导航栏`、`底部Tab`、`交互按钮`、`罐头卡片`、`个人主页`、`头像挂件`、`评论区`、`话题卡片`、`弹窗输入框`。

### 组件 `component_type`

`nav_bar` | `tab_bar` | `button` | `card` | `home_bg` | `avatar_frame` | `comment_bubble` | `topic_card` | `input_box`

原生不可装扮：`nav_bar`、`tab_bar`（仅小程序跳过渲染）。一个 `component_type` 同时只生效一件局部装扮。

## 三、全局主题 `theme_item`

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

`style_json` 里的外观字段对应主题 token（`accent` / `primaryLook` / `ghostLook` / `effect`），不要在页面里写死色值。

`detail_img`、`poster_img` 缺省用 `cover_img`。`activity_start_at` / `activity_end_at` 仅 `privilege_type=activity` 使用（ISO 时间）；后台定时与校验见 [`THEME_CENTER_ADMIN.md`](THEME_CENTER_ADMIN.md)。

## 四、局部装扮 `decoration_item`

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

导航栏、Tab 栏装扮：`support_terminal` 仅为 `["h5"]`（小程序原生栏无法自定义）。

## 五、收藏 `user_collect`

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

`item_type` 只能是 `theme` | `decoration`。收藏不是解锁。

## 六、历史搭配 `user_saved_mix`

最多 **10** 套。`mix_name` 1～20 字，存纯文本（安全文档：剥 HTML）。只存 id，不存 `style_json`。

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
  "create_time": 1710000000000
}
```

`decoration_map` 的 key 必须是 `component_type`。应用时按 map 还原；`decoration_ids` 便于列表展示。

## 七、当前生效配置 `user_current_config`

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

最近使用最多 **8** 条。`is_cover_local_decoration` 为 true 时局部装扮不生效。

## 八、本地存储

H5 `localStorage` 与小程序 storage 字段名相同。

| 契约键 | 内容 | 何时使用 |
| --- | --- | --- |
| `theme_cache` | 全局主题 **列表元数据**（不含 `style_json`） | 目录失败或 TTL 内弱网 |
| `decoration_cache` | 局部装扮列表元数据（不含 `style_json`） | 同上 |
| `local_current_config` | 当前生效配置快照 | 未登录；云端失败降级 |
| `local_collect_list` | 收藏快照 | 同上 |
| `local_saved_mix` | 搭配方案快照 | 同上 |

实现上仍保留 `ui_theme_pack`、`ui_local_dress`、`ui_theme_overlay_local` 等拆分键，每次写入时同步刷新上表快照。账号切换时这些键与 `ui_theme_*` 一并清空。

目录缓存 TTL 与 `catalog_version`、禁止把整份 `style_json` 写入本地存储，见 [`THEME_CENTER_PERF.md`](THEME_CENTER_PERF.md)。现网内置清单仍可能整表写入，接分页接口后收口。

## 九、`style_json` 规范

- 只存样式，不存业务逻辑、接口路径、用户 id。
- 允许：CSS 变量名（`--dress-border-color`）、驼峰别名（`borderColor`）、外观 token（`accent` 等）。
- 取值优先 `var(--token)`；允许长度、`none`。禁止 `;` `{` `}` 以免注入。
- Vue / WXSS 继续引用设计 token，不写死 hex。
- 损坏或非法字段：丢弃该层，回退上一层或系统默认，Toast「装扮样式加载异常，已恢复默认」。

小程序原生 `nav_bar` / `tab_bar`：前端过滤，不调用注入。

## 十、渲染优先级

1. 读 `is_cover_local_decoration`。
2. **true**：只用全局主题 `style_json`，局部装扮全部跳过。
3. **false**：该 `component_type` 有局部装扮则用其 `style_json`；否则用全局主题对应字段；再没有用系统默认。
4. 当前终端不在 `support_terminal`，或小程序原生组件：跳过该层，不污染真实页面。

实现：`resolveOutfitStyle` → `applyOutfitStyle`（启动与每次保存后调用 `hydrateOutfitStyle`）。

## 十一、接口清单

无 `/api` 前缀，与现有资源路径一致。App 启动时注入 `themeApi.js` 的 catalog / config / member fetcher；单测未注入时仍走内置清单，不会对目录接口发请求。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/themes/` | 全局主题列表。Query：`keyword` `privilege_type` `style_tag` `dialect_tag` `status` `sort` `support_terminal` `page` `page_size`（默认 20，最大 50）。响应带 `catalog_version` |
| GET | `/themes/{theme_id}/` | 主题详情 |
| GET | `/decorations/` | 局部装扮列表。另支持 `component_type`；分页同 `/themes/` |
| GET | `/decorations/{decoration_id}/` | 装扮详情 |
| GET | `/users/theme/collects/` | 当前用户收藏。需登录 |
| POST | `/users/theme/collects/` | body：`{ item_id, item_type }` |
| DELETE | `/users/theme/collects/{item_id}/` | Query：`item_type` |
| GET | `/users/theme/mixes/` | 搭配列表，最多 10 |
| POST | `/users/theme/mixes/` | 新增。满 10 返回 409 |
| PATCH | `/users/theme/mixes/{mix_id}/` | 重命名 `mix_name`（1～20 字） |
| DELETE | `/users/theme/mixes/{mix_id}/` | 删除 |
| GET | `/users/theme/config/` | `user_current_config` |
| PUT | `/users/theme/config/` | 全量更新当前配置。只接受 id 与覆盖开关；忽略客户端 `style_json` 与计数。服务端按权益重算，见安全文档 |
| POST | `/users/theme/apply/` | `{ item_type, item_id }` 应用单件 |
| GET | `/users/theme/entitlement/` | 当前账号会员 / 创作者 / 活动领取。需登录 |
| POST | `/users/theme/events/` | 埋点，字段见分析文档，无 PII |

列表响应建议：`{ results, next, count, catalog_version }`。列表项可不带 `style_json`（详情接口再给），避免一次下发上千份样式。错误：网络由客户端重试；4xx 用产品 Toast，不白屏。

路径常量：`THEME_API_PATHS`（`themeSchema.js`）。运营增删改走 `/manage/`，见后台文档，C 端不要调用。

## 十二、两端兼容

1. 每条装扮带 `support_terminal`。
2. 当前端不在列表：置灰，文案「拥有权限，但小程序环境暂不支持该装扮」或「当前小程序环境暂不支持该装扮」。
3. 原生 nav/tab：有 `style_json` 也不注入。
4. 会员状态 H5 / 小程序同一账号云端一份。

## 十三、同步规则

1. **未登录**：只写本地快照，禁止 POST/PUT 用户配置。
2. **登录进入主题中心**：拉 `GET /users/theme/config/`，再按容错文档做本地合并。
3. **网络异常**：本地配置继续生效，`ui_theme_pack_cloud` 排队，网络恢复 flush。
4. **账号切换**：清空本地主题相关键，加载新账号云端配置。
5. **启用/写配置**：服务端校验存在性、状态、权益、终端；失败不落库。细节见 [`THEME_CENTER_SECURITY.md`](THEME_CENTER_SECURITY.md)。

DTO 转换：`toThemeItem` / `toDecorationItem` / `toCurrentConfig` / `toSavedMix` / `toCollectList`。
