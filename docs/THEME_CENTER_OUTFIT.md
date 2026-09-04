# 我的装扮汇总中心

**文档状态：** 一期 MVP（独立拆分；入口与进退以本文 + NAV 为准）
**产品：** 乡声集盒 · 主题中心 · 我的装扮
**页面：** `/pages/users/theme-center?tab=mine`（第四入口；**不另开** `/pages/users/theme-outfit`）

本文只定 **个人装扮管理中台**：看当前整套、改全局/局部、开关、重置。历史搭配保存 / 应用 / 管理见 [`THEME_CENTER_MIX.md`](THEME_CENTER_MIX.md)。全局换装见 [`THEME_CENTER_GLOBAL.md`](THEME_CENTER_GLOBAL.md)。局部装扮见 [`THEME_CENTER_DRESS.md`](THEME_CENTER_DRESS.md)。覆盖开关见 [`THEME_CENTER_OVERLAY.md`](THEME_CENTER_OVERLAY.md)。三层预览见 [`THEME_CENTER_PREVIEW.md`](THEME_CENTER_PREVIEW.md)。最近使用见 [`THEME_CENTER_RECENT.md`](THEME_CENTER_RECENT.md)。四维权限见 [`THEME_CENTER_PRIVILEGE.md`](THEME_CENTER_PRIVILEGE.md)。空态标识见 [`THEME_CENTER_STATUS.md`](THEME_CENTER_STATUS.md)。分期见 [`THEME_CENTER_ROADMAP.md`](THEME_CENTER_ROADMAP.md)。进退栈见 [`THEME_CENTER_NAV.md`](THEME_CENTER_NAV.md)。标准化数据结构（独立拆分）见 [`THEME_CENTER_DATA.md`](THEME_CENTER_DATA.md)。失败提示见 [`THEME_CENTER_FAULT.md`](THEME_CENTER_FAULT.md)。双端存储与同步见 [`THEME_CENTER_SYNC.md`](THEME_CENTER_SYNC.md)。

需求原文若把历史搭配、全屏实时预览、小程序置灰 nav/tab 写成「一期」，分期仍以 ROADMAP 为准：汇总中台是一期；历史搭配 CRUD 是二期（见 MIX 分册）。不要因为汇总页已经能点「保存搭配」就把分享复刻、官方模板一次做完。

对外文案不用「作品」「短视频」。需求里的作品卡片写作 **罐头卡片**。

## 一期范围

| 做 | 不做（入口可占位，不对用户承诺可保存/可套用） |
| --- | --- |
| 主题中心第四入口「我的装扮」→ `?tab=mine`；顶栏返回切回全局主题 Tab，不离开主题中心 | 新建 `theme-outfit` 路由 |
| 当前全局主题卡：预览、名称、风格/方言标签、【更换主题】→ 全局主题 Tab | 官方热门搭配模板、分享复刻、智能混搭推荐 |
| 一期四类局部槽位（罐头卡片、主页背景、头像框、评论气泡）：已启用则展示预览/名称/标签；空则「暂未设置该组件装扮」；【修改】进 `theme-dress?group=`；已启用可【关闭】 | 把交互按钮、话题卡、弹窗输入做成一期必填槽位 |
| 覆盖开关区（文案与确认见覆盖分册） | 小程序把 nav/tab 做成置灰可改（一期 **藏** 未启用的原生栏槽位） |
| 【重置全部装扮】二次确认；只清当前生效配置，不删收藏 / 历史搭配 / 最近使用 | 运营代改用户当前配置或历史搭配 |
| 游客只本地；登录写云端；弱网先缓存；换账号清本地再拉云端 | 后台运营配置这个页面（纯用户私有数据） |

历史搭配保存 / 重命名 / 删除 / 一键应用见 [`THEME_CENTER_MIX.md`](THEME_CENTER_MIX.md)。【预览装扮效果】全屏沙盒见预览分册。已拥有未启用 / 去获取走权限货架。

## 双端

- 页面结构、入口、返回、重置与开关两端一致。
- **小程序一期：** 未启用的 `nav_bar` / `tab_bar` 槽位不展示。若用户在 H5 已启用原生栏装扮，小程序汇总里可见该行，标「当前环境不生效」，【修改】锁定，可【关闭】。原生栏永不注入 `style_json`。
- **小程序二期：** 未启用的原生栏槽位也可出现，置灰 +「小程序暂不支持该组件装扮」。
- 渲染严格跟覆盖开关：开 = 只画当前全局主题；关 = 已启用局部层覆盖对应组件。

## 入口与返回

| 操作 | 结果 |
| --- | --- |
| 主题中心点「我的装扮」 | 同页切 `tab=mine`（`goThemeOutfit`） |
| 顶栏返回（本 Tab） | 切回「全局主题」，**不** `navigateBack` 到个人中心 |
| 【更换主题】 | 切「全局主题」Tab |
| 【修改】某类局部 | `navigateTo` `/pages/users/theme-dress?group=` |
| 覆盖 / 重置 / 预览 / 保存搭配 | 模态，不入栈 |

## 当前生效

### 全局主题卡

展示当前 `theme_id` 的预览缩略、名称、风格/方言/权限标签。【更换主题】只切 Tab，不改配置。

### 局部装扮槽位

按组件列出。一期固定四类可渲染组；其它组仅在用户已经启用时追加。

| 行状态 | 展示 | 操作 |
| --- | --- | --- |
| 已启用且生效 | 预览、装扮名、标签、「当前生效」 | 修改、关闭 |
| 已启用但覆盖开 | 配置仍在，「已被全局主题覆盖」 | 修改、关闭（不删收藏/搭配） |
| 已启用但小程序不支持 | 置灰，「当前环境不生效」 | 修改锁定，可关闭 |
| 已绝版 / 已下架 | 标注「已绝版」或「已下架」 | 修改进列表；不可再启用失效件 |
| 未设置 | 「暂未设置该组件装扮」 | 修改进对应列表 |

全部一期槽位都空时，仍列出空行，并保留「去搭配」引导到局部装扮 Tab。

## 重置全部装扮

二次确认：

- 标题：重置全部装扮？
- 内容：确定重置所有装扮？将恢复系统默认样式，已保存的搭配方案不会删除
- 按钮：取消 / 确定重置

确认后：默认全局主题 + 空 `decoration_map` + 覆盖开关恢复默认 **开**。不删除 `user_saved_mix` / 本地方案、收藏、最近使用、点赞。仅当前生效配置回到出厂。

连点走已有启用防抖，避免重复写配置。

## 覆盖开关

固定在本页。文案、默认开、关→开确认、不得清空 `decoration_map`，全部以覆盖分册为准。

## 同步

- 游客：生效配置、本地方案只在本地。
- 登录：生效配置 `PUT /users/theme/config/`；写操作需登录，后端校验身份，禁止改别人的配置。
- 网络失败：先展示本地，排队重试，页面可继续看、可继续点重置/改局部。
- 账号切换：清旧账号本地装扮后再拉新账号云端，避免串号。策略见 [`THEME_CENTER_SYNC.md`](THEME_CENTER_SYNC.md)。

## 二期（入口在本页，规则见分册）

| 能力 | 约定 |
| --- | --- |
| 历史搭配 | 见 [`THEME_CENTER_MIX.md`](THEME_CENTER_MIX.md) |
| 预览装扮效果 | 全屏沙盒，跟当前开关走，点「立即应用」前不改真实页。历史方案预览见 MIX / 预览分册。 |
| 已拥有未启用 / 未拥有 | 权限货架，启用仍走服务端校验。 |

官方模板、分享复刻、智能推荐是三期以后，见 [`THEME_CENTER_ECO.md`](THEME_CENTER_ECO.md)。

## 埋点（一期）

`theme_center_enter`、切到「我的装扮」的 `theme_tab_switch`、`theme_reset_all`。保存 / 应用搭配见 [`THEME_CENTER_MIX.md`](THEME_CENTER_MIX.md) 与 ANALYTICS。

## 后台

无独立运营页。只读用户当前配置、搭配列表、开关。运营不能替用户改私有搭配。引用中的主题/装扮禁止物理删除。
