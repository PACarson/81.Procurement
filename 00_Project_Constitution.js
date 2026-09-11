/**
 * ============================================================
 * PROCUREMENT OS V0.1 — 00_Project_Constitution.gs
 * ============================================================
 * Module Range : 60–69 (Domain) + 00_Capability_* (Core, shared with Inventory OS)
 * Version      : V0.2 (Architecture Freeze Ready — Q1–Q5 closed;
 *                NO implementation code exists yet)
 * Last Updated : 2026-09-09
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
 *
 * P9. 【Q4 / ADR-001 补充】User Confirmation 是"对某一份具体呈现
 *     给用户的提案"的确认，不是对"这个 identity_id 未来任何采购"
 *     的授权。确认的范围严格限定在呈现时的
 *     {identity_id, decided_quantity, urgency} 快照。若在
 *     CONFIRMED 与 EXECUTED 之间，这几个字段中任何一个发生实质
 *     变化（identity_id 变了；decided_quantity 变化超出容忍度；
 *     urgency 从呈现时的等级发生升降），Execution 必须视为该
 *     confirmation 已失效，把状态打回 AWAITING_CONFIRMATION 并
 *     重新触发确认，不能拿旧的确认记录去授权一个用户没见过的新
 *     提案。渠道（Telegram 或未来任何渠道）本身永远不是这个
 *     确认的拥有者——Telegram 只是把"用户说了 CONFIRM"这个事实
 *     传回来的一个 Adapter，确认到底对不对应该被信任，最终仍由
 *     Procurement Core（Execution 的重新校验）判断，不是
 *     Telegram Adapter 自己说了算。
 *
 * P10. 【Q5 / ADR-003】Bridge 的入站路径必须具备幂等性，且这个
 *     要求在实现阶段开始之前就必须成立，不能"先实现、审计后再
 *     补"。对重试、重复投递、超时重试、replay、灾难恢复、重复
 *     回调、人工重新处理，系统都不能因此产生第二次有效的业务
 *     写入。幂等性检查与真正的写入必须在同一个临界区内完成
 *     （Execution 持锁），不允许"先查存在与否、再决定要不要写"
 *     这种检查和写入分离、留有竞态窗口的写法。
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
 *                        显式治理边界（见 P4/P9/ADR-001），渠道
 *                        无关（Q4）：自己不知道"Telegram"的细节，
 *                        只定义 CONFIRM/REJECT/EXPIRE 三种结果的
 *                        规则与状态语义，实际收发消息交给一个
 *                        更下层的 Telegram Adapter（经 Bridge）。
 *                        是唯一能把请求状态从
 *                        AWAITING_CONFIRMATION 推进到 CONFIRMED /
 *                        REJECTED / EXPIRED 的模块。不执行任何
 *                        写入 PROCUREMENT_REQUESTS 主记录的
 *                        操作——只记录"用户说了什么、什么时候
 *                        说的、针对哪一份快照说的"，真正的状态
 *                        落地与"这份确认是否仍然有效"的判断
 *                        （P9）仍由 Execution 在持锁后完成
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
 * 部署形态（Q2 已决定，见 ADR-002）：
 *   Runtime 边界与 Persistence 边界是两个独立决定，不可混为一谈：
 *   - Runtime：Procurement OS 是独立的 GAS 项目/脚本容器，不依赖
 *     Inventory OS 的 Runtime 运行——与 Inventory OS 之间只有
 *     request/event 层面的往来（经 Bridge），没有代码层面的
 *     调用依赖。
 *   - Persistence：暂时共享同一个"生态系统 Spreadsheet"（与
 *     IDENTITY_REGISTRY / TASKS 物理同表），但严格维持表级归属——
 *     Procurement OS 自己的脚本只直接读写 PROCUREMENT_REQUESTS /
 *     PROC_LEDGER 两张表，对 IDENTITY_REGISTRY / TASKS 一律只能
 *     经 00_Capability_Identity.gs / Bridge 的既有接口访问，不
 *     绕过接口直接操作这两张表的原始行。这是"暂时"的选择
 *     （EP3 反过早工程化——现在没有证据支持需要物理隔离），不是
 *     永久架构承诺，见 ADR-002 Review Trigger。
 *   - 技术含义：Procurement OS 作为独立脚本容器，本来就不会
 *     "bound" 到这个共享 Spreadsheet，需要显式
 *     SpreadsheetApp.openById(ecosystemSpreadsheetId)——这一点
 *     不因选 A（独立 Spreadsheet）或 B（共享）而改变，唯一的
 *     差别是 Procurement 自己的两张新表，是并入这同一个
 *     Spreadsheet，还是另开一个。
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
 * C13. ID 生成一律通过 _reserveIdBlock() 做区块预留（Q2 已决定
 *      Persistence 暂时共享同一 Spreadsheet，Procurement OS 用
 *      自己独立的 PropertiesService key 前缀——例如
 *      'PROC_REQ_ID' 而非 Inventory 的 'INV_ID'——避免 ID
 *      空间冲突；实现方式可以是调用共享 Config 里的通用
 *      _reserveIdBlock() 辅助函数，也可以是 Procurement 自己
 *      00_Config.gs 里的一份轻量副本，具体选哪个留到实现阶段
 *      按实际代码组织决定，不是架构层面的分歧）。不允许每生成
 *      一个 ID 就单独调用一次 PropertiesService 的 GET+SET。
 * C14. 【Procurement 专属】User Confirmation 的状态迁移
 *      （AWAITING_CONFIRMATION → CONFIRMED / REJECTED）只能由
 *      64_ProcurementUserConfirmation.gs 响应真实用户输入触发。
 *      禁止任何测试代码、种子数据脚本、或"方便调试"的临时函数
 *      绕过这一层直接把状态写成 CONFIRMED。
 * C15. 【Q5 / ADR-003】65_ProcurementExecution 必须提供一个
 *      "intake"入口（例如 executeIntake(candidateRequest,
 *      idempotencyKey)），在持锁临界区内先检查
 *      idempotencyKey 是否已存在于 PROCUREMENT_REQUESTS/
 *      PROC_LEDGER 权威记录中；已存在则直接返回既有结果，不产生
 *      新的 PROCUREMENT_REQUESTED 事件；不存在才继续正常写入
 *      流程。CacheService 等短期缓存只能作为查询前的快速路径
 *      optimisation，不能替代这个持久化层面的权威检查——短期
 *      缓存会过期，但幂等性保证不能过期。
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
 *     idempotency_key   : string   // 【Q5/ADR-003 新增】
 *                                   // = source_domain + ':' +
 *                                   // source_reference + ':' +
 *                                   // urgency（见 5.5）。由
 *                                   // Normalizer 计算，Execution
 *                                   // 在持锁临界区内用它做幂等
 *                                   // 检查
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
 *     estimated_quantity: number?  // 【Q3 已决定：可为 null】
 *                                   // 明确是"估计值"（DM-04），且
 *                                   // 只在来源域真的提供了这个
 *                                   // 数字时才有值——今天唯一的
 *                                   // 来源域 Inventory 的真实
 *                                   // payload 里没有这个字段，
 *                                   // Normalizer 绝不能替它编造
 *                                   // 一个默认数量（P9/Q3 的
 *                                   // "不得杜撰上游没给的事实"
 *                                   // 原则）。为 null 时，
 *                                   // Decision/UserConfirmation
 *                                   // 必须能在没有建议数量的
 *                                   // 情况下工作——数量留给用户
 *                                   // 在确认时自己填，或留给
 *                                   // 实际执行时人工判断
 *     unit              : string?  // 同上，可为 null；来源域
 *                                   // 未提供时 Procurement 不
 *                                   // 猜测单位
 *     urgency           : enum     // NORMAL | HIGH | CRITICAL
 *                                   // （Procurement 自己的枚举，
 *                                   // 故意不直接复用 Inventory
 *                                   // 的 RISK 枚举——两者语义不同，
 *                                   // 对齐 Inventory OS G4 的
 *                                   // 「同名词汇分域管理」精神）
 *     reason            : string?  // 【Q3 已决定：可为 null】
 *                                   // 自由文本，人类可读，禁止
 *                                   // 硬编码为 "Inventory"（DM-07）；
 *                                   // 今天来自 Inventory 的请求
 *                                   // 没有这个字段，为 null，不
 *                                   // 由 Procurement 编造一句
 *                                   // "库存不足"之类的默认理由——
 *                                   // 缺失就是缺失，UserConfirmation
 *                                   // 呈现时用 urgency+canonical_name
 *                                   // 拼一句人类可读的提示即可，
 *                                   // 不需要假装有 reason
 *     required_before   : string?  // ISO 日期字符串，语义 =
 *                                   // "期望在此日期前完成"的
 *                                   // 操作性目标（operational
 *                                   // target），不是保证的硬
 *                                   // deadline（DM-06，见 DD 记录）；
 *                                   // 【Q3】今天来自 Inventory 的
 *                                   // 请求同样没有这个字段，可为
 *                                   // null
 *     requested_at      : string   // 由 60_ProcurementRequest
 *                                   // 用共享 _now() 等价函数生成
 *   }
 *
 * 【Q3 补充说明】estimated_quantity / unit / reason /
 * required_before 四个字段全部标记为可空，是如实反映"Inventory
 * 今天真的只发了 { itemId, identityId, itemName, urgency }
 * 四个字段"这个事实，而不是本文件当初设计契约时假设的更丰富
 * 输入。把这四个字段补齐，需要修改 Inventory OS 自己的
 * 29_InventoryBridge.gs，明确记录为 Inventory OS 未来的迭代
 * 事项（见五、5.2），本次任务不会为了让契约"看起来完整"而去
 * 触碰 Inventory OS 的代码，也不会在 Procurement 这一侧偷偷
 * 编造这些缺失字段的默认值。
 *
 * 5.2 Domain Adapter 原则（对齐 UEF UCR7 Adapter/Port 隔离）
 * ------------------------------------------------------------
 * "Domain Adapter → Normalized ProcurementRequest → Procurement
 * Core"，而不是"Inventory → Procurement 写死的专用逻辑"。
 *
 * 目前唯一真实存在的 Adapter 是 Inventory Adapter：
 *   Inventory 侧：29_InventoryBridge.gs 的 sendProcurementRequest()
 *     【当前为 stub，真实 payload 就是且仅是
 *      { itemId, identityId, itemName, urgency }——这是已核实的
 *      当前事实，不是本文件的假设，见 Q3 决定：本次任务不修改
 *      Inventory OS 代码来丰富它】
 *   Procurement 侧：69_ProcurementBridge.gs 的
 *     receiveFromInventory(payload) 只做"映射"，不做"补全"：
 *     itemId → source_reference，identityId → identity_id（经
 *     CapabilityIdentity.get() 校验存在性，不重新按名字解析），
 *     itemName → canonical_name 的展示兜底，urgency → urgency
 *     直通。estimated_quantity / unit / reason / required_before
 *     一律映射为 null，不编造（P9/Q3）。补齐这四个字段需要
 *     Inventory OS 自己在未来某次迭代里修改
 *     29_InventoryBridge.gs——那是 Inventory OS 的变更，记录在
 *     此作为已知的未来协调事项，不是 Procurement OS 这次要解决
 *     的问题，也不是一个还悬而未决的问题。
 *
 * 5.3 Event Envelope（S6 / 66_ProcurementEvents.gs）
 * ------------------------------------------------------------
 * 固定 9 种事件类型（2026-09-09 新增 EXPIRED，与状态机同步），
 * 对齐 Inventory OS C6"固定枚举"原则：
 *   PROCUREMENT_REQUESTED / PROCUREMENT_PLANNED /
 *   PROCUREMENT_PROPOSED / PROCUREMENT_CONFIRMED /
 *   PROCUREMENT_REJECTED / PROCUREMENT_EXPIRED /
 *   PROCUREMENT_EXECUTED / PROCUREMENT_CLOSED /
 *   PROCUREMENT_CANCELLED
 * 每种事件都是"事实"（fact），不是"指令"（command）或"决策"
 * （decision）——指令/决策活在 Decision 与 UserConfirmation 的
 * 预览对象里，从不直接写入 Ledger。
 *
 * 5.4 User Confirmation Contract（Q4/ADR-001，渠道无关设计）
 * ------------------------------------------------------------
 * 概念上明确区分六件事，任何实现代码不可把它们合并：
 *   Recommendation（Decision.decide() 的预览输出）
 *   → Decision（系统对"该不该问用户"的判断，本身不是授权）
 *   → Confirmation（真实用户对某一份具体提案的明确响应）
 *   → Authorization（Confirmation=CONFIRM 后，系统内部才能
 *      认定"可以执行"这个状态）
 *   → Execution（真正对外产生影响的动作——今天=创建 Task）
 *   → Fact（写入 PROC_LEDGER 的不可变记录）
 *
 * 架构形状：
 *   Procurement Core → AWAITING_CONFIRMATION
 *     → User Confirmation Adapter（64_ProcurementUserConfirmation.gs，
 *        渠道无关的状态与规则拥有者）
 *         → Telegram Adapter（今天唯一实现的渠道；只负责收发
 *           消息、把用户的回复转成 CONFIRM/REJECT/EXPIRE 三种
 *           结果之一回传给 User Confirmation Adapter；不直接
 *           改 Procurement 的任何状态字段）
 *     → 回到 Procurement Core（Execution 重新校验后落地）
 *
 * 未来渠道（Web UI / Mobile UI / 其他 Chat 界面）只需要新增一个
 * 平行于 Telegram Adapter 的适配器，State Machine 与
 * User Confirmation Adapter 的规则不因此变化——这是"Core 必须
 * 渠道无关"这条要求的具体落地方式。
 *
 * 语义边界（Q4 明确列出，必须在实现里体现）：
 *   一次 CONFIRM 只代表用户确认了"呈现给他的那一份具体提案"
 *   （identity_id + decided_quantity + urgency 的快照），不代表：
 *     - Telegram 本身有权限批准未来任意采购
 *     - AI 可以在没有新一轮确认的情况下自己产生一笔新订单
 *     - 系统可以在确认之后静默修改数量/供应商/金额
 *     - 这次确认可以被复用在另一笔无关的请求上
 *   若 CONFIRMED 与 EXECUTED 之间提案的实质参数发生变化，见 P9：
 *   Execution 必须判定该确认是否仍然有效，无效则打回
 *   AWAITING_CONFIRMATION 重新确认，不得沿用旧确认放行新提案。
 *
 * 5.5 Bridge Idempotency Contract（Q5/ADR-003）
 * ------------------------------------------------------------
 * idempotency_key = source_domain + ':' + source_reference + ':'
 *                   + urgency
 *   例：'Inventory:item_042:CRITICAL'
 *
 * 已知局限（如实记录，不假装已解决）：Inventory 今天的 payload
 * 不含任何时间戳或事件级 correlation ID（见 5.1 补充说明），
 * 所以这个 key 的唯一性范围是"同一 identity 在同一 urgency 下，
 * 只要还有一笔未进入终态（CLOSED/CANCELLED/REJECTED/EXPIRED）
 * 的请求，就不再产生新请求"，而不是真正意义上的"这次 HTTP 调用
 * 是否发生过两次"的传递级去重。这个局限来自上游数据本身的限制
 * （Q3），不是 Procurement 自己能修的——等 Inventory OS 未来
 * 提供真正的 event/correlation ID，这里的去重精度可以直接升级，
 * 不需要重新设计。
 *
 * 处理流程（必须在 65_ProcurementExecution 的持锁临界区内完成，
 * 见 C15/P10）：
 *   收到候选请求 → 加锁 → 查询 PROCUREMENT_REQUESTS 是否已有
 *   相同 idempotency_key 且状态非终态的记录 →
 *     存在 → 直接返回既有 request_id 对应的现状，不新建
 *            PROCUREMENT_REQUESTED 事件
 *     不存在 → 正常走 intake 流程，写入新记录（含这个
 *              idempotency_key），释放锁
 *   CacheService 可以加在这个流程前面做快速路径（避免每次都要
 *   查表），但缓存不是这个保证的来源——真正的判断永远以持久化
 *   表里的查询结果为准，缓存过期不代表可以重新处理成功一次。
 */

/* ============================================================
 * 六、SHEET SCHEMA（草案，实现前需在 00_Setup.gs 内建表时最终
 *     核对；本节先冻结字段与语义，不冻结确切列号）
 * ============================================================
 *
 * PROCUREMENT_REQUESTS（Projection / Read Model，S7 维护）
 *   request_id / idempotency_key / identity_id / canonical_name /
 *   source_domain / source_reference / estimated_quantity / unit /
 *   urgency / reason / required_before / requested_at / status /
 *   decided_quantity / confirmed_at / confirmed_by /
 *   confirmed_snapshot_json（P9 用——记录呈现给用户那一刻的
 *   identity_id/decided_quantity/urgency 快照，供 Execution 比对
 *   是否"实质变化"）/ executed_at / linked_task_id / closed_at /
 *   updated_at
 *
 * PROC_LEDGER（S6，append-only）
 *   event_id / event_type / request_id / identity_id / actor /
 *   context_json / recorded_at
 *
 * IDENTITY_REGISTRY — 不新建，复用 Inventory OS 现有表（三、）
 * TASKS — 不新建，复用现有共享表，source_system 写
 *         'ProcurementOS'
 *
 * STATUS（Projection 当前状态枚举，9 态，对齐 ADR-001 状态机，
 * 2026-09-09 新增 EXPIRED）：
 *   REQUESTED | PLANNED | AWAITING_CONFIRMATION | CONFIRMED |
 *   REJECTED | EXPIRED | EXECUTED | CLOSED | CANCELLED
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
 * G2.【Q1 — 已批准 / APPROVED，2026-09-09】Procurement OS 正式
 *     确认为谱系 B（S1-S9 + Capability Layer）的第二个完整
 *     实现，不是谱系 A（Blueprint 树）的新实现，也不引入第三条
 *     谱系。官方关系图（本次决定采用，以后续版本为准）：
 *
 *       UEF v1.12
 *           │
 *           └── §0.6 governance overlay
 *                   │
 *                   └── S1–S9 Domain OS Lifecycle
 *                           │
 *                           ├── Inventory OS
 *                           └── Procurement OS
 *
 *     明确澄清：这不代表 Universal Domain OS Blueprint v1.2
 *     "无效"或被否定——只代表在这个生态系统里，Inventory OS 已经
 *     建立了被採纳的 Domain OS runtime/lifecycle 谱系，Procurement
 *     OS 选择与它保持兼容，而不是引入第二套互相竞争的 runtime
 *     架构。谱系 A/B 是否要正式协调/合并，仍然超出 Procurement
 *     OS 自己的范围，但不再是本项目的"待确认事项"——对
 *     Procurement OS 而言，这个问题已经关闭。
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
 * 九、已解决事项与遗留细节
 * ============================================================
 *
 * Q1–Q5（原「待确认事项」）已于 2026-09-09 全部关闭，决定分别
 * 记录于：
 *   Q1（架构谱系）      → 本文件 G2、ADR-000
 *   Q2（部署边界）      → 本文件三、、ADR-002
 *   Q3（Inventory 契约） → 本文件五、5.1/5.2（范围外，不修改
 *                          Inventory OS）
 *   Q4（Telegram UX）   → 本文件五、5.4、P9、ADR-001
 *   Q5（Bridge 幂等性） → 本文件五、5.5、C15/P10、ADR-003
 *
 * 以下是关闭过程中新产生、仍然是"细节留待实现阶段"而非"架构级
 * 悬而未决"的项目：
 *
 * D1. AWAITING_CONFIRMATION 新增 EXPIRED 终态（区别于用户主动
 *     REJECTED）。默认超时时长建议 24 小时（对齐 urgency=CRITICAL
 *     场景"剩余天数<3天"的紧迫性——等太久确认失去意义），但这个
 *     数字是可调参数，不是架构决定，实现时可按 urgency 分级
 *     （比如 CRITICAL 24 小时、HIGH 48 小时、NORMAL 72 小时），
 *     具体分级留给实现阶段。
 *
 * D2. P9 提到的"decided_quantity 变化容忍度"没有给出具体数字
 *     （比如±10%内不算实质变化）。这是一个可以在实现阶段按
 *     真实使用情况调整的参数，不阻塞 Architecture Freeze。
 *
 * D3. 5.5 的 idempotency_key 字段命名（source_domain +
 *     source_reference + urgency 的组合方式）是本文件在没有
 *     真正的 UEF v1.12 原文可核对的情况下给出的最佳判断——若
 *     Steven 手上有 UEF v1.12 对幂等键命名的既定约定，应以那份
 *     为准，本文件的命名不是不可调整的架构决定。
 *
 * 以上三项均不构成 Architecture Freeze 的阻塞项——它们是"已经
 * 有一个合理默认值，可以在实现阶段按真实反馈微调"的参数，不是
 * "没有决定就无法继续"的架构缺口。
 */
