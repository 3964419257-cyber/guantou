# 局部装扮模块

**文档状态：** 一期 MVP（独立拆分；货架与启用以本文 + 安全/数据契约为准）
**产品：** 乡声集盒 · 主题中心 · 局部装扮
**页面：** `/pages/users/theme-center` 的 **局部装扮** Tab；分类子页 `/pages/users/theme-dress?group=`（不另开其它路由）

本文只定 **单组件换装与混搭** 这一底座。全局一键换装见 [`THEME_CENTER_GLOBAL.md`](THEME_CENTER_GLOBAL.md)。覆盖开关见 [`THEME_CENTER_OVERLAY.md`](THEME_CENTER_OVERLAY.md)。我的装扮汇总见 [`THEME_CENTER_OUTFIT.md`](THEME_CENTER_OUTFIT.md)。三层预览见 [`THEME_CENTER_PREVIEW.md`](THEME_CENTER_PREVIEW.md)。最近使用见 [`THEME_CENTER_RECENT.md`](THEME_CENTER_RECENT.md)。搜索筛选见 [`THEME_CENTER_SEARCH.md`](THEME_CENTER_SEARCH.md)。四维权限见 [`THEME_CENTER_PRIVILEGE.md`](THEME_CENTER_PRIVILEGE.md)。收藏分享热度见 [`THEME_CENTER_SOCIAL.md`](THEME_CENTER_SOCIAL.md)。历史搭配见 [`THEME_CENTER_MIX.md`](THEME_CENTER_MIX.md)。空态标识见 [`THEME_CENTER_STATUS.md`](THEME_CENTER_STATUS.md)。双端存储与同步见 [`THEME_CENTER_SYNC.md`](THEME_CENTER_SYNC.md)。分期与小程序降级见 [`THEME_CENTER_ROADMAP.md`](THEME_CENTER_ROADMAP.md)。标准化数据结构（独立拆分）见 [`THEME_CENTER_DATA.md`](THEME_CENTER_DATA.md)。启用校验见 [`THEME_CENTER_SECURITY.md`](THEME_CENTER_SECURITY.md)。目录上下架见 [`THEME_CENTER_ADMIN.md`](THEME_CENTER_ADMIN.md)。

需求原文若写「小程序常驻置灰卡 / 全组件无限制」，分期仍以 ROADMAP 为准：一期藏 nav/tab 入口，二期再置灰说明。冲突开关打开时只生效全局主题。

对外文案不用「作品」「短视频」。需求里的作品卡片 / 作品网格写作 **罐头卡片**。

## 一期范围

| 做 | 不做（货架可占位，不对用户承诺可启用） |
| --- | --- |
| 四类可渲染组件：罐头卡片、个人主页背景、头像框、评论气泡 | 把交互按钮、话题卡、弹窗输入框做成可启用活件 |
| 单组件独立启用 / 替换 / 关闭（关闭后该件跟随全局主题） | 搜索筛选、收藏分享、全屏实时混搭预览（搜索见 [`THEME_CENTER_SEARCH.md`](THEME_CENTER_SEARCH.md)，二期） |
| 覆盖开关关：已启用局部层优先生效；未设置的件沿用全局主题 | 会员 / 活动 / 创作者装扮对用户免费放开 |
| 卡片缩略、分类子页、本地 + 云端同步；登录启用走 `POST /users/theme/apply/` | 用户投稿（见 [`THEME_CENTER_UGC.md`](THEME_CENTER_UGC.md)，三期）、装扮社区、搭配方案复制（见 [`THEME_CENTER_ECO.md`](THEME_CENTER_ECO.md)） |

方言纹样（宣纸卡、青瓦框等）**可以占位**，默认 `status=coming` 或权限未通过，按钮为「敬请期待」或去开通。活件只有免费 `available` 的一期四类 `*-plain` 等服务端已放行的项。

## 双端

- **H5：** 各 `component_type` 的 `style_json` 注入对应 CSS 变量；导航栏 / 底栏分类可展示（一期不保证换皮效果与小程序一致）。
- **小程序一期：** **不展示** `nav_bar` / `tab_bar` 分类入口（不要置灰卡片）。原生导航栏、原生 TabBar **永不注入** `style_json`。其余自定义组件与 H5 同一套 JSON。
- **小程序二期：** 入口可见 + 置灰 +「小程序暂不支持该组件装扮」，按钮锁定，仍不注入原生栏样式。
- 样式只来自目录 `style_json`，页面不写死色值。新增组件装扮改后台，不改前端代码。

## 混搭与覆盖

- **覆盖开：** 局部装扮全部跳过，界面只走当前全局主题。
- **覆盖关：** 该 `component_type` 有已启用局部装扮则用其 `style_json`；没有则沿用全局主题对应字段；再没有用系统默认。
- 同一 `component_type` 同时只生效一件。单件启用 / 替换互不改其它组。
- 已启用件归在「我的装扮」汇总（[`THEME_CENTER_OUTFIT.md`](THEME_CENTER_OUTFIT.md)）。关闭单件 = 从 `decoration_map` 去掉该组，该组件改回跟随全局主题。

## 状态与按钮

| 状态 | 卡片 | 预览 | 启用 |
| --- | --- | --- | --- |
| 已应用 | 高亮 +「已应用」 | 可（一期卡片/详情） | 可关闭以跟随主题 |
| 可用 | 正常 | 可 | 「应用」或去开通/去参与/去完成任务 |
| 待上线 | 置灰「敬请期待」 | 不可实时预览 | 操作禁用 |
| 已绝版 | 置灰「已绝版」 | 可看详情 | 不可启用、不可获取 |
| 小程序原生栏（二期） | 置灰「小程序暂不支持该组件装扮」 | 不假装已换皮 | 按钮锁定 |

空列表用 `EmptyState`。`style_json` 损坏：跳过该件，其它组件照常，Toast「装扮样式加载异常，已恢复默认」。全场景空态句见 [`THEME_CENTER_STATUS.md`](THEME_CENTER_STATUS.md)。

## 同步

- 游客：只写本地，底栏提示。
- 登录：先本地生效，再 `POST /users/theme/apply/`（`item_type=decoration`）；4xx 回滚并 Toast。网络失败保留本地并排队 `PUT /users/theme/config/`。
- 关闭单件不打 apply（没有空 id），只改本地 map 再排队 PUT。
- 换账号清空本地后拉云端；游客登录可合并。服务端仍会滤掉无权限 / 不支持终端的层。策略见 [`THEME_CENTER_SYNC.md`](THEME_CENTER_SYNC.md)。
- 搭配或配置里含绝版、下架、小程序不支持件：一键应用跳过并 Toast，不白屏。

## 后台

Django Admin `DecorationItem`：名称、描述、预览图、`component_type`、分组、`style_json`（保存前校验非法字符）、风格/方言标签、权限、终端、活动时间、状态。`nav_bar` / `tab_bar` 不得勾选 `miniprogram`。引用中的装扮不能物理删除。变更写入 `audit.ObjectChangeLog`。热度数字只读。
