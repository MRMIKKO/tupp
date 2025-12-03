// 道具类型配置
const POWERUP_TYPES = {
    S: {
        name: 'S弹',
        color: '#FFD700',
        icon: 'S',
        description: '三弹道散射',
        duration: 0, // 0表示无限时长，会根据难度计算
        bgColor: '#FFD700'
    },
    L: {
        name: '激光',
        color: '#00FFFF',
        icon: 'L',
        description: '激光穿透',
        duration: 0, // 0表示无限时长，会根据难度计算
        bgColor: '#00FFFF'
    },
    B: {
        name: '爆炸弹',
        color: '#FF4500',
        icon: 'B',
        description: '范围爆炸',
        duration: 0, // 0表示无限时长，会根据难度计算
        bgColor: '#FF4500'
    },
    C: {
        name: '追踪弹',
        color: '#FF6600',
        icon: 'C',
        description: '追踪火箭炮',
        duration: 0, // 0表示无限时长，会根据难度计算
        bgColor: '#FF6600'
    },
    HP: {
        name: '生命',
        color: '#FF1493',
        icon: '❤️',
        description: '回复生命',
        duration: 0, // 立即生效
        bgColor: '#FF69B4'
    },
    P: {
        name: '强化',
        color: '#9370DB',
        icon: 'P',
        description: '威力提升+弹道',
        duration: 0, // 无限时长
        bgColor: '#9370DB'
    }
};

// 根据难度计算弹道类型道具的持续时间
// 难度1: 无限时长 (0)
// 难度2-9: 逐渐从无限减少到60秒
// 难度10: 30秒
function calculateWeaponDuration(difficulty) {
    if (difficulty <= 1) {
        return 0; // 无限时长
    } else if (difficulty >= 10) {
        return 30000; // 30秒
    } else {
        // 难度2-9: 从180秒线性递减到60秒
        // 难度2: 180秒, 难度9: 60秒
        const maxDuration = 180000; // 180秒
        const minDuration = 60000;  // 60秒
        const durationRange = maxDuration - minDuration;
        const difficultyRange = 9 - 2; // 难度2到9
        const duration = maxDuration - ((difficulty - 2) / difficultyRange) * durationRange;
        return Math.max(minDuration, duration);
    }
}

// 道具类
class PowerUp {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.speed = 2;
        this.active = true;
        
        // 随机选择道具类型
        const types = Object.keys(POWERUP_TYPES);
        const weights = [25, 15, 18, 21, 8, 13]; // S, L, B, C, HP, P 的权重（HP降低到8%）
        const randomValue = Math.random() * 100;
        let cumulative = 0;
        let selectedType = 'S';
        
        for (let i = 0; i < types.length; i++) {
            cumulative += weights[i];
            if (randomValue < cumulative) {
                selectedType = types[i];
                break;
            }
        }
        
        this.type = selectedType;
        this.config = POWERUP_TYPES[selectedType];
        
        // 动画
        this.rotationAngle = 0;
        this.pulseScale = 1;
        this.pulseDirection = 1;
    }
    
    update() {
        this.y += this.speed;
        
        // 动画效果
        this.rotationAngle += 0.05;
        this.pulseScale += 0.02 * this.pulseDirection;
        if (this.pulseScale > 1.2 || this.pulseScale < 0.9) {
            this.pulseDirection *= -1;
        }
        
        // 超出屏幕则失效
        if (this.y > 650) {
            this.active = false;
        }
    }
    
    draw(ctx) {
        ctx.save();
        
        // 移动到道具中心
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.rotationAngle);
        ctx.scale(this.pulseScale, this.pulseScale);
        
        // 外发光
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.config.bgColor;
        
        // 背景圆
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.width / 2);
        gradient.addColorStop(0, this.config.bgColor);
        gradient.addColorStop(0.7, this.config.color);
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0.3)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, this.width / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // 边框
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // 图标文字
        ctx.shadowBlur = 5;
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.config.icon, 0, 0);
        
        ctx.restore();
    }
    
    // 检测与玩家碰撞
    checkCollision(player) {
        return this.x < player.x + player.width &&
               this.x + this.width > player.x &&
               this.y < player.y + player.height &&
               this.y + this.height > player.y;
    }
}

// 爆炸范围伤害类
class Explosion {
    constructor(x, y, radius = 80, damage = 1) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.maxRadius = radius;
        this.currentRadius = 0;
        this.alpha = 1;
        this.active = true;
        this.lifetime = 20; // 帧数
        this.age = 0;
        this.damage = damage; // 爆炸伤害倍数
        this.hitEnemies = new Set(); // 记录已经伤害过的敌机，避免重复伤害
    }
    
    update() {
        this.age++;
        
        // 扩散效果
        this.currentRadius = this.maxRadius * (this.age / this.lifetime);
        this.alpha = 1 - (this.age / this.lifetime);
        
        if (this.age >= this.lifetime) {
            this.active = false;
        }
    }
    
    draw(ctx) {
        ctx.save();
        
        // 外圈光晕
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.currentRadius);
        gradient.addColorStop(0, `rgba(255, 200, 0, ${this.alpha})`);
        gradient.addColorStop(0.5, `rgba(255, 100, 0, ${this.alpha * 0.6})`);
        gradient.addColorStop(1, `rgba(255, 0, 0, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.currentRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // 内核闪光
        ctx.fillStyle = `rgba(255, 255, 255, ${this.alpha})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.currentRadius * 0.3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
    
    // 检测敌机是否在爆炸范围内（返回敌机ID避免重复伤害）
    checkEnemyInRange(enemy) {
        const dx = enemy.x + enemy.width / 2 - this.x;
        const dy = enemy.y + enemy.height / 2 - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // 生成唯一ID（使用坐标和时间戳）
        const enemyId = `${enemy.x}_${enemy.y}_${enemy.type.name}`;
        
        // 在范围内且未被此爆炸伤害过
        if (distance < this.currentRadius && !this.hitEnemies.has(enemyId)) {
            this.hitEnemies.add(enemyId);
            return true;
        }
        return false;
    }
}
