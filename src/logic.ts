import { Assignment, Carpet, ColorCard, MaterialNeed, Restorer } from "./types";
import { STAGES } from "./data";

export function isDone(carpet: Carpet): boolean {
  return carpet.stageIndex >= STAGES.length;
}

export function progressOf(carpet: Carpet): number {
  return Math.min(100, Math.round((carpet.stageIndex / STAGES.length) * 100));
}

/** 从年代描述里解析排序用年份，如 "约1960s" -> 1960；解析不到按当代处理（排最后）。 */
export function parseEraYear(text: string): number {
  const match = text.match(/\d{3,4}/);
  return match ? Number(match[0]) : 9999;
}

/** 某件地毯各色卡还缺多少（绞）。 */
export function shortageOf(need: MaterialNeed): number {
  return Math.max(0, need.required - need.received);
}

/**
 * 排期：未完工的地毯按「破损程度重 → 年代早」排先修顺序，
 * 依次分给当天还有件数余量的修复师；全员排满后剩下的进等待区并给出原因。
 */
export function computeSchedule(
  carpets: Carpet[],
  restorers: Restorer[]
): Map<string, Assignment> {
  const active = carpets.filter((c) => !isDone(c));
  const ordered = [...active].sort(
    (a, b) =>
      b.damageLevel - a.damageLevel ||
      a.eraYear - b.eraYear ||
      a.id.localeCompare(b.id)
  );

  const totalCapacity = restorers.reduce((sum, r) => sum + r.capacity, 0);
  const loads = new Map<string, number>(restorers.map((r) => [r.id, 0]));
  const result = new Map<string, Assignment>();
  let waiting = 0;

  ordered.forEach((carpet, index) => {
    const candidate = restorers
      .filter((r) => r.capacity > 0 && (loads.get(r.id) ?? 0) < r.capacity)
      .sort(
        (a, b) =>
          (loads.get(a.id) ?? 0) / a.capacity -
            (loads.get(b.id) ?? 0) / b.capacity || a.id.localeCompare(b.id)
      )[0];

    if (candidate) {
      loads.set(candidate.id, (loads.get(candidate.id) ?? 0) + 1);
      result.set(carpet.id, {
        carpetId: carpet.id,
        priority: index + 1,
        restorerId: candidate.id,
        queuePosition: null,
        waitReason: null,
      });
    } else {
      waiting += 1;
      result.set(carpet.id, {
        carpetId: carpet.id,
        priority: index + 1,
        restorerId: null,
        queuePosition: waiting,
        waitReason:
          totalCapacity > 0
            ? `修复师当日件数已满（今日共可接 ${totalCapacity} 件），在等待区排队`
            : "今日修复师均未排班，在等待区排队",
      });
    }
  });

  return result;
}

/**
 * 领料：按需求逐项领取，余量够多少领多少，库存不扣成负数；
 * 不够的部分保持缺口，等补货后再领。
 */
export function drawMaterials(
  needs: MaterialNeed[],
  cards: ColorCard[]
): { newNeeds: MaterialNeed[]; newCards: ColorCard[] } {
  const stock = new Map(cards.map((c) => [c.id, c.stock]));
  const newNeeds = needs.map((need) => {
    const remaining = shortageOf(need);
    if (remaining <= 0) return need;
    const available = stock.get(need.colorId) ?? 0;
    const take = Math.min(available, remaining);
    stock.set(need.colorId, available - take);
    return { ...need, received: need.received + take };
  });
  const newCards = cards.map((c) => ({ ...c, stock: stock.get(c.id) ?? c.stock }));
  return { newNeeds, newCards };
}
