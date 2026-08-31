# 主题中心三阶段迭代规划

**文档状态：** 产品规划（按阶段交付，完成一期再开二期）  
**产品：** 乡声集盒 · 主题中心（H5 网页 + 微信小程序）

本文只定范围、优先级和小程序降级，不定 UI 稿。模块总览、风险与验收见 [`THEME_CENTER.md`](THEME_CENTER.md)。全局主题见 [`THEME_CENTER_GLOBAL.md`](THEME_CENTER_GLOBAL.md)，局部装扮见 [`THEME_CENTER_DRESS.md`](THEME_CENTER_DRESS.md)，覆盖开关见 [`THEME_CENTER_OVERLAY.md`](THEME_CENTER_OVERLAY.md)，我的装扮汇总见 [`THEME_CENTER_OUTFIT.md`](THEME_CENTER_OUTFIT.md)，三层预览见 [`THEME_CENTER_PREVIEW.md`](THEME_CENTER_PREVIEW.md)，最近使用见 [`THEME_CENTER_RECENT.md`](THEME_CENTER_RECENT.md)，搜索筛选见 [`THEME_CENTER_SEARCH.md`](THEME_CENTER_SEARCH.md)，四维权限见 [`THEME_CENTER_PRIVILEGE.md`](THEME_CENTER_PRIVILEGE.md)，收藏分享热度见 [`THEME_CENTER_SOCIAL.md`](THEME_CENTER_SOCIAL.md)，历史搭配见 [`THEME_CENTER_MIX.md`](THEME_CENTER_MIX.md)，空态标识见 [`THEME_CENTER_STATUS.md`](THEME_CENTER_STATUS.md)，双端存储与同步见 [`THEME_CENTER_SYNC.md`](THEME_CENTER_SYNC.md)。标准化数据结构（独立拆分）见 [`THEME_CENTER_DATA.md`](THEME_CENTER_DATA.md)，容错见 [`THEME_CENTER_FAULT.md`](THEME_CENTER_FAULT.md)，埋点见 [`THEME_CENTER_ANALYTICS.md`](THEME_CENTER_ANALYTICS.md)，跳转链路见 [`THEME_CENTER_NAV.md`](THEME_CENTER_NAV.md)，后台运营见 [`THEME_CENTER_ADMIN.md`](THEME_CENTER_ADMIN.md)，性能见 [`THEME_CENTER_PERF.md`](THEME_CENTER_PERF.md)，安全见 [`THEME_CENTER_SECURITY.md`](THEME_CENTER_SECURITY.md)。用户投稿自制装扮见 [`THEME_CENTER_UGC.md`](THEME_CENTER_UGC.md)（三期）。商业化、碎片、社区复刻见 [`THEME_CENTER_ECO.md`](THEME_CENTER_ECO.md)（三期）。

对外文案：用户可见的「作品」一律写成 **罐头**。下文「罐头卡片」对应需求里的作品卡片。

## 原则

1. **一期只保证核心可用**：全局主题切换、少量可渲染的局部装扮、冲突开关、配置能存住。不做复杂付费和高级组合。
2. **小程序原生导航栏、原生 tabBar 是最大风险**：各阶段都要降级，不要把排期砸在微信不支持的组件上。
3. **方言特色装扮放二期**：川渝、江南吴语、岭南粤韵等地域主题和纹样素材，不挤一期。
4. **闸门**：当前阶段验收通过后再开下一阶段，不并行铺三期玩法。

## 当前仓库对照（不是下阶段开工指令）

前端目录、启用、冲突开关、本地/云端快照、搜索收藏分享、权限占位、预览和容错已经写在页面里。规划仍按三期验收：一期以「能换主题、能换核心装扮、能同步」为准；二期以「方言素材可上线 + 权限/搜索/搭配真正跑通」为准；三期才做碎片、投稿、社区。**不要因为仓库里已有二期入口，就把方言素材和付费一次做完。**

---

## 第一阶段：MVP（最高优先级，先上线）

**目标：** 个人中心能进主题中心，能换一套全局主题，能改几件小程序也能画出来的局部装扮。

### 做

| 项 | 范围 |
| --- | --- |
| 入口 | 个人中心 → 主题中心 |
| Tab | 仅 **全局主题**、**局部装扮**（不要收藏 Tab） |
| 全局主题 | 列表、卡片、详情弹窗、大图预览；**默认方言主题 + 素白纸本**可启用；可用 / 待上线占位 |
| 局部装扮（仅高频可渲染） | **罐头卡片、个人主页背景、头像框、评论气泡** |
| 冲突 | 「全局主题覆盖局部装扮」开关 |
| 我的装扮 | 第四入口 `?tab=mine`：当前主题、一期局部槽位、覆盖开关、重置；不新开路由 |
| 预览 | 列表缩略、详情大图；全屏实时模拟为二期 |
| 重置 | 重置全部装扮（不删收藏 / 历史搭配 / 最近使用） |
| 存储 | 本地存储；登录后同步云端（策略见 [`THEME_CENTER_SYNC.md`](THEME_CENTER_SYNC.md)） |
| 反馈 | Toast、列表加载失败重试、`style_json` 损坏回退默认 |
| 埋点 | 进入页面、切换 Tab、点击启用 |

### 小程序降级（一期）

- **不开放** 导航栏、底部 Tab 栏的局部装扮入口（直接不展示，**不要置灰卡片**）。
- 只开放 H5 和小程序都能正常渲染的组件。
- 原生 nav / tab 即使有 `style_json` 也不注入。

### 一期明确不做

收藏、分享、搜索筛选排序、历史搭配、实时模拟预览、会员付费、活动限定、方言创作者专属、方言地域成套素材、碎片兑换、投稿、社区。

### 一期验收闸门

- 游客：装扮只在本地，退出再进仍在。
- 登录：换主题后换设备（或清缓存后拉云端）能对上。
- 覆盖开：局部装扮不生效；覆盖关：罐头卡片 / 头像等能单独生效。
- 小程序：没有导航栏 / Tab 栏装扮入口；页面不因样式 JSON 损坏白屏。
- 文案无「作品」「短视频」。

---

## 第二阶段：丰富体验（一期上线后再做）

**目标：** 补齐个性化，把方言特色装扮真正铺上，加上搜索、收藏、分享、历史搭配和权限。

### 做

1. Tab **我的收藏**；收藏 / 取消收藏。见 [`THEME_CENTER_SOCIAL.md`](THEME_CENTER_SOCIAL.md)。
2. 搜索、筛选、排序；**方言地域标签**筛选。见 [`THEME_CENTER_SEARCH.md`](THEME_CENTER_SEARCH.md)。
3. 分享装扮、生成分享海报（小程序相册权限失败给提示）。见 [`THEME_CENTER_SOCIAL.md`](THEME_CENTER_SOCIAL.md)。
4. 最近使用（最多 8 条）；保存搭配最多 10 套；一键应用。见 [`THEME_CENTER_RECENT.md`](THEME_CENTER_RECENT.md)、[`THEME_CENTER_MIX.md`](THEME_CENTER_MIX.md)。
5. 实时模拟预览（模拟首页罐头流 / 个人中心 / 评论区 / 话题卡，不改真实界面，直到点「立即应用」）。
6. 权限：免费、会员专属、活动限定、方言创作者专属（**启用必须服务端校验**，前端置灰不够）。见 [`THEME_CENTER_PRIVILEGE.md`](THEME_CENTER_PRIVILEGE.md)。
7. 补齐局部装扮分类：交互按钮、话题卡片、弹窗 / 输入框。
8. 小程序：**可以展示**导航栏、底部 Tab 栏装扮，但必须置灰，文案「小程序暂不支持该组件装扮」，不是故障。
9. 埋点补全；热度 / 点赞仅作排序与展示，不做社交解锁。见 [`THEME_CENTER_SOCIAL.md`](THEME_CENTER_SOCIAL.md)。
10. 登录合并（云端 / 本地 / 合并两者）；完整边界处理见 [`THEME_CENTER_FAULT.md`](THEME_CENTER_FAULT.md)。空态 / 失败态 UI 见 [`THEME_CENTER_STATUS.md`](THEME_CENTER_STATUS.md)。

### 方言特色（二期重点）

- 上线多套地域全局主题：川渝烟火、江南吴语、岭南粤韵等（可先少量可启用，其余待上线占位）。
- 优先补方言纹样：**头像框、罐头卡片、评论气泡**（与一期组件重合，素材量在二期加）。

### 小程序降级（二期）

- 原生 nav / tab：**入口可见 + 置灰 + 环境限制文案**，仍不注入样式。
- 不把「小程序画不出来」做成会员特权失败。

### 二期明确不做

装扮碎片兑换、装扮社区、用户投稿自制装扮。

### 二期验收闸门

- 按地域筛得出对应方言主题 / 装扮。
- 会员 / 活动 / 创作者未满足时不能启用，引导去获取，不静默失败。
- 历史搭配含已下架件：自动跳过并提示。
- 小程序导航栏 / Tab 栏装扮不可点启用，H5 可按权限启用。
- 抓包改会员装扮 id：服务端拒绝，云端配置不变（见安全文档）。

---

## 第三阶段：高级增值（二期完成后再做）

**目标：** 商业化与社区化，提高回访。低优先级，不插队一期、二期排期。

### 做

1. 装扮碎片：发布方言罐头获碎片，兑换限定装扮。见 [`THEME_CENTER_ECO.md`](THEME_CENTER_ECO.md)。
2. 排行榜：热度榜、方言地域人气榜。见 [`THEME_CENTER_ECO.md`](THEME_CENTER_ECO.md)。
3. 投稿：用户提交素材，后台审核上架。见 [`THEME_CENTER_UGC.md`](THEME_CENTER_UGC.md)。
4. 装扮社区：看别人的搭配，一键复制。见 [`THEME_CENTER_ECO.md`](THEME_CENTER_ECO.md)。
5. 节日限定定时上 / 下架。见 [`THEME_CENTER_ECO.md`](THEME_CENTER_ECO.md)。
6. 后台：上下架、状态、数据报表（约定见 [`THEME_CENTER_ADMIN.md`](THEME_CENTER_ADMIN.md)）。
7. 性能：长列表虚拟滚动、封面懒加载、缓存策略（约定见 [`THEME_CENTER_PERF.md`](THEME_CENTER_PERF.md)）。
8. 小程序再评估可自定义范围，能少灰一块是一块，**不能承诺原生 nav/tab 可换皮**。

### 三期不做（除非单独立项）

不在主题中心里做直播装扮、第三方皮肤市场、跨 App 皮肤导出。也不做：绝版已购仍可启用、会员搭配无上限、第五套 `privilege_type=geo`、预览/浏览领积分、创作者等级解锁不同皮。细则见 [`THEME_CENTER_ECO.md`](THEME_CENTER_ECO.md)。

### 三期验收闸门

- 碎片与兑换有服务端账本，不能只改本地数字。见 [`THEME_CENTER_ECO.md`](THEME_CENTER_ECO.md)。
- 投稿有审核态，未过审不对 C 端展示。见 [`THEME_CENTER_UGC.md`](THEME_CENTER_UGC.md)。
- 复制他人搭配走二期同一套冲突 / 下架跳过逻辑。见 [`THEME_CENTER_ECO.md`](THEME_CENTER_ECO.md)。
- 运营后台：staff 可上下架与改定时；有引用的装扮不能物理删除；报表无账号 PII。
- 目录 100+ 时列表可滑；缓存不含整份 `style_json`；预览关闭即销毁。

---

## 优先级一览

| 优先级 | 阶段 | 必须交付 |
| --- | --- | --- |
| 最高 | 一期 | 全局主题切换 + 罐头卡片 / 主页底 / 头像 / 评论气泡 + 覆盖开关 + 本地与登录同步 |
| 次高 | 二期 | 搜索筛选、收藏分享、历史搭配、权限、方言地域素材；小程序 nav/tab **置灰可见** |
| 低 | 三期 | 投稿、社区、碎片兑换、榜单、后台运营、长列表性能 |

## 风险

1. **微信原生导航栏、tabBar**：不要为一期、二期排「小程序也能换顶栏」的工期。一期藏入口，二期置灰说明。
2. **`style_json`**：损坏必须回退默认，禁止把坏样式写进真实页面。
3. **素材量**：不要一次做完全部分类。一期 4 类可渲染组件；方言纹样二期加在头像 / 罐头卡 / 评论上。

## 阶段切换检查

进入下一阶段前，产品 + 研发确认：

- [ ] 本阶段「做」清单可在 H5 和小程序各走通一遍主路径  
- [ ] 本阶段「不做」没有提前对用户开通  
- [ ] 小程序降级规则与该阶段描述一致  
- [ ] 无「作品」「短视频」进界面  

通过后再排下一阶段。
