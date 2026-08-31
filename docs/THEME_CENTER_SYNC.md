# 装扮双端存储与云端同步

**文档状态：** 一期 MVP（独立拆分；游客 / 登录 / 弱网 / 换号以本文 + DATA / FAULT / SECURITY 为准）  
**产品：** 乡声集盒 · 主题中心 · 存储同步底座  
**页面：** 无独立页面；所有装扮写操作走同一套本地键与云端队列

本文只定 **数据存在哪、何时上云、冲突怎么合、换号怎么清**。标准化数据结构（独立拆分）见 [`THEME_CENTER_DATA.md`](THEME_CENTER_DATA.md)。失败 Toast 与登录合并弹窗见 [`THEME_CENTER_FAULT.md`](THEME_CENTER_FAULT.md)。启用校验与越权见 [`THEME_CENTER_SECURITY.md`](THEME_CENTER_SECURITY.md)。缓存体积与目录版本见 [`THEME_CENTER_PERF.md`](THEME_CENTER_PERF.md)。全局换装见 [`THEME_CENTER_GLOBAL.md`](THEME_CENTER_GLOBAL.md)。局部装扮见 [`THEME_CENTER_DRESS.md`](THEME_CENTER_DRESS.md)。覆盖开关见 [`THEME_CENTER_OVERLAY.md`](THEME_CENTER_OVERLAY.md)。我的装扮见 [`THEME_CENTER_OUTFIT.md`](THEME_CENTER_OUTFIT.md)。预览沙盒见 [`THEME_CENTER_PREVIEW.md`](THEME_CENTER_PREVIEW.md)。最近使用见 [`THEME_CENTER_RECENT.md`](THEME_CENTER_RECENT.md)。搜索筛选见 [`THEME_CENTER_SEARCH.md`](THEME_CENTER_SEARCH.md)。四维权限见 [`THEME_CENTER_PRIVILEGE.md`](THEME_CENTER_PRIVILEGE.md)。收藏见 [`THEME_CENTER_SOCIAL.md`](THEME_CENTER_SOCIAL.md)。历史搭配见 [`THEME_CENTER_MIX.md`](THEME_CENTER_MIX.md)。空态见 [`THEME_CENTER_STATUS.md`](THEME_CENTER_STATUS.md)。分期见 [`THEME_CENTER_ROADMAP.md`](THEME_CENTER_ROADMAP.md)。

需求原文若把搭配 / 收藏云端、增量协议、多端热同步、全静默覆盖写成「一期」，规划仍以 ROADMAP 为准：一期闸门是 **生效配置 + 覆盖开关能本地留存、登录后能上云、换设备能对上、换号不串**。搭配 / 收藏 / 最近使用走同一套队列，但是 **二期承诺**（仓库已接云端也不要把它们当成一期验收项）。不要另造一套存储键或增量 PUT。

对外文案不用「作品」「短视频」。Toast 仍不超过 32 字，已落地句不得改。

## 一期范围

| 做 | 不做 |
| --- | --- |
| H5 `localStorage` 与小程序 storage **同一键名、同一合并规则** | 两端各写一套字段 |
| 游客只本地；登录禁止游客打 `POST/PUT /users/theme/*` | 未登录开云端同步 |
| 登录写操作：先本地再生效，再 300ms 防抖 `PUT /users/theme/config/` | 每次点选立刻打全量接口；另做增量 PATCH 协议 |
| 进页 / 登录后 `GET /users/theme/config/` 覆盖本地（有游客脏快照时先走 FAULT 合并，不覆盖） | 无条件云端覆盖未确认的游客 DIY |
| 断网读本地；`ui_theme_pack_cloud` 排队；`onNetworkStatusChange` 静默 flush | 断网白屏、弹同步失败阻断窗 |
| 登出 / A→B：立刻清本地主题键，再拉新账号 | 把上一账号配置留给游客 |
| 游客→登录：FAULT 三选（云端 / 本地 / 合并） | 需求原文「同步全静默、不弹窗」——合并选择必须问用户 |
| 配额满：先丢目录 / 检索等临时缓存再重试核心配置；仍失败则会话临时生效 | 为腾空间删搭配 / 收藏 / 生效 id |
| 预览沙盒不写配置、不上云 | 把预览态当生效配置同步 |

H5 / 小程序规则一致。小程序读写走 `uni.setStorageSync`，不要比 H5 更勤。

## 两层架构

| 层 | 权威 | 用途 |
| --- | --- | --- |
| 本地缓存 | 游客的唯一数据源；登录后的离线兜底 | 立刻 hydrate，不堵操作 |
| 云端 `user_current_config` | **已登录且拉取成功时**的最终权威 | 多端对齐；服务端滤无权限 id |

「在线以云端为准」只发生在 **登录且没有待合并游客快照** 的拉取成功之后。写路径永远是：本地先落地 → 排队上云 → 失败留队列，不回滚已生效的本地皮（apply 被服务端 4xx 拒绝除外，见 GLOBAL / DRESS）。

多端同时改配置：**后一次成功的全量 PUT 覆盖先一次**，不做字段级 CRDT。这是一期唯一性保证，不是实时热同步。

## 游客态

- 可换 **免费可用** 皮、改覆盖开关、预览。权限不足件仍按 [`THEME_CENTER_PRIVILEGE.md`](THEME_CENTER_PRIVILEGE.md) 拦截，不是「游客无功能限制」。
- 只写 DATA 已列本地键。换设备、清缓存、卸小程序后丢失。
- 底栏提示沿用 FAULT：「未登录状态，装扮仅保存在本地，登录后可同步到云端」。
- `captureGuestThemeSnapshot` 仅在本地相对默认皮「脏」时留下合并素材（非默认主题、已选局部、或已有搭配）。

## 已登录

1. **写：** 启用 / 关局部 / 改开关 → 本地 + `scheduleThemeCloudFlush`（300ms）。收藏 / 搭配另走 collects / mixes，失败 Toast 用已落地「操作已本地保存，同步云端失败，网络恢复后自动同步」。
2. **读：** `pullThemeCloudState`：`GET config` 后 `hydrateFromCloudConfig`；收藏 / 搭配 best-effort。`guestThemeSnapshot()` 存在则 **跳过覆盖**，等主题中心合并弹窗。
3. **flush 载荷：** 只提交 id、覆盖开关、`recent_use_list`。忽略客户端 `style_json`、热度、会员自述。检索条件即使写进本地队列对象，也 **不得** 进 `user_current_config`（SEARCH）。
4. **双端：** 同一账号 H5 / 小程序拉同一份配置。不是多设备在线互推；下次进页或网络恢复再对齐。

一期必须同步的是生效主题、`decoration_map`、覆盖开关。最近使用、收藏、搭配 **共用这套队列**，验收期次见 ROADMAP。

## 弱网 / 断网

- 渲染优先本地快照，目录失败走缓存条或 STATUS 空态，不因同步失败拆页。
- 离线操作写本地并刷新 `ui_theme_pack_cloud`。网络恢复 `flushThemeCloudQueue`，失败再留队列，不强制登出、不弹阻断窗。
- 同步失败 Toast 沿用 FAULT「装扮已本地生效，云端同步失败，稍后会自动重试」（社交写操作用 social 那句）。**不要**改成另一套「静默无提示」——用户需要知道没上云。
- 多次失败：本地继续可用，等下次联网。不要清空队列惩罚用户。

## 账号隔离

| 动作 | 行为 |
| --- | --- |
| 登出 / token 失效 | `clearUserInfo` / `afterThemeLogout` 清全部主题本地键 + 会话内存皮，hydrate 回默认。罐头草稿仍按现网登出策略保留 |
| A → B | `handleThemeAccountLogin` 发现 `ui_theme_account` 变化则先清再写新 id，再拉 B 的云端 |
| 游客 → 登录且本地脏 | FAULT：使用云端 / 使用本地 / 合并两者。合并后服务端仍滤无权限 id |
| 同一账号再登录、无游客脏快照 | 直接拉云端覆盖 |

禁止把账号 A 的搭配 / 收藏 / 生效 id 留给游客或账号 B。

## 缓存生命周期

| 类型 | 键（例） | 过期 |
| --- | --- | --- |
| 用户配置 | `ui_theme_pack`、`ui_local_dress`、`ui_theme_overlay_local`、`local_current_config`、搭配 / 收藏快照 | **不自动过期**；用户操作或换号才变 |
| 资源目录 | `theme_cache`、`decoration_cache`、`ui_theme_catalog_cache` | TTL + `catalog_version`，见 PERF |
| 检索临时 | `ui_theme_query`、`ui_theme_search_cache` | **本机保留到换号**（SEARCH），不上云、不因关页销毁 |
| 预览 | 无持久键 | 关沙盒即丢，见 PREVIEW |
| 内存 style LRU | 不进 storage | 进程结束作废 |

本地损坏 JSON：读失败当空，回默认皮或空列表，必要时再拉云端，页面不因坏缓存报错。不要用损坏的本地 `style_json` 注入真实页（本地本就不存整份货架样式）。

## 配额与性能

- 存储满：先删 ephemeral（目录缓存、检索缓存），再写核心配置。仍失败 → 会话内存生效 + FAULT「存储空间不足，无法保存装扮配置，请清理存储空间」。
- 短时间多次启用合并为一次 PUT（300ms）。覆盖开关另有本地 flush 定时。
- 一期配置同步是 **全量 PUT**，不是增量 diff 协议。收藏 / 搭配在 flush 里对 id 集合做 best-effort 补齐 / 删除，不另开第三套协议。
- 小程序避免每次滑动写 storage；只在配置变更时写。

## 安全

- 同步接口必须带当前用户身份；禁止在 path 里带他人 `user_id`。
- 本地可留权益缓存键（`ui_theme_member` 等）供展示，**启用当时仍打 apply**，不把本地标记当授权。不另做客户端加密。
- 前端不根据用户改过的本地样式自定义渲染货架；真实页只注入目录里的合法 `style_json`。
- 写配置 / apply 限流见 SECURITY。游客高频点启用只走本地 800ms 防抖，不打云端。登录态 429 保留本地已换免费皮，Toast 限流句后再排队。

## 联动

- **搭配 / 收藏 / 最近使用：** 登录后走同一账号隔离与弱网队列；规则见各分册。
- **权限：** entitlement 云端刷新；过期停渲染、不删配置 id。
- **预览：** 临时态不上云。

## 后续（不在本期）

云端备份与一键还原、多端在线热同步、用户可见同步日志、手动清资源缓存保留核心配置的设置页、增量同步协议。
