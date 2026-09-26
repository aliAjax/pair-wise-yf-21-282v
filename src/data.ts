export type CarpetStatus = "unscheduled" | "waiting" | "scheduled" | "repairing" | "done";

export interface MaterialNeed {
  cardId: string;
  need: number;
  received: number;
}

export interface Carpet {
  id: string;
  origin: string;
  year: number; // 用于排期优先级的年代（公元年）
  yearLabel: string;
  knotDensity: string;
  material: string;
  dyeType: string;
  damageArea: string;
  damageLevel: number; // 1-5，越大越严重
  status: CarpetStatus;
  assignee: string | null;
  waitReason: string | null;
  materials: MaterialNeed[];
}

export interface ColorCard {
  id: string;
  name: string;
  stock: number;
}

export interface Restorer {
  id: string;
  name: string;
  capacity: number; // 当天可接件数
}

export const STATUS_LABEL: Record<CarpetStatus, string> = {
  unscheduled: "待排期",
  waiting: "等待区",
  scheduled: "已排期",
  repairing: "修复中",
  done: "已完工",
};

export const DAMAGE_LABEL: Record<number, string> = {
  1: "轻微",
  2: "较轻",
  3: "中等",
  4: "严重",
  5: "危急",
};

/** 排期优先级：年代越早越先修；同年代破损越重越先修。 */
export function byPriority(a: Carpet, b: Carpet): number {
  return a.year - b.year || b.damageLevel - a.damageLevel || a.id.localeCompare(b.id);
}

/** 某修复师当天已接件数（已排期 + 修复中）。 */
export function workloadOf(carpets: Carpet[], restorerId: string): number {
  return carpets.filter(
    (c) => c.assignee === restorerId && (c.status === "scheduled" || c.status === "repairing"),
  ).length;
}

/** 某张地毯各色卡的缺口（需要 - 已领）。 */
export function shortagesOf(carpet: Carpet): { cardId: string; short: number }[] {
  return carpet.materials
    .map((m) => ({ cardId: m.cardId, short: m.need - m.received }))
    .filter((s) => s.short > 0);
}

/** 地毯当前等待原因：等待区用登记的原因；其余若缺料则提示等补货。 */
export function waitReasonOf(carpet: Carpet, cards: ColorCard[]): string | null {
  if (carpet.status === "waiting" || carpet.status === "unscheduled") return carpet.waitReason;
  if (carpet.status === "done") return null;
  const short = shortagesOf(carpet);
  if (short.length === 0) return null;
  const parts = short.map((s) => {
    const name = cards.find((c) => c.id === s.cardId)?.name ?? s.cardId;
    return `「${name}」缺 ${s.short} 绞`;
  });
  return `色卡余量不足：${parts.join("、")}，等待补货`;
}

/** 工序进度（百分比）：按状态打底，再按领料完成度加成。 */
export function progressOf(carpet: Carpet): number {
  if (carpet.status === "done") return 100;
  const base: Record<CarpetStatus, number> = {
    unscheduled: 5,
    waiting: 10,
    scheduled: 30,
    repairing: 70,
    done: 100,
  };
  const totalNeed = carpet.materials.reduce((sum, m) => sum + m.need, 0);
  const totalReceived = carpet.materials.reduce((sum, m) => sum + m.received, 0);
  const materialRatio = totalNeed === 0 ? 1 : totalReceived / totalNeed;
  return Math.min(95, Math.round(base[carpet.status] + materialRatio * 20));
}

export const initialRestorers: Restorer[] = [
  { id: "R1", name: "阿依古丽", capacity: 2 },
  { id: "R2", name: "老周", capacity: 1 },
  { id: "R3", name: "帕提", capacity: 1 },
];

export const initialCards: ColorCard[] = [
  { id: "DYE-01", name: "靛蓝", stock: 3 },
  { id: "DYE-02", name: "茜红", stock: 4 },
  { id: "DYE-03", name: "土黄", stock: 1 },
  { id: "DYE-04", name: "羊毛白", stock: 2 },
];

export const initialCarpets: Carpet[] = [
  {
    id: "CAR-045",
    origin: "高加索",
    year: 1880,
    yearLabel: "约1880s",
    knotDensity: "36",
    material: "羊毛",
    dyeType: "植物染",
    damageArea: "虫蛀多处，边缘散线",
    damageLevel: 5,
    status: "repairing",
    assignee: "R2",
    waitReason: null,
    materials: [
      { cardId: "DYE-01", need: 3, received: 2 },
      { cardId: "DYE-02", need: 2, received: 2 },
      { cardId: "DYE-04", need: 1, received: 0 },
    ],
  },
  {
    id: "CAR-092",
    origin: "波斯",
    year: 1960,
    yearLabel: "约1960s",
    knotDensity: "48",
    material: "羊毛",
    dyeType: "植物染",
    damageArea: "边缘磨损待补线",
    damageLevel: 3,
    status: "scheduled",
    assignee: "R1",
    waitReason: null,
    materials: [
      { cardId: "DYE-02", need: 2, received: 0 },
      { cardId: "DYE-01", need: 1, received: 0 },
    ],
  },
  {
    id: "CAR-063",
    origin: "波斯",
    year: 1920,
    yearLabel: "约1920s",
    knotDensity: "50",
    material: "羊毛",
    dyeType: "矿物染",
    damageArea: "边穗缺失",
    damageLevel: 4,
    status: "done",
    assignee: "R1",
    waitReason: null,
    materials: [{ cardId: "DYE-03", need: 2, received: 2 }],
  },
  {
    id: "CAR-121",
    origin: "高加索",
    year: 1900,
    yearLabel: "约1900s",
    knotDensity: "38",
    material: "羊毛",
    dyeType: "植物染",
    damageArea: "局部褪色，边角开裂",
    damageLevel: 3,
    status: "unscheduled",
    assignee: null,
    waitReason: "新档案待排期",
    materials: [
      { cardId: "DYE-04", need: 2, received: 0 },
      { cardId: "DYE-01", need: 1, received: 0 },
    ],
  },
  {
    id: "CAR-117",
    origin: "安纳托利亚",
    year: 1940,
    yearLabel: "约1940s",
    knotDensity: "42",
    material: "羊毛",
    dyeType: "植物染",
    damageArea: "中心纹样缺口",
    damageLevel: 4,
    status: "unscheduled",
    assignee: null,
    waitReason: "新档案待排期",
    materials: [
      { cardId: "DYE-02", need: 3, received: 0 },
      { cardId: "DYE-03", need: 2, received: 0 },
    ],
  },
  {
    id: "CAR-138",
    origin: "藏毯",
    year: 1970,
    yearLabel: "约1970s",
    knotDensity: "30",
    material: "羊毛",
    dyeType: "植物染",
    damageArea: "局部褪色，需匹配靛蓝色卡",
    damageLevel: 2,
    status: "unscheduled",
    assignee: null,
    waitReason: "新档案待排期",
    materials: [{ cardId: "DYE-01", need: 2, received: 0 }],
  },
  {
    id: "CAR-150",
    origin: "安纳托利亚",
    year: 1975,
    yearLabel: "约1970s",
    knotDensity: "40",
    material: "棉毛混纺",
    dyeType: "化学染",
    damageArea: "轻微磨损",
    damageLevel: 1,
    status: "unscheduled",
    assignee: null,
    waitReason: "新档案待排期",
    materials: [{ cardId: "DYE-02", need: 1, received: 0 }],
  },
];

export const ORIGINS = ["波斯", "安纳托利亚", "高加索", "藏毯"];
export const DYE_TYPES = ["植物染", "矿物染", "化学染"];
