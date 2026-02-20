/**
 * Reogame Bot - 游戏类型定义
 */

export interface Coordinate {
  universe: number;
  galaxy: number;
  system: number;
  planet: number;
}

export interface Planet {
  id: number;
  name: string;
  coordinate: Coordinate;
  type: number; // 1=行星, 3=卫星
  resources_1: Resources;
  resources_2?: Resources;
  buildings: Record<number, number>;
  ships: Record<number, number>;
  defenses: Record<number, number>;
  shipsQueue: QueueItem[];
  buildingsQueue: QueueItem[];
  isMineralPlanet: boolean;
  level: number;
  ownerId: number;
  moonId?: number;
}

export interface Resources {
  1: number; // 金属
  2: number; // 水晶
  3: number; // 重氢
}

export interface QueueItem {
  id: string;
  sourceId: number;
  target: number;
  added: number;
  startTime: number;
  endTime: number;
  duration: number;
}

export interface Technology {
  id: number;
  name: string;
  level: number;
}

export interface TechQueue extends QueueItem {
  techName?: string;
}

export interface PlayerData {
  id: number;
  username: string;
  email: string;
  universe: number;
  planets: number[];
  mainPlanetId: number;
  points: Points;
  technologies: Record<number, number>;
  technologiesQueue: TechQueue[];
  allianceId?: number;
}

export interface Points {
  total: number;
  building: number;
  technology: number;
  ship: number;
  defense: number;
}

export interface ShipInfo {
  id: number;
  name: string;
  attack: number;
  shield: number;
  armor: number;
  cost: { metal: number; crystal: number; deuterium: number };
  speed: number;
}

export interface BuildingInfo {
  id: number;
  name: string;
  cost: { metal: number; crystal: number };
  energyConsume: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

// Ship IDs
export const SHIPS = {
  COLONY_SHIP: 300,
  LIGHT_FIGHTER: 301,
  HEAVY_FIGHTER: 302,
  CRUISER: 303,
  BATTLESHIP: 304,
  BATTLE_CRUISER: 305,
  TRANSPORTER: 306,
  RECYCLER: 309,
  DESTROYER: 311,
  PLANET_CRACKER: 312,
  STAR_SHIP: 313,
} as const;

// Building IDs
export const BUILDINGS = {
  METAL_MINE: 100,
  CRYSTAL_MINE: 101,
  DEUTERIUM_SYNTHESIZER: 102,
  SOLAR_PLANT: 103,
  FUSION_PLANT: 105,
  ROBOT_FACTORY: 106,
  NANO_FACTORY: 107,
  SHIPYARD: 108,
  METAL_STORAGE: 109,
  CRYSTAL_STORAGE: 110,
  DEUTERIUM_STORAGE: 111,
  LABORATORY: 112,
} as const;

// Tech IDs
export const TECHS = {
  SPY_TECH: 200,
  COMPUTER_TECH: 201,
  MILITARY_TECH: 202,
  SHIELD_TECH: 203,
  DEFENSE_TECH: 204,
  ENERGY_TECH: 205,
  HYPERSPACE_TECH: 206,
  COMBUSTION_ENGINE: 207,
  IMPULSE_ENGINE: 208,
  HYPERSPACE_ENGINE: 209,
  LASER_TECH: 210,
  ION_TECH: 211,
  PLASMA_TECH: 212,
  EXPEDITION_TECH: 214,
  METAL_PROC: 215,
  CRYSTAL_PROC: 216,
  DEUTERIUM_PROC: 217,
} as const;

export const SHIP_NAMES: Record<number, string> = {
  300: '殖民船',
  301: '轻型战机',
  302: '重型战机',
  303: '巡洋舰',
  304: '战列舰',
  305: '战列巡洋舰',
  306: '运输机',
  309: '回收船',
  311: '驱逐舰',
  312: '行星轰炸机',
  313: '星际战舰',
};

export const BUILDING_NAMES: Record<number, string> = {
  100: '金属厂',
  101: '水晶厂',
  102: '重氢厂',
  103: '太阳能电站',
  105: '聚变反应堆',
  106: '机器人工厂',
  107: '纳米工厂',
  108: '造船厂',
  109: '金属仓库',
  110: '水晶仓库',
  111: '重氢仓库',
  112: '研究院',
};

export const TECH_NAMES: Record<number, string> = {
  200: '间谍技术',
  201: '计算机技术',
  202: '武器技术',
  203: '护盾技术',
  204: '装甲技术',
  205: '能源技术',
  206: '超空间技术',
  207: '燃烧引擎',
  208: '脉冲引擎',
  209: '超空间引擎',
  210: '激光技术',
  211: '离子技术',
  212: '等离子技术',
  214: '探险技术',
  215: '金属增产',
  216: '水晶增产',
  217: '重氢增产',
};
