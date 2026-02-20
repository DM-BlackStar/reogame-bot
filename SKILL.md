---
name: reogame-bot
description: 星环之路 (Reogame) 自动化机器人。通过 REST API 自动玩游戏，包括舰船建造、建筑升级、科技研究、殖民扩张等。支持随时通过 API 调整策略。
metadata: {"openclaw": {"emoji": "🚀", "requires": {"anyBins": ["node", "ogame"]}}}
---

# Reogame Bot 使用指南

这是一个自动化机器人，用于自动玩星环之路 (Reogame) 太空策略游戏。

## 启动机器人

```bash
cd /root/.openclaw/workspace/projects/reogame-bot
npm run build
npm start
```

API 默认端口: **3001**

## API 接口

### 状态查询

```bash
# 完整游戏状态
curl http://localhost:3001/api/status

# 星球列表
curl http://localhost:3001/api/planets

# 科技状态
curl http://localhost:3001/api/tech

# 配置
curl http://localhost:3001/api/config
```

### 操作控制

```bash
# 立即执行一次自动化
curl -X POST http://localhost:3001/api/action/run

# 启动自动化（后台运行）
curl -X POST http://localhost:3001/api/action/start

# 停止自动化
curl -X POST http://localhost:3001/api/action/stop
```

### 调整策略

```bash
# 更新舰船建造优先级（最强战舰优先）
curl -X POST http://localhost:3001/api/config \
  -H "Content-Type: application/json" \
  -d '{"automation":{"shipPriority":[313,312,311,307,304,303,302,301]}}'

# 更新建筑升级优先级
curl -X POST http://localhost:3001/api/config \
  -H "Content-Type: application/json" \
  -d '{"automation":{"buildingPriority":[100,101,103,106,108,112,102,105]}}'

# 修改主星球ID
curl -X POST http://localhost:3001/api/config \
  -H "Content-Type: application/json" \
  -d '{"game":{"mainPlanetId":68168801}}'
```

### 手动操作

```bash
# 建造舰船 (planetId: 星球ID, shipType: 舰船ID)
curl -X POST http://localhost:3001/api/action/build-ship \
  -H "Content-Type: application/json" \
  -d '{"planetId":68168801,"shipType":313,"amount":10}'

# 升级建筑
curl -X POST http://localhost:3001/api/action/build-building \
  -H "Content-Type: application/json" \
  -d '{"planetId":68168801,"buildingType":100}'

# 研究科技
curl -X POST http://localhost:3001/api/action/research \
  -H "Content-Type: application/json" \
  -d '{"techType":214}'
```

## 舰船 ID 参考

| ID | 名称 | 战斗力 |
|----|------|--------|
| 313 | 星际战舰 | 11,550 |
| 312 | 行星轰炸机 | 11,450 |
| 311 | 驱逐舰 | 530,000 |
| 307 | 战列巡洋舰 | 11,550 |
| 304 | 战列舰 | 6,450 |
| 303 | 巡洋舰 | 3,300 |
| 302 | 重型战机 | 1,250 |
| 301 | 轻型战机 | 470 |
| 300 | 殖民船 | 3,300 |

## 建筑 ID 参考

| ID | 名称 |
|----|------|
| 100 | 金属厂 |
| 101 | 水晶厂 |
| 102 | 重氢厂 |
| 103 | 太阳能电站 |
| 106 | 机器人工厂 |
| 108 | 造船厂 |
| 112 | 研究院 |

## 科技 ID 参考

| ID | 名称 | 效果 |
|----|------|------|
| 214 | 探险技术 | +1殖民星球/级 |
| 209 | 超空间引擎 | +30%超空间速度/级 |
| 208 | 脉冲引擎 | +10%脉冲速度/级 |
| 202 | 武器技术 | +10%攻击/级 |
| 203 | 护盾技术 | +10%护盾/级 |
| 204 | 装甲技术 | +10%装甲/级 |

## 战略建议

### 快速发展期
- 优先升级资源建筑 (金属厂、水晶厂)
- 优先研究探险技术以扩张殖民地
- 保持一定战斗舰船保护资源

### 战力提升期
- 无限建造战斗舰船 (战列舰→巡洋舰)
- 升级武器/护盾/装甲科技
- 建造防御设施

### 霸权期
- 保持多星球同时发展
- 建设大量战斗舰队
- 攻击弱小企业获取资源

## 查看日志

```bash
# 最新日志
curl http://localhost:3001/api/logs
```

## 配置说明

编辑 `config.json`:

```json
{
  "server": {
    "port": 3001,
    "host": "0.0.0.0"
  },
  "game": {
    "mainPlanetId": 68168801,
    "shipBuildBatch": 10,
    "minColonyShips": 10,
    "techTargetExpedition": 5
  },
  "automation": {
    "enabled": true,
    "intervalMs": 600000,
    "shipPriority": [313, 312, 311, 307, 304, 303, 302, 301],
    "buildingPriority": [100, 101, 103, 106, 108, 112, 102, 105]
  }
}
```

---

**项目地址**: https://github.com/DM-BlackStar/reogame-bot
