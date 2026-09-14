/**
 * ============================================================
 * PROCUREMENT OS — 00_Project_State.gs
 * ============================================================
 * Last Updated : 2026-09-10
 * ============================================================
 */

/* ============================================================
 * 一、PHASE
 * ============================================================
 *
 * Phase: SLICE 1 — VERIFIED CORE, INTEGRATION PENDING（分类见
 *        00_Slice1_Closure_Ledger.js）。Slice 2 Entry：BLOCKED
 *        （00_Slice2_Entry_Gate.js，2026-09-13）。External
 *        Verification & Cross-OS Contract Closure（2026-09-14，
 *        见 Procurement_OS_External_Verification_and_CrossOS_
 *        Contract_Closure_Report.md）：TASKS schema 由 UNKNOWN
 *        修正为 E1 已验证；跨项目通信路径新增第二个候选（Sheet/
 *        EventBus 机制，证据来自三个独立来源）；TASK_ID 命名空间
 *        给出 Option C 建议（等待 Steven 批准，未实现）；Real GAS
 *        验证维持 EXTERNAL VERIFICATION REQUIRED，附 8 步人工
 *        验证清单。本轮未改动任何 runtime 代码。
 *        本文件「九、」「十、」两节保留作历史记录，其中的
 *        12/12、18/18 等数字是当时的真实快照，不因后续测试增加
 *        而回头改写。
 *
 * 不做的声明（对齐使用者原始指令 Implementation Gate 的要求，
 * 不能声称还不存在的东西存在）：
 *   - 60–69 之下没有任何一个 .gs/.js 文件真正被写出来
 *   - PROCUREMENT_REQUESTS / PROC_LEDGER 两张表没有被创建
 *   - 与 Inventory OS 之间没有任何真实的端到端集成被打通——
 *     Inventory 一侧的 sendProcurementRequest() 目前只是
 *     console.log 的 stub，本次任务没有修改它
 */

/* ============================================================
 * 二、已完成 (COMPLETED)
 * ============================================================
 *
 * - 确认 81_Procurement-main 仓库的文件放置错误，排除其作为
 *   本项目依据来源
 * - 检视 82_Inventory-main（V4.1）建立真实治理基线
 * - Repository Diagnosis（三、）、Identity Registry 归属澄清（四、）
 * - ADR-000（独立成 Domain OS + 採纳 S1-S9 谱系）
 * - ADR-001（User Confirmation，渠道无关 + 快照失效规则）
 * - ADR-002（Deployment & Persistence Boundary）
 * - ADR-003（Bridge Idempotency / Replay Safety）
 * - Domain Model / 60–69 模块地图（00_File_Map.gs），含
 *   idempotent intake 路径与 confirmation 快照比对逻辑
 * - Normalized ProcurementRequest Contract，含 5.4 User
 *   Confirmation Contract 与 5.5 Idempotency Contract
 * - Design Decisions DD1–DD8（五、）
 * - 【本轮，2026-09-09】Q1–Q5 全部关闭，见「五之二、」
 * - 【本轮】Architecture Freeze Check 走完使用者原始指令第 10 条
 *   的完整清单，见「八、」
 * - 【本轮】Implementation Sequence 与首个 vertical slice 建议，
 *   见「六、」
 */

/* ============================================================
 * 三、REPOSITORY DIAGNOSIS（历史记录，不因本轮关闭而改变）
 * ============================================================
 *
 * 81_Procurement-main（2026-06-29 快照）内容核对结果：
 *
 *   README.md                    → 仅一行标题，无实质内容
 *   00_Project_Constitution.txt  → 实为 Inventory OS V2.1
 *                                   Constitution（模块 21–26）
 *   00_Project_State.txt         → 实为 Inventory OS V2.1 State
 *   00_File_Map.txt              → 实为 Inventory OS V2.1 File_Map
 *   00_Identity_Registry.txt     → 真实代码，但已被
 *                                   00_Capability_Identity.gs 取代
 *
 * 结论：Procurement OS 在本次任务开始前没有任何真正描述它自己的
 * 治理文件或代码，只能重新起草。
 */

/* ============================================================
 * 四、IDENTITY REGISTRY 归属澄清（历史记录，不因本轮关闭而改变）
 * ============================================================
 *
 * 00_Identity_Registry.gs（V0.1，81_Procurement-main 内）已被
 * 00_Capability_Identity.gs（V4/V4.1，82_Inventory-main 内）取代：
 * 函数签名不同（resolve({canonicalName,...}) → resolve(rawName,
 * domain)），Schema 不同（category/unit 移除，新增 domain），
 * 且旧版审查发现的 LockService/并发问题在新版里已经修复。唯一
 * 尚未验证的是 created_at 的 setNumberFormat('@') 保护——这属于
 * Inventory OS 自己 Capability 层的问题，不属于本项目范围，本项目
 * 不擅自修改 Inventory OS 的文件（Shared Kernel 的治理归属仍在
 * Inventory OS 一侧，即使 Procurement OS 是它的调用方之一）。
 *
 * 结论：61_ProcurementNormalizer.gs 调用
 * CapabilityIdentity.resolve(rawName, 'Procurement')，不是已经
 * 过时的 IdentityRegistry.resolve()。
 */

/* ============================================================
 * 五、DESIGN DECISIONS (DD1–DD8)
 * ============================================================
 * 对应 Decision Matrix DM-02, DM-04~DM-10（DM-01→ADR-000；
 * DM-03→ADR-001）。内容与上一轮相同，本轮关闭 Q1-Q5 未改变这
 * 八条决定，故不重复展开，只列标题：
 *
 * DD1 (DM-02) 来源无关性——source_domain 自由字符串 + 按域分派
 * DD2 (DM-04) estimated_quantity 明确是估计值，不等同承诺数量
 * DD3 (DM-05) urgency 独立枚举，不复用 Inventory 的 RISK 枚举
 * DD4 (DM-06) required_before = 操作性目标，非硬 deadline
 * DD5 (DM-07) reason 自由文本、来源无关，不硬编码 "Inventory"
 * DD6 (DM-08) Supplier/Vendor 推迟，不预留占位（EP3）
 * DD7 (DM-09) Procurement 拥有采购事实，Finance 拥有财务真相
 * DD8 (DM-10) 执行=创建 Task 交人类处理，Bridge 设计为可扩展
 *             多种未来执行适配器
 */

/* ============================================================
 * 五之二、Q1–Q5 CLOSURE RECORD（本轮，2026-09-09）
 * ============================================================
 *
 * Q1 架构谱系      APPROVED — 採纳 Inventory OS S1-S9 + Capability
 *                  Layer 谱系；不新实现 Blueprint v1.2 树；不引入
 *                  第三条谱系。记录于 Constitution 八、G2, ADR-000
 * Q2 部署边界      APPROVED — Runtime 独立 GAS 项目；Persistence
 *                  暂时共享生态系统 Spreadsheet，严格表级归属。
 *                  记录于 Constitution 三、, ADR-002
 * Q3 Inventory 契约 OUT OF SCOPE — 不修改 Inventory OS；契约字段
 *                  按"今天真实可得"设计，缺失字段标 null，不编造；
 *                  补齐留给 Inventory OS 未来迭代。记录于
 *                  Constitution 五、5.1/5.2
 * Q4 Telegram UX   APPROVED — Core 渠道无关，Telegram 只是
 *                  Adapter；确认限定在具体快照，材质变化需重新
 *                  确认；新增 EXPIRED 状态。记录于 Constitution
 *                  五、5.4, P9, ADR-001
 * Q5 Bridge 幂等性 APPROVED（实现前必须落实）——idempotency_key
 *                  = source_domain+source_reference+urgency，
 *                  检查与写入同一临界区完成。记录于 Constitution
 *                  五、5.5, C15/P10, ADR-003
 *
 * 关闭过程中新增、仍待实现阶段落实的细节（非架构分歧，见
 * Constitution 九、D1-D3）：EXPIRED 超时时长、材质变化容忍度、
 * idempotency_key 命名若有真正的 UEF v1.12 原文需核对。
 */

/* ============================================================
 * 六、IMPLEMENTATION SEQUENCE（对应使用者原始任务指令第 11 条：
 *     不开始实现，但要给出顺序与首个 vertical slice 建议）
 * ============================================================
 *
 * 建议顺序，理由是"先证明核心机制正确，再接真实上游"：
 *
 * Slice 1（首个 vertical slice，建议最先做）
 *   范围：60→61→62→63→64→65→66→67 完整跑通一次，来源用手动/
 *   合成请求（例如一个测试函数直接构造一份符合 5.1 契约的
 *   NormalizedProcurementRequest），不依赖 Inventory OS 真实接线
 *   验证目标：
 *     - 65 的 intake 幂等检查真的能挡住"重复调用两次"（ADR-003）
 *     - 锁的加锁/重读/写入顺序在并发下不出错（P6/C12）
 *     - 64 的确认快照比对逻辑真的能在"确认后数量被改"时打回
 *       AWAITING_CONFIRMATION（P9）
 *     - EXPIRED 超时路径至少有一个可手动触发的测试入口
 *   不包含：真实 Telegram 收发（可以先用一个假的/测试用 Adapter
 *   模拟 CONFIRM/REJECT/EXPIRE 三种响应）、Insights、真实 Task
 *   创建（可以先 console.log 代替，验证调用发生但不依赖 TASKS
 *   表的真实 schema）
 *
 * Slice 2
 *   范围：69_ProcurementBridge.receiveFromInventory() 真正实现，
 *   并与 Inventory OS 协调把 29_InventoryBridge.gs 的
 *   sendProcurementRequest() stub 接上真实调用（这一步涉及
 *   Inventory OS 的代码变更，需要 Steven 决定是否此时处理，
 *   还是继续以 Q3 的"未来迭代"方式处理）；真实 Telegram
 *   Adapter；真实 TASKS 写入
 *
 * Slice 3
 *   范围：68_ProcurementInsights 的具体分析函数（V0.1 阶段只有
 *   接口，见 File_Map），待 Slice 1/2 产生真实数据后再设计具体
 *   指标，避免在没有数据的情况下猜测哪些分析有价值（EP3）
 *
 * 不建议的顺序：先做 Bridge/Inventory 接线（Slice 2 先于
 * Slice 1）——这会让"核心机制是否正确"这个问题和"跨仓库协调是否
 * 顺利"这个问题绑在一起调试，两个问题最好分开验证。
 */

/* ============================================================
 * 七、已知缺口 / 待实现阶段落实的细节
 * ============================================================
 *
 * 非架构分歧，均已有合理默认值，见 Constitution 九、D1-D3：
 * - EXPIRED 默认超时时长（建议按 urgency 分级，具体数字待实现
 *   阶段调整）
 * - P9"实质变化"的容忍度数字（例如 decided_quantity ±10%）
 * - idempotency_key 命名若有真正的 UEF v1.12 原文可核对，以那份
 *   为准
 *
 * 明确记录为"不属于本项目范围，属于 Inventory OS 未来迭代"：
 * - Inventory OS 自己 Capability 层 created_at 的 setNumberFormat
 *   保护缺口（四、）
 * - 29_InventoryBridge.gs 的 sendProcurementRequest() payload
 *   补齐 estimated_quantity/reason/required_before（Q3）
 */

/* ============================================================
 * 八、ARCHITECTURE FREEZE CHECK（对应使用者原始任务指令第 10 条
 *     的完整清单，逐项核对，不是重新发明一套新清单）
 * ============================================================
 *
 * Governance
 *   UEF version correct                PASS（v1.12，最佳可得证据，
 *     见 Constitution 八、G4——不假装能验证得比这更多）
 *   §0.6 status correct                PASS（採纳，窄范围，对齐
 *     Inventory OS 自己 DD7 的措辞）
 *   S1–S9 lineage correct              PASS（Q1，ADR-000 amendment）
 *   No accidental Blueprint V2/v1.2
 *     runtime claim                    PASS——本文件从未声称
 *     Procurement OS 实现了 Blueprint v1.2 的树状结构；"Domain
 *     Blueprint V2"（旧文件用语）明确记录为来源不明，不代入
 *     任何一条谱系（Constitution 八、G3）
 *   No Inventory governance copied     PASS——已用 grep 核查
 *     （上一轮已做，本轮未新增可疑内容）
 *
 * Domain Boundary
 *   Inventory owns inventory state     PASS — Constitution P1/P2
 *   Procurement owns procurement
 *     lifecycle                        PASS — Constitution P1
 *   Finance owns financial truth       PASS — P8, DD7
 *   Shared Kernel owns shared infra    PASS — 三、
 *   Telegram owns interface only       PASS（本轮新增判定）——
 *     P9/5.4/ADR-001 amendment 明确 Telegram Adapter 不判定
 *     CONFIRM/REJECT/EXPIRE，只负责传话
 *
 * Procurement（十层是否自洽）
 *   Request/Normalization/Planning/Decision/UserConfirmation/
 *   Execution/Events/Projection/Insights/Bridge
 *                                      PASS — File_Map 逐层
 *     purpose/API/forbidden/testing 齐全，依赖方向单向
 *     （60→...→69），无环依赖
 *
 * Safety
 *   AI recommendation ≠ authorization  PASS — P4（非协商）
 *   Confirmation is explicit           PASS — ADR-001, C14
 *   Confirmation is scoped             PASS（本轮新增）—— P9，
 *     confirmed_snapshot_json
 *   Material changes can invalidate
 *     confirmation where appropriate   PASS（本轮新增）—— P9，
 *     Execution 落地前比对快照
 *   External execution cannot bypass
 *     authorization                    PASS — P6/C12，65 两条
 *     路径都持锁重新校验
 *
 * Reliability
 *   Idempotency defined                PASS（本轮关闭）—— ADR-003
 *   Concurrency defined                PASS — C12, P6
 *   Replay behavior defined            PASS — 66_Events
 *   Recovery behavior defined          PASS——失败语义明确：任何
 *     执行在持锁写入完成前中断，请求都停留在写入前的状态，重试
 *     安全（这正是 intake 路径幂等检查 + confirmation 路径快照
 *     比对共同提供的保证），不需要额外的补偿事务设计
 *
 * Upstream Contract
 *   Current Inventory payload
 *     represented accurately           PASS — { itemId,
 *     identityId, itemName, urgency } 四字段，Constitution 五、
 *     5.2 如实记录，非本文件假设
 *   No Inventory code changes made     PASS——全程未修改
 *     82_Inventory-main 任何文件
 *   Missing fields are not fabricated  PASS — 5.1 四个字段
 *     标记可空，Normalizer 不编造默认值（P9/Q3）
 *
 * 结论：清单全部 PASS，Implementation Gate 维持 BLOCKED（刻意，
 * 见「一、」），这不影响 Architecture Freeze 判定——"Architecture
 * Freeze Ready"从定义上就不等于"Implementation Complete"，
 * Implementation Gate 本来就该在这个阶段维持未开始。
 */

/* ============================================================
 * 九、SLICE 1 IMPLEMENTATION RECORD（2026-09-10）
 * ============================================================
 * Implementation Gate 从「一、」的 BLOCKED 更新为：Slice 1 范围
 * 内 PASS，60–69/00_Config/00_Setup 已写出并跑通（68_Insights
 * 排除在外，符合计划）。以下是使用者原始任务指令第 18 条要求的
 * A-I 输出，事后一次性记录在此，而不是散落在对话里。
 *
 * A. Implementation Readiness（对实际 Inventory OS 代码的检视，
 *    不是凭空假设）
 * ------------------------------------------------------------
 * 可复用的真实基础设施：
 *   - LockService：waitLock(10000) + try/finally release，超时
 *     抛 new Error('系统繁忙，请稍后重试。')——直接沿用，未改动
 *     语气/数字
 *   - _reserveIdBlock(propKey, blockSize, bootstrapFn)：区块预留
 *     模式逐字复制（本地副本，理由见下）
 *   - _getSpreadsheet() 的 SPREADSHEET_ID 三元判断模式：逐字复制
 *   - _setupSheet()：sheet 不存在则建、header 不存在则写——逐字
 *     复制到 00_Setup.js
 *   - setupXxxOS() / smokeTestXxxOS() 命名与"console.log 叙事式
 *     手动核对"风格：完整沿用
 *
 * 【修正】UCR3 提到的 AlertService.log(...) 模式：实际检视
 * 82_Inventory-main 全仓库，AlertService 完全不存在，一次调用都
 * 没有。Inventory OS 真实的错误处理是 console.error() 记录 +
 * throw new Error(userFacingMessage) 往上抛——这是 UEF 文档里的
 * 惯例（谱系 A）与 Inventory OS 实际代码（谱系 B）不一致的又一个
 * 例子，与 Constitution 八、G1 的整体发现同一类型。Slice 1 的
 * 实现代码遵循的是"实际跑的那份"（console.error+throw），不是
 * 文档里的 AlertService——这是 Empirical > Documented 的直接
 * 应用，不是随便选的。
 *
 * 【新发现】handleInventoryCommand() 是裸的全局函数（不在 IIFE
 * 内），00_Setup.txt 明确写"Call this from any entry point
 * (Telegram webhook, menu, test)"。这强烈暗示 Personal AI Core /
 * JARVIS 把 Inventory OS 当 Apps Script Library 引入，直接跨
 * 项目调用这个全局函数，而不是自己另开一个 Web App 收 webhook。
 * Slice 1 的 handleProcurementCommand() 照抄这个形状（裸全局
 * 函数、同样的"任意入口都能调用"定位）。这是一个假设，不是已经
 * 对照 JARVIS 自己的代码验证过的事实——本仓库范围内没有 JARVIS
 * 的源码可查，明确列为 B 类假设。
 *
 * source_reference 唯一性核查（使用者任务指令第 5 条明确要求，
 * 结果不是 BLOCKED）：itemId 由 Inventory 自己的
 * 25_InventoryExecution.gs _generateItemId() 在物品首次创建时
 * 一次性分配（INV-<区块预留号>），此后终身不变——是稳定、唯一的
 * 物品级主键。真正的局限不在"itemId 够不够唯一"，而在"同一
 * itemId 会在物品生命周期内合法地重复触发多次信号"（去重范围
 * 只能是"同一 identity+urgency 的非终态请求"，ADR-003 已经如实
 * 记录）。核查结论：不 BLOCK，按 ADR-003 原设计继续。
 *
 * B. 依赖 / 阻塞 / 假设
 * ------------------------------------------------------------
 * 阻塞：无。
 * 依赖：真实 ecosystemSpreadsheetId 的值（00_Config.js 留空，
 *   需要 Steven 提供）；CapabilityIdentity 作为 GAS Library 加入
 *   Procurement OS 项目（部署步骤，不是代码问题）。
 * 假设：JARVIS 用 Library 机制调用 handleInventoryCommand 这件事
 *   （见 A、"新发现"）未独立验证。
 *
 * C. Slice 1 Module Scope（实际写出的文件）
 * ------------------------------------------------------------
 * 00_Config.js, 00_Setup.js, 60_ProcurementRequest.js,
 * 61_ProcurementNormalizer.js, 62_ProcurementPlanner.js,
 * 63_ProcurementDecision.js, 64_ProcurementUserConfirmation.js
 * （含 TelegramConfirmationAdapter 子组件）,
 * 65_ProcurementExecution.js, 66_ProcurementEvents.js,
 * 67_ProcurementProjection.js, 69_ProcurementBridge.js（含全局
 * handleProcurementCommand）。不含 68_ProcurementInsights（按
 * 计划排除）。
 *
 * D. Slice 1 State Flow（实际实现的状态机）
 * ------------------------------------------------------------
 * REQUESTED →（同一临界区内）PLANNED →
 *   { AWAITING_CONFIRMATION | CLOSED（未推荐时）} →
 *   AWAITING_CONFIRMATION → { EXECUTED | REJECTED | EXPIRED |
 *   （快照不匹配时打回 AWAITING_CONFIRMATION） } → CANCELLED
 *   可从任何非终态发生。CLOSED 的"人工完结"细粒度触发（真正
 *   履约追踪）不在 Slice 1 范围。
 *
 * E. Slice 1 Persistence Schema（实际建表结果，Constitution 六、
 *    的具体落地，setNumberFormat('@') 已在 00_Setup.js 建表时
 *    对全部时间戳列强制套用，不是事后补）
 * ------------------------------------------------------------
 * PROCUREMENT_REQUESTS：21 列，見 00_Config.js PROC_CONFIG.R
 * PROC_LEDGER：7 列，見 00_Config.js PROC_CONFIG.L
 *
 * F. Test Matrix — 真实执行结果（implementation/test-harness.js，
 *    Node vm 伪造 SpreadsheetApp/LockService/PropertiesService/
 *    Utilities 后直接跑真代码，不是断言）
 * ------------------------------------------------------------
 *  1. Normal path                          PASS
 *  2. Duplicate intake                     PASS
 *  3. Concurrent-shaped duplicate intake    PASS*
 *  4. Unconfirmed execution                PASS
 *  5. Expired confirmation                 PASS
 *  6. Snapshot mismatch                    PASS
 *  7. Duplicate confirmation               PASS
 *  8. Direct execution bypass              PASS**
 *  9. Missing optional fields              PASS
 * 10. AI recommendation ≠ authorization    PASS
 * 11. Replay request                       PASS
 * 12. Replay confirmation/execution        PASS（=#7 同机制）
 *
 * 12/12 PASS。
 * * = 证明"检查在锁内"这个逻辑无竞态，不能证明真实 GAS 并发下
 *     LockService 的行为——Node 单线程，这一条仍需要在真实 GAS
 *     环境手动验证（NOT YET VERIFIED IN REAL GAS，如实标注，
 *     不算进已验证范围）。
 * ** = 证明的是"正常流程不会绕过"，不是"平台层面不可能绕过"——
 *      GAS/JS 同一项目内的函数天生全局可调用，没有真正的跨文件
 *      私有性，Inventory OS 自己的 C12 也是同样的"约定而非强制"
 *      局限，如实记录见 H。
 *
 * 过程中发现并修复的真 bug（自查发现，不是任务指令逐项要求的
 * 检查项，按 Steven 的"过程中发现的问题要和审计本身报告的问题
 * 分开列"原则单独列出）：
 *  - updateProjection() 无条件用 _procNow() 覆盖 updated_at，
 *    导致任何显式设置该字段的调用都被静默忽略——修复为"调用方
 *    显式设置时不覆盖"
 *  - Planner 的同域聚合查询在 Execution 已经创建当前请求自己的
 *    行之后才执行，导致把自己误判成"已存在的 sibling"——修复为
 *    Planner 在建行之前执行
 *  - smokeTestProcurementOS() 自己重复调用了一次
 *    executeConfirmed()（handleProcurementCommand 内部已经调用
 *    过一次），产生一次被正确拒绝但叙事上误导的"EXECUTE"日志——
 *    修复为不再重复调用
 * 三个都已修复并重新跑过全部 12 项验证确认修复有效，不是"修了
 * 但没验证"。
 *
 * G. Upstream Follow-ups（明确排除在本项目范围外）
 * ------------------------------------------------------------
 * - UPSTREAM FOLLOW-UP — INVENTORY OS：sendProcurementRequest()
 *   payload 补齐 estimated_quantity/reason/required_before（Q3）
 * - UPSTREAM FOLLOW-UP — INVENTORY OS：Capability_Identity 的
 *   created_at 缺少 setNumberFormat('@') 保护（上一轮发现，
 *   仍未验证是否已在 Inventory OS 自己的后续迭代中处理）
 * - UPSTREAM FOLLOW-UP — INVENTORY OS：若未来提供真正的事件级
 *   correlation ID，ADR-003 的去重精度应直接升级（已在 ADR-003
 *   Review Trigger 记录）
 *
 * H. Risk Register
 * ------------------------------------------------------------
 * H1【中高】跨项目锁语义：Procurement OS 与 Inventory OS 是各自
 *    独立的 GAS 项目（ADR-002），若两者都需要真正*写*
 *    IDENTITY_REGISTRY（今天 Slice 1 只读，靠 get()，不触发），
 *    双方各自的 LockService.getScriptLock() 互不认识对方——
 *    脚本锁的作用域是"调用脚本"，不是"目标 Spreadsheet"。真正
 *    需要跨项目互斥时应改用 LockService.getDocumentLock()（绑定
 *    Spreadsheet 本身），但这只有在 Inventory OS 那一侧也同步
 *    换掉才完整生效——单改 Procurement 这一侧只能算部分缓解。
 *    本仓库范围内不修改 Inventory OS（硬边界），列为风险而非
 *    本次任务能直接消解的问题。
 * H2【已知，V0.x 治理接受】GOVERNED V0.x IDEMPOTENCY LIMITATION——
 *    见 ADR-003，idempotency_key 去重范围是"同一 identity+urgency
 *    的非终态请求"，不是真正的传递级事件身份。
 * H3【中】confirmation 超时判定目前借用 updated_at 字段（见上面
 *    "过程中发现并修复的 bug"之一），任何未来在 AWAITING_
 *    CONFIRMATION 期间发生的、与超时无关的写入都会连带刷新这个
 *    字段、意外顺延超时窗口。Slice 1 范围内没有这样的写入路径，
 *    所以现在不会触发，但这是一个真实的 schema 局限，不是已经
 *    彻底解决——建议下一轮加一个专门的
 *    awaiting_confirmation_since 列，而不是继续借用 updated_at。
 * H4【低】共享 Spreadsheet 并发（ADR-002 已知的负面影响）：
 *    Procurement 与 Inventory 物理上共用一份文件，配额/可用性
 *    风险是共同的，ADR-002 Review Trigger 已经覆盖，这里不重复
 *    展开。
 * H5【低】Telegram 实际收发未接通（TelegramConfirmationAdapter
 *    目前只 console.log），真实发送依赖的 bot token/传输方式
 *    留给部署阶段，不是架构问题。
 *
 * I. Implementation Authorization
 * ------------------------------------------------------------
 * READY TO IMPLEMENT SLICE 1 — 已完成（不是"评估后判定可以做"，
 * 是"做完并且 12/12 测试通过"）。下一步不是继续实现 Slice 2/3，
 * 而是等 H1/H3 两项风险和 G 节三个 Upstream Follow-up 有真实
 * 进展后再决定 Slice 2 的启动时机——Slice 2 涉及跨仓库协调
 * （Q3 的后续），不是 Procurement OS 一侧能单方面推进的。
 */

/* ============================================================
 * 十、SLICE 1 CLOSEOUT & PRODUCTION READINESS（2026-09-11）
 * ============================================================
 * 说明：这一轮的任务指令在第 8 条中途被截断（"Confirm the
 * previously fixed bug remains fixed: The current Procuremen"）。
 * 第 8 条按第 7 条同样的句式（"确认此前修复的 bug 仍然修复着，
 * 补齐回归测试"）补完，针对的显然是 Planner 那个 bug；如果原文
 * 截断处后面还有第 9 条及以后的内容，本节没有看到，只完成了
 * 第 1–8 条明确要求的部分。
 *
 * A. 状态重新分类（分开陈述，不合并成一个笼统结论）
 * ------------------------------------------------------------
 *   IMPLEMENTED                        YES
 *   VERIFIED IN SIMULATED GAS ENV      YES — 18/18（test-harness.js，
 *                                      Node vm 伪造 GAS 全局）
 *   REAL GAS VERIFIED                  NO — 从未在真实 Apps Script
 *                                      执行过一次
 *   INTEGRATION VERIFIED               NO — Inventory 一侧
 *                                      sendProcurementRequest()
 *                                      仍是 stub，从未真正调用过
 *                                      Procurement；Telegram/TASKS
 *                                      均未真实接通
 *   PRODUCTION READY                   NO
 * 这五条是五个独立事实，不是同一件事的不同说法——"已实现"不
 * 蕴含"生产就绪"，本节刻意不压缩它们。
 *
 * B. EVIDENCE MATRIX
 * ------------------------------------------------------------
 * Gate | Requirement | Evidence | Status
 *
 * G1 单元/Harness | 覆盖 Slice1 全部代码路径 | test-harness.js，
 *   18/18，`node test-harness.js` 实际跑出 | PASS（模拟环境）
 *
 * G2 真实 Spreadsheet 持久化 | 真实 Google Sheets 读写 | 无——
 *   harness 用内存假 Sheet，从未碰过真实 Spreadsheet | NOT VERIFIED
 *
 * G3 真实 GAS Runtime | 代码在真实 Apps Script 执行环境跑过 |
 *   无 | NOT VERIFIED
 *
 * G4 Inventory→Procurement 集成 | Inventory 真实调用 Procurement
 *   成功 | 无——Inventory 的 sendProcurementRequest() 仍是
 *   console.log stub，本项目未改动它（硬边界） | NOT VERIFIED（
 *   结构性无法在不碰 Inventory OS 或不进入 Slice 2 部署的情况下
 *   验证）
 *
 * G5 Telegram | 真实 Telegram 消息收发、真实用户经真实 bot 确认 |
 *   TelegramConfirmationAdapter.send() 只 console.log，无 bot
 *   token | NOT VERIFIED
 *
 * G6 同项目并发 | Procurement 自己项目内两个真正同时的执行经
 *   LockService 正确串行 | harness 把"并发"模拟成两次连续同步
 *   调用（Node 单线程）——只证明"锁内检查"逻辑无竞态，不构成
 *   对真实 GAS LockService 排队/超时行为的验证，按指令要求不
 *   从顺序 Node 测试推断这一条 | NOT VERIFIED IN REAL GAS（
 *   逻辑层已验证，运行时层未验证——两者分开说）
 *
 * G7 跨项目并发 | Procurement 与 Inventory 各自独立锁作用域在
 *   共享资源上不产生竞态 | 无实测证据；H1 的判断是基于 GAS 文档
 *   行为的推理，不是对两个真实部署项目的实测 | NOT VERIFIED（
 *   按指令明确要求：没有实证就明确标未验证）
 *
 * G8 Replay | 重复 request/confirmation/execution 不产生重复
 *   mutation | test #2/#7/#11/#12/#17，全部 PASS | PASS（模拟环境）
 *
 * G9 Recovery | 执行中途失败（模拟或真实）后状态不损坏 | 无直接
 *   测试——目前没有模拟"executeIntake 在 createRow 之后、
 *   REQUESTED 事件记录之前崩溃"这类场景。GAS 脚本锁会在脚本执行
 *   结束时释放（含异常终止），所以不会有锁永久卡死的风险，但
 *   "卡在 REQUESTED 状态、后续再也没有进展"的孤儿记录目前没有
 *   任何检测/恢复机制 | NOT VERIFIED / 已知真实缺口（不是"未测试
 *   但应该没问题"，是"确实没有恢复机制"）
 *
 * G10 日志/错误处理 | 失败路径符合当前（已核实的）Inventory/
 *   Procurement 运行时惯例 | 65 层 lock 超时抛出与 Inventory 完全
 *   相同的用户可读消息；handleProcurementCommand 用 try/catch +
 *   console.error + 安全兜底消息；test #18 实际跑了三种畸形输入
 *   确认都不抛出、都返回安全字符串 | PASS（含真实执行验证，
 *   不只是读代码）
 *
 * C. H1 — 跨项目锁限制，重新表述
 * ------------------------------------------------------------
 * 对 Slice 1 真实的 mutation 边界（PROCUREMENT_REQUESTS /
 * PROC_LEDGER，只有 Procurement 自己的脚本会写）而言：当前的
 * Procurement 侧 LockService.getScriptLock() 是充分的——没有
 * 任何其他项目会写这两张表，跨项目锁语义在这个边界内根本不
 * 适用，不是"凑合够用"，是"这个边界内问题不存在"。
 *
 * 唯一会真正触发跨项目锁问题的路径，是 Normalizer 的 identity
 * 兜底分支在 CapabilityIdentity 不可用时才会走的 fallback（生产
 * 环境不应该发生），或者未来 Manual 请求触发
 * CapabilityIdentity.resolve() 真正创建一个新身份时——这条路径
 * 依赖 Inventory OS 那份代码内部的锁语义，且 Procurement 是
 * 通过 Library 机制调用它，Library 调用下 LockService.
 * getScriptLock() 的作用域到底算调用方还是发布方，本仓库没有
 * 独立验证过。这条明确标记：
 *
 *   NOT GUARANTEED
 *
 * 不虚报为"已解决"。修复需要 Inventory OS 那侧也换成
 * LockService.getDocumentLock()（绑定 Spreadsheet 本身），单改
 * Procurement 这一侧做不到，而且不修改 Inventory OS 是硬边界
 * ——所以这条在本次 closeout 里只能维持"已知、未解决、有明确
 * 触发条件"的状态。
 *
 * D. H3 — Confirmation 超时字段，正式记录为技术债
 * ------------------------------------------------------------
 *   TECHNICAL DEBT — DEDICATED CONFIRMATION EXPIRY FIELD
 *
 * 现状：借用 updated_at 做超时判定基准（见「过程中发现并修复的
 * bug」——updateProjection 现在会尊重显式设置，所以借用本身
 * 至少是可控的，但语义上仍然脆弱）。评估的未来专用字段：
 *   confirmation_expires_at（ISO 字符串，Execution 在写入
 *   AWAITING_CONFIRMATION 时一次性计算好，不依赖之后任何
 *   updated_at 的变化）
 * 不在本次 closeout 实现——Slice 1 范围内没有任何写入路径会在
 * AWAITING_CONFIRMATION 期间意外触碰 updated_at（已用 test #13
 * 验证auto-bump 行为本身正确），所以现在不存在"现有正确性故障"，
 * 按指令不因为"没有发生的问题"而抢先实现新字段。
 *
 * E. Command Entrypoint 分类
 * ------------------------------------------------------------
 *   INTEGRATION CONTRACT — UNVERIFIED
 *
 * handleProcurementCommand() 的形状（裸全局函数）刻意模仿
 * handleInventoryCommand()，但"另一个系统（假定是 JARVIS）会
 * 把 Procurement OS 当 Library 引入、经这个函数调用"这个假设，
 * 从未独立对照 JARVIS 自己的源码验证过——本仓库范围内也拿不到
 * JARVIS 的源码。不因为"形状像"就当作已验证。
 *
 * 要关闭这个问题需要以下任一实证，不是继续读 Inventory OS 的
 * 代码能解决的：
 *   (a) 拿到 JARVIS/Personal AI Core 的真实源码，确认它是否
 *       真的用 Library 机制调用 handleInventoryCommand，以及
 *       调用方式的确切签名
 *   (b) 真实部署：把 Procurement OS 作为 Library 加进一个测试
 *       用的 JARVIS 实例，实际跑通一次 /confirm 指令的完整往返
 * 在 (a) 或 (b) 任一发生之前，这个假设维持 UNVERIFIED，
 * handleProcurementCommand 的签名暂不因为"猜另一种形状可能更
 * 保险"而改动——形状本身没有证据说是错的，错的可能性只在于
 * "调用方式的假设"，不是函数签名本身。
 *
 * F. 幂等性语义边界复核（Case A–D）
 * ------------------------------------------------------------
 * Case A（同 source+reference+urgency）→ 判重成立，test #2/#11/
 *   #15 验证。
 * Case B（同 identity+urgency，但确实是两个不同的采购意图，如
 *   Inventory 已开一笔、用户又手动开一笔同一物品的请求）→
 *   idempotency_key 正确地不判重（两者 source_domain/reference
 *   不同）；但 CLOSEOUT 测试（#14）发现 Planner 原本的
 *   "hasOpenSibling" 提示因为按 source_domain 过滤，看不见对方
 *   ——这是本轮发现并已修复的真实缺口（见「过程中发现并修复的
 *   bug」新增第 4 条），不是 idempotency_key 本身的问题，两者
 *   分开处理，没有因此改动 key 的定义。
 * Case C（同 reference，不同 urgency）→ 确认是刻意的设计：
 *   分别产生独立 request_id（各自完整走一遍生命周期，保留
 *   urgency 演变的审计轨迹），但 Planner 的 hasOpenSibling 会
 *   正确互相标记为相关（test #16 验证）。改进候选（本轮不实现，
 *   EP3）：目前只是"标记相关"，没有做到"主动合并/让新请求
 *   supersede 旧请求"——如果未来这种场景变得常见，值得单独设计
 *   一个 supersede 机制，而不是现在猜一个。
 * Case D（终态后 replay）→ 需要先澄清一个精确点：EXECUTED 不在
 *   TERMINAL_STATUSES 列表里（Constitution 六、只列
 *   CLOSED/CANCELLED/REJECTED/EXPIRED 为终态），所以 EXECUTED
 *   之后、CLOSED 之前的 replay 仍然会被判重（test #17 验证并
 *   如实记录了这个发现，而不是假设"EXECUTED 就该被当终态"）。
 *   这是符合当前定义的正确行为，不是 bug——CLOSED 才是生命周期
 *   真正的终点。真正到达 CLOSED 之后的 replay，会被正确当作
 *   新请求处理。
 * 结论：四个 case 都过了一遍真实执行验证，idempotency_key 的
 * 定义本身没有发现需要修改的证据，维持不变。
 *
 * G. 两个此前修复的 bug——回归覆盖确认
 * ------------------------------------------------------------
 * updateProjection() 的 updated_at 覆盖问题：test #13 直接、
 *   独立验证（不再只是通过 checkExpiry 间接验证），确认修复
 *   仍然成立，且 auto-bump 正常路径没有被这次修复破坏。
 * Planner 自我检测为 sibling 的问题：test #14 直接验证自我
 *   排除仍然成立，并在验证过程中发现、修复了本节 F 提到的
 *   跨 source_domain 检测缺口（同一轮内追加的第 3 个真 bug，
 *   与前两个分开列出，不混在一起）。
 *
 * H. 本轮新发现并修复的 bug（第 3 个，与上一轮的 2 个分开列）
 * ------------------------------------------------------------
 * 62_ProcurementPlanner.plan() 原本按 source_domain 过滤 sibling
 * 查询，导致跨来源域的同一物品请求互相看不见——已修复为不再按
 * source_domain 过滤（不影响 idempotency_key，那是不同层机制），
 * File_Map 62 节说明已同步更新，test #14 重写后验证修复有效。
 *
 * 全部 18 项测试（12 项原有 + 6 项本轮新增）在本次修复后重新
 * 跑过，18/18 PASS。
 */
