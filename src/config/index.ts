/**
 * 配置加载模块
 */

import * as fs from 'fs';
import * as path from 'path';

export interface BotConfig {
  server: {
    port: number;
    host: string;
  };
  game: {
    mainPlanetId: number;
    shipBuildBatch: number;
    minColonyShips: number;
    techTargetExpedition: number;
  };
  automation: {
    enabled: boolean;
    intervalMs: number;
    shipPriority: number[];
    buildingPriority: number[];
  };
  logging: {
    level: string;
    retentionDays: number;
  };
}

export interface Credentials {
  username?: string;
  password?: string;
  // 其他认证信息
}

const DEFAULT_CONFIG: BotConfig = {
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  game: {
    mainPlanetId: 68168801,
    shipBuildBatch: 10,
    minColonyShips: 10,
    techTargetExpedition: 5,
  },
  automation: {
    enabled: true,
    intervalMs: 600000, // 10分钟
    shipPriority: [313, 312, 311, 307, 304, 303, 302, 301],
    buildingPriority: [100, 101, 103, 106, 108, 112, 102, 105, 109, 110, 111],
  },
  logging: {
    level: 'info',
    retentionDays: 7,
  },
};

export class ConfigLoader {
  private config: BotConfig;
  private credentials: Credentials;
  private configPath: string;
  private credentialsPath: string;

  constructor(configDir: string = '.') {
    this.configPath = path.join(configDir, 'config.json');
    this.credentialsPath = path.join(configDir, 'credentials.json');
    this.config = this.loadConfig();
    this.credentials = this.loadCredentials();
  }

  private loadConfig(): BotConfig {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf-8');
        const loaded = JSON.parse(data);
        return this.mergeDeep(DEFAULT_CONFIG, loaded);
      }
    } catch (error) {
      console.error(`[Config] 加载配置文件失败: ${error}`);
    }
    console.log('[Config] 使用默认配置');
    return DEFAULT_CONFIG;
  }

  private loadCredentials(): Credentials {
    try {
      if (fs.existsSync(this.credentialsPath)) {
        const data = fs.readFileSync(this.credentialsPath, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error(`[Config] 加载凭据文件失败: ${error}`);
    }
    return {};
  }

  private mergeDeep(target: any, source: any): any {
    const output = { ...target };
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            output[key] = source[key];
          } else {
            output[key] = this.mergeDeep(target[key], source[key]);
          }
        } else {
          output[key] = source[key];
        }
      });
    }
    return output;
  }

  private isObject(item: any): boolean {
    return item && typeof item === 'object' && !Array.isArray(item);
  }

  getConfig(): BotConfig {
    return this.config;
  }

  getCredentials(): Credentials {
    return this.credentials;
  }

  updateConfig(updates: Partial<BotConfig>): void {
    this.config = this.mergeDeep(this.config, updates);
    this.saveConfig();
  }

  saveConfig(): void {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
      console.log('[Config] 配置已保存');
    } catch (error) {
      console.error(`[Config] 保存配置失败: ${error}`);
    }
  }

  get<T = any>(key: string): T {
    const keys = key.split('.');
    let value: any = this.config;
    for (const k of keys) {
      value = value?.[k];
    }
    return value as T;
  }
}

export default ConfigLoader;
