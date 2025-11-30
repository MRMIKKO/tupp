// 子弹类
class Bullet {
    constructor(x, y, speed, isPlayerBullet = true, canvasHeight = 600) {
        this.x = x;
        this.y = y;
        this.width = 4;
        this.height = 12;
        this.speed = speed;
        this.isPlayerBullet = isPlayerBullet;
        this.active = true;
        this.canvasHeight = canvasHeight;
        
        // 蓄力子弹属性
        this.isCharged = false;
        this.damage = 1;
        this.size = 0;
        this.penetrating = false;
        
        // 散射角度属性（用于蓄力散弹）
        this.angle = 0;
        this.speedX = 0;
        this.speedY = 0;
        
        // 追踪属性
        this.isHoming = false; // 是否追踪
        this.homingStrength = 0.15; // 追踪强度
        this.target = null; // 当前追踪目标
        
        // 道具子弹类型
        this.isLaser = false; // 激光
        this.isBomb = false; // 爆炸弹
        this.bombRadius = 80; // 爆炸半径（默认）
        this.bombDamage = 1; // 爆炸伤害倍数（默认）
    }

    update(enemies = []) {
        if (this.isPlayerBullet) {
            // 追踪逻辑（仅对蓄力追踪弹有效）
            if (this.isHoming && this.isCharged && enemies && enemies.length > 0) {
                // 寻找最近的敌人
                let closestEnemy = null;
                let closestDist = Infinity;
                
                for (let enemy of enemies) {
                    const dx = enemy.x + enemy.width / 2 - this.x;
                    const dy = enemy.y + enemy.height / 2 - this.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    
                    // 只追踪前方的敌人
                    if (dy < 100 && dist < closestDist) {
                        closestDist = dist;
                        closestEnemy = enemy;
                    }
                }
                
                // 如果找到目标，调整速度方向
                if (closestEnemy) {
                    this.target = closestEnemy;
                    const dx = closestEnemy.x + closestEnemy.width / 2 - this.x;
                    const dy = closestEnemy.y + closestEnemy.height / 2 - this.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    
                    if (dist > 0) {
                        // 计算朝向目标的单位向量
                        const targetDirX = dx / dist;
                        const targetDirY = dy / dist;
                        
                        // 当前速度归一化
                        const currentSpeed = Math.sqrt(this.speedX * this.speedX + this.speedY * this.speedY);
                        const currentDirX = this.speedX / currentSpeed;
                        const currentDirY = this.speedY / currentSpeed;
                        
                        // 插值混合当前方向和目标方向
                        const newDirX = currentDirX * (1 - this.homingStrength) + targetDirX * this.homingStrength;
                        const newDirY = currentDirY * (1 - this.homingStrength) + targetDirY * this.homingStrength;
                        
                        // 归一化新方向并应用速度
                        const newDirLength = Math.sqrt(newDirX * newDirX + newDirY * newDirY);
                        this.speedX = (newDirX / newDirLength) * currentSpeed;
                        this.speedY = (newDirY / newDirLength) * currentSpeed;
                    }
                }
            }
            
            // 移动子弹,
            if (this.speedX !== 0 || this.speedY !== 0) {
                this.x += this.speedX;
                this.y += this.speedY;
            } else {
                this.y -= this.speed; // 普通子弹向上
            }
        } else {
            this.y += this.speed; // 敌机子弹向下
        }

        // 检查是否超出屏幕（包括左右边界）
        if (this.y < -this.height || this.y > this.canvasHeight || 
            this.x < -50 || this.x > 850) { // 给散弹留出更多边界空间
            this.active = false;
        }
    }

    draw(ctx) {
        ctx.save();
        
        if (this.isPlayerBullet) {
            if (this.isLaser) {
                // 激光效果 - 青色光束
                ctx.shadowBlur = 25;
                ctx.shadowColor = '#00FFFF';
                
                const gradient = ctx.createLinearGradient(this.x, this.y - 20, this.x, this.y + 20);
                gradient.addColorStop(0, 'rgba(0, 255, 255, 0.3)');
                gradient.addColorStop(0.5, '#00FFFF');
                gradient.addColorStop(1, 'rgba(0, 255, 255, 0.3)');
                
                ctx.fillStyle = gradient;
                ctx.fillRect(this.x - 3, this.y - 20, 6, 40);
                
                // 核心光束
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(this.x - 1, this.y - 20, 2, 40);
                
            } else if (this.isBomb) {
                // 爆炸弹效果 - 橙红色球体
                const size = this.size || 6;
                
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#FF4500';
                
                const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, size);
                gradient.addColorStop(0, '#FFFF00');
                gradient.addColorStop(0.5, '#FF4500');
                gradient.addColorStop(1, '#8B0000');
                
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
                ctx.fill();
                
                // 火花效果
                ctx.fillStyle = '#FFFFFF';
                for (let i = 0; i < 3; i++) {
                    const angle = Date.now() * 0.01 + i * Math.PI * 2 / 3;
                    const px = this.x + Math.cos(angle) * size * 0.8;
                    const py = this.y + Math.sin(angle) * size * 0.8;
                    ctx.beginPath();
                    ctx.arc(px, py, 1, 0, Math.PI * 2);
                    ctx.fill();
                }
                
            } else if (this.isCharged) {
                // 蓄力子弹 - 更大更亮
                const size = this.size || 15;
                
                // 外部光晕
                ctx.shadowBlur = 20;
                ctx.shadowColor = '#00FFFF';
                
                // 渐变填充
                const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, size);
                gradient.addColorStop(0, '#FFFFFF');
                gradient.addColorStop(0.3, '#00FFFF');
                gradient.addColorStop(0.6, '#0099FF');
                gradient.addColorStop(1, '#0066FF');
                
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
                ctx.fill();
                
                // 内核
                ctx.fillStyle = '#FFFFFF';
                ctx.beginPath();
                ctx.arc(this.x, this.y, size * 0.4, 0, Math.PI * 2);
                ctx.fill();
                
                // 闪电效果
                ctx.strokeStyle = '#FFFFFF';
                ctx.lineWidth = 2;
                for (let i = 0; i < 4; i++) {
                    const angle = (Math.PI * 2 / 4) * i + Date.now() * 0.01;
                    const x1 = this.x + Math.cos(angle) * size * 0.5;
                    const y1 = this.y + Math.sin(angle) * size * 0.5;
                    const x2 = this.x + Math.cos(angle) * size * 1.2;
                    const y2 = this.y + Math.sin(angle) * size * 1.2;
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();
                }
            } else {
                // 普通玩家子弹 - 黄色光束
                ctx.fillStyle = '#FFD700';
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#FFA500';
                ctx.fillRect(this.x - this.width / 2, this.y, this.width, this.height);
                
                // 子弹头部
                ctx.fillStyle = '#FFFF00';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.width / 2, 0, Math.PI * 2);
                ctx.fill();
            }
        } else {
            // 敌机子弹 - 红色
            ctx.fillStyle = '#FF4444';
            ctx.shadowBlur = 8;
            ctx.shadowColor = '#FF0000';
            ctx.fillRect(this.x - this.width / 2, this.y, this.width, this.height);
            
            // 子弹头部
            ctx.fillStyle = '#FF6666';
            ctx.beginPath();
            ctx.arc(this.x, this.y + this.height, this.width / 2, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }

    // 碰撞检测
    collidesWith(obj) {
        return this.x < obj.x + obj.width &&
               this.x + this.width > obj.x &&
               this.y < obj.y + obj.height &&
               this.y + this.height > obj.y;
    }
}

// 粒子类（用于爆炸效果）
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 6;
        this.vy = (Math.random() - 0.5) * 6;
        this.radius = Math.random() * 3 + 1;
        this.color = color;
        this.life = 1.0;
        this.decay = Math.random() * 0.02 + 0.01;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.1; // 重力效果
        this.life -= this.decay;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    isDead() {
        return this.life <= 0;
    }
}
