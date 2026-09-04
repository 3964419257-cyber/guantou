# 装扮社交能力（收藏 / 分享 / 热度）

**文档状态：** 二期（独立拆分；收藏、分享渠道与热度以本文 + DATA / FAULT / ANALYTICS / SECURITY 为准）
**产品：** 乡声集盒 · 主题中心 · 收藏、分享、热度
**页面：** 主题中心「我的收藏」Tab；详情 / 预览上的收藏与分享；`ThemeShareSheet` 模态（不另开社交路由）

本文只定 **收藏留存、多渠道分享、公开热度**。全局换装见 [`THEME_CENTER_GLOBAL.md`](THEME_CENTER_GLOBAL.md)。局部装扮见 [`THEME_CENTER_DRESS.md`](THEME_CENTER_DRESS.md)。预览见 [`THEME_CENTER_PREVIEW.md`](THEME_CENTER_PREVIEW.md)。搜索热度排序见 [`THEME_CENTER_SEARCH.md`](THEME_CENTER_SEARCH.md)。权限（收藏不是解锁）见 [`THEME_CENTER_PRIVILEGE.md`](THEME_CENTER_PRIVILEGE.md)。历史搭配见 [`THEME_CENTER_MIX.md`](THEME_CENTER_MIX.md)。进退见 [`THEME_CENTER_NAV.md`](THEME_CENTER_NAV.md)。标准化数据结构（独立拆分）见 [`THEME_CENTER_DATA.md`](THEME_CENTER_DATA.md)。埋点见 [`THEME_CENTER_ANALYTICS.md`](THEME_CENTER_ANALYTICS.md)。分期见 [`THEME_CENTER_ROADMAP.md`](THEME_CENTER_ROADMAP.md)。后台报表与分享模板见 [`THEME_CENTER_ADMIN.md`](THEME_CENTER_ADMIN.md)（三期）。双端存储与同步见 [`THEME_CENTER_SYNC.md`](THEME_CENTER_SYNC.md)。

需求原文若写「一期」或把排行榜、分享激励、后台导出写成必做，规划仍以 ROADMAP 为准：这是 **二期**。一期可以先有星标和分享入口，**不对一期用户承诺云端收藏与热度账本**。不要把朋友圈开放标签、自定义海报编辑器、热度榜页一次做完。

对外文案不用「作品」「短视频」。空态沿用已落地句「你还没有收藏任何主题装扮，快去挑选喜欢的吧」。待上线仍用「待上线装扮暂不支持收藏 / 分享」（不要改成另一句以免双端与 e2e 不一致）。状态 UI 见 [`THEME_CENTER_STATUS.md`](THEME_CENTER_STATUS.md)。

## 二期范围

| 做 | 不做 |
| --- | --- |
| 列表、详情、预览、收藏 Tab 常驻收藏 / 分享 | 分享排行榜、热度榜页（三期见 [`THEME_CENTER_ECO.md`](THEME_CENTER_ECO.md)） |
| 收藏 / 取消即时切换；登录写 `POST/DELETE /users/theme/collects/`；游客只本地 | 分享领装扮 / 积分激励 |
| 「我的收藏」Tab 聚合主题 + 局部装扮；已下架记录保留置灰 | 后台导出热度报表、配置分享模板（三期） |
| H5：站内私信、复制链接、生成海报；小程序：私信、官方转发、海报 | 微信朋友圈开放标签（H5 用复制链接代替） |
| 方言地域标签匹配分享口语句；跳转 `theme-center` / `theme-dress` 详情模态 | 小程序上报「复制链接」（ANALYTICS 不上报该渠道） |
| 热度 = 服务端 `collect_count` + `like_count` + `share_count`；支撑 `sort=heat` | 客户端上报 count 增量；按启用量单独排序；UGC 另套热度公式（过审后共用本表，见 [`THEME_CENTER_UGC.md`](THEME_CENTER_UGC.md)） |
| 未解锁 / 已绝版可收藏、可分享，只拦启用 | 收藏即解锁、分享即赠送会员皮 |

收藏是个人标记，不是授权。启用仍走权限分册与 `POST /users/theme/apply/`。

## 收藏

- 入口：全局 / 局部卡片星标、详情【加入收藏 / 取消收藏】、预览、收藏 Tab。点卡片进详情（NAV），不是点星标就启用。
- 双向切换，约 800ms 防抖，与启用同一套 `beginThemeApply`。
- **可收藏：** 目录 `status=available` 或 `deprecated`（含未解锁会员 / 活动 / 创作者、已绝版）。**待上线** `coming` 禁止新增，Toast 用已落地句「待上线装扮暂不支持收藏」。C 端不要把 `deprecated` 映射成待上线。
- **已下架：** 目录没命中的 id 仍留在收藏列表，名称「装扮已下架」，可预览、可取消收藏，不能启用、不能再分享当新种草。
- 登录：先写本地再打收藏接口；失败保留本地，Toast「操作已本地保存，同步云端失败，网络恢复后自动同步」。
- 游客：只本地；换设备丢失。不计入该账号云端列表。
- 换账号：清本地收藏键，再拉新账号 `GET /users/theme/collects/`。策略见 [`THEME_CENTER_SYNC.md`](THEME_CENTER_SYNC.md)。
- 重置全部装扮 **不删** 收藏。

空态：`EmptyState` 上述文案 +「去挑选」切回全局主题 Tab。

## 分享

渠道以 ANALYTICS 为准，不要私增枚举：

| 端 | 渠道 | 行为 |
| --- | --- | --- |
| H5 | `APP私信` | `goMailSend` 预填标题与口语句 |
| H5 | `微信` | 复制落地链，Toast「链接已复制」 |
| H5 | `复制链接` | 同上 |
| H5 / 小程序 | `保存海报` | 优先 `poster_img`；否则封面；小程序拒权用「保存海报失败，请授予相册权限」 |
| 小程序 | `小程序转发` | `open-type="share"` + `onShareAppMessage` |

落地 path：`/pages/users/theme-center?kind=theme&id=` 或 `/pages/users/theme-dress?group=&id=`。`id` / `kind` / `group` 只留白名单字符。未知 id **打开列表，不打开详情**，不展示「已拥有」。

口语句：无地域标签时沿用已落地句（默认主题「快来看看这个【默认方言主题】方言主题，太有家乡味道了！」；头像框「这个方言头像框好好看，一起来搭配吧」）。有 `region` / `dialect_tags` 时用对应方言口语句，仍不出现「作品」「短视频」。

失效件：待上线不打开分享层；绝版可分享，落地详情只预览、启用按权限/绝版规则禁用。

## 热度

- 展示：卡片 / 详情「热度」用服务端三计数字之和；无目录计数时内置清单可用本地种子，**不得**把种子写回接口。
- 收藏数跟 `collect_count`（个人星标 +1 仅本地展示，不 POST count）。
- `share_count`：`POST /users/theme/events/` 且 `event=theme_share_click`，同一用户或同一 visitor、同一 `item_id` **1 小时只加 1**。无身份的匿名请求记日志但不加公开热度。
- `like_count`：二期不做独立点赞账本；有值才计入热度。
- 排序：`sort=heat` 只信上述聚合。游客分享不写个人收藏，但带 visitor 的分享可计入公开 `share_count`。

## 安全

收藏 / 分享 / 事件接口限流见安全分册（收藏 POST/DELETE 共用 20 次/分钟）。禁止客户端提交 `like_count` / `share_count`。他人收藏列表不提供查询接口。越权 mix/collect id 对外 404。

## 后台（三期）

只读看每件的三计数；报表用埋点 `theme_collect_click` / `theme_share_click`，不上报用户 id。自定义分享模板、导出、榜单不做本期。
