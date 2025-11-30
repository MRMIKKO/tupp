// 敌机类型配置 - 二战经典战斗机
const ENEMY_TYPES = {
    ZERO: {
        name: '零式战斗机',
        color: '#8B0000',
        width: 35,
        height: 45,
        speed: 1.5,
        health: 1,
        score: 100,
        shootChance: 0.02,
        pattern: 'zigzag'
    },
    MESSERSCHMITT: {
        name: 'Me-109',
        color: '#2F4F2F',
        width: 40,
        height: 50,
        speed: 2,
        health: 2,
        score: 200,
        shootChance: 0.03,
        pattern: 'dive'
    },
    SPITFIRE: {
        name: '喷火战斗机',
        color: '#4B0082',
        width: 38,
        height: 48,
        speed: 2.5,
        health: 2,
        score: 250,
        shootChance: 0.025,
        pattern: 'circle'
    },
    STUKA: {
        name: 'Ju-87俯冲轰炸机',
        color: '#556B2F',
        width: 50,
        height: 55,
        speed: 1,
        health: 3,
        score: 300,
        shootChance: 0.015,
        pattern: 'slow'
    }
};

// 敌机类
class Enemy {
    constructor(canvas, type = null, difficulty = 1) {
        // 随机选择敌机类型
        if (!type) {
            const types = Object.keys(ENEMY_TYPES);
            const randomType = types[Math.floor(Math.random() * types.length)];
            type = ENEMY_TYPES[randomType];
        }
        
        this.type = type;
        this.width = type.width;
        this.height = type.height;
        this.x = Math.random() * (canvas.width - this.width);
        this.y = -this.height;
        
        // 根据难度提升属性
        this.speed = type.speed * (1 + (difficulty - 1) * 0.1); // 难度每级增加10%速度
        this.health = type.health + Math.floor((difficulty - 1) / 2); // 难度每2级增加1点生命
        this.maxHealth = this.health;
        this.score = type.score * difficulty; // 分数随难度成倍增长
        this.shootChance = Math.min(0.05, type.shootChance * (1 + (difficulty - 1) * 0.15)); // 难度每级增加15%射击频率，上限5%
        this.pattern = type.pattern;
        this.bullets = [];
        this.canvasHeight = canvas.height; // 保存canvas高度
        this.difficulty = difficulty; // 保存难度等级
        
        // 移动模式参数
        this.time = 0;
        this.initialX = this.x;
        this.amplitude = 50; // 摆动幅度
    }

    update(canvas) {
        this.time++;

        // 根据不同的移动模式移动
        switch(this.pattern) {
            case 'zigzag':
                this.x = this.initialX + Math.sin(this.time * 0.05) * this.amplitude;
                this.y += this.speed;
                break;
            case 'dive':
                this.y += this.speed * 1.5;
                if (this.time % 60 < 30) {
                    this.x += this.speed * 0.5;
                } else {
                    this.x -= this.speed * 0.5;
                }
                break;
            case 'circle':
                this.x = this.initialX + Math.cos(this.time * 0.08) * this.amplitude;
                this.y += this.speed * 0.8;
                break;
            case 'slow':
                this.y += this.speed;
                break;
        }

        // 边界检查
        if (this.x < 0) this.x = 0;
        if (this.x > canvas.width - this.width) this.x = canvas.width - this.width;

        // 随机射击
        // 底部生成的敌机朝下射击，上方生成的敌机朝下射击
        if (this.isBottomSpawned) {
            // 从底部来的敌机，在屏幕下半部分时向下射击
            if (Math.random() < this.shootChance && this.y > canvas.height / 2 && this.y < canvas.height) {
                this.shoot();
            }
        } else {
            // 从顶部来的敌机，在屏幕上半部分时向下射击
            if (Math.random() < this.shootChance && this.y > 0 && this.y < canvas.height / 2) {
                this.shoot();
            }
        }

        // 更新子弹
        this.bullets = this.bullets.filter(bullet => {
            bullet.update();
            return bullet.active;
        });
    }

    shoot() {
        if (this.isBottomSpawned) {
            // 从底部生成的敌机向上射击
            this.bullets.push(new Bullet(this.x + this.width / 2, this.y, -5, false, this.canvasHeight));
        } else {
            // 从顶部生成的敌机向下射击
            this.bullets.push(new Bullet(this.x + this.width / 2, this.y + this.height, 5, false, this.canvasHeight));
        }
    }

    draw(ctx) {
        ctx.save();

        // 如果是从底部生成的敌机，翻转绘制方向
        if (this.isBottomSpawned) {
            ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
            ctx.scale(1, -1); // 垂直翻转
            ctx.translate(-(this.x + this.width / 2), -(this.y + this.height / 2));
        }

        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;

        // 二战日本战机风格 - 更凶狠的设计
        // 机身主体（流线型，带金属质感）
        const bodyGradient = ctx.createLinearGradient(centerX - 8, centerY, centerX + 8, centerY);
        bodyGradient.addColorStop(0, this.adjustColor(this.type.color, -20));
        bodyGradient.addColorStop(0.5, this.type.color);
        bodyGradient.addColorStop(1, this.adjustColor(this.type.color, -20));
        
        ctx.fillStyle = bodyGradient;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1.5;

        // 尖锐的机头（侵略性设计）
        ctx.beginPath();
        ctx.moveTo(centerX, this.y + this.height); // 尖锐机头
        ctx.lineTo(centerX - 4, this.y + this.height - 8);
        ctx.lineTo(centerX - 7, this.y + 15);
        ctx.lineTo(centerX - 6, this.y + 5);
        ctx.lineTo(centerX - 4, this.y);
        ctx.lineTo(centerX + 4, this.y);
        ctx.lineTo(centerX + 6, this.y + 5);
        ctx.lineTo(centerX + 7, this.y + 15);
        ctx.lineTo(centerX + 4, this.y + this.height - 8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 主翼（大型展翼，展现威胁感）
        const wingGradient = ctx.createLinearGradient(this.x, centerY, this.x + this.width, centerY);
        wingGradient.addColorStop(0, this.adjustColor(this.type.color, 10));
        wingGradient.addColorStop(0.5, this.adjustColor(this.type.color, 30));
        wingGradient.addColorStop(1, this.adjustColor(this.type.color, 10));
        ctx.fillStyle = wingGradient;
        
        // 左翼（更长更锐利）
        ctx.beginPath();
        ctx.moveTo(centerX - 7, this.y + 18);
        ctx.lineTo(this.x - 2, this.y + 22);
        ctx.lineTo(this.x + 2, this.y + 28);
        ctx.lineTo(centerX - 7, this.y + 26);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 右翼
        ctx.beginPath();
        ctx.moveTo(centerX + 7, this.y + 18);
        ctx.lineTo(this.x + this.width + 2, this.y + 22);
        ctx.lineTo(this.x + this.width - 2, this.y + 28);
        ctx.lineTo(centerX + 7, this.y + 26);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 尾翼（双垂尾设计）
        ctx.fillStyle = this.adjustColor(this.type.color, -10);
        ctx.beginPath();
        ctx.moveTo(centerX - 4, this.y + 3);
        ctx.lineTo(centerX - 7, this.y);
        ctx.lineTo(centerX - 5, this.y + 8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(centerX + 4, this.y + 3);
        ctx.lineTo(centerX + 7, this.y);
        ctx.lineTo(centerX + 5, this.y + 8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 驾驶舱（深色玻璃）
        const cockpitGradient = ctx.createRadialGradient(centerX, this.y + this.height - 12, 0, centerX, this.y + this.height - 12, 4);
        cockpitGradient.addColorStop(0, 'rgba(50, 30, 30, 0.9)');
        cockpitGradient.addColorStop(0.7, 'rgba(30, 20, 20, 0.8)');
        cockpitGradient.addColorStop(1, 'rgba(0, 0, 0, 0.9)');
        ctx.fillStyle = cockpitGradient;
        ctx.beginPath();
        ctx.ellipse(centerX, this.y + this.height - 12, 3, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 1;
        ctx.stroke();

        // 机枪炮口（威胁标识）
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(centerX - 5, this.y + this.height - 3, 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(centerX + 5, this.y + this.height - 3, 1, 0, Math.PI * 2);
        ctx.fill();

        // 日本军徽 - 红日标记（更大更醒目）
        if (this.type.color === '#8B0000' || this.type.name === '零式战斗机') {
            // 机翼上的红日圆标（左翼）
            ctx.fillStyle = '#CC0000';
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.arc(this.x + 8, this.y + 25, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            // 右翼红日
            ctx.beginPath();
            ctx.arc(this.x + this.width - 8, this.y + 25, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            // 机身中央红日（最大的）
            ctx.fillStyle = '#DD0000';
            ctx.beginPath();
            ctx.arc(centerX, this.y + 20, 3.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 0.5;
            ctx.stroke();
        } else {
            // 其他敌机的标记（德国铁十字）
            ctx.fillStyle = '#000';
            const crossSize = 3;
            // 左翼十字
            ctx.fillRect(this.x + 6, this.y + 24, crossSize * 2, 1);
            ctx.fillRect(this.x + 7, this.y + 23, 1, crossSize * 2);
            // 右翼十字
            ctx.fillRect(this.x + this.width - 8 - crossSize, this.y + 24, crossSize * 2, 1);
            ctx.fillRect(this.x + this.width - 8, this.y + 23, 1, crossSize * 2);
        }

        // 排气管效果（引擎尾焰暗示）
        ctx.strokeStyle = 'rgba(80, 40, 40, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(centerX - 3, this.y);
        ctx.lineTo(centerX - 3, this.y + 4);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(centerX + 3, this.y);
        ctx.lineTo(centerX + 3, this.y + 4);
        ctx.stroke();

        // 血量条
        if (this.health < this.maxHealth) {
            const barWidth = this.width;
            const barHeight = 3;
            const healthPercent = this.health / this.maxHealth;
            
            // 对于翻转的敌机，血量条位置也需要调整
            const barY = this.isBottomSpawned ? this.y + this.height + 5 : this.y - 8;
            
            ctx.fillStyle = '#333';
            ctx.fillRect(this.x, barY, barWidth, barHeight);
            
            ctx.fillStyle = healthPercent > 0.5 ? '#0F0' : (healthPercent > 0.25 ? '#FF0' : '#F00');
            ctx.fillRect(this.x, barY, barWidth * healthPercent, barHeight);
        }

        ctx.restore();
        
        // 注意: 子弹现在由game.js统一管理和绘制
    }

    // 调整颜色亮度
    adjustColor(color, amount) {
        const num = parseInt(color.replace("#", ""), 16);
        const r = Math.min(255, Math.max(0, (num >> 16) + amount));
        const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
        const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
        return "#" + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
    }

    hit() {
        this.health--;
        return this.health <= 0;
    }

    isOffScreen(canvas) {
        // 从底部生成的敌机，超出顶部边界时移除
        if (this.isBottomSpawned) {
            return this.y < -this.height;
        }
        // 从顶部生成的敌机，超出底部边界时移除
        return this.y > canvas.height;
    }
}
