# 历史搭配方案系统

**文档状态：** 二期（独立拆分；保存 / 应用 / 管理以本文 + DATA / FAULT / SECURITY 为准）
**产品：** 乡声集盒 · 主题中心 · 历史搭配
**页面：** `/pages/users/theme-center?tab=mine` 的「历史搭配」模块（**不另开** `/pages/users/theme-outfit`）

本文只定 **整套搭配的保存、列表、一键应用、重命名、删除、沙盒预览**。当前生效装扮、覆盖开关、重置见 [`THEME_CENTER_OUTFIT.md`](THEME_CENTER_OUTFIT.md)。覆盖开关字段见 [`THEME_CENTER_OVERLAY.md`](THEME_CENTER_OVERLAY.md)。全屏预览沙盒见 [`THEME_CENTER_PREVIEW.md`](THEME_CENTER_PREVIEW.md)。最近使用见 [`THEME_CENTER_RECENT.md`](THEME_CENTER_RECENT.md)。四维权限见 [`THEME_CENTER_PRIVILEGE.md`](THEME_CENTER_PRIVILEGE.md)。进退见 [`THEME_CENTER_NAV.md`](THEME_CENTER_NAV.md)。标准化数据结构（独立拆分）见 [`THEME_CENTER_DATA.md`](THEME_CENTER_DATA.md)。失败提示见 [`THEME_CENTER_FAULT.md`](THEME_CENTER_FAULT.md)。埋点见 [`THEME_CENTER_ANALYTICS.md`](THEME_CENTER_ANALYTICS.md)。分期见 [`THEME_CENTER_ROADMAP.md`](THEME_CENTER_ROADMAP.md)。安全见 [`THEME_CENTER_SECURITY.md`](THEME_CENTER_SECURITY.md)。双端存储与同步见 [`THEME_CENTER_SYNC.md`](THEME_CENTER_SYNC.md)。

需求原文若写「一期」或把分享复刻、官方模板、智能推荐写成必做，规划仍以 ROADMAP 为准：这是 **二期**。一期汇总页可以先有保存入口，**不对一期用户承诺云端 mix CRUD**。不要把搭配分享、官方套装货架、分组排序一次做完。

对外文案不用「作品」「短视频」。空态沿用已落地句「还没有保存任何搭配方案，可将当前装扮保存为专属搭配」。超限沿用 FAULT 弹窗「已达到最大保存数量，请删除旧搭配方案后再保存」（不要改成另一句以免双端与单测不一致）。状态 UI 见 [`THEME_CENTER_STATUS.md`](THEME_CENTER_STATUS.md)。

## 二期范围

| 做 | 不做 |
| --- | --- |
| 我的装扮常驻【保存当前搭配】；命名弹窗；最多 10 套 | 新建 `theme-outfit` 路由 |
| 完整归档全局主题 id + `decoration_map` + 覆盖开关 | 搭配分享、他人一键复刻（三期社区见 [`THEME_CENTER_ECO.md`](THEME_CENTER_ECO.md)） |
| 列表按保存时间倒序；缩略图 + 摘要；空态引导保存 | 官方热门模板套装 |
| 一键应用二次确认；跳过下架 / 绝版 / 终端不支持 / 权限不足件 | 分组管理、自定义排序；UGC 下架另写过滤句（沿用已有下架跳过，见 [`THEME_CENTER_UGC.md`](THEME_CENTER_UGC.md)） |
| 重命名；删除（现网二次确认，避免误触） | 按常用搭配智能推荐同类皮 |
| 登录写 `POST/PATCH/DELETE /users/theme/mixes/`；游客只本地 | `/manage/` 搭配报表与代改（三期） |
| 每套可开全屏沙盒预览，点「立即应用」前不改真实配置 | 后台替用户改 mix 内容 |

搭配只存 id，不存 `style_json`。应用时按目录现解析；失效件跳过，有效件 100% 还原保存时的主题、局部 map 与开关。

## 保存

- 入口：我的装扮【保存当前搭配】。弹窗自定义名称：去 HTML / `<>`，1～20 字，中英文数字常规符号可留。
- 内容：当前 `global_theme_id`、已启用局部 `decoration_map`、`is_cover_local_decoration`。
- 上限 10。超限 **弹窗**（FAULT 已落地句），禁止新增。
- 去重：同一用户下主题 id + 局部 map + 开关完全一致，禁止再存。Toast：「该搭配方案已保存，请勿重复添加」。
- 登录：先写本地再 `POST /users/theme/mixes/`；失败保留本地，排队同步，Toast 用已落地「操作已本地保存，同步云端失败，网络恢复后自动同步」。
- 游客：只本地；换设备、清缓存丢失。
- 防抖：与启用同一套 `beginThemeApply`（约 800ms），避免连点重复生成。

## 列表与管理

- 位置：我的装扮「历史搭配」。最新保存置顶。
- 展示：自定义名称、主题缩略、摘要（主题名 · N 件局部装扮）。
- 空态：上述文案 +「保存当前搭配」。
- **一键应用：** 二次确认「是否一键应用这套历史搭配？」后批量替换当前配置与开关。成功 Toast「已应用历史搭配方案」。
- **重命名：** 同一命名弹窗，成功仍用「已保存这套装扮搭配」。
- **删除：** 现网二次确认「删除这套搭配方案？」后生效，不可恢复。需求原文「点删即生效」不采用，以免误触（FAULT / NAV 未要求无确认）。
- 方案损坏 / 关键字段缺失：禁止应用，Toast「搭配方案异常，暂无法应用」，不影响其它方案。

## 应用容错

与权限、终端、目录状态同一套 `recentUseStatus`：

- 已下架、绝版、待上线、终端不支持、权限不足：该层跳过，不报错、不白屏。
- 部分跳过：有效件照常生效；Toast 用已落地句「部分装扮已下架，已自动跳过」（权限不足不另起一句，避免双端文案分叉）。
- 全部失效（主题回落到默认且局部 map 为空）：恢复默认样式，Toast「当前搭配无有效装扮，已恢复默认样式」。
- 覆盖开关按方案还原；开关开时局部仍保留在 map 里但不渲染（见覆盖分册）。
- 应用成功后，实际启用的主题 / 装扮写入最近使用。
- **重置全部装扮不删除** 历史搭配。

失效组件渲染跟当前全局主题走，无空白槽错乱。小程序 nav/tab 按 ROADMAP 降级，不注入原生栏 `style_json`。

## 预览

每套历史搭配可开全屏 `ThemeLivePreview` 沙盒：用该方案的主题 + 局部 + 开关模拟，**不写** 真实配置。预览效果与一键应用一致（含跳过提示）。点沙盒「立即应用」才写入，规则同一键应用。当前整套【预览装扮效果】仍预览 **正在生效** 的配置，不是某一套历史方案。

## 同步

- 游客：仅 `ui_theme_outfits`。
- 登录：云端 `user_saved_mix` 永久保存；H5 / 小程序拉同一列表。登录后 `GET /users/theme/mixes/` 覆盖本地列表（有未合并游客快照时先走 FAULT 合并，不覆盖）。
- 弱网：先展示本地；恢复后 `flushThemeConfig` / 队列重试。加载失败不阻塞页面。
- 账号切换：清本地搭配键，再拉新账号列表。策略见 [`THEME_CENTER_SYNC.md`](THEME_CENTER_SYNC.md)。
- 服务端只认当前用户的 `mix_id`；他人 id 当 404。满 10 返回 409 `mix_cap`。组合重复返回 409 `mix_dup`。保存限流 10 次/分钟。

## 埋点（二期）

`theme_save_mix`、`theme_apply_mix`（含 `has_unavailable`）、`theme_mix_manage`（重命名 / 删除）。不上报用户 id。

## 后台（三期）

C 端全自动生成私有方案，无需运营配置。后台只读用户搭配；禁止 PATCH 他人 mix。报表用埋点，不做 C 端热门搭配榜。

## 后续（不在本期）

分享个人搭配、官方模板套装、分组与自定义排序、按常用搭配推荐同类风格。
