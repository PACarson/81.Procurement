/**
 * ============================================================
 * PROCUREMENT OS — 00_Slice1_Closure_Ledger.gs
 * ============================================================
 * Last Updated : 2026-09-12
 * Nature       : Governance / Verification / Closure record.
 *                NOT a design document — every claim below points
 *                to a specific test, file, or explicit absence of
 *                evidence. Where evidence does not exist, this file
 *                says NOT VERIFIED, not PASS.
 *
 * Independent re-verification performed before writing this file
 * (not assumed from the prior round's summary):
 *   - Re-ran `node test-harness.js` from the working directory.
 *   - Re-ran it again from a fresh unzip of the actually-delivered
 *     procurement_os_slice1_implementation.zip.
 *   - `diff -rq` between the working directory and that unzip:
 *     no differences — the code that was tested is the code that
 *     was shipped.
 *   - Re-read Constitution §九 to confirm Q1–Q5 are still recorded
 *     as closed with pointers to specific sections/ADRs, not just
 *     a label.
 *   - Searched all implementation files for any orphan/stale-request
 *     recovery code: none exists (confirms G9 gap is real, not
 *     stale documentation).
 *   - Found one genuine gap during this review (not previously
 *     flagged): no test had ever explicitly asserted the NEGATIVE
 *     case for the Planner self-sibling fix (hasOpenSibling=false on
 *     a genuinely first-ever request) — every existing test only
 *     asserted the positive case. Added test #19 to close this
 *     (Test evidence work — allowed this round; no runtime code
 *     changed). Full suite is now 19/19, re-run and confirmed.
 * ============================================================
 */

/* ============================================================
 * 7.1 CLOSURE SUMMARY
 * ============================================================
 *
 * Slice 1 Implementation:        PASS
 * Simulated GAS Verification:    PASS
 * Real GAS Verification:         NOT VERIFIED
 * Integration Verification:      NOT VERIFIED
 * Production Readiness:          NOT VERIFIED
 *
 * FINAL CLASSIFICATION:
 *
 *   SLICE 1 — VERIFIED CORE, INTEGRATION PENDING
 *
 * 这句话是根据下面的证据得出的，不是套用指令里给的示例——如果
 * 下面任何一节的证据指向别的结论，以那个为准，本节会先改。核对
 * 结果：证据确实支持这句话（核心逻辑在模拟环境里全绿，真实
 * 环境/跨项目集成完全没有证据，两者必须分开说），所以维持它。
 */

/* ============================================================
 * A. GOVERNANCE — Q1–Q5
 * ============================================================
 * 逐条核对 repository 当前 evidence（不是复述上一轮结论）：
 *
 * Q1  架构谱系        CLOSED — Constitution 八、G2 + ADR-000，
 *                     明确记录 UEF v1.12→§0.6→S1-S9→
 *                     {Inventory OS, Procurement OS}
 * Q2  部署/持久化边界  CLOSED — Constitution 三、+ ADR-002，
 *                     Runtime 独立、Persistence 暂时共享+严格
 *                     表级归属
 * Q3  Inventory 边界   CLOSED — Constitution 五、5.1/5.2，
 *                     四个字段可空、不编造，范围外不改 Inventory
 * Q4  Confirmation 架构 CLOSED — Constitution 五、5.4 + P9 +
 *                     ADR-001，渠道无关、快照绑定、材质变化
 *                     使确认失效、EXPIRED 为正式状态
 * Q5  Bridge 幂等性    CLOSED — Constitution 五、5.5 + C15/P10 +
 *                     ADR-003，明确标注 governed limitation
 *
 * 五项均 CLOSED，且各自指向具体章节/ADR，不是空标签。本轮未发现
 * 需要重新打开 Q1 架构谱系的 correctness contradiction——按第 2
 * 节要求，不重新讨论。
 */

/* ============================================================
 * B. CORE LIFECYCLE
 * ============================================================
 * 十个组件逐一核对 state transition / invalid transition
 * rejection / confirmation boundary / execution safety / event
 * generation / projection update / bridge behavior：
 *
 * Request (60)       state transition: N/A（零逻辑传递层，本身
 *                     不持有状态）| 证据：60_ProcurementRequest.js
 *                     只做参数校验+转发，test #1 等间接覆盖
 * Normalizer (61)     invalid rejection: 缺字段/未知 urgency/
 *                     未知 source_domain 均 throw | 证据：
 *                     61_ProcurementNormalizer.js _validateUrgency
 *                     /_mapFromInventory 的显式 throw，未见专门
 *                     测试畸形 urgency 输入本身——记录为覆盖缺口
 *                     （不是"未测试=有问题"，是如实标注还没测到
 *                     这一支）
 * Planner (62)        state transition: N/A（纯函数）|
 *                     confirmation boundary: N/A（不涉及）|
 *                     证据：test #14/#16/#19（自我排除+跨源检测+
 *                     首次请求无假阳性）
 * Decision (63)       state transition: N/A（纯函数）| 证据：
 *                     test #4（NORMAL→不推荐→CLOSED）、
 *                     test #1/#6 等（CRITICAL/HIGH→推荐）
 * Confirmation (64)   confirmation boundary: CONFIRM/REJECT/
 *                     EXPIRE 三态，且只能由真实调用触发（无自动
 *                     产出 CONFIRM 的代码路径）| 证据：
 *                     64_ProcurementUserConfirmation.js 本身 +
 *                     test #5（EXPIRED）+ test #18（畸形指令不
 *                     误判为确认）
 * Authorization        （非独立模块，是 65 内的判定逻辑）
 *                     invalid rejection: 未确认/已过期/快照不
 *                     匹配均 reject | 证据：test #4/#5/#6/#7
 * Execution (65)      execution safety: 唯一持锁、唯一写入，
 *                     intake 与 confirmation 两条路径均加锁 |
 *                     证据：test #3（并发形状）、test #7（重复
 *                     确认幂等）、test #13（时间戳修复回归）
 * Events (66)         event generation: 9 种固定类型，每次状态
 *                     迁移都有对应事件 | 证据：test #1 的完整
 *                     事件序列断言
 * Projection (67)     projection update: 状态/字段更新后可查询
 *                     一致 | 证据：test #9（可空字段）、
 *                     test #13（updated_at 行为）
 * Bridge (69)         bridge behavior: 入站路由到 Request、出站
 *                     Task 创建为显式 stub（不是静默空实现）|
 *                     证据：69_ProcurementBridge.js
 *                     createOrUpdateTask 的注释+console.log
 *
 * 结论：happy path 与已识别的边界情形都有对应测试；Normalizer
 * 对畸形 urgency/未知 source_domain 输入的直接测试是本轮发现的
 * 覆盖缺口，记录但本轮不补（不属于三个已知 bug 的回归范围，且
 * 不是本轮 closure 的强制要求——如实列出，不隐瞒）。
 */

/* ============================================================
 * C. REGRESSION — 三个 bug
 * ============================================================
 *
 * Bug 1 — Projection timestamp overwrite
 *   确认：updateProjection() 不再无条件覆盖 caller-provided
 *   updated_at。
 *   独立回归测试：test #13（直接测试，不经由 checkExpiry 间接
 *   验证）。
 *   状态：CLOSED。
 *
 * Bug 2 — Planner self-sibling
 *   确认：当前 request 创建后进行 sibling planning 时，不会把
 *   自己算作 sibling。
 *   独立回归测试：test #19（本轮新增，之前只有"检测到真实
 *   sibling"的正向测试，从未直接断言"首次请求 hasOpenSibling
 *   必须是 false"这个反向情形——这是本轮审查时才发现的覆盖
 *   缺口，已经补上并验证）。
 *   状态：CLOSED。
 *
 * Bug 3 — Cross-source sibling visibility
 *   确认：Planner 不再因为 source_domain 不同而让相同 underlying
 *   procurement scope 彼此不可见。
 *   独立回归测试：test #14。
 *   确认未改变 idempotency semantics：idempotency_key 的定义
 *   （source_domain+source_reference+urgency）未被这次修复触碰，
 *   62_ProcurementPlanner.js 的改动只影响 hasOpenSibling 的查询
 *   范围，不影响 65_ProcurementExecution.js 的幂等检查逻辑——
 *   两个文件是分开的，改动范围可以逐行核对。
 *   状态：CLOSED。
 *
 * 三个 bug 均 CLOSED，且都有独立、直接的回归测试（Bug 2 的
 * 独立测试是本轮才补上的，如实说明这一点，不假装它从一开始
 * 就存在）。
 */

/* ============================================================
 * D. IDEMPOTENCY — Case A–D 复核
 * ============================================================
 *
 * Case A（duplicate request）
 *   确认：判重成立。证据：test #2、#11、#15。
 *
 * Case B（Inventory request + Manual request for same underlying
 * item）
 *   确认：(1) idempotency 不错误合并不同 source —— test #14 中
 *   两笔请求的 source_domain 不同，各自独立的 idempotency_key，
 *   未被判重（两个 request_id 均存在）；(2) planner sibling
 *   detection 跨 source —— test #14 同时证明 hasOpenSibling=true；
 *   (3) 两个机制保持 separation —— 上面两点分别由
 *   65_ProcurementExecution.js（idempotency）与
 *   62_ProcurementPlanner.js（sibling）两个不同文件实现，未合并
 *   成一套逻辑，可各自独立核对代码。
 *
 * Case C（不同 urgency）
 *   确认当前设计：different urgency → separate request，属于
 *   刻意设计，本轮未擅自合并。证据：test #16。
 *
 * Case D（replay after execution）
 *   确认当前 terminal 定义：CLOSED = terminal，EXECUTED ≠
 *   terminal（Constitution 六、TERMINAL_STATUSES 只列
 *   CLOSED/CANCELLED/REJECTED/EXPIRED）。test #17 显示 replay 在
 *   EXECUTED→CLOSED 这段窗口内会被拒绝（判重），按第 8 节指令
 *   要求，这记录为 expected behavior，不是 bug。
 *
 * 四个 case 均已核对，idempotency_key 定义本身没有发现需要修改
 * 的证据，维持不变。
 */

/* ============================================================
 * 9. TEST EVIDENCE
 * ============================================================
 * Exact command : node test-harness.js
 *                 （在 implementation/ 目录下运行；或先
 *                 unzip procurement_os_slice1_implementation.zip
 *                 后在解压目录下运行——两者本轮已交叉验证一致）
 * Test count    : 19
 * Pass count    : 19
 * Fail count    : 0
 * Output/evidence location : implementation/test-harness.js
 *                 （测试代码本身）；本文件「Independent
 *                 re-verification」段落记录了本轮重跑的事实
 *
 * 分类：
 *   Core lifecycle (#1)                     1
 *   Idempotency/replay mechanics (#2,#3,#11,#12,#15,#17) 6
 *   Authorization/safety gates (#4,#5,#6,#7,#8,#10)      6
 *   Contract nullability (#9)               1
 *   Regression, dedicated (#13,#14,#19)      3
 *   Idempotency semantic boundary (#16)      1
 *   Error handling (#18)                    1
 *   合计                                    19
 *
 * 结果与上一轮相比发生了变化：18/18 → 19/19（新增 #19，见本文件
 * 顶部「Independent re-verification」说明；不是分类口径变了，
 * 是真的新增了一个此前缺失的回归测试）。按指令要求如实记录变化，
 * 不是"仍然是 18/18"就直接抄。
 */

/* ============================================================
 * 10. SIMULATED GAS vs REAL GAS — 严格分离声明
 * ============================================================
 * implementation/test-harness.js 使用 Node 的 vm 模块，手工伪造
 * SpreadsheetApp / LockService / PropertiesService / Utilities 等
 * 全局对象（内存数组代替真实 Sheet，锁永远"立即成功"代替真实
 * GAS 的排队/超时行为）。这是 GAS simulation / fake environment，
 * 不是真实 Apps Script 执行环境。
 *
 * 19/19 PASS 只能支持：
 *   VERIFIED IN SIMULATED GAS ENV = PASS
 * 不能支持、也不在本文件任何地方被用来支持：
 *   REAL GAS VERIFIED = PASS
 * 除非未来真的有 real deployed GAS evidence（例如在真实 Apps
 * Script 项目里跑过 setupProcurementOS()/smokeTestProcurementOS()
 * 并观察真实 Spreadsheet 的结果）。
 */

/* ============================================================
 * 11. EVIDENCE MATRIX（G1–G10，本轮口径——与上一轮 Closeout 报告
 *     里的 G1-G10 定义不同，按本次任务指令重新定义，不要混用）
 * ============================================================
 * Gate | Verification Target | Status | Evidence | Limitation
 *
 * G1 Governance alignment | Q1-Q5 与治理文件一致 | PASS |
 *   Constitution 八、九、四份 ADR | 无
 *
 * G2 State machine | 9 态迁移、非法迁移拒绝 | PASS（模拟环境）|
 *   test #1,#4,#5,#6,#7 | 未在真实 GAS 验证
 *
 * G3 Persistence behavior | 读写正确性、日期字段安全 | PASS
 *   （模拟环境，且局限于本 harness 的假 Sheet 建模范围）|
 *   test #9,#13 + 00_Setup.js 建表时的 setNumberFormat | 真实
 *   Google Sheets 的类型强制转换行为未验证（这正是 Inventory OS
 *   Failure Catalog 记录过的那类坑，模拟环境无法复现）
 *
 * G4 Lock / concurrency | 同项目锁的正确性 | PASS（逻辑层）/
 *   NOT VERIFIED（运行时层）| test #3 | Node 单线程，不能验证
 *   真实 GAS LockService 的排队/超时行为——两层状态分开写，不
 *   合并成一个 PASS
 *
 * G5 Execution safety | 未确认/已过期/快照不匹配/重复确认均
 *   拒绝 | PASS | test #4,#5,#6,#7 | 无
 *
 * G6 Projection | 状态与字段更新后查询一致 | PASS | test #9,#13 |
 *   无（在本 harness 建模范围内）
 *
 * G7 Regression | 三个已知 bug 有独立回归测试 | PASS | test
 *   #13,#14,#19 | 无
 *
 * G8 Idempotency | Case A-D 语义边界 | PASS | test
 *   #2,#11,#14,#15,#16,#17 | 局限已在 ADR-003/本文件 D 节记录
 *   （非传递级事件身份）
 *
 * G9 Recovery / orphan handling | 执行中断后的孤儿记录检测/恢复 |
 *   NOT VERIFIED / KNOWN GAP | 全仓库代码检索确认无此机制（本轮
 *   独立核实，非沿用旧结论）| 见 12. 节详细讨论
 *
 * G10 Integration boundary | Inventory 真实调用、Telegram 真实
 *   收发、TASKS 真实写入 | NOT VERIFIED | Inventory 侧仍是
 *   console.log stub（未改动，硬边界）；Telegram Adapter 仅
 *   console.log；createOrUpdateTask 显式 stub | 结构性无法在
 *   不进入 Slice 2 部署的情况下验证
 */

/* ============================================================
 * 12. G9 RECOVERY — 诚实处理
 * ============================================================
 * 核对结果（本轮重新检索全部 implementation/*.js，不是沿用
 * 上一轮的说法）：没有任何 orphan REQUESTED 检测或恢复代码。
 * happy path 能完整跑完（19/19 证明这一点），但这不等于
 * Recovery 已验证——两者是不同的判定维度，本文件不因为前者
 * PASS 就推导后者 PASS。
 *
 *   G9 = NOT VERIFIED / KNOWN GAP
 *
 * 分类判断（这是 Slice 1 known gap，还是 Slice 2 prerequisite？
 * 不自动假设，给出判断依据）：即使完全不涉及 Slice 2 的跨仓库
 * 集成，纯粹在 Slice 1 自己的执行模型内（例如 GAS 6 分钟执行
 * 上限、未捕获异常），executeIntake() 也可能在 createRow() 之后、
 * 后续事件记录之前中断，留下一条卡在 REQUESTED 的记录。这是
 * Slice 1 自身可靠性模型的属性，不依赖任何 Slice 2 才存在的
 * 条件——因此判定为：
 *
 *   Slice 1 known gap（不是 Slice 2 才产生的新问题）
 *
 * 但"要不要现在就修"是另一个问题：本轮不实现（属于 runtime
 * code 变更，超出本轮允许范围——见 25. 节），是否把它列为 Slice 2
 * 的 mandatory scope，交给 Slice 2 Entry Gate 的 P8 决定，不在
 * 本节替 Steven 做这个决定。
 */

/* ============================================================
 * 13. H1 — CROSS-PROJECT LOCKING
 * ============================================================
 * Independent GAS projects have independent Script Locks——这条
 * 保留，不改写成"已解决"。
 *
 *   Procurement-owned tables（PROCUREMENT_REQUESTS/PROC_LEDGER）
 *   → current locking IS SUFFICIENT（明确说清楚，不含糊）：
 *     没有任何其他项目会写这两张表，跨项目锁语义在这个边界内
 *     不适用。
 *
 *   Inventory ↔ Procurement 之间涉及 Identity creation 的跨
 *   project coordination
 *   → NOT GUARANTEED
 *
 * 分类：KNOWN ARCHITECTURAL LIMITATION / RISK
 * Owner：Cross-OS（不是 Procurement 单方面能修的，需要 Inventory
 * OS 那侧配合换成 LockService.getDocumentLock()）
 * Next decision point：仅当 Procurement 的 Normalizer 兜底路径
 * 真的需要调用 CapabilityIdentity.resolve() 创建新身份时才会
 * 真正触发（今天的 Inventory 集成路径只读 identity，不触发）——
 * 下一次决策点是"是否/何时允许 Manual 来源触发新身份创建"，
 * 这个问题出现时才需要真正解决这条风险，不是现在。
 *
 * 本节没有修改 Inventory OS，没有假装 ScriptLock 是 global，
 * 没有声称 cross-project atomicity 已解决，也没有为了 closure
 * 偷偷增加跨项目 dependency。
 */

/* ============================================================
 * 14. H3 — CONFIRMATION EXPIRY
 * ============================================================
 * 核对：当前仍然使用 updated_at 作为 expiry 计算依据（
 * 64_ProcurementUserConfirmation.js checkExpiry()）。
 *
 *   TECHNICAL DEBT
 *   DEDICATED CONFIRMATION EXPIRY FIELD
 *   future field: confirmation_expires_at
 *
 * 本轮不实现 migration。核查是否存在"当前 implementation 已经
 * 产生的实际 correctness bug"：test #13 已经验证 updateProjection
 * 的 auto-bump 行为本身正确（调用方不显式设置 updated_at 时会
 * 自动刷新），且 Slice 1 范围内没有任何会在 AWAITING_CONFIRMATION
 * 期间意外触碰 updated_at 的写入路径——所以没有发现现存的
 * correctness bug。
 *
 *   CLOSED FOR SLICE 1
 *   CARRIED AS TECHNICAL DEBT
 *
 * 不描述为 current runtime failure——它不是。
 */

/* ============================================================
 * 15. COMMAND ENTRYPOINT
 * ============================================================
 * 检查 handleProcurementCommand() 与它对应的实际 invocation
 * contract：本仓库范围内没有 JARVIS source evidence，没有 real
 * deployed invocation，没有 verified Library invocation。
 *
 *   Command Entrypoint = INTEGRATION CONTRACT — UNVERIFIED
 *
 * 不通过"形状和 Inventory 的全局函数一样"来推断已经
 * integration-ready，本轮也没有为了这个问题改动函数命名。
 */

/* ============================================================
 * 16. INVENTORY BOUNDARY — 再次确认
 * ============================================================
 * 本轮没有修改 Inventory OS 的 schema、locking、bridge、payload，
 * 没有为了 Procurement 方便而污染 Inventory OS 的任何文件——
 * 可核实：本轮唯一新建/修改的文件是本 Ledger 文件本身、
 * State/File_Map 的同步更新、以及 implementation/test-harness.js
 * 里新增的一个测试（test #19，纯测试代码，不是 Inventory 也不是
 * Procurement 的运行时代码）。
 *
 * 当前 Procurement 实现依赖 Inventory 尚未提供的字段
 * （estimated_quantity/unit/reason/required_before）——未编造，
 * 记录为 Slice 2 prerequisite（见 21. 节 P1）。
 */

/* ============================================================
 * 17. SLICE 1 CLOSURE CLASSIFICATION
 * ============================================================
 *
 *   SLICE 1 — VERIFIED CORE, INTEGRATION PENDING
 *
 * （与 7.1 一致，这里不重复展开理由）
 */

/* ============================================================
 * 18. SLICE 1 CLOSED / OPEN LEDGER
 * ============================================================
 * Item | Status | Evidence | Owner | Carry Forward
 *
 * Architecture lineage (Q1)      | CLOSED | ADR-000/Constitution 八 | Procurement | No
 * Deployment/persistence (Q2)    | CLOSED | ADR-002/Constitution 三 | Procurement | No
 * Inventory contract boundary (Q3)| CLOSED | Constitution 五、5.1/5.2 | Procurement | No
 * Confirmation architecture (Q4) | CLOSED | ADR-001/Constitution 五、5.4/P9 | Procurement | No
 * Bridge idempotency (Q5)        | CLOSED | ADR-003/Constitution 五、5.5 | Procurement | No
 * Core lifecycle (9 states)      | CLOSED | test #1 等，19/19 | Procurement | No
 * Bug 1 — Projection timestamp   | CLOSED | test #13 | Procurement | No
 * Bug 2 — Planner self-sibling   | CLOSED | test #19（本轮补） | Procurement | No
 * Bug 3 — Cross-source sibling   | CLOSED | test #14 | Procurement | No
 * Idempotency Case A-D           | CLOSED | test #2,#11,#14,#15,#16,#17 | Procurement | No
 * Normalizer 畸形输入直接测试    | OPEN | 覆盖缺口，本轮发现 | Procurement | Decide
 * Real GAS                       | OPEN | 无部署证据 | Procurement | Slice 2
 * Inventory bridge 真实接线      | OPEN | 仍是 stub | Cross-OS | Slice 2
 * Telegram                       | OPEN | Adapter 非真实 | Integration | Slice 2
 * TASKS                          | OPEN | Schema 未核实 | Integration | Slice 2
 * Command entrypoint 集成假设    | OPEN | 未独立验证 | Cross-OS | Slice 2
 * Recovery/orphan handling (G9)  | OPEN | 机制缺失 | Procurement | Decide（P8）
 * confirmation_expires_at        | TECH DEBT | Schema 局限 | Procurement | Later
 * Cross-project locking (H1)     | KNOWN RISK | GAS 边界 | Cross-OS | Later
 *
 * 本表按本仓库实际证据填写，不是机械照抄指令里的示例表——差异
 * 主要在于把"Normalizer 畸形输入测试缺口"这个本轮才发现的项目
 * 也列了进去，示例表没有这一项。
 */

/* ============================================================
 * 19-21. SLICE 2 ENTRY GATE
 * ============================================================
 *
 * P1 — Inventory payload
 *   当前：{itemId, identityId, itemName, urgency}。对 Slice 1
 *   已证明的 lifecycle（可空字段设计）而言，这个 payload 已经
 *   足够——test #9 证明缺失字段不影响流程走到
 *   AWAITING_CONFIRMATION。如果 Slice 2 的目标只是把现有窄
 *   payload 真正接线（而不是先丰富它），P1 对"最小可行 Slice 2"
 *   而言：READY。如果 Slice 2 目标包含向用户展示真实数量等
 *   更丰富体验，则需要 Inventory/source 一侧明确提供，
 *   Procurement 不得自己猜——那种更丰富的 Slice 2 版本，P1 是
 *   CONDITIONAL（取决于 Slice 2 范围如何定义）。
 *
 * P2 — Real Procurement invocation
 *   证据：无（15. 节）。BLOCKED。
 *
 * P3 — Telegram
 *   证据：无真实 bot token/adapter/收发路径。BLOCKED（若 Slice 2
 *   包含真实 Telegram 确认）。
 *
 * P4 — TASKS
 *   证据：真实 schema 未核实。BLOCKED（若 Slice 2 要写入 TASKS）。
 *
 * P5 — Real GAS persistence
 *   证据：无部署/执行证据。BLOCKED。
 *
 * P6 — Cross-project concurrency
 *   当前 Slice 2 若维持"Inventory 只读传入已解析的 identityId"
 *   这个现状（不触发 Manual 路径的新身份创建），则不需要真正的
 *   跨 project atomicity——current eventual/non-atomic
 *   coordination 可以接受，理由见 13. 节 H1 的"下一次决策点"
 *   分析。若 Slice 2 范围扩大到需要跨项目原子写入，则需要新的
 *   architecture decision，不能靠 Procurement 代码单方面解决。
 *   对当前已知的 Slice 2 范围：READY（不需要）。
 *
 * P7 — Confirmation expiry
 *   A（维持 updated_at）或 B（引入 confirmation_expires_at）
 *   需要 Steven 决定，本文件不替他选。列入 Required Decisions。
 *
 * P8 — Recovery
 *   Orphan REQUESTED 检测/恢复是否属于 Slice 2 mandatory scope，
 *   需要 Steven 决定（12. 节已给出"这是 Slice 1 gap"的判断，
 *   但"要不要现在解决"是范围决定，不是本文件能替他做的）。
 *   列入 Required Decisions。
 *
 * SLICE 2 ENTRY STATUS:
 *
 *   BLOCKED
 *
 * 理由：P2/P3/P4/P5 都是完全没有证据支持的硬阻塞项，不是
 * "有点欠缺"的程度——只要其中任何一项是 Slice 2 真正范围的
 * 必要条件，Slice 2 就无法启动。P1/P6 相对宽松（取决于范围
 * 定义），但不足以把整体状态从 BLOCKED 拉到 CONDITIONAL，因为
 * P2（Procurement 到底怎么被真实调用）是几乎任何 Slice 2 版本
 * 都绕不开的前提。
 */

/* ============================================================
 * REGRESSION PRESERVATION MAP（R1–R7 → 现有测试，命名未强改）
 * ============================================================
 * R1 updateProjection explicit updated_at   → test #13
 * R2 Planner self-sibling exclusion         → test #19（专属）+
 *                                              隐含于 test #14
 * R3 Cross-source sibling detection         → test #14
 * R4 Idempotency Case A                     → test #2,#11,#15
 * R5 Idempotency Case B                     → test #14（同一个
 *                                              测试同时覆盖
 *                                              R2/R3/R5，如实
 *                                              说明重叠，不假装
 *                                              是三个独立测试）
 * R6 Idempotency Case C                     → test #16
 * R7 Idempotency Case D                     → test #17
 */
