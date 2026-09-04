# 装扮三层预览体系

**文档状态：** 一期 MVP（独立拆分；分层与沙盒以本文 + ROADMAP / NAV 为准）
**产品：** 乡声集盒 · 主题中心 · 预览
**页面：** 主题中心列表 / 详情模态 / `ThemeLivePreview` 沙盒（均不入栈）

本文只定 **怎么看、怎么隔离、什么时候才真正启用**。全局换装见 [`THEME_CENTER_GLOBAL.md`](THEME_CENTER_GLOBAL.md)。局部装扮见 [`THEME_CENTER_DRESS.md`](THEME_CENTER_DRESS.md)。覆盖开关见 [`THEME_CENTER_OVERLAY.md`](THEME_CENTER_OVERLAY.md)。我的装扮见 [`THEME_CENTER_OUTFIT.md`](THEME_CENTER_OUTFIT.md)。历史搭配见 [`THEME_CENTER_MIX.md`](THEME_CENTER_MIX.md)。最近使用见 [`THEME_CENTER_RECENT.md`](THEME_CENTER_RECENT.md)。四维权限见 [`THEME_CENTER_PRIVILEGE.md`](THEME_CENTER_PRIVILEGE.md)。收藏分享热度见 [`THEME_CENTER_SOCIAL.md`](THEME_CENTER_SOCIAL.md)。空态标识见 [`THEME_CENTER_STATUS.md`](THEME_CENTER_STATUS.md)。分期见 [`THEME_CENTER_ROADMAP.md`](THEME_CENTER_ROADMAP.md)。进退栈见 [`THEME_CENTER_NAV.md`](THEME_CENTER_NAV.md)。性能见 [`THEME_CENTER_PERF.md`](THEME_CENTER_PERF.md)。安全见 [`THEME_CENTER_SECURITY.md`](THEME_CENTER_SECURITY.md)。双端存储与同步见 [`THEME_CENTER_SYNC.md`](THEME_CENTER_SYNC.md)。标准化数据结构（独立拆分）见 [`THEME_CENTER_DATA.md`](THEME_CENTER_DATA.md)。

需求原文若把全屏实时模拟、搭配方案预览写成「一期」，分期仍以 ROADMAP 为准：卡片缩略 + 详情大图是一期；全屏沙盒是二期。仓库里已有实时预览入口，**不对用户承诺已交付**。不要因为沙盒能点开就把预览当成启用。

对外文案不用「作品」「短视频」。需求里的作品卡片 / 作品流写作 **罐头卡片 / 首页罐头流**。

## 一期范围

| 做 | 不做（入口可占位） |
| --- | --- |
| 列表卡片缩略（CSS 线框或后台 `cover_img`） | 把全屏实时模拟当成一期闸门 |
| 详情弹窗大图（`detail_img` 或同套缩略放大）；点击放大，可缩放查看细节 | 用户上传预览截图、预览生成海报分享 |
| 待上线 / 已绝版仍可看缩略和详情；待上线禁用全屏模拟 | 预览时调用 `POST /users/theme/apply/` 或写配置 |
| 图加载失败用占位，不挡打开详情 | 自定义预览场景、运营可配样例页（三期后台） |
| 游客与登录预览行为一致 | |

全屏 `ThemeLivePreview`、我的装扮「预览装扮效果」、历史搭配预览见 [`THEME_CENTER_MIX.md`](THEME_CENTER_MIX.md)；沙盒不写真实配置，直到点「立即应用」。

## 三层

| 层 | 期 | 打开 | 关闭 |
| --- | --- | --- | --- |
| 1 卡片缩略 | ● | 列表上展示；点卡片进详情 | 无 |
| 2 详情大图 | ● | 详情模态；再点图进放大层 | 关放大层仍在详情；关详情回列表 |
| 3 全屏实时模拟 | ○ | 详情「实时预览」或我的装扮「预览装扮效果」 | 取消 / 关闭：不改真实配置；「立即应用」才启用 |

全部是模态，**不 `navigateTo`**。

## 沙盒（各期都要）

- 预览只读目录 `style_json` / 预览图，**禁止**前端自造样式。
- 打开、缩放、关闭预览 **不写** `user_current_config`、不打 apply。只有点启用 / 立即应用才走真实保存，并做服务端校验。
- 渲染跟当前「全局主题覆盖局部装扮」开关走：开 = 只模拟当前（或预览中的）全局主题；关 = 叠已启用局部层。
- 关预览：`abortThemePreview`，`v-if` 卸沙盒实例，释放模拟节点。
- 连点预览按钮防抖，避免叠多层。

## 状态

| 状态 | 缩略 / 详情大图 | 全屏模拟 | 启用 |
| --- | --- | --- | --- |
| 可用 | 可 | 二期可 | 可（权限通过） |
| 待上线 | 可（可模糊） | 禁用「敬请期待」 | 禁用 |
| 已绝版 | 可 | 可看不可用 | 禁用 |
| 小程序不支持该组件 | 可看 | 可看并标注不生效 | 禁用 |

图或 JSON 失败：占位，不白屏。Toast 见 FAULT：「装扮资源加载异常」。

## 双端

- **H5：** 三层都能看。详情放大层支持缩放。
- **小程序：** 逻辑相同。原生导航栏 / TabBar **不**在预览里假装已换皮；详情与沙盒标注「小程序部分原生组件为系统默认样式」。一期列表仍 **藏** nav/tab 装扮入口（不要靠预览去试 `setNavigationBarColor`）。

## 二期占位（现网可点）

| 能力 | 约定 |
| --- | --- |
| 全屏模拟 | 首页罐头流 / 个人中心 / 评论区 / 话题卡；文案「预览仅为模拟效果，不会修改你的界面」 |
| 预览全局主题 | 用该主题 + 当前局部 map + 当前开关 |
| 预览局部装扮 | 叠到当前全局主题，跟开关 |
| 我的装扮「预览装扮效果」 | 还原当前整套，不改配置直到立即应用 |
| 小程序沙盒 | 「⚠️微信小程序原生组件无法自定义，该部分样式不会生效」 |
| 底部按钮 | 取消（关沙盒） / 立即应用（才写配置） |

历史搭配单独预览见 [`THEME_CENTER_MIX.md`](THEME_CENTER_MIX.md)。场景切换 Tab、自定义样例页是三期以后补完项。

## 资源

后台字段：`cover_img`（列表）、`detail_img`（详情）。上传校验与 WebP 缩略见 [`THEME_CENTER_ADMIN.md`](THEME_CENTER_ADMIN.md)。C 端 token 名（`default` / `simple`）用 CSS 线框模拟，不请求假 URL。http(s) 地址才走 `<image>` 懒加载；失败回线框占位。

解析后的 `style_json` 只放内存，不进本地存储。同装扮反复进详情不重复解析，见 PERF。

## 埋点

一期：`theme_item_enter_detail`、`theme_preview_click` 且 `preview_type=大图预览`。
`preview_type=实时模拟预览`、预览→启用转化随二期沙盒验收。

## 后台

运营为每件配置封面与详情图。C 端预览 **不是** 运营后台预览（后台预览见 ADMIN，同样不得写运营员自己的 App 配置）。
