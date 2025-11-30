// 玩家FG类
class Player {
    constructor(canvas) {
        this.width = 40;
        this.height = 50;
        this.x = canvas.width / 2 - this.width / 2;
        this.y = canvas.height - this.height - 20;
        this.speed = 5;
        this.bullets = [];
        this.lives = 3;
        this.invulnerable = false;
        this.invulnerableTime = 0;
        this.shootCooldown = 0;
        this.shootRate = 10; // 帧数
        this.canvasHeight = canvas.height; // 保存canvas高度
        
        // 蓄力射击
        this.chargeTime = 0;
        this.maxChargeTime = 90; // 1.5秒（60fps * 1.5）
        this.isCharging = false;
        this.chargeSoundPlayed = false;
        
        // 道具效果
        this.powerUps = {
            S: { active: false, endTime: 0 },      // 三弹道
            L: { active: false, endTime: 0 },      // 激光
            B: { active: false, endTime: 0 },      // 爆炸弹
            P: { active: false, endTime: 0, level: 0 } // 强化（可叠加，最多5级）
        };
        this.explosions = []; // 爆炸效果数组
        
        // 键盘控制
        this.keys = {
            left: false,
            right: false,
            up: false,
            down: false,
            shoot: false,
            charge: false // I键蓄力
        };

        // 触摸控制
        this.touchActive = false;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.canvas = canvas;
        
        // 连击检测（用于蓄力）
        this.tapCount = 0;
        this.lastTapTime = 0;
        this.tapTimeout = null;
        this.maxTapInterval = 400; // 400ms内的点击算连击

        this.setupControls();
        this.setupTouchControls();
    }

    setupControls() {
        document.addEventListener('keydown', (e) => {
            switch(e.key.toLowerCase()) {
                case 'a':
                case 'arrowleft':
                    this.keys.left = true;
                    break;
                case 'd':
                case 'arrowright':
                    this.keys.right = true;
                    break;
                case 'w':
                case 'arrowup':
                    this.keys.up = true;
                    break;
                case 's':
                case 'arrowdown':
                    this.keys.down = true;
                    break;
                case ' ':
                case 'j':
                    this.keys.shoot = true;
                    e.preventDefault();
                    break;
                case 'i':
                    this.keys.charge = true;
                    e.preventDefault();
                    break;
            }
        });

        document.addEventListener('keyup', (e) => {
            switch(e.key.toLowerCase()) {
                case 'a':
                case 'arrowleft':
                    this.keys.left = false;
                    break;
                case 'd':
                case 'arrowright':
                    this.keys.right = false;
                    break;
                case 'w':
                case 'arrowup':
                    this.keys.up = false;
                    break;
                case 's':
                case 'arrowdown':
                    this.keys.down = false;
                    break;
                case ' ':
                case 'j':
                    this.keys.shoot = false;
                    e.preventDefault();
                    break;
                case 'i':
                    this.keys.charge = false;
                    e.preventDefault();
                    break;
                    break;
            }
        });
    }

    setupTouchControls() {
        // 触摸移动 - 相对移动，不跳到触摸点
        this.lastTouchX = null;
        this.lastTouchY = null;
        
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            const touchX = touch.clientX - rect.left;
            const touchY = touch.clientY - rect.top;
            
            this.lastTouchX = touchX;
            this.lastTouchY = touchY;
            this.touchActive = true;
            
            // 连击检测
            const currentTime = Date.now();
            const timeSinceLastTap = currentTime - this.lastTapTime;
            
            if (timeSinceLastTap < this.maxTapInterval) {
                // 在允许时间内，计为连击
                this.tapCount++;
            } else {
                // 超时，重置计数
                this.tapCount = 1;
            }
            
            this.lastTapTime = currentTime;
            
            // 清除之前的超时计时器
            if (this.tapTimeout) {
                clearTimeout(this.tapTimeout);
            }
            
            // 设置超时重置
            this.tapTimeout = setTimeout(() => {
                this.tapCount = 0;
            }, this.maxTapInterval);
            
            // 检查是否达到3连击
            if (this.tapCount >= 3) {
                // 触发蓄力
                this.keys.charge = true;
                this.tapCount = 0; // 重置计数
                
                // 蓄力时不自动射击
                this.keys.shoot = false;
            } else {
                // 普通点击，自动射击
                this.keys.shoot = true;
            }
        });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (!this.touchActive || this.lastTouchX === null) return;
            
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            const touchX = touch.clientX - rect.left;
            const touchY = touch.clientY - rect.top;
            
            // 计算手指移动的偏移量
            const deltaX = touchX - this.lastTouchX;
            const deltaY = touchY - this.lastTouchY;
            
            // 根据偏移量移动FG
            this.x += deltaX;
            this.y += deltaY;
            
            // 限制在画布范围内
            this.x = Math.max(0, Math.min(this.canvas.width - this.width, this.x));
            this.y = Math.max(0, Math.min(this.canvas.height - this.height, this.y));
            
            // 更新最后触摸位置
            this.lastTouchX = touchX;
            this.lastTouchY = touchY;
        });

        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.touchActive = false;
            this.lastTouchX = null;
            this.lastTouchY = null;
            this.keys.shoot = false;
            
            // 松手时，如果正在蓄力，设置为false让update()中发射
            if (this.keys.charge) {
                this.keys.charge = false; // 松开即停止蓄力状态
            }
        });

        this.canvas.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            this.touchActive = false;
            this.lastTouchX = null;
            this.lastTouchY = null;
            this.keys.shoot = false;
            this.keys.charge = false; // 取消时直接停止蓄力
        });
    }

    update(canvas, audioManager = null, enemies = []) {
        // 键盘移动
        if (!this.touchActive) {
            if (this.keys.left && this.x > 0) {
                this.x -= this.speed;
            }
            if (this.keys.right && this.x < canvas.width - this.width) {
                this.x += this.speed;
            }
            if (this.keys.up && this.y > 0) {
                this.y -= this.speed;
            }
            if (this.keys.down && this.y < canvas.height - this.height) {
                this.y += this.speed;
            }
        }
        // 触摸移动已在 touchmove 事件中处理

        // 普通射击
        if (this.keys.shoot && this.shootCooldown === 0) {
            this.shoot(audioManager);
            this.shootCooldown = this.shootRate;
        }

        // 蓄力射击逻辑（独立的I键或移动端3连击）
        if (this.keys.charge) {
            if (!this.isCharging) {
                this.isCharging = true;
                this.chargeTime = 0;
                this.chargeSoundPlayed = false;
            }
            
            // 累积蓄力时间
            if (this.chargeTime < this.maxChargeTime) {
                this.chargeTime++;
                
                // 播放蓄力音效（只播放一次）
                if (!this.chargeSoundPlayed && audioManager) {
                    audioManager.playCharging();
                    this.chargeSoundPlayed = true;
                }
            }
            // 蓄力满后继续保持充能状态，等待松开
        } else if (this.isCharging) {
            // 松开蓄力键，发射蓄力子弹（桌面端和移动端都需要松开）
            if (this.chargeTime >= this.maxChargeTime && this.shootCooldown === 0) {
                // 发射蓄力子弹
                this.shootChargedBullet(audioManager);
            } else {
                // 蓄力未满就取消，停止蓄力音效
                if (audioManager && audioManager.stopCharging) {
                    audioManager.stopCharging();
                }
            }
            
            // 重置蓄力状态
            this.isCharging = false;
            this.chargeTime = 0;
            this.chargeSoundPlayed = false;
        }

        if (this.shootCooldown > 0) {
            this.shootCooldown--;
        }

        // 无敌时间
        if (this.invulnerable) {
            this.invulnerableTime--;
            if (this.invulnerableTime <= 0) {
                this.invulnerable = false;
            }
        }

        // 更新子弹（传入敌人列表用于追踪）
        this.bullets = this.bullets.filter(bullet => {
            bullet.update(enemies);
            return bullet.active;
        });
    }

    shoot(audioManager = null) {
        const centerX = this.x + this.width / 2;
        const centerY = this.y;
        
        // 根据道具效果决定射击模式
        if (this.powerUps.L.active) {
            // L - 激光模式：根据P等级增加激光数量
            const pLevel = this.powerUps.P.level;
            const laserCount = Math.min(6, 1 + pLevel); // 1-6条激光
            
            for (let i = 0; i < laserCount; i++) {
                let offsetX = 0;
                if (laserCount > 1) {
                    // 多条激光均匀分布
                    const spacing = 20;
                    offsetX = (i - (laserCount - 1) / 2) * spacing;
                }
                
                const laser = new Bullet(centerX + offsetX, centerY, 15, true, this.canvasHeight);
                laser.isCharged = true;
                laser.damage = (1 + pLevel * 0.5) * 1.5; // 激光威力是普通弹的1.5倍
                laser.size = 8;
                laser.penetrating = true;
                laser.isHoming = false;
                laser.speedX = 0;
                laser.speedY = -15;
                laser.isLaser = true;
                this.bullets.push(laser);
            }
            
        } else if (this.powerUps.B.active) {
            // B - 爆炸弹模式：根据P等级增加弹道数量
            const pLevel = this.powerUps.P.level;
            const bulletCount = Math.min(6, 1 + pLevel); // 1-6发爆炸弹
            
            if (bulletCount === 1) {
                // 单发直线
                const bullet = new Bullet(centerX, centerY, 10, true, this.canvasHeight);
                bullet.damage = 1 + pLevel * 0.5;
                bullet.size = 10;
                bullet.penetrating = false;
                bullet.isHoming = false;
                bullet.isBomb = true;
                bullet.bombRadius = 200;
                bullet.bombDamage = 2.5;
                bullet.speedX = 0;
                bullet.speedY = -10;
                this.bullets.push(bullet);
            } else {
                // 多发散射
                const angles = this.calculateAngles(bulletCount);
                const baseSpeed = 10;
                
                angles.forEach(angle => {
                    const bullet = new Bullet(centerX, centerY, baseSpeed, true, this.canvasHeight);
                    bullet.damage = 1 + pLevel * 0.5;
                    bullet.size = 10;
                    bullet.penetrating = false;
                    bullet.isHoming = false;
                    bullet.isBomb = true;
                    bullet.bombRadius = 200;
                    bullet.bombDamage = 2.5;
                    bullet.angle = angle;
                    bullet.speedX = Math.sin(angle) * baseSpeed * 0.6;
                    bullet.speedY = -Math.cos(angle) * baseSpeed;
                    this.bullets.push(bullet);
                });
            }
            
        } else if (this.powerUps.S.active) {
            // S - 散弹模式：根据P等级增加弹道数量
            const pLevel = this.powerUps.P.level;
            const baseSpeed = 10;
            let angles = [];
            
            // 基础3发：左30度、直线、右30度
            angles = [-Math.PI / 6, 0, Math.PI / 6];
            
            // P等级1: 增加向后下方两发（对称角度，用来平衡后方出现的敌机）
            if (pLevel >= 1) {
                angles.push(Math.PI + Math.PI / 6);   // 后右30度（210度）
                angles.push(Math.PI - Math.PI / 6);   // 后左30度（150度）
            }
            
            // P等级2: 再增加向正后方发（对称0度）
            if (pLevel >= 2) {
                angles.push(Math.PI);  // 正后方（180度）
            }
            
            // P等级3+: 向前方向增加弹道
            if (pLevel >= 3) {
                angles.push(-Math.PI / 12, Math.PI / 12); // 增加左右15度
            }
            if (pLevel >= 4) {
                angles.push(-Math.PI / 8, Math.PI / 8); // 增加左右22.5度
            }
            if (pLevel >= 5) {
                angles.push(-Math.PI / 4, Math.PI / 4); // 增加左右45度
            }
            if (pLevel >= 6) {
                angles.push(-Math.PI / 3, Math.PI / 3); // 增加左右60度
            }
            
            angles.forEach(angle => {
                const bullet = new Bullet(centerX, centerY, baseSpeed, true, this.canvasHeight);
                bullet.damage = 1 + pLevel * 0.5;
                bullet.size = 4;
                bullet.penetrating = false;
                bullet.isHoming = false;
                bullet.angle = angle;
                bullet.speedX = Math.sin(angle) * baseSpeed * 0.6;
                bullet.speedY = -Math.cos(angle) * baseSpeed;
                this.bullets.push(bullet);
            });
            
        } else {
            // 默认模式：根据P等级增加弹道数量
            const pLevel = this.powerUps.P.level;
            const baseSpeed = 10;
            let angles = [];
            
            // 基础1发：直线
            angles = [0];
            
            // P等级1: 增加左右两发（前方）
            if (pLevel >= 1) {
                angles.push(-Math.PI / 12, Math.PI / 12); // 左右15度
            }
            
            // P等级2: 再增加左右两发（前方更宽）
            if (pLevel >= 2) {
                angles.push(-Math.PI / 6, Math.PI / 6); // 左右30度
            }
            
            // P等级3: 增加向下左右两发
            if (pLevel >= 3) {
                angles.push(Math.PI / 2.5);  // 右下约72度
                angles.push(-Math.PI / 2.5); // 左下约-72度
            }
            
            // P等级4: 再增加向下两发（更接近两侧）
            if (pLevel >= 4) {
                angles.push(Math.PI / 2);   // 右侧90度
                angles.push(-Math.PI / 2);  // 左侧-90度
            }
            
            // P等级5+: 向前方向继续增加弹道
            if (pLevel >= 5) {
                angles.push(-Math.PI / 8, Math.PI / 8); // 增加左右22.5度
            }
            if (pLevel >= 6) {
                angles.push(-Math.PI / 4, Math.PI / 4); // 增加左右45度
            }
            
            angles.forEach(angle => {
                const bullet = new Bullet(centerX, centerY, baseSpeed, true, this.canvasHeight);
                bullet.damage = 1 + pLevel * 0.5;
                bullet.size = 4;
                bullet.penetrating = false;
                bullet.isHoming = false;
                bullet.angle = angle;
                bullet.speedX = Math.sin(angle) * baseSpeed * 0.6;
                bullet.speedY = -Math.cos(angle) * baseSpeed;
                this.bullets.push(bullet);
            });
        }
        
        // 播放射击音效
        if (audioManager) {
            audioManager.playShoot();
        }
    }
    
    shootChargedBullet(audioManager = null) {
        // 发射三发追踪散弹（类似魂斗罗S弹 + 追踪）
        const centerX = this.x + this.width / 2;
        const centerY = this.y;
        
        // 三个角度：左45度、直线、右45度
        const angles = [-Math.PI / 6, 0, Math.PI / 6]; // -30度, 0度, 30度
        const baseSpeed = 12;
        
        angles.forEach(angle => {
            const chargedBullet = new Bullet(
                centerX, 
                centerY, 
                baseSpeed, 
                true, 
                this.canvasHeight
            );
            
            // 标记为蓄力子弹
            chargedBullet.isCharged = true;
            chargedBullet.damage = 2.5; // 2.5倍伤害
            chargedBullet.size = 12; // 稍大的尺寸
            chargedBullet.penetrating = true; // 穿透属性
            chargedBullet.isHoming = true; // 开启追踪
            chargedBullet.homingStrength = 0.15; // 追踪强度
            
            // 设置散射角度
            chargedBullet.angle = angle;
            chargedBullet.speedX = Math.sin(angle) * baseSpeed * 0.6; // 横向速度
            chargedBullet.speedY = -Math.cos(angle) * baseSpeed; // 纵向速度（向上为负）
            
            this.bullets.push(chargedBullet);
        });
        
        // 播放蓄力发射音效
        if (audioManager) {
            audioManager.playChargedShoot();
        }
        
        // 设置冷却时间
        this.shootCooldown = this.shootRate * 3;
    }

    draw(ctx) {
        ctx.save();

        // 无敌时闪烁
        if (this.invulnerable && Math.floor(this.invulnerableTime / 5) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }

        // 绘制FG机身 - P-51 Mustang风格
        ctx.fillStyle = '#4A90E2';
        ctx.strokeStyle = '#2E5C8A';
        ctx.lineWidth = 2;

        // 主机身
        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 2, this.y);
        ctx.lineTo(this.x + this.width / 2 - 8, this.y + 35);
        ctx.lineTo(this.x + this.width / 2 - 6, this.y + this.height);
        ctx.lineTo(this.x + this.width / 2 + 6, this.y + this.height);
        ctx.lineTo(this.x + this.width / 2 + 8, this.y + 35);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 机翼
        ctx.fillStyle = '#5BA3F5';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y + 25);
        ctx.lineTo(this.x + 5, this.y + 20);
        ctx.lineTo(this.x + this.width / 2 - 8, this.y + 30);
        ctx.lineTo(this.x + 3, this.y + 35);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(this.x + this.width, this.y + 25);
        ctx.lineTo(this.x + this.width - 5, this.y + 20);
        ctx.lineTo(this.x + this.width / 2 + 8, this.y + 30);
        ctx.lineTo(this.x + this.width - 3, this.y + 35);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 驾驶舱
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2, this.y + 15, 4, 0, Math.PI * 2);
        ctx.fill();

        // 机头螺旋桨效果
        ctx.strokeStyle = '#999';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2, this.y + 3, 5, 0, Math.PI * 2);
        ctx.stroke();

        // 国徽标志（五角星）
        this.drawStar(ctx, this.x + this.width / 2 - 15, this.y + 28, 3, '#FFD700');
        this.drawStar(ctx, this.x + this.width / 2 + 15, this.y + 28, 3, '#FFD700');

        ctx.restore();
        
        // 绘制蓄力条
        if (this.isCharging) {
            const chargePercent = this.chargeTime / this.maxChargeTime;
            const barWidth = 50;
            const barHeight = 5;
            const barX = this.x + this.width / 2 - barWidth / 2;
            const barY = this.y - 15;
            
            // 背景条
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(barX, barY, barWidth, barHeight);
            
            // 蓄力进度条
            const gradientColor = chargePercent < 1 ? '#FFD700' : '#00FF00';
            ctx.fillStyle = gradientColor;
            ctx.fillRect(barX, barY, barWidth * chargePercent, barHeight);
            
            // 边框
            ctx.strokeStyle = '#FFF';
            ctx.lineWidth = 1;
            ctx.strokeRect(barX, barY, barWidth, barHeight);
            
            // 蓄力满时的光效
            if (chargePercent >= 1) {
                ctx.save();
                ctx.shadowColor = '#00FF00';
                ctx.shadowBlur = 10;
                ctx.strokeStyle = '#00FF00';
                ctx.lineWidth = 2;
                ctx.strokeRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);
                ctx.restore();
            }
        }

        // 绘制子弹
        this.bullets.forEach(bullet => bullet.draw(ctx));
    }

    drawStar(ctx, x, y, radius, color) {
        ctx.save();
        ctx.fillStyle = color;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
            const x1 = x + radius * Math.cos(angle);
            const y1 = y + radius * Math.sin(angle);
            if (i === 0) {
                ctx.moveTo(x1, y1);
            } else {
                ctx.lineTo(x1, y1);
            }
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
    
    // 根据弹道数量计算角度分布
    calculateAngles(count) {
        if (count === 1) {
            return [0]; // 单发直线
        } else if (count === 2) {
            return [-Math.PI / 12, Math.PI / 12]; // 两发，左右15度
        } else if (count === 3) {
            return [-Math.PI / 6, 0, Math.PI / 6]; // 三发，左右30度
        } else if (count === 4) {
            return [-Math.PI / 5, -Math.PI / 12, Math.PI / 12, Math.PI / 5]; // 四发
        } else if (count === 5) {
            return [-Math.PI / 4, -Math.PI / 8, 0, Math.PI / 8, Math.PI / 4]; // 五发，左右45度
        } else if (count === 6) {
            // 六发：向前3发 + 向左下、向右下各1发
            return [-Math.PI / 4, -Math.PI / 8, 0, Math.PI / 8, Math.PI / 4, Math.PI / 2.5, -Math.PI / 2.5];
        }
        return [0];
    }

    hit() {
        if (!this.invulnerable) {
            this.lives--;
            this.invulnerable = true;
            this.invulnerableTime = 120; // 2秒无敌
            return true;
        }
        return false;
    }

    reset(canvas) {
        this.x = canvas.width / 2 - this.width / 2;
        this.y = canvas.height - this.height - 20;
        this.bullets = [];
        this.lives = 3;
        this.invulnerable = false;
        this.invulnerableTime = 0;
        this.canvasHeight = canvas.height; // 更新canvas高度
        
        // 重置道具效果
        this.powerUps = {
            S: { active: false, endTime: 0 },
            L: { active: false, endTime: 0 },
            B: { active: false, endTime: 0 },
            P: { active: false, endTime: 0, level: 0 }
        };
        this.explosions = [];
    }
    
    // 激活道具
    activatePowerUp(type, difficulty = 1) {
        const now = Date.now();
        
        switch(type) {
            case 'HP':
                // 回血 - 不影响其他道具
                if (this.lives < 3) {
                    this.lives++;
                }
                break;
                
            case 'P':
                // 强化可叠加 - 不影响其他道具
                this.powerUps.P.active = true;
                this.powerUps.P.level = Math.min(6, this.powerUps.P.level + 1); // 最多6级
                this.powerUps.P.endTime = 0; // 无限时长
                break;
                
            case 'S':
            case 'L':
            case 'B':
                // 弹道类型道具 - 互斥，切换时重置其他弹道类型
                // 检查是否是相同类型（重置时间）
                const isSameType = this.powerUps[type].active;
                
                // 如果切换了不同的弹道类型，重置P强化效果
                if (!isSameType) {
                    this.powerUps.P.active = false;
                    this.powerUps.P.level = 0;
                }
                
                // 先关闭其他弹道类型
                this.powerUps.S.active = false;
                this.powerUps.L.active = false;
                this.powerUps.B.active = false;
                
                // 根据难度计算持续时间
                const duration = calculateWeaponDuration(difficulty);
                
                // 激活当前类型并设置时间
                this.powerUps[type].active = true;
                // duration为0表示无限时长，endTime设为0表示不过期
                this.powerUps[type].endTime = duration > 0 ? now + duration : 0;
                break;
        }
    }
    
    // 检查道具是否过期
    updatePowerUps() {
        const now = Date.now();
        
        for (let type in this.powerUps) {
            if (this.powerUps[type].active && this.powerUps[type].endTime > 0) {
                if (now >= this.powerUps[type].endTime) {
                    this.powerUps[type].active = false;
                    if (type === 'P') {
                        this.powerUps[type].level = 0;
                    }
                }
            }
        }
        
        // 更新爆炸效果
        this.explosions = this.explosions.filter(exp => {
            exp.update();
            return exp.active;
        });
    }
}
