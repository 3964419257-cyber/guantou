# 主题中心埋点统计方案

**文档状态：** 独立拆分（一期进入/切 Tab/启用；完整事件在二期验收；看板导出属三期）  
**产品：** 乡声集盒 · 主题中心 · 全链路数据埋点  
**对应实现：** `frontend/src/services/themeAnalytics.js`；热度计数另走 `POST /users/theme/events/`（SECURITY 去重）

乡声集盒主题中心记录用户浏览、筛选、收藏、分享、预览、启用与获取装扮等行为。H5 与小程序 **事件名、字段、触发逻辑一致**。只统计行为，不采集昵称、手机号、邮箱、头像、账号 id、openid、visitor_id 等隐私字段。待上线、已绝版装扮同样记录浏览与详情进入。总览见 [`THEME_CENTER.md`](THEME_CENTER.md)。分期交付见 [`THEME_CENTER_ROADMAP.md`](THEME_CENTER_ROADMAP.md)。跳转链路见 [`THEME_CENTER_NAV.md`](THEME_CENTER_NAV.md)。性能事件见 [`THEME_CENTER_PERF.md`](THEME_CENTER_PERF.md)。预览分层见 [`THEME_CENTER_PREVIEW.md`](THEME_CENTER_PREVIEW.md)。搜索筛选见 [`THEME_CENTER_SEARCH.md`](THEME_CENTER_SEARCH.md)。四维权限见 [`THEME_CENTER_PRIVILEGE.md`](THEME_CENTER_PRIVILEGE.md)。收藏分享热度见 [`THEME_CENTER_SOCIAL.md`](THEME_CENTER_SOCIAL.md)。历史搭配见 [`THEME_CENTER_MIX.md`](THEME_CENTER_MIX.md)。空态标识见 [`THEME_CENTER_STATUS.md`](THEME_CENTER_STATUS.md)。双端存储与同步见 [`THEME_CENTER_SYNC.md`](THEME_CENTER_SYNC.md)。越权 / 429 等风控日志不上报分析 SDK，见 [`THEME_CENTER_SECURITY.md`](THEME_CENTER_SECURITY.md)。运营看板见 [`THEME_CENTER_ADMIN.md`](THEME_CENTER_ADMIN.md)（三期）。容错提示见 [`THEME_CENTER_FAULT.md`](THEME_CENTER_FAULT.md)。标准化数据结构（独立拆分）见 [`THEME_CENTER_DATA.md`](THEME_CENTER_DATA.md)。

需求原文若要求 C 端带「用户唯一标识」、卡片进可视区另开曝光事件、Excel 实时看板、分享取消计入热度，规划仍以 ROADMAP / SECURITY / ADMIN 为准。**UV 用服务端 visitor / 登录会话聚合，不上报账号。** 卡片曝光用滚动 `item_ids` + 打开详情，不另做 IntersectionObserver。看板与导出不在本期。不要另做一套事件名或把 `like_count` 写进客户端事件。

对外文案不用「作品」「短视频」。埋点里的中文枚举是报表展示，不是第四套权限名。

## 分期范围

| 现在做 | 不做（三期 / 需求原文不采用） |
| --- | --- |
| 已有事件目录（进入、Tab、详情、滚动、筛选、搜索、热搜、收藏、分享渠道、预览、启用、获取、搭配保存/应用、重置、覆盖开关、空态、环境/失效、性能） | 用户 id / openid / visitor_id 进 C 端事件 |
| `theme_center_leave`：`dwell_ms`（hide 上报，无账号） | 卡片进可视区独立曝光事件（沿用滚动 `item_ids` + 详情） |
| `theme_mix_manage`：重命名 / 删除 | 分享取消、预览关闭另开热度事件 |
| `theme_fault`：sync / rate / mix_cap（短窗去重） | Excel、日周月榜、异常预警中台（ADMIN 三期） |
| 内存队列 200；hide 写入 ephemeral storage，**不二次打** gtag/wx | 离线批量补发导致双计；用户路径还原、偏好画像、ROI |
| `region_tag` 随详情/启用，方言偏好用该字段聚合 | 方言主题另做一套事件名 |
| 触发即上报、失败静默；滚动 400ms 节流 | 阻塞渲染的同步上报 |

一期只需进入、切 Tab、启用。二期收口完整事件。报表后台按三期。

## 上报通道

| 端 | `platform` | 上报方式 |
| --- | --- | --- |
| H5 网页 | `h5` | Web 埋点：内存队列 + 可选 `window.gtag`；若注入 `window.themeAnalyticsEndpoint` 则 `navigator.sendBeacon` |
| 微信小程序 | `miniprogram` | 小程序埋点：优先 `wx.reportEvent`，否则 `uni.report` |

所有事件参数都会压成字符串（微信自定义分析要求）。列表类字段用逗号拼接，单值最长 256 字。

## 事件一览

### 页面访问

| 事件 | 时机 | 参数 |
| --- | --- | --- |
| `theme_center_enter` | 进入主题中心（`onShow`） | `platform`，`logged_in`（`logged` / `guest`），`theme_id`（当前全局主题） |
| `theme_center_leave` | 离开主题中心（`onHide`） | `dwell_ms`（本次停留，上限 24h；不足 300ms 不上报） |
| `theme_tab_switch` | 切换 Tab | `tab`：全局主题 / 局部装扮 / 我的装扮；二期起可有 我的收藏 |
| `theme_item_enter_detail` | 打开详情弹窗 | `item_id`，`item_type`（全局主题 / 局部装扮），`access_type`，`region_tag`，`dress_category`，`catalog_status` |

待上线、已绝版也会上报 `theme_item_enter_detail`。`access_type` 为报表展示文案（免费 / 会员专属 / 活动限定 / 创作者专属），对应契约 `privilege_type`。`catalog_status` 为可用 / 待上线 / 已绝版，对应 `available` / `coming` / `deprecated`。`item_type` 上报「全局主题」「局部装扮」，对应 `theme` / `decoration`。

搜索、我的装扮汇总、历史搭配 **不另开路由**（NAV）：`searching=1` 走 `theme_search`；`tab=mine` 走 `theme_tab_switch`。不要发明 `theme_outfit_enter` / `theme_search_page`。

### 浏览、筛选、搜索

| 事件 | 时机 | 参数 |
| --- | --- | --- |
| `theme_list_scroll` | 列表滚动（约 400ms 节流） | `item_ids`，`scroll_top`，当前权限/风格/装扮分类/方言地域标签/排序 |
| `theme_filter_click` | 筛选面板点确定 | 选中的权限、风格、装扮分类、方言地域标签、排序 |
| `theme_search` | 提交搜索 | `keyword`，`result_count` |
| `theme_hot_search_click` | 点击热门搜索词 | `keyword` |

### 交互操作

| 事件 | 时机 | 参数 |
| --- | --- | --- |
| `theme_collect_click` | 收藏 / 取消收藏 | `item_id`，`item_type`，`collect_state`（收藏 / 取消收藏） |
| `theme_share_click` | 选择分享渠道 | `item_id`，`share_channel` |
| `theme_preview_click` | 大图预览或实时模拟预览 | `item_id`，`preview_type`（大图预览 / 实时模拟预览） |
| `theme_apply_click` | 启用 / 应用 | `item_id`，`item_type`，`from_history`（最近使用复用为 `1`），`is_mix`，`apply_result`（成功启用 / 权限不足 / 环境不支持），必要时 `permission_type` |
| `theme_get_click` | 去开通会员 / 参与活动 / 完成创作者任务 | `item_id`，`get_method`（会员 / 活动 / 创作者任务） |
| `theme_save_mix` | 保存历史搭配 | `mix_id`，`theme_id`，`dress_ids` |
| `theme_mix_manage` | 重命名或删除历史搭配 | `mix_id`，`mix_action`（重命名 / 删除） |
| `theme_apply_mix` | 一键应用历史搭配 | `mix_id`，`has_unavailable`（是否含绝版或环境不支持） |
| `theme_reset_all` | 重置全部装扮 | 重置前 `theme_id`，`dress_count` |
| `theme_switch_conflict` | 全局主题覆盖局部装扮开关 | `overlay`（开启 / 关闭） |

分享渠道：

- H5：`APP私信`、`微信`、`复制链接`、`保存海报`
- 小程序：`APP私信`、`小程序转发`、`保存海报`（不上报复制链接）

### 异常行为

| 事件 | 时机 | 参数 |
| --- | --- | --- |
| `theme_unsupported_env` | 当前端不支持该装扮仍被点击 | `item_id`，`platform` |
| `theme_apply_invalid_item` | 尝试应用已绝版或未上线装扮 | `item_id`，`item_status`（已绝版 / 已下架） |
| `theme_empty_show` | 空态 / 目录失败态露出 | `scene`（货架空 / 搜索无命中 / 筛选无命中 / 收藏空 / 最近使用空 / 历史搭配空 / 目录失败 / 分类待上线 / 未设局部） |
| `theme_empty_click` | 点空态按钮 | `scene`，`empty_action`（重试 / 重置 / 去挑选 / 保存当前搭配 / 返回列表 / 去搭配） |
| `theme_fault` | 同步失败、429、搭配满 10 | `fault_kind`：`sync` / `rate` / `mix_cap`（同一 kind 短窗去重） |

### 性能（无 PII）

字段与分档见 [`THEME_CENTER_PERF.md`](THEME_CENTER_PERF.md)。`theme_perf_list_ready`、`theme_perf_style`、`theme_perf_error` 已接；`theme_perf_scroll` 随三期虚拟列表。

## 后台报表指标

1. 主题中心 PV / UV；各 Tab 访问占比（`theme_center_enter` + `theme_tab_switch`）。
2. 各主题 / 装扮的浏览、收藏、分享、启用转化（详情 → 收藏 / 分享 / `theme_apply_click` 成功启用）。
3. 按 `region_tag` 看方言地域装扮热度，判断哪一类乡音装扮更受欢迎。
4. 会员装扮、创作者专属装扮的点击与转化（`access_type` + `theme_get_click` / `theme_apply_click`）。
5. 历史搭配保存量（`theme_save_mix`）与一键应用频次（`theme_apply_mix`）。
6. 小程序不支持装扮的点击占比（`theme_unsupported_env` / `apply_result=环境不支持`），用于评估兼容或下线优先级。
7. 最近使用复用率：`theme_apply_click` 且 `from_history=1` 的成功启用，相对全局/局部 Tab 访问。点卡片进详情走 `theme_item_enter_detail`，列表滚动带当前可见 `item_ids`，**不另开**卡片曝光事件。
8. 停留：`theme_center_leave.dwell_ms`。方言偏好：`region_tag`（川渝等 DATA 七项），不要用「川渝烟火」当标签值。

运营看板的筛选时间（今日 / 近 7 天 / 近 30 天）、角色与只读用户数据、Excel 导出见 [`THEME_CENTER_ADMIN.md`](THEME_CENTER_ADMIN.md)（三期）。C 端埋点本身即可验收，不拦在看板上。

性能：`theme_perf_list_ready`、`theme_perf_scroll`、`theme_perf_style`、`theme_perf_error`（无 PII，设备只分 low/mid/high）。低端机告警与采样规则见性能文档。

热度、点赞、分享次数以服务端去重累加为准，客户端事件 **不得** 上报 `like_count` / `share_count` 增量。防刷见 [`THEME_CENTER_SECURITY.md`](THEME_CENTER_SECURITY.md)。

## 产品使用建议

1. 用方言地域与装扮分类热度，优先迭代用户真正喜欢的乡音主题和局部装扮。
2. 持续看小程序不支持装扮的点击量，评估是否做兼容，或从货架下线。
3. 观察历史搭配的保存与一键应用率，判断该能力是否需要强化入口或引导。

分享点渠道才报 `theme_share_click`（会进服务端热度去重）；关分享面板不报，避免刷 `share_count`。预览关闭不另报。

## 队列与边界

- 内存最多 200 条；`onHide` 写入 `ui_theme_analytics_queue`（ephemeral，换号/配额会清）。
- 再次进入只把队列读回内存，**不**再打 gtag / `wx.reportEvent` / `postThemeEvent`，以免双计。
- 空态同一 scene、同一 `fault_kind` 短窗去重。
- `POST /users/theme/events/` 只用于服务端去重账本（分享等），失败静默；限流 60 次/分钟见 SECURITY。

## 现状对照

| 约定 | 现网 |
| --- | --- |
| 双端同一事件名 | `themeAnalytics.js` + `platform` |
| 无 PII | `stripPrivacy` 丢弃账号字段 |
| 一期进入/Tab/启用 | 已接；二期事件已大部分接线 |
| 停留、搭配改删、fault | `theme_center_leave` / `theme_mix_manage` / `theme_fault` |
| 看板 Excel / 卡片 IntersectionObserver | **不做** |

## 后续（不在本期）

用户行为路径还原、装扮偏好画像与智能推荐、埋点暴跌预警、会员转化 ROI。投稿提交/审核事件见 [`THEME_CENTER_UGC.md`](THEME_CENTER_UGC.md)，三期入口上线前 **不上报**。兑换 / 复刻 / 榜单事件见 [`THEME_CENTER_ECO.md`](THEME_CENTER_ECO.md)，同样未上线不上报。
