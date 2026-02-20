/**
 * Reogame Bot - 主入口
 * 
 * 自动玩星环之路游戏并提供API控制
 * 
 * 使用方法:
 *   npm run build     # 编译TypeScript
 *   npm start         # 启动机器人
 *   npm run dev      # 开发模式
 * 
 * API文档:
 *   GET  /health           - 健康检查
 *   GET  /api/status       - 完整游戏状态
 *   GET  /api/planets      - 星球列表
 *   GET  /api/planets/:id  - 星球详情
 *   GET  /api/tech         - 科技状态
 *   GET  /api/config       - 获取配置
 *   POST /api/config       - 更新配置
 *   POST /api/action/run   - 立即执行自动化
 *   POST /api/action/start - 启动自动化
 *   POST /api/action/stop  - 停止自动化
 *   GET  /api/logs         - 获取日志
 */

import * as path from 'path';
import ConfigLoader from './config';
import GameClient from './game/client';
import GameAutomation from './game/automation';
import ApiServer from './api/server';

class ReogameBot {
  private config: ConfigLoader;
  private client: GameClient;
  private automation: GameAutomation;
  private apiServer: ApiServer;

  constructor() {
    // 确定配置目录（支持从项目根目录或dist目录运行）
    const configDir = process.cwd();
    
    // 加载配置
    this.config = new ConfigLoader(configDir);
    console.log('[Bot] 配置已加载');

    // 初始化游戏客户端
    this.client = new GameClient();
    console.log('[Bot] 游戏客户端已初始化');

    // 初始化自动化模块
    this.automation = new GameAutomation(this.client, this.config);
    console.log('[Bot] 自动化模块已初始化');

    // 初始化API服务器
    this.apiServer = new ApiServer(this.client, this.automation, this.config);
    console.log('[Bot] API服务器已初始化');
  }

  async start(): Promise<void> {
    console.log('');
    console.log('========================================');
    console.log('  星环之路智能机器人 v1.0.0');
    console.log('========================================');
    console.log('');

    // 启动API服务器
    await this.apiServer.start();

    // 检查配置，决定是否自动启动
    const config = this.config.getConfig();
    if (config.automation.enabled) {
      console.log('[Bot] 自动启动自动化任务...');
      this.automation.start();
    } else {
      console.log('[Bot] 自动化已禁用，可通过API启动');
    }

    console.log('');
    console.log('========================================');
    console.log('  机器人启动完成');
    console.log('========================================');
  }

  stop(): void {
    console.log('[Bot] 正在停止...');
    this.automation.stop();
    console.log('[Bot] 已停止');
  }
}

// 启动机器人
async function main() {
  const bot = new ReogameBot();
  
  // 优雅退出
  process.on('SIGINT', () => {
    console.log('\n[Bot] 收到退出信号...');
    bot.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n[Bot] 收到终止信号...');
    bot.stop();
    process.exit(0);
  });

  await bot.start();
}

main().catch(error => {
  console.error('[Bot] 启动失败:', error);
  process.exit(1);
});
