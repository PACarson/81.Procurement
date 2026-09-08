/**
 * ============================================================
 * PROCUREMENT OS — 00_ADR.gs (Architecture Decision Record Log)
 * ============================================================
 * Last Updated : 2026-09-07
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
 * ADR-000  Procurement OS 独立成 Domain OS                 Accepted
 * ADR-001  User Confirmation 作为显式治理边界              Accepted
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
 * deployment independence   → 部分未决，见 Q2；C 在治理层面
 *                              独立，物理部署层面留待确认
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
 * 前提——如果这个决定被推翻，那三节需要重写。
 *
 * Next Steps
 * ------------------------------------------------------------
 * 1. Steven 确认或推翻 Decision（尤其是 Alternatives 里被拒绝
 *    的 D 选项——是否有本 ADR 未掌握的理由支持通用服务路线）
 * 2. 解决 Constitution 九、Q2（部署形态）
 * 3. 若确认独立部署，评估 IDENTITY_REGISTRY/TASKS 跨项目访问
 *    方案，作为独立的后续工程任务，不阻塞治理文件本身的批准
 *
 * Review Trigger
 * ------------------------------------------------------------
 * 当出现第二个真实的（非"future"占位）请求来源域（Property OS /
 * Finance OS / 手动请求功能真正上线）时，重新评估 Alternative D
 * （通用采购服务）是否此时反而是更合适的形态——届时会有真实的
 * 多租户证据，不再是本 ADR 现在这样的推测。
 *
 * Related ADRs
 * ------------------------------------------------------------
 * ADR-001（User Confirmation）建立在本 ADR 之上。
 */

/* ============================================================
 * ADR-001 — User Confirmation 作为显式治理边界
 * ============================================================
 * Status: Accepted (2026-09-07)
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
 * 采用显式 8 态状态机：
 *   REQUESTED → PLANNED → AWAITING_CONFIRMATION →
 *     { CONFIRMED | REJECTED } → EXECUTED → CLOSED
 *   （以及旁支 CANCELLED，可从 REQUESTED/PLANNED/
 *     AWAITING_CONFIRMATION 任一状态发生）
 *
 * 新增 64_ProcurementUserConfirmation.gs 作为唯一能把状态从
 * AWAITING_CONFIRMATION 推进到 CONFIRMED 或 REJECTED 的模块，
 * 且这个推进只能由真实用户经 Telegram 的响应触发（见
 * Constitution P4 / C14）。65_ProcurementExecution 在真正写入
 * 前，必须重新校验这个状态是权威的、未过期的、未被覆盖的——
 * 与 Inventory OS P6 的 Check/Use 同临界区原则完全一致，只是
 * 这里"Check"的对象从"库存数量"换成了"用户是否真的确认过"。
 *
 * 【V0.1 范围声明】没有"部分执行/完全履行"的细粒度状态
 * （ORDERED / PARTIALLY_FULFILLED / FULFILLED）——见
 * Alternatives 里对此的说明。EXECUTED 目前的语义就是"已创建
 * 交给人类处理的 Task"，不代表"已完成实际采购"。CLOSED 代表
 * "人类确认这件事完结了"，可能来自 Task 完成、也可能来自
 * Inventory 未来的补货信号间接确认——CLOSED 的确切触发机制是
 * 一个待落实的细节，不是本 ADR 需要现在解决的架构问题。
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
 *   - 依赖现有 Telegram bot 基础设施的可用性；如果 Telegram
 *     webhook 暂时不可用，AWAITING_CONFIRMATION 状态的请求会
 *     堆积，需要一个超时/提醒机制（未在本 ADR 设计，列入
 *     Next Steps）
 *
 * Impact
 * ------------------------------------------------------------
 * 64_ProcurementUserConfirmation.gs 成为 Constitution 二、
 * Lifecycle Standard 里唯一不对称于 Inventory OS S1-S9 的新增
 * 层（S4.5）。65_ProcurementExecution 的实现必须包含"重新校验
 * confirmation 状态"这一步，不可省略。
 *
 * Next Steps
 * ------------------------------------------------------------
 * 1. 确定 Telegram 确认的具体 UX（Constitution 九、Q4）
 * 2. 设计 AWAITING_CONFIRMATION 状态的超时/提醒策略（本 ADR
 *    未覆盖，是一个已知缺口，不是被忽略）
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
 */
