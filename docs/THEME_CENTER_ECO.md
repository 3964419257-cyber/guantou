# 三期商业化与生态拓展

**文档状态：** 独立拆分（**三期**低优先级；一期 / 二期不对用户开放支付、碎片、社区、榜单、复刻）  
**产品：** 乡声集盒 · 主题中心 · 商业化、积分碎片、社区复刻、节日运营  
**对应实现：** 现网无账本、无支付、无公开搭配、无社区路由。节日窗复用已有 `activity_start_at` / `activity_end_at` + `sync_theme_activity_windows`。投稿见 [`THEME_CENTER_UGC.md`](THEME_CENTER_UGC.md)（**尚未开工**，不是已完成）

本文只定 **三期商业化与生态玩法的边界、和已有分册怎么衔接、现网绝不提前开通什么**。不定 UI 稿、支付通道选型、买断合同。分期谁先做见 [`THEME_CENTER_ROADMAP.md`](THEME_CENTER_ROADMAP.md)。启用以 [`THEME_CENTER_PRIVILEGE.md`](THEME_CENTER_PRIVILEGE.md) + [`THEME_CENTER_SECURITY.md`](THEME_CENTER_SECURITY.md) 为准。字段见 [`THEME_CENTER_DATA.md`](THEME_CENTER_DATA.md)。搭配见 [`THEME_CENTER_MIX.md`](THEME_CENTER_MIX.md)。热度见 [`THEME_CENTER_SOCIAL.md`](THEME_CENTER_SOCIAL.md)。后台见 [`THEME_CENTER_ADMIN.md`](THEME_CENTER_ADMIN.md)。埋点见 [`THEME_CENTER_ANALYTICS.md`](THEME_CENTER_ANALYTICS.md)。跳转见 [`THEME_CENTER_NAV.md`](THEME_CENTER_NAV.md)。容错见 [`THEME_CENTER_FAULT.md`](THEME_CENTER_FAULT.md)。总览见 [`THEME_CENTER.md`](THEME_CENTER.md)。

需求原文若写「UGC 生态已搭建完成」「所有规则后台可配无需发版」「绝版已购仍可用」「会员搭配无上限」「第五维同城权限」「创作者等级解锁不同皮」「预览/浏览领积分」，规划仍以 ROADMAP / PRIVILEGE / MIX / SECURITY / ADMIN / STATUS 为准。**不要**另造第五套 `privilege_type`，**不要**改已落地 Toast / 空态，**不要**把积分写进罐头/铭牌钱包。

对外文案不用「作品」「短视频」。发方言 **罐头** 才兑碎片。Toast 仍不超过 32 字；三期新句写入 FAULT 后再用。

## 分期范围

| 现在做 | 不做（三期未开工 / 需求原文不采用） |
| --- | --- |
| 文档钉契约；现网无入口即无支付/碎片/社区 | `theme-community` / `theme-wallet` 进 `pages.json` |
| 节日 / 活动件：已有活动窗 + 校正命令 | 写死元旦春节引擎、节日 CMS 空态插画 |
| 热度三计数可支撑未来 `sort=heat` / 榜单 | 日周月榜页、Excel 实时看板（ADMIN） |
| 私有搭配 10 套、一键应用跳过失效件 | 公开搭配、一键复刻他人方案（MIX 二期已禁） |
| 会员过期 / 绝版：停渲染不删配置（PRIVILEGE） | 绝版后已购/已领仍可启用；会员「绝版免费体验」 |
| 免费用户可换免费皮 | 预览、浏览、收藏自动发积分（易刷） |
| | 真实支付 / IAP / 单款 SKU / 礼包中台 |
| | 积分碎片本地加减；与其它业务资产互通 |
| | 会员打破搭配上限 10；动态皮肤引擎 |
| | `privilege_type=geo` / 定位解锁第五维 |
| | 智能推荐、偏好画像（ANALYTICS 已禁） |
| | 创作者等级阶梯、买断分成、社区点赞评论 |
| | 连续包、AI 搭配（后续单独立项） |
| | 后台改 STATUS 空态句、FAULT 句 |

一期 / 二期验收 **不包含** 本文任何商业化闭环。二期权限页可占位「去开通」，**不得**把游客变成真会员。

```text
现网
  → 无 /users/theme/credits|fragments|ranks
  → 无公开 mix、无社区页
  → 启用仍四维：free / member / activity / creator
三期（二期闸门过后再排）
  → 碎片账本只服务端
  → 公开搭配复制走同一套 apply + 下架跳过
  → 节日仍改活动窗，不新引擎
  → 榜单聚合三计数，无账号 PII
```

## 原则

1. **免费底座不拆。** 默认主题、素白纸本、一期四类免费皮始终可换。商业化只叠在会员 / 活动 / 创作者 / 未来单款购上。
2. **绝版规则不破。** `deprecated` 一律不可新启用、已启用停渲染。付费订单可查，不换这条。与 PRIVILEGE / MIX / FAULT 一致。
3. **账本在云端。** 碎片 / 积分不能只写 storage。游客无账本。
4. **复刻不是新渲染。** 公开搭配复制 = 把 id 写入自己的配置 / 私有 mix，再跑现有校验与跳过。
5. **四维够用。** 同城限定用标签 + 账号方言校验（三期可选），不加第五 `privilege_type`。
6. **规则可配 ≠ 文案可配。** 活动窗、上下架可后台改；空态 / Toast 仍 FAULT / STATUS。
7. **双端同一套权益。** 小程序原生 nav/tab 仍不能换皮，这不是付费特权。

---

## 一、积分与碎片（三期账本）

ROADMAP：发方言 **罐头** 获碎片，兑换限定装扮。资产只在装扮域，不与罐头赞、站内信积分混户。

| 来源 | 是否采用 |
| --- | --- |
| 发布/校验通过的方言罐头 | 采用（服务端记账） |
| 创作者投稿 **过审上架** | 可少量碎片，封顶；未过审不发 |
| 每日打开主题中心、预览、滑动、收藏 | **不采用**（刷取面太大） |
| 切换主题 / 浏览 UGC | **不采用** |

兑换：只能兑 `coming` 以外且 **未 deprecated** 的限定皮；兑换后写入 entitlement（与 `activity_ids` 同类白名单，三期再加列，不塞 `extra`）。过期由服务端跑批，C 端展示余额以 GET 账本为准。

台账：`credit` / `fragment` 收支行，C 端不回他人 `user_id`。超限 429 用已有「操作过于频繁，请稍后再试」。现网 **无** `/users/theme/credits/`、`/users/theme/fragments/`。

## 二、付费

二期：`is_member` 占位，无 IAP。三期若接支付：

- 会员：仍是 `privilege_type=member` + `is_member`，不新权限名。
- 单款解锁：已购 id 白名单；**目录 `deprecated` 后仍不可 apply**（订单保留）。不是「买断永久换绝版皮」。
- 礼包 / 限时折扣：ADMIN 三期中台，不在 C 端写死 SKU。
- 会员「搭配无上限」「绝版免费体验」「专属动态装扮」：**不采用**。搭配仍最多 10；动效仍在 `style_json`。
- 会员过期：已有 Toast「会员已到期，会员装扮暂不可用」，停渲染不删配置。

未接支付前，开通会员页不得把游客写成真会员（PRIVILEGE）。

## 三、公开搭配与一键复刻

二期 MIX：**私有** 10 套，不做分享复刻。三期社区：

- 公开的是 **快照 id 集**（主题 + `decoration_map` + 覆盖开关），可带展示名。原创账号只在 staff 侧，C 端最多昵称，**不要** openid。
- 一键复刻 = 对当前用户跑 `assert_applyable`：无权限 / 绝版 / 终端不支持 **跳过**，Toast 用已有「部分装扮已下架，已自动跳过」或去获取引导，不新造复刻失败句（上线若要「去解锁」走 PRIVILEGE 已有弹窗）。
- 禁止把别人的 mix 改名成自己再标原创；复制结果是当前用户的 **私有** mix 或当前配置。
- 复刻次数可服务端计数，**不**进 SOCIAL 的 `share_count` 以免和分享热度混在一起。
- 失效公开搭配：列表可留、按钮不可复刻。

现网 mix JSON **无** `is_public` / `copy_count`。规划社区页 `/pages/users/theme-community`，**不进现网 `pages.json`**。

## 四、节日与方言限时

不新做节日调度器。运营给活动件填 `activity_start_at` / `activity_end_at`，跑已有 `sync_theme_activity_windows`。方言民俗皮用 `dialect_tags` + `privilege_type=activity`。限时免费 = 窗内 `free` 或活动领取，窗后 `deprecated`，规则同二期活动件。

「无人值守」= 校正命令进 cron，不是新中台。节日转化看板属 ADMIN 三期，不上报 PII。

## 五、社区与榜单

聚合精选 / 过审 UGC / 公开搭配：三期社区页。榜单维度最多：热度（三计数）、方言标签。日周月榜是查询窗口，不另存套热度字段。官方置顶 = staff 标记，不是 `sort_weight` 进 C 端全量目录（DATA 已拒排序权重列）。

智能推荐、路径画像：**不做**（ANALYTICS）。二期列表 `sort=heat` 足够。

现网无 `/users/theme/ranks/`。

## 六、同城 / 同方言

**不加** `privilege_type=geo`。三期若做「本地方言限定」：目录标签已是 `dialect_tags`，启用时校验账号 `primary_dialect`（或资料地域）是否落在该标签对应码；对不上则 403 `privilege`，走去获取或隐藏入口。定位失败：不当成外地拒绝免费皮，只藏 **显式标了地域限定** 的件。GPS 不是授权。

各地区偏好用 ANALYTICS `region_tag` 聚合，不上报账号。

## 七、创作者激励

投稿资格与审核见 UGC。本文不发等级阶梯、不发买断流水、不发分成。流量扶持 = 社区置顶 / 精选标记。认证 = staff 标记，不是新 `privilege_type`。高热度发碎片走第一节封顶规则，过审前不发。

## 八、接口与页面（现网 404 / 不登记）

| 路径 | 现网 |
| --- | --- |
| `/users/theme/credits/`、`/fragments/`、`/ranks/` | 404 |
| `/users/theme/submissions/` | 404（UGC） |
| `/pages/users/theme-community`、`theme-wallet`、`theme-submit` | 不在 `pages.json` |

`THEME_API_PATHS` 不加这些键。写账本 / 复刻必须登录 + 服务端校验 + 限流。

## 九、需求原文对照

| 原文 | 本文 |
| --- | --- |
| UGC 已完成 | 否，见 UGC 分册 |
| 每日使用/预览/收藏领积分 | 不采用 |
| 积分碎片双资产 | 三期服务端账本；罐头产出碎片优先 |
| 绝版已购仍可用 | 不采用；`deprecated` 停用 |
| 会员搭配无上限 | 仍 10 套 |
| 所有规则后台可配无需发版 | 活动窗可配；Toast/空态不可配 |
| 第五维同城权限 | 方言标签 + 资料校验，不新枚举 |
| 创作者等级 / 买断 / 分成 | 不采用 |
| 智能推荐、日周月榜中台 | 榜单三期可查询；推荐不做 |
| 社区点赞评论、连续包、AI 搭配 | 后续单独立项 |

## 十、验收

**现在：**

- 无社区 / 钱包 / 榜单 / 账本路由；公开目录无 `price` / `geo_region` / `is_public`。
- 搭配无公开字段；权益仍三字段。
- 绝版不可启用；会员过期停渲染。
- 免费皮不受支付、定位影响。
- 文案无「作品」「短视频」。

**三期开工后：**

- 碎片只云端、可对账；游客无余额。
- 复刻走 apply 校验与下架跳过。
- 节日只改活动窗，到点 `deprecated`。
- 榜单无 PII；同方言校验不靠客户端 GPS。
- 支付到账不绕过 `deprecated` / 终端 / 四维权限。
