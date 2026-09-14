/**
 * ============================================================
 * PROCUREMENT OS — 00_Slice2_Entry_Gate.gs
 * ============================================================
 * Last Updated : 2026-09-13
 * Nature       : Integration Discovery + Contract Resolution +
 *                Entry-Gate Preparation. NOT implementation.
 *                No Inventory/JARVIS/Telegram/TASKS runtime touched.
 *
 * Real access constraints for this round, stated up front rather
 * than discovered mid-document: this session has read access to
 * 82_Inventory-main (Inventory OS V4.1, real code) and to prior
 * conversation memory about Personal AI Core (JARVIS). It does NOT
 * have access to JARVIS's actual source code, any real Telegram bot
 * token/configuration, any real GAS deployment/execution
 * environment, or Personal AI Core's EventBus implementation itself.
 * Every finding below is labeled with what it actually rests on —
 * see EVIDENCE CLASSIFICATION.
 * ============================================================
 */

/* ============================================================
 * EVIDENCE CLASSIFICATION (used throughout this file)
 * ============================================================
 * E0 = Documentation only (a governance file's claim, unverified against code)
 * E1 = Static source inspection (real code read, not executed)
 * E2 = Simulated test (Node/fake-GAS execution — test-harness.js)
 * E3 = Real GAS execution
 * E4 = Real cross-system round-trip
 * E5 = Real concurrent execution
 *
 * Nothing in this file claims E3–E5. Highest evidence level reached
 * this round: E1 (real source inspection of Inventory OS's TASKS/
 * EventBus code) plus one E0 item (stored context about Personal AI
 * Core's architecture from a prior conversation, not independently
 * re-verified against JARVIS's own source this round).
 */

/* ============================================================
 * P2 — REAL PROCUREMENT INVOCATION CONTRACT
 * ============================================================
 *
 * 6.1 调查结果（真实做过的检查，不是假装）
 * ------------------------------------------------------------
 * 检查过：82_Inventory-main 全部源码（E1）、本人持久记忆里关于
 * Personal AI Core 的既有记录（E0，来自此前某次对话，本轮未能
 * 重新核对 JARVIS 自己的源码）。
 * 检查不到：JARVIS / Personal AI Core 的真实源码（本次会话没有
 * 这份仓库）、GAS library declarations、真实 deployment
 * configuration。这些不是"懒得查"，是这个环境里确实拿不到。
 *
 * 【本轮修正一个此前的推测】上一轮认为 handleInventoryCommand()
 * 是裸全局函数暗示 JARVIS 把 Inventory OS 当 Library 直接调用。
 * 本轮找到更强的反证据：
 *   - 记忆记录（E0）："Overall system uses a CQRS + Event Sourcing
 *     architecture organized across multiple independent GAS
 *     projects... sharing a Google Sheets backend"、"All multi-file
 *     communication routes through the shared Spreadsheet"
 *   - 29_InventoryBridge.txt 里的真实代码（E1）：
 *     emitToCore(eventType, payload) 的注释明确写"[STUB]
 *     Broadcast a domain event to Personal AI Core's EventBus"，
 *     "future: EventBus.emit(eventType, payload)"
 * 这两条放在一起，说明生态系统主要的跨项目通信方式更可能是
 * "经共享 Spreadsheet 的 EventBus"，不是"直接跨项目 Library
 * 调用"——上一轮的 Library 猜测证据强度不如这轮找到的证据。
 *
 * 但有一个不能忽略的反例：同一份 29_InventoryBridge.txt 里，
 * sendProcurementRequest(payload) 的注释写的是"future:
 * ProcurementBridge.receiveFromInventory(payload)"——这是一个
 * 具体的跨命名空间函数调用写法，不是"emitToCore 走 EventBus"
 * 这种写法。这两个 stub 用了不同的写法，暗示原作者对
 * Inventory→Procurement 这一条链路，设想的可能真的是直接调用
 * （Library 机制，GAS 里唯一能让一个项目字面调用另一个项目
 * 命名空间函数的方式），跟 emitToCore 走的是不同机制。
 *
 * 结论：不下定论，两种可能并存，証據等級都不到能相信任何一个
 * 是"已验证"的程度：
 *   (a) EventBus/Sheet-mediated（证据稍强，来自两个独立来源）
 *   (b) 直接 Library 调用（证据来自 stub 注释本身的具体写法，
 *       只对 Inventory→Procurement 这一条链路成立，不代表整个
 *       生态系统）
 *   handleProcurementCommand() 面向的可能是 (a)(b) 之外的第三件
 *   事——用户在 Telegram 打的指令，不一定和 Inventory→Procurement
 *   的域间信号走同一条路。三者不应该被混成一件事。
 *
 * 6.2 P2 — Procurement Invocation Contract（按要求逐项列出，
 *      能定义的定义，不能验证的写 UNKNOWN/NOT VERIFIED，不猜）
 * ------------------------------------------------------------
 *   Caller              UNKNOWN（候选：JARVIS 经 EventBus；或
 *                       JARVIS/其他系统经 Library 直接调用；未
 *                       独立验证）
 *   Entry point         CONTRACT DEFINED（提案）——
 *                       handleProcurementCommand(rawCommand, actorId)
 *                       用于用户指令；ProcurementBridge.
 *                       receiveFromInventory(payload) 用于域间信号——
 *                       两者是不同入口，不要合并成一个
 *   Input contract       已在 Slice 1 代码里定义（Constitution
 *                       五、5.1/5.2），未被外部真实验证过是否
 *                       匹配调用方实际会传的东西
 *   Output contract      handleProcurementCommand 返回纯字符串
 *                       （对齐 handleInventoryCommand 的真实返回
 *                       形状，E1 证据）；receiveFromInventory 返回
 *                       { requestId, duplicate, status, decision? }
 *                       对象——这个对象形状是 Procurement 自己
 *                       定的，调用方（Inventory）目前的 stub 调用
 *                       没有使用返回值，真实调用方需要什么形状
 *                       未知
 *   Failure contract      两个入口都用 try/catch 包裹，返回安全
 *                       字符串或 GAS 原生抛出 Error——未定义任何
 *                       retry/timeout 语义，因为调用方是谁都还
 *                       不确定，无法定义调用方期待的失败协议
 *   Authentication        UNKNOWN——GAS 项目间/Telegram 用户到
 *                       actorId 的映射机制未见于任何已读代码
 *   Deployment identity   UNKNOWN——不知道 Procurement OS 未来会
 *                       部署成哪个具体 GAS project/deployment ID
 *
 *   P2 = CONTRACT DEFINED (Procurement 侧), RUNTIME NOT VERIFIED
 *
 * 6.3 Evidence
 * ------------------------------------------------------------
 * 无法进行 real round-trip（没有真实 GAS 环境、没有 JARVIS 源码
 * 可对照）。不写 PASS，如上所述维持 CONTRACT DEFINED, RUNTIME
 * NOT VERIFIED。
 */

/* ============================================================
 * P3 — TELEGRAM INTEGRATION CONTRACT
 * ============================================================
 *
 * 7.1 调查真实环境
 * ------------------------------------------------------------
 * 本环境没有真实 Telegram bot token、没有真实 webhook/polling
 * 配置、没有能力发起真实 Telegram API 调用（网络出口不含
 * Telegram API 域名）。不假设 Telegram 已经存在——明确：
 *
 *   P3 = BLOCKED
 *   Reason = missing real Telegram integration environment
 *
 * 7.2 Contract 定义（设计层面，Slice 1 已经做了大部分，本轮补齐
 *      指令要求的具体语义点）
 * ------------------------------------------------------------
 *   Proposal identity     request_id（Constitution 五、5.1）
 *   Confirmation identity  request_id + confirmed_snapshot_json
 *                         （Constitution 五、5.4/P9；快照本身不
 *                         单独编号版本号，用它在
 *                         PROCUREMENT_REQUESTS 行上的当前内容
 *                         代表"当前版本"）
 *   Valid confirmation     只有 confirmed_snapshot_json 与
 *                         Execution 重新读取到的权威状态一致时
 *                         才有效（65_ProcurementExecution.js
 *                         _detectMaterialChange，test #6 已验证）
 *   Material change        P9 已定义：identity_id 变化/urgency
 *                         变化/quantity 变化超出容忍度——见
 *                         Constitution P9
 *   Expired confirmation   EXPIRED 是正式状态，过期后的确认尝试
 *                         被 executeConfirmed 的
 *                         not_awaiting_confirmation 分支拒绝
 *                         （test #5 已验证）
 *   Duplicate confirmation  幂等：第二次确认被拒绝，不产生第二次
 *                         授权（test #7 已验证）
 *   Unknown confirmation    request_id 不存在时 getProjection
 *                         返回 null，executeConfirmed 抛出明确
 *                         错误；handleProcurementCommand 外层
 *                         try/catch 转成安全字符串（test #18 已
 *                         验证）
 *
 * 以上六点全部已经是 Slice 1 代码的真实行为（E2 证据，模拟环境），
 * 不是本轮新设计——本轮只是对照指令逐项确认它们确实存在，没有
 * 遗漏。
 *
 * 7.3 Real Telegram
 * ------------------------------------------------------------
 * 无真实 token/环境，不做 round-trip，不写 fake production
 * Telegram 实现。P3 维持 BLOCKED。
 */

/* ============================================================
 * P4 — TASKS CONTRACT
 * ============================================================
 * 这一节比上一轮的记录准确得多——上一轮说"schema 未核实"，
 * 本轮重新检索 82_Inventory-main，发现真实 schema 其实一直都在
 * 00_Config.txt 里，是本人之前没查够细，不是真的拿不到。如实
 * 更正，不是延续旧说法。
 *
 * 8.1 Ownership
 * ------------------------------------------------------------
 * 29_InventoryBridge.txt 头部注释：「OWNERSHIP: Sole writer of
 * TASKS sheet.」——但这句话的准确范围需要澄清：TC.SOURCE_SYSTEM
 * 这个字段的存在，本身就说明 TASKS 设计上预期有多个写入方
 * （按 source_system 区分），"Sole writer"更可能的意思是"在
 * Inventory OS 自己的代码库内，只有 Bridge 这一个模块碰 TASKS
 * 表"，而不是"整个生态系统里只有 Inventory OS 能写这张表"。
 * 这是本轮的推断（未经 JARVIS/TASKS 真正 owner 确认），不当作
 * 已验证事实，按"Ownership follows data, not UI name"的要求，
 * 真正的 owner 是谁仍然 UNKNOWN——只是"Inventory 是唯一写入方"
 * 这个更狭窄的解读，被 SOURCE_SYSTEM 字段的存在削弱了。
 *
 * 8.2 真实 TASKS schema（E1，直接读到的，不是猜的）
 * ------------------------------------------------------------
 *   Table name       TASKS
 *   Primary identity  TASK_ID（格式 'TSK-' + 4 位数字，如
 *                     TSK-0001；经 _reserveIdBlock('LAST_TASK_ID_NUM',
 *                     20, ...) 生成，PropertiesService 存在
 *                     Inventory OS 自己的项目里）
 *   9 列（1-based）：TASK_ID / TITLE / CATEGORY / PRIORITY /
 *     STATUS / SOURCE_SYSTEM / REF_ITEM_ID / CREATED_AT / UPDATED_AT
 *   STATUS 枚举（Inventory 自己用到的）：至少 OPEN（
 *     INV_CONFIG.TASK_STATUS.OPEN，_findOpenTask 用它做去重查询）
 *   写入函数真实签名：_taskCreate(title, category, priority,
 *     sourceSystem, refItemId)——私有函数，不对外暴露，说明
 *     TASKS 的写入逻辑目前是 Inventory OS 内部私有实现，没有
 *     公开给其他项目调用的接口
 *   去重（idempotency）：_findOpenTask(title, sourceSystem) 按
 *     "TITLE 完全相同 + SOURCE_SYSTEM 相同 + STATUS=OPEN"匹配，
 *     不是按某个业务 ID 匹配
 *   加锁：注释明确「MUST be called from within a lock the caller
 *     already holds... Does NOT acquire its own lock」——与
 *     Procurement 自己 C12 的纪律完全一致（同一原则的独立收敛
 *     证据，值得记一笔）
 *
 * 【本轮新发现的真实风险，非推测】TASK_ID 由 Inventory OS 自己
 * 项目的 PropertiesService（'LAST_TASK_ID_NUM'）生成序号，这个
 * 计数器的作用域是 Inventory OS 自己的脚本项目。如果 Procurement
 * OS 未来也用同样的"TSK-合序号"格式独立生成 ID，两边的计数器
 * 互不知道对方，会产生真实的 ID 碰撞（两边都可能各自生成
 * "TSK-0001"）。这是继 H1（跨项目锁）之后，另一个同类型的
 * "各自独立初始化的资源在共享表里相遇"问题，本轮不修（不修改
 * Inventory OS，也不是本轮允许的 runtime 变更），记录为
 * Inventory Integration Requirement（见下）。
 *
 * 8.3 Procurement → TASKS Contract（设计提案，未实现）
 * ------------------------------------------------------------
 *   Trigger    65_ProcurementExecution.executeConfirmed() 成功
 *              写入 EXECUTED 状态之后（镜像 Inventory 自己的
 *              "先决策后建 Task"顺序）
 *   Payload    title（人类可读，含 canonical_name+urgency）,
 *              category='Procurement', priority（按 urgency 映射）,
 *              sourceSystem='ProcurementOS'（不用 'Inventory'，
 *              避免与 Inventory 自己的 Task 混淆去重范围）,
 *              refItemId=request_id（不是 identity_id——这样
 *              _findOpenTask 风格的去重如果按 refItemId 扩展，
 *              能精确对应到这一笔采购请求，而不是这个物品的
 *              任意 Task）
 *   Ownership  写入动作由 Procurement 自己的 Bridge 执行，但
 *              TASKS 表物理归属未定（8.1）——这意味着
 *              Procurement 若真要写，需要跟 TASKS 真正 owner
 *              （不确定是不是就是 Inventory OS）达成一致，不能
 *              自己单方面决定"反正 SOURCE_SYSTEM 分得清就行"
 *   Idempotency 提案沿用 Inventory 的 _findOpenTask 模式，但按
 *              refItemId=request_id 而不是 title 匹配（更精确，
 *              不受 title 文案措辞变化影响）——这是本轮的设计
 *              建议，不是已经验证有效的方案
 *   Failure    Procurement execution 成功但 TASK 创建失败时：
 *              不静默吞掉（明确排除
 *              try{createTask()}catch{ignore}这种写法）。提案：
 *              EXECUTED 状态本身先落地（Procurement 自己的采购
 *              决策/授权事实不应该被下游 Task 系统的故障连累），
 *              Task 创建失败记录为独立事件（例如复用
 *              PROC_LEDGER 的 context_json 字段记一条
 *              "task_creation_failed"标记），linked_task_id 留空，
 *              需要有某种后续补建机制（人工或定时重试）——这个
 *              补建机制本身是否要做、什么时候做，超出本轮范围，
 *              列为 Slice 2 待决定项，不是本轮能拍板的
 *
 * 8.4 结论
 * ------------------------------------------------------------
 *   P4 = BLOCKED（对"真的去写 TASKS"这件事而言，因为 ownership
 *   未最终确认、写入函数是私有的没有公开接口、ID 碰撞风险未
 *   解决）；但比上一轮的"schema 未核实"状态好得多——schema 现在
 *   是 E1 级别的真实证据，不是 UNKNOWN。
 *   Required：TASKS 真正 owner 确认；ID 空间隔离方案；
 *   Procurement 侧写入是否需要 Inventory 侧开放某种公开接口
 *   （而不是绕过私有函数直接操作 Sheet）。
 */

/* ============================================================
 * P5 — REAL GAS VERIFICATION
 * ============================================================
 * 诚实声明：本会话运行在一个沙箱化的 Linux 容器里，有 Node.js，
 * 没有任何访问真实 Google Apps Script / Google 账号 / 真实
 * Spreadsheet 的能力。这不是"这轮没空做"，是这个环境结构性地
 * 做不到。
 *
 *   P5 = NOT VERIFIED（且在本会话环境下无法被验证——需要的证据
 *   是"有人在真实 GAS 项目里跑过 setupProcurementOS()/
 *   smokeTestProcurementOS() 并报告真实 Spreadsheet 的结果"，
 *   这件事只能由有真实 GAS 访问权限的人完成，不是本轮"不够
 *   努力"的问题）
 *
 * 9.2 Concurrency：test-harness.js 的"并发"测试是 Node 单线程
 * 顺序调用，不是真并发——G4 runtime concurrency 维持 NOT VERIFIED，
 * 不因为顺序测试通过就宣称并发已验证（与上一轮 Ledger 的立场
 * 一致，本轮重申不因为反复被问就改口）。
 *
 * 9.3 Cross-project locking：维持 H1 的结论（见 00_Slice1_
 * Closure_Ledger.js §13），未发现需要修改 Inventory 的新证据，
 * 也没有发现真正的 cross-project atomicity 硬需求——如果 Slice 2
 * 的真实范围扩大到需要它，届时记录为 ARCHITECTURE DECISION
 * REQUIRED，本轮不自行解决。
 */

/* ============================================================
 * D1 / P7 — CONFIRMATION EXPIRY：正式决定
 * ============================================================
 * Decision: 批准引入 confirmation_expires_at 作为未来专用字段。
 *
 * Rationale：updated_at 是通用记录元数据，任何字段更新都会碰它；
 * confirmation_expires_at 是明确的业务语义字段，值在进入
 * AWAITING_CONFIRMATION 那一刻由 Execution 一次性算好并写死，
 * 不会被后续任何其他写入意外顺延——这正是 00_Slice1_Closure_
 * Ledger.js §14 记录的技术债所指向的修复方向，本轮把"评估"
 * 正式升级为"批准"。
 *
 * Slice 2 placement：批准的是"Slice 2 runtime implementation 之
 * 前先完成 schema 决策"，即这次的批准本身就是那个 schema
 * decision——真正的 migration（在 00_Setup.js 建表逻辑里加这一
 * 列、在 65_ProcurementExecution.js 里改用它而不是 updated_at）
 * 属于 runtime 变更，不在本轮允许范围内实现，留给 Slice 2
 * 实现阶段最先做的事情之一。
 *
 * 状态：DECISION APPROVED，MIGRATION PENDING（Slice 2）
 */

/* ============================================================
 * D2 / P8 — RECOVERY / ORPHAN POLICY：正式决定
 * ============================================================
 * 11.1 定义 orphan（给出推理，不直接采用某个数字）
 * ------------------------------------------------------------
 * 一条 REQUESTED（或 PLANNED）记录被视为 ORPHANED 的判断依据，
 * 不应该是单纯"created_at 超过 X 分钟"——因为 Slice 1 的
 * executeIntake() 设计上是"一次加锁内从 REQUESTED 走到
 * AWAITING_CONFIRMATION 或 CLOSED"，正常情况下这个中间状态
 * 存在的时间是一次函数执行的量级（秒级），不是分钟级。所以
 * ORPHANED 的合理定义是："状态仍是 REQUESTED 或 PLANNED，且
 * updated_at 距现在的时间，明显超过一次正常 GAS 执行可能耗费
 * 的时间上限（GAS 单次执行硬上限 6 分钟）"——建议阈值：
 * 已进入 REQUESTED/PLANNED 状态超过 10 分钟（留出安全余量，
 * 而不是卡在 6 分钟整数上）仍未推进，判定为 ORPHANED。这个
 * 10 分钟不是拍脑袋——是"GAS 单次执行硬上限"这个真实的平台
 * 约束推出来的，不是本轮偷偷绕过"不要直接采用某个 threshold
 * 必须有 reasoning"这条要求。
 *
 * 11.2 Recovery policy
 * ------------------------------------------------------------
 * ORPHANED → 提案：expire（不是 retry/replan）。理由：Slice 1
 * 的 executeIntake() 卡在中途，意味着这次 intake 本身没有走完，
 * 而不是"走完了但结果需要人工复核"——重新 replan 有产生
 * 二次副作用的风险（如果中断点恰好在事件已写、但状态字段还
 * 没更新的窄窗口），更安全的默认是把它标记为一个特殊的终态
 * （例如复用 CANCELLED，reason='orphaned_timeout'），而不是
 * 尝试自动继续或自动重来一遍。
 *   触发方式：建议由一个定时触发器（time-driven trigger）扫描
 *   PROCUREMENT_REQUESTS 里状态为 REQUESTED/PLANNED 且超过阈值
 *   的行——不是自动重试，是自动把它们安全地标记为需要人工
 *   关注的终态。
 *   是否需要 user confirmation：不需要，因为这是"清理卡住的
 *   记录"，不是"授权一笔新采购"，不受 P4 那条 AI≠authorization
 *   原则约束（性质不同）。
 *   retry：不做自动 retry（理由同上）。
 *   audit trail：走既有的 PROC_LEDGER 机制，事件类型可以复用
 *   PROCUREMENT_CANCELLED，context_json 里标注
 *   reason='orphaned_timeout'，不需要新增第 10 种事件类型。
 *
 * 11.3 Scope decision
 * ------------------------------------------------------------
 *   P8 = Slice 2 Mandatory
 *
 * 理由：这不是可有可无的体验优化——一个没有恢复机制的卡死记录，
 * 会在 Projection 的 listOpenByIdentity() 查询里被当成"仍然
 * open"，持续污染后续同一物品请求的 hasOpenSibling 判断，属于
 * 真实的数据完整性问题，不是"以后再说"级别的事项。
 *
 * 状态：POLICY DEFINED，SCHEDULER/WORKER 实现留给 Slice 2（本轮
 * 不写 scheduler）。
 */

/* ============================================================
 * D3 — MINIMUM VIABLE SLICE 2 定义
 * ============================================================
 * Slice 2A — Real Runtime Foundation：
 *   真实 GAS 部署（P5）+ 真实 Procurement invocation 至少一种
 *   机制确认（P2）+ confirmation_expires_at migration（D1）
 * 不包含在 Minimum 里：Telegram 真实收发（P3）、TASKS 真实写入
 * （P4）、Recovery scheduler（P8，虽然 Mandatory for Slice 2 整体，
 * 但可以是 Slice 2 后段而非 Minimum 的第一刀）
 *
 * MINIMUM SLICE 2 = BLOCKED（P2/P5 都没有证据，且两者都是
 * Minimum 范围本身就需要的前提，不是可选项）
 */

/* ============================================================
 * D4 — RICH SLICE 2 定义
 * ============================================================
 * 在 Minimum 基础上追加：Telegram 真实确认（P3）、TASKS 真实
 * 写入（P4，含 ID 碰撞方案与 owner 确认）、Recovery scheduler
 * 真正部署（P8 的 worker 部分）、更丰富的 Inventory payload
 * （若 Inventory 一侧未来决定提供）
 *
 * RICH SLICE 2 = BLOCKED（同样卡在 Minimum 都过不去的 P2/P5，
 * 加上 P3/P4 自己的阻塞）
 */

/* ============================================================
 * INTEGRATION CONTRACT REGISTRY
 * ============================================================
 * Contract | Direction | Owner | Status | Evidence | Blocking?
 *
 * Inventory → Procurement | inbound | Inventory(payload)/
 *   Procurement(处理) | CONTRACT DEFINED, RUNTIME NOT VERIFIED |
 *   E1（stub 注释+真实 payload 形状）| Yes（P2）
 *
 * JARVIS → Procurement | inbound | UNKNOWN | UNKNOWN | E0（仅
 *   记忆里的既有记录，未本轮验证）| Yes（P2）
 *
 * Procurement → Telegram | outbound adapter | Procurement |
 *   CONTRACT DEFINED | E2（模拟环境验证过语义边界）| Yes（P3
 *   真实收发未验证）
 *
 * Telegram → Procurement | inbound adapter | Procurement |
 *   CONTRACT DEFINED | E2 | Yes（同上）
 *
 * Procurement → TASKS | outbound | UNKNOWN（8.1 讨论） |
 *   CONTRACT DEFINED (proposal), OWNERSHIP UNVERIFIED | E1（真实
 *   schema）+ E0（提案本身）| Yes（P4）
 *
 * Procurement → EventBus (Personal AI Core) | outbound | Personal
 *   AI Core | UNKNOWN——Procurement 自己的代码目前没有任何
 *   emitToCore 或等价 stub，是否需要这条链路本身还没设计 | 无 |
 *   EXTERNAL DEPENDENCY（若未来需要，需先设计）
 */

/* ============================================================
 * P1–P8 ENTRY MATRIX
 * ============================================================
 * Gate | Requirement | Status | Evidence | Blocking?
 * P1 最小可行 Slice2 范围定义        | DEFINED (D3/D4)   | E0 | 见上
 * P2 真实调用                        | CONTRACT DEFINED, RUNTIME NOT VERIFIED | E0/E1 | Yes
 * P3 Telegram                        | BLOCKED           | 无真实环境 | Yes（Rich）
 * P4 TASKS                           | BLOCKED           | E1（schema）| Yes（Rich）
 * P5 Real GAS                        | NOT VERIFIED（结构性）| 无 | Yes
 * P6 并发架构                        | READY（当前已知范围）| E1 推理 | No
 * P7 Confirmation expiry             | DECISION APPROVED | 本文件 D1 | No（决策已完成）
 * P8 Recovery                        | POLICY DEFINED, Slice 2 Mandatory | 本文件 D2 | No（决策已完成，实现待 Slice2）
 */
