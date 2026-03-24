# DistanceFrom.co — 产品需求文档 (PRD)

> **域名**：distancefrom.co  
> **定位**：全球城市间旅行决策助手（距离 / 驾车路线 / 飞行时间 / 中途停留 / 出行成本）  
> **商业模式**：AdSense → Ezoic/Mediavine 广告变现  
> **技术栈**：Astro (SSG + SSR Hybrid) + Cloudflare Pages  
> **创建日期**：2026-03-24  
> **最后更新**：2026-03-25

---

## 1. 产品概述

### 1.1 产品愿景
成为全球用户查询两城市间距离、真实驾车路线、飞行时间、中途停留推荐的**首选旅行决策助手**。

核心策略：通过程序化 SEO 生成海量城市对页面，提供**超越一个数字**的决策信息（Google Knowledge Panel 无法回答的内容），以长尾流量聚合实现广告变现。

**关键定位转变**：从"距离查询工具"升级为"城市间旅行决策助手"。距离只是入口，真正留住用户和提升 RPM 的是围绕距离衍生的决策信息——怎么去、中途停哪、花多少钱、飞还是开车。

### 1.2 市场验证
| 验证词 | Ahrefs KD | 等级 |
|---|---|---|
| distance from New York to Boston | **0** | Easy |
| how far is Chicago from Detroit | **0** | Easy |
| drive time Los Angeles to San Francisco | **0** | Easy |
| distance between London and Paris | **1** | Easy |
| miles from Dallas to Houston | — | No data |

**结论**：4/5 验证词 KD = 0-1，竞品最高 DR 仅 80。

**⚠️ 零点击搜索风险**：纯距离查询（"distance from X to Y"）Google 会在 SERP 顶部直接给出答案卡片，用户无需点击任何网站。KD=0 部分原因是 Google 自己截流了这类流量，竞品懒得卷。

**破局策略**：关键词必须扩展到 Google Knowledge Panel 无法回答的长尾：
- "best stops between New York and Boston"（中途停留推荐）
- "is it better to fly or drive from X to Y"（决策型内容）
- "New York to Boston road trip planner"（路线规划）
- "cheapest way to get from X to Y"（成本比较）

### 1.3 竞品分析
| 竞品 | DR | 月流量(估) | 优势 | 弱点 |
|---|---|---|---|---|
| distance.to | 59 | ~20K | 干净 UI | 功能少，仅直线距离 |
| travelmath.com | 74 | ~50K | 功能丰富 | UI 陈旧，广告过多 |
| airmilescalculator.com | 41 | ~15K | 专注航空里程 | 覆盖面窄 |
| rome2rio.com | 80 | ~500K | 多方式路线 | 偏向交通预订，非纯数据 |
| distancecalculator.net | ~55 | ~30K | SEO 好 | UI 非常老旧 |

**差异化机会**：
1. **更快**：纯静态/边缘计算，TTFB < 50ms
2. **更美**：现代深色 UI，嵌入交互地图
3. **更真实**：OSRM 真实路线距离（竞品 distance.to 只有直线距离）
4. **更智能**：中途停留推荐 + 出行成本估算 + 飞/开决策对比
5. **更完整**：直线距离 + 真实驾车距离 + 飞行时间 + 方位角 + 时区差

---

## 2. 用户画像

| 用户群 | 搜索行为 | 需求 | 预估占比 |
|---|---|---|---|
| 🧳 旅行规划者 | "distance from X to Y" | 两城市间距离和旅行时间 | 40% |
| 🚗 自驾游 | "drive time X to Y" / "best stops between X and Y" | 驾车时间 + 中途停留 | 25% |
| 🏠 搬家考虑者 | "how far is X from Y" | 评估城市距离 | 15% |
| 📦 物流从业 | "miles from X to Y" | 运输距离参考 | 10% |
| 📚 学生/好奇心 | "distance between X and Y" | 地理知识 | 10% |

---

## 3. 功能规划

### 3.1 MVP（Phase 1 — Week 1-2）
| 功能 | 优先级 | 说明 |
|---|---|---|
| 📏 直线距离 | P0 | Haversine 公式，km + miles |
| 🚗 真实驾车距离 | P0 | OSRM 预计算数据（热门城市对），Haversine × 系数（长尾兜底） |
| ⏱️ 真实驾车时间 | P0 | OSRM 预计算数据（热门城市对），估算兜底 |
| ✈️ 飞行时间(估算) | P0 | 直线距离 ÷ 飞行速度 |
| 🧭 方位角 | P0 | 从 A 到 B 的罗盘方向 |
| 🗺️ 交互地图 | P0 | Leaflet + OpenStreetMap，可拖拽缩放，两点连线 |
| 🔗 内链网络 | P0 | 相关城市对推荐（每页 ≥12 内链） |
| 🔍 搜索框 | P0 | 双城市输入 + 自动补全 |
| 📊 中途停留城市 | P0 | ⬆️ 从 Phase 2 提前：两点连线附近的热门城市推荐 |
| 💰 出行成本估算 | P0 | 油费估算（距离 ÷ 油耗 × 区域油价） |
| 🔄 反向距离 | P0 | ⬆️ 从 Phase 2 提前：自动链接 B → A 页面 |
| 📋 数据来源标注 | P0 | 引用 GeoNames、OpenStreetMap、OSRM，提升 E-E-A-T |

### 3.2 Phase 2（Week 3-4）
| 功能 | 优先级 | 说明 |
|---|---|---|
| 🕐 时区差异 | P1 | 两城市时区差 + 当前时间对比 |
| 🏙️ 城市对比 | P2 | 人口、海拔等基础对比数据 |
| 🎯 城市 Hub 增强 | P1 | 同心圆可视化（1h/3h/5h 可达城市）+ 最近国际机场 |
| ✈️🚗 飞/开决策对比 | P1 | 时间 + 成本对比，帮用户决定飞还是开 |

### 3.3 Phase 3（Week 5+）
| 功能 | 优先级 | 说明 |
|---|---|---|
| 🌍 多语言 | P2 | 西班牙语、法语等 |
| 🔌 距离 API | P3 | 开放 API → 吸引外链 |
| 📱 PWA | P3 | 离线可用 |
| 🗺️ Multi-stop Trip Planner | P2 | 多城市路线规划，自动计算总距离和最优顺序 |

---

## 4. 技术架构

### 4.1 整体架构

```
┌─────────────────────────────────────────────┐
│           Cloudflare CDN Edge                │
│        (300+ 全球节点，自动缓存)               │
├──────────────┬──────────────────────────────┤
│   SSG 静态页  │     SSR 动态页                │
│ (50K-100K 文件)│  (Workers + Cache API + KV) │
│              │                              │
│ • 首页       │ • 长尾城市对距离页              │
│ • Top 40K    │ • 搜索结果页                   │
│   热门城市对  │                              │
│  (Top200城市  │ 流程:                          │
│   两两组合)   │ 1. 请求到 Worker               │
│ • 城市 Hub   │ 2. 查 Cache API → 命中返回     │
│ • sitemap    │ 3. 查 KV → 命中返回            │
│              │ 4. 未命中 → Haversine 计算      │
│              │ 5. 写入 Cache API + KV → 返回   │
└──────────────┴──────────────────────────────┘
```

**缓存策略**：
- Cache API（免费，一级缓存）→ KV（二级缓存，TTL=30d）→ 实时计算（兜底）
- SSG 扩大到 50K-100K 页面（Top 200 城市两两组合 ≈ 40K 对），覆盖真正有搜索量的页面

### 4.2 OSRM 真实路线数据预计算

**方案：使用 OSRM 公共 Demo API 离线批量预计算**

```
预计算流程:
1. 准备 Top 200 城市列表 → 约 40,000 城市对
2. 脚本调用 OSRM Demo API (router.project-osrm.org)
3. 每秒 5 个请求，约 2-3 小时完成
4. 结果存入 route-data.json（真实驾车距离 + 时间）
5. 构建时合并到页面数据中
6. 长尾城市对仍用 Haversine × 系数估算，页面标注 "estimated"
```

**数据结构**：
```json
// src/data/route-data.json
{
  "boston-to-new-york": {
    "drivingDistanceKm": 346.2,
    "drivingDistanceMiles": 215.1,
    "drivingDurationMin": 232,
    "source": "osrm"
  }
}
```

**成本：零**（OSRM Demo API 免费，仅用于一次性离线预计算）

### 4.3 项目结构

```
distancefrom/
├── astro.config.mjs
├── package.json
├── tsconfig.json
├── scripts/
│   ├── fetch-osrm-routes.ts        ← OSRM 批量预计算脚本
│   ├── prepare-cities.ts           ← GeoNames 数据处理
│   └── generate-popular-pairs.ts   ← 生成热门城市对列表
├── public/
│   ├── favicon.svg
│   └── og-image.png
├── src/
│   ├── assets/styles/
│   │   ├── global.css
│   │   └── variables.css
│   ├── components/
│   │   ├── Header.astro
│   │   ├── Footer.astro
│   │   ├── DualSearchBox.astro     ← 双城市搜索框
│   │   ├── DistanceResult.astro    ← 距离结果卡片
│   │   ├── Map.astro               ← Leaflet 交互地图+连线
│   │   ├── QuickFacts.astro        ← 坐标/方位/时区差
│   │   ├── MidwayStops.astro       ← 中途停留城市推荐
│   │   ├── TripCostEstimate.astro  ← 出行成本估算
│   │   ├── RelatedDistances.astro  ← 相关城市对(内链)
│   │   ├── PopularRoutes.astro     ← 热门路线(首页)
│   │   ├── DataSources.astro       ← 数据来源标注(E-E-A-T)
│   │   ├── AdUnit.astro
│   │   └── LanguageSwitcher.astro
│   ├── data/
│   │   ├── cities.json             ← GeoNames top 5000
│   │   ├── popular-pairs.json      ← 预定义热门城市对
│   │   ├── route-data.json         ← OSRM 预计算真实路线数据
│   │   └── fuel-prices.json        ← 区域平均油价（手动维护）
│   ├── i18n/
│   │   ├── en.json
│   │   └── utils.ts
│   ├── utils/
│   │   ├── haversine.ts            ← 核心距离计算
│   │   ├── bearing.ts              ← 方位角计算
│   │   ├── drive-estimate.ts       ← 驾车距离/时间（OSRM数据优先，估算兜底）
│   │   ├── flight-estimate.ts      ← 飞行时间估算
│   │   ├── midway-stops.ts         ← 中途城市计算（点到线段距离）
│   │   ├── trip-cost.ts            ← 出行成本计算
│   │   ├── seo.ts                  ← meta/canonical/JSON-LD
│   │   ├── sitemap.ts
│   │   └── slug.ts
│   ├── layouts/
│   │   └── Base.astro
│   └── pages/
│       ├── index.astro             ← 首页 (SSG)
│       ├── distance/
│       │   └── [from]-to-[to].astro ← 距离页 (SSG 热门 + SSR 长尾)
│       ├── city/
│       │   └── [city].astro        ← 城市 Hub (SSG Top200 + SSR 长尾)
│       ├── about.astro
│       ├── privacy.astro
│       ├── sitemap/
│       │   └── [index].xml.ts
│       └── robots.txt.ts
```

### 4.4 核心算法模块

#### Haversine 距离计算
```typescript
// src/utils/haversine.ts
// 输入: lat1, lng1, lat2, lng2
// 输出: { km: number, miles: number }
// 精度: ≤ 0.5% 误差（地球椭球体近似）
```

#### 驾车距离/时间（双数据源）
```typescript
// src/utils/drive-estimate.ts
// 优先级:
//   1. 查 route-data.json（OSRM 真实数据）→ 页面标注 "actual route"
//   2. 兜底: Haversine × 系数估算 → 页面标注 "estimated"
// 估算规则:
//   距离 < 100km → 系数 1.3（城市道路多弯路）
//   距离 100-500km → 系数 1.25（高速为主）
//   距离 > 500km → 系数 1.2（长途高速）
//   跨洲/跨海 → 标注"无法驾车"
// 平均速度: 80km/h（含休息）
```

#### 飞行时间估算
```typescript
// src/utils/flight-estimate.ts
// 规则: 直线距离 ÷ 800km/h + 30min (起降)
// 距离 < 200km → 标注"通常无直飞航班"
```

#### 中途停留城市
```typescript
// src/utils/midway-stops.ts
// 算法: 
//   1. 计算 A→B 的大圆航线
//   2. 从 cities.json 筛出距离该航线 ≤ 50km 的城市
//   3. 排除 A 和 B 本身
//   4. 按人口排序取 Top 5
// 纯几何计算，零外部依赖
```

#### 出行成本估算
```typescript
// src/utils/trip-cost.ts
// 油费 = 驾车距离(km) ÷ 油耗(L/100km) × 区域油价($/L)
// 默认油耗: 8L/100km（中型轿车）
// 区域油价: fuel-prices.json（按国家/地区，手动每月更新）
//   美国: $3.50/gallon → $0.92/L
//   欧洲: €1.60/L
//   亚洲: 按国家区分
```

### 4.5 数据模型

#### 城市数据 (cities.json)
```json
{
  "new-york": {
    "name": "New York",
    "country": "US",
    "countryName": "United States",
    "state": "New York",
    "lat": 40.7128,
    "lng": -74.0060,
    "timezone": "America/New_York",
    "population": 8336817,
    "elevation": 10,
    "nearby": ["newark", "jersey-city", "philadelphia"]
  }
}
```

#### 油价数据 (fuel-prices.json)
```json
{
  "US": { "currency": "USD", "pricePerLiter": 0.92, "unit": "gallon", "pricePerUnit": 3.50 },
  "GB": { "currency": "GBP", "pricePerLiter": 1.45, "unit": "liter", "pricePerUnit": 1.45 },
  "DE": { "currency": "EUR", "pricePerLiter": 1.65, "unit": "liter", "pricePerUnit": 1.65 }
}
```

---

## 5. 页面设计

### 5.1 首页 (`/`)
- **H1**: "Distance Calculator — How Far Between Cities"
- 双城市搜索框（From / To）
- 热门路线网格（Top 20 最搜城市对）
- 按大洲浏览城市

### 5.2 距离详情页 (`/distance/new-york-to-boston/`)
```
┌──────────────────────────────────────────┐
│ Distance from New York to Boston         │ ← H1
├──────────────────────────────────────────┤
│ 📏 190 miles (306 km) straight line      │
│ 🚗 215 miles (346 km) driving            │ ← OSRM真实数据
│ ⏱️ 3h 52min drive time                   │ ← OSRM真实数据
│ ✈️ ~53min flight time                     │
│ 🧭 Bearing: 52° (NE)                     │
│ 💰 Est. fuel cost: $28 - $35             │ ← 出行成本
├──────────────────────────────────────────┤
│ [Ad Unit #1 — 结果卡片与地图之间]          │ ← 用户必看位置
├──────────────────────────────────────────┤
│ [Leaflet 交互地图 — 可拖拽缩放 + 连线]     │
├──────────────────────────────────────────┤
│ 🛑 Best Stops Between NYC & Boston       │ ← 中途停留（核心差异化）
│ • Hartford, CT — 118 mi from NYC         │
│ • New Haven, CT — 80 mi from NYC         │
│ • Providence, RI — 50 mi from Boston     │
├──────────────────────────────────────────┤
│ Quick Facts                               │
│ NYC: 40.71°N, 74.01°W | EST (UTC-5)     │
│ Boston: 42.36°N, 71.06°W | EST (UTC-5)  │
│ Time Difference: 0 hours                  │
│ Elevation: NYC 10m → Boston 43m          │
├──────────────────────────────────────────┤
│ [Ad Unit #2 — Quick Facts 与内链之间]      │
├──────────────────────────────────────────┤
│ 🔗 Related Distances from New York       │ ← 可展开卡片
│ • → Philadelphia: 95 mi                  │
│ • → Washington DC: 225 mi               │
│ 🔗 Related Distances from Boston         │
│ • → Providence: 50 mi                    │
│ • → Hartford: 100 mi                     │
├──────────────────────────────────────────┤
│ 🔄 Reverse: Boston to New York           │
│ 📋 Sources: OpenStreetMap, OSRM, GeoNames│ ← E-E-A-T
│ [Ad Unit #3 — 粘性底部广告 Anchor Ad]     │ ← 移动端高RPM
└──────────────────────────────────────────┘
```

### 5.3 城市 Hub 页 (`/city/new-york/`)
- **H1**: "Distances from New York to Major Cities"
- 同心圆可视化：1h / 3h / 5h 驾车可达城市（Phase 2）
- 最近国际机场及距离
- 按距离排序的所有城市对链接
- 按国家/大洲分类

---

## 6. SEO 策略

### 6.1 页面 SEO
| 元素 | 规则 |
|---|---|
| Title | `{A} to {B}: Distance, Drive Time, Best Route & Stops (2026)` |
| Meta Description | `{A} to {B} is {miles} miles. Drive: {hours}, ~${cost} fuel. Flight: ~{flight}. Plus best stops along the way.` |
| H1 | `Distance from {A} to {B}` |
| Canonical | 字母序排城市名，避免 A→B 与 B→A 重复 |

**Title 设计原则**：包含 Google Knowledge Panel 无法回答的元素（"Best Route & Stops"），提升 CTR。

### 6.2 Canonical 去重策略（关键）
- `new-york-to-boston` 和 `boston-to-new-york` 是同一距离
- 规则：**按字母序排列**，canonical 指向 `boston-to-new-york`（B < N）
- 反向页面自动 301 到正向页面
- 这样避免 50% 的重复内容问题

### 6.3 内链策略
每页最少 12 个内链：
- 4-6 个从 A 出发的其他热门目的地
- 4-6 个从 B 出发的其他热门目的地
- 1 个反向链接（B → A）
- 2 个城市 Hub 页链接
- 中途停留城市的相关距离页链接（额外 3-5 个）

### 6.4 Sitemap 分批提交策略
- **不要一次性提交全部页面**，Google 会忽略
- 按每周 5,000-10,000 页的节奏递增提交
- 配合 GSC 索引请求
- Sitemap 分块：每个 sitemap 文件 ≤ 10,000 URL

### 6.5 E-E-A-T 信号
- 每页底部标注数据来源（GeoNames、OpenStreetMap、OSRM）
- About 页面说明计算方法论
- OSRM 数据标注 "actual route"，估算数据标注 "estimated"
- 诚实标注建立用户信任

---

## 7. 广告策略

### 7.1 广告位布局（针对工具站用户停留时间短的特点优化）

| 广告位 | 位置 | 原因 |
|---|---|---|
| Ad #1 | 距离结果卡片与地图之间 | 用户必看区域，首屏可见 |
| Ad #2 | Quick Facts 与 Related Distances 之间 | 内容消费中段 |
| Ad #3 | 粘性底部广告（Anchor Ad） | 移动端 RPM 最高的格式 |

### 7.2 提升页面停留时间（直接影响广告展示次数和 RPM）
- 地图做成可交互（拖拽、缩放），用户多停留 10-15 秒
- Related Distances 做成可展开卡片而非纯链接列表
- 中途停留城市推荐增加用户阅读时间
- 出行成本估算让用户有理由多待

### 7.3 广告平台演进路线
| 阶段 | 日 UV | 平台 | 预估 RPM |
|---|---|---|---|
| 初期 | 0-1,000 | Google AdSense | $3-5 |
| 中期 | 1,000-5,000 | Ezoic（基本无门槛） | $8-12 |
| 成熟 | 5,000+ | Mediavine（需 50K 月 sessions） | $15-25 |

**不做邮件订阅**——工具站邮件转化率接近零，浪费开发时间。

---

## 8. 性能目标

| 指标 | 目标值 |
|---|---|
| Lighthouse Performance | ≥ 95 |
| Lighthouse SEO | ≥ 98 |
| TTFB | < 50ms |
| FCP | < 1.0s |
| 页面大小 | < 60KB (含地图瓦片请求除外) |
| 平均停留时间 | > 45s（30天）→ > 90s（180天） |

---

## 9. 里程碑

### M1: 数据准备 + 项目脚手架（Day 1-3）
- [ ] 初始化 Astro 项目 + 配置 Cloudflare adapter
- [ ] 准备城市数据（GeoNames top 5000 → cities.json）
- [ ] 实现 Haversine + 方位角 + 飞行估算模块
- [ ] 编写 OSRM 批量预计算脚本（fetch-osrm-routes.ts）
- [ ] 运行 OSRM 预计算：Top 200 城市 × 两两组合 ≈ 40K 对（约 2-3 小时）
- [ ] 准备 fuel-prices.json 油价数据
- [ ] 实现 drive-estimate.ts（OSRM 优先 + 估算兜底）
- [ ] 实现 midway-stops.ts + trip-cost.ts

### M2: 页面模板（Day 4-7）
- [ ] Base 布局 + Header/Footer
- [ ] 首页 + 双城市搜索（自动补全）
- [ ] 距离详情页模板（含所有组件）
- [ ] Leaflet 交互地图组件
- [ ] 中途停留城市组件
- [ ] 出行成本估算组件
- [ ] 数据来源标注组件
- [ ] 城市 Hub 页模板

### M3: SEO + 广告 + 部署（Day 8-10）
- [ ] Canonical 去重逻辑 + 301 重定向
- [ ] Title/Meta 模板（含 "Best Route & Stops"）
- [ ] JSON-LD 结构化数据
- [ ] Sitemap 分块生成
- [ ] 内链网络（每页 ≥12 链接）
- [ ] 广告位组件（3 个位置）
- [ ] 部署 Cloudflare Pages

### M4: 扩展 + 优化（Day 11-14）
- [ ] SSG 预生成 Top 40K 热门城市对页面
- [ ] SSG 预生成 Top 200 城市 Hub 页
- [ ] SSR 长尾页面 + Cache API + KV 缓存
- [ ] Lighthouse 优化至目标值
- [ ] 提交 GSC（首批 5,000-10,000 页）
- [ ] 后续每周递增提交 sitemap

---

## 10. 成功指标

| 指标 | 30 天 | 90 天 | 180 天 |
|---|---|---|---|
| 索引页面数 | 10,000 | 100,000 | 300,000 |
| 日均自然流量 | 50 | 500 | 5,000 |
| 广告月收入 | $0 | $50-150 | $500-1,500 |
| 平均停留时间 | > 45s | > 60s | > 90s |
| 广告平台 | AdSense | Ezoic | Mediavine |

---

## 11. 成本结构

| 项目 | 成本 | 说明 |
|---|---|---|
| 域名 | ~$10/年 | distancefrom.co |
| Cloudflare Pages | $0 | 免费额度（日 10 万请求） |
| Cloudflare Workers | $0 → $5/月 | 日 UV 过万后可能需要付费计划 |
| OSRM 数据预计算 | $0 | 使用公共 Demo API 一次性批量计算 |
| 城市数据 | $0 | GeoNames 开源免费 |
| 地图 | $0 | OpenStreetMap + Leaflet 开源免费 |
| 油价数据 | $0 | 手动维护区域平均值 |
| **总计** | **~$10/年 → $70/年** | 流量起来前几乎零成本 |
