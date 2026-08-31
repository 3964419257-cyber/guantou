# 冲突控制开关

**文档状态：** 一期 MVP（独立拆分；渲染优先级以本文 + 数据/安全契约为准）  
**产品：** 乡声集盒 · 主题中心 · 全局主题覆盖局部装扮  
**页面：** `/pages/users/theme-center?tab=mine`（我的装扮汇总；不另开路由）

本文只定 **全局主题 vs 局部装扮的优先级开关**。全局换装见 [`THEME_CENTER_GLOBAL.md`](THEME_CENTER_GLOBAL.md)。局部装扮见 [`THEME_CENTER_DRESS.md`](THEME_CENTER_DRESS.md)。我的装扮汇总见 [`THEME_CENTER_OUTFIT.md`](THEME_CENTER_OUTFIT.md)。历史搭配见 [`THEME_CENTER_MIX.md`](THEME_CENTER_MIX.md)。三层预览见 [`THEME_CENTER_PREVIEW.md`](THEME_CENTER_PREVIEW.md)。四维权限见 [`THEME_CENTER_PRIVILEGE.md`](THEME_CENTER_PRIVILEGE.md)。空态标识见 [`THEME_CENTER_STATUS.md`](THEME_CENTER_STATUS.md)。双端存储与同步见 [`THEME_CENTER_SYNC.md`](THEME_CENTER_SYNC.md)。分期见 [`THEME_CENTER_ROADMAP.md`](THEME_CENTER_ROADMAP.md)。标准化数据结构（独立拆分）见 [`THEME_CENTER_DATA.md`](THEME_CENTER_DATA.md)。

历史搭配一键还原开关见 [`THEME_CENTER_MIX.md`](THEME_CENTER_MIX.md)。智能混搭推荐是三期以后，不要因为汇总页已有搭配入口就把官方模板一次做完。

对外文案不用「作品」「短视频」。

## 一期范围

| 做 | 不做 |
| --- | --- |
| 开关文案「全局主题覆盖局部装扮」；默认 **开**（`is_cover_local_decoration=true`） | 后台运营配置这个开关（它是用户私有字段） |
| 开：全站只渲染当前全局主题；已启用局部装扮暂时失效，**不删除配置** | 把「开启覆盖」理解成清空 `decoration_map` |
| 关：已启用局部层覆盖对应组件；未设置的件沿用全局主题 | 智能混搭 / 按开关偏好推荐货架 |
| 关→开且已有局部装扮：二次确认。开→关：直接生效 | 二期全屏预览、云端搭配字段补开关（本地搭配可先带上） |
| 游客本地；登录 `PUT /users/theme/config/`；换账号清本地再拉云端 | |
| 重置全部：主题回默认、局部清空、开关回默认开 | |

## 双端

H5 与小程序同一套字段和同一套 `resolveOutfitStyle`。无降级、无两端不同默认值。小程序原生栏本来就不注入局部 `style_json`，与开关无关。

开关变更后 hydrate 全站 CSS 变量；云端写入走已有 300ms flush 防抖，避免连点反复重绘和连打 PUT。

## 两种模式

| 开关 | 渲染 | 用户配置 |
| --- | --- | --- |
| **开（默认）** | 只用当前全局主题 `style_json` | `decoration_map` / 本地局部装扮 **保留**，列表标「暂时失效」 |
| **关** | 有局部层用局部；没有用全局；再没有用系统默认 | 单件启用/关闭仍写 map |

读取失败、首次无配置：当作 **开**。失效/绝版件跳过该层，不改变开关。

## 入口与确认

入口在「我的装扮」汇总的核心设置区。

关→开且本地已有局部装扮时弹窗：

- 文案：开启全局主题覆盖局部装扮后，自定义局部装扮将不会生效，是否继续？
- 按钮：取消 / 确认开启

取消则开关保持关闭。开→关不弹窗。

## 同步

- 字段：`is_cover_local_decoration`（布尔）。前端存储键 `ui_theme_overlay_local`（`1` / `0`）。
- 游客：只写本地。登录：先本地再生效，再排队 PUT 配置。4xx/网络失败保留本地。
- PUT 配置 **同时接受** 开关和 `decoration_map`（值为 id）。开关为 true **不得**把已保存的局部 id 从云端抹掉。
- 账号切换：清本地后拉新账号云端。游客登录合并见容错文档。策略见 [`THEME_CENTER_SYNC.md`](THEME_CENTER_SYNC.md)。
- 写配置需登录；未登录禁止 PUT。配置写入基础限流，超限 429。

## 联动（一期只保证开关本身）

- **预览沙盒：** 跟当前开关走，点「立即应用」前不改真实页。
- **重置全部：** 默认主题 + 空局部 map + 开关开。
- **启用全局主题：** 不因开关开着就清空局部配置；开关开着时局部只是不渲染。
- **历史搭配：** 云端 mix 存 `is_cover_local_decoration`，保存 / 应用时还原。见 [`THEME_CENTER_MIX.md`](THEME_CENTER_MIX.md)。

## 后台

`UserThemeConfig.is_cover_local_decoration` 只读展示。运营不能改用户开关。开启/关闭比例可从该字段统计，不做 C 端排行榜。
