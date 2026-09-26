import { useMemo, useState } from "react";
import "./styles.css";
import { Carpet } from "./types";
import {
  DAMAGE_LABELS,
  ORIGINS,
  STAGES,
  initialCarpets,
  initialColorCards,
  initialRestorers,
  project,
} from "./data";
import {
  computeSchedule,
  drawMaterials,
  isDone,
  parseEraYear,
  progressOf,
  shortageOf,
} from "./logic";

const emptyForm = {
  origin: ORIGINS[0],
  era: "",
  knotDensity: "",
  material: "",
  dyeType: "",
  damageArea: "",
  damageLevel: 3,
  colorId: initialColorCards[0].id,
  amount: 1,
};

function App() {
  const [carpets, setCarpets] = useState<Carpet[]>(initialCarpets);
  const [colorCards, setColorCards] = useState(initialColorCards);
  const [restorers, setRestorers] = useState(initialRestorers);
  const [originFilter, setOriginFilter] = useState("全部");
  const [selectedId, setSelectedId] = useState(initialCarpets[0].id);
  const [form, setForm] = useState(emptyForm);

  // 排期是派生数据：地毯、修复师件数一变就重算，摘要和详情自然是最新的
  const schedule = useMemo(
    () => computeSchedule(carpets, restorers),
    [carpets, restorers]
  );

  const colorById = useMemo(
    () => new Map(colorCards.map((c) => [c.id, c])),
    [colorCards]
  );
  const restorerById = useMemo(
    () => new Map(restorers.map((r) => [r.id, r])),
    [restorers]
  );

  const filtered =
    originFilter === "全部"
      ? carpets
      : carpets.filter((c) => c.origin === originFilter);
  const selected = carpets.find((c) => c.id === selectedId) ?? carpets[0];

  const doneCount = carpets.filter(isDone).length;
  const activeCount = carpets.length - doneCount;
  const totalStock = colorCards.reduce((sum, c) => sum + c.stock, 0);
  const waitingList = carpets
    .filter((c) => schedule.get(c.id)?.restorerId === null && !isDone(c))
    .sort(
      (a, b) =>
        (schedule.get(a.id)?.queuePosition ?? 0) -
        (schedule.get(b.id)?.queuePosition ?? 0)
    );

  const metrics: Array<[string, string | number]> = [
    ["待修复", activeCount],
    ["纹样档案", carpets.length],
    ["色卡数量", totalStock],
    [
      "完工率",
      carpets.length ? Math.round((doneCount / carpets.length) * 100) + "%" : "—",
    ],
  ];

  function setField(key: keyof typeof emptyForm, value: string | number) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function saveRecord() {
    const nextNo =
      Math.max(0, ...carpets.map((c) => Number(c.id.replace(/\D/g, "")) || 0)) + 1;
    const carpet: Carpet = {
      id: `CAR-${String(nextNo).padStart(3, "0")}`,
      origin: form.origin,
      era: form.era.trim() || "年代待考",
      eraYear: parseEraYear(form.era),
      knotDensity: form.knotDensity.trim() || "待测",
      material: form.material.trim() || "待鉴定",
      dyeType: form.dyeType.trim() || "待鉴定",
      damageArea: form.damageArea.trim() || "待检查",
      damageLevel: form.damageLevel,
      needs:
        form.amount > 0
          ? [{ colorId: form.colorId, required: form.amount, received: 0 }]
          : [],
      stageIndex: 0,
    };
    setCarpets((prev) => [...prev, carpet]);
    setSelectedId(carpet.id);
    setForm(emptyForm);
  }

  function adjustCapacity(restorerId: string, delta: number) {
    setRestorers((prev) =>
      prev.map((r) =>
        r.id === restorerId
          ? { ...r, capacity: Math.min(8, Math.max(0, r.capacity + delta)) }
          : r
      )
    );
  }

  function advanceStage(carpetId: string) {
    setCarpets((prev) =>
      prev.map((c) =>
        c.id === carpetId && c.stageIndex < STAGES.length
          ? { ...c, stageIndex: c.stageIndex + 1 }
          : c
      )
    );
  }

  function requisition(carpetId: string) {
    const carpet = carpets.find((c) => c.id === carpetId);
    if (!carpet) return;
    const { newNeeds, newCards } = drawMaterials(carpet.needs, colorCards);
    setColorCards(newCards);
    setCarpets((prev) =>
      prev.map((c) => (c.id === carpetId ? { ...c, needs: newNeeds } : c))
    );
  }

  function restock(colorId: string, amount: number) {
    setColorCards((prev) =>
      prev.map((c) => (c.id === colorId ? { ...c, stock: c.stock + amount } : c))
    );
  }

  function exportCsv() {
    const header = "编号,产地,年代,结密度,材质,染色类型,破损区域,破损程度,进度,状态";
    const rows = filtered.map((c) => {
      const assignment = schedule.get(c.id);
      const status = isDone(c)
        ? "已完工"
        : assignment?.restorerId
          ? `今日修复·${restorerById.get(assignment.restorerId)?.name ?? ""}`
          : "等待区";
      return [
        c.id,
        c.origin,
        c.era,
        c.knotDensity,
        c.material,
        c.dyeType,
        c.damageArea,
        DAMAGE_LABELS[c.damageLevel],
        progressOf(c) + "%",
        status,
      ].join(",");
    });
    const blob = new Blob(["﻿" + [header, ...rows].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "地毯修复档案.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function statusOf(carpet: Carpet) {
    if (isDone(carpet)) return { className: "badge done", text: "已完工" };
    const assignment = schedule.get(carpet.id);
    if (assignment?.restorerId) {
      const name = restorerById.get(assignment.restorerId)?.name ?? "";
      return { className: "badge active", text: `今日修复 · ${name}` };
    }
    return {
      className: "badge wait",
      text: `等待区 第${assignment?.queuePosition ?? "-"}位`,
    };
  }

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
        {metrics.map(([label, value]) => (
          <article key={label}>
            <small>{label}</small>
            <strong>{value}</strong>
          </article>
        ))}
      </section>

      <section className="workspace">
        <aside className="panel">
          <h2>{project.domain}分类</h2>
          <div className="chips">
            {["全部", ...ORIGINS].map((item) => (
              <button
                key={item}
                className={originFilter === item ? "chip-on" : ""}
                onClick={() => setOriginFilter(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <p className="hint">
            当前筛选：{originFilter} · {filtered.length} 件档案
          </p>
        </aside>

        <section className="panel form-panel">
          <div className="heading">
            <div>
              <p>专业字段</p>
              <h2>新增记录</h2>
            </div>
            <button className="primary" onClick={saveRecord}>
              保存记录
            </button>
          </div>
          <div className="field-grid">
            <label>
              <span>地毯产地</span>
              <select
                value={form.origin}
                onChange={(e) => setField("origin", e.target.value)}
              >
                {ORIGINS.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </label>
            <label>
              <span>年代</span>
              <input
                placeholder="如：约1960s / 1880年前后"
                value={form.era}
                onChange={(e) => setField("era", e.target.value)}
              />
            </label>
            <label>
              <span>结密度</span>
              <input
                placeholder="填写结密度"
                value={form.knotDensity}
                onChange={(e) => setField("knotDensity", e.target.value)}
              />
            </label>
            <label>
              <span>材质</span>
              <input
                placeholder="填写材质"
                value={form.material}
                onChange={(e) => setField("material", e.target.value)}
              />
            </label>
            <label>
              <span>染色类型</span>
              <input
                placeholder="填写染色类型"
                value={form.dyeType}
                onChange={(e) => setField("dyeType", e.target.value)}
              />
            </label>
            <label>
              <span>破损区域</span>
              <input
                placeholder="填写破损区域"
                value={form.damageArea}
                onChange={(e) => setField("damageArea", e.target.value)}
              />
            </label>
            <label>
              <span>破损程度（决定先修顺序）</span>
              <select
                value={form.damageLevel}
                onChange={(e) => setField("damageLevel", Number(e.target.value))}
              >
                {Object.entries(DAMAGE_LABELS).map(([level, label]) => (
                  <option key={level} value={level}>
                    {level} 级 · {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>补线色卡 / 用量（绞）</span>
              <span className="inline-fields">
                <select
                  value={form.colorId}
                  onChange={(e) => setField("colorId", e.target.value)}
                >
                  {colorCards.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}（余量 {c.stock}）
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={0}
                  value={form.amount}
                  onChange={(e) =>
                    setField("amount", Math.max(0, Number(e.target.value) || 0))
                  }
                />
              </span>
            </label>
          </div>
          <p className="hint">
            保存后自动按「破损程度重 → 年代早」进入先修顺序；修复师当日件数排满则进等待区。
          </p>
        </section>
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>排期 · 领料 · 库存</p>
            <h2>工作台摘要</h2>
          </div>
          <button onClick={exportCsv}>导出CSV</button>
        </div>

        <div className="board">
          <div className="board-col">
            <h3>修复师当日件数</h3>
            {restorers.map((r) => {
              const assigned = carpets.filter(
                (c) => schedule.get(c.id)?.restorerId === r.id
              );
              return (
                <div className="restorer" key={r.id}>
                  <div className="restorer-head">
                    <div>
                      <b>{r.name}</b>
                      <small>{r.skill}</small>
                    </div>
                    <span className="capacity">
                      <button onClick={() => adjustCapacity(r.id, -1)}>-</button>
                      <em>
                        {assigned.length}/{r.capacity} 件
                      </em>
                      <button onClick={() => adjustCapacity(r.id, 1)}>+</button>
                    </span>
                  </div>
                  {assigned.length === 0 ? (
                    <p className="hint">今日未排件</p>
                  ) : (
                    <ul>
                      {assigned.map((c) => (
                        <li key={c.id}>
                          <span>
                            第{schedule.get(c.id)?.priority}位 · {c.id}
                          </span>
                          <small>
                            {isDone(c) ? "已完工" : STAGES[c.stageIndex]}
                          </small>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>

          <div className="board-col">
            <h3>等待区（{waitingList.length}）</h3>
            {waitingList.length === 0 ? (
              <p className="hint">今日件数充足，无排队地毯</p>
            ) : (
              waitingList.map((c) => (
                <div className="waiting" key={c.id}>
                  <b>
                    第{schedule.get(c.id)?.queuePosition}位 · {c.id}
                  </b>
                  <p>
                    {c.origin} · {c.era} · {DAMAGE_LABELS[c.damageLevel]}
                  </p>
                  <p className="warn">{schedule.get(c.id)?.waitReason}</p>
                </div>
              ))
            )}
          </div>

          <div className="board-col">
            <h3>材料色卡余量</h3>
            {colorCards.map((card) => {
              const shortage = carpets
                .filter((c) => !isDone(c))
                .flatMap((c) => c.needs)
                .filter((n) => n.colorId === card.id)
                .reduce((sum, n) => sum + shortageOf(n), 0);
              return (
                <div className="color-card" key={card.id}>
                  <i style={{ background: card.hex }} />
                  <div>
                    <b>{card.name}</b>
                    <small>
                      余量 {card.stock} 绞
                      {shortage > 0 && (
                        <em className="warn"> · 待补缺口 {shortage} 绞</em>
                      )}
                    </small>
                  </div>
                  <button onClick={() => restock(card.id, 5)}>补货+5</button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="records">
          {filtered.map((carpet, index) => {
            const status = statusOf(carpet);
            const assignment = schedule.get(carpet.id);
            const shortages = carpet.needs.filter((n) => shortageOf(n) > 0);
            return (
              <article
                key={carpet.id}
                className={carpet.id === selected?.id ? "record-on" : ""}
                onClick={() => setSelectedId(carpet.id)}
              >
                <b>{String(index + 1).padStart(2, "0")}</b>
                <div>
                  <h3>
                    {carpet.id}
                    <span className={status.className}>{status.text}</span>
                  </h3>
                  <p>
                    {carpet.origin} · {carpet.era} · {carpet.damageArea}
                  </p>
                  <div className="progress">
                    <i style={{ width: progressOf(carpet) + "%" }} />
                  </div>
                  <p className="note">
                    进度 {progressOf(carpet)}%
                    {!isDone(carpet) && ` · 当前工序：${STAGES[carpet.stageIndex]}`}
                    {assignment?.waitReason && (
                      <em className="warn"> · {assignment.waitReason}</em>
                    )}
                    {shortages.length > 0 && (
                      <em className="warn">
                        {" "}
                        · 缺料：
                        {shortages
                          .map((n) => {
                            const card = colorById.get(n.colorId);
                            return `${card?.name ?? n.colorId} 缺${shortageOf(n)}绞（余量${card?.stock ?? 0}）`;
                          })
                          .join("、")}
                        ，待补货
                      </em>
                    )}
                  </p>
                </div>
              </article>
            );
          })}
          {filtered.length === 0 && <p className="hint">该产地暂无档案</p>}
        </div>
      </section>

      {selected && (
        <section className="panel">
          <div className="heading">
            <div>
              <p>地毯详情</p>
              <h2>
                {selected.id}
                <span className={statusOf(selected).className}>
                  {statusOf(selected).text}
                </span>
              </h2>
            </div>
            {!isDone(selected) && schedule.get(selected.id)?.restorerId && (
              <button className="primary" onClick={() => advanceStage(selected.id)}>
                {selected.stageIndex === STAGES.length - 1
                  ? "验收完工"
                  : `推进工序：${STAGES[selected.stageIndex + 1]}`}
              </button>
            )}
          </div>

          <div className="detail-grid">
            <div>
              <h3>档案字段</h3>
              <dl className="fields">
                <div>
                  <dt>地毯产地</dt>
                  <dd>{selected.origin}</dd>
                </div>
                <div>
                  <dt>年代</dt>
                  <dd>{selected.era}</dd>
                </div>
                <div>
                  <dt>结密度</dt>
                  <dd>{selected.knotDensity}</dd>
                </div>
                <div>
                  <dt>材质</dt>
                  <dd>{selected.material}</dd>
                </div>
                <div>
                  <dt>染色类型</dt>
                  <dd>{selected.dyeType}</dd>
                </div>
                <div>
                  <dt>破损区域</dt>
                  <dd>{selected.damageArea}</dd>
                </div>
                <div>
                  <dt>破损程度</dt>
                  <dd>
                    {selected.damageLevel} 级 · {DAMAGE_LABELS[selected.damageLevel]}
                  </dd>
                </div>
              </dl>

              <h3>排期</h3>
              {isDone(selected) ? (
                <p className="hint">已完工归档，不再占用当日件数。</p>
              ) : (
                (() => {
                  const assignment = schedule.get(selected.id);
                  if (!assignment) return null;
                  return assignment.restorerId ? (
                    <p className="note">
                      先修顺序第 {assignment.priority} 位 · 今日由
                      {restorerById.get(assignment.restorerId)?.name}修复
                    </p>
                  ) : (
                    <p className="note warn">
                      等待区第 {assignment.queuePosition} 位 ·{" "}
                      {assignment.waitReason}
                    </p>
                  );
                })()
              )}

              <h3>修复工序</h3>
              <ol className="stages">
                {STAGES.map((stage, i) => (
                  <li
                    key={stage}
                    className={
                      i < selected.stageIndex
                        ? "stage-done"
                        : i === selected.stageIndex && !isDone(selected)
                          ? "stage-now"
                          : ""
                    }
                  >
                    {stage}
                  </li>
                ))}
              </ol>
              <div className="progress">
                <i style={{ width: progressOf(selected) + "%" }} />
              </div>
              <p className="hint">进度 {progressOf(selected)}%</p>
            </div>

            <div>
              <div className="heading">
                <h3>补线色卡</h3>
                {selected.needs.some((n) => shortageOf(n) > 0) && (
                  <button onClick={() => requisition(selected.id)}>领取色卡</button>
                )}
              </div>
              {selected.needs.length === 0 && (
                <p className="hint">本件无需补线色卡。</p>
              )}
              {selected.needs.map((need) => {
                const card = colorById.get(need.colorId);
                const shortage = shortageOf(need);
                return (
                  <div className="need" key={need.colorId}>
                    <i style={{ background: card?.hex }} />
                    <div>
                      <b>{card?.name ?? need.colorId}</b>
                      <small>
                        需 {need.required} 绞 · 已领 {need.received} 绞 · 当前余量{" "}
                        {card?.stock ?? 0} 绞
                      </small>
                      {shortage > 0 && (
                        <small className="warn">
                          余量不足，缺 {shortage} 绞待补货，补货后再次领取即可
                        </small>
                      )}
                    </div>
                    {shortage > 0 ? (
                      <span className="badge wait">缺 {shortage} 绞</span>
                    ) : (
                      <span className="badge done">已领足</span>
                    )}
                  </div>
                );
              })}
              <p className="hint">
                领料只扣实际领到的部分，余量不会扣成负数；缺口等补货后再领。
              </p>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

export default App;
