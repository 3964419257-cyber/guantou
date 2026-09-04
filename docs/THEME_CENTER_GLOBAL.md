# 全局主题模块

**文档状态：** 一期 MVP（独立拆分；货架与启用以本文 + 安全/数据契约为准）
**产品：** 乡声集盒 · 主题中心 · 全局主题
**页面：** `/pages/users/theme-center` 的 **全局主题** Tab（不另开路由）

本文只定 **一键全站换装** 这一底座。局部装扮见 [`THEME_CENTER_DRESS.md`](THEME_CENTER_DRESS.md)。覆盖开关见 [`THEME_CENTER_OVERLAY.md`](THEME_CENTER_OVERLAY.md)。我的装扮汇总见 [`THEME_CENTER_OUTFIT.md`](THEME_CENTER_OUTFIT.md)。三层预览见 [`THEME_CENTER_PREVIEW.md`](THEME_CENTER_PREVIEW.md)。最近使用见 [`THEME_CENTER_RECENT.md`](THEME_CENTER_RECENT.md)。搜索筛选见 [`THEME_CENTER_SEARCH.md`](THEME_CENTER_SEARCH.md)。四维权限见 [`THEME_CENTER_PRIVILEGE.md`](THEME_CENTER_PRIVILEGE.md)。收藏分享热度见 [`THEME_CENTER_SOCIAL.md`](THEME_CENTER_SOCIAL.md)。历史搭配见 [`THEME_CENTER_MIX.md`](THEME_CENTER_MIX.md)。搭配方案见总览 [`THEME_CENTER.md`](THEME_CENTER.md)。双端存储与同步见 [`THEME_CENTER_SYNC.md`](THEME_CENTER_SYNC.md)。分期与小程序降级见 [`THEME_CENTER_ROADMAP.md`](THEME_CENTER_ROADMAP.md)。标准化数据结构（独立拆分）见 [`THEME_CENTER_DATA.md`](THEME_CENTER_DATA.md)。启用校验见 [`THEME_CENTER_SECURITY.md`](THEME_CENTER_SECURITY.md)。目录上下架见 [`THEME_CENTER_ADMIN.md`](THEME_CENTER_ADMIN.md)。

对外文案不用「作品」「短视频」。需求里的作品卡片写作 **罐头卡片**。

## 一期范围

| 做 | 不做（货架可占位，不对用户承诺可启用） |
| --- | --- |
| 默认方言主题 + **素白纸本** 两套免费皮可一键切换 | 把川渝/吴语等方言套装一次性做成可启用 |
| 列表卡片、详情大图（全屏实时模拟为二期占位） | 节日自动上下架、碎片兑换、热度排行榜页（三期见 [`THEME_CENTER_ECO.md`](THEME_CENTER_ECO.md)） |
| 已启用 / 可用 / 待上线 / 已绝版 四种 **卡片展示**（已启用是当前配置，不是目录第四套 `status`；目录仍是 `coming` / `available` / `deprecated`） | `/manage/themes/` 批量运营接口（三期） |
| 覆盖开关、本地+云端同步、登录启用走 `POST /users/theme/apply/` | 物理删除主题 |

方言地域分类（川渝烟火、江南吴语、岭南粤韵、闽台闽南、北方晋陕、湘楚潇湘、云贵滇黔）**出现在分类与卡片上**，默认 `status=coming`，按钮为「敬请期待」。会员 / 活动 / 创作者主题可展示，启用必须服务端权益通过。

## 双端

- **H5：** `style_json` 注入 CSS 变量，导航、按钮、卡片、背景、文字色系统一换。
- **小程序：** 原生导航栏、原生 Tab 不注入样式；详情与实时预览标注降级。其余页面组件跟 H5。
- 样式只来自目录 `style_json`，页面不写死色值。新增主题改后台，不改前端代码。

## 状态与按钮

| 状态 | 卡片 | 预览 | 启用 |
| --- | --- | --- | --- |
| 已启用 | 高亮 +「已启用」 | 可 | 按钮禁用 |
| 可用 | 正常 | 可 | 「立即启用」或去开通/去参与/去完成任务 |
| 待上线 | 置灰「待上线」 | 不可实时预览 | 「敬请期待」禁用 |
| 已绝版 | 置灰「已绝版」 | 可看详情/沙盒 | 不可启用、不可获取 |

空列表用 `EmptyState`，句子见 [`THEME_CENTER_STATUS.md`](THEME_CENTER_STATUS.md)。收藏空态在「我的收藏」Tab。

## 同步

- 游客：只写本地，底栏提示。
- 登录：先本地生效，再 `POST /users/theme/apply/`；4xx 回滚并 Toast。网络失败保留本地并排队 `PUT /users/theme/config/`。
- 换账号清空本地后拉云端；游客登录可合并。策略见 [`THEME_CENTER_SYNC.md`](THEME_CENTER_SYNC.md)。

## 后台

Django Admin `ThemeItem`：名称、描述、预览图、`style_json`（保存前校验非法字符）、风格/方言标签、权限、终端、活动时间、状态。引用中的主题不能物理删除。变更写入 `audit.ObjectChangeLog`。热度数字只读，来自收藏/埋点，不信客户端 count。
