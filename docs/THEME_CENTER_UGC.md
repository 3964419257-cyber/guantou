# 用户投稿与创作者自制装扮

**文档状态：** 独立拆分（**三期**生态；一期 / 二期不对用户开放投稿入口）
**产品：** 乡声集盒 · 主题中心 · UGC 投稿与创作者自制
**对应实现：** 现网无投稿路由、无审核队列。过审上架后走已有目录 `ThemeItem` / `DecorationItem`。创作者领取皮仍是 [`THEME_CENTER_PRIVILEGE.md`](THEME_CENTER_PRIVILEGE.md) 的 `creator_unlocked`

本文只定 **谁能投、审什么、过审后怎么进货架、下架怎么兜底**。不定创作 IDE、买断合同、月度评选。买断与碎片激励见 [`THEME_CENTER_ECO.md`](THEME_CENTER_ECO.md)。启用校验见 [`THEME_CENTER_SECURITY.md`](THEME_CENTER_SECURITY.md)。字段见 [`THEME_CENTER_DATA.md`](THEME_CENTER_DATA.md)。后台目录见 [`THEME_CENTER_ADMIN.md`](THEME_CENTER_ADMIN.md)。热度见 [`THEME_CENTER_SOCIAL.md`](THEME_CENTER_SOCIAL.md)。埋点见 [`THEME_CENTER_ANALYTICS.md`](THEME_CENTER_ANALYTICS.md)。跳转见 [`THEME_CENTER_NAV.md`](THEME_CENTER_NAV.md)。容错见 [`THEME_CENTER_FAULT.md`](THEME_CENTER_FAULT.md)。分期见 [`THEME_CENTER_ROADMAP.md`](THEME_CENTER_ROADMAP.md)。总览见 [`THEME_CENTER.md`](THEME_CENTER.md)。

需求原文若把投稿写成「一期 / 二期闸门」，或要求资深创作者第五套 `privilege_type`、信用分、装扮敏感词库、热搜倾斜 CMS、投稿即发碎片，规划仍以 ROADMAP / PRIVILEGE / SECURITY / ADMIN 为准。**未过审内容不得出现在 `GET /themes/` / `GET /decorations/`。** 不要另写第四套状态枚举，不要给 C 端目录塞 `user_id`。

对外文案不用「作品」「短视频」。创作者任务仍说「装一罐」。用户可见「用户自制」是货源标识，不是「方言创作者专属」权限标签。Toast 仍不超过 32 字；上线新句时写入 FAULT，**本期不改**已落地 Toast / 空态。

## 分期范围

| 现在做 | 不做（三期未开工 / 需求原文不采用） |
| --- | --- |
| 文档钉契约：投稿草稿另表；过审复制进官方目录字段 | C 端「去投稿」按钮、`theme-submit` 入 `pages.json` |
| 无投稿资格则无入口（现网即无入口） | 游客 / 未解锁创作者抓包 POST 能入库 |
| 过审件与官方件同一套 `theme_item` / `decoration_item` | 第二套 C 端 schema、独立 UGC 渲染引擎 |
| 下架走 `status=deprecated`；搭配跳过沿用 FAULT 已有句 | 物理删除已引用件；另写「自制装扮已失效」句 |
| `style_json` 过审前必须过 `clean_catalog_item` | 用户上传任意 JSON / 自定义 CSS 注入 |
| 创作者可穿戴皮：`creator_unlocked`（二期） | 普通 / 方言创作者 / 资深 三档解锁不同皮（PRIVILEGE 已禁阶梯） |
| 公开目录不回投稿人账号 | 创作者社交主页、信用分、自动封禁（SECURITY） |
| 热度三计数与 `sort=heat` 共用 | UGC 独立热度公式、首页/热搜运营位（ADMIN CMS 三期另册） |
| | 积分碎片账本（见 [`THEME_CENTER_ECO.md`](THEME_CENTER_ECO.md)） |
| | 24 小时 SLA / 加急队列产品字段（运营排班，不进 C 端） |
| | 官方买断、创作模板工具、月度评选、全网一键复刻（搭配复刻见 [`THEME_CENTER_ECO.md`](THEME_CENTER_ECO.md)） |

一期 / 二期验收 **不包含** 投稿。二期 `creator_unlocked` 只表示可领取 **方言创作者专属皮**，不表示可投稿。

```text
未达标 / 游客
  → 主题中心无投稿入口
  → POST /users/theme/submissions/ 不存在（现网 404）
方言创作者（三期且 creator_unlocked）
  → 填名称/简介/标签/预览图/规范 style_json + 原创声明
  → 草稿 status=pending，不进公开目录
staff 人工复审（机器只做格式/JSON）
  → 通过：写入 ThemeItem/DecorationItem，source=ugc，status=available
  → 驳回：草稿可见原因，可改再投
  → 永久驳回：禁止该稿再投
下架 / 封禁
  → 目录 deprecated，配置 id 保留停渲染，搭配跳过
```

## 原则

1. **先审后公开展示。** `pending` 只出现在投稿人自己的草稿列表与 staff 队列。
2. **过审即官方目录。** 启用、收藏、搭配、预览、热度走现有接口，不另开 UGC 启用通道。
3. **用户自制 ≠ 创作者专属。** 过审默认 `privilege_type=free` + `source=ugc`。`privilege_type=creator` 仍是「完成任务才能穿」的官方皮。
4. **身份两件事。** `creator_unlocked`：穿创作者皮（二期）。同一旗标三期再开投稿。资深只做 staff 加急/推荐标记，**不是** 新的 `privilege_type`。
5. **样式只走规范 JSON。** 与官方件同一套 `clean_catalog_item`；禁止 `;{}` 与业务字段。
6. **隔离。** 只能读写自己的草稿；公开货架无 `user_id`。卡片「用户自制」来自 `source`，不是账号。

---

## 一、身份（不要第五套权限名）

| 角色 | 现网 / 二期 | 三期投稿 |
| --- | --- | --- |
| 普通用户、游客 | 可浏览公开目录；无投稿入口 | 仍无入口；非法 POST 401/403/404 |
| 方言创作者 | `creator_unlocked`，可领取 `privilege_type=creator` 的皮 | 可提交草稿 |
| 资深创作者 | **不单独建模** | staff 标记优先审；C 端最多一枚「推荐」运营位，不加等级解锁 |

任务达标口径仍走创作任务页（「装一罐」），见 PRIVILEGE / NAV `theme-acquire?focus=creator`。不要把「发布优质方言作品」写进界面。

卡片标识：

- 「方言创作者专属」= `privilege_type=creator`（权限）。
- 「用户自制」= `source=ugc`（货源）。两枚可以同时出现，含义不同。

不在主题中心做创作者社交主页（社区另册）。

## 二、投稿草稿（三期新模型，不塞进现有 JSON）

上线前 **不要** 给 `ThemeItem` 加 `extra` / `submitter_id`。公开目录仍是 DATA 的 `theme_item` / `decoration_item`；三期给目录加列 `source`：`official` \| `ugc`（默认 `official`，旧客户端忽略）。

草稿表示例（仅投稿人 `GET /users/theme/submissions/`，三期才接）：

```json
{
  "submission_id": "sub-1",
  "item_type": "theme",
  "name": "巷口灯火",
  "desc": "",
  "cover_img": "",
  "style_json": {},
  "component_type": "",
  "style_tags": ["地域方言风"],
  "dialect_tags": ["川渝"],
  "original_declared": true,
  "status": "pending",
  "reject_reason": "",
  "catalog_id": "",
  "create_time": 0
}
```

| 草稿 `status` | C 端公开目录 | 投稿人 |
| --- | --- | --- |
| `pending` | 无 | 审核中，可改简介/标签/图后重交 |
| `approved` | 有，`source=ugc` | 已上架；再改走二次审核 |
| `rejected` | 无 | 可见原因，可改再投 |
| `rejected_final` | 无 | 不可再投该稿 |
| `withdrawn` | 无（若曾上架则目录 `deprecated`） | 创作者自主下架 |

`reject_reason` 契约：`violation` \| `style` \| `original`（违规 / 样式不规范 / 非原创）。展示句上线时进 FAULT，本期不写进 `themeFault.js`。

`original_declared` 必须为 true 才能提交。名称/简介剥 HTML，长度跟官方件（名称约 80 字内，简介文本）。标签只能选 DATA 字典，禁止自造方言名。

`item_type=decoration` 时 `component_type` 必填，且遵守 ROADMAP 已开放组件（小程序 nav/tab 仍不可承诺换皮）。

## 三、审核

1. **机器初审（现成能力，不另做词库分册）：** `clean_catalog_item` 拦非法 JSON、终端、标签字典、HTML。过不了的不进人工队列。
2. **人工复审：** 合规、风格是否像乡声集盒、原创性。涉政 / 低俗 / 侵权走人工，不在主题中心单独立敏感词产品。
3. **通过：** 复制为 `ThemeItem` 或 `DecorationItem`，`source=ugc`，`status=available`，`privilege_type` 默认 `free`，bump `catalog_version`。`style_json` 只在详情下发。
4. **驳回 / 永久驳回：** 只改草稿；不写公开目录。
5. **时效：** 24 小时 / 资深加急是运营 SLA，不进 C 端字段。

未过审 **不占用** 公开列表分页、不进热搜、不上报为曝光货架。

举报抄袭：三期详情可加「举报」进 staff 队列；处理结果仍是 `deprecated` + 必要时清 `creator_unlocked`。不另做信用分。

## 四、货架与分发（过审之后）

- 检索：三期筛选增加 `source=ugc`（用户可见「用户自制」）。二期筛选表 **不改**。未加列前 query 忽略该参数。
- 排序：与官方共用 `newest` / `heat` / `free` / `name`。热度仍是 `like_count` + `collect_count` + `share_count`。
- 方言标签：同一套 `dialect_tags`，可参与二期方言筛选。
- 启用 / 收藏 / 搭配 / 预览：现有 apply / collect / mix / PREVIEW。无权限件规则不变。
- 创作者改已上架简介/图：改的是草稿二次审，**通过前公开目录不变**。

## 五、创作者管理（三期子页，现网不建）

规划 path：`/pages/users/theme-submit`（H5 / 小程序同一 path）。**现网 `pages.json` 不登记**，避免空页。入口仅 `creator_unlocked` 可见；普通用户隐藏，不是置灰可点。

列表：审核中 / 已上架 / 已驳回 / 已下架。数据用目录三计数，不另造「综合热度值」。自主下架 = 公开件 `deprecated`，草稿 `withdrawn`。已启用用户：停渲染不删配置，搭配一键应用跳过，Toast 用已有「部分装扮已下架，已自动跳过」。

封禁创作者：staff 清 `creator_unlocked`，该账号 `source=ugc` 且仍 `available` 的件改 `deprecated`。不物理删有引用的行（ADMIN）。

## 六、激励（范围收口）

| 需求原文 | 处理 |
| --- | --- |
| 会员皮免费体验、高阶优先试用 | 不另开；创作者皮仍走 `privilege_type=creator` |
| 首页推荐、热搜曝光 | ADMIN / SEARCH 三期运营位，不在投稿模块做 CMS |
| 上架发碎片 / 积分 | 碎片账本见 [`THEME_CENTER_ECO.md`](THEME_CENTER_ECO.md)，本文不发币 |
| 官方认证 | staff 标记即可，不新权限枚举 |

## 七、接口（三期才接，现网 404）

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET/POST | `/users/theme/submissions/` | 自己的草稿；POST 需 `creator_unlocked` |
| PATCH | `/users/theme/submissions/{submission_id}/` | 改草稿或撤回 |
| GET | `/themes/?source=ugc` | 过审后筛选；无该列时忽略 |

`THEME_API_PATHS` **暂不加** `submissions`。staff 审核走 Django Admin / 三期 `/manage/`，C 端 token 不能审。

写草稿限流与 apply 同量级（SECURITY：收藏写 20/分量级），超限 429「操作过于频繁，请稍后再试」。

## 八、联动

| 模块 | 规则 |
| --- | --- |
| PRIVILEGE | 投稿资格 = 三期的 `creator_unlocked`；穿皮资格二期已有。不要第三套身份 |
| DATA | 过审列与官方相同；草稿新表 |
| ADMIN | 审核队列三期才做；现在 Admin 只改官方目录 |
| SECURITY | 非法 JSON 不入库；越权看他人草稿 404 |
| SOCIAL | 过审后同一套收藏/分享/热度 |
| MIX / FAULT | 下架跳过已有句，不新造 |
| ANALYTICS | 投稿事件三期再进事件表，不上报账号 |
| NAV | 不提前登记投稿页 |

## 九、需求原文对照

| 原文 | 本文 |
| --- | --- |
| 普通 / 方言创作者 / 资深三档 | 布尔 `creator_unlocked` + staff 加急标记 |
| 发布优质方言作品解锁 | 界面「装一罐」；任务页已有 |
| 用户自制分类 + 标识 | 三期 `source=ugc`，二期筛选不加 |
| 双重审核 | JSON 机器 + 人工；不另做主题中心词库 |
| 信用分、多次违规降级 | 清 `creator_unlocked` + 下架；无信用分产品 |
| 积分碎片、热搜倾斜 | 另册 |
| 创作者主页、数据中台 Excel | 不做 |
| 未达标隐藏入口 | 现网无入口即满足 |

## 十、验收

**现在（一期 / 二期）：**

- 主题中心无投稿入口；`/users/theme/submissions/` 404。
- 公开目录无 `source` / `submitter_id` / `user_id` / `is_ugc`。
- `creator_unlocked` 只影响创作者专属皮领取，不冒出投稿表单。
- 文案无「作品」「短视频」。

**三期投稿闸门（开工后再验）：**

- 仅 `creator_unlocked` 能提交；草稿不进公开列表。
- 过审件可预览、启用、收藏、进搭配，热度可排序。
- 非法 JSON、未声明原创、无权限 POST 被拒。
- 下架 / 永久驳回 / 封禁后公开货架无该件，已保存搭配不崩。
- 新旧客户端：无 `source` 的旧版忽略新列，仍能启用 `free` 皮。
