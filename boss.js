// Boss类 - 超大型轰炸机
class Boss {
    constructor(canvas, difficulty = 1) {
        this.width = 180;  // 从120增加到180 (1.5倍)
        this.height = 150; // 从100增加到150 (1.5倍)
        this.x = canvas.width / 2 - this.width / 2;
        this.y = -this.height;
        this.speed = 0.5;
        this.canvasWidth = canvas.width;
        this.canvasHeight = canvas.height;
        
        // Boss属性
        this.maxHealth = 100 + difficulty * 50; // 基础100，难度越高血越厚
        this.health = this.maxHealth;
        this.score = 5000 * difficulty;
        this.active = true;
        this.defeated = false;
        
        // 移动模式
        this.movePattern = 'entry'; // entry, hover, strafe
        this.moveTimer = 0;
        this.targetY = 80; // 目标悬停位置
        this.moveDirection = 1;
        
        // 攻击模式
        this.attackTimer = 0;
        this.attackCooldown = 60; // 1秒
        this.attackPhase = 0; // 0-3 不同攻击模式
        this.bullets = [];
        
        // 炮塔位置 (所有位置乘以1.5)
        this.turrets = [
            { x: -60, y: 30, angle: 0 },   // -40*1.5, 20*1.5
            { x: 60, y: 30, angle: 0 },    // 40*1.5, 20*1.5
            { x: -45, y: 75, angle: 0 },   // -30*1.5, 50*1.5
            { x: 45, y: 75, angle: 0 },    // 30*1.5, 50*1.5
            { x: 0, y: 105, angle: 0 }     // 0, 70*1.5
        ];
        
        // 引擎效果
        this.enginePulse = 0;
        
        // 护盾系统
        this.shieldActive = true;
        this.shieldHealth = 50;
        this.shieldMaxHealth = 50;
        this.shieldRegenTimer = 0;
        
        // 特殊技能计时
        this.specialAttackTimer = 0;
        this.specialAttackCooldown = 600; // 10秒一次大招
        
        // 全屏弹幕技能
        this.screenWideAttackTimer = 0;
        this.screenWideAttackCooldown = 600; // 10秒一次全屏弹幕
    }
    
    update(canvas, player) {
        this.moveTimer++;
        this.attackTimer++;
        this.specialAttackTimer++;
        this.screenWideAttackTimer++;
        this.enginePulse += 0.1;
        
        // 移动逻辑
        switch(this.movePattern) {
            case 'entry':
                // 进场
                this.y += this.speed;
                if (this.y >= this.targetY) {
                    this.movePattern = 'hover';
                    this.moveTimer = 0;
                }
                break;
                
            case 'hover':
                // 悬停并左右移动
                this.x += Math.sin(this.moveTimer * 0.02) * 2;
                
                // 限制边界
                if (this.x < 20) this.x = 20;
                if (this.x > canvas.width - this.width - 20) {
                    this.x = canvas.width - this.width - 20;
                }
                
                // 切换到扫射模式
                if (this.moveTimer > 300) {
                    this.movePattern = 'strafe';
                    this.moveTimer = 0;
                }
                break;
                
            case 'strafe':
                // 快速横扫
                this.x += this.moveDirection * 3;
                
                if (this.x <= 20 || this.x >= canvas.width - this.width - 20) {
                    this.moveDirection *= -1;
                }
                
                if (this.moveTimer > 200) {
                    this.movePattern = 'hover';
                    this.moveTimer = 0;
                }
                break;
        }
        
        // 炮塔跟踪玩家
        if (player) {
            this.turrets.forEach(turret => {
                const turretX = this.x + this.width / 2 + turret.x;
                const turretY = this.y + turret.y;
                const dx = player.x + player.width / 2 - turretX;
                const dy = player.y - turretY;
                turret.angle = Math.atan2(dy, dx);
            });
        }
        
        // 攻击逻辑
        if (this.attackTimer >= this.attackCooldown) {
            this.attack(player);
            this.attackTimer = 0;
        }
        
        // 特殊攻击
        if (this.specialAttackTimer >= this.specialAttackCooldown) {
            this.specialAttack(player);
            this.specialAttackTimer = 0;
        }
        
        // 全屏弹幕攻击
        if (this.screenWideAttackTimer >= this.screenWideAttackCooldown) {
            this.screenWideAttack(canvas);
            this.screenWideAttackTimer = 0;
        }
        
        // 护盾恢复
        if (this.shieldHealth < this.shieldMaxHealth) {
            this.shieldRegenTimer++;
            if (this.shieldRegenTimer > 120) { // 2秒后开始恢复
                this.shieldHealth += 0.1;
                if (this.shieldHealth >= this.shieldMaxHealth) {
                    this.shieldHealth = this.shieldMaxHealth;
                    this.shieldActive = true;
                }
            }
        }
        
        // 更新子弹
        this.bullets = this.bullets.filter(bullet => {
            // 跟踪弹的追踪逻辑
            if (bullet.isTracking && bullet.target && bullet.active) {
                const targetX = bullet.target.x + bullet.target.width / 2;
                const targetY = bullet.target.y + bullet.target.height / 2;
                const dx = targetX - bullet.x;
                const dy = targetY - bullet.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > 0) {
                    // 逐渐调整方向朝向目标（增强追踪强度）
                    const speed = 5; // 追踪速度
                    const targetSpeedX = (dx / distance) * speed;
                    const targetSpeedY = (dy / distance) * speed;
                    
                    // 更强的追踪能力
                    bullet.speedX += (targetSpeedX - bullet.speedX) * 0.15; // 从0.05提升到0.15
                    bullet.speedY += (targetSpeedY - bullet.speedY) * 0.15;
                }
            }
            
            bullet.update();
            return bullet.active && bullet.y < canvas.height + 50;
        });
    }
    
    attack(player) {
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        
        // 根据血量改变攻击模式
        const healthPercent = this.health / this.maxHealth;
        
        if (healthPercent > 0.7) {
            // 第一阶段：炮塔齐射（20%概率发射穿透弹）
            this.turrets.forEach((turret, index) => {
                if (index % 2 === this.attackPhase % 2) {
                    const turretX = centerX + turret.x;
                    const turretY = this.y + turret.y;
                    const bullet = new Bullet(turretX, turretY, 6, false, this.canvasHeight);
                    bullet.speedX = Math.cos(turret.angle) * 6;
                    bullet.speedY = Math.sin(turret.angle) * 6;
                    
                    // 20%概率是穿透弹（护盾无法拦截）
                    if (Math.random() < 0.2) {
                        bullet.isPenetrating = true;
                        bullet.color = '#FF00FF'; // 紫色表示穿透弹
                    }
                    
                    this.bullets.push(bullet);
                }
            });
        } else if (healthPercent > 0.4) {
            // 第二阶段：扇形弹幕（30%概率穿透弹）
            const angleCount = 7;
            const spreadAngle = Math.PI / 3;
            for (let i = 0; i < angleCount; i++) {
                const angle = Math.PI / 2 - spreadAngle / 2 + (spreadAngle / (angleCount - 1)) * i;
                const bullet = new Bullet(centerX, this.y + this.height, 5, false, this.canvasHeight);
                bullet.speedX = Math.cos(angle) * 5;
                bullet.speedY = Math.sin(angle) * 5;
                
                // 30%概率是穿透弹
                if (Math.random() < 0.3) {
                    bullet.isPenetrating = true;
                    bullet.color = '#FF00FF';
                }
                
                this.bullets.push(bullet);
            }
        } else {
            // 第三阶段：螺旋弹幕（40%概率穿透弹）
            const spiralCount = 8;
            for (let i = 0; i < spiralCount; i++) {
                const angle = (this.attackPhase * 0.3 + (Math.PI * 2 / spiralCount) * i);
                const bullet = new Bullet(centerX, centerY, 4, false, this.canvasHeight);
                bullet.speedX = Math.cos(angle) * 4;
                bullet.speedY = Math.sin(angle) * 4;
                
                // 40%概率是穿透弹
                if (Math.random() < 0.4) {
                    bullet.isPenetrating = true;
                    bullet.color = '#FF00FF';
                }
                
                this.bullets.push(bullet);
            }
        }
        
        // 血量低于50%时，发射激光和跟踪弹
        if (healthPercent <= 0.5) {
            // 每5次攻击发射一次激光
            if (this.attackPhase % 5 === 0) {
                this.fireLaser(player);
            }
            
            // 每3次攻击发射跟踪弹
            if (this.attackPhase % 3 === 0) {
                this.fireTrackingBullet(player);
            }
        }
        
        this.attackPhase++;
    }
    
    fireLaser(player) {
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        
        if (!player) return;
        
        // 创建激光（快速直线攻击）
        const laser = new Bullet(centerX, centerY, 10, false, this.canvasHeight);
        const dx = (player.x + player.width / 2) - centerX;
        const dy = (player.y + player.height / 2) - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        laser.speedX = (dx / distance) * 10;
        laser.speedY = (dy / distance) * 10;
        laser.isLaser = true;
        laser.isPenetrating = true; // 激光可穿透护盾
        laser.color = '#00FFFF'; // 青色激光
        laser.size = 6;
        
        this.bullets.push(laser);
    }
    
    fireTrackingBullet(player) {
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        
        if (!player) return;
        
        // 创建跟踪弹
        const tracking = new Bullet(centerX, centerY, 5, false, this.canvasHeight);
        tracking.isTracking = true;
        tracking.isPenetrating = true; // 跟踪弹可穿透护盾
        tracking.target = player;
        tracking.color = '#FF6600'; // 橙色跟踪弹
        tracking.size = 6;
        
        // 初始速度朝向玩家
        const dx = (player.x + player.width / 2) - centerX;
        const dy = (player.y + player.height / 2) - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        tracking.speedX = (dx / distance) * 5;
        tracking.speedY = (dy / distance) * 5;
        
        this.bullets.push(tracking);
    }
    
    specialAttack(player) {
        const centerX = this.x + this.width / 2;
        
        // 超级导弹阵列
        for (let i = 0; i < 5; i++) {
            const offsetX = (i - 2) * 25;
            const missile = new Bullet(centerX + offsetX, this.y + this.height, 3, false, this.canvasHeight);
            missile.speedY = 3;
            missile.speedX = 0;
            missile.size = 8;
            missile.isMissile = true; // 标记为导弹
            this.bullets.push(missile);
        }
    }
    
    screenWideAttack(canvas) {
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        
        // 全屏辐射弹幕 - 从Boss中心向四周辐射
        const totalBullets = 60; // 60颗子弹形成密集辐射
        for (let i = 0; i < totalBullets; i++) {
            const angle = (Math.PI * 2 / totalBullets) * i;
            const bulletSize = 5;
            
            // 创建自定义子弹对象 - x,y是圆心坐标（与Bullet类一致）
            const bullet = {
                x: centerX,  // 圆心X坐标
                y: centerY,  // 圆心Y坐标
                speedX: Math.cos(angle) * 5,
                speedY: Math.sin(angle) * 5,
                active: true,
                size: bulletSize,
                width: bulletSize * 2,   // 碰撞检测用直径
                height: bulletSize * 2,  // 碰撞检测用直径
                isPenetrating: Math.random() < 0.3, // 30%概率穿透弹
                color: Math.random() < 0.3 ? '#FF00FF' : '#FF6666',
                update: function() {
                    this.x += this.speedX;
                    this.y += this.speedY;
                },
                draw: function(ctx) {
                    // 在boss.js的draw方法中处理
                }
            };
            
            this.bullets.push(bullet);
        }
        
        // 第二层辐射（速度更快）
        const secondLayer = 40;
        for (let i = 0; i < secondLayer; i++) {
            const angle = (Math.PI * 2 / secondLayer) * i + 0.5; // 偏移角度
            const bulletSize = 6;
            
            const bullet = {
                x: centerX,  // 圆心X坐标
                y: centerY,  // 圆心Y坐标
                speedX: Math.cos(angle) * 7,
                speedY: Math.sin(angle) * 7,
                active: true,
                size: bulletSize,
                width: bulletSize * 2,   // 碰撞检测用直径
                height: bulletSize * 2,  // 碰撞检测用直径
                isPenetrating: Math.random() < 0.25, // 25%概率穿透弹
                color: Math.random() < 0.25 ? '#FF00FF' : '#FF8888',
                update: function() {
                    this.x += this.speedX;
                    this.y += this.speedY;
                },
                draw: function(ctx) {
                    // 在boss.js的draw方法中处理
                }
            };
            
            this.bullets.push(bullet);
        }
    }
    
    hit(damage = 1) {
        // 先打护盾
        if (this.shieldActive && this.shieldHealth > 0) {
            this.shieldHealth -= damage;
            this.shieldRegenTimer = 0;
            if (this.shieldHealth <= 0) {
                this.shieldHealth = 0;
                this.shieldActive = false;
            }
            return false;
        }
        
        // 护盾破了才能打本体
        this.health -= damage;
        return this.health <= 0;
    }
    
    draw(ctx) {
        ctx.save();
        
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        
        // 绘制护盾
        if (this.shieldHealth > 0) {
            const shieldAlpha = this.shieldHealth / this.shieldMaxHealth * 0.4 + 0.1;
            const shieldRadius = Math.max(this.width, this.height) * 0.65;
            const pulse = Math.sin(this.enginePulse * 2) * 7.5; // 5*1.5
            
            const shieldGradient = ctx.createRadialGradient(centerX, centerY, shieldRadius - 30, centerX, centerY, shieldRadius + pulse);
            shieldGradient.addColorStop(0, `rgba(100, 200, 255, 0)`);
            shieldGradient.addColorStop(0.7, `rgba(100, 200, 255, ${shieldAlpha})`);
            shieldGradient.addColorStop(1, `rgba(150, 220, 255, ${shieldAlpha * 0.3})`);
            
            ctx.fillStyle = shieldGradient;
            ctx.beginPath();
            ctx.arc(centerX, centerY, shieldRadius + pulse, 0, Math.PI * 2);
            ctx.fill();
            
            // 护盾边缘发光
            ctx.strokeStyle = `rgba(150, 220, 255, ${shieldAlpha * 1.5})`;
            ctx.lineWidth = 3; // 2*1.5
            ctx.stroke();
        }
        
        // Boss主体 - 超大型轰炸机
        const bodyGradient = ctx.createLinearGradient(this.x, centerY, this.x + this.width, centerY);
        bodyGradient.addColorStop(0, '#2A2A2A');
        bodyGradient.addColorStop(0.5, '#4A4A4A');
        bodyGradient.addColorStop(1, '#2A2A2A');
        ctx.fillStyle = bodyGradient;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 4.5; // 3*1.5
        
        // 主机身 (所有坐标乘以1.5)
        ctx.beginPath();
        ctx.moveTo(centerX, this.y + this.height);
        ctx.lineTo(centerX - 45, this.y + 105);  // -30*1.5, 70*1.5
        ctx.lineTo(centerX - 52.5, this.y + 30); // -35*1.5, 20*1.5
        ctx.lineTo(centerX - 30, this.y);        // -20*1.5
        ctx.lineTo(centerX + 30, this.y);        // 20*1.5
        ctx.lineTo(centerX + 52.5, this.y + 30); // 35*1.5, 20*1.5
        ctx.lineTo(centerX + 45, this.y + 105);  // 30*1.5, 70*1.5
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // 巨大机翼
        const wingGradient = ctx.createLinearGradient(this.x, centerY, this.x + this.width, centerY);
        wingGradient.addColorStop(0, '#3A3A3A');
        wingGradient.addColorStop(0.5, '#5A5A5A');
        wingGradient.addColorStop(1, '#3A3A3A');
        ctx.fillStyle = wingGradient;
        
        // 左翼 (所有坐标乘以1.5)
        ctx.beginPath();
        ctx.moveTo(centerX - 52.5, this.y + 60);   // -35*1.5, 40*1.5
        ctx.lineTo(this.x - 15, this.y + 67.5);     // -10*1.5, 45*1.5
        ctx.lineTo(this.x, this.y + 90);            // 60*1.5
        ctx.lineTo(centerX - 45, this.y + 82.5);    // -30*1.5, 55*1.5
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // 右翼 (所有坐标乘以1.5)
        ctx.beginPath();
        ctx.moveTo(centerX + 52.5, this.y + 60);         // 35*1.5, 40*1.5
        ctx.lineTo(this.x + this.width + 15, this.y + 67.5); // 10*1.5, 45*1.5
        ctx.lineTo(this.x + this.width, this.y + 90);    // 60*1.5
        ctx.lineTo(centerX + 45, this.y + 82.5);         // 30*1.5, 55*1.5
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // 绘制炮塔
        this.turrets.forEach(turret => {
            const turretX = centerX + turret.x;
            const turretY = this.y + turret.y;
            
            ctx.save();
            ctx.translate(turretX, turretY);
            ctx.rotate(turret.angle);
            
            // 炮塔基座 (6*1.5=9)
            ctx.fillStyle = '#555';
            ctx.beginPath();
            ctx.arc(0, 0, 9, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            
            // 炮管 (12*1.5=18, 4*1.5=6, 2*1.5=3)
            ctx.fillStyle = '#333';
            ctx.fillRect(0, -3, 18, 6);
            ctx.strokeRect(0, -3, 18, 6);
            
            // 炮口 (2*1.5=3)
            ctx.fillStyle = '#FF6B6B';
            ctx.beginPath();
            ctx.arc(18, 0, 3, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
        });
        
        // 引擎发光效果
        const engineGlow = Math.sin(this.enginePulse) * 0.3 + 0.7;
        
        // 左引擎 (15*1.5=22.5, 10*1.5=15, 8*1.5=12)
        const leftEngineGradient = ctx.createRadialGradient(this.x + 22.5, this.y + 15, 0, this.x + 22.5, this.y + 15, 12);
        leftEngineGradient.addColorStop(0, `rgba(255, 100, 50, ${engineGlow})`);
        leftEngineGradient.addColorStop(0.5, `rgba(255, 150, 100, ${engineGlow * 0.6})`);
        leftEngineGradient.addColorStop(1, 'rgba(100, 50, 0, 0)');
        ctx.fillStyle = leftEngineGradient;
        ctx.beginPath();
        ctx.arc(this.x + 22.5, this.y + 15, 12, 0, Math.PI * 2);
        ctx.fill();
        
        // 右引擎 (15*1.5=22.5, 10*1.5=15, 8*1.5=12)
        const rightEngineGradient = ctx.createRadialGradient(this.x + this.width - 22.5, this.y + 15, 0, this.x + this.width - 22.5, this.y + 15, 12);
        rightEngineGradient.addColorStop(0, `rgba(255, 100, 50, ${engineGlow})`);
        rightEngineGradient.addColorStop(0.5, `rgba(255, 150, 100, ${engineGlow * 0.6})`);
        rightEngineGradient.addColorStop(1, 'rgba(100, 50, 0, 0)');
        ctx.fillStyle = rightEngineGradient;
        ctx.beginPath();
        ctx.arc(this.x + this.width - 22.5, this.y + 15, 12, 0, Math.PI * 2);
        ctx.fill();
        
        // Boss标识 - 骷髅头 (24*1.5=36, 45*1.5=67.5)
        ctx.fillStyle = '#FF0000';
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('💀', centerX, this.y + 67.5);
        
        // Boss血量条 (40*1.5=60, 8*1.5=12, 20*1.5=30, 25*1.5=37.5)
        const barWidth = this.width + 60;
        const barHeight = 12;
        const barX = this.x - 30;
        const barY = this.y - 37.5;
        
        // 血条背景
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // 血量
        const healthPercent = this.health / this.maxHealth;
        const healthGradient = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
        if (healthPercent > 0.5) {
            healthGradient.addColorStop(0, '#FF0000');
            healthGradient.addColorStop(1, '#FF6B6B');
        } else if (healthPercent > 0.25) {
            healthGradient.addColorStop(0, '#FF4500');
            healthGradient.addColorStop(1, '#FF8C00');
        } else {
            healthGradient.addColorStop(0, '#8B0000');
            healthGradient.addColorStop(1, '#FF0000');
        }
        ctx.fillStyle = healthGradient;
        ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
        
        // 血条边框 (2*1.5=3)
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        ctx.strokeRect(barX, barY, barWidth, barHeight);
        
        // 护盾条 (3*1.5=4.5, 4*1.5=6)
        if (this.shieldMaxHealth > 0) {
            const shieldBarY = barY + barHeight + 4.5;
            const shieldBarHeight = 6;
            const shieldPercent = this.shieldHealth / this.shieldMaxHealth;
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(barX, shieldBarY, barWidth, shieldBarHeight);
            
            ctx.fillStyle = `rgba(100, 200, 255, 0.8)`;
            ctx.fillRect(barX, shieldBarY, barWidth * shieldPercent, shieldBarHeight);
            
            ctx.strokeStyle = '#88DDFF';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(barX, shieldBarY, barWidth, shieldBarHeight);
        }
        
        // Boss名称 (16*1.5=24, 5*1.5=7.5, 8*1.5=12)
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 24px Arial';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 7.5;
        ctx.textAlign = 'center';
        ctx.fillText('⚠️ BOSS ⚠️', centerX, barY - 12);
        ctx.shadowBlur = 0;
        
        ctx.restore();
        
        // 绘制子弹
        this.bullets.forEach(bullet => {
            if (bullet.isMissile) {
                // 导弹特效 (4*1.5=6, 8*1.5=12, 2*1.5=3)
                ctx.save();
                ctx.fillStyle = '#FF4500';
                ctx.strokeStyle = '#8B0000';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.ellipse(bullet.x, bullet.y, 6, 12, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                
                // 导弹尾焰 (8*1.5=12, 6*1.5=9)
                const flameGradient = ctx.createRadialGradient(bullet.x, bullet.y + 12, 0, bullet.x, bullet.y + 12, 9);
                flameGradient.addColorStop(0, 'rgba(255, 200, 100, 0.9)');
                flameGradient.addColorStop(0.5, 'rgba(255, 100, 0, 0.6)');
                flameGradient.addColorStop(1, 'rgba(255, 50, 0, 0)');
                ctx.fillStyle = flameGradient;
                ctx.beginPath();
                ctx.arc(bullet.x, bullet.y + 12, 9, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            } else if (bullet.isLaser) {
                // 激光特效
                ctx.save();
                ctx.strokeStyle = bullet.color || '#00FFFF';
                ctx.lineWidth = bullet.size || 6;
                ctx.shadowColor = bullet.color || '#00FFFF';
                ctx.shadowBlur = 15;
                
                // 绘制激光束
                const angle = Math.atan2(bullet.speedY, bullet.speedX);
                const length = 30;
                ctx.beginPath();
                ctx.moveTo(bullet.x - Math.cos(angle) * length, bullet.y - Math.sin(angle) * length);
                ctx.lineTo(bullet.x + Math.cos(angle) * length, bullet.y + Math.sin(angle) * length);
                ctx.stroke();
                
                // 激光核心
                ctx.fillStyle = '#FFFFFF';
                ctx.beginPath();
                ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            } else if (bullet.isTracking) {
                // 跟踪弹特效
                ctx.save();
                ctx.fillStyle = bullet.color || '#FF6600';
                ctx.strokeStyle = '#FFD700';
                ctx.lineWidth = 2;
                ctx.shadowColor = bullet.color || '#FF6600';
                ctx.shadowBlur = 10;
                
                // 绘制跟踪弹主体
                ctx.beginPath();
                ctx.arc(bullet.x, bullet.y, bullet.size || 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                
                // 绘制追踪轨迹
                const angle = Math.atan2(bullet.speedY, bullet.speedX);
                for (let i = 1; i <= 3; i++) {
                    const trailX = bullet.x - Math.cos(angle) * i * 8;
                    const trailY = bullet.y - Math.sin(angle) * i * 8;
                    const alpha = 1 - i * 0.3;
                    ctx.fillStyle = `rgba(255, 102, 0, ${alpha})`;
                    ctx.beginPath();
                    ctx.arc(trailX, trailY, (bullet.size || 5) * (1 - i * 0.2), 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            } else if (bullet.isPenetrating) {
                // 穿透弹特效
                ctx.save();
                ctx.fillStyle = bullet.color || '#FF00FF';
                ctx.strokeStyle = '#FFFFFF';
                ctx.lineWidth = 2;
                ctx.shadowColor = bullet.color || '#FF00FF';
                ctx.shadowBlur = 10;
                
                // 绘制穿透弹（菱形）
                ctx.beginPath();
                const size = bullet.size || 4;
                ctx.moveTo(bullet.x, bullet.y - size);
                ctx.lineTo(bullet.x + size, bullet.y);
                ctx.lineTo(bullet.x, bullet.y + size);
                ctx.lineTo(bullet.x - size, bullet.y);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            } else if (bullet.draw && typeof bullet.draw === 'function') {
                // Bullet类实例
                bullet.draw(ctx);
            } else {
                // 自定义子弹对象（全屏辐射弹幕）
                ctx.save();
                ctx.fillStyle = bullet.color || '#FF6666';
                ctx.shadowColor = bullet.color || '#FF6666';
                ctx.shadowBlur = 8;
                
                // 绘制圆形子弹 - x,y是圆心坐标
                ctx.beginPath();
                ctx.arc(bullet.x, bullet.y, bullet.size || 5, 0, Math.PI * 2);
                ctx.fill();
                
                // 如果是穿透弹，添加额外效果
                if (bullet.isPenetrating) {
                    ctx.strokeStyle = '#FFFFFF';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }
                ctx.restore();
            }
        });
    }
    
    isOffScreen(canvas) {
        return this.y > canvas.height + 75; // 50*1.5
    }
}
