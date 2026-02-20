/**
 * OGAME CLI 客户端封装
 */

import { execSync, exec } from 'child_process';
import { Planet, PlayerData, QueueItem, TechQueue } from './types';

export class GameClient {
  private ogamePath: string = 'ogame';
  private quiet: boolean = true;

  constructor(ogamePath?: string) {
    if (ogamePath) {
      this.ogamePath = ogamePath;
    }
  }

  private exec(command: string, timeout: number = 30): string {
    try {
      const result = execSync(`${this.ogamePath} ${command}`, {
        encoding: 'utf-8',
        timeout: timeout * 1000,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      return result;
    } catch (error: any) {
      if (error.stdout) return error.stdout;
      if (error.message) return error.message;
      throw error;
    }
  }

  // 公开方法供外部调用
  public async execute(command: string): Promise<string> {
    return this.execAsync(command);
  }

  private execAsync(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      exec(`${this.ogamePath} ${command}`, { timeout: 60000 }, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve(stdout);
        }
      });
    });
  }

  private parseJson<T>(output: string): T {
    try {
      // 尝试找到JSON开始的位置
      const startIdx = output.indexOf('{');
      if (startIdx >= 0) {
        const jsonStr = output.substring(startIdx);
        return JSON.parse(jsonStr) as T;
      }
      return JSON.parse(output) as T;
    } catch (error) {
      console.error('[GameClient] JSON解析失败:', output.substring(0, 200));
      throw error;
    }
  }

  // ========== 玩家数据 ==========

  async getPlayerData(): Promise<PlayerData> {
    const output = await this.execAsync('game data');
    const result = this.parseJson<any>(output);
    if (result.code === 0) {
      return result.data;
    }
    throw new Error(result.msg || '获取玩家数据失败');
  }

  // ========== 星球数据 ==========

  async getPlanets(): Promise<Planet[]> {
    const output = await this.execAsync('planet list');
    const result = this.parseJson<any>(output);
    if (result.code === 0) {
      return result.data;
    }
    throw new Error(result.msg || '获取星球列表失败');
  }

  async getPlanetDetail(planetId: number): Promise<Planet> {
    const output = await this.execAsync(`planet get --id ${planetId}`);
    const result = this.parseJson<any>(output);
    if (result.code === 0) {
      return result.data;
    }
    throw new Error(result.msg || `获取星球 ${planetId} 详情失败`);
  }

  // ========== 舰船操作 ==========

  async buildShip(planetId: number, shipType: number, amount: number = 1): Promise<boolean> {
    const output = await this.execAsync(`ship build --planet ${planetId} --type ${shipType} --amount ${amount}`);
    const result = this.parseJson<any>(output);
    return result.code === 0;
  }

  async getShipQueue(planetId: number): Promise<QueueItem[]> {
    const output = await this.execAsync(`ship queue --planet ${planetId}`);
    const result = this.parseJson<any>(output);
    if (result.code === 0 && result.data) {
      return result.data;
    }
    return [];
  }

  async getShips(planetId: number): Promise<Record<number, number>> {
    const output = await this.execAsync(`ship list --planet ${planetId}`);
    const result = this.parseJson<any>(output);
    if (result.code === 0 && result.data) {
      return result.data.ships || {};
    }
    return {};
  }

  // ========== 建筑操作 ==========

  async buildBuilding(planetId: number, buildingType: number, amount: number = 1): Promise<boolean> {
    const output = await this.execAsync(`building build --planet ${planetId} --type ${buildingType} --amount ${amount}`);
    const result = this.parseJson<any>(output);
    return result.code === 0;
  }

  async getBuildingQueue(planetId: number): Promise<QueueItem[]> {
    const output = await this.execAsync(`building queue --planet ${planetId}`);
    const result = this.parseJson<any>(output);
    if (result.code === 0 && result.data) {
      return result.data;
    }
    return [];
  }

  async getBuildings(planetId: number): Promise<Record<number, number>> {
    const output = await this.execAsync(`building list --planet ${planetId}`);
    const result = this.parseJson<any>(output);
    if (result.code === 0 && result.data) {
      return result.data.buildings || {};
    }
    return {};
  }

  // ========== 科技操作 ==========

  async researchTech(techType: number, amount: number = 1, planetId?: number): Promise<boolean> {
    let cmd = `tech research --type ${techType} --amount ${amount}`;
    if (planetId) {
      cmd += ` --planet-id ${planetId}`;
    }
    const output = await this.execAsync(cmd);
    const result = this.parseJson<any>(output);
    return result.code === 0;
  }

  async getTechQueue(): Promise<TechQueue[]> {
    const output = await this.execAsync('tech queue');
    const result = this.parseJson<any>(output);
    if (result.code === 0 && result.data) {
      return result.data;
    }
    return [];
  }

  async getTechList(): Promise<Record<number, number>> {
    const output = await this.execAsync('tech list');
    const result = this.parseJson<any>(output);
    if (result.code === 0 && result.data) {
      return result.data.technologies || {};
    }
    return {};
  }

  async cancelTech(techType: number, planetId?: number): Promise<boolean> {
    let cmd = `tech cancel --type ${techType}`;
    if (planetId) {
      cmd += ` --planet-id ${planetId}`;
    }
    const output = await this.execAsync(cmd);
    const result = this.parseJson<any>(output);
    return result.code === 0;
  }

  // ========== 同步方法 ==========

  getPlayerDataSync(): PlayerData {
    const output = this.exec('game data');
    const result = this.parseJson<any>(output);
    if (result.code === 0) {
      return result.data;
    }
    throw new Error(result.msg || '获取玩家数据失败');
  }

  getPlanetsSync(): Planet[] {
    const output = this.exec('planet list');
    const result = this.parseJson<any>(output);
    if (result.code === 0) {
      return result.data;
    }
    throw new Error(result.msg || '获取星球列表失败');
  }

  getTechListSync(): Record<number, number> {
    const output = this.exec('tech list');
    const result = this.parseJson<any>(output);
    if (result.code === 0 && result.data) {
      return result.data.technologies || {};
    }
    return {};
  }
}

export default GameClient;
