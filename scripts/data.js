// ===== GAME DATA =====
// This file contains all static game configuration data

const INITIAL_MONEY = 839000000000; // 8390亿（福布斯2026年3月权威数据）

const CATEGORIES = [
  { id: 'consumption', name: '炸裂消费', icon: '💥' },
  { id: 'daily', name: '日常消费', icon: '☕' },
  { id: 'trade', name: '囤货交易', icon: '📦' },
  { id: 'gamble', name: '豪赌博弈', icon: '🎰' },
  { id: 'invest', name: '风险投资', icon: '📈' },
  { id: 'insane', name: '丧心病狂', icon: '🔥' },
  { id: 'cleanup', name: '尾款清扫', icon: '🧹' }
];

const ACTIONS = {
  consumption: [
    {
      id: 'weather',
      name: '私人定制气象改造',
      baseCost: 15000000,
      cd: 30000,
      type: 'parallel',
      desc: '指定城市24小时气象调控（人工消雨/增雪/晴天）',
      stock: 100,
      stockCd: 604800000
    },
    {
      id: 'ads',
      name: '包下全球地标广告屏',
      baseCost: 12000000,
      cd: 15000,
      type: 'parallel',
      desc: '全球TOP50地标大屏24小时冠名',
      stock: 200,
      stockCd: 86400000
    },
    {
      id: 'weapon',
      name: '退役战机/军舰收藏',
      baseCost: 1500000000,
      cd: 120000,
      type: 'parallel',
      desc: '军用装备民用拍卖（战斗机/护卫舰/驱逐舰）',
      stock: 50,
      stockCd: 604800000
    },
    {
      id: 'pet',
      name: '天价动植物专属培育',
      baseCost: 12000000,
      cd: 20000,
      type: 'parallel',
      desc: '纯种赛马/白虎/锦鲤/珍稀保护动物',
      stock: 200,
      stockCd: 43200000
    },
    {
      id: 'road',
      name: '全球公路/路灯包年养护',
      baseCost: 200000000,
      cd: 60000,
      type: 'parallel',
      desc: '城市公共设施全年养护成本',
      stock: 500,
      stockCd: 259200000
    }
  ],

  daily: [
    {
      id: 'tesla',
      name: '特斯拉Model S/X定制',
      baseCost: 200000,
      cd: 5000,
      type: 'parallel',
      desc: '定制特斯拉爱车，配备最新功能',
      stock: 1000,
      stockCd: 86400000
    },
    {
      id: 'jet',
      name: '私人飞机包机（国内）',
      baseCost: 150000,
      cd: 10000,
      type: 'parallel',
      desc: '包机出行，节省时间',
      stock: 500,
      stockCd: 86400000
    },
    {
      id: 'spacex_ticket',
      name: 'SpaceX发射观赏贵宾席',
      baseCost: 5000000,
      cd: 30000,
      type: 'parallel',
      desc: '观看自家火箭发射，VIP观摩席',
      stock: 200,
      stockCd: 604800000
    },
    {
      id: 'neuralink',
      name: 'Neuralink配套服务',
      baseCost: 500000,
      cd: 15000,
      type: 'parallel',
      desc: '脑机接口后续维护与升级服务',
      stock: 500,
      stockCd: 86400000
    },
    {
      id: 'boring_tunnel',
      name: 'Boring Company隧道通行',
      baseCost: 1000000,
      cd: 10000,
      type: 'parallel',
      desc: '地下高速隧道通行费',
      stock: 1000,
      stockCd: 86400000
    },
    {
      id: 'hollywood_party',
      name: '好莱坞派对赞助',
      baseCost: 2000000,
      cd: 30000,
      type: 'parallel',
      desc: '名人派对赞助，与明星社交',
      stock: 200,
      stockCd: 604800000
    },
    {
      id: 'twitter_blue',
      name: 'Twitter/X蓝V认证年费',
      baseCost: 8000,
      cd: 5000,
      type: 'parallel',
      desc: '平台服务费',
      stock: 9999,
      stockCd: 31536000000
    },
    {
      id: 'whisky',
      name: '高端威士忌收藏',
      baseCost: 500000,
      cd: 15000,
      type: 'parallel',
      desc: '收藏稀有威士忌',
      stock: 500,
      stockCd: 259200000
    },
    {
      id: 'mansion_upkeep',
      name: '名下房产维护（月费）',
      baseCost: 10000000,
      cd: 30000,
      type: 'parallel',
      desc: '各地豪宅维护费用',
      stock: 300,
      stockCd: 2592000000
    },
    {
      id: 'bodyguard',
      name: '保镖团队服务（日费）',
      baseCost: 50000,
      cd: 20000,
      type: 'parallel',
      desc: '顶级安保团队',
      stock: 1000,
      stockCd: 86400000
    },
    {
      id: 'chef',
      name: '私人主厨定制餐',
      baseCost: 50000,
      cd: 10000,
      type: 'parallel',
      desc: '米其林主厨上门服务',
      stock: 500,
      stockCd: 43200000
    },
    {
      id: 'yacht',
      name: '超级游艇租用（天）',
      baseCost: 1000000,
      cd: 30000,
      type: 'parallel',
      desc: '短期租用顶级游艇',
      stock: 100,
      stockCd: 604800000
    },
    {
      id: 'f1_experience',
      name: 'F1赛车体验',
      baseCost: 500000,
      cd: 20000,
      type: 'parallel',
      desc: '包场F1赛道体验',
      stock: 200,
      stockCd: 259200000
    },
    {
      id: 'winery',
      name: '酒庄收购',
      baseCost: 50000000,
      cd: 60000,
      type: 'parallel',
      desc: '购买高端酒庄',
      stock: 50,
      stockCd: 7776000000
    },
    {
      id: 'island_party',
      name: '私人岛屿派对',
      baseCost: 5000000,
      cd: 30000,
      type: 'parallel',
      desc: '包下岛屿举办派对',
      stock: 100,
      stockCd: 604800000
    },
    {
      id: 'art_auction',
      name: '艺术拍卖会参与',
      baseCost: 20000000,
      cd: 60000,
      type: 'parallel',
      desc: '收藏艺术品',
      stock: 100,
      stockCd: 2592000000
    },
    {
      id: 'museum_private',
      name: '私人博物馆包场',
      baseCost: 2000000,
      cd: 20000,
      type: 'parallel',
      desc: '单独参观顶级博物馆',
      stock: 200,
      stockCd: 432000000
    },
    {
      id: 'starlink',
      name: 'Starlink星链全球服务',
      baseCost: 1000000,
      cd: 15000,
      type: 'parallel',
      desc: '全球卫星网络服务费',
      stock: 500,
      stockCd: 31536000000
    },
    {
      id: 'carbon_offset',
      name: '碳中和捐赠',
      baseCost: 500000,
      cd: 10000,
      type: 'parallel',
      desc: '环保碳抵消捐赠',
      stock: 1000,
      stockCd: 259200000
    },
    {
      id: 'mars_donate',
      name: '火星计划捐赠',
      baseCost: 5000000,
      cd: 30000,
      type: 'parallel',
      desc: '支持火星殖民计划',
      stock: 300,
      stockCd: 604800000
    },
    {
      id: 'edu_donate',
      name: '教育捐赠基金',
      baseCost: 10000000,
      cd: 45000,
      type: 'parallel',
      desc: '向教育机构捐款',
      stock: 200,
      stockCd: 1296000000
    },
    {
      id: 'tech_sponsor',
      name: '科技展会赞助',
      baseCost: 2000000,
      cd: 30000,
      type: 'parallel',
      desc: '各类科技展会赞助',
      stock: 300,
      stockCd: 604800000
    }
  ],

  trade: [
    {
      id: 'luxury',
      name: '奢侈品批量囤货',
      baseCost: 50000000,
      cd: 5000,
      type: 'parallel',
      desc: '高定珠宝/限量超跑/顶级箱包',
      stock: 500,
      stockCd: 3600000,
      sellable: true,
      sellRate: 0.8
    },
    {
      id: 'land',
      name: '土地/海岛购入',
      baseCost: 500000000,
      cd: 60000,
      type: 'parallel',
      desc: '全球无人海岛/商用地皮',
      stock: 100,
      stockCd: 86400000,
      sellable: true,
      sellRate: 0.7
    },
    {
      id: 'stock',
      name: '股权/公司收购',
      baseCost: 50000000,
      cd: 300000,
      type: 'exclusive',
      desc: '中小公司/初创企业股权',
      stock: 50,
      stockCd: 86400000,
      sellable: true,
      sellRate: 0.6
    }
  ],

  gamble: [
    {
      id: 'casino',
      name: '顶级赌场贵宾博弈',
      baseCost: 1000000000,
      cd: 40000,
      type: 'exclusive',
      desc: '蒙特卡洛/拉斯维加斯贵宾厅',
      minBet: 1000000,
      gambler: true,
      winRate: 0.38,
      winMultiplier: 1.75
    },
    {
      id: 'match',
      name: '地下赛事天价押注',
      baseCost: 1000000000,
      cd: 120000,
      type: 'exclusive',
      desc: '格斗/赛车/帆船地下博彩',
      minBet: 10000000,
      gambler: true,
      winRate: 0.33,
      winMultiplier: 2.0
    },
    {
      id: 'resource',
      name: '天价资源置换',
      baseCost: 50000000,
      cd: 300000,
      type: 'exclusive',
      desc: '高端商务稀缺渠道资源',
      gamble: true,
      winRate: 0.1,
      winMultiplier: 1.5
    },
    {
      id: 'blindbox',
      name: '虚拟黑市盲盒',
      baseCost: 10000000,
      cd: 30000,
      type: 'parallel',
      desc: '百万/千万/亿档位盲盒交易',
      gamble: true,
      winRate: 0.05,
      winMultiplier: 3.0
    }
  ],

  invest: [
    {
      id: 'crypto',
      name: '加密货币投资',
      baseCost: 10000000,
      cd: 10000,
      type: 'parallel',
      desc: '小额加密货币配置',
      invest: true,
      volatility: 0.2
    },
    {
      id: 'fund',
      name: '小众基金理财',
      baseCost: 5000000,
      cd: 10000,
      type: 'parallel',
      desc: '短期理财/债券基金',
      invest: true,
      volatility: 0.08
    },
    {
      id: 'venture',
      name: '大额科技风投',
      baseCost: 100000000,
      cd: 480000,
      type: 'exclusive',
      desc: '硅谷/太空/新能源天使轮',
      invest: true,
      bigInvest: true,
      volatility: 0.5,
      loseRate: 0.7,
      breakEvenRate: 0.2,
      winRate: 0.1,
      winMultiplier: 2.0
    }
  ],

  insane: [
    {
      id: 'space',
      name: '太空纯烧钱项目',
      baseCost: 200000000,
      cd: 900000,
      type: 'exclusive',
      desc: '卫星运维/亚轨道观光/太空碎片清理',
      stock: 50,
      stockCd: 604800000
    },
    {
      id: 'talent',
      name: '人才天价闲置签约',
      baseCost: 5000000,
      cd: 20000,
      type: 'parallel',
      desc: '科学家/奥运冠军/国际巨星年约',
      stock: 500,
      stockCd: 86400000
    },
    {
      id: 'venue',
      name: '公共服务包场',
      baseCost: 5000000,
      cd: 60000,
      type: 'parallel',
      desc: '顶级邮轮/医院特需/酒店总统套',
      stock: 200,
      stockCd: 86400000
    },
    {
      id: 'art',
      name: '艺术品天价销毁',
      baseCost: 100000000,
      cd: 180000,
      type: 'exclusive',
      desc: '孤品古董文物购入后公开销毁',
      stock: 100,
      stockCd: 7200000
    },
    {
      id: 'patent',
      name: '无用专利买断',
      baseCost: 500000,
      cd: 15000,
      type: 'parallel',
      desc: '小众/趣味/技术鸡肋专利',
      stock: 2000,
      stockCd: 86400000
    },
    {
      id: 'construction',
      name: '极端基建浪费',
      baseCost: 200000000,
      cd: 600000,
      type: 'exclusive',
      desc: '荒漠/深海/极地临时建筑建后即拆',
      stock: 50,
      stockCd: 43200000
    },
    {
      id: 'event',
      name: '赛事/奖项专属定制',
      baseCost: 8000000,
      cd: 30000,
      type: 'parallel',
      desc: '定制赛事+颁奖礼+全球转播',
      stock: 300,
      stockCd: 86400000
    }
  ],

  cleanup: [
    {
      id: 'patent_small',
      name: '小额专利买断',
      baseCost: 50000,
      cd: 5000,
      type: 'parallel',
      desc: '清理零散尾款专用',
      stock: 5000,
      stockCd: 3600000
    },
    {
      id: 'paper',
      name: '废纸购入销毁',
      baseCost: 10000,
      cd: 2000,
      type: 'parallel',
      desc: '大批量无用文件粉碎',
      stock: 10000,
      stockCd: 1800000
    },
    {
      id: 'storage',
      name: '云存储空间购入',
      baseCost: 100000,
      cd: 8000,
      type: 'parallel',
      desc: '购买大量无意义的云存储空间',
      stock: 9999,
      stockCd: 3600000
    }
  ]
};

// Random events
const RANDOM_EVENTS = [
  { name: '设备维护费', amount: -50000000, desc: '私人飞机发动机大修' },
  { name: '违约金支出', amount: -100000000, desc: '违约金赔偿' },
  { name: '税费补缴', amount: -200000000, desc: '海外资产税务核查' },
  { name: '意外收益', amount: 100000000, desc: '投资的公司意外被收购' },
  { name: '保险理赔', amount: -30000000, desc: '高端医疗保险理赔' },
  { name: '艺术品保养', amount: -80000000, desc: '藏品修复与保养费用' },
  { name: '法律顾问费', amount: -150000000, desc: '跨国法律顾问费用' },
  { name: '慈善捐款', amount: -50000000, desc: '匿名慈善捐款（不可撤销）' }
];