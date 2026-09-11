/**
 * ============================================================
 * PROCUREMENT OS — 00_ADR.gs (Architecture Decision Record Log)
 * ============================================================
 * Last Updated : 2026-09-09
 *
 * 格式说明：本仓库沿用 UEF 记录的 ADR 结构（Context / Decision /
 * Alternatives / Decision Criteria / Consequences / Impact /
 * Next Steps / Review Trigger / Related ADRs）。这是本文件作者
 * 记忆中的 UEF v1.1 结构；Inventory OS 一侧的证据显示 UEF 实际
 * 已到 v1.12（见 Constitution 八、G4），具体 ADR 模板是否在
 * v1.1 之后又变过，本文件无法从现有仓库证据确认——请在真正的
 * UEF v1.12 文件可得时核对格式是否仍然一致，不确定的地方按
 * 「如实记录，不假装」处理，而不是沉默地假设没有变化。
 *
 * 另外需要显式指出的一点：Inventory OS 自己从 V1 到 V4.1 全程
 * 没有使用过 ADR 形式记录任何决策（它的等价物是 State 文件里的
 * DD1-DD7，更轻量、非正式）。本文件仍然选择用完整 ADR 格式，
 * 是因为使用者的原始任务指令明确点名要 "ADR-000"，按字面执行；
 * 但这意味着 Procurement OS 和它最直接的姊妹系统 Inventory OS
 * 在"多正式的决策要不要写成 ADR"这件事上不对称——这个不对称本身
 * 值得被看见，而不是被本文件悄悄抹平。
 * ============================================================
 */

/* ============================================================
 * ADR 索引
 * ============================================================
 * ADR-000  Procurement OS 独立成 Domain OS，              Accepted
 *          採纳 Inventory OS S1-S9 谱系（Q1 已批准）
 * ADR-001  User Confirmation 作为显式治理边界，            Accepted
 *          渠道无关设计 + 快照失效规则（Q4）
 * ADR-002  Deployment & Persistence Boundary（Q2）        Accepted
 * ADR-003  Bridge Idempotency / Replay Safety（Q5）       Accepted
 * ============================================================
 */

/* ============================================================
 * ADR-000 — Procurement OS 独立成 Domain OS
 * ============================================================
 * Status: Accepted (2026-09-07)
 *
 * Context
 * ------------------------------------------------------------
 * 现有 Procurement 相关证据分散在两处：(1) 81_Procurement-main
 * 仓库里被错置的 Inventory OS V2.1 文件，其中把 Procurement OS
 * 描述为模块 60–69、由 Inventory 经 Bridge 发信号触发的下游系统；
 * (2) 82_Inventory-main（V4.1，当前）的 00_Capability_Identity.gs
 * / 00_Capability_Policy.gs 文件头部，明确把 "Procurement OS" 
 * 列为 Core Capability 的"未来调用方"，以及 00_Project_State.gs
 * DD6 明确说明 Decision/Execution 的分工设计是"方便 Procurement/
 * Shopping 复制同一套模式"。也就是说，Procurement 作为一个独立
 * 概念，在 Inventory OS 自己的架构设计阶段就已经被预留了位置，
 * 不是本次任务凭空发明的。
 *
 * 但 Procurement 自己从未有过一份真正描述它自己的治理文件——
 * 现在需要正式回答："Procurement 该不该是一个独立的 Domain OS？"
 *
 * Decision
 * ------------------------------------------------------------
 * 选 C：Procurement OS 作为独立的 Domain OS，拥有自己的
 * Constitution / State / File_Map / ADR，自己的模块范围
 * （60–69），自己的 Lifecycle（Request→...→Bridge），自己的
 * Persistence（PROCUREMENT_REQUESTS / PROC_LEDGER），只与
 * Inventory OS 共享 Core Capability Layer（Identity），不共享
 * 业务逻辑或 Domain 层数据表。
 *
 * 需要明确一个层次区分：这里的"独立 Domain OS"是治理/架构层面
 * 的独立（独立的 Constitution、独立的模块编号、独立的生命周期、
 * 独立的数据表），不必然等于"独立的 Google Apps Script 部署/
 * 独立的 Spreadsheet"。后者是一个更窄的技术部署问题（见
 * Constitution 九、Q2），本 ADR 的 Decision 范围不含它——即使
 * 最终答案是"和 Inventory OS 同一个 Spreadsheet"，Procurement
 * OS 依然是一个独立的 Domain OS。
 *
 * Alternatives Considered
 * ------------------------------------------------------------
 * A. Procurement 嵌入 Inventory OS 内部（作为 Inventory 的一个
 *    子模块，例如 24.5_InventoryProcurement.gs）
 *    → 拒绝。违反 Inventory OS 自己的 P1/P4："是否买、何时买，
 *    由 Procurement OS 的 Decision Engine 决定"这句话本身就
 *    假设了两者是分开的权责主体。且一旦 Property OS / Finance
 *    OS 未来也需要发起采购请求，把决策逻辑焊死在 Inventory 内部
 *    会让 Inventory 变成事实上的"全平台采购中枢"，直接违反
 *    Inventory 自己 P1 定义的边界（Consumption Intelligence +
 *    Lifecycle Tracking + 触发信号，不含决策与执行）。
 *
 * B. Procurement 作为独立模块，但与 Inventory OS 同一个 Runtime/
 *    项目内（不独立治理文件，只是代码物理上分开）
 *    → 拒绝。这会导致 Inventory OS 的 Constitution/State/
 *    File_Map 需要同时描述两个概念上完全不同的 Lifecycle（消耗
 *    追踪 vs 采购决策），文件会迅速膨胀且职责边界在文档层面就
 *    开始模糊——这正是本次任务开始时发现的"文件放置错误"问题
 *    的更极端版本：如果连独立文件都没有，未来只会更容易把两者
 *    的治理内容搞混。
 *
 * C. Procurement 作为独立 Domain OS（选定）
 *    → 见 Decision。
 *
 * D. 通用的、供多个 Domain 共享的"采购服务"（不特指 Inventory
 *    的下游，而是一个多租户式的通用 Procurement Service）
 *    → 拒绝，理由是 EP3 反过早工程化：目前只有 Inventory 一个
 *    真实存在的请求来源，Property OS / Finance OS / 手动请求都
 *    还只是"未来可能"。P7 的"来源无关"契约设计已经保留了未来
 *    多来源接入的空间，不需要现在就把 Procurement 做成一个更
 *    抽象的通用服务概念——那是有了第二个真实来源之后，根据实际
 *    收敛证据再决定的事。
 *
 * Decision Criteria
 * ------------------------------------------------------------
 * domain ownership          → C 最清晰：需求/决策/执行各有明确
 *                              归属，不与 Inventory 的消耗追踪
 *                              职责重叠
 * lifecycle ownership       → C：独立的 9+1 层生命周期
 * persistence ownership     → C：PROCUREMENT_REQUESTS/PROC_LEDGER
 *                              独立于 INVENTORY/INV_LEDGER
 * auditability              → C：独立 Ledger，采购决策的审计
 *                              轨迹不与库存变动记录混在一起
 * failure isolation         → C：Inventory OS 的 bug 不会直接
 *                              破坏 Procurement 的状态机，反之亦然
 * future Finance OS 集成    → C：清晰的边界（P8）意味着未来
 *                              Finance OS 接入时，"谁的钱谁的账"
 *                              不需要重新划分
 * future Supplier/Vendor    → C：Supplier 是否内建，是 Procurement
 *                              自己范围内的问题（DM-08），不会
 *                              牵连 Inventory
 * multi-domain 需求来源     → C（配合 P7 来源无关设计）优于 A/B，
 *                              A/B 都会让 Inventory 变成事实上的
 *                              入口，与多来源目标矛盾
 * execution boundary        → C：Execution 的"唯一持锁者"原则
 *                              (C12) 只需要在 Procurement 自己
 *                              的临界区内成立，不与 Inventory
 *                              的锁语义纠缠
 * user confirmation         → C：这一层是 Procurement 独有的
 *                              治理边界（ADR-001），嵌入 A/B 会
 *                              让 Inventory 的 Lifecycle 也被迫
 *                              感知"用户确认"这个与库存追踪无关
 *                              的概念
 * recovery/replay           → C：独立 Ledger，独立 replay 范围，
 *                              互不干扰
 * governance independence   → C：独立 Constitution 意味着未来
 *                              Procurement 的架构演化不需要每次
 *                              都去改 Inventory 的治理文件
 * deployment independence   → C：治理层面独立；物理部署层面见
 *                              ADR-002（Runtime 独立部署，
 *                              Persistence 暂时共享）
 *
 * Consequences
 * ------------------------------------------------------------
 * 正面：
 *   - 边界清晰，Inventory OS 的 P1 定义的范围保持不变，不被
 *     Procurement 的复杂度污染
 *   - Procurement OS 可以完整复用 Inventory OS V4.1 已经用真实
 *     审计验证过的 S1-S9 + 锁纪律模式（见 G2），不用从零摸索
 *     TOCTOU 等并发正确性问题
 *   - 未来 Property OS / Finance OS / Investment OS 需要发起
 *     采购请求时，只需实现自己的 Domain Adapter，不需要理解
 *     Procurement 内部实现
 *
 * 负面（不刻意隐藏）：
 *   - 多了一整套独立治理文件需要维护同步（Constitution/State/
 *     File_Map/ADR 四份，而不是在 Inventory 现有文件里加几段）
 *   - 如果 Q2（部署形态）最终答案是"必须真正独立部署"，那么
 *     IDENTITY_REGISTRY / TASKS 两张共享表的跨项目访问机制需要
 *     额外开发，这是本 ADR 决定"要不要独立"之后才会浮现的
 *     真实工程成本，本 ADR 不假装这个成本不存在
 *   - 进一步固化了 G1 提到的"谱系 A / 谱系 B 两条平台标准并存"
 *     的现状（见 Constitution 八、G2）——这不是本 ADR 造成的
 *     问题，但本 ADR 的决定会让这个既有问题多一个真实案例
 *
 * Impact
 * ------------------------------------------------------------
 * Procurement OS 正式获得 60–69 模块范围的独占使用权（已在
 * Inventory OS V4.1 文件里以"future"形式确认，不与任何现存
 * 编号冲突）。本 ADR 是 Constitution 二、三、四节内容成立的
 * 前提。
 *
 * 【2026-09-09 追加确认，Q1 CLOSURE】Decision 部分进一步明确：
 * Procurement OS 採纳的"独立 Domain OS"具体架构谱系，是
 * Inventory OS 自己独立发展的 S1-S9 Domain OS Lifecycle Standard
 * + Capability Layer（Constitution 八、谱系 B），而不是 Universal
 * Domain OS Blueprint v1.2 的树状结构（谱系 A）——正式关系：
 *
 *   UEF v1.12
 *       │
 *       └── §0.6 governance overlay
 *               │
 *               └── S1–S9 Domain OS Lifecycle
 *                       │
 *                       ├── Inventory OS
 *                       └── Procurement OS
 *
 * 这不代表 Blueprint v1.2 无效，只代表这个生态系统里 Inventory OS
 * 已经建立起被採纳的 runtime/lifecycle 谱系，Procurement OS 选择
 * 保持兼容，不引入第三条竞争谱系。
 *
 * Next Steps
 * ------------------------------------------------------------
 * 1. ~~Steven 确认或推翻 Decision~~ —— 已批准（2026-09-09），
 *    Alternative D 维持拒绝，理由不变
 * 2. ~~解决 Constitution 九、Q2（部署形态）~~ —— 见 ADR-002
 * 3. 实现阶段：按 State 文件的 Implementation Sequence 建议，
 *    先做不依赖 Inventory 真实接线的核心管线垂直切片
 *
 * Review Trigger
 * ------------------------------------------------------------
 * 当出现第二个真实的（非"future"占位）请求来源域（Property OS /
 * Finance OS / 手动请求功能真正上线）时，重新评估 Alternative D
 * （通用采购服务）是否此时反而是更合适的形态——届时会有真实的
 * 多租户证据，不再是本 ADR 现在这样的推测。
 *
 * 另：若谱系 A（Blueprint）与谱系 B（S1-S9）未来有正式协调/合并
 * 的动议，本 ADR 的 Decision 需要重新评估是否仍然成立。
 *
 * Related ADRs
 * ------------------------------------------------------------
 * ADR-001（User Confirmation）、ADR-002（Deployment & Persistence）、
 * ADR-003（Bridge Idempotency）均建立在本 ADR 之上。
 */

/* ============================================================
 * ADR-001 — User Confirmation 作为显式治理边界
 * ============================================================
 * Status: Accepted (2026-09-07); amended 2026-09-09 per Q4
 *         closure (channel-agnostic architecture + material-
 *         change reconfirmation rule + EXPIRED state)
 *
 * Context
 * ------------------------------------------------------------
 * Procurement OS 与 Inventory OS 最根本的不同：Inventory 的
 * Decision/Execution 只影响"系统自己记录的库存状态"，出错的
 * 代价是数据不准；Procurement 的 Execution 一旦触发，代表的是
 * 一个真实世界的采购承诺（哪怕 V0.1 阶段"执行"只是创建一个
 * Task 让人类去买），出错的代价是真实的时间/金钱。使用者原始
 * 任务指令的 Non-Negotiable Rule #6 明确要求："Do not let AI
 * recommendation equal authorization"。这不是一个可以在
 * Decision Matrix 里"权衡后放弃"的选项，是硬约束。
 *
 * Decision
 * ------------------------------------------------------------
 * 采用显式 9 态状态机（2026-09-09 由 8 态增补 EXPIRED）：
 *   REQUESTED → PLANNED → AWAITING_CONFIRMATION →
 *     { CONFIRMED | REJECTED | EXPIRED } → EXECUTED → CLOSED
 *   （以及旁支 CANCELLED，可从 REQUESTED/PLANNED/
 *     AWAITING_CONFIRMATION 任一状态发生）
 *
 * 新增 64_ProcurementUserConfirmation.gs 作为唯一能把状态从
 * AWAITING_CONFIRMATION 推进到 CONFIRMED / REJECTED / EXPIRED 的
 * 模块，且 CONFIRMED/REJECTED 只能由真实用户输入触发，EXPIRED
 * 只能由超时机制触发（见 Constitution P4/P9/C14）。
 * 65_ProcurementExecution 在真正写入前，必须重新校验这个状态是
 * 权威的、未过期的、未被覆盖的——与 Inventory OS P6 的 Check/Use
 * 同临界区原则完全一致，只是这里"Check"的对象从"库存数量"换成了
 * "用户是否真的确认过、且确认的是不是当前这份提案"。
 *
 * 【Q4 补充：渠道无关架构】64 本身是"渠道无关的 Core"，不直接
 * 知道 Telegram 的存在；实际收发消息由 64 内部一个 Telegram
 * Adapter 子组件负责，经 69_ProcurementBridge 的运输层能力发送，
 * 但 CONFIRM/REJECT/EXPIRE 的判定权始终在 64，不在 Telegram
 * Adapter、更不在 69 自己。未来加 Web UI / Mobile UI / 其他 Chat
 * 界面，只需要新增一个平行的 Adapter，64 的状态机与规则不因此
 * 改变。
 *
 * 【Q4 补充：确认的范围与失效】一次 CONFIRM 严格限定为"用户确认
 * 了呈现给他的那一份具体提案"——由 identity_id/decided_quantity/
 * urgency 组成的不可变快照（confirmed_snapshot_json）。它不代表
 * Telegram 有权批准任意未来采购，不代表 AI 可以在没有新一轮确认
 * 下另开一单，也不代表系统可以在确认后静默改动数量/供应商/金额
 * （Constitution P9）。65_ProcurementExecution 落地前必须比对
 * "即将写入的权威结果"与"这份快照"是否一致——不一致则判定该
 * 确认对当前提案已失效，状态打回 AWAITING_CONFIRMATION 并重新
 * 触发确认，不得沿用旧确认放行新提案。
 *
 * 【V0.1 范围声明】没有"部分执行/完全履行"的细粒度状态
 * （ORDERED / PARTIALLY_FULFILLED / FULFILLED）——见
 * Alternatives 里对此的说明。EXECUTED 目前的语义就是"已创建
 * 交给人类处理的 Task"，不代表"已完成实际采购"。CLOSED 代表
 * "人类确认这件事完结了"，可能来自 Task 完成、也可能来自
 * Inventory 未来的补货信号间接确认——CLOSED 的确切触发机制是
 * 一个待落实的细节，不是本 ADR 需要现在解决的架构问题
 * （Constitution 九、D1 一并记录了 EXPIRED 的默认超时时长
 * 建议，同样是可调细节，不是架构分歧）。
 *
 * Alternatives Considered
 * ------------------------------------------------------------
 * A. 不设确认步骤，Decision 的 recommend=true 直接进入 Execution
 *    → 拒绝。直接违反 Non-Negotiable Rule #6，不需要进一步权衡。
 *
 * B. 确认作为 Task 里的一个"软性"复选框（勾不勾都不影响
 *    Task/记录的实际状态，纯粹提示性质）
 *    → 拒绝。这不构成一个真正的治理边界，只是 UI 装饰——
 *    使用者原始任务指令里特别强调"这应该代表一个有意义的治理
 *    边界，而不仅仅是一个 UI 按钮"，选项 B 正是那个被明确排除
 *    的反例。
 *
 * C. 独立状态机 + 独立模块，硬性阻断未确认请求进入 Execution
 *    （选定）
 *    → 见 Decision。
 *
 * D. 按金额/数量设阈值，低于阈值自动批准，高于阈值才要求确认
 *    → 推迟，不是现在拒绝。这是一个合理的未来优化方向，但
 *    Procurement OS 目前明确不拥有真实价格数据（Constitution
 *    P8——estimated_price/quoted_price 尚未设计，Finance OS
 *    边界也还没有真正落地）。在没有可信价格输入的情况下设置
 *    金额阈值没有实际意义。列入 Review Trigger，不列入本次
 *    实现范围。
 *
 * Decision Criteria
 * ------------------------------------------------------------
 * 治理完整性（是否绝对满足 Non-Negotiable Rule #6）→ 只有 C
 * 满足，A 直接违反，B 名义上满足实际不满足
 * 与 Inventory OS P6 并发正确性纪律的一致性 → C 最一致
 * V0.1 阶段的实现复杂度 → C 可控；D 需要 Procurement 尚不
 * 具备的价格数据，复杂度不可控
 *
 * Consequences
 * ------------------------------------------------------------
 * 正面：
 *   - 每一笔进入 EXECUTED 状态的请求都有可追溯、不可伪造
 *     （C14 禁止任何测试/调试代码绕过）的用户确认记录
 *   - 状态机本身与具体来源域无关，未来 Investment OS（交易前
 *     确认）、Property OS（大额付款前确认）出现类似需求时，
 *     可以直接参考这套模式，不需要重新设计
 *
 * 负面：
 *   - V0.1 阶段 Procurement OS 不具备任何"自动化"采购能力——
 *     每一笔都需要人类经 Telegram 往返确认一次，这是刻意的
 *     摩擦，不是遗漏
 *   - 依赖现有 Telegram bot 基础设施的可用性；EXPIRED 状态
 *     （2026-09-09 新增）覆盖了"迟迟没有响应"的情况，但如果
 *     Telegram webhook 本身故障（而不是用户没回复），
 *     checkExpiry() 的定时触发器仍然依赖底层 GAS 触发器基础
 *     设施可用——这是一个共同故障点，本 ADR 如实记录，不假装
 *     已经消除
 *   - 渠道无关设计（Q4）意味着 64 比单纯"直接调 Telegram API"
 *     多一层 Adapter 抽象，V0.1 阶段只有一个真实渠道，这层
 *     抽象的收益要等第二个渠道出现才真正体现——这是提前为可预期
 *     的扩展付出的复杂度成本，不是免费的
 *
 * Impact
 * ------------------------------------------------------------
 * 64_ProcurementUserConfirmation.gs 成为 Constitution 二、
 * Lifecycle Standard 里唯一不对称于 Inventory OS S1-S9 的新增
 * 层（S4.5）。65_ProcurementExecution 的实现必须包含"重新校验
 * confirmation 状态，且校验的是针对当前快照"这一步，不可省略
 * （P9）。PROCUREMENT_REQUESTS 表新增 confirmed_snapshot_json
 * 列（Constitution 六）。
 *
 * Next Steps
 * ------------------------------------------------------------
 * 1. ~~确定 Telegram 确认的具体 UX~~ —— 已确定（Q4，本次
 *    amendment）：渠道无关 Core + Telegram Adapter
 * 2. 实现阶段：checkExpiry() 的具体触发频率与超时时长
 *    （Constitution 九、D1 给出默认建议，非架构决定）
 * 3. 待 Finance OS 边界与真实价格数据出现后，重新评估
 *    Alternative D 是否值得实现（见 Review Trigger）
 *
 * Review Trigger
 * ------------------------------------------------------------
 * 当 Procurement OS 拥有可信的价格数据来源（无论是来自 Finance
 * OS 集成还是其他方式）时，重新评估是否引入金额阈值自动批准
 * （Alternative D）。在此之前，C 是唯一被批准的实现路径。
 *
 * Related ADRs
 * ------------------------------------------------------------
 * 建立在 ADR-000（Procurement OS 独立成 Domain OS）之上。
 * ADR-003（Bridge Idempotency）的 intake 路径最终也要走
 * Execution 的同一套"持锁重新校验"纪律，两者共享同一个
 * 架构原则（P6），但检查的对象不同（confirmation 状态 vs
 * idempotency_key）。
 */

/* ============================================================
 * ADR-002 — Deployment & Persistence Boundary
 * ============================================================
 * Status: Accepted (2026-09-09)
 *
 * Context
 * ------------------------------------------------------------
 * ADR-000 把"独立 Domain OS"定义在治理层面（独立 Constitution/
 * 模块范围/生命周期），刻意把物理部署问题留给这份 ADR 单独处理，
 * 因为两者是不同性质的决定：前者关乎架构清晰度，后者关乎真实的
 * 工程成本（谁能访问哪张 Sheet、要不要跨项目 SPREADSHEET_ID）。
 * 现有证据：Inventory OS 00_Config.gs 的 SPREADSHEET_ID 目前为
 * 空（bound to active spreadsheet），IDENTITY_REGISTRY 与 TASKS
 * 两张共享表因此物理上位于 Inventory OS 自己的 Spreadsheet 内，
 * 生态系统内没有任何已验证的跨项目 Spreadsheet 访问先例。
 *
 * Decision
 * ------------------------------------------------------------
 * 拆成两个独立子决定，不合并成一个"独立/不独立"的二元问题：
 *
 * (a) Runtime 边界：Procurement OS 是独立的 GAS 项目/脚本容器。
 *     不依赖 Inventory OS 的 Runtime 运行，不与 Inventory OS
 *     共用同一个 Apps Script 代码库。两者之间只有 request/event
 *     层面的往来（经各自 Bridge），没有代码调用依赖：
 *
 *       Inventory GAS Project
 *               │
 *               │ request/event（经 Bridge）
 *               ▼
 *       Procurement GAS Project
 *
 * (b) Persistence 边界：暂时（temporarily）共享同一个"生态系统
 *     Spreadsheet"（即 IDENTITY_REGISTRY / TASKS 现在所在的那个
 *     Spreadsheet），同时严格维持表级归属——Procurement OS 自己
 *     的脚本只直接读写 PROCUREMENT_REQUESTS / PROC_LEDGER 两张
 *     新表，对 IDENTITY_REGISTRY / TASKS 一律只能经既有的
 *     00_Capability_Identity.gs 接口 / Bridge 接口访问，不允许
 *     绕过接口直接操作这两张表的原始行。
 *
 * Alternatives Considered
 * ------------------------------------------------------------
 * A. 独立 Spreadsheet：Procurement OS 拥有自己专属的 Spreadsheet，
 *    经显式 SPREADSHEET_ID 跨项目访问 IDENTITY_REGISTRY / TASKS。
 *    → 未选，但不是因为它"错"，是因为现在没有证据支持这份额外
 *    的隔离在当前数据量/使用规模下有实际收益，而跨项目访问机制
 *    本身就是一项要独立开发和验证的新工程（生态系统内目前零先例）。
 *
 * B. 暂时共享生态系统 Spreadsheet，严格维持表级归属（选定）
 *    → 见 Decision (b)。"暂时"是刻意的措辞，不是"将就"的委婉说法——
 *    真正的架构分歧只在于"数据物理上放哪"，不影响 Runtime 独立性，
 *    也不影响任何一层的职责边界，是纯粹的部署选择，可以在未来
 *    有真实理由（例如某个 Spreadsheet 接近 Google Sheets 的行数/
 *    性能上限、或需要独立备份策略）时改为 A，且改动只发生在
 *    00_Config.gs 的 SPREADSHEET_ID 与迁移脚本层面，不影响
 *    60–69 任何一个模块的业务逻辑。
 *
 * 不选"为了概念纯粹"而选 A 的具体理由（呼应使用者原始指令
 * "Do not choose merely for conceptual purity"）：即使 Runtime
 * 独立，只要 Procurement 还需要读 IDENTITY_REGISTRY / 写 TASKS，
 * 就必须有一条跨项目访问路径——选 A 只是把这条路径从"同一个
 * Spreadsheet 内的另一张表"换成"另一个 Spreadsheet"，工程复杂度
 * 不会因此消失，反而多了一个需要独立管理的 Spreadsheet ID 与
 * 权限边界，而 Procurement 自己的数据量（采购请求）现阶段远不足
 * 以构成需要物理隔离的理由。
 *
 * Decision Criteria
 * ------------------------------------------------------------
 * UEF persistence ownership 精神（每个 Domain OS 拥有自己的
 * 持久化边界）→ 表级归属已经满足这一点，不需要物理 Spreadsheet
 * 级别的隔离来达成同样的治理效果
 * 反过早工程化（EP3）→ B：没有证据支持现在就做物理隔离
 * 工程成本 → B 更低：不需要新增跨项目访问先例
 * 未来可逆性 → B 可逆（迁移到 A 只动 Config，不动业务逻辑）；
 * 如果先选 A 再发现不需要，反向合并的成本更高（需要处理两个
 * Spreadsheet 历史数据的合并）
 *
 * Consequences
 * ------------------------------------------------------------
 * 正面：
 *   - Procurement OS 的 00_Config.gs 只需要一个
 *     SpreadsheetApp.openById() 就能访问自己的表和共享的
 *     Capability 表，管理简单
 *   - 不给生态系统凭空新增一个尚无先例的"跨项目访问模式"，
 *     等真正需要时（A 的触发条件出现）再一次性设计好，而不是
 *     现在猜一个可能用不上的方案
 *
 * 负面（不刻意隐藏）：
 *   - Procurement OS 的数据与 Inventory OS/其他生态系统数据physically
 *     共享同一个 Spreadsheet，意味着这个 Spreadsheet 的可用性/
 *     配额/大小限制是所有共享方的共同风险——如果 Inventory OS
 *     的数据量意外暴涨，Procurement OS 会被动受影响
 *   - "暂时"如果没有人主动跟踪，容易变成事实上的永久——本 ADR
 *     的 Review Trigger 是防止这一点的具体机制，不是一句空话
 *
 * Impact
 * ------------------------------------------------------------
 * 00_Config.gs（实现阶段产出）需要显式
 * SpreadsheetApp.openById(ecosystemSpreadsheetId)，不能用
 * bound-script 的隐式 active spreadsheet 模式（因为 Procurement
 * 是独立脚本容器，不 bound 到这个 Spreadsheet）。
 *
 * Next Steps
 * ------------------------------------------------------------
 * 1. 实现阶段：确认 ecosystemSpreadsheetId 的实际值（需要 Steven
 *    提供或确认 Inventory OS 当前 Spreadsheet 的 ID）
 * 2. 00_Setup.gs 建 PROCUREMENT_REQUESTS/PROC_LEDGER 两张表时，
 *    确认与 IDENTITY_REGISTRY/TASKS/INVENTORY 等现有表不冲突
 *    （不同 sheet 名，不共用列结构）
 *
 * Review Trigger
 * ------------------------------------------------------------
 * 当共享 Spreadsheet 出现真实的规模/性能/可用性问题，或
 * Procurement OS 需要独立的备份/恢复策略时，重新评估迁移到
 * Alternative A（独立 Spreadsheet）。不因为"感觉更干净"而主动
 * 触发这次迁移。
 *
 * Related ADRs
 * ------------------------------------------------------------
 * 完成 ADR-000 中被显式搁置的"deployment independence"标准。
 */

/* ============================================================
 * ADR-003 — Bridge Idempotency / Replay Safety
 * ============================================================
 * Status: Accepted (2026-09-09)
 *
 * Context
 * ------------------------------------------------------------
 * 使用者原始任务指令明确要求幂等性设计"必须在实现阶段开始之前
 * 就成立，不能事后补"。69_ProcurementBridge.receiveFromInventory()
 * 作为唯一对外入口，必须能容忍重试、重复投递、超时重试、replay、
 * 灾难恢复、重复回调、人工重新处理，且不产生重复的业务写入。
 * 已知约束（Q3）：Inventory OS 今天的 payload
 * { itemId, identityId, itemName, urgency } 不含任何时间戳或
 * 事件级 correlation ID，本 ADR 的方案必须在这个约束下work，
 * 不能假设上游会提供本来没有的字段。
 *
 * Decision
 * ------------------------------------------------------------
 * idempotency_key = source_domain + ':' + source_reference + ':'
 *                   + urgency（例：'Inventory:item_042:CRITICAL'）
 *
 * 由 61_ProcurementNormalizer 计算，随 NormalizedProcurementRequest
 * 一起传递。真正的幂等检查与写入，在
 * 65_ProcurementExecution.executeIntake() 的持锁临界区内完成：
 *
 *   收到候选请求 → 加锁 → 查询 PROCUREMENT_REQUESTS 是否已有
 *   相同 idempotency_key 且状态非终态（非
 *   CLOSED/CANCELLED/REJECTED/EXPIRED）的记录 →
 *     存在 → 直接返回既有 request_id 现状，不新建事件
 *     不存在 → 写入新 REQUESTED 记录（含该 idempotency_key）→
 *              触发 PROCUREMENT_REQUESTED 事件 → 释放锁
 *
 * 检查与写入在同一把 LockService 脚本锁内完成，天然满足"两个
 * 并发执行不能同时通过检查"的要求——第二个执行只有在第一个已经
 * 释放锁（此时新记录已经连同 idempotency_key 一起写入）之后才能
 * 拿到锁，它的检查会正确看到"已存在"。
 *
 * 已知局限（如实记录）：这个 key 的去重范围是"同一 identity 在
 * 同一 urgency 下，只要还有未终态的请求就不再新建"，不是真正的
 * "这次 HTTP 调用是否发生过"的传递级去重——这个局限来自上游
 * 数据本身缺少 correlation ID（Q3），不是本 ADR 能够单方面解决
 * 的问题。CacheService 可加在这个流程前面做快速路径优化，但
 * 不是权威判断来源，见 Alternatives C。
 *
 * Alternatives Considered
 * ------------------------------------------------------------
 * A. 要求 Inventory OS 提供真正的 correlation_id / event_id
 *    → 拒绝（本次范围内）。直接违反 Q3 的决定——"不因为丰富
 *    Procurement 自己的能力就去修改 Inventory OS"。列入 Review
 *    Trigger，作为未来 Inventory OS 迭代时的候选改进。
 *
 * B. "if exists then return"，查询与写入分离，不在锁内
 *    → 拒绝。使用者原始任务指令明确点名这种写法"没有考虑并发
 *    执行"，是被明确排除的反例——两个几乎同时的请求都可能在
 *    查询时看到"不存在"，然后都各自写入，产生重复。
 *
 * C. 纯 CacheService 短期缓存去重（类似 Inventory OS 自己
 *    Telegram webhook 的 120 秒模式）
 *    → 部分採纳，但不作为唯一机制。CacheService 会过期，无法
 *    满足"recovery"、"manual reprocessing"这类可能发生在数小时/
 *    数天之后的重放场景。採纳为 Decision 里"查询前的快速路径"，
 *    但权威判断落在持久化表查询 + 锁，不单独依赖缓存。
 *
 * D. 基于 identity_id + source_domain + urgency 的持久化查询 +
 *    锁内原子检查（选定，即 Decision）
 *    → 见 Decision。
 *
 * Decision Criteria
 * ------------------------------------------------------------
 * 是否满足"不产生重复业务写入"这一硬约束 → 只有 C+D 组合
 * （即 Decision）满足；B 不满足（有竞态窗口）
 * 是否需要修改 Inventory OS → D 不需要；A 需要（被 Q3 排除）
 * 是否满足 recovery/manual reprocessing 的长窗口容忍 → D 满足
 * （持久化查询不过期）；纯 C 不满足
 *
 * Consequences
 * ------------------------------------------------------------
 * 正面：
 *   - 不需要修改 Inventory OS 即可实现有意义的幂等保护
 *   - 幂等检查与 P6 的 Check/Use 同临界区原则共用同一套锁纪律，
 *     没有为幂等性单独发明一套新的并发处理模式
 *
 * 负面（不刻意隐藏）：
 *   - 去重精度受限于上游缺少 correlation ID（如实记录，见
 *     Decision 的"已知局限"），理论上存在一个极端场景：同一
 *     identity 同一 urgency 的请求被合法地终态关闭后、极短时间
 *     内又合法地重新触发，这时新请求会被正常放行（这是期望行为，
 *     不是 bug），但如果终态关闭发生在与新请求几乎同一事务窗口，
 *     理论上有极窄的边界条件需要实现时用真实测试验证，本 ADR
 *     不假装已经用代码证明了这个边界完全无懈可击
 *
 * Impact
 * ------------------------------------------------------------
 * PROCUREMENT_REQUESTS 新增 idempotency_key 列（Constitution
 * 六）。65_ProcurementExecution 新增 executeIntake() 入口
 * （File_Map 65 节）。
 *
 * Next Steps
 * ------------------------------------------------------------
 * 1. 实现阶段：executeIntake() 的查询实现（按 idempotency_key
 *    过滤非终态记录）需要真实并发测试验证（手动，对齐 Steven
 *    测试哲学）
 * 2. 记录为 Inventory OS 未来迭代的候选项：若 Inventory OS 未来
 *    版本开始提供真正的 correlation_id，本 ADR 的去重精度应该
 *    直接升级，不需要重新设计架构
 *
 * Review Trigger
 * ------------------------------------------------------------
 * 当 Inventory OS（或任何未来来源域）开始提供真正的事件级
 * correlation ID 时，重新评估 Alternative A 是否此时应该採纳，
 * 升级 idempotency_key 的唯一性精度。
 *
 * Related ADRs
 * ------------------------------------------------------------
 * 建立在 ADR-000 之上；执行侧的锁纪律与 ADR-001 共享同一原则
 * （P6），检查对象不同。
 */
