/**
 * API 服务器
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import * as fs from 'fs';
import * as path from 'path';
import GameClient from '../game/client';
import GameAutomation from '../game/automation';
import ConfigLoader from '../config';

export class ApiServer {
  private app: express.Application;
  private client: GameClient;
  private automation: GameAutomation;
  private config: ConfigLoader;
  private port: number;
  private host: string;

  constructor(
    client: GameClient, 
    automation: GameAutomation, 
    config: ConfigLoader
  ) {
    this.app = express();
    this.client = client;
    this.automation = automation;
    this.config = config;
    
    const serverConfig = config.getConfig().server;
    this.port = serverConfig.port;
    this.host = serverConfig.host;

    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // 请求日志
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[API] ${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
      });
      next();
    });
  }

  private setupRoutes(): void {
    // 健康检查
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({ status: 'ok', timestamp: Date.now() });
    });

    // ========== 游戏状态 ==========

    // 获取完整游戏状态
    this.app.get('/api/status', async (req: Request, res: Response) => {
      try {
        const playerData = await this.client.getPlayerData();
        const planets = await this.client.getPlanets();
        const techList = await this.client.getTechList();
        const techQueue = await this.client.getTechQueue();
        const automationState = this.automation.getState();
        const automationStats = this.automation.getStats();

        res.json({
          success: true,
          data: {
            player: {
              id: playerData.id,
              username: playerData.username,
              points: playerData.points,
            },
            planets: planets.map(p => ({
              id: p.id,
              name: p.name,
              coordinate: `${p.coordinate.galaxy}:${p.coordinate.system}:${p.coordinate.planet}`,
              type: p.type === 1 ? '行星' : '卫星',
              resources: p.resources_1,
              ships: p.ships,
              buildings: p.buildings,
            })),
            technologies: techList,
            techQueue: techQueue.map(t => ({
              target: t.target,
              added: t.added,
              remaining: Math.max(0, t.endTime - Date.now()),
            })),
            automation: {
              running: automationState.running,
              lastRun: automationState.lastRun,
              lastError: automationState.lastError,
              stats: automationStats,
            },
          },
          timestamp: Date.now(),
        });
      } catch (error: any) {
        res.status(500).json({
          success: false,
          error: error.message || String(error),
          timestamp: Date.now(),
        });
      }
    });

    // 获取星球列表
    this.app.get('/api/planets', async (req: Request, res: Response) => {
      try {
        const planets = await this.client.getPlanets();
        res.json({
          success: true,
          data: planets.map(p => ({
            id: p.id,
            name: p.name,
            coordinate: `${p.coordinate.galaxy}:${p.coordinate.system}:${p.coordinate.planet}`,
            type: p.type,
            resources: p.resources_1,
            shipsCount: Object.values(p.ships || {}).reduce((a, b) => a + b, 0),
            buildingsCount: Object.keys(p.buildings || {}).length,
          })),
          timestamp: Date.now(),
        });
      } catch (error: any) {
        res.status(500).json({ success: false, error: error.message, timestamp: Date.now() });
      }
    });

    // 获取单个星球详情
    this.app.get('/api/planets/:id', async (req: Request, res: Response) => {
      try {
        const planetId = parseInt(req.params.id);
        const planet = await this.client.getPlanetDetail(planetId);
        res.json({
          success: true,
          data: planet,
          timestamp: Date.now(),
        });
      } catch (error: any) {
        res.status(500).json({ success: false, error: error.message, timestamp: Date.now() });
      }
    });

    // ========== 科技 ==========

    // 获取科技状态
    this.app.get('/api/tech', async (req: Request, res: Response) => {
      try {
        const techList = await this.client.getTechList();
        const techQueue = await this.client.getTechQueue();
        
        res.json({
          success: true,
          data: {
            technologies: techList,
            queue: techQueue.map(t => ({
              id: t.id,
              target: t.target,
              added: t.added,
              startTime: t.startTime,
              endTime: t.endTime,
              remaining: Math.max(0, t.endTime - Date.now()),
            })),
            queueCount: techQueue.length,
          },
          timestamp: Date.now(),
        });
      } catch (error: any) {
        res.status(500).json({ success: false, error: error.message, timestamp: Date.now() });
      }
    });

    // ========== 配置 ==========

    // 获取当前配置
    this.app.get('/api/config', (req: Request, res: Response) => {
      res.json({
        success: true,
        data: this.config.getConfig(),
        timestamp: Date.now(),
      });
    });

    // 更新配置
    this.app.post('/api/config', (req: Request, res: Response) => {
      try {
        const updates = req.body;
        this.config.updateConfig(updates);
        res.json({
          success: true,
          message: '配置已更新',
          timestamp: Date.now(),
        });
      } catch (error: any) {
        res.status(400).json({ success: false, error: error.message, timestamp: Date.now() });
      }
    });

    // ========== 操作 ==========

    // 立即执行自动化
    this.app.post('/api/action/run', async (req: Request, res: Response) => {
      try {
        await this.automation.run();
        res.json({
          success: true,
          message: '自动化任务已执行',
          timestamp: Date.now(),
        });
      } catch (error: any) {
        res.status(500).json({ success: false, error: error.message, timestamp: Date.now() });
      }
    });

    // 启动自动化
    this.app.post('/api/action/start', (req: Request, res: Response) => {
      const intervalMs = req.body.intervalMs;
      this.automation.start(intervalMs);
      res.json({
        success: true,
        message: '自动化已启动',
        timestamp: Date.now(),
      });
    });

    // 停止自动化
    this.app.post('/api/action/stop', (req: Request, res: Response) => {
      this.automation.stop();
      res.json({
        success: true,
        message: '自动化已停止',
        timestamp: Date.now(),
      });
    });

    // 重置统计
    this.app.post('/api/action/reset-stats', (req: Request, res: Response) => {
      this.automation.resetStats();
      res.json({
        success: true,
        message: '统计已重置',
        timestamp: Date.now(),
      });
    });

    // 建造舰船
    this.app.post('/api/action/build-ship', async (req: Request, res: Response) => {
      try {
        const { planetId, shipType, amount } = req.body;
        if (!planetId || !shipType) {
          throw new Error('缺少必要参数: planetId, shipType');
        }
        const result = await this.client.buildShip(planetId, shipType, amount || 1);
        res.json({
          success: result,
          message: result ? '建造成功' : '建造失败',
          timestamp: Date.now(),
        });
      } catch (error: any) {
        res.status(400).json({ success: false, error: error.message, timestamp: Date.now() });
      }
    });

    // 升级建筑
    this.app.post('/api/action/build-building', async (req: Request, res: Response) => {
      try {
        const { planetId, buildingType } = req.body;
        if (!planetId || !buildingType) {
          throw new Error('缺少必要参数: planetId, buildingType');
        }
        const result = await this.client.buildBuilding(planetId, buildingType);
        res.json({
          success: result,
          message: result ? '建造成功' : '建造失败',
          timestamp: Date.now(),
        });
      } catch (error: any) {
        res.status(400).json({ success: false, error: error.message, timestamp: Date.now() });
      }
    });

    // 研究科技
    this.app.post('/api/action/research', async (req: Request, res: Response) => {
      try {
        const { techType, planetId } = req.body;
        if (!techType) {
          throw new Error('缺少必要参数: techType');
        }
        const result = await this.client.researchTech(techType, 1, planetId);
        res.json({
          success: result,
          message: result ? '研究已开始' : '研究失败',
          timestamp: Date.now(),
        });
      } catch (error: any) {
        res.status(400).json({ success: false, error: error.message, timestamp: Date.now() });
      }
    });

    // ========== 日志 ==========

    // 获取日志
    this.app.get('/api/logs', (req: Request, res: Response) => {
      try {
        const logDir = path.join(process.cwd(), 'logs');
        const limit = parseInt(req.query.limit as string) || 100;
        
        if (!fs.existsSync(logDir)) {
          res.json({ success: true, data: [], timestamp: Date.now() });
          return;
        }

        const files = fs.readdirSync(logDir)
          .filter(f => f.startsWith('automation_') && f.endsWith('.log'))
          .sort()
          .reverse()
          .slice(0, 1);

        let logs: string[] = [];
        for (const file of files) {
          const content = fs.readFileSync(path.join(logDir, file), 'utf-8');
          logs = content.split('\n').filter(l => l.trim());
        }

        res.json({
          success: true,
          data: logs.slice(-limit),
          timestamp: Date.now(),
        });
      } catch (error: any) {
        res.status(500).json({ success: false, error: error.message, timestamp: Date.now() });
      }
    });

    // 404 处理
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        error: '接口不存在',
        timestamp: Date.now(),
      });
    });

    // 错误处理
    this.app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      console.error('[API] 错误:', err);
      res.status(500).json({
        success: false,
        error: err.message || '服务器内部错误',
        timestamp: Date.now(),
      });
    });
  }

  start(): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(this.port, this.host, () => {
        console.log(`[API] 服务器已启动: http://${this.host}:${this.port}`);
        console.log('[API] 可用接口:');
        console.log('  GET  /health           - 健康检查');
        console.log('  GET  /api/status       - 完整游戏状态');
        console.log('  GET  /api/planets      - 星球列表');
        console.log('  GET  /api/planets/:id  - 星球详情');
        console.log('  GET  /api/tech         - 科技状态');
        console.log('  GET  /api/config       - 获取配置');
        console.log('  POST /api/config       - 更新配置');
        console.log('  POST /api/action/run   - 立即执行');
        console.log('  POST /api/action/start - 启动自动化');
        console.log('  POST /api/action/stop  - 停止自动化');
        console.log('  GET  /api/logs         - 获取日志');
        resolve();
      });
    });
  }
}

export default ApiServer;
