/**
 * 战斗系统模块 - 攻击、侦察、防守
 */

import GameClient from './client';
import ConfigLoader from '../config';
import { SHIP_NAMES, BUILDING_NAMES } from './types';

export interface TargetInfo {
  planetId: number;
  coordinate: string;
  owner: string;
  strength: number;
  resources: { metal: number; crystal: number; deuterium: number };
}

export interface BattleResult {
  success: boolean;
  plundered: { metal: number; crystal: number; deuterium: number };
  losses: { attacker: number; defender: number };
}

export class CombatSystem {
  private client: GameClient;
  private config: ConfigLoader;

  constructor(client: GameClient, config: ConfigLoader) {
    this.client = client;
    this.config = config;
  }

  /**
   * 扫描星系，寻找弱目标
   */
  async scanGalaxy(startGalaxy: number = 1, endGalaxy: number = 5): Promise<TargetInfo[]> {
    const targets: TargetInfo[] = [];

    for (let galaxy = startGalaxy; galaxy <= endGalaxy; galaxy++) {
      for (let system = 1; system <= 100; system += 10) { // 每10个星系扫描一次
        try {
          const result = await this.scanSystem(galaxy, system);
          targets.push(...result);
        } catch (error) {
          console.log(`扫描失败 [${galaxy}:${system}]: ${error}`);
        }
      }
    }

    // 按实力排序，弱的在前
    return targets.sort((a, b) => a.strength - b.strength);
  }

  /**
   * 扫描单个星系
   */
  async scanSystem(galaxy: number, system: number): Promise<TargetInfo[]> {
    const targets: TargetInfo[] = [];
    
    try {
      const result = await this.client.execute(`galaxy info --galaxy ${galaxy} --system ${system}`);
      const data = JSON.parse(result);
      
      if (data.code === 0 && data.data) {
        for (const planet of data.data) {
          if (planet.ownerId && planet.ownerId !== this.config.getConfig().game.mainPlanetId) {
            const strength = this.calculateStrength(planet);
            targets.push({
              planetId: planet.id,
              coordinate: `${galaxy}:${system}:${planet.position}`,
              owner: planet.ownerName || 'Unknown',
              strength,
              resources: planet.resources || { metal: 0, crystal: 0, deuterium: 0 },
            });
          }
        }
      }
    } catch (error) {
      // 忽略扫描错误
    }

    return targets;
  }

  /**
   * 计算星球战斗力
   */
  private calculateStrength(planet: any): number {
    let strength = 0;
    
    // 舰船战斗力
    const ships = planet.ships || {};
    const shipStrength: Record<number, number> = {
      300: 3300, // 殖民船
      301: 470,  // 轻型战机
      302: 1250, // 重型战机
      303: 3300, // 巡洋舰
      304: 6450, // 战列舰
      305: 11550, // 战列巡洋舰
      311: 530000, // 驱逐舰
      312: 11450, // 行星轰炸机
      313: 11550, // 星际战舰
    };

    for (const [shipId, count] of Object.entries(ships)) {
      strength += (shipStrength[parseInt(shipId)] || 0) * (count as number);
    }

    // 防御设施
    const defenses = planet.defenses || {};
    const defStrength: Record<number, number> = {
      400: 200,  // 导弹发射器
      401: 350,  // 激光炮
      402: 1000, // 离子炮
      403: 2000, // 高斯炮
      404: 5000, // 等离子炮
    };

    for (const [defId, count] of Object.entries(defenses)) {
      strength += (defStrength[parseInt(defId)] || 0) * (count as number);
    }

    return strength;
  }

  /**
   * 攻击目标
   */
  async attack(target: TargetInfo, fleetComposition: Record<number, number>): Promise<boolean> {
    const config = this.config.getConfig();
    const mainPlanetId = config.game.mainPlanetId;

    try {
      // 携带一半资源
      const resources = {
        metal: Math.floor(target.resources.metal * 0.5),
        crystal: Math.floor(target.resources.crystal * 0.5),
        deuterium: Math.floor(target.resources.deuterium * 0.5),
      };

      const shipsJson = JSON.stringify(fleetComposition);
      const resourcesJson = JSON.stringify(resources);

      const result = await this.client.execute(
        `fleet send --from ${mainPlanetId} --to ${target.coordinate} --type attack --ships '${shipsJson}' --resources '${resourcesJson}'`
      );

      const data = JSON.parse(result);
      return data.code === 0;
    } catch (error) {
      console.error(`攻击失败: ${error}`);
      return false;
    }
  }

  /**
   * 侦察目标
   */
  async espionage(targetCoordinate: string): Promise<any> {
    const config = this.config.getConfig();
    
    // 使用间谍卫星侦察
    const ships = { '308': 1 }; // 假设308是间谍卫星
    
    try {
      const result = await this.client.execute(
        `fleet send --from ${config.game.mainPlanetId} --to ${targetCoordinate} --type espionage --ships '${JSON.stringify(ships)}'`
      );
      return JSON.parse(result);
    } catch (error) {
      console.error(`侦察失败: ${error}`);
      return null;
    }
  }

  /**
   * 运输资源
   */
  async transport(targetPlanetId: number, resources: { metal: number; crystal: number; deuterium: number }): Promise<boolean> {
    const config = this.config.getConfig();
    const mainPlanetId = config.game.mainPlanetId;

    try {
      const result = await this.client.execute(
        `fleet send --from ${mainPlanetId} --to ${targetPlanetId} --type transport --resources '${JSON.stringify(resources)}'`
      );
      const data = JSON.parse(result);
      return data.code === 0;
    } catch (error) {
      console.error(`运输失败: ${error}`);
      return false;
    }
  }

  /**
   * 收集废墟
   */
  async debris(targetCoordinate: string): Promise<boolean> {
    const config = this.config.getConfig();
    
    // 使用回收船
    const ships = { '309': 10 };
    
    try {
      const result = await this.client.execute(
        `fleet send --from ${config.game.mainPlanetId} --to ${targetCoordinate} --type debris --ships '${JSON.stringify(ships)}'`
      );
      const data = JSON.parse(result);
      return data.code === 0;
    } catch (error) {
      console.error(`回收失败: ${error}`);
      return false;
    }
  }

  /**
   * 进攻策略：自动攻击弱目标
   */
  async autoAttack(): Promise<void> {
    console.log('[Combat] 开始自动攻击扫描...');

    // 获取弱目标
    const targets = await this.scanGalaxy(1, 3);
    
    if (targets.length === 0) {
      console.log('[Combat] 未找到可攻击的目标');
      return;
    }

    // 选择最弱的目标
    const weakest = targets[0];
    
    if (weakest.strength < 10000) { // 只攻击战斗力低于1万的
      console.log(`[Combat] 发现弱目标: ${weakest.coordinate}, 战斗力: ${weakest.strength}`);
      
      // 使用一部分舰队攻击
      const fleet = {
        303: 10, // 巡洋舰
        304: 5,  // 战列舰
      };
      
      await this.attack(weakest, fleet);
    }
  }
}

export default CombatSystem;
