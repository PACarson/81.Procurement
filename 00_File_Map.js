/**
 * ============================================================
 * PROCUREMENT OS V0.1 — 00_File_Map.gs
 * ============================================================
 * Version      : V0.1 (Architecture Initialization — NO files below
 *                exist as code yet; this maps the PLANNED structure)
 * Last Updated : 2026-09-07
 * Standard     : Domain OS Lifecycle Standard (9 layers + Core +
 *                1 Procurement-specific confirmation boundary),
 *                inherited from Inventory OS V4.1 — see Constitution
 *                八、治理基线声明 / ADR-000.
 *
 * 状态图例（每个文件后标注）：
 *   [PLANNED]     — 本文件已设计（本 File_Map 内有完整规格），
 *                   尚未写一行代码
 *   [IMPLEMENTED — Slice 1] — 2026-09-10 已实际写出并通过
 *                   12/12 项 test-harness.js 验证（真实执行，
 *                   非断言）；真实 GAS 环境的并发行为仍未验证，
 *                   见 State §9 Risk Register H1/H3
 *   [EXISTS]      — 代码已存在（本仓库里没有任何一个 60–69 文件
 *                   处于这个状态）
 *   [STUB-UPSTREAM] — 不属于 Procurement OS 自己的文件，但
 *                   Inventory OS 一侧已有对应的 stub 调用点
 * ============================================================
 */

/* ============================================================
 * 一、CORE CAPABILITY 依赖（跨 OS 共享，不属于本仓库，不复制）
 * ============================================================
 *
 * 00_Capability_Identity.gs   [EXISTS — 属于 Inventory OS 仓库]
 *   - 复用方式：Procurement OS 的 61_ProcurementNormalizer.gs
 *     直接调用 CapabilityIdentity.resolve(rawName, 'Procurement')
 *     / .get(identityId)
 *   - 治理归属：不因为 Procurement OS 用它就改变其治理归属——
 *     它仍然是 Inventory OS 仓库内的 Core Capability 文件
 *     （见 Constitution 三、）
 *   - 前提未决：物理部署问题（同一 Spreadsheet vs 独立项目）
 *     见 Constitution 九、Q2
 *
 * 00_Capability_Policy.gs     [不复用 — 见 Constitution 三、理由]
 */

/* ============================================================
 * 二、DOMAIN FILES（Procurement OS 专属，60–69）—— Slice 1 范围
 *    内（60/61/62/63/64/65/66/67/69）已 [IMPLEMENTED]；
 *    68_ProcurementInsights 按计划维持 [PLANNED]（State §6）
 * ============================================================
 *
 * 60_ProcurementRequest.gs         [S1 Request] [IMPLEMENTED — Slice 1]
 * ------------------------------------------------------------
 *   Purpose      入站请求的唯一入口。接收来自 69_ProcurementBridge
 *                （代表某个 Domain Adapter，目前只有 Inventory）
 *                的原始 payload，以及未来可能的人工请求入口
 *                （Telegram 命令，如 /procure <item> <qty>）。
 *   Owner        自己的 PROCUREMENT_REQUESTS 表初始行不由本文件
 *                写入——本文件零业务逻辑，零 Sheet 写入。
 *   Inputs       receiveRequest(sourceDomain, rawPayload)
 *                receiveManualRequest(rawText, actorId)
 *   Outputs      调用 61_ProcurementNormalizer.normalize(...)，
 *                原样透传，不做任何字段校验或改写
 *   Dependencies 下游：61_ProcurementNormalizer
 *                上游调用方：69_ProcurementBridge（代表各 Adapter）
 *   Persistence  无（零副作用层）
 *   Public API   receiveRequest(sourceDomain, rawPayload)
 *                receiveManualRequest(rawText, actorId)
 *                resetRequestCache()（对齐 Inventory A11 请求级
 *                缓存重置模式，即使本层自己无缓存，也统一在入口
 *                调用下游各层的 resetRequestCache()）
 *   Forbidden    禁止调用 CapabilityIdentity；禁止做任何字段
 *                校验/清洗（那是 Normalizer 的职责）；禁止写
 *                Sheet；禁止直接调用 Decision 或更下游模块
 *   Testing      纯路由逻辑，用手动 checklist 验证（不同来源域
 *                的 payload 都能正确路由到 Normalizer），不需要
 *                独立单元测试覆盖业务规则（本层没有业务规则）
 *
 * 61_ProcurementNormalizer.gs      [S2 Normalizer] [IMPLEMENTED — Slice 1]
 * ------------------------------------------------------------
 *   Purpose      把任意来源域的原生 payload 映射为标准
 *                ProcurementRequest Contract（Constitution 五、
 *                5.1），校验必填字段，触发 Identity 解析
 *   Inputs       normalize(sourceDomain, rawPayload) —— 内部按
 *                sourceDomain 分派到对应的私有 _mapFromXxx() 
 *                映射函数（当前只有 _mapFromInventory()）
 *   Outputs      normalize() → NormalizedProcurementRequest |
 *                抛出校验错误（缺必填字段等）
 *   Dependencies 调用 CapabilityIdentity.resolve()（唯一允许
 *                调用 Identity 的 Procurement 模块，对齐
 *                Constitution P2）；下游：62_ProcurementPlanner
 *   Persistence  无（零副作用层，不写 Sheet）
 *   Public API   normalize(sourceDomain, rawPayload)
 *                → NormalizedProcurementRequest
 *   Forbidden    禁止做聚合/去重判断（那是 Planner 的职责）；
 *                禁止做是否推荐/urgency 升降级判断（那是
 *                Decision 的职责）；禁止写 Sheet
 *   Testing      纯函数，适合自动化单元测试：给定各种残缺/畸形
 *                rawPayload，验证校验错误正确抛出；给定合法
 *                Inventory payload，验证映射结果字段完全符合
 *                5.1 契约
 *
 * 62_ProcurementPlanner.gs         [S3 Planner] [IMPLEMENTED — Slice 1]
 * ------------------------------------------------------------
 *   Purpose      按 identity_id 聚合同一物品的多笔待处理请求
 *                （例如同一天 Inventory 对同一物品连续发了 2 次
 *                CRITICAL 信号），构建候选 Plan（预览），不做
 *                最终决策
 *   Inputs       plan(normalizedRequest, pendingRequestsForSameIdentity)
 *   Outputs      plan() → PlanObject { identity_id, mergedQuantity,
 *                highestUrgency, contributingRequestIds[], ... }
 *   Dependencies 读取 67_ProcurementProjection 取得同一
 *                identity_id 目前仍处于非终态（REQUESTED/PLANNED/
 *                AWAITING_CONFIRMATION/CONFIRMED——不含
 *                CLOSED/CANCELLED/REJECTED/EXPIRED）的其他请求
 *                （用于聚合判断）。【2026-09-11 修正】不再按
 *                source_domain 过滤——早期版本只在同一来源域内
 *                找 sibling，导致 Inventory 已开的请求和同一
 *                物品的 Manual 请求互相看不见对方，这是这轮
 *                closeout 测试（#14）才发现的真实缺口，不是原始
 *                检查清单要求的项目。识别范围扩大不影响
 *                idempotency_key（那个仍然按 source_domain 分，
 *                未改动）——两者是不同层次的机制，见 Constitution
 *                五、5.5 与 ADR-003 关于两者关系的说明。
 *                下游：63_ProcurementDecision
 *   Persistence  只读（经 Projection，不直接读 PROC_LEDGER 或
 *                PROCUREMENT_REQUESTS 原始表）
 *   Public API   plan(normalizedRequest, context)
 *   Forbidden    绝不调用 CapabilityIdentity；绝不计算 urgency
 *                以外的风险判断；绝不写 Sheet；绝不产出"最终"
 *                数量——mergedQuantity 仍是预览值，真正的
 *                decided_quantity 由 Decision 产出
 *   Testing      纯函数（给定候选请求列表 → 聚合结果），自动化
 *                单元测试覆盖："同一 identity 多笔请求应合并"、
 *                "不同 identity 不应合并"、"已 CLOSED 的请求不
 *                参与聚合"等场景
 *
 * 63_ProcurementDecision.gs        [S4 Decision] [IMPLEMENTED — Slice 1]
 * ------------------------------------------------------------
 *   Purpose      decide()：是否值得进入 User Confirmation 流程、
 *                建议数量/时机——仅为预览，用于 Execution 加锁前
 *                的 fast-fail 提示。recompute()：Execution 持锁、
 *                重新读取权威状态后调用，产出真正可信的结果
 *                （对齐 Inventory OS HIGH2 修复经验，P6）
 *   Inputs       decide(plan) / recompute(freshRequestRow, plan)
 *   Outputs      DecisionObject { recommend: boolean,
 *                decidedQuantity, decidedUrgency, rationale }
 *   Dependencies 无（本仓库暂不设 Core Capability Policy，决策
 *                公式内聚于此，见 Constitution 三、理由）；
 *                下游：64_ProcurementUserConfirmation（当
 *                recommend=true 时）
 *   Persistence  无（零副作用层，对齐 Inventory OS S4 "Decision
 *                架构定位=零副作用、纯函数"）
 *   Public API   decide(plan) / recompute(freshRequestRow, plan)
 *   Forbidden    绝不写 Sheet；绝不自行加锁（对齐 Inventory OS
 *                DD6 的理由：加锁属于 Execution 职责范畴，让
 *                Decision 保持纯函数，未来其他 Domain OS 复制
 *                这套 Decision/Execution 分工时不用重新判断
 *                "这次要不要在 Decision 里加锁"——这条理由对
 *                Procurement OS 同样适用，是本文件直接沿用它
 *                的原因）；绝不把 status 设为 CONFIRMED（那是
 *                UserConfirmation 唯一的职责，P4/C14）
 *   Testing      纯函数，自动化单元测试覆盖决策规则的边界条件
 *                （urgency=CRITICAL 是否总是 recommend=true、
 *                estimated_quantity 异常值处理等）
 *
 * 64_ProcurementUserConfirmation.gs  [S4.5，Procurement 专属新增层]
 * ------------------------------------------------------------  [IMPLEMENTED — Slice 1]
 *   Purpose      P4/P9/ADR-001 的具体实现载体，渠道无关（Q4）。
 *                把 Decision 的 recommend=true 结果连同一份不可
 *                变快照（identity_id/decided_quantity/urgency）
 *                一起呈现给用户，并且是唯一能把结果记录为
 *                CONFIRM/REJECT/EXPIRE 三种之一的模块。自己不
 *                知道"Telegram"——实际收发交给下面的 Telegram
 *                Adapter 子组件，未来加 Web/Mobile 等新渠道只是
 *                新增一个平行 Adapter，本模块的状态与规则不变。
 *                这是本文件与 Inventory OS S1-S9 标准相比唯一
 *                新增的一层——Inventory 自己的 Decision/Execution
 *                从不需要人类在"决定"和"执行"之间批准一次，
 *                Procurement 因为涉及真实采购承诺，必须有
 *   Inputs       promptConfirmation(requestId, decisionSnapshot)
 *                recordUserResponse(requestId, actorId, response)
 *                — response ∈ {CONFIRM, REJECT, EXPIRE}
 *                checkExpiry(requestId) — 由定时触发器调用，
 *                超过 Constitution 九、D1 时限未响应则产出
 *                response=EXPIRE
 *   Outputs      recordUserResponse() →
 *                ConfirmationRecord { requestId, response, actorId,
 *                respondedAt, confirmedSnapshot }（预览性质，
 *                Execution 仍需重新校验，confirmedSnapshot 就是
 *                呈现时那份快照，供 Execution 比对 P9 的"实质
 *                变化"判断）
 *   Dependencies 经 Telegram Adapter（本模块子组件，经
 *                69_ProcurementBridge 的通用收发能力发消息，但
 *                CONFIRM/REJECT/EXPIRE 的判定逻辑属于本模块，
 *                不属于 69）；下游：65_ProcurementExecution 读取
 *                （不是"调用"）本模块产出的 ConfirmationRecord
 *   Persistence  ConfirmationRecord 可暂存于请求级内存缓存，
 *                真正落盘由 Execution 完成（对齐 P6：Check 与
 *                Use 同一临界区）
 *   Public API   promptConfirmation(requestId, decisionSnapshot)
 *                recordUserResponse(requestId, actorId, response)
 *                checkExpiry(requestId)
 *   Forbidden    绝对禁止任何代码路径在未收到真实用户输入的情况
 *                下自动产出 response=CONFIRM（P4，最高优先级
 *                原则；EXPIRE 是系统在超时后产生的，但产出的是
 *                "未确认"的事实，不是伪造一个 CONFIRM）；绝不
 *                直接写 PROCUREMENT_REQUESTS 的 status 字段——
 *                那仍是 Execution 的职责；Telegram Adapter 子
 *                组件绝不允许绕过本模块直接判定确认结果——渠道
 *                只负责传话，不负责裁决（Q4）
 *   Testing      response 记录逻辑、快照比对逻辑可自动化测试；
 *                Telegram 收发与超时触发的实际链路必须手动测试
 *                （I/O 依赖，对齐 Steven 的测试哲学：纯逻辑
 *                自动化 + I/O 手动 checklist）
 *
 * 65_ProcurementExecution.gs       [S5 Execution] [IMPLEMENTED — Slice 1]
 * ------------------------------------------------------------
 *   Purpose      唯一写 PROCUREMENT_REQUESTS 表的层；唯一
 *                LockService 脚本锁持有者。两条入口路径：
 *                (a) intake 路径（新请求进入时）：加锁 → 用
 *                    idempotency_key 查是否已有同一请求的非终态
 *                    记录（C15/P10/ADR-003）→ 已存在则直接返回
 *                    既有结果不新建；不存在则写入 REQUESTED →
 *                    释放锁
 *                (b) confirmation 路径：加锁 → 重新读取该请求的
 *                    权威状态 → 重新校验 64 层记录的
 *                    ConfirmationRecord 是否真的是 CONFIRM，且
 *                    其 confirmedSnapshot 与当前权威状态一致
 *                    （P9 实质变化检查——不一致则不执行，改写
 *                    回 AWAITING_CONFIRMATION 并记录原因）→
 *                    一致才调用 63_ProcurementDecision.recompute()
 *                    取得权威 DecisionObject → 写入 → 释放锁
 *                两条路径都完整对齐 Inventory OS C12/A10
 *                "加锁→重读→recompute()→写入→释放锁"固定顺序
 *   Inputs       executeIntake(candidateRequest, idempotencyKey)
 *                executeConfirmed(requestId) /
 *                executeRejected(requestId) /
 *                executeExpired(requestId) /
 *                executeCancelled(requestId, reason)
 *   Outputs      写入 PROCUREMENT_REQUESTS 权威行；调用
 *                66_ProcurementEvents.record(...)；调用
 *                69_ProcurementBridge 创建/更新 Task
 *   Dependencies 63_ProcurementDecision.recompute()；
 *                64_ProcurementUserConfirmation（只读其记录，
 *                不调用其函数触发新逻辑）；
 *                66_ProcurementEvents.record()；
 *                69_ProcurementBridge（Task 创建、状态通知）
 *   Persistence  PROCUREMENT_REQUESTS（写，含 idempotency_key 与
 *                confirmed_snapshot_json 两列）；触发 PROC_LEDGER
 *                （经 Events 写，同一临界区）
 *   Public API   executeIntake(candidateRequest, idempotencyKey)
 *                executeConfirmed(requestId)
 *                executeRejected(requestId)
 *                executeExpired(requestId)
 *                executeCancelled(requestId, reason)
 *   Forbidden    绝不信任任何上游模块产出的"预览"值直接写入——
 *                必须重新读取+recompute()（P6）；绝不允许
 *                66/69 的相关函数在本层释放锁之后、或在本层
 *                加锁之前被调用（C12）；绝不在 intake 路径的
 *                幂等检查与写入之间释放锁（C15——检查和写入必须
 *                是同一个临界区，不能查完就放锁再决定要不要写）
 *   Testing      两条入口路径的加锁/重读/写入顺序都需要手动并发
 *                测试（对齐 Inventory OS 的手动并发验证方式：
 *                两个几乎同时的执行，确认不会有请求被覆盖、
 *                重复创建、或用旧快照放行新提案）；纯计算部分
 *                （不含锁）可自动化测试
 *
 * 66_ProcurementEvents.gs          [S6 Events] [IMPLEMENTED — Slice 1]
 * ------------------------------------------------------------
 *   Purpose      不可变 Ledger（PROC_LEDGER）。记录 8 种固定
 *                事件类型（Constitution 五、5.3）
 *   Inputs       record(eventType, requestId, identityId, actor, contextJson)
 *   Outputs      getEvents(requestId) → events[]
 *   Dependencies 无出站依赖；被 65_ProcurementExecution 在其
 *                持锁临界区内调用
 *   Persistence  PROC_LEDGER（append-only，写）；读取时对齐
 *                Inventory OS A11 请求级缓存模式
 *   Public API   record(eventType, requestId, identityId, actor, contextJson)
 *                getEvents(requestId)
 *                replayEvents(requestId) — 仅应急
 *                rebuildProjection() — 仅 Projection 损坏时
 *                resetRequestCache()
 *   Forbidden    绝不自行调用 LockService（C12）；绝不修改或
 *                删除已写入的行
 *   Testing      record()/getEvents() 的纯逻辑部分可自动化测试；
 *                真正的 append-only 保证需要代码审查而非测试
 *                （对齐 Inventory OS 对 Ledger 不可变性的处理
 *                方式——这是架构约束，不是可测试的运行时行为）
 *
 * 67_ProcurementProjection.gs      [S7 Projection] [IMPLEMENTED — Slice 1]
 * ------------------------------------------------------------
 *   Purpose      维护 PROCUREMENT_REQUESTS 的 Read Model，是
 *                查询唯一真相来源（P5）
 *   Inputs       updateProjection(requestId, changes)
 *   Outputs      getProjection(requestId) → row
 *                listProjection(filter) → rows[]
 *                （提供给 62_ProcurementPlanner 做聚合查询）
 *   Dependencies 被 65_ProcurementExecution 调用（更新）；被
 *                62_ProcurementPlanner 调用（只读查询）；
 *                pub/sub 通知 68_ProcurementInsights
 *   Persistence  PROCUREMENT_REQUESTS（读写，作为 Read Model）
 *   Public API   updateProjection(requestId, changes)
 *                getProjection(requestId)
 *                listProjection(filter)
 *                notifySubscribers(requestId, data)
 *   Forbidden    绝不是唯一数据来源——权威事实永远是 PROC_LEDGER
 *                经 replay 能重建出的状态；Projection 本身可以
 *                重建（rebuildProjection()）
 *   Testing      查询逻辑可自动化测试；与 Execution 的更新时序
 *                需手动验证
 *
 * 68_ProcurementInsights.gs        [S8 Insights] [PLANNED]
 * ------------------------------------------------------------
 *   Purpose      Projection 订阅者，只读分析——例如"哪些物品
 *                最常触发采购"、"从 CRITICAL 信号到 CLOSED 的
 *                平均耗时"
 *   Inputs       onUpdate(requestId, projectionData) — 订阅回调
 *   Outputs      generateFrequencyReport() / detectSlowFulfillments()
 *                等分析函数（V0.1 阶段可以只定义接口，不实现，
 *                对齐反过早工程化 EP3——Procurement OS 目前连
 *                实现代码都还没有，Insights 的具体分析需求应该
 *                等真实数据出现后再设计）
   Dependencies 67_ProcurementProjection（pub/sub 订阅）
 *   Persistence  只读，不回写 Ledger / Projection
 *   Public API   onUpdate(requestId, projectionData)
 *   Forbidden    绝不阻塞主流程（Pub/Sub 异步）；绝不在主流程
 *                中被直接调用（C10）
 *   Testing      V0.1 阶段无需测试（未实现）；未来实现后对齐
 *                Inventory OS 28_InventoryInsights 的测试模式
 *
 * 69_ProcurementBridge.gs          [S9 Bridge] [IMPLEMENTED — Slice 1]
 * ------------------------------------------------------------
 *   Purpose      唯一对外窗口。接收 Inventory OS（及未来其他
 *                Domain OS）的入站请求；创建/更新 TASKS；经
 *                Telegram 发送 User Confirmation 提示与状态通知
 *   Inputs       receiveFromInventory(payload) —— 与 Inventory
 *                OS 29_InventoryBridge.gs 注释里已经写好的
 *                "future: ProcurementBridge.receiveFromInventory
 *                (payload)" 直接对应，这不是本文件凭空创造的
 *                函数名，是姊妹系统代码里已经预留的调用点
 *   Outputs      调用 60_ProcurementRequest.receiveRequest(...)
 *   Dependencies 上游：Inventory OS 29_InventoryBridge.gs
 *                （STUB-UPSTREAM——对方目前只调用 console.log，
 *                真正接线需要 Inventory OS 一侧也更新——记录为
 *                Inventory OS 未来迭代事项，非本次范围，见
 *                Constitution 五、5.2）；下游：
 *                60_ProcurementRequest；TASKS 表；Telegram
 *                （运输层）
 *   Persistence  TASKS（写，source_system='ProcurementOS'）
 *   Public API   receiveFromInventory(payload)
 *                createOrUpdateTask(requestId, ...)
 *                sendTelegramMessage(chatContext, message) — 纯
 *                运输层发送，不判断消息内容的业务含义；64 层的
 *                Telegram Adapter 子组件调用这个函数发消息，
 *                但 CONFIRM/REJECT/EXPIRE 的判定逻辑留在 64
 *                自己那里，不下放到本函数（Q4：渠道只管传话）
 *                resetRequestCache()
 *   Forbidden    不含业务逻辑，不含 Decision 逻辑，不含
 *                CONFIRM/REJECT/EXPIRE 判定逻辑（那属于 64，
 *                Q4）；绝不自行加锁（C12）
 *   Testing      纯路由/IO 部分手动测试（Telegram 收发、Task
 *                创建去重）；payload 映射部分可自动化测试
 */

/* ============================================================
 * 三、治理 / 共享 FILES
 * ============================================================
 *
 * 00_Project_Constitution.gs  — 架构契约（最高治理文件）[EXISTS]
 * 00_Project_State.gs         — 进度 / 决策记录 / 下一步 [EXISTS]
 * 00_File_Map.gs               — 本文件 [EXISTS]
 * 00_ADR.gs                    — ADR 索引（ADR-000, ADR-001...）[EXISTS]
 * 00_Config.gs                 — [IMPLEMENTED — Slice 1]
 *                                 PROC_CONFIG（R/L 列映射、9 态、
 *                                 9 事件类型、超时/容忍度参数）+
 *                                 本地 _procNow/_procEsc/
 *                                 _reserveIdBlock。唯一未定：
 *                                 SPREADSHEET_ID 留空待 Steven
 *                                 提供真实值（ADR-002 已定方向，
 *                                 差的是具体 ID，不是架构决定）
 * 00_Setup.gs                  — [IMPLEMENTED — Slice 1]
 *                                 setupProcurementOS()（幂等，
 *                                 依赖 IDENTITY_REGISTRY/TASKS 已
 *                                 存在才继续，建表时对全部时间戳
 *                                 列强制 setNumberFormat('@')）+
 *                                 smokeTestProcurementOS()（对齐
 *                                 Inventory OS 的手动核对风格）。
 *                                 均已用 Node 伪造 GAS 环境实际
 *                                 跑过，见 State §9
 *
 * ============================================================
 * 四、模块关系图
 * ============================================================
 *
 *   Inventory OS 29_InventoryBridge (STUB-UPSTREAM，独立 GAS
 *   Project，经 request/event 往来，非代码依赖 —— ADR-002)
 *   Future: Property OS / Finance OS / Manual Telegram command
 *        │
 *        ▼
 *   69_ProcurementBridge            [S9] receiveFromInventory()
 *        │
 *        ▼
 *   60_ProcurementRequest           [S1] (零业务逻辑)
 *        │
 *        ▼
 *   61_ProcurementNormalizer        [S2] ──► 00_Capability_Identity
 *        │        │                          (Inventory OS 仓库，
 *        │        │                          经共享 Spreadsheet
 *        │        │                          访问 —— ADR-002)
 *        │        └─计算 idempotency_key（5.5）
 *        ▼
 *   62_ProcurementPlanner           [S3]  (聚合/去重，读 Projection)
 *        │
 *        ▼
 *   63_ProcurementDecision          [S4]  decide()=预览
 *        │
 *        ▼ (recommend=true 时)
 *   64_ProcurementUserConfirmation  [S4.5]  渠道无关 Core
 *        │        └── Telegram Adapter（子组件，经 69 传话，
 *        │             CONFIRM/REJECT/EXPIRE 判定留在 64 —— Q4）
 *        │  (等待真实用户输入，或超时 EXPIRE)
 *        ▼
 *   65_ProcurementExecution         [S5]  ★唯一加锁点★
 *        │   intake路径：加锁→查idempotency_key→已存在则返回
 *        │              既有结果/否则写入REQUESTED→释放锁（ADR-003）
 *        │   confirmation路径：加锁→重读→重新校验confirmation
 *        │              是否针对当前快照（P9）→recompute()→
 *        │              写入→释放锁
 *        ▼
 *   66_ProcurementEvents            [S6]  (PROC_LEDGER, append-only,
 *        │                                 无自身锁，9 种事件类型)
 *        ▼
 *   67_ProcurementProjection        [S7]  (Read Model)
 *        │ pub/sub
 *        ├──► 68_ProcurementInsights [S8]  (side branch, non-blocking)
 *        │
 *        ▼
 *   69_ProcurementBridge             [S9]  (Task 创建/更新，
 *                                           Telegram 运输层，
 *                                           无自身锁)
 *        ├──► TASKS（经共享 Spreadsheet —— ADR-002）
 *        ├──► Telegram（运输层，业务判定不在这里 —— Q4）
 *        └──► (future) 实际下单执行 adapter
 *
 *   依赖方向：60→61→[C:Identity]→62→63→[64]→65→66→67→69
 *             67 pub/sub→68（非阻塞）
 *   低编号不依赖高编号；69 是唯一对外窗口（入站与出站都经过它）。
 *   锁的方向：只有 60→...→65 这条链路上，65 才持锁；65 之后
 *             （66/69 的相关函数）在同一临界区内被调用，不重新
 *             加锁（对齐 Inventory OS C12）。
 */
