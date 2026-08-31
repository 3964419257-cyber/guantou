# 四维权限体系

**文档状态：** 二期（独立拆分；启用以本文 + SECURITY / DATA / FAULT 为准）  
**产品：** 乡声集盒 · 主题中心 · 免费 / 会员 / 活动 / 创作者  
**页面：** 列表与详情标签；引导进 `/pages/users/theme-member`、`theme-event`、`theme-acquire`（不另开权限路由）

本文只定 **谁能启用哪件装扮**。全局换装见 [`THEME_CENTER_GLOBAL.md`](THEME_CENTER_GLOBAL.md)。局部装扮见 [`THEME_CENTER_DRESS.md`](THEME_CENTER_DRESS.md)。预览见 [`THEME_CENTER_PREVIEW.md`](THEME_CENTER_PREVIEW.md)。搜索筛选见 [`THEME_CENTER_SEARCH.md`](THEME_CENTER_SEARCH.md)。历史搭配一键应用跳过无权限件见 [`THEME_CENTER_MIX.md`](THEME_CENTER_MIX.md)。空态标识见 [`THEME_CENTER_STATUS.md`](THEME_CENTER_STATUS.md)。进退见 [`THEME_CENTER_NAV.md`](THEME_CENTER_NAV.md)。标准化数据结构（独立拆分）见 [`THEME_CENTER_DATA.md`](THEME_CENTER_DATA.md)。启用校验见 [`THEME_CENTER_SECURITY.md`](THEME_CENTER_SECURITY.md)。分期见 [`THEME_CENTER_ROADMAP.md`](THEME_CENTER_ROADMAP.md)。后台配置见 [`THEME_CENTER_ADMIN.md`](THEME_CENTER_ADMIN.md)（Django Admin 可改单件 `privilege_type`；批量改权限与 `/manage/` 中台属三期）。双端存储与同步见 [`THEME_CENTER_SYNC.md`](THEME_CENTER_SYNC.md)。

需求原文若写「一期核心底座」，规划仍以 ROADMAP 为准：一期只保证 **免费可启用皮**；会员 / 活动 / 创作者 **可以展示、引导去获取，不能对一期用户承诺付费或任务闭环**。不要把支付、体验券、创作者等级阶梯一次做完。用户投稿自制装扮见 [`THEME_CENTER_UGC.md`](THEME_CENTER_UGC.md)（三期；`creator_unlocked` 二期只表示可领取创作者皮，不开放投稿）。三期支付、碎片、同城第五维见 [`THEME_CENTER_ECO.md`](THEME_CENTER_ECO.md)：绝版仍不可启用，不加 `privilege_type=geo`。

对外文案不用「作品」「短视频」。创作者任务说「装一罐」，不说发作品。

契约 `privilege_type`：`free` `member` `activity` `creator`。前端内部 `access`：`free` `member` `event` `creator`。用户可见：免费 / 会员专属 / 活动限定 / 方言创作者专属。不要再发明第四套权限名。

## 二期范围

| 做 | 不做 |
| --- | --- |
| 四类标签在列表、详情、预览一致；未解锁不藏，只拦启用 | 真实支付 / IAP；体验券（三期商业化见 [`THEME_CENTER_ECO.md`](THEME_CENTER_ECO.md)） |
| 免费：游客与登录都可启用（登录走 `POST /users/theme/apply/`） | 创作者多级阶梯解锁不同皮 |
| 会员：非会员点启用 → 开通弹窗 → 会员页；`is_member` 才算 | 节日限时把会员皮改免费 |
| 活动：进行中去活动页领取；绝版只预览，**不能再启用**（含已领取） | 智能按消费/创作推权益皮 |
| 创作者：未达标去任务页；达标后领取再启用 | `/manage/` 批量改权限（三期） |
| 启用、写配置、一键搭配：服务端再校验；无权限不写云端、不注入该层样式 | 前端写死 `member=true` 当授权 |

一期活件仍是免费 `available` 的默认主题、素白纸本、一期四类 `*-plain`。会员 / 活动 / 创作者货架可占位。

## 四类规则

| 类型 | 谁能启用 | 未满足 | 标签 |
| --- | --- | --- | --- |
| 免费 | 人人 | — | 免费 |
| 会员 | 云端 `is_member`（演示页本地开关只是占位） | 预览 +「去开通会员」 | 会员专属 |
| 活动 | 在活动窗内且已领取（`activity_ids`） | 进行中去参与；结束后「已绝版」，不去活动页 | 活动限定 / 已绝版 |
| 创作者 | `creator_unlocked` 且已领取该件 | 未达标去任务；达标「领取」 | 方言创作者专属 |

与需求原文的差异（以 FAULT / SECURITY 为准）：

- **绝版后不可再启用**，即使曾经领取。一键搭配自动跳过。不是「领过就永久可换」。
- 会员过期 / 创作者条件不再满足：**不删** `decoration_map` / 主题 id，只停止渲染该层，回退免费默认；升级或续费后仍在 map 里则可再生效。
- 游客只应启用免费皮。开通会员页在未接支付前不得把游客变成真会员。

待上线：`status=coming`，「敬请期待」，不可启用、不可领取。

## 引导

弹窗与子页文案沿用已落地句，不要另写一套：

- 会员：「该装扮为会员专属，开通会员即可解锁全部会员主题与装扮。」
- 活动进行中：去 `theme-event`；结束：「该限定装扮活动已结束，无法获取」
- 创作者未达标：「暂未满足解锁条件，请完成方言创作任务」→ `theme-acquire?focus=creator`

防抖与启用同一套约 800ms，避免连弹。

## 联动

- **预览：** 未解锁可看缩略 / 详情；实时沙盒二期。启用仍校验。
- **收藏：** `available` 与已绝版（`deprecated` / `eventStatus=ended`）可收藏；`coming` 禁止新增。收藏不是授权。见 [`THEME_CENTER_SOCIAL.md`](THEME_CENTER_SOCIAL.md)。
- **搭配：** 可存无权限 id；一键应用跳过并提示「部分装扮已下架，已自动跳过」同类句。
- **最近使用：** 只在启用成功后记。
- **搜索：** 可按权限筛。见搜索分册。
- **渲染：** `hydrateOutfitStyle` 只注入当前 `hasPermission` 为真的层；无权限件留在配置里但不画。

## 同步

- 登录：`GET /users/theme/entitlement/` 刷新会员 / 创作者 / 活动领取。失败时沿用本地缓存，**启用当时仍打 apply**，不信过期缓存。
- 领取活动件：登录 `POST /users/theme/entitlement/`（`item_type` + `item_id`）写入 `activity_ids`；游客只写本地 owned。
- 换账号清空本地权益键再拉新账号。策略见 [`THEME_CENTER_SYNC.md`](THEME_CENTER_SYNC.md)。
- 会员从有到无：Toast「会员已到期，会员装扮暂不可用」，样式回退默认，不删配置。

## 安全

前端标签不是授权。抓包改 `item_id`、伪造会员标记、夹带 `style_json`：服务端忽略并 403/409，配置不变。`PUT` 新写入的无权限装扮 id 剔除；已在配置中且仅权益过期的 id 保留、停渲染。详见安全分册。权限加载失败时 **拒绝** 非免费启用。

## 后台（三期）

每件配置 `privilege_type`；活动填时间窗；不在 C 端改他人权益。报表用埋点 `permission_type` / `apply_result`，不上报用户 id。
