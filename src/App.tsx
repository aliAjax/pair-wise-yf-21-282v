import { useMemo, useState } from "react";
import "./styles.css";
import {
  Carpet,
  DAMAGE_LABEL,
  DYE_TYPES,
  ORIGINS,
  STATUS_LABEL,
  byPriority,
  initialCards,
  initialCarpets,
  initialRestorers,
  progressOf,
  shortagesOf,
  waitReasonOf,
  workloadOf,
} from "./data";

const project = {
  id: "hxyfront-62009",
  sourceNo: 2,
  port: 62009,
  title: "地毯修复纹样档案",
  prompt:
    "做一个给手工地毯修复工作室使用的纹样与修复档案前端项目，可以记录地毯产地、年代、结密度、材质、染色类型、破损区域、补线颜色和修复工序。页面需要有纹样局部标记图、修复前后记录、材料色卡、工序进度和按产地筛选的档案列表。",
};

const restorers = initialRestorers;
const ALL = "全部";

interface FormState {
  origin: string;
  yearLabel: string;
  knotDensity: string;
  material: string;
  dyeType: string;
  damageArea: string;
  damageLevel: number;
  cardId: string;
  amount: number;
}

const emptyForm: FormState = {
  origin: ORIGINS[0],
  yearLabel: "",
  knotDensity: "",
  material: "",
  dyeType: DYE_TYPES[0],
  damageArea: "",
  damageLevel: 3,
  cardId: "",
  amount: 1,
};

function restorerName(id: string | null): string {
  return restorers.find((r) => r.id === id)?.name ?? "—";
}

function App() {
  const [carpets, setCarpets] = useState<Carpet[]>(initialCarpets);
  const [cards, setCards] = useState(initialCards);
  const [filter, setFilter] = useState<string>(ALL);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [restockAmounts, setRestockAmounts] = useState<Record<string, number>>({});

  const today = new Date().toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  const queue = useMemo(
    () => carpets.filter((c) => c.status !== "done").sort(byPriority),
    [carpets],
  );
  const filtered = useMemo(
    () =>
      carpets
        .filter((c) => filter === ALL || c.origin === filter)
        .sort(byPriority),
    [carpets, filter],
  );
  const selected = carpets.find((c) => c.id === selectedId) ?? null;

  const activeCount = carpets.filter((c) => c.status !== "done").length;
  const doneCount = carpets.length - activeCount;
  const totalStock = cards.reduce((sum, c) => sum + c.stock, 0);
  const completion = carpets.length ? Math.round((doneCount / carpets.length) * 100) : 0;
  const metrics = [
    { label: "待修复", value: String(activeCount) },
    { label: "纹样档案", value: String(carpets.length) },
    { label: "色卡数量", value: String(totalStock) },
    { label: "完工率", value: `${completion}%` },
  ];

  /** 自动排期：按年代、破损程度排序，修复师当天件数满了就进等待区。 */
  const autoSchedule = () => {
    const free = new Map(
      restorers.map((r) => [r.id, r.capacity - workloadOf(carpets, r.id)]),
    );
    const waitingPool = carpets
      .filter((c) => c.status === "unscheduled" || c.status === "waiting")
      .sort(byPriority);
    if (waitingPool.length === 0) {
      setNotice("没有待排期的地毯，队列已清空。");
      return;
    }
    const assigned: string[] = [];
    const deferred: string[] = [];
    const next = carpets.map((c) => {
      if (c.status !== "unscheduled" && c.status !== "waiting") return c;
      const slot = restorers.find((r) => (free.get(r.id) ?? 0) > 0);
      if (slot) {
        free.set(slot.id, (free.get(slot.id) ?? 0) - 1);
        assigned.push(`${c.id}→${slot.name}`);
        return { ...c, status: "scheduled" as const, assignee: slot.id, waitReason: null };
      }
      deferred.push(c.id);
      return {
        ...c,
        status: "waiting" as const,
        assignee: null,
        waitReason: "修复师当日件数已满，进入等待区",
      };
    });
    setCarpets(next);
    const parts: string[] = [];
    if (assigned.length) parts.push(`已排期：${assigned.join("、")}`);
    if (deferred.length) parts.push(`进等待区：${deferred.join("、")}（当日件数已满）`);
    setNotice(parts.join("；"));
  };

  /** 手动指派修复师；对方当天满了就转入等待区。 */
  const assignTo = (carpetId: string, restorerId: string) => {
    const restorer = restorers.find((r) => r.id === restorerId);
    if (!restorer) return;
    // 件数不计入这张地毯本身，避免重复指派同一人时被误判为已满
    const load = carpets.filter(
      (c) =>
        c.id !== carpetId &&
        c.assignee === restorerId &&
        (c.status === "scheduled" || c.status === "repairing"),
    ).length;
    if (load >= restorer.capacity) {
      setCarpets(
        carpets.map((c) =>
          c.id === carpetId
            ? {
                ...c,
                status: "waiting",
                assignee: null,
                waitReason: `「${restorer.name}」当日件数已满（${load}/${restorer.capacity}），转入等待区`,
              }
            : c,
        ),
      );
      setNotice(`${carpetId}：「${restorer.name}」当日已满（${load}/${restorer.capacity}），已转入等待区。`);
      return;
    }
    setCarpets(
      carpets.map((c) =>
        c.id === carpetId
          ? { ...c, status: "scheduled", assignee: restorerId, waitReason: null }
          : c,
      ),
    );
    setNotice(`${carpetId} 已排给「${restorer.name}」（${load + 1}/${restorer.capacity}）。`);
  };

  const unassign = (carpetId: string) => {
    setCarpets(
      carpets.map((c) =>
        c.id === carpetId
          ? {
              ...c,
              status: "waiting",
              assignee: null,
              waitReason: "人工调整：撤回等待区，待重新排期",
            }
          : c,
      ),
    );
    setNotice(`${carpetId} 已撤回等待区。`);
  };

  const setStatus = (carpetId: string, status: "repairing" | "done") => {
    setCarpets(carpets.map((c) => (c.id === carpetId ? { ...c, status } : c)));
    setNotice(status === "repairing" ? `${carpetId} 开始修复。` : `${carpetId} 已完工。`);
  };

  /** 领料：余量不够只领得到的部分，余量不扣成负数，缺的等补货。 */
  const pickMaterials = (carpetId: string) => {
    const carpet = carpets.find((c) => c.id === carpetId);
    if (!carpet) return;
    const nextCards = cards.map((c) => ({ ...c }));
    const results: string[] = [];
    const nextMaterials = carpet.materials.map((m) => {
      const short = m.need - m.received;
      if (short <= 0) return m;
      const card = nextCards.find((c) => c.id === m.cardId);
      if (!card) return m;
      const take = Math.min(short, card.stock);
      card.stock -= take;
      results.push(
        take < short
          ? `「${card.name}」仅领到 ${take}/${short} 绞，缺 ${short - take} 绞等补货`
          : `「${card.name}」领齐 ${take} 绞`,
      );
      return { ...m, received: m.received + take };
    });
    if (results.length === 0) {
      setNotice(`${carpetId} 材料已领齐，无需再领。`);
      return;
    }
    setCards(nextCards);
    setCarpets(
      carpets.map((c) => (c.id === carpetId ? { ...c, materials: nextMaterials } : c)),
    );
    setNotice(`${carpetId} 领料：${results.join("；")}。`);
  };

  const restock = (cardId: string) => {
    const amount = Math.max(1, restockAmounts[cardId] ?? 3);
    const card = cards.find((c) => c.id === cardId);
    setCards(cards.map((c) => (c.id === cardId ? { ...c, stock: c.stock + amount } : c)));
    setNotice(`「${card?.name ?? cardId}」补货 ${amount} 绞，可继续领料。`);
  };

  const addCarpet = () => {
    if (!form.yearLabel.trim() || !form.damageArea.trim()) {
      setNotice("请先填写年代和破损区域再保存。");
      return;
    }
    const maxNum = carpets.reduce(
      (max, c) => Math.max(max, parseInt(c.id.replace("CAR-", ""), 10) || 0),
      0,
    );
    const id = `CAR-${String(maxNum + 1).padStart(3, "0")}`;
    const yearMatch = form.yearLabel.match(/(\d{3,4})/);
    const year = yearMatch ? parseInt(yearMatch[1], 10) : 9999;
    const amount = Math.max(1, Math.floor(form.amount) || 1);
    const carpet: Carpet = {
      id,
      origin: form.origin,
      year,
      yearLabel: form.yearLabel.trim(),
      knotDensity: form.knotDensity.trim() || "—",
      material: form.material.trim() || "羊毛",
      dyeType: form.dyeType,
      damageArea: form.damageArea.trim(),
      damageLevel: form.damageLevel,
      status: "unscheduled",
      assignee: null,
      waitReason: "新档案待排期",
      materials: form.cardId ? [{ cardId: form.cardId, need: amount, received: 0 }] : [],
    };
    setCarpets([...carpets, carpet]);
    setSelectedId(id);
    setForm({ ...emptyForm, origin: form.origin, dyeType: form.dyeType });
    setNotice(`已录入 ${id}，进入待排期队列，可在排期区自动排期。`);
  };

  const exportCsv = () => {
    const header = [
      "编号", "产地", "年代", "结密度", "材质", "染色类型", "破损区域",
      "破损程度", "状态", "修复师", "进度", "等待原因",
    ];
    const rows = carpets.map((c) => [
      c.id,
      c.origin,
      c.yearLabel,
      c.knotDensity,
      c.material,
      c.dyeType,
      c.damageArea,
      `${c.damageLevel}·${DAMAGE_LABEL[c.damageLevel] ?? ""}`,
      STATUS_LABEL[c.status],
      restorerName(c.assignee),
      `${progressOf(c)}%`,
      waitReasonOf(c, cards) ?? "",
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `地毯修复档案_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const cardName = (cardId: string) => cards.find((c) => c.id === cardId)?.name ?? cardId;
  const cardStock = (cardId: string) => cards.find((c) => c.id === cardId)?.stock ?? 0;
  const shortageByCard = (cardId: string) =>
    carpets.reduce(
      (sum, c) =>
        c.status === "done"
          ? sum
          : sum + shortagesOf(c).filter((s) => s.cardId === cardId).reduce((s, x) => s + x.short, 0),
      0,
    );

  return (
    <main className="app">
      <section className="hero">
        <p>
          {project.id} · 源提示词{project.sourceNo} · Port {project.port}
        </p>
        <h1>{project.title}</h1>
        <span>{project.prompt}</span>
      </section>

      <section className="metrics">
        {metrics.map((metric) => (
          <article key={metric.label}>
            <small>{metric.label}</small>
            <strong>{metric.value}</strong>
          </article>
        ))}
      </section>

      {notice && (
        <div className="notice">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)}>知道了</button>
        </div>
      )}

      <section className="workspace">
        <aside className="panel">
          <h2>产地筛选</h2>
          <div className="chips">
            {[ALL, ...ORIGINS].map((item) => (
              <button
                key={item}
                className={filter === item ? "active" : ""}
                onClick={() => setFilter(item)}
              >
                {item}
              </button>
            ))}
          </div>

          <h2 className="aside-gap">修复师当日产能</h2>
          <div className="sub-list">
            {restorers.map((r) => {
              const load = workloadOf(carpets, r.id);
              const full = load >= r.capacity;
              return (
                <div key={r.id} className="sub-row">
                  <div>
                    <b>{r.name}</b>
                    <small>
                      {full ? "当日已满" : "可接"} {load}/{r.capacity} 件
                    </small>
                  </div>
                  <div className="mini-bar">
                    <i
                      className={full ? "full" : ""}
                      style={{ width: `${Math.min(100, (load / r.capacity) * 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <h2 className="aside-gap">材料色卡余量</h2>
          <div className="sub-list">
            {cards.map((card) => {
              const short = shortageByCard(card.id);
              return (
                <div key={card.id} className="sub-row stock-row">
                  <div>
                    <b>{card.name}</b>
                    <small>
                      余量 {card.stock} 绞{short > 0 ? ` · 待补缺口 ${short} 绞` : ""}
                    </small>
                  </div>
                  <div className="restock">
                    <input
                      type="number"
                      min={1}
                      value={restockAmounts[card.id] ?? 3}
                      onChange={(e) =>
                        setRestockAmounts({
                          ...restockAmounts,
                          [card.id]: Math.max(1, parseInt(e.target.value, 10) || 1),
                        })
                      }
                    />
                    <button onClick={() => restock(card.id)}>补货</button>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        <section className="panel form-panel">
          <div className="heading">
            <div>
              <p>专业字段</p>
              <h2>新增记录</h2>
            </div>
            <button className="primary" onClick={addCarpet}>
              保存记录
            </button>
          </div>
          <div className="field-grid">
            <label>
              <span>地毯产地</span>
              <select
                value={form.origin}
                onChange={(e) => setForm({ ...form, origin: e.target.value })}
              >
                {ORIGINS.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </label>
            <label>
              <span>年代</span>
              <input
                placeholder="如 约1960s"
                value={form.yearLabel}
                onChange={(e) => setForm({ ...form, yearLabel: e.target.value })}
              />
            </label>
            <label>
              <span>结密度</span>
              <input
                placeholder="填写结密度"
                value={form.knotDensity}
                onChange={(e) => setForm({ ...form, knotDensity: e.target.value })}
              />
            </label>
            <label>
              <span>材质</span>
              <input
                placeholder="填写材质"
                value={form.material}
                onChange={(e) => setForm({ ...form, material: e.target.value })}
              />
            </label>
            <label>
              <span>染色类型</span>
              <select
                value={form.dyeType}
                onChange={(e) => setForm({ ...form, dyeType: e.target.value })}
              >
                {DYE_TYPES.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </label>
            <label>
              <span>破损区域</span>
              <input
                placeholder="填写破损区域"
                value={form.damageArea}
                onChange={(e) => setForm({ ...form, damageArea: e.target.value })}
              />
            </label>
            <label>
              <span>破损程度（1-5）</span>
              <select
                value={form.damageLevel}
                onChange={(e) => setForm({ ...form, damageLevel: Number(e.target.value) })}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n} · {DAMAGE_LABEL[n]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>主补线色卡</span>
              <select
                value={form.cardId}
                onChange={(e) => setForm({ ...form, cardId: e.target.value })}
              >
                <option value="">暂不登记</option>
                {cards.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}（余量 {c.stock}）
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>色卡用量（绞）</span>
              <input
                type="number"
                min={1}
                value={form.amount}
                onChange={(e) =>
                  setForm({ ...form, amount: Math.max(1, parseInt(e.target.value, 10) || 1) })
                }
              />
            </label>
          </div>
        </section>
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>按年代与破损程度排序</p>
            <h2>修复排期 · {today}</h2>
          </div>
          <button className="primary" onClick={autoSchedule}>
            自动排期
          </button>
        </div>
        <div className="records">
          {queue.map((c, index) => {
            const reason = waitReasonOf(c, cards);
            return (
              <article
                key={c.id}
                className="clickable"
                onClick={() => setSelectedId(c.id)}
              >
                <b>{String(index + 1).padStart(2, "0")}</b>
                <div>
                  <h3>
                    {c.id} <em className={`badge badge-${c.status}`}>{STATUS_LABEL[c.status]}</em>
                  </h3>
                  <p>
                    {c.origin} · {c.yearLabel} · 破损 {c.damageLevel}·
                    {DAMAGE_LABEL[c.damageLevel]} · 修复师 {restorerName(c.assignee)}
                  </p>
                  {reason && <p className="warn">{reason}</p>}
                </div>
              </article>
            );
          })}
          {queue.length === 0 && <p className="empty">队列已清空，全部完工。</p>}
        </div>
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>近期记录{filter !== ALL ? ` · ${filter}` : ""}</p>
            <h2>工作台摘要</h2>
          </div>
          <button onClick={exportCsv}>导出CSV</button>
        </div>
        <div className="records">
          {filtered.map((c, index) => {
            const reason = waitReasonOf(c, cards);
            const progress = progressOf(c);
            return (
              <article
                key={c.id}
                className="clickable"
                onClick={() => setSelectedId(c.id)}
              >
                <b>{String(index + 1).padStart(2, "0")}</b>
                <div>
                  <h3>
                    {c.id} <em className={`badge badge-${c.status}`}>{STATUS_LABEL[c.status]}</em>
                  </h3>
                  <p>
                    {c.origin} · {c.yearLabel} · {c.damageArea} · 修复师{" "}
                    {restorerName(c.assignee)}
                  </p>
                  {reason && <p className="warn">{reason}</p>}
                  <div className="progress">
                    <i style={{ width: `${progress}%` }} />
                    <span>{progress}%</span>
                  </div>
                </div>
              </article>
            );
          })}
          {filtered.length === 0 && <p className="empty">该产地暂无档案。</p>}
        </div>
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>地毯详情</p>
            <h2>{selected ? `${selected.id} · ${selected.origin}` : "未选择"}</h2>
          </div>
          {selected && (
            <em className={`badge badge-${selected.status}`}>{STATUS_LABEL[selected.status]}</em>
          )}
        </div>
        {!selected && <p className="empty">在排期区或工作台摘要中点击一条记录查看详情。</p>}
        {selected && (
          <div className="detail">
            <div className="detail-grid">
              <div>
                <small>年代</small>
                <span>{selected.yearLabel}</span>
              </div>
              <div>
                <small>结密度</small>
                <span>{selected.knotDensity}</span>
              </div>
              <div>
                <small>材质</small>
                <span>{selected.material}</span>
              </div>
              <div>
                <small>染色类型</small>
                <span>{selected.dyeType}</span>
              </div>
              <div>
                <small>破损区域</small>
                <span>{selected.damageArea}</span>
              </div>
              <div>
                <small>破损程度</small>
                <span>
                  {selected.damageLevel} · {DAMAGE_LABEL[selected.damageLevel]}
                </span>
              </div>
            </div>

            <div className="detail-block">
              <h3>工序进度</h3>
              <div className="progress tall">
                <i style={{ width: `${progressOf(selected)}%` }} />
                <span>{progressOf(selected)}%</span>
              </div>
              {waitReasonOf(selected, cards) && (
                <p className="warn">{waitReasonOf(selected, cards)}</p>
              )}
            </div>

            <div className="detail-block">
              <h3>排期调整</h3>
              <div className="row-actions">
                <select
                  value={selected.assignee ?? ""}
                  disabled={selected.status === "done"}
                  onChange={(e) => e.target.value && assignTo(selected.id, e.target.value)}
                >
                  <option value="">指派修复师…</option>
                  {restorers.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}（当日 {workloadOf(carpets, r.id)}/{r.capacity}）
                    </option>
                  ))}
                </select>
                {selected.assignee && selected.status !== "done" && (
                  <button onClick={() => unassign(selected.id)}>撤回等待区</button>
                )}
                {selected.status === "scheduled" && (
                  <button className="primary" onClick={() => setStatus(selected.id, "repairing")}>
                    开始修复
                  </button>
                )}
                {selected.status === "repairing" && (
                  <button className="primary" onClick={() => setStatus(selected.id, "done")}>
                    完工
                  </button>
                )}
              </div>
            </div>

            <div className="detail-block">
              <h3>材料领用</h3>
              {selected.materials.length === 0 && (
                <p className="empty">未登记补线色卡需求。</p>
              )}
              {selected.materials.length > 0 && (
                <>
                  <div className="material-table">
                    <div className="material-head">
                      <span>色卡</span>
                      <span>需要</span>
                      <span>已领</span>
                      <span>缺口</span>
                      <span>当前余量</span>
                    </div>
                    {selected.materials.map((m) => (
                      <div key={m.cardId} className="material-row">
                        <span>{cardName(m.cardId)}</span>
                        <span>{m.need} 绞</span>
                        <span>{m.received} 绞</span>
                        <span className={m.need - m.received > 0 ? "warn-text" : ""}>
                          {m.need - m.received > 0 ? `${m.need - m.received} 绞` : "—"}
                        </span>
                        <span>{cardStock(m.cardId)} 绞</span>
                      </div>
                    ))}
                  </div>
                  <div className="row-actions">
                    <button
                      className="primary"
                      disabled={selected.status === "done" || shortagesOf(selected).length === 0}
                      onClick={() => pickMaterials(selected.id)}
                    >
                      {selected.materials.some((m) => m.received > 0) ? "补领缺料" : "领料"}
                    </button>
                    <small className="hint">
                      余量不足时只领得到的部分，缺口等补货后再补领。
                    </small>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

export default App;
