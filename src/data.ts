import { Carpet, ColorCard, Restorer } from "./types";

export const project = {
  sourceNo: 2,
  id: "hxyfront-62009",
  port: 62009,
  title: "地毯修复纹样档案",
  domain: "手工地毯修复",
  prompt:
    "做一个给手工地毯修复工作室使用的纹样与修复档案前端项目，可以记录地毯产地、年代、结密度、材质、染色类型、破损区域、补线颜色和修复工序。页面需要有纹样局部标记图、修复前后记录、材料色卡、工序进度和按产地筛选的档案列表。",
};

export const ORIGINS = ["波斯", "安纳托利亚", "高加索", "藏毯"];

export const DAMAGE_LABELS: Record<number, string> = {
  1: "轻微",
  2: "较轻",
  3: "中等",
  4: "严重",
  5: "濒危",
};

export const STAGES = ["检查评估", "清洗除尘", "补线织补", "平整定型", "验收归档"];

export const initialRestorers: Restorer[] = [
  { id: "R1", name: "林师傅", skill: "织补", capacity: 2 },
  { id: "R2", name: "赵师傅", skill: "染色配线", capacity: 2 },
  { id: "R3", name: "阿依古丽", skill: "整经定型", capacity: 1 },
];

export const initialColorCards: ColorCard[] = [
  { id: "IND-01", name: "靛蓝", hex: "#1e3a8a", stock: 6 },
  { id: "MAD-02", name: "茜草红", hex: "#b91c1c", stock: 3 },
  { id: "POM-03", name: "石榴黄", hex: "#d97706", stock: 8 },
  { id: "WOL-04", name: "羊毛本白", hex: "#d6d3d1", stock: 12 },
  { id: "WAL-05", name: "核桃褐", hex: "#78350f", stock: 0 },
];

export const initialCarpets: Carpet[] = [
  {
    id: "CAR-092",
    origin: "波斯",
    era: "约1960s",
    eraYear: 1960,
    knotDensity: "38",
    material: "羊毛",
    dyeType: "植物染",
    damageArea: "边缘磨损待补线",
    damageLevel: 3,
    needs: [{ colorId: "MAD-02", required: 4, received: 0 }],
    stageIndex: 1,
  },
  {
    id: "CAR-117",
    origin: "安纳托利亚",
    era: "约1920s",
    eraYear: 1920,
    knotDensity: "42",
    material: "羊毛",
    dyeType: "植物染",
    damageArea: "中心纹样缺口",
    damageLevel: 5,
    needs: [
      { colorId: "IND-01", required: 5, received: 0 },
      { colorId: "WOL-04", required: 2, received: 0 },
    ],
    stageIndex: 2,
  },
  {
    id: "CAR-138",
    origin: "藏毯",
    era: "约1970s",
    eraYear: 1970,
    knotDensity: "30",
    material: "羊毛",
    dyeType: "植物染",
    damageArea: "局部褪色，需匹配靛蓝色卡",
    damageLevel: 2,
    needs: [{ colorId: "IND-01", required: 3, received: 0 }],
    stageIndex: 0,
  },
  {
    id: "CAR-141",
    origin: "高加索",
    era: "约1880s",
    eraYear: 1880,
    knotDensity: "36",
    material: "羊毛",
    dyeType: "矿物染",
    damageArea: "多处虫蛀孔洞",
    damageLevel: 5,
    needs: [{ colorId: "WAL-05", required: 6, received: 0 }],
    stageIndex: 0,
  },
  {
    id: "CAR-150",
    origin: "波斯",
    era: "约1950s",
    eraYear: 1950,
    knotDensity: "45",
    material: "丝毛混纺",
    dyeType: "植物染",
    damageArea: "流苏脱落",
    damageLevel: 4,
    needs: [{ colorId: "POM-03", required: 3, received: 0 }],
    stageIndex: 1,
  },
  {
    id: "CAR-163",
    origin: "藏毯",
    era: "约1980s",
    eraYear: 1980,
    knotDensity: "28",
    material: "牦牛毛",
    dyeType: "植物染",
    damageArea: "边角开裂",
    damageLevel: 3,
    needs: [{ colorId: "MAD-02", required: 2, received: 0 }],
    stageIndex: 0,
  },
  {
    id: "CAR-171",
    origin: "安纳托利亚",
    era: "约1900s",
    eraYear: 1900,
    knotDensity: "40",
    material: "羊毛",
    dyeType: "植物染",
    damageArea: "水渍褪色",
    damageLevel: 4,
    needs: [
      { colorId: "IND-01", required: 2, received: 0 },
      { colorId: "POM-03", required: 2, received: 0 },
    ],
    stageIndex: 0,
  },
  {
    id: "CAR-105",
    origin: "波斯",
    era: "约1870s",
    eraYear: 1870,
    knotDensity: "44",
    material: "羊毛",
    dyeType: "植物染",
    damageArea: "边缘补线已完成",
    damageLevel: 2,
    needs: [{ colorId: "MAD-02", required: 2, received: 2 }],
    stageIndex: STAGES.length,
  },
];
