# 主题中心安全风控

**文档状态：** 独立拆分（底座随一期写接口落地；会员/活动/创作者一旦对用户开放必须带服务端校验）
**产品：** 乡声集盒 · 主题中心 · 全链路安全风控
**对应实现：** `backend/guantou/themes/services.py`、`views.py`；前端拦截 `themeCenter.js` / `themeFault.js` / `themeSchema.js`（`cleanOutfitName`、`flattenStyleJson`）

本文只定接口校验、防刷、防篡改、XSS、数据隔离和异常处理，不定 UI 稿。前端按钮置灰、防抖、非法参数拦截只是体验，**不能当授权**。抓包改 `item_id` 也必须被服务端拒绝。H5 与小程序拦截逻辑一致，不做终端差异化放行。

相关：总览 [`THEME_CENTER.md`](THEME_CENTER.md)，标准化数据结构（独立拆分）[`THEME_CENTER_DATA.md`](THEME_CENTER_DATA.md)，容错 [`THEME_CENTER_FAULT.md`](THEME_CENTER_FAULT.md)，埋点 [`THEME_CENTER_ANALYTICS.md`](THEME_CENTER_ANALYTICS.md)，搜索词清洗 [`THEME_CENTER_SEARCH.md`](THEME_CENTER_SEARCH.md)，四维权限 [`THEME_CENTER_PRIVILEGE.md`](THEME_CENTER_PRIVILEGE.md)，收藏分享热度 [`THEME_CENTER_SOCIAL.md`](THEME_CENTER_SOCIAL.md)，历史搭配 [`THEME_CENTER_MIX.md`](THEME_CENTER_MIX.md)。空态标识见 [`THEME_CENTER_STATUS.md`](THEME_CENTER_STATUS.md)。双端存储与同步见 [`THEME_CENTER_SYNC.md`](THEME_CENTER_SYNC.md)。后台只读用户数据 [`THEME_CENTER_ADMIN.md`](THEME_CENTER_ADMIN.md)，身份审计 [`AUTH_AUDIT_GUIDE.md`](AUTH_AUDIT_GUIDE.md)，分期 [`THEME_CENTER_ROADMAP.md`](THEME_CENTER_ROADMAP.md)。

需求原文若把 HMAC/时间戳当授权、后台可配限流中台、自动封禁、信用分、AI 风控写成一期闸门，规划仍以 ROADMAP 为准：免费皮启用校验、不收客户端 `style_json`/计数、限流 429、账号隔离是底座；付费/专属权益上线必须齐服务端二次校验。**不要**把密钥写进小程序代码，**不要**另做风控看板或敏感词库当分册。Toast 以 FAULT 已落地句为准。

对外文案不用「作品」「短视频」。Toast 仍不超过 32 字，不把栈、SQL、签名算法、限流阈值返回给客户端。

## 分期范围

| 现在做 | 不做（三期 / 需求原文不采用） |
| --- | --- |
| 写接口 `IsAuthenticated`；`assert_applyable` 二次校验权益/状态/终端 | 客户端 HMAC、包内密钥、用时间戳替代 token |
| apply 同 `item_id` 1 次/秒；config 20/分；收藏写（含取消）20/分；搭配 10/分；events 60/分 | 后台可配阈值、黑名单 UI、自动封禁账号 |
| 搭配名剥标签；`style_json` 仅目录下发；C 端白名单解析失败回退默认 | 用户上传自定义样式 JSON；色情敏感词库拦搭配名 |
| 收藏/搭配/配置按当前 token 隔离；越权 mix id 对外 404 | 查询他人收藏/搭配的接口 |
| 403/429 记服务端日志 + `VisitorEvent`；C 端埋点无账号 | 安全风险看板、突发预警中台（三期 ADMIN） |
| 高频按钮 800ms 防抖；429 Toast「操作过于频繁，请稍后再试」 | 把限流当启用失败回滚本地已生效的免费皮 |

一期目录可先本地：免费皮本地启用。**会员、活动、创作者专属一旦对用户开放，必须先有本文的服务端校验**，否则不要上这些权限。

## 原则

1. **启用、收藏、保存/应用搭配、写云端配置**：服务端二次校验。前端只提示。
2. 云端 **不接收** 客户端上传的 `style_json`、`like_count`、`privilege_type`、会员标记。
3. 用户只能读写 **自己的** 收藏与搭配；管理员只看不改。
4. 非法请求给通用失败或稳定 `data.reason`，不暴露内部路径和校验细节。
5. 校验失败时 **不写入** 云端配置；本地已脏则回退默认皮或上次合法快照，页面不白屏。

```text
写操作（登录）
  Authorization: Bearer
  → 限流 / 幂等
  → 资源存在且状态合法
  → 账号权益（免费 / 会员 / 活动 / 创作者）
  → 终端 support_terminal
  → 只存 id，样式由服务端读目录
  → 拒绝则 4xx，配置不变
未登录：禁止 POST/PUT /users/theme/* ，只写设备本地
```

一期目录可先本地：免费皮本地启用。**会员、活动、创作者专属一旦对用户开放，必须先有本文的服务端校验**，否则不要上这些权限。

---

## 一、接口校验

鉴权：`Authorization: Bearer <token>`（见身份审计文档）。游客可读公开目录 `GET /themes/`、`GET /decorations/`。`/users/theme/` 下写接口一律 `IsAuthenticated`。

### 1. 启用 / 应用（最重要）

`POST /users/theme/apply/`、`PUT /users/theme/config/`、一键应用搭配：对 **每一个** `item_id` 服务端检查：

| 检查 | 不通过 |
| --- | --- |
| 装扮/主题是否存在 | 404，不生成配置行 |
| `status=available` | 409，`data.reason=coming` 或 `deprecated` |
| 权益：`free` 直接过；`member` 查云端会员；`activity` 已领取且在活动窗内；`creator` 任务已完成 | 403，`data.reason=privilege` |
| 请求端在 `support_terminal` 内 | 403，`data.reason=terminal` |
| `nav_bar` / `tab_bar` 且端为小程序 | 跳过该件（与渲染一致），不把无效层写入生效 map |

客户端改 body 里的 `item_id`、伪造 `member: true`、带上别人的 `style_json`：**忽略这些字段**，只信服务端目录和账号权益表。

`PUT /users/theme/config/` 只接受 `global_theme_id`、`decoration_map`（值为 id）、`is_cover_local_decoration`、`recent_use_list`（`item_id` / `item_type` / `use_time`，最多 8 条）。其它键丢弃。服务端按 id 重算，不把客户端 JSON 当样式。`recent_use_list` 只保留上述三字段，满 8 截断、缺 id 丢掉。`is_cover_local_decoration=true` 只影响渲染，**不得**据此清空已保存的 `decoration_map`。配置写入限流，超限 429。

未登录：本地可换免费皮；登录后 flush 时服务端仍按上表过滤。`PUT /users/theme/config/` 对 **每一个** `decoration_map` id 再跑 `assert_applyable`：新写入且权益/状态/终端不通过的 id **剔除**（不 403 整单，避免合法皮被脏字段拖死）；已在该账号配置里且仅权益过期 / 终端不支持 / 绝版的 id **保留**（停渲染、不删配置，见 PRIVILEGE）。`coming` 不保留。客户端不得靠「选使用本地」把未拥有的会员皮写进云端。

### 2. 身份

| 调用方 | 允许 |
| --- | --- |
| 未登录 | 本地配置/收藏/搭配；**禁止** 云端 collects / mixes / config / apply |
| 登录 | 上述写接口；token 无效 401 |
| staff `/manage/` | 运营接口，C 端 token 不能调 |

401 文案：「请先登录后再同步装扮」。不要返回「token 过期算法」。

### 3. 防重放、防刷

H5 / 小程序 **藏不住** 写死在包里的 HMAC 密钥，密钥不能当授权。授权只认登录态。防刷靠服务端：

| 手段 | 约定 |
| --- | --- |
| 限流 | 同一用户：应用同一 `item_id` **1 次/秒**；`PUT /users/theme/config/` **20 次/分钟**；收藏写（POST/DELETE 共用窗口）**20 次/分钟**；保存搭配 **10 次/分钟**；`/events/` **60 次/分钟**。超限 **429**，`data.reason=rate` |
| 幂等 | 可选 `Idempotency-Key`（现网未接）。**不能**替代 token，也不能靠客户端签名防重放 |
| 时钟 | 可选 `X-Timestamp` **不能**替代 token；现网不以时钟偏差拒请求，避免设备校时误杀 |
| 短期签名 | 不做。H5 / 小程序藏不住写死在包里的 HMAC 密钥 |

游客本地高频点启用：前端已有约 800ms 防抖即可，不打云端。登录态 apply 被 429：本地已换的免费皮 **保留**，Toast 限流句，云端队列稍后重试；**不要**当成 403 回滚。

429 Toast：「操作过于频繁，请稍后再试」。记风控日志，不把阈值数字回给客户端。

---

## 二、数据防篡改

1. **搭配只存 id：** `mix_name`、`global_theme_id`、`decoration_ids` / `decoration_map`、`is_cover_local_decoration`。body 里的 `style_json`、封面 URL、权限字段一律丢弃。样式只从目录详情读。
2. **搭配名：** 1～20 字（与现网表单一致），去首尾空白；去掉 HTML / 脚本片段；不允许 `<` `>`；纯文本存储，输出再转义。
3. **收藏：** `item_id` + `item_type`（仅 `theme` \| `decoration`）必须能命中目录。不存在 → 400/404，不写库。`coming` 禁止新增收藏（409 `coming`，文案「待上线装扮暂不支持收藏」）；`deprecated` **可以收藏**，**不能启用**。见 [`THEME_CENTER_SOCIAL.md`](THEME_CENTER_SOCIAL.md)。
4. **点赞/热度：** 客户端不得提交 `like_count` / `share_count`。计数只由服务端按去重后的行为累加。

`style_json` 注入：服务端与 C 端同一套白名单（token / `var(--*)`，禁止 `;` `{` `}`）。运营保存时已校验；C 端再滤一层。用户接口 **没有** 上传自定义样式的入口。

---

## 三、XSS 与输入

| 输入 | 规则 |
| --- | --- |
| 搭配名称 | 见上；模板用文本绑定，不用 `v-html` 渲染名称 |
| 后台主题/装扮名称、描述、`get_condition` | 存前剥标签；C 端按文本展示 |
| 搜索词 | 最长 64 字；剥标签；只作查询参数，ORM 参数化，禁止拼 SQL |
| 分享 query `id` / `kind` / `group` | 白名单字符；未知 id 打开主题中心列表，不执行脚本、不展示「已拥有」 |

H5 保持现有 CSP / 不把运营 HTML 当富文本。小程序无 DOM XSS，仍禁止把名称拼进 `javascript:` 或 web-view 未校验 URL。

---

## 四、防刷统计

`POST /users/theme/events/`：

- 登录或 visitor 均可报行为，但 **不接受计数增量**。
- 同一用户（或同一 visitor）对同一 `item_id` 的 `theme_collect_click` / 点赞类 / `theme_share_click` / 详情 PV：短窗去重（建议点赞/分享 1 小时内只计 1 次，PV 按日去重）。
- 超限请求仍 200 或 202 丢弃计数，避免攻击者靠错误码探测；同时记风控。
- 热度排序只用服务端聚合，不用客户端上报的 count。

点赞若做成真实状态：走独立 `POST` 点赞接口，一用户一装扮一行，重复点只翻转，不叠加。

---

## 五、数据隔离

| 数据 | 规则 |
| --- | --- |
| `GET /users/theme/collects/` `mixes/` `config/` | 只返回 **当前 token** 用户；路径里不要 `user_id` |
| 按他人 id 查收藏/搭配 | **不提供** 该接口；误打返回 404 |
| 运营 `/manage/theme-collects/` 等 | staff 只读；禁止 PATCH 用户 config / mix（后台文档已禁改搭配） |
| 账号 A → B | `handleThemeAccountLogin` 清空本地主题/收藏/搭配键，再拉 B 的云端配置 |
| 登出 / token 失效 | 清本地主题键，游客不残留上一账号配置。见 [`THEME_CENTER_SYNC.md`](THEME_CENTER_SYNC.md) |

合并游客本地与云端时，服务端仍过滤无权限 id，不能靠「选使用本地」把会员皮写进云端。

---

## 六、小程序

1. 包内 **禁止** 写死 `member=true`、白名单 id、解密密钥。权益字段每次从配置/会员接口拉。
2. 分享：`onShareAppMessage` 的 path 只允许 `theme-center` / `theme-dress` + 合法 query。落地后用 id 拉详情，**以服务端权限为准** 展示启用按钮，不信分享人自述「已拥有」。
3. 海报图：只加载站点文件域名 / 已配置 CDN；禁止任意 http(s) 外链。保存相册前校验 URL 前缀。
4. 原生栏不注入样式，与权限无关，避免无效计算，也避免伪造 nav 样式当漏洞。

---

## 七、异常请求

| 场景 | 服务端 | 用户可见（勿泄露内部） |
| --- | --- | --- |
| 不存在的 id | 404，不写配置 | 「装扮不存在或已下架」 |
| 待上线 / 绝版启用 | 409 | 沿用容错：「该主题暂未开放」/「已绝版」类文案 |
| 无会员/活动/创作者资格 | 403 | 「需要相应权限才能启用」或去获取引导，**不要**说校验哪张表 |
| 非法 JSON / 类型错误 | 400 | 「参数无效」 |
| 限流 | 429 | 「操作过于频繁，请稍后再试」 |
| 伪造 style_json | 忽略该字段 | 无额外成功提示 |

发生 4xx 时云端配置保持变更前快照。C 端若已乐观更新，以服务端响应回滚；样式异常回退默认（容错文档）。

---

## 八、风控日志

与 C 端埋点分开。可含 user id，仅运营/安全可见，不上报分析 SDK。

记录：

- 403 启用（越权会员/活动/创作者）
- 404 非法 id
- 429 与短窗超频
- 400 非法 JSON、超长搭配名、非法 `item_type`
- 账号切换清空本地（可在服务端记 login 后首次 config 拉取）

字段：时间、user id、visitor、path、`data.reason`、`item_id`、IP hash（已有审计习惯，不存明文 IP）、request_id。不存完整 body 里的 token。保留期与站点审计一致。

`audit.VisitorEvent` 记访问；对象变更走 `ObjectChangeLog`；主题风控可先复用 VisitorEvent + 业务 reason，不够再加专用表，不要在 C 端事件里带账号。

---

## 九、兜底

1. UI 提示 ≠ 授权。
2. 错误不泄露内部实现。
3. 失败不写脏配置；坏 `style_json` 回退默认，主题中心可继续用。
4. 目录 GET 可缓存，**权益和启用结果不可只信缓存**；启用当时必须打 apply/config。
5. 安全测试不要用生产账号刷 429 而不记日志。

---

## 错误码（稳定 `data.reason`）

| HTTP | reason | 含义 |
| --- | --- | --- |
| 401 | `auth` | 未登录或 token 无效 |
| 403 | `privilege` | 权益不足 |
| 403 | `terminal` | 当前端不支持 |
| 404 | `not_found` | id 不存在或不属于你（对外都当不存在） |
| 409 | `coming` / `deprecated` | 状态不可启用 |
| 409 | `mix_cap` | 搭配已满 10 |
| 409 | `mix_dup` | 完全相同的搭配组合已保存 |
| 429 | `rate` | 限流 |
| 400 | `invalid` | 格式/XSS/非法字段 |

与站点 API：`message` 给人看，`data.reason` 给客户端分支。

---

## 现状对照

| 约定 | 现网 |
| --- | --- |
| 未登录不写云端 | 已落地：`/users/theme/*` 写接口 `IsAuthenticated`，游客 401 |
| 搭配存 id、账号切换清本地 | 已落地；登出清主题键见 SYNC |
| 后台不改用户搭配 | 已落地：UserThemeConfig/Collect/Mix admin 只读 |
| apply 服务端权益校验 | 已落地 `assert_applyable`；领取活动件走 `POST /users/theme/entitlement/` |
| PUT config 装扮 id 二次校验 | 主题与 `decoration_map` 均过滤；过期件保留、新越权 id 剔除 |
| 事件不计客户端 count | 已落地：`share_count` 由去重后的 `theme_share_click` 累加；`collect_count` 随收藏写接口 |
| 429 主题写接口 | 已落地（上表窗口）；超限文案「操作过于频繁，请稍后再试」 |
| 风控日志 | `VisitorEvent` 记 path/status；403/429 `ThemeAPIError` 另打 `theme_risk` 日志。不上报分析 SDK |
| HMAC / 后台可配限流 / 自动封禁 | **不采用**（见分期范围） |

---

## 验收

- 抓包把免费请求改成会员 `item_id`：403，云端配置不变。
- `PUT` 夹带未拥有的会员装扮 id：200，该 id 不进 `decoration_map`。
- 未登录 POST collects/mixes/config/apply：401。
- 用自己的 token 带他人 mix id：404。
- body 夹带 `style_json`：保存后库中无该字段，样式仍是目录里的。
- 搭配名含 `<script>`：存下来的是过滤后文本，页面按文本显示。
- 短时间狂点启用：429，热度不按请求次数暴涨；页面 Toast 限流句，不崩、不回内部规则。
- A 登出登 B：本地看不见 A 的搭配。
- 小程序分享非法 id：进主题中心，不显示已启用会员皮。
- 运营只能看收藏/搭配，不能改。

## 后续（不在本期）

用户信用分、智能风控模型、装扮资源防盗链、按会员/创作者分级限流、后台阈值配置与风险看板。用户投稿审核与 UGC JSON 仍走 `clean_catalog_item`，见 [`THEME_CENTER_UGC.md`](THEME_CENTER_UGC.md)（三期；不另做信用分或主题中心敏感词库）。积分刷取、公开复刻越权见 [`THEME_CENTER_ECO.md`](THEME_CENTER_ECO.md)（三期账本未上线前无兑换接口）。
