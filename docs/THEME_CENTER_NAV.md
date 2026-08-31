# 主题中心跳转链路

**文档状态：** 产品约定（H5 路由 / 小程序页面栈同一套 path）  
**产品：** 乡声集盒 · 主题中心

本文只定 **主页面、子页面、模态弹窗** 怎么进、怎么关、怎么回。不定视觉稿。页面跳转一律走 `services/navigation.js`（H5 `navigateTo` 即路由，小程序同一 API）。模态 **不入页面栈**。

相关：总览 [`THEME_CENTER.md`](THEME_CENTER.md)，分期 [`THEME_CENTER_ROADMAP.md`](THEME_CENTER_ROADMAP.md)，我的装扮汇总 [`THEME_CENTER_OUTFIT.md`](THEME_CENTER_OUTFIT.md)，历史搭配 [`THEME_CENTER_MIX.md`](THEME_CENTER_MIX.md)，三层预览 [`THEME_CENTER_PREVIEW.md`](THEME_CENTER_PREVIEW.md)，最近使用 [`THEME_CENTER_RECENT.md`](THEME_CENTER_RECENT.md)，搜索筛选 [`THEME_CENTER_SEARCH.md`](THEME_CENTER_SEARCH.md)，四维权限 [`THEME_CENTER_PRIVILEGE.md`](THEME_CENTER_PRIVILEGE.md)，收藏分享热度 [`THEME_CENTER_SOCIAL.md`](THEME_CENTER_SOCIAL.md)，空态标识 [`THEME_CENTER_STATUS.md`](THEME_CENTER_STATUS.md)，双端存储与同步 [`THEME_CENTER_SYNC.md`](THEME_CENTER_SYNC.md)，标准化数据结构（独立拆分）[`THEME_CENTER_DATA.md`](THEME_CENTER_DATA.md)，容错 [`THEME_CENTER_FAULT.md`](THEME_CENTER_FAULT.md)，后台 [`THEME_CENTER_ADMIN.md`](THEME_CENTER_ADMIN.md)，性能 [`THEME_CENTER_PERF.md`](THEME_CENTER_PERF.md)，安全 [`THEME_CENTER_SECURITY.md`](THEME_CENTER_SECURITY.md)，用户投稿（三期）[`THEME_CENTER_UGC.md`](THEME_CENTER_UGC.md)，商业化生态（三期）[`THEME_CENTER_ECO.md`](THEME_CENTER_ECO.md)。

个人中心入口文案为 **主题中心**（需求里的「主题装扮」指同一入口）。界面不用「作品」「短视频」。

## 三类界面

| 类型 | 是否入栈 | 关闭 / 返回 |
| --- | --- | --- |
| 主页面 | 是 | 返回 → 个人中心 |
| 子页面 | 是 | 返回 → 主题中心首页（栈里有则 `navigateBack`，没有则 `back-fallback`） |
| 模态弹窗 | **否** | 关闭 / 点遮罩 → 仍停在打开弹窗时的那一页 |

```text
个人中心
  └─ navigateTo 主题中心首页（主）
        ├─ 模态：详情 / 筛选 / 分享 / 预览 / 各种确认
        ├─ navigateTo 局部装扮分类页（子）
        ├─ navigateTo 我的装扮汇总（子）  ← 规划独立页；现网用 ?tab=mine
        ├─ navigateTo 搜索结果（子）      ← 规划独立页；现网用页内 searching
        ├─ navigateTo 开通会员 / 活动 / 创作任务（子，栈上再一层）
        └─ 返回 → 个人中心
```

---

## 一、总入口

**个人中心** → 点 **主题中心** → `goThemeCenter()` → **主题中心首页**。

| 端 | 行为 |
| --- | --- |
| H5 | 路由进入 `/pages/users/theme-center` |
| 小程序 | `uni.navigateTo` 同一 path，不打开外部浏览器 |

分享落地：`/pages/users/theme-center?kind=theme&id=` 或 `/pages/users/theme-dress?group=&id=`，打开对应详情模态，不另开浏览器。

---

## 二、主题中心首页（主页面）

路径：`/pages/users/theme-center`  
PageShell 返回：`back-fallback` = 个人中心。

页内 Tab：**全局主题** ｜ **局部装扮** ｜ **我的收藏**。切 Tab 不改路由。

底部（或第四入口）**我的装扮** → 子页面「我的装扮汇总」（规划 `navigateTo`；现网 `?tab=mine`）。

### 1. 全局主题 Tab

| 操作 | 类型 | 结果 |
| --- | --- | --- |
| 点列表卡片 | 模态 | 全局主题详情 |
| 详情 · 大图预览 | 模态内 | 放大预览图，不改栈 |
| 详情 · 实时预览 | 模态 | 完整模拟预览全屏层 |
| 详情 · 收藏 | 无跳转 | 切换收藏 |
| 详情 · 分享 | 模态 | 分享层 |
| 详情 · 立即启用 | 无跳转 | 启用后关详情，Toast |
| 详情 · 去获取 | **子页面** | 会员 / 活动 / 创作任务 |
| 详情 · 关闭 / 遮罩 | 关模态 | 仍在全局主题列表 |
| 最近使用卡片 | 模态 / 子页 | 主题 → 详情模态；局部装扮 → `theme-dress?group=&id=`（见 [`THEME_CENTER_RECENT.md`](THEME_CENTER_RECENT.md)） |
| 搜索 | **子页面** | 搜索结果（规划独立页） |
| 筛选 | 模态 | 筛选面板 |

### 2. 局部装扮 Tab

分类卡片 **去设置 / 修改** → **子页面** `/pages/users/theme-dress?group=`。  
列表/筛选命中的单件：详情模态；应用或去获取规则同全局。  
最近使用 → 对应装扮详情模态。搜索、筛选同全局 Tab。

### 3. 我的收藏 Tab

卡片 → 对应详情模态。空态留在本 Tab。取消收藏不跳页。搜索 → 搜索结果子页。

---

## 三、我的装扮汇总（子页面）

规划路径：`/pages/users/theme-outfit`（**现网不要新建该页**；`theme-center?tab=mine`）。  
返回：主题中心首页（未拆页时顶栏返回切回全局主题 Tab）。  
模块约定见 [`THEME_CENTER_OUTFIT.md`](THEME_CENTER_OUTFIT.md)。

| 操作 | 类型 | 结果 |
| --- | --- | --- |
| 更换主题 | 回首页 | 主题中心 + 全局主题 Tab（`?tab=global` 或 `navigateBack` 后切 Tab） |
| 修改某类局部装扮 | 子页面 | `theme-dress?group=` |
| 保存当前搭配 | 模态 | 命名弹窗 |
| 点一套历史搭配 | 模态 | 「是否一键应用」确认 |
| 预览某套历史搭配 | 模态 | 沙盒预览，不入栈；点「立即应用」才写入 |
| 预览装扮效果 | 模态 | 完整模拟预览全屏层 |
| 重置全部装扮 | 模态 | 二次确认 |
| 覆盖开关 | 无跳转 | 可能先出确认再改开关 |

---

## 四、搜索结果（子页面）

规划路径：`/pages/users/theme-search`（现网：首页 `searching=1`）。  
Tab：全部 ｜ 全局主题 ｜ 局部装扮（不入栈）。  
卡片 → 详情模态。筛选 → 筛选模态。返回 → 主题中心首页（退出搜索态或 `navigateBack`）。

---

## 五、局部装扮分类页（子页面）

路径：`/pages/users/theme-dress`  
返回：主题中心。卡片 → 详情模态。应用留在本页。去获取 → 会员/活动/任务页。

---

## 六、模态一览（均不改栈）

点关闭、点遮罩、取消：关掉层，**还在原页**。

| 弹窗 | 打开自 | 主按钮 |
| --- | --- | --- |
| 全局 / 局部详情 | 列表、最近使用、收藏、搜索 | 关闭回到列表 |
| 大图预览 | 详情内 | 关大图，详情还在 |
| 完整模拟预览 | 详情「实时预览」或我的装扮「预览装扮效果」 | 取消关预览；立即应用后关预览（及详情），Toast「装扮已生效」，**不 `navigateTo`** |
| 筛选面板 | 首页 / 搜索 | 确定刷新当前列表；重置清空条件；关闭不改条件 |
| 分享 | 详情 | 私信 / 微信 / 复制链接 / 保存海报；关闭 |
| 保存搭配命名 | 我的装扮 | 保存 / 取消 |
| 一键应用搭配 | 历史搭配 | 确认应用 / 取消 |
| 重置确认 | 重置 | 确认重置 / 取消 |
| 开启覆盖确认 | 打开覆盖且已有局部装扮 | 确认 / 取消 |
| 会员开通 | 会员专属未拥有 | 取消 / 开通会员 → **子页面** 会员页 |
| 活动参与 | 进行中活动未领取 | 取消 / 去参与 → **子页面** 活动页 |
| 创作者任务 | 未达创作条件 | 取消 / 去完成 → **子页面** 任务（获取）页 |
| 登录合并 | 游客配置 vs 云端 | 使用云端 / 使用本地 / 合并两者 |
| 搭配数量上限 | 已满 10 套 | 知道了，不跳页 |
| 小程序版本过低 | 进入主题中心 | 知道了，不跳页 |

确认类走 `confirmDialog` / FeedbackHost，同样不入栈。

---

## 七、外部子页面（入栈，仍在小程序/H5 内）

| 能力 | 路径 | 返回 |
| --- | --- | --- |
| 开通会员 | `/pages/users/theme-member` | 主题中心 |
| 参与活动 | `/pages/users/theme-event` | 获取页或主题中心 |
| 创作任务 / 装扮获取 | `/pages/users/theme-acquire` | 主题中心 |

小程序用 `navigateTo` 打开上述页，**禁止** `window.open` 或跳 H5 浏览器。

规划投稿管理 `/pages/users/theme-submit` 见 [`THEME_CENTER_UGC.md`](THEME_CENTER_UGC.md)，**三期才登记 `pages.json`**。现网不要新建该页，也不要从主题中心链过去。装扮社区 `/pages/users/theme-community`、碎片钱包 `/pages/users/theme-wallet` 见 [`THEME_CENTER_ECO.md`](THEME_CENTER_ECO.md)，同样现网不登记。

---

## 八、H5 与小程序差异（只影响通道，不影响栈规则）

| | H5 | 小程序 |
| --- | --- | --- |
| 主/子页面 | 同源 path 路由 | `navigateTo` / `navigateBack` |
| 复制链接 | 复制当前站内 URL | 复制 path 或走转发 |
| 保存海报 | 浏览器下载 | `saveImageToPhotosAlbum`，拒权只 Toast |
| 微信分享 | 复制链接等 | 原生转发（`onShareAppMessage`） |
| 会员/活动/任务 | 站内路由 | 站内页面，不外跳 |

---

## 九、异常时不乱跳

| 情况 | 行为 |
| --- | --- |
| 已下架 / 已绝版 | 可开详情，启用/获取置灰，**不去** 会员/活动页 |
| 小程序不支持的装扮 | 可开详情，环境提示，无法启用 |
| 列表网络失败 | 停在当前页，重试，不 `redirectTo` |
| 预览关闭 | 只关预览层，不改真实页样式、不切页 |

---

## 十、返回规范（必须遵守）

1. **模态**：关闭 / 遮罩 → 关层，路由不变。  
2. **子页面**（分类装扮、规划中的我的装扮 / 搜索、会员 / 活动 / 任务）：返回 → 上一页；栈空则回主题中心（会员等 `back-fallback` 已是主题中心）。  
3. **主题中心首页**：返回 → 个人中心。  
4. 不要用 `reLaunch` 关弹窗，也不要用新页面模拟详情。

---

## 路由与方法

| 规划页面 | path | `navigation.js` |
| --- | --- | --- |
| 主题中心首页 | `/pages/users/theme-center` | `goThemeCenter` |
| 局部装扮分类 | `/pages/users/theme-dress` | `goThemeDress(group)` |
| 我的装扮汇总 | 规划 `/pages/users/theme-outfit` | `goThemeOutfit` → 现为 `goThemeCenter({ tab: 'mine' })` |
| 搜索结果 | 规划 `/pages/users/theme-search` | `goThemeSearch` → 现为 `goThemeCenter({ searching: 1, q })` |
| 开通会员 | `/pages/users/theme-member` | `goThemeMember` |
| 活动 | `/pages/users/theme-event` | `goThemeEvent` |
| 创作任务 / 获取 | `/pages/users/theme-acquire` | `goThemeAcquire` |

独立子页拆分前，`tab` / `searching` / `q` 只表示产品节点，**详情、预览、筛选、分享仍必须是模态**。

### 现网对照（拆页前）

| 产品节点 | 现网 | 返回 |
| --- | --- | --- |
| 我的装扮汇总 | 首页第四 Tab `tab=mine`（`goThemeOutfit`） | 顶栏返回切回全局主题 Tab，不离开主题中心 |
| 搜索结果 | 首页 `searching`（`goThemeSearch`） | 顶栏返回退出搜索，回到列表 |
| 局部装扮分类列表 | 真实子页 `theme-dress` | `navigateBack` → 主题中心 |
| 详情 / 筛选 / 分享 / 预览 / 确认 | 页内模态 | 关层，栈不变 |

未拆页时，首页 PageShell 对「搜索态 / 我的装扮 Tab」使用 `interceptBack`，避免一次返回直接回到个人中心。全局主题、局部装扮、我的收藏 Tab 的返回仍回个人中心。
