export interface MaterialNeed {
  colorId: string;
  required: number; // 需要的补线量（绞）
  received: number; // 已领到的量（绞）
}

export interface Carpet {
  id: string;
  origin: string; // 地毯产地
  era: string; // 年代（展示用）
  eraYear: number; // 年代（排序用年份）
  knotDensity: string; // 结密度
  material: string; // 材质
  dyeType: string; // 染色类型
  damageArea: string; // 破损区域
  damageLevel: number; // 破损程度 1-5，5 最重
  needs: MaterialNeed[]; // 补线色卡需求
  stageIndex: number; // 当前工序下标，等于 STAGES.length 表示完工
}

export interface ColorCard {
  id: string;
  name: string;
  hex: string;
  stock: number; // 色卡余量（绞）
}

export interface Restorer {
  id: string;
  name: string;
  skill: string;
  capacity: number; // 当天可接件数
}

export interface Assignment {
  carpetId: string;
  priority: number; // 先修顺序，1 最优先
  restorerId: string | null; // null 表示在等待区
  queuePosition: number | null; // 等待区内排位，1 起
  waitReason: string | null;
}
