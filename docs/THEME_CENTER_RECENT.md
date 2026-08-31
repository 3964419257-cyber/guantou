# 最近使用记录

**文档状态：** 二期（独立拆分；条数与同步以本文 + DATA / FAULT 为准）  
**产品：** 乡声集盒 · 主题中心 · 最近使用  
**页面：** `/pages/users/theme-center` 全局主题 / 局部装扮 Tab 顶部横滑条（不另开路由）

本文只定 **启用成功后的快捷复用条**。全局换装见 [`THEME_CENTER_GLOBAL.md`](THEME_CENTER_GLOBAL.md)。局部装扮见 [`THEME_CENTER_DRESS.md`](THEME_CENTER_DRESS.md)。覆盖开关见 [`THEME_CENTER_OVERLAY.md`](THEME_CENTER_OVERLAY.md)。我的装扮见 [`THEME_CENTER_OUTFIT.md`](THEME_CENTER_OUTFIT.md)。历史搭配见 [`THEME_CENTER_MIX.md`](THEME_CENTER_MIX.md)。预览见 [`THEME_CENTER_PREVIEW.md`](THEME_CENTER_PREVIEW.md)。四维权限见 [`THEME_CENTER_PRIVILEGE.md`](THEME_CENTER_PRIVILEGE.md)。分期见 [`THEME_CENTER_ROADMAP.md`](THEME_CENTER_ROADMAP.md)。进退见 [`THEME_CENTER_NAV.md`](THEME_CENTER_NAV.md)。标准化数据结构（独立拆分）见 [`THEME_CENTER_DATA.md`](THEME_CENTER_DATA.md)。双端存储与同步见 [`THEME_CENTER_SYNC.md`](THEME_CENTER_SYNC.md)。

这是 **二期** 能力。一期首页可以先有这条 UI，**不对一期用户承诺可复用**。不要把手动删记录、智能推荐、常用搭配推送一次做完。

需求原文若写「点卡片即启用」，进退以 NAV 为准：点卡片进详情预览，【应用】才写配置。空态沿用已落地文案「暂无最近使用记录，快去挑选装扮吧」（不要改成另一句以免双端不一致）。状态 UI 见 [`THEME_CENTER_STATUS.md`](THEME_CENTER_STATUS.md)。

对外文案不用「作品」「短视频」。

## 二期范围

| 做 | 不做 |
| --- | --- |
| 启用成功后自动记一条；同 id 只更新时间，不重复 | 用户手动增删最近使用 |
| 最多 **8** 条，按 `use_time` / `usedAt` 倒序，满了挤掉最旧 | 智能推荐同类风格 / 方言 |
| 横滑卡片：缩略、名称、状态标签；空态隐藏卡片 | 官方常用搭配快捷推送 |
| 点卡片 → 详情（主题模态 / 局部 `theme-dress?group=&id=`） | 后台运营配置这份列表（纯用户私有） |
| 【应用】快速启用；绝版/下架/环境不支持置灰 + Toast | |
| 无权限（会员/活动/创作者）：【应用】锁定，点卡片进详情走去获取 | |
| 游客只本地；登录写入 `recent_use_list`；换账号清本地 | |

重置全部装扮 **不删** 最近使用。见装扮汇总分册。

## 记录规则

- **何时写：** `POST /users/theme/apply/` 或本地 `persistActiveTheme` / `persistLocalDress` **成功之后**。预览、收藏、失败启用、远端 403/409 回滚不记。
- **存什么：** 契约 `item_id`、`item_type`（`theme` / `decoration`）、`use_time`。本地可另存 name / preview / group 以便目录缺失时还能画出「已下架」卡。
- **不记：** 待上线、当时已绝版、校验失败的件。
- 缺 `id` / `item_type` 的坏行丢掉，不画空白卡。目录里已经没了的 id：置灰「已下架」，不删用户记录（FAULT）。

## 展示

- 位置：主题中心 **全局主题 / 局部装扮** Tab 列表上方，标题「最近使用」。
- 全局 Tab 只列主题；局部 Tab 只列局部装扮。
- 最新在左。横滑 `scroll-view`。
- 空：`EmptyState`「暂无最近使用记录，快去挑选装扮吧」，不画滚动条。

| 状态 | 标签 | 点卡片 | 【应用】 |
| --- | --- | --- | --- |
| 可用 | 可用 / 权限标签 | 详情 | 启用（防抖；跟覆盖开关） |
| 绝版 | 已绝版 | 详情（只看） | 锁定；Toast「该装扮已绝版，无法再次使用」 |
| 已下架 / 坏 JSON | 已下架 | Toast「装扮已下架」 | 锁定 |
| 小程序不支持 | 环境不支持 | Toast「当前环境暂不支持该装扮」 | 锁定 |
| 无权限 | 会员专属等 | 详情 → 去获取 | 锁定 |

一期小程序目录仍 **藏** 未用过的 nav/tab。若 H5 记过原生栏装扮，小程序条上可以出现，按上表置灰，不是故障。

## 同步

- 游客：`ui_theme_recent`。登录：配置里的 `recent_use_list`，两端同一份。
- 弱网先本地；恢复后 flush。账号切换清旧记录再拉新账号。策略见 [`THEME_CENTER_SYNC.md`](THEME_CENTER_SYNC.md)。
- 写配置、启用都要登录校验；不能改别人的 `recent_use_list`。服务端 apply 自己去重截断到 8，不信客户端随便塞一长串。

## 联动

- 启用成功后「我的装扮」当前件会变；覆盖开着时局部仍只是不渲染。
- 保存搭配存的是当前 id 地图，不单独拷贝最近使用条。一键应用成功后，实际启用的件写入本条，见 [`THEME_CENTER_MIX.md`](THEME_CENTER_MIX.md)。
- 复用启用走与列表相同的 apply，后端再校验权限 / 状态 / 终端。

## 埋点

`theme_apply_click` 带 `from_history=1`。点卡片进详情走已有 `theme_item_enter_detail`。不要上报用户 id。

## 后台

`UserThemeConfig.recent_use_list` 只读。可从中看高频 `item_type` / 风格偏好，不做 C 端排行榜。
