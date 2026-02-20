/**
 * 自动游戏逻辑
 */

import * as fs from 'fs';
import * as path from 'path';
import GameClient from './client';
import { Planet, TechQueue, SHIP_NAMES, BUILDING_NAMES, TECHS } from './types';
import ConfigLoader from '../config';

export interface AutomationState {
  running: boolean;
  lastRun: number;
  lastError?: string;
}

export interface AutomationStats {
  shipsBuilt: number;
  buildingsUpgraded: number;
  techResearched: number;
}

export class GameAutomation {
  private client: GameClient;
  private config: ConfigLoader;
  private state: AutomationState;
  private stats: AutomationStats;
  private intervalId?: NodeJS.Timeout;
  private logFile: string;

  constructor(client: GameClient, config: ConfigLoader) {
    this.client = client;
    this.config = config;
    this.state = { running: false, lastRun: 0 };
    this.stats = { shipsBuilt: 0, buildingsUpgraded: 0, techResearched: 0 };
    
    // 确保日志目录存在
    const logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    this.logFile = path.join(logDir, `automation_${new Date().toISOString().split('T')[0]}.log`);
  }

  private log(level: string, message: string): void {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] [${level}] ${message}`;
    console.log(logLine);
    
    try {
      fs.appendFileSync(this.logFile, logLine + '\n');
    } catch (error) {
      console.error('写入日志失败:', error);
    }
  }

  private logInfo(message: string): void {
    this.log('INFO', message);
  }

  private logError(message: string): void {
    this.log('ERROR', message);
  }

  // ========== 科技管理 ==========

  async manageTech(): Promise<void> {
    this.logInfo('=== 科技管理 ===');

    const config = this.config.getConfig();
    const mainPlanetId = config.game.mainPlanetId;
    const targetExpedition = config.game.techTargetExpedition;

    try {
      // 获取科技数据
      const techList = await this.client.getTechList();
      const techQueue = await this.client.getTechQueue();

      const expeditionLevel = techList[TECHS.EXPEDITION_TECH] || 0;
      const queueCount = techQueue.length;
      const expeditionInQueue = techQueue.filter(q => q.target === TECHS.EXPEDITION_TECH).length;

      this.logInfo(`探险技术: Lv.${expeditionLevel} | 队列: ${queueCount}/5 | 探险技术队列: ${expeditionInQueue}`);

      // 探险技术优先升级
      if (expeditionLevel < targetExpedition) {
        if (expeditionInQueue < 2) {
          if (queueCount < 5) {
            const success = await this.client.researchTech(TECHS.EXPEDITION_TECH, 1, mainPlanetId);
            if (success) {
              this.logInfo('✅ 添加探险技术研究');
              this.stats.techResearched++;
            }
          } else {
            // 队列满了，取消一个超空间引擎任务来腾出空间
            this.logInfo('队列已满，取消超空间引擎任务...');
            await this.client.cancelTech(TECHS.HYPERSPACE_ENGINE, mainPlanetId);
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const success = await this.client.researchTech(TECHS.EXPEDITION_TECH, 1, mainPlanetId);
            if (success) {
              this.logInfo('✅ 腾出空间添加探险技术');
              this.stats.techResearched++;
            }
          }
        }
      } else {
        this.logInfo('探险技术已达目标等级');
      }
    } catch (error) {
      this.logError(`科技管理失败: ${error}`);
    }
  }

  // ========== 舰船建造 ==========

  async buildShipsOnPlanet(planet: Planet): Promise<boolean> {
    const config = this.config.getConfig();
    const priority = config.automation.shipPriority;
    const batchSize = config.game.shipBuildBatch;
    const minColony = config.game.minColonyShips;

    try {
      // 获取造船队列
      const queue = await this.client.getShipQueue(planet.id);
      if (queue.length > 0) {
        this.logInfo(`星球 ${planet.id} 造船队列忙碌 (${queue.length})`);
        return false;
      }

      // 获取当前舰船
      const ships = planet.ships || {};
      const colonyShips = ships[300] || 0;

      // 1. 维持殖民船数量
      if (colonyShips < minColony) {
        const success = await this.client.buildShip(planet.id, 300, 5);
        if (success) {
          this.logInfo(`✅ ${planet.name || planet.id}: 殖民船+5 (${colonyShips}/${minColony})`);
          this.stats.shipsBuilt += 5;
          return true;
        }
      }

      // 2. 按优先级建造战斗舰船
      for (const shipType of priority) {
        const success = await this.client.buildShip(planet.id, shipType, batchSize);
        if (success) {
          const shipName = SHIP_NAMES[shipType] || `舰船${shipType}`;
          this.logInfo(`✅ ${planet.name || planet.id}: ${shipName}+${batchSize}`);
          this.stats.shipsBuilt += batchSize;
          return true;
        }
      }

      this.logInfo(`⚠️ ${planet.name || planet.id}: 资源不足，无法建造`);
      return false;
    } catch (error) {
      this.logError(`星球 ${planet.id} 造船失败: ${error}`);
      return false;
    }
  }

  async buildAllShips(): Promise<void> {
    this.logInfo('=== 舰船建造 ===');

    try {
      const planets = await this.client.getPlanets();
      const mainPlanetId = this.config.getConfig().game.mainPlanetId;

      // 主星优先
      const mainPlanet = planets.find(p => p.id === mainPlanetId);
      if (mainPlanet) {
        await this.buildShipsOnPlanet(mainPlanet);
      }

      // 其他星球
      for (const planet of planets) {
        if (planet.id !== mainPlanetId && planet.type === 1) {
          await this.buildShipsOnPlanet(planet);
        }
      }
    } catch (error) {
      this.logError(`舰船建造失败: ${error}`);
    }
  }

  // ========== 建筑升级 ==========

  async buildOnPlanet(planet: Planet): Promise<boolean> {
    const config = this.config.getConfig();
    const priority = config.automation.buildingPriority;

    try {
      // 获取建筑队列
      const queue = await this.client.getBuildingQueue(planet.id);
      if (queue.length > 0) {
        this.logInfo(`星球 ${planet.id} 建筑队列忙碌 (${queue.length})`);
        return false;
      }

      // 按优先级尝试升级
      for (const buildingType of priority) {
        const success = await this.client.buildBuilding(planet.id, buildingType, 1);
        if (success) {
          const buildingName = BUILDING_NAMES[buildingType] || `建筑${buildingType}`;
          this.logInfo(`✅ ${planet.name || planet.id}: ${buildingName}+1`);
          this.stats.buildingsUpgraded++;
          return true;
        }
      }

      this.logInfo(`⚠️ ${planet.name || planet.id}: 资源不足，无法升级`);
      return false;
    } catch (error) {
      this.logError(`星球 ${planet.id} 建筑升级失败: ${error}`);
      return false;
    }
  }

  async buildAll(): Promise<void> {
    this.logInfo('=== 建筑升级 ===');

    try {
      const planets = await this.client.getPlanets();

      // 资源星球优先
      const resourcePlanets = planets.filter(p => p.type === 1);
      
      for (const planet of resourcePlanets) {
        await this.buildOnPlanet(planet);
      }
    } catch (error) {
      this.logError(`建筑升级失败: ${error}`);
    }
  }

  // ========== 殖民检查 ==========

  async checkColonization(): Promise<void> {
    this.logInfo('=== 殖民检查 ===');

    try {
      const techList = await this.client.getTechList();
      const planets = await this.client.getPlanets();
      
      const expeditionLevel = techList[TECHS.EXPEDITION_TECH] || 0;
      const colonyLimit = expeditionLevel + 1;
      const currentPlanets = planets.filter(p => p.type === 1).length;

      this.logInfo(`当前行星: ${currentPlanets} | 殖民上限: ${colonyLimit}`);

      if (currentPlanets < colonyLimit) {
        const ships = await this.client.getShips(this.config.getConfig().game.mainPlanetId);
        const colonyShips = ships[300] || 0;

        if (colonyShips >= this.config.getConfig().game.minColonyShips) {
          this.logInfo(`✅ 殖民船充足: ${colonyShips}艘，可进行殖民`);
          // TODO: 实现实际殖民逻辑
        } else {
          this.logInfo(`殖民船不足: ${colonyShips}/${this.config.getConfig().game.minColonyShips}`);
        }
      }
    } catch (error) {
      this.logError(`殖民检查失败: ${error}`);
    }
  }

  // ========== 主循环 ==========

  async run(): Promise<void> {
    this.logInfo('========================================');
    this.logInfo('星环之路自动化脚本执行');
    this.logInfo('========================================');

    try {
      // 1. 科技管理
      await this.manageTech();

      // 2. 舰船建造
      await this.buildAllShips();

      // 3. 建筑升级
      await this.buildAll();

      // 4. 殖民检查
      await this.checkColonization();

      this.state.lastRun = Date.now();
      this.state.lastError = undefined;
    } catch (error: any) {
      this.state.lastError = error.message || String(error);
      this.logError(`执行失败: ${error}`);
    }

    this.logInfo('========================================');
    this.logInfo(`执行完成 | 造舰: ${this.stats.shipsBuilt} | 建筑: ${this.stats.buildingsUpgraded} | 科技: ${this.stats.techResearched}`);
    this.logInfo('========================================');
  }

  // ========== 控制方法 ==========

  start(intervalMs?: number): void {
    if (this.state.running) {
      this.logInfo('自动化已在运行中');
      return;
    }

    const config = this.config.getConfig();
    const interval = intervalMs || config.automation.intervalMs;

    this.state.running = true;
    this.logInfo(`自动化已启动，间隔 ${interval}ms`);

    // 立即执行一次
    this.run();

    // 设置定时器
    this.intervalId = setInterval(() => {
      this.run();
    }, interval);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    this.state.running = false;
    this.logInfo('自动化已停止');
  }

  getState(): AutomationState {
    return { ...this.state };
  }

  getStats(): AutomationStats {
    return { ...this.stats };
  }

  resetStats(): void {
    this.stats = { shipsBuilt: 0, buildingsUpgraded: 0, techResearched: 0 };
  }

  isRunning(): boolean {
    return this.state.running;
  }
}

export default GameAutomation;
