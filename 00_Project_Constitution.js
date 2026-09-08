/**
 * ============================================================
 * PROCUREMENT OS V0.1 — 00_Project_Constitution.gs
 * ============================================================
 * Module Range : 60–69 (Domain) + 00_Capability_* (Core, shared with Inventory OS)
 * Version      : V0.1 (Architecture Initialization — NO implementation code exists yet)
 * Last Updated : 2026-09-07
 *
 * 任何架构 / 命名 / 职责变更，必须先更新此文件，再动代码。
 * ============================================================
 */

/* ============================================================
 * 零、身份与来源声明 (IDENTITY & PROVENANCE) — 本仓库特有章节
 * ============================================================
 *
 * 本文件是 Procurement OS 第一份真正描述 Procurement OS 自己的
 * 治理文件。
 *
 * 背景：81_Procurement-main（2026-06-29 快照）仓库内，README 之外
 * 唯二有内容的文件是 00_Identity_Registry.gs（Shared Kernel stub，
 * V0.1）与三份「治理三件套」——但那三份文件的实际内容全部是
 * INVENTORY OS V2.1（模块 21–26）的 Constitution/State/File_Map，
 * 与 Procurement OS 无关。此为文件放置错误，已由使用者确认
 * （见 82_Inventory-main 对照），不构成本文件任何条文的依据来源。
 * 本文件不复制、不引用那三份文件的任何架构决定。
 *
 * 本文件真正的依据来源是 82_Inventory-main（2026-09-01 快照，
 * Inventory OS V4.1，已通过外部审计并交付修复，Phase = Audit
 * Fixes Applied）——Procurement OS 在架构上最直接的姊妹系统与
 * 第一个真实集成对象。详见「八、治理基线声明」。
 */

/* ============================================================
 * 一、核心原则 (CORE PRINCIPLES)
 * ============================================================
 *
 * P1. Procurement OS 的定位与边界：
 *     它是 Procurement Demand Lifecycle Owner——负责 需求
 *     （Request）→ 计划（Planning）→ 决策（Decision）→ 用户确认
 *     （User Confirmation）→ 执行交接（Execution Handoff）→
 *     历史/洞察（History/Insight），且仅限这条链路。
 *     它绝不是：Inventory OS / Finance OS / Supplier CRM /
 *     Accounting OS / Warehouse OS / Payment OS / 通用任务管理器。
 *
 * P2. Identity 不属于 Procurement OS 自己。Identity 属于
 *     Core Capability Layer（00_Capability_Identity.gs），与
 *     Inventory OS 共用同一份代码、同一张 IDENTITY_REGISTRY 表。
 *     Procurement OS 不可自行维护身份比对/去重逻辑，不可自行
 *     生成 identity_id。Flow: Request → Normalizer →
 *     [Core: Identity] → Planner（与 Inventory OS P2 对称）。
 *
 * P3. 一切对外交互通过 Bridge（S9 / 69_ProcurementBridge）层。
 *     禁止任何 Domain 文件（60–68）跨模块直接调用其他 Domain OS、
 *     直接写 TASKS 表、或直接发 Telegram。
 *
 * P4. 【最高优先级原则】AI 的建议（recommendation）永远不等于
 *     用户的授权（authorization）。在真正产生"采购承诺"
 *     （Procurement Commitment）之前，必须经过显式的 User
 *     Confirmation 边界（64_UserConfirmation，见 ADR-001），且
 *     该边界只能由真实用户输入触发，任何自动化路径（含 AI 推荐
 *     本身、定时任务、重试逻辑）都不可替代它、跳过它、或在未收到
 *     用户响应时默认视为已确认。此原则不可被任何"效率"或
 *     "用户体验顺畅"考虑绕过——这不是 UI 细节，是治理边界。
 *
 * P5. Projection（S7 / 67_ProcurementProjection）是查询唯一
 *     真相来源。Events（S6 / 66_ProcurementEvents / Ledger）
 *     不可变，Replay 仅在 Projection 损坏时触发——与 Inventory
 *     OS P5 完全对称。
 *
 * P6. Check 与 Use 必须在同一临界区内完成（与 Inventory OS
 *     Constitution P6 / C12 完全对称，直接继承 Inventory OS
 *     V4.1 的 TOCTOU 修复经验，HIGH2）：Decision 的 decide() /
 *     UserConfirmation 的状态检查只产出"预览"或"待验证的状态
 *     声明"；Execution 持锁后必须重新读取权威状态（含
 *     confirmation_status）并通过 recompute() 得到权威结果，
 *     才能写入。Procurement OS 从第一天就采用这条规则，不重蹈
 *     "先上线、审计后才补锁"的覆辙。
 *
 * P7. source_domain / reason / urgency 等字段必须保持"来源
 *     无关"（source-agnostic）。禁止把 "Inventory" 硬编码为
 *     唯一可能来源——Inventory 目前是第一个、也是唯一真实存在的
 *     来源，但契约设计必须容许 Property OS / Finance OS / 手动
 *     用户请求 / 未来 AI 推荐等来源接入，而不需要重新设计核心。
 *
 * P8. Procurement OS 不自行判断"要不要买"背后的资金问题。
 *     estimated_price / quoted_price 等字段只是 Procurement 自己
 *     决策链路需要的参考数值，不构成财务真相。真正的付款、账户
 *     变动、对账、会计分类，属于 Finance OS（存在时）的权责——
 *     见 ADR-000 Alternatives 与本文件"六、与 Finance OS 的边界"。
 */

/* ============================================================
 * 二、DOMAIN OS LIFECYCLE STANDARD
 *     （沿用 Inventory OS V4 的 9 层标准架构 + 一个 Procurement
 *      专属的新增边界层；Procurement OS = 该标准的第二个完整
 *      实现，见 ADR-000）
 * ============================================================
 *
 *   Request → Normalizer → [Core: Identity] → Planner → Decision
 *                → [User Confirmation] → Execution → Events
 *                → Projection ──┬── Insights (subscriber, 非主流程)
 *                → Bridge       └── (future) Dashboard
 *
 * S1  Request           60_ProcurementRequest.gs
 *                        接收来自各 Domain Adapter（目前只有
 *                        Inventory）的原始请求，零业务逻辑，
 *                        原样转交 Normalizer
 * S2  Normalizer         61_ProcurementNormalizer.gs
 *                        校验/清洗字段，映射来源域自有 payload
 *                        为标准 ProcurementRequest Contract
 *                        （见五、CONTRACTS），触发 Identity 校验，
 *                        零副作用（不写 Sheet）
 * [C] Identity           00_Capability_Identity.gs（复用，不复制）
 * S3  Planner            62_ProcurementPlanner.gs
 *                        按 identity_id 聚合/去重同一物品的多笔
 *                        待处理请求，构建候选 Plan（预览）。
 *                        绝不调用 Identity，绝不做最终决策
 * S4  Decision           63_ProcurementDecision.gs
 *                        decide(plan)=预览（是否值得进入用户确认
 *                        流程、建议数量/时机）；recompute()=
 *                        Execution 持锁后的权威结果。零副作用
 * S4.5 UserConfirmation  64_ProcurementUserConfirmation.gs
 *                        显式治理边界（见 P4 / ADR-001）：把
 *                        Decision 的建议呈现给用户（经 Bridge 发
 *                        Telegram），并且是唯一能把请求状态从
 *                        AWAITING_CONFIRMATION 推进到 CONFIRMED
 *                        或 REJECTED 的模块。不执行任何写入
 *                        PROCUREMENT_REQUESTS 主记录的操作——
 *                        只记录"用户说了什么"，真正的状态落地
 *                        仍由 Execution 在持锁后完成
 * S5  Execution          65_ProcurementExecution.gs
 *                        唯一写 PROCUREMENT_REQUESTS 表的层；唯一
 *                        LockService 脚本锁持有者。写入前必须
 *                        重新读取该请求的权威 confirmation 状态，
 *                        绝不信任 Decision/UserConfirmation 阶段
 *                        产出的"预览"值（P6）
 * S6  Events             66_ProcurementEvents.gs
 *                        不可变 Ledger（PROC_LEDGER）；
 *                        replayEvents/rebuildProjection 仅供
 *                        Projection 损坏时应急使用；不自行持锁，
 *                        只能在 Execution 已持锁的临界区内被调用
 * S7  Projection         67_ProcurementProjection.gs
 *                        维护 Read Model（PROCUREMENT_REQUESTS
 *                        当前状态视图），Pub/Sub 通知订阅者
 * S8  Insights           68_ProcurementInsights.gs
 *                        Projection 订阅者，只读，不阻塞主流程，
 *                        不回写 Ledger / Projection
 * S9  Bridge             69_ProcurementBridge.gs
 *                        全集成层，唯一对外窗口：
 *                        - 接收 Inventory OS（及未来其他 Domain
 *                          OS）经各自 Bridge 发来的入站请求
 *                        - 创建/更新 TASKS 表中的任务
 *                        - 经 Telegram 发送 User Confirmation
 *                          提示与状态通知
 *                        - 不含业务逻辑，不含 Decision 逻辑，
 *                          不自行持锁
 *
 * 依赖方向：60→61→[C:Identity]→62→63→[UserConfirmation]→65→66→67→69
 *           67 ──pub/sub──► 68（非阻塞旁支）
 * 低编号不依赖高编号；69 是唯一对外窗口。
 * 锁的方向：只有 60→...→65 这条链路上，65 才持锁；65 之后
 *           （66/69 的相关函数）在同一临界区内被调用，不重新加锁
 *           （对齐 Inventory OS Constitution C12）。
 *
 * 适用规则：新系统 MUST comply fully；Procurement OS 从设计
 *           第一天就要求完整合规，不存在"legacy via adapter"的
 *           豁免（Inventory OS 二、节末那条豁免专指它自己的
 *           V1→V4 迁移期，不适用于从零开始的 Procurement OS）。
 */

/* ============================================================
 * 三、CAPABILITY LAYER（复用，不复制）
 * ============================================================
 *
 * Procurement OS 复用以下 Core Capability，代码与数据表均与
 * Inventory OS 共享，Procurement OS 自己不维护第二份实现：
 *
 *   00_Capability_Identity.gs   — 身份解析（Inventory OS V4 已
 *                                  实现并生产验证；Procurement OS
 *                                  是其文件头部注释中明确点名的
 *                                  "Future" 调用方之一）
 *
 * 调用方式（只有 S2 Normalizer 可调用）：
 *   CapabilityIdentity.resolve(rawName, 'Procurement')
 *     → { identity_id, canonical_name, is_new }
 *   CapabilityIdentity.get(identityId) → object | null
 *
 * 明确不复用的能力：
 *   00_Capability_Policy.gs（Inventory OS 专属的库存风险公式，
 *   consumption_rate / remaining_days 等概念对 Procurement 的
 *   "该不该批准这笔采购"决策没有直接意义）——Procurement 自己
 *   的决策逻辑（是否推荐、数量、时机）暂时内聚在
 *   63_ProcurementDecision.gs 内部，不上升为新的 Core Capability。
 *   理由：反过早工程化（EP3 对齐）——目前只有 Procurement 一个
 *   潜在使用者，尚无第二个 Domain OS 的收敛证据支持抽出一个
 *   00_Capability_ProcurementPolicy.gs。若未来 Investment OS /
 *   Shopping OS 出现同构的"评估要不要行动"需求，届时依据实际
 *   代码收敛证据再决定是否抽取（对齐 Blueprint BP-2/BP-4 的
 *   证据驱动晋升原则，即使本仓库未正式采纳 Blueprint 本身，
 *   这条"证据优先于预判"的精神仍然适用）。
 *
 * 尚未确认可行的前提（需 Steven 确认，见「九、待确认事项」）：
 *   IDENTITY_REGISTRY 与 TASKS 两张表若物理上位于 Inventory OS
 *   自己的 Spreadsheet（00_Config.gs 的 SPREADSHEET_ID 目前为空，
 *   即"bound to active spreadsheet"），Procurement OS 若是一个
 *   独立部署的 GAS 项目，需要明确这两张表的跨项目访问方式
 *   （SPREADSHEET_ID 显式指向，或 Procurement OS 与 Inventory OS
 *   实际上共享同一个 Spreadsheet/Apps Script 项目）。本文件在此
 *   前提被明确解决前，不假设任何一种部署形态为默认。
 */

/* ============================================================
 * 四、CODING RULES（与 Inventory OS Constitution 四节对称，
 *     并入 UEF Universal Coding Rules 之精神）
 * ============================================================
 *
 * C1.  IIFE 模块封装，对外只暴露必要函数。
 * C2.  完整文件交付制，不使用 diff。
 * C3.  任何变更同步更新治理三件套（Constitution / State /
 *      File_Map）与 00_ADR.gs 索引。
 * C4.  Procurement 自己的"是否推荐/建议数量"公式只在
 *      63_ProcurementDecision.gs 实现一次。
 * C5.  identity_id 只通过 CapabilityIdentity.resolve() /
 *      CapabilityIdentity.get() 取得或校验，Procurement 自己
 *      不做名称匹配。
 * C6.  Event 类型限定为固定枚举（见六、Sheet Schema），不可
 *      随意新增字符串常量。
 * C7.  Batch Read：禁止逐行 / 逐 cell 读 Sheet；同一次执行内
 *      对同一张表应尽量只读一次（对齐 Inventory OS A11 请求级
 *      缓存模式）。
 * C8.  任何文件删除需用户明确批准，禁止自行删除。
 * C9.  Events 层应急函数命名：replayEvents() /
 *      rebuildProjection()。正常流程绝不调用这两个函数。
 * C10. Insights 绝不在主流程中被直接调用（Pub/Sub 异步触发）。
 * C11. 数量类字段非负：Math.max(0, ...)。
 * C12. 【锁的单一持有者原则，对齐 Inventory OS C12】每笔写事务
 *      的 LockService 脚本锁只能由 Execution（S5）持有一次。
 *      66_ProcurementEvents.record()、69_ProcurementBridge 的
 *      任何写操作，一律不自行加锁，只能在 Execution 已持锁的
 *      临界区内被调用。原因与 Inventory OS 完全相同：GAS 脚本锁
 *      不可重入，嵌套获取/释放会在外层临界区仍需要该锁时提前
 *      释放，制造竞态窗口。
 * C13. ID 生成一律通过共享的 _reserveIdBlock() 做区块预留
 *      （复用 Inventory OS 00_Config.gs 的实现，若两者共享同一
 *      Spreadsheet；若确认为独立部署，Procurement OS 需要自己
 *      的 00_Config.gs 副本并使用独立的 PropertiesService key
 *      前缀，避免 ID 空间冲突——见「九、待确认事项」）。不允许
 *      每生成一个 ID 就单独调用一次 PropertiesService 的
 *      GET+SET。
 * C14. 【Procurement 专属】User Confirmation 的状态迁移
 *      （AWAITING_CONFIRMATION → CONFIRMED / REJECTED）只能由
 *      64_ProcurementUserConfirmation.gs 响应真实用户输入触发。
 *      禁止任何测试代码、种子数据脚本、或"方便调试"的临时函数
 *      绕过这一层直接把状态写成 CONFIRMED。
 */

/* ============================================================
 * 五、CONTRACTS（新增章节——不存在于 Inventory OS Constitution，
 *     因为 Procurement OS 是多来源域的接收方，需要显式契约）
 * ============================================================
 *
 * 5.1 Normalized ProcurementRequest Contract
 * ------------------------------------------------------------
 * 由 61_ProcurementNormalizer.gs 产出，是 60–69 内部唯一认可的
 * 请求形状。任何 Domain Adapter（见 5.2）负责把自己域的原生
 * payload 映射成这个形状，Procurement Core 不感知来源域内部
 * 结构。
 *
 *   {
 *     request_id        : string   // 由 60_ProcurementRequest
 *                                   // 经 _reserveIdBlock() 生成，
 *                                   // 不信任来源域提供的任何 ID
 *                                   // 作为 Procurement 自己的主键
 *     source_domain     : string   // 'Inventory' | 'Manual' |
 *                                   // 未来其他 Domain OS 名称——
 *                                   // 禁止硬编码为固定枚举（P7）
 *     source_reference  : string   // 来源域内部有意义的 ID
 *                                   // （如 Inventory 的 itemId），
 *                                   // 仅供追溯，不参与 Procurement
 *                                   // 自己的身份判断
 *     identity_id       : string   // 经 CapabilityIdentity 校验/
 *                                   // 解析后的 canonical identity
 *     canonical_name    : string   // 展示用，来自 CapabilityIdentity
 *     estimated_quantity: number   // 明确是"估计值"（DM-04）——
 *                                   // 在通过 Decision + User
 *                                   // Confirmation 之前，绝不
 *                                   // 视为已承诺的采购数量
 *     unit              : string   // 与 estimated_quantity 配套；
 *                                   // 来源域必须提供，Procurement
 *                                   // 不猜测单位
 *     urgency           : enum     // NORMAL | HIGH | CRITICAL
 *                                   // （Procurement 自己的枚举，
 *                                   // 故意不直接复用 Inventory
 *                                   // 的 RISK 枚举——两者语义不同，
 *                                   // 对齐 Inventory OS G4 的
 *                                   // 「同名词汇分域管理」精神）
 *     reason            : string   // 自由文本，人类可读，禁止
 *                                   // 硬编码为 "Inventory"（DM-07）
 *     required_before   : string?  // ISO 日期字符串，语义 = 
 *                                   // "期望在此日期前完成"的
 *                                   // 操作性目标（operational
 *                                   // target），不是保证的硬
 *                                   // deadline（DM-06，见 DD 记录）
 *     requested_at      : string   // 由 60_ProcurementRequest
 *                                   // 用共享 _now() 等价函数生成
 *   }
 *
 * 5.2 Domain Adapter 原则（对齐 UEF UCR7 Adapter/Port 隔离）
 * ------------------------------------------------------------
 * "Domain Adapter → Normalized ProcurementRequest → Procurement
 * Core"，而不是"Inventory → Procurement 写死的专用逻辑"。
 *
 * 目前唯一真实存在的 Adapter 是 Inventory Adapter：
 *   Inventory 侧：29_InventoryBridge.gs 的 sendProcurementRequest()
 *     【当前为 stub，真实 payload 仅有
 *      { itemId, identityId, itemName, urgency }——比本契约窄，
 *      见「九、待确认事项」】
 *   Procurement 侧：69_ProcurementBridge.gs 的
 *     receiveFromInventory(payload) 负责把上述窄 payload 映射/
 *     补全为 5.1 的完整 Normalized Contract（缺失字段如
 *     estimated_quantity / reason / required_before 的默认值
 *     策略，是一个需要与 Inventory OS 一侧协调的后续事项，不在
 *     本次 Procurement OS 初始化范围内单方面决定）。
 *
 * 5.3 Event Envelope（S6 / 66_ProcurementEvents.gs）
 * ------------------------------------------------------------
 * 固定 8 种事件类型，对齐 Inventory OS C6"固定枚举"原则：
 *   PROCUREMENT_REQUESTED / PROCUREMENT_PLANNED /
 *   PROCUREMENT_PROPOSED / PROCUREMENT_CONFIRMED /
 *   PROCUREMENT_REJECTED / PROCUREMENT_EXECUTED /
 *   PROCUREMENT_CLOSED / PROCUREMENT_CANCELLED
 * 每种事件都是"事实"（fact），不是"指令"（command）或"决策"
 * （decision）——指令/决策活在 Decision 与 UserConfirmation 的
 * 预览对象里，从不直接写入 Ledger。
 */

/* ============================================================
 * 六、SHEET SCHEMA（草案，实现前需在 00_Setup.gs 内建表时最终
 *     核对；本节先冻结字段与语义，不冻结确切列号）
 * ============================================================
 *
 * PROCUREMENT_REQUESTS（Projection / Read Model，S7 维护）
 *   request_id / identity_id / canonical_name / source_domain /
 *   source_reference / estimated_quantity / unit / urgency /
 *   reason / required_before / requested_at / status /
 *   decided_quantity / confirmed_at / confirmed_by /
 *   executed_at / linked_task_id / closed_at / updated_at
 *
 * PROC_LEDGER（S6，append-only）
 *   event_id / event_type / request_id / identity_id / actor /
 *   context_json / recorded_at
 *
 * IDENTITY_REGISTRY — 不新建，复用 Inventory OS 现有表（三、）
 * TASKS — 不新建，复用现有共享表，source_system 写
 *         'ProcurementOS'
 *
 * STATUS（Projection 当前状态枚举，8 态，对齐 ADR-001 状态机）：
 *   REQUESTED | PLANNED | AWAITING_CONFIRMATION | CONFIRMED |
 *   REJECTED | EXECUTED | CLOSED | CANCELLED
 *
 * URGENCY： NORMAL | HIGH | CRITICAL
 *
 * 【待确认】created_at / requested_at / recorded_at 等时间字段
 * 写入 Sheet 前，是否需要对目标列显式调用
 * range.setNumberFormat('@') 强制纯文本，防止 Google Sheets 把
 * ISO 字符串静默转成 Date serial（回读做字符串比较时会失真）。
 * 检查发现 Inventory OS 全仓库（含 V4.1 已通过审计的代码）目前
 * 也没有任何 setNumberFormat 调用——多数日期处理函数
 * （_ds/_daysBetween）通过 instanceof Date 判断做了防御性兼容，
 * 但这属于"没被这个坑咬过"而非"已证明免疫"。建议 Procurement OS
 * 的 00_Setup.gs 建表时主动加上这一保护，而不是等审计报告点名
 * 才修——这不需要 Steven 决策，属于本 Constitution 直接采纳的
 * 防御性默认值。
 */

/* ============================================================
 * 七、ARCHITECTURE RULES（for AI agents）
 * ============================================================
 *
 *   Never invent new architecture without explicit instruction.
 *   Never rename files — update 00_File_Map.gs if files change.
 *   Never create new sheets — update this Constitution first.
 *   Never bypass Bridge to write to another OS or TASKS directly.
 *   Never let AI recommendation code path set status=CONFIRMED (P4/C14).
 *   Never call CapabilityIdentity.resolve() from Planner or below.
 *   Never let a layer below Execution acquire its own script lock (C12).
 *   Never generate an ID via raw PropertiesService GET+SET — use
 *     _reserveIdBlock() (C13).
 *   Never hardcode source_domain to "Inventory" anywhere in Core
 *     logic (P7) — only Adapter-layer mapping code may know about
 *     a specific source domain's native shape.
 *   Return production-ready GAS code only (no pseudo-code) once
 *     implementation phase begins — NOT yet (see State: Phase).
 *   Update 00_Project_State.gs at end of every session.
 *   Any file deletion requires explicit user approval (C8).
 */

/* ============================================================
 * 八、治理基线声明 (GOVERNANCE BASELINE STATEMENT)
 * ============================================================
 *
 * G1. 生态系统内实际存在两条独立发展、彼此未合并的"平台标准"
 *     谱系，本文件如实记录，不代为调和：
 *
 *     谱系 A —— Universal Domain OS Blueprint（0.Governance /
 *     1.Foundation / 2.Runtime / 3.Intelligence / 4.Integration /
 *     5.Testing 树状结构 + Tier 证据晋升制），与 Universal
 *     Engineering Framework（UEF，现已知版本至少到 v1.12，见
 *     G2），经由 Rider OS / Personal AI Core / Reminder OS /
 *     Property OS 一系发展。
 *
 *     谱系 B —— Inventory OS 自己独立发展的"Domain OS Lifecycle
 *     Standard"（Request→Normalizer→[Identity]→Planner→
 *     [Policy]→Decision→Execution→Events→Projection→Insights/
 *     Bridge 的 9 层 S1-S9 结构 + Capability Layer），从 V1 到
 *     V4.1 全程未引用谱系 A 的任何文件、ADR 惯例，直到
 *     2026-08-31 才经 Inventory OS 自己的 Project State DD7 正式
 *     採纳 UEF v1.12 §0.6（且明确声明"不代表採纳
 *     Universal_Domain_OS_Blueprint_v1.2.md"）。
 *
 * G2. 本文件选择让 Procurement OS 成为谱系 B（S1-S9 +
 *     Capability Layer）的第二个完整实现，而不是谱系 A
 *     （Blueprint 树）的新实现——理由见 ADR-000 Decision 与
 *     Alternatives。这是一个有生态系统级影响的选择，不是
 *     Procurement OS 自己单方面能"消化"的决定：它意味着谱系 B
 *     现在有两个真实项目收敛证据（对齐谱系 A 自己的 Tier 晋升
 *     逻辑——如果谱系 A 未来想吸收谱系 B 的经过验证的模式，
 *     Procurement OS 的存在本身就是那个"第二个项目"）。是否要
 *     借此机会启动两条谱系的正式协调/合并，超出本次初始化范围，
 *     列入「九、待确认事项」而非本文件自行决定。
 *
 * G3. 本文件不假设"Domain Blueprint V2"（出现在已确认错置的
 *     Inventory OS V2.1 旧文件里）与谱系 A 或谱系 B 是同一份
 *     东西。这个名字目前找不到对应的当前文件，按来源指令的
 *     要求如实记录不确定性，不代为改写或假设。
 *
 * G4. UEF 版本号：本仓库所知最新确凿证据是 Inventory OS
 *     Project State DD7（2026-08-31）引用的
 *     "Universal_Engineering_Framework_v1_12.md"。这与更早期
 *     记录中的 UEF v1.5 不一致，说明 UEF 在此之间至少经过多次
 *     未被本仓库追踪到的版本迭代。本文件不假装知道 v1.5 到
 *     v1.12 之间发生了什么，也不假装 v1.12 就是当前最新版本。
 */

/* ============================================================
 * 九、待确认事项 (OPEN QUESTIONS REQUIRING STEVEN'S DECISION)
 * ============================================================
 *
 * Q1. 【最高优先级】是否同意 Procurement OS 采用 Inventory OS
 *     的 S1-S9 + Capability Layer 标准（谱系 B），而不是
 *     Universal Domain OS Blueprint 的树状结构（谱系 A）？
 *     见 G1-G2、ADR-000。本文件目前的全部内容都建立在"同意"
 *     这个前提之上——如果答案是否定的，八、二、三、四节需要
 *     重写。
 *
 * Q2. Procurement OS 的实际部署形态：是与 Inventory OS 共享
 *     同一个 Google Spreadsheet / Apps Script 项目（"Domain OS"
 *     只是代码组织边界），还是真正独立的 GAS 项目/Spreadsheet
 *     （需要显式 SPREADSHEET_ID 跨项目访问 IDENTITY_REGISTRY 与
 *     TASKS）？ADR-000 的核心问题（"为什么要独立成 GAS
 *     project"）在两种部署形态下答案完全不同，见 ADR-000。
 *
 * Q3. Inventory OS 现有的 sendProcurementRequest() stub 目前只
 *     发送 { itemId, identityId, itemName, urgency } 四个字段，
 *     比本文件五、1 定义的完整 Contract 窄很多。补齐
 *     estimated_quantity / reason / required_before 需要修改
 *     Inventory OS 自己的 29_InventoryBridge.gs——这是否属于本次
 *     任务范围，还是留给 Inventory OS 下一次迭代？
 *
 * Q4. User Confirmation 的实际 UX 机制：沿用 Inventory OS 已有的
 *     Telegram 命令模式（用户回复 /confirm <request_id> 或类似
 *     命令），还是需要别的机制？64_ProcurementUserConfirmation.gs
 *     的具体实现依赖这个答案。
 *
 * Q5. 【Verification Gate 自查中发现，非原始任务指令逐项列出】
 *     69_ProcurementBridge.receiveFromInventory() 目前没有幂等性
 *     保护——Inventory 一侧若因网络问题重试同一次
 *     sendProcurementRequest() 调用，会产生重复的
 *     PROCUREMENT_REQUESTED 记录。需要类似 Inventory OS 自己
 *     Telegram webhook 用过的 updateId+CacheService 去重模式，
 *     但具体用什么做 correlation_id（谁生成、生命周期多长）需要
 *     先确定，见 00_Project_State.gs 八、Recovery Gate。
 */
