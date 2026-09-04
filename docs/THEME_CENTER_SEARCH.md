# 搜索、筛选、排序

**文档状态：** 二期（独立拆分；枚举与接口以本文 + DATA / FAULT / NAV 为准）
**产品：** 乡声集盒 · 主题中心 · 检索
**页面：** `/pages/users/theme-center` 顶栏搜索 + 筛选模态（规划独立搜索子页；现网用页内 `searching`）

本文只定 **怎么找装扮**。全局换装见 [`THEME_CENTER_GLOBAL.md`](THEME_CENTER_GLOBAL.md)。局部装扮见 [`THEME_CENTER_DRESS.md`](THEME_CENTER_DRESS.md)。进退见 [`THEME_CENTER_NAV.md`](THEME_CENTER_NAV.md)。标准化数据结构（独立拆分）见 [`THEME_CENTER_DATA.md`](THEME_CENTER_DATA.md)。容错见 [`THEME_CENTER_FAULT.md`](THEME_CENTER_FAULT.md)。四维权限见 [`THEME_CENTER_PRIVILEGE.md`](THEME_CENTER_PRIVILEGE.md)。历史搭配见 [`THEME_CENTER_MIX.md`](THEME_CENTER_MIX.md)。空态标识见 [`THEME_CENTER_STATUS.md`](THEME_CENTER_STATUS.md)。分期见 [`THEME_CENTER_ROADMAP.md`](THEME_CENTER_ROADMAP.md)。后台热搜配置见 [`THEME_CENTER_ADMIN.md`](THEME_CENTER_ADMIN.md)（三期）。双端存储与同步见 [`THEME_CENTER_SYNC.md`](THEME_CENTER_SYNC.md)。

这是 **二期** 能力。一期列表可以先有搜索框，**不对一期用户承诺组合筛选与方言检索**。不要把智能联想、搜索历史、常用筛选模板一次做完。

需求原文若写「作品卡片」，界面写作 **罐头卡片**。空态沿用已落地文案「没有找到相关主题或装扮，换个关键词试试」（不要改成另一句以免双端与 e2e 不一致）。搜索为子页：规划 `/pages/users/theme-search`，现网 `goThemeSearch` → `theme-center?searching=1&q=`。

对外文案不用「作品」「短视频」。

## 二期范围

| 做 | 不做 |
| --- | --- |
| 顶栏关键词模糊搜：名称、描述、风格/方言/组件标签；不区分大小写 | 独立搜索路由（可先页内 searching） |
| 热搜词条：点填并检索；无词则隐藏 | 后台热搜 CRUD（三期）；智能联想 |
| 筛选模态组合：权限、风格、组件、方言地域（可多选）、状态；一键重置 | 用户保存筛选模板 |
| 排序：最新上架 / 热度最高 / 免费优先 / 名称 A-Z | 按「启用量」单独排序（热度用收藏+点赞+分享） |
| 结果聚合全局主题 + 局部装扮，结果内 Tab 再切；卡片可预览/启用/收藏/分享 | 搜索历史、按检索偏好推荐 |
| 小程序检索 **展示** 原生栏装扮并置灰（二期降级），不是藏掉 | 把检索条件写入 `user_current_config`；「用户自制」筛选见 [`THEME_CENTER_UGC.md`](THEME_CENTER_UGC.md)（三期） |

登录 / 游客检索能力相同。启用仍走服务端校验，检索列表不是授权。

## 搜索

- 入口：主题中心顶栏常驻；PageShell「搜索」、按钮、输入框回车均可提交。
- 关键词最长 **64** 字，剥 HTML 标签，只当查询参数。
- 空词：不进搜索态、不请求，保留当前列表（不要当失败 Toast）。
- 命中：名称、描述、风格标签、方言地域标签、组件类型标签、权限文案。
- 结果同时含主题与局部装扮；用「全部 / 全局主题 / 局部装扮」再分。待上线置灰「敬请期待」，绝版可看不可启用。
- 清空输入框还原关键字；点「返回列表」退出搜索态。

热搜默认：川渝烟火、江南吴语、方言头像框、岭南粤韵、复古国风。三期再由后台配置上下线；C 端无词则不画这一行。

## 筛选与排序

筛选在模态里点【确定】才生效，点遮罩关闭不改条件（NAV）。条件可叠加。

| 维 | 契约 / 内部 | 用户可见 |
| --- | --- | --- |
| 权限 | `privilege_type` / `access` | 全部、免费、会员专属、活动限定、方言创作者专属 |
| 风格 | `style_tag` / `category` | 简约、地域方言风、复古、赛博、国风、市井烟火、节日限定、节日风俗、季节时令、二次元、极简暗色 |
| 组件 | `component_type` / `dressCategory` | 全局主题走主题列表；局部：导航栏、底部 Tab、交互按钮、**罐头卡片**、个人主页、头像挂件、评论区、话题卡片、弹窗输入框 |
| 方言 | `dialect_tag` 展示文案；内部码 `chuankiang` 等 | 川渝、江南吴语、岭南粤韵、闽台闽南、北方晋陕、湘楚潇湘、云贵滇黔（可多选） |
| 状态 | `status`：`available` `coming` `deprecated` | 全部、可直接使用、待上线、已绝版 |

排序：`newest` 最新上架、`heat` 热度最高、`free` 免费优先、`name` 名称 A-Z。热度只用服务端聚合计数，不用客户端上报增量。见 [`THEME_CENTER_SOCIAL.md`](THEME_CENTER_SOCIAL.md)。

一期小程序浏览列表仍 **藏** nav/tab。二期检索命中这些件时置灰「小程序暂不支持」，【应用】锁定。

## 状态记忆

- 筛选、排序、关键字：本次会话 + 本地 `ui_theme_query` / `ui_theme_search_cache`（页脚「筛选条件会临时保留」）。
- **不** 写入云端 `recent_use_list` / `user_current_config`。换账号清空主题本地键。策略见 [`THEME_CENTER_SYNC.md`](THEME_CENTER_SYNC.md)。
- 退出搜索态（返回列表 / 顶栏返回）关掉 `searching`，筛选可仍在。
- 切全局 / 局部 Tab 不丢已确定的筛选；搜索态盖住 Tab 列表。

## 空态与失败

| 场景 | 表现 |
| --- | --- |
| 无搜索命中 | `EmptyState`「没有找到相关主题或装扮，换个关键词试试」+「返回列表」；Toast「没有匹配的主题装扮，请更换关键词」 |
| 无筛选命中 | 「当前筛选条件下暂无可用装扮」；筛选里【重置】 |
| 目录失败 | 已有「装扮列表加载失败，请检查网络后重试」 |
| 无效词 / 剥标签后为空 | 当空搜索，不崩 |

提交搜索、点筛选确定，不在输入过程打接口。接分页后同样参数走 `GET /themes/`、`GET /decorations/`。

## 接口

Query 与 DATA 一致：`keyword` `privilege_type` `style_tag` `dialect_tag` `status` `sort` `support_terminal` `component_type` `page` `page_size`。服务端过滤后再分页。`sort=free`：免费件在前。关键词搜名称、描述，并匹配标签数组。

现网内置清单可在客户端 `queryThemeCatalog` 过滤；注入目录 fetcher 后应带同样 query，禁止一次拉全货架。

## 埋点

`theme_search`（`keyword`，`result_count`）、`theme_hot_search_click`、`theme_filter_click`（权限/风格/组件/方言/排序）。空结果也报 `result_count=0`。不要上报用户 id。

## 后台（三期）

热搜词上下线、标签字典、检索频次报表。二期热搜用内置词即可。C 端不要调 `/manage/`。
