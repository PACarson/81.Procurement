/**
 * ============================================================
 * PROCUREMENT OS — 00_Project_State.gs
 * ============================================================
 * Last Updated : 2026-09-07
 * ============================================================
 */

/* ============================================================
 * 一、PHASE
 * ============================================================
 *
 * Phase: Architecture Initialization（治理与架构定案，无任何
 *        实现代码）
 *
 * 不做的声明（对齐使用者原始指令 Verification Gate /
 * Implementation Gate 的要求，不能声称还不存在的东西存在）：
 *   - 60–69 之下没有任何一个 .gs/.js 文件真正被写出来
 *   - PROCUREMENT_REQUESTS / PROC_LEDGER 两张表没有被创建
 *   - 与 Inventory OS 之间没有任何真实的端到端集成被打通——
 *     Inventory 一侧的 sendProcurementRequest() 目前只是
 *     console.log 的 stub
 */

/* ============================================================
 * 二、已完成 (COMPLETED)
 * ============================================================
 *
 * - 确认 81_Procurement-main 仓库的文件放置错误（三份治理文件
 *   实为 Inventory OS V2.1 内容），并排除其作为本项目依据来源
 * - 检视 82_Inventory-main（V4.1，2026-09-01 快照）建立真实
 *   治理基线，发现生态系统内存在两条独立平台标准谱系（见
 *   Constitution 八、G1-G4）
 * - 完成 Repository Diagnosis（见「三、」）
 * - 完成 Identity Registry 归属澄清（见「四、」）
 * - 完成 ADR-000（Procurement OS 独立成 Domain OS）
 * - 完成 ADR-001（User Confirmation 治理边界）
 * - 完成 Domain Model / 60–69 模块地图（00_File_Map.gs）
 * - 完成 Normalized ProcurementRequest Contract 设计
 *   （Constitution 五、5.1）
 * - 完成 Design Decisions DD1–DD8（见「五、」），解决 Decision
 *   Matrix 中除 DM-01/DM-03（已升级为 ADR-000/ADR-001）以外的
 *   全部条目
 */

/* ============================================================
 * 三、REPOSITORY DIAGNOSIS（对应使用者原始任务指令 20-B）
 * ============================================================
 *
 * 81_Procurement-main（2026-06-29 快照）内容核对结果：
 *
 *   README.md                    → 仅一行标题，无实质内容
 *   00_Project_Constitution.txt  → 实为 Inventory OS V2.1
 *                                   Constitution（模块 21–26），
 *                                   非 Procurement OS 内容
 *   00_Project_State.txt         → 实为 Inventory OS V2.1 State，
 *                                   非 Procurement OS 内容
 *   00_File_Map.txt              → 实为 Inventory OS V2.1
 *                                   File_Map，非 Procurement OS
 *                                   内容
 *   00_Identity_Registry.txt     → 真实的 Shared Kernel 代码，
 *                                   但已被 82_Inventory-main 里
 *                                   的 00_Capability_Identity.gs
 *                                   取代（见「四、」），本身已是
 *                                   过时版本
 *
 * 结论：Procurement OS 在本次任务开始前，没有任何一份真正描述
 * 它自己的治理文件或代码。三份"治理三件套"内容对错项目，第四份
 * 真代码已被姊妹系统的后续迭代取代。这不是可以"修补"的状态，
 * 只能重新起草——这正是本次任务在做的事。
 */

/* ============================================================
 * 四、IDENTITY REGISTRY 归属澄清（对应使用者原始任务指令 8）
 * ============================================================
 *
 * 上一轮审查曾对 00_Identity_Registry.gs（V0.1 stub）给出
 * HIGH/MEDIUM/LOW 三级技术发现（created_at 日期格式风险、
 * 缺少 LockService、缺少 try/catch）。现在有了 82_Inventory-main
 * 的真实证据，需要修正：
 *
 *   00_Identity_Registry.gs（V0.1，81_Procurement-main 内）
 *   已被 00_Capability_Identity.gs（V4/V4.1，82_Inventory-main
 *   内）取代。证据：
 *     - 函数签名不同：旧版 resolve({canonicalName,...}) vs
 *       新版 resolve(rawName, domain)
 *     - Sheet 名称沿用 IDENTITY_REGISTRY，但 schema 已变
 *       （旧：identity_id/canonical_name/aliases/category/unit/
 *       created_at；新：identity_id/canonical_name/aliases_json/
 *       domain/created_at——category 和 unit 被移除，新增 domain）
 *     - 新版已经修了旧版审查发现的大部分问题：
 *       · LockService 保护 → 已加（resolve()/addAlias() 都有
 *         LockService.getScriptLock()，10 秒超时，try/finally
 *         确保释放）
 *       · ID 生成的并发/效率问题 → 已用 _reserveIdBlock() 区块
 *         预留解决（比单纯加锁更进一步，明确标注
 *         "Fixes: audit MEDIUM3"，说明 Inventory OS 自己也做过
 *         一轮真实审计）
 *     - 唯一没有在新版里明确验证到的：created_at 的
 *       setNumberFormat('@') 保护——检查发现整个
 *       82_Inventory-main 仓库（含已通过审计的 V4.1 代码）都
 *       没有这个调用。这不是 Procurement OS 的问题，是 Inventory
 *       OS 自己 Core Capability 层一个尚未被审计点名、但确实
 *       存在的潜在风险（多数日期比较代码有 instanceof Date 防御，
 *       降低了实际炸掉的概率，但不等于已证明安全）。这个发现
 *       与 Procurement OS 初始化任务本身无关，如实记录在这里，
 *       不在本项目范围内擅自修改 Inventory OS 的文件。
 *
 * 结论：Procurement OS 的 61_ProcurementNormalizer.gs 应该调用
 * CapabilityIdentity.resolve(rawName, 'Procurement')，而不是
 * 已经过时的 IdentityRegistry.resolve()。上一轮给出的
 * HIGH/MEDIUM/LOW 技术发现，除 created_at 一项外，均已在真实
 * 当前版本中解决，不需要 Procurement OS 重新去修一个已经被
 * 取代的文件。
 */

/* ============================================================
 * 五、DESIGN DECISIONS (DD1–DD8)
 * ============================================================
 * 对应使用者原始任务指令的 Decision Matrix DM-02, DM-04~DM-10
 * （DM-01 → ADR-000；DM-03 → ADR-001，不在此重复）
 *
 * DD1 (DM-02 来源无关性)
 * ------------------------------------------------------------
 * ProcurementRequest 的 source_domain 是自由字符串而非硬编码
 * 枚举，Normalizer 按 sourceDomain 分派到对应的私有映射函数
 * （_mapFromInventory() 等）。新增来源域 = 新增一个映射函数，
 * 不改动 Planner/Decision/Execution 任何一行。理由：Inventory
 * OS 自己的 00_Capability_Identity.gs 文件头已经点名
 * "Future: Procurement OS Normalizer, Shopping OS Normalizer"，
 * 00_Capability_Policy.gs 点名 "Future: Procurement OS Decision,
 * Investment OS Decision"——多来源不是假设性的，是生态系统自己
 * 已经写下的预期。
 *
 * DD2 (DM-04 数量语义)
 * ------------------------------------------------------------
 * estimated_quantity 在契约里明确命名为"估计值"，在通过
 * Decision + User Confirmation 之前，任何代码都不可以把它当作
 * "已承诺的采购数量"使用或展示给用户当作最终值。decided_quantity
 * 是 Decision.recompute() 之后才产生的、真正代表决策结果的字段，
 * 两者在 Schema 里是不同的列，不是同一个字段的两个别名。
 *
 * DD3 (DM-05 urgency 语义)
 * ------------------------------------------------------------
 * urgency 是受限枚举 NORMAL | HIGH | CRITICAL，不是自由文本。
 * 故意不直接复用 Inventory OS 的 RISK 枚举（CRITICAL/LOW/WATCH/
 * SAFE）——两者概念不同：RISK 描述"库存还能撑多久"，urgency
 * 描述"这笔采购请求有多急"。对齐 Inventory OS Constitution G4
 * 展示的"同名词汇分域管理"纪律：即使字面上都叫"CRITICAL"，
 * 两边的判定逻辑、拥有者、演化路径都应该独立，不应该因为共用
 * 一个字符串常量就产生隐性耦合。Inventory Adapter 负责把
 * RISK=CRITICAL 映射成 urgency=CRITICAL，这个映射关系本身
 * 属于 Adapter 层，不是两个枚举合并成一个。
 *
 * DD4 (DM-06 required_before 语义)
 * ------------------------------------------------------------
 * required_before 定义为"操作性目标"（operational target）：
 * 表示"希望在此日期前完成"，不是系统保证兑现的硬 deadline，也
 * 不是纯粹的规划参考。Planner/Decision 应该把"临近
 * required_before"当作提升有效紧急度的信号，但不应该假设错过
 * 这个日期会触发任何自动化的升级或告警——那需要额外设计（未来
 * 若有真实需求再加），V0.1 阶段只做语义定义，不做自动化行为。
 *
 * DD5 (DM-07 reason 语义)
 * ------------------------------------------------------------
 * reason 是自由文本、人类可读、来源无关。明确禁止任何 Core
 * 逻辑把它硬编码或默认值写成 "Inventory"——这正是
 * 81_Procurement-main 旧文件里 A5 那句"reason='Inventory'"
 * 写法的问题所在，本次设计刻意修正。
 *
 * DD6 (DM-08 Supplier/Vendor 推迟)
 * ------------------------------------------------------------
 * Supplier/Vendor 管理不在 V0.1 范围内实现，也不预留专门的
 * Sheet 或模块占位。理由：EP3 反过早工程化——目前没有任何证据
 * 表明"记录供应商"是这个系统现阶段的真实需求（使用者的采购
 * 场景更像是"提醒去买"，不是"管理多个供应商比价下单"）。
 * Constitution 明确排除"Procurement OS 不应该变成 Supplier
 * CRM"（P1）。如果未来出现真实需求，作为独立的 Capability 或
 * Domain 扩展来做，不是现在就在 Schema 里加空列。
 *
 * DD7 (DM-09 Procurement vs Finance 边界)
 * ------------------------------------------------------------
 * Procurement 拥有：estimated_price / quoted_price / approved
 * amount（作为采购决策过程的参考数值与"采购事实"）。Finance OS
 * （目前不存在，是生态系统命名过的未来 Domain）拥有：payment /
 * account movement / reconciliation / 会计分类 / 财务账本真相。
 * Procurement 记录"花了多少钱去买"是一个采购事实，不等于
 * Finance 记录"这笔钱从哪个账户扣、怎么记账"的财务真相——两者
 * 即使数值相同，归属也不同（对齐 Constitution P8）。V0.1 阶段
 * Procurement 甚至还没有 estimated_price 字段（见五、5.1 契约，
 * 目前只有 quantity/urgency/reason/required_before）——补充
 * 价格相关字段本身也应该等到有真实需求或 Finance OS 边界更
 * 明确之后再做，不在本次初始化范围内。
 *
 * DD8 (DM-10 执行机制)
 * ------------------------------------------------------------
 * 选择 B/D 的组合：65_ProcurementExecution 产出"执行指令"
 * （创建/更新 Task，让人类去完成实际购买），而不是 A（Procurement
 * 自己直接下单）——因为生态系统里目前没有任何真实的电商/供应商
 * API 集成，选 A 会凭空创造一个不存在的依赖。同时按 D 的精神
 * 把 69_ProcurementBridge 设计成可以未来接入多种"执行适配器"
 * 的窗口（今天只有"创建 Task"这一种适配器），避免绑死在单一
 * 未来平台上。这与 Inventory OS 自己"信号触发 Task，人类完成
 * 实际动作"的既有模式完全一致，不是 Procurement 独创的新范式。
 */

/* ============================================================
 * 六、下一步 (NEXT STEPS)
 * ============================================================
 *
 * 1. Steven 就 Constitution 九、Q1–Q4 四项待确认事项给出决定，
 *    尤其 Q1（是否同意采用 Inventory OS 的 S1-S9 标准）——这是
 *    唯一会导致治理文件需要重写的问题，其余三项即使答案不同
 *    也只需局部调整
 * 2. Q2（部署形态）确定后，补完 00_Config.gs / 00_Setup.gs
 * 3. 与 Inventory OS 协调 29_InventoryBridge.gs 的
 *    sendProcurementRequest() payload 补齐（Q3，属于 Inventory
 *    OS 一侧的变更，需要 Steven 决定是否本次一并处理）
 * 4. 确定 Telegram User Confirmation 的具体 UX（Q4）
 * 5. 以上确认后，才按"Repository Inspection → Governance
 *    Baseline → ADR → Decision Matrix → Domain Boundary →
 *    Contracts → Module Map → Persistence Design → Verification
 *    Plan → Implementation Plan"序列里最后一步，开始真正写
 *    60–69 的实现代码——本次任务到 Implementation Plan 为止，
 *    刻意不提前实现（对齐使用者原始任务指令第 19 条）
 */

/* ============================================================
 * 七、已知缺口 (KNOWN GAPS，非 BUG——尚无代码可言 BUG)
 * ============================================================
 *
 * - AWAITING_CONFIRMATION 状态没有超时/提醒机制设计（ADR-001
 *   Next Steps 已记录，非本次遗漏）
 * - CLOSED 状态的确切触发条件未细化（File_Map 65 节已标注为
 *   待落实细节，非架构性缺口）
 * - 部署形态未定（Q2）导致 00_Config.gs/00_Setup.gs 无法真正
 *   写出最终版本，本次只给出两种形态各自需要什么的分析
 * - 【自查中新发现，非原始任务指令逐项要求】
 *   69_ProcurementBridge.receiveFromInventory(payload) 没有设计
 *   幂等性保护。如果 Inventory 一侧因网络问题重试同一次
 *   sendProcurementRequest() 调用，目前的设计会产生两条重复的
 *   PROCUREMENT_REQUESTED 记录。Inventory OS 自己在 Telegram
 *   webhook 上遇到过同类问题并已修复（LOW10：updateId 参数 +
 *   CacheService 120 秒去重）。Procurement OS 的 Bridge 入站
 *   处理需要类似机制（例如要求上游提供 correlation_id 并做短期
 *   去重），本次设计遗漏，记录在此，实现阶段需要补上——这个
 *   发现是在做「六、Verification Gates」自查时才发现的，不是
 *   原始任务指令 Recovery Gate 条目就已经点名要检查的具体内容，
 *   刻意与任务指令本身要求的检查项分开记录。
 */

/* ============================================================
 * 八、VERIFICATION GATES（对应使用者原始任务指令 18/20-L）
 * ============================================================
 * 逐项 PASS / PARTIAL / BLOCKED，附一句实际依据，不空泛断言。
 *
 * Governance Gate
 *   Constitution exists                      PASS
 *   State exists                             PASS
 *   File Map exists                          PASS
 *   ADR index exists                         PASS
 *   No Inventory content leaked into
 *     Procurement governance                 PASS — 已用 grep
 *     核查全部新文件，两处命中均为"解释为何不复用/不依赖
 *     Inventory 专属概念"的上下文，非意外抄录（非空泛断言）
 *
 * Architecture Gate
 *   Domain boundaries defined                PASS — Constitution P1
 *   Inventory boundary defined                PASS — P2/P3，
 *     File_Map Bridge 关系图
 *   Finance boundary defined                  PASS — P8, DD7
 *   Identity boundary defined                 PASS — P2, 三、四
 *   AI boundary defined                       PASS — P4, ADR-001
 *   User Confirmation decision recorded       PASS — ADR-001
 *
 * Contract Gate
 *   ProcurementRequest contract defined       PASS — Constitution 5.1
 *   Source-neutrality verified                PASS — P7, DD1, DD5
 *   Inventory adapter boundary defined        PARTIAL — 契约本身
 *     已定义完整（5.2），但 Inventory 一侧真实 stub payload
 *     （itemId/identityId/itemName/urgency）比本契约窄，两边
 *     尚未真正对接（Q3，非本次范围）
 *   Event contract defined                    PASS — 5.3，8 种
 *     固定事件类型
 *
 * Persistence Gate
 *   Schemas defined                           PASS — Constitution 六
 *   Timestamps safe                           PASS（设计层面）—
 *     六、已把 setNumberFormat('@') 列为 00_Setup.gs 建表时的
 *     强制默认动作，非可选项；尚未写代码，故不是 Implementation
 *     Gate 意义上的"已验证"
 *   IDs safe                                  PASS（设计层面）—
 *     C13 要求复用 _reserveIdBlock()
 *   Concurrency strategy defined               PASS — C12, P6
 *
 * Recovery Gate
 *   Replay behavior defined                   PASS — 66 节
 *     replayEvents/rebuildProjection
 *   Idempotency strategy defined               BLOCKED — 见本节
 *     开头新发现的缺口，Bridge 入站尚无幂等设计
 *   Audit trail defined                       PASS — PROC_LEDGER,
 *     8 种事件类型
 *
 * Implementation Gate
 *   Any code exists / verified                 BLOCKED（刻意）—
 *     0 行实现代码，符合任务指令第 19 条"不要急着实现"的要求，
 *     不是遗漏
 *
 * 总结：两个 PARTIAL/BLOCKED 需要在真正进入实现阶段前解决——
 * Inventory 一侧 payload 补齐（Q3）与 Bridge 入站幂等设计（新
 * 发现，非 Q1-Q4 之一，建议列为 Q5）。其余全部 PASS。
 */
