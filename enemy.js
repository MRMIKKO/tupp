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

        // 根据类型绘制不同颜色的飞机
        ctx.fillStyle = this.type.color;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1.5;

        // 绘制敌机主体（向下飞行）
        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 2, this.y + this.height);
        ctx.lineTo(this.x + this.width / 2 - 7, this.y + 15);
        ctx.lineTo(this.x + this.width / 2 - 5, this.y);
        ctx.lineTo(this.x + this.width / 2 + 5, this.y);
        ctx.lineTo(this.x + this.width / 2 + 7, this.y + 15);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 机翼
        const wingColor = this.adjustColor(this.type.color, 20);
        ctx.fillStyle = wingColor;
        
        // 左翼
        ctx.beginPath();
        ctx.moveTo(this.x, this.y + 20);
        ctx.lineTo(this.x + 5, this.y + 25);
        ctx.lineTo(this.x + this.width / 2 - 7, this.y + 25);
        ctx.lineTo(this.x + 3, this.y + 30);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 右翼
        ctx.beginPath();
        ctx.moveTo(this.x + this.width, this.y + 20);
        ctx.lineTo(this.x + this.width - 5, this.y + 25);
        ctx.lineTo(this.x + this.width / 2 + 7, this.y + 25);
        ctx.lineTo(this.x + this.width - 3, this.y + 30);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 驾驶舱
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2, this.y + this.height - 15, 3, 0, Math.PI * 2);
        ctx.fill();

        // 机尾标识（纳粹十字或日本圆标）
        if (this.type.color === '#8B0000') {
            // 日本红圆标
            ctx.fillStyle = '#FF0000';
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2 - 12, this.y + 27, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.arc(this.x + this.width / 2 + 12, this.y + 27, 3, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // 德国十字标
            ctx.fillStyle = '#000';
            ctx.fillRect(this.x + this.width / 2 - 13, this.y + 26, 6, 2);
            ctx.fillRect(this.x + this.width / 2 - 11, this.y + 24, 2, 6);
            ctx.fillRect(this.x + this.width / 2 + 7, this.y + 26, 6, 2);
            ctx.fillRect(this.x + this.width / 2 + 9, this.y + 24, 2, 6);
        }

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
