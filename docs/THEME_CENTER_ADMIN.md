# 主题装扮后台管理

**文档状态：** 独立拆分（完整 `/manage/` 中台、报表、热搜/文案 CMS 按三期验收；Django Admin 校验与活动窗校正可提前）  
**产品：** 乡声集盒 · 主题中心运营后台  
**入口：** 内部 Django Admin（staff 登录）。不是 C 端主题中心，也不对普通用户开放。  
**对应实现：** `backend/guantou/themes/admin.py`、`models.py` `clean`、`services.clean_catalog_item` / `sync_activity_windows`；审计 `audit.ObjectChangeLog`

本文只定模块、字段、校验、权限和生效规则，不定 UI 稿。总览见 [`THEME_CENTER.md`](THEME_CENTER.md)。C 端字段与枚举以 [`THEME_CENTER_DATA.md`](THEME_CENTER_DATA.md) 为准（标准化数据结构，独立拆分）。埋点口径见 [`THEME_CENTER_ANALYTICS.md`](THEME_CENTER_ANALYTICS.md)。C 端检索见 [`THEME_CENTER_SEARCH.md`](THEME_CENTER_SEARCH.md)（热搜后台配置属三期）。四维权限见 [`THEME_CENTER_PRIVILEGE.md`](THEME_CENTER_PRIVILEGE.md)（批量改权限属三期）。历史搭配只读见 [`THEME_CENTER_MIX.md`](THEME_CENTER_MIX.md)。空态不配后台文案，见 [`THEME_CENTER_STATUS.md`](THEME_CENTER_STATUS.md)。双端存储与同步见 [`THEME_CENTER_SYNC.md`](THEME_CENTER_SYNC.md)。分期见 [`THEME_CENTER_ROADMAP.md`](THEME_CENTER_ROADMAP.md)：后台上下架中台、定时看板、报表属 **三期**。图片 WebP、多尺寸与 `catalog_version` 见 [`THEME_CENTER_PERF.md`](THEME_CENTER_PERF.md)。用户数据只读与越权见 [`THEME_CENTER_SECURITY.md`](THEME_CENTER_SECURITY.md)。C 端预览沙盒见 [`THEME_CENTER_PREVIEW.md`](THEME_CENTER_PREVIEW.md)。

需求原文若把「一期 MVP 完整运营中台」、有引用也能物理删除、空态/热搜/分享文案后台可配、Excel 实时看板写成当前闸门，规划仍以 ROADMAP 为准：运营后台按 **三期** 验收。现在只保证 Django Admin 能改目录、非法 `style_json`/标签/终端进不了库、有引用不能删、活动时间窗可校正。**不要**另做一套 C 端可调的 `/manage/`，**不要**改 STATUS 已落地空态句。

对外文案：用户可见的「作品」一律写成 **罐头**。下文「罐头卡片」对应需求里的作品卡片。界面不用「短视频」。方言地域标签用 DATA 七项（`川渝` 等），不要写成「川渝烟火」当标签值。

## 分期范围

| 现在做（Django Admin 底座） | 不做（三期 / 需求原文不采用） |
| --- | --- |
| 主题 / 装扮增删改；保存校验 `style_json`、终端、标签字典、活动时间；剥名称/简介 HTML | 独立可视化运营台、后台实时预览沙盒（预览走 C 端 PREVIEW） |
| 手动改 `status` 上下架/绝版；保存 bump `catalog_version` | `/manage/themes/` 批量 REST、批量打标 UI、批量下架流水线 |
| 有收藏/搭配/当前配置引用 **禁止物理删除**，只能 `deprecated` | 「删除后前端彻底无数据」——有引用必须绝版留历史 |
| `sync_theme_activity_windows` 按时间窗校正 coming/available/deprecated | 节日全自动轮换中台、任务失败重试看板（节日仍复用活动窗，见 [`THEME_CENTER_ECO.md`](THEME_CENTER_ECO.md)） |
| 用户 config / collect / mix **只读**；`ObjectChangeLog` 记目录变更 | 改用户搭配；样式 JSON 版本库与一键回退 |
| 热度三计数只读展示 | Excel 导出、日/周/月榜、转化率看板（口径仍见 ANALYTICS） |
| 超管才能删零引用 `coming` 草稿 | 热搜词 / 分享文案 / 空态文案 CMS（STATUS / SEARCH 已钉死） |
| staff / superuser 沿用 Django（见角色） | 精细化「只读账号」产品角色页；投稿审核见 [`THEME_CENTER_UGC.md`](THEME_CENTER_UGC.md)（三期） |

C 端目录走 Django `themes`：`GET /themes/`、`GET /decorations/`。运营在 Django Admin 改主题/装扮（保存 bump `catalog_version`）。`/manage/themes/` 批量运营接口仍属三期，C 端不要调用。对象变更可复用 `audit.ObjectChangeLog`。

## 原则

1. 每条主题 / 装扮必须配置 `support_terminal`：`h5`、`miniprogram`，可多选，至少一项。
2. 方言地域标签、风格标签走字典，批量打标，禁止页面自由输入新方言地域名。
3. 活动限定必须有开始、结束时间；到点改状态，也可手动提前绝版。
4. 保存写入权威库后 **立即对后续 C 端拉目录生效**。已打开的 C 端页下次刷新才看到；本地 `theme_cache` 过期或带版本号失效。
5. 所有写操作进操作日志，可按装扮 ID、操作人、时间追溯。
6. **禁止** 后台改用户收藏内容和历史搭配内容；只读查询。
7. 已被收藏或写入搭配 / 当前配置的装扮 **禁止物理删除**，只能改为 `deprecated`（已下架绝版）。

```text
运营后台（staff）
  ├─ 全局主题 CRUD / 上下架 / 预览
  ├─ 局部装扮 CRUD / 上下架 / 预览
  ├─ 标签字典（风格、方言地域）
  ├─ 活动定时（自动上架 / 绝版 / 即将到期）
  ├─ 素材库（封面、详情大图、海报）
  ├─ 用户收藏、搭配（只读）
  ├─ 数据看板（聚合指标，无 C 端 PII）
  └─ 操作日志
```

---

## 一、全局主题管理

实体：`theme_item`。主键 `theme_id`。

### 列表

| 列 | 字段 |
| --- | --- |
| 主题 ID | `theme_id` |
| 名称 | `name` |
| 描述 | `desc` |
| 预览图 | `cover_img` |
| 风格标签 | `style_tags` |
| 方言地域标签 | `dialect_tags` |
| 权限类型 | `privilege_type`：`free` / `member` / `activity` / `creator` |
| 支持终端 | `support_terminal`：`h5` / `miniprogram` |
| 状态 | `status`：`available` 可用 / `coming` 待上线 / `deprecated` 已下架绝版 |
| 创建时间 | `create_time` |
| 操作 | 见下 |

筛选：`status`、`privilege_type`、`dialect_tag`、`support_terminal`。可叠加关键词搜 `theme_id` / `name`。

操作：

| 按钮 | 规则 |
| --- | --- |
| 新增 | 打开空表单，默认 `status=coming`，终端全选 |
| 编辑 | 打开表单 |
| 复制 | 新 `theme_id`，名称加「副本」，状态强制 `coming`，活动时间清空 |
| 预览 | 模态模拟渲染，不改 C 端真实配置 |
| 上架 | `coming` → `available`；活动装扮若未到开始时间禁止上架 |
| 下架 | → `deprecated`；已 `deprecated` 不再上架，除非超级管理员恢复为 `coming` |
| 删除 | 仅无引用的草稿；否则拒绝并提示改为绝版 |

### 新增 / 编辑表单

**基础信息**

| 项 | 字段 | 必填 |
| --- | --- | --- |
| 名称 | `name` | 是 |
| 简介 | `desc` | 否 |
| 封面预览图 | `cover_img` | 是 |
| 详情大图 | `detail_img` | 否，缺省用封面 |
| 分享海报 | `poster_img` | 否，缺省用封面 |

图片从素材库选取或上传。

**标签：** `style_tags`、`dialect_tags` 多选。方言取值只能是：川渝、江南吴语、岭南粤韵、闽台闽南、北方晋陕、湘楚潇湘、云贵滇黔。风格字典：简约、地域方言风、复古、赛博、国风、市井烟火、节日限定、二次元、极简暗色。

**权限 `privilege_type`**

| 类型 | 额外字段 |
| --- | --- |
| 免费 `free` | 无；`get_condition` 可空，C 端展示「免费启用」 |
| 会员专属 `member` | `get_condition` 填会员权益说明 |
| 活动限定 `activity` | `activity_start_at`、`activity_end_at`（时区与站点一致）；`get_condition` 可填活动说明 |
| 方言创作者专属 `creator` | `get_condition` 填解锁条件描述 |

活动结束时间必须晚于开始时间。非活动类型保存时清空活动时间，避免残留定时。

**终端：** 至少勾选 `h5` 或 `miniprogram`。

**状态：** 待上线时 C 端出占位卡片，按钮置灰，**不允许启用**（与现网一致）。

**`style_json`：** 可视化表单（accent / primaryLook / ghostLook / effect 等 token）或 JSON 文本。保存前校验：合法 JSON；取值符合数据契约（优先 `var(--token)`，禁止 `;` `{` `}`）；非法禁止保存。Vue / 小程序页面仍只引用设计 token，不写死色值。

保存成功后可点 **预览**。预览不自动上架。

---

## 二、局部装扮管理

实体：`decoration_item`。主键 `decoration_id`。

### 列表

相对全局主题，多一列 **组件类型** `component_type`。

筛选另加 `component_type`。操作同全局主题。

### 新增 / 编辑表单

基础信息：名称、简介、预览图（必填）。详情大图、海报导出规则同主题。

**组件类型（单选，必填）**

| 契约值 | 后台展示 |
| --- | --- |
| `nav_bar` | 导航栏 |
| `tab_bar` | 底部 Tab 栏 |
| `button` | 交互按钮 |
| `card` | 罐头卡片 |
| `home_bg` | 个人主页背景 |
| `avatar_frame` | 头像框 |
| `comment_bubble` | 评论气泡 |
| `topic_card` | 话题卡片 |
| `input_box` | 弹窗输入框 |

`nav_bar`、`tab_bar`：**禁止**勾选 `miniprogram`（小程序原生栏无法自定义）。保存时若误选，拦截并提示只支持 H5。C 端即使带了 `miniprogram` 也不会注入样式。

标签、权限、终端、状态、`style_json` 规则同全局主题。局部装扮风格标签还可含：导航栏、底部Tab、交互按钮、罐头卡片、个人主页、头像挂件、评论区、话题卡片、弹窗输入框。

预览：只渲染该 `component_type` 一层；小程序预览对原生 nav/tab **标注不生效**，不假装已换皮。

同一 `component_type` C 端同时只生效一件，后台不强制互斥上架，可同时 `available`。

---

## 三、活动限定定时

仅 `privilege_type=activity` 的主题和装扮。

| 时刻 | 自动动作 |
| --- | --- |
| 到达 `activity_start_at` | `coming` → `available` |
| 到达 `activity_end_at` | → `deprecated`（已绝版） |
| 运营点「提前结束」 | 立即 `deprecated`，结束时间记为操作时刻 |

未到开始时间：保持 `coming`，C 端占位、不可启用。已绝版：详情可开，启用/获取置灰，不跳会员/活动页。

**即将到期列表：** `status=available` 且结束时间在未来 72 小时内。供运营预警，不自动发站内信（三期可不做通知，看板即可）。

定时任务按分钟扫描（三期调度）；现网可用 `python manage.py sync_theme_activity_windows` 校正。漏扫时以「当前时间 vs 窗口」校正状态，不以任务是否跑过为准。C 端启用仍按窗口二次校验（SECURITY），即使 `status` 尚未改也会拦截。每次自动改状态写 `ObjectChangeLog`，操作人可能为空（系统任务）。

手动上架活动装扮：若当前时间早于开始时间，拒绝。手动从绝版恢复：仅超级管理员，且须重设时间窗口。

---

## 四、用户收藏与搭配（只读）

| 查询 | 筛选项 | 可见字段 |
| --- | --- | --- |
| 收藏列表 | 用户 ID、`item_id`、`item_type` | `item_id`、`item_type`、`collect_time` |
| 历史搭配 | 用户 ID、`mix_id`、主题/装扮 ID | `mix_name`、`global_theme_id`、`decoration_ids` / `decoration_map`、`create_time` |

**禁止** PATCH/DELETE 用户收藏或搭配。后台没有「替用户改搭配」按钮。排查问题只看内容，让用户在 C 端自行改。

当前生效配置 `user_current_config` 同样只读，便于对照「用户现在实际戴了什么」。

该模块仅运营可见，查询可含用户 ID；**不要**把账号 ID 写进 C 端埋点或公开报表。安全约定见 [`THEME_CENTER_SECURITY.md`](THEME_CENTER_SECURITY.md)。

---

## 五、数据统计看板

数据来自 `POST /users/theme/events/` 与客户端埋点，口径与分析文档一致。聚合指标 **不含** 昵称、手机、邮箱、头像、账号 id、openid。

时间范围：今日、近 7 天、近 30 天（自然日，站点时区）。

### 主题 / 装扮报表

按 `theme_id` 或 `decoration_id`：

| 指标 | 来源 |
| --- | --- |
| 浏览 PV | `theme_item_enter_detail` |
| 收藏数 | `theme_collect_click` 且 `collect_state=收藏`（净收藏可用收藏减取消） |
| 分享数 | `theme_share_click` |
| 启用次数 | `theme_apply_click` 且 `apply_result=成功启用` |
| 转化率 | 成功启用 / 详情 PV |

方言地域热度：按 `region_tag` / `dialect_tags` 排浏览与启用。  
权限维度：`free` / `member` / `activity` / `creator` 的点击与启用。  
小程序不支持：`theme_unsupported_env` 与 `apply_result=环境不支持`，用于排兼容或下线优先级。

### 行为统计

1. 主题中心 PV/UV：`theme_center_enter`（UV 用 visitor / 登录会话，不上报账号到看板导出文件名以外的字段）。
2. Tab 占比：`theme_tab_switch`。
3. 搭配：`theme_save_mix`、`theme_apply_mix` 次数。
4. 搜索词：`theme_search`、`theme_hot_search_click` 的 `keyword` 频次（截断 256 字，脱敏后聚合）。

看板是只读聚合。不在这里改装扮状态。

---

## 六、操作日志

每条写操作一条，不可由运营删除。

| 字段 | 说明 |
| --- | --- |
| 操作人 | staff 用户；定时任务为 `system` |
| 时间 | 服务器时间 |
| 对象 | `theme` / `decoration` / `tag` / `asset` 及 ID |
| 动作 | 新增、编辑、复制、上架、下架、删除（拒绝也记）、改权限、改定时、提前结束、改标签、传素材 |
| 变更 | 关键字段前后值（`status`、`privilege_type`、`support_terminal`、活动时间、`style_json` 摘要） |

筛选：装扮/主题 ID、操作人、时间范围、动作类型。

实现上挂 `audit.ObjectChangeLog`（`create` / `update` / `delete`），业务动作名可放 `changed_fields` 或扩展 action。不要另起一套无法对上的日志表除非现有模型不够。

---

## 七、素材资源

统一管：封面预览图、详情大图、分享海报。上传走现有 `files` 能力；运营侧增加裁剪（封面建议方图、详情横图、海报按 C 端分享比例）。上传后转 **WebP** 并压缩，同时产出列表缩略图与详情大图；海报 **预生成** 写入 `poster_img`，C 端分享优先用该图。改图、上下架、改权限、改 `style_json` 时递增 `catalog_version`。

列表展示：缩略图、引用该图的 `theme_id` / `decoration_id`、上传时间。无引用的图可标「未使用」，超级管理员可删文件；仍被引用则禁止删，先换装扮上的图。

C 端损坏样式回退默认；图片 404 不导致目录接口失败，卡片用占位图。

---

## 八、校验（保存时全部执行）

1. `style_json` 不是合法 JSON，或字段违反数据契约 → **禁止保存**。
2. 必填：`name`、`cover_img`、`privilege_type`、`support_terminal`（至少一端）。局部装扮另必填 `component_type`。
3. `activity` 必须有开始、结束时间，且结束 > 开始。
4. `nav_bar` / `tab_bar` 不得包含 `miniprogram`。
5. `dialect_tags` 只能选自七个地域文案；`style_tags` 只能选自风格字典。
6. **物理删除：** 若 `collect_count > 0`，或任意 `user_saved_mix` / `user_current_config` 引用该 ID → 返回 409，文案「该装扮已被收藏或使用，请改为已下架绝版，不能删除」。`coming` 且零引用才允许删。
7. 运营人员无删除权限，按钮不可用。

待上线：C 端占位、启用置灰，后台预览仍可开。

---

## 九、后台预览

保存后点预览：用当前表单（含未上架稿）模拟 C 端渲染，**不写入** `user_current_config`，不改运营员自己的 App 主题。

| 环境开关 | 行为 |
| --- | --- |
| H5 | 按 `style_json` 模拟首页罐头流 / 个人中心 / 评论区 / 话题卡（规则同 C 端实时预览） |
| 小程序 | 同上；`nav_bar`、`tab_bar` 标注「原生组件无法自定义，该部分样式不会生效」 |

当前终端不在 `support_terminal`：预览里对应层置灰并提示环境不支持。预览关闭后后台页样式复原。

---

## 十、角色

对应 Django 账号，不另做一套运营登录。

| 角色 | 判定 | 能力 |
| --- | --- | --- |
| 超级管理员 | `is_superuser` | 全部：增删改、上下架、改系统级标签字典、删未引用素材、从绝版恢复为待上线、看日志和报表 |
| 运营人员 | `is_staff` 且非超管 | 新增、编辑、复制、预览、上下架、提前结束活动、看只读收藏/搭配、看报表和日志 |
| 运营人员 **不能** | — | 物理删除主题/装扮、删除素材、改风格/方言字典的增删、改站点其它系统配置、改用户收藏/搭配 |

未 `is_staff`：403。C 端用户 token 不能调 `/manage/`。

---

## 生效与缓存

1. 管理端保存成功 = 权威数据已更新。
2. C 端 `GET /themes/`、`GET /decorations/` 下次请求读到新数据。
3. 客户端 `theme_cache` / `decoration_cache`：目录响应带版本或较短 TTL；管理端也可提供「使缓存失效」给超管，不是默认必点。
4. 「实时生效」不等于推送踢下用户当前页；已启用且被绝版的件，C 端按容错文档跳过并提示，不报错白屏。
5. `style_json` 损坏：C 端回退默认；后台保存阶段应已拦住，若历史脏数据，编辑页打开时标红禁止再存脏稿。

---

## 标签批量

独立「标签字典」页（超管可增删风格标签；方言七项只允许改排序，不允许改文案以免和 C 端筛选码对不上）。

批量：在主题或装扮列表多选 → 追加 / 覆盖风格或方言标签 → 写日志。不支持批量改权限或批量物理删除。

---

## 管理端接口（规划，三期落地）

无 `/api` 前缀。均需 staff。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET/POST | `/manage/themes/` | 列表 / 新增 |
| GET/PATCH | `/manage/themes/{theme_id}/` | 详情 / 编辑 |
| POST | `/manage/themes/{theme_id}/copy/` | 复制 |
| POST | `/manage/themes/{theme_id}/status/` | body：`{ status }` 上架或绝版 |
| DELETE | `/manage/themes/{theme_id}/` | 仅零引用草稿；超管 |
| GET/POST | `/manage/decorations/` | 同主题 |
| GET/PATCH | `/manage/decorations/{decoration_id}/` | 同主题 |
| GET | `/manage/theme-schedules/expiring/` | 72 小时内到期的活动装扮 |
| POST | `/manage/theme-schedules/{id}/end/` | 提前结束 |
| GET | `/manage/theme-collects/` | 只读 |
| GET | `/manage/theme-mixes/` | 只读 |
| GET | `/manage/theme-stats/` | 报表聚合 |
| GET | `/manage/theme-logs/` | 操作日志 |
| GET/POST | `/manage/theme-assets/` | 素材 |
| GET/PATCH | `/manage/theme-tags/` | 标签字典 |

列表建议 `{ results, next, count }`。校验失败 400；无权限 403；禁止删除 409。

C 端路径仍是 `/themes/`、`/decorations/`，不要让 App 打 `/manage/`。

---

## 与 C 端对照

| 后台动作 | C 端表现 |
| --- | --- |
| 保存且 `available` | 列表出现，可按权限启用 |
| `coming` | 占位卡，按钮置灰，不可启用 |
| `deprecated` | 详情可开，启用/获取灰，历史搭配应用时跳过 |
| 去掉某终端 | 该端置灰，「当前环境暂不支持」 |
| 改 `style_json` | 已启用用户下次 hydrate 后更新；预览未点应用不影响真实页 |
| 活动到点上架/绝版 | 与手动改 `status` 相同 |

---

## 现状对照

| 约定 | 现网 |
| --- | --- |
| Django Admin 改主题/装扮 | 已落地；保存 `clean_catalog_item` + bump `catalog_version` |
| `style_json` 非法不能入库 | 已落地（`;` `{` `}` 拦截） |
| nav/tab 不得含小程序 | 已落地 `full_clean` |
| 方言/风格标签字典 | 已落地；未知标签禁止保存 |
| 有引用不能删 | Admin `has_delete_permission`：仅超管 + `coming` + 零引用 |
| 用户搭配/收藏/当前配置 | Admin 只读，禁增改删 |
| 活动窗校正 | `sync_theme_activity_windows`；C 端 apply 仍按时间窗拦截 |
| 目录变更审计 | `ObjectChangeLog`（热度计数字段忽略） |
| `/manage/` REST、报表导出、热搜/空态 CMS、后台预览沙盒 | **未做**（三期） |

---

## 验收（现在）

- staff 可在 Django Admin 改名称、终端、标签、权限、状态、`style_json`；非法 JSON / 未知方言标签 / 空终端不能保存。
- 有收藏或当前配置/搭配引用的件不能物理删除。
- 活动件过结束时间后跑校正命令应变 `deprecated`；C 端即使未跑命令也不能启用。
- 保存后 `catalog_version` 增加，C 端缓存按 PERF 作废。
- 文案无「作品」「短视频」。

## 验收（三期后台中台）

- 运营可配终端、方言/风格标签、活动时间，保存后 C 端拉目录能对上。
- JSON 非法不能保存；待上线不能被启用。
- 有收藏或搭配引用的件不能删，只能绝版，用户历史搭配不崩。
- 活动到点自动上架/绝版；提前结束立即绝版；即将到期列表能看到。
- 预览分 H5 / 小程序，原生栏有标注。
- 日志能按 ID、人、时间查出改权限和改定时。
- 运营员不能删除、不能改系统标签字典。
- 报表时间范围与权限/方言/小程序不支持指标可出数，导出不含账号 PII。
- 文案无「作品」「短视频」。

## 后续（不在本期）

智能推荐权重、节日全自动轮换策略、地域使用分布报表、样式版本回退、热搜/分享/空态 CMS。用户投稿审核队列见 [`THEME_CENTER_UGC.md`](THEME_CENTER_UGC.md)（三期，不在本期 Django Admin 做）。碎片账本、榜单中台、公开复刻见 [`THEME_CENTER_ECO.md`](THEME_CENTER_ECO.md)。
