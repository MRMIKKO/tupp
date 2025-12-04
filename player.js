// 玩家FG类
class Player {
    constructor(canvas) {
        this.width = 40;
        this.height = 50;
        this.x = canvas.width / 2 - this.width / 2;
        this.y = canvas.height - this.height - 20;
        this.speed = 5;
        this.bullets = [];
        
        // 生命值槽系统
        this.health = 100; // 当前生命值
        this.maxHealth = 100; // 最大生命值
        this.baseMaxHealth = 100; // 基础最大生命值（用于计算上限）
        
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
            S: { active: false, endTime: 0, startTime: 0 },      // 三弹道
            L: { active: false, endTime: 0, startTime: 0 },      // 激光
            B: { active: false, endTime: 0, startTime: 0 },      // 爆炸弹
            C: { active: false, endTime: 0, startTime: 0 },      // 追踪火箭炮
            P: { active: false, endTime: 0, startTime: 0, level: 0 } // 强化（可叠加，最多5级）
        };
        this.explosions = []; // 爆炸效果数组
        
        // P槽存储机制
        this.pGauge = 0; // 当前P槽值
        this.pGaugeMax = 100; // P槽最大值（会根据难度和等级调整）
        this.pUpgradeNotification = null; // P升级提示 {level: N, timer: 0}
        
        // 经验槽系统
        this.exp = 0; // 当前经验值
        this.expMax = 100; // 经验槽最大值（固定）
        this.playerLevel = 1; // 玩家等级（无上限）
        this.expUpgradeNotification = null; // 经验升级提示 {level: N, timer: 0}
        
        // 红血状态P等级提升机制
        this.lowHealthPBoost = false; // 是否处于低血量P提升状态
        this.savedPLevel = 0; // 保存的原始P等级
        
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
            
            // 向前发射的激光
            for (let i = 0; i < laserCount; i++) {
                let offsetX = 0;
                if (laserCount > 1) {
                    // 多条激光均匀分布
                    const spacing = 36; // 20 * 1.8 = 36
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
            
            // P等级4及以上：增加向后的对称弹道（机身偏下方位置）
            if (pLevel >= 4) {
                const rearLaserCount = Math.min(4, pLevel - 3); // 4级1条，5级2条，6级3条
                const rearY = this.y + this.height * 0.7; // 机身偏下方位置
                
                for (let i = 0; i < rearLaserCount; i++) {
                    let offsetX = 0;
                    if (rearLaserCount > 1) {
                        const spacing = 45; // 25 * 1.8 = 45
                        offsetX = (i - (rearLaserCount - 1) / 2) * spacing;
                    }
                    
                    const rearLaser = new Bullet(centerX + offsetX, rearY, 12, true, this.canvasHeight);
                    rearLaser.isCharged = true;
                    rearLaser.damage = (1 + pLevel * 0.5) * 1.2; // 后方激光威力稍低
                    rearLaser.size = 6;
                    rearLaser.penetrating = true;
                    rearLaser.isHoming = false;
                    rearLaser.speedX = 0;
                    rearLaser.speedY = 12; // 向下发射（正速度）
                    rearLaser.isLaser = true;
                    this.bullets.push(rearLaser);
                }
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
            
        } else if (this.powerUps.C.active) {
            // C - 追踪火箭炮模式：固定数量，P等级只增加威力
            const pLevel = this.powerUps.P.level;
            const rocketCount = 1; // 固定1发火箭，避免卡顿
            
            for (let i = 0; i < rocketCount; i++) {
                let offsetX = 0;
                if (rocketCount > 1) {
                    // 多发火箭从左到右排列
                    const spacing = 15;
                    offsetX = (i - (rocketCount - 1) / 2) * spacing;
                }
                
                const rocket = new Bullet(centerX + offsetX, centerY, 8, true, this.canvasHeight);
                rocket.damage = 3 + pLevel * 1.2; // P等级只增加威力，不增加数量
                rocket.size = 8;
                rocket.penetrating = false;
                rocket.isHoming = true; // 开启追踪
                rocket.homingStrength = 0.15; // 追踪强度
                rocket.isCharged = true; // 标记为蓄力弹以启用追踪逻辑
                rocket.isMissile = true; // 标记为火箭（用于绘制）
                rocket.speedX = 0;
                rocket.speedY = -8;
                this.bullets.push(rocket);
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
                angles.push(Math.PI + Math.PI / 12, Math.PI - Math.PI / 12); // 增加后方左右15度
            }
            if (pLevel >= 6) {
                angles.push(-Math.PI / 3, Math.PI / 3); // 增加左右60度
                // angles.push(Math.PI + Math.PI / 8, Math.PI - Math.PI / 8); // 增加后方左右22.5度
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

        // 现代战斗机风格（类似F-35/雷霆战机）
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;

        // 主机身 - 深灰色金属质感
        const bodyGradient = ctx.createLinearGradient(centerX - 10, centerY, centerX + 10, centerY);
        bodyGradient.addColorStop(0, '#3A4A5A');
        bodyGradient.addColorStop(0.5, '#5A6A7A');
        bodyGradient.addColorStop(1, '#3A4A5A');
        
        ctx.fillStyle = bodyGradient;
        ctx.strokeStyle = '#1A2A3A';
        ctx.lineWidth = 1.5;

        // 机身主体（流线型）
        ctx.beginPath();
        ctx.moveTo(centerX, this.y); // 机头
        ctx.lineTo(centerX - 6, this.y + 12);
        ctx.lineTo(centerX - 8, this.y + 30);
        ctx.lineTo(centerX - 6, this.y + this.height - 5);
        ctx.lineTo(centerX, this.y + this.height); // 机尾
        ctx.lineTo(centerX + 6, this.y + this.height - 5);
        ctx.lineTo(centerX + 8, this.y + 30);
        ctx.lineTo(centerX + 6, this.y + 12);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 主翼（三角翼设计）
        const wingGradient = ctx.createLinearGradient(this.x, centerY, this.x + this.width, centerY);
        wingGradient.addColorStop(0, '#4A5A6A');
        wingGradient.addColorStop(0.5, '#6A7A8A');
        wingGradient.addColorStop(1, '#4A5A6A');
        ctx.fillStyle = wingGradient;

        // 左翼
        ctx.beginPath();
        ctx.moveTo(centerX - 8, this.y + 20);
        ctx.lineTo(this.x, this.y + 28);
        ctx.lineTo(this.x + 4, this.y + 35);
        ctx.lineTo(centerX - 8, this.y + 32);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 右翼
        ctx.beginPath();
        ctx.moveTo(centerX + 8, this.y + 20);
        ctx.lineTo(this.x + this.width, this.y + 28);
        ctx.lineTo(this.x + this.width - 4, this.y + 35);
        ctx.lineTo(centerX + 8, this.y + 32);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 尾翼
        ctx.fillStyle = '#5A6A7A';
        ctx.beginPath();
        ctx.moveTo(centerX - 3, this.y + this.height - 8);
        ctx.lineTo(centerX - 6, this.y + this.height - 2);
        ctx.lineTo(centerX, this.y + this.height);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(centerX + 3, this.y + this.height - 8);
        ctx.lineTo(centerX + 6, this.y + this.height - 2);
        ctx.lineTo(centerX, this.y + this.height);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 驾驶舱（玻璃质感）
        const cockpitGradient = ctx.createRadialGradient(centerX, this.y + 10, 0, centerX, this.y + 10, 5);
        cockpitGradient.addColorStop(0, 'rgba(100, 200, 255, 0.8)');
        cockpitGradient.addColorStop(0.7, 'rgba(50, 100, 150, 0.6)');
        cockpitGradient.addColorStop(1, 'rgba(20, 40, 60, 0.8)');
        ctx.fillStyle = cockpitGradient;
        ctx.beginPath();
        ctx.ellipse(centerX, this.y + 10, 4, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#2A3A4A';
        ctx.lineWidth = 1;
        ctx.stroke();

        // 引擎喷口发光效果
        const engineGlow = ctx.createRadialGradient(centerX, this.y + this.height, 0, centerX, this.y + this.height, 8);
        engineGlow.addColorStop(0, 'rgba(100, 150, 255, 0.6)');
        engineGlow.addColorStop(0.5, 'rgba(50, 100, 200, 0.3)');
        engineGlow.addColorStop(1, 'rgba(0, 50, 150, 0)');
        ctx.fillStyle = engineGlow;
        ctx.beginPath();
        ctx.arc(centerX, this.y + this.height, 8, 0, Math.PI * 2);
        ctx.fill();

        // 机身细节线条
        ctx.strokeStyle = '#6A7A8A';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(centerX - 4, this.y + 15);
        ctx.lineTo(centerX - 4, this.y + 40);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(centerX + 4, this.y + 15);
        ctx.lineTo(centerX + 4, this.y + 40);
        ctx.stroke();

        // 武器挂载点标识
        ctx.fillStyle = '#FF6B6B';
        ctx.beginPath();
        ctx.arc(this.x + 8, this.y + 30, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.x + this.width - 8, this.y + 30, 1.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
        
        // 绘制雷电球能量护盾（替代进度条）
        if (this.isCharging) {
            const chargePercent = this.chargeTime / this.maxChargeTime;
            const chargeFull = chargePercent >= 1;
            
            // 能量球位置（飞机前方）
            const energyX = centerX;
            const energyY = this.y - 15;
            const maxRadius = 22;
            const currentRadius = 10 + maxRadius * chargePercent;
            
            // 脉冲动画
            const time = Date.now() * 0.001;
            const pulseOffset = Math.sin(time * 5) * (chargeFull ? 3 : 1);
            const drawRadius = currentRadius + pulseOffset;
            
            ctx.save();
            
            // 外层电离层光晕
            const outerGlow = ctx.createRadialGradient(energyX, energyY, 0, energyX, energyY, drawRadius * 2);
            if (chargeFull) {
                outerGlow.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
                outerGlow.addColorStop(0.3, 'rgba(200, 220, 255, 0.3)');
                outerGlow.addColorStop(0.6, 'rgba(100, 150, 255, 0.2)');
                outerGlow.addColorStop(1, 'rgba(50, 100, 200, 0)');
            } else {
                outerGlow.addColorStop(0, 'rgba(150, 200, 255, 0.3)');
                outerGlow.addColorStop(0.5, 'rgba(80, 150, 255, 0.2)');
                outerGlow.addColorStop(1, 'rgba(40, 100, 200, 0)');
            }
            ctx.fillStyle = outerGlow;
            ctx.beginPath();
            ctx.arc(energyX, energyY, drawRadius * 2, 0, Math.PI * 2);
            ctx.fill();
            
            // 绘制闪电电弧（从中心向外）
            const lightningCount = chargeFull ? 12 : Math.floor(6 * chargePercent + 3);
            ctx.strokeStyle = chargeFull ? 'rgba(220, 240, 255, 0.9)' : 'rgba(150, 200, 255, 0.7)';
            ctx.lineWidth = chargeFull ? 2 : 1.5;
            ctx.shadowBlur = 15;
            ctx.shadowColor = chargeFull ? '#FFF' : '#88DDFF';
            
            for (let i = 0; i < lightningCount; i++) {
                const baseAngle = (i / lightningCount) * Math.PI * 2 + time;
                const startAngle = baseAngle + (Math.random() - 0.5) * 0.3;
                
                ctx.beginPath();
                ctx.moveTo(energyX, energyY);
                
                // 闪电路径（锯齿状）
                let currentX = energyX;
                let currentY = energyY;
                const segments = 4;
                
                for (let j = 1; j <= segments; j++) {
                    const progress = j / segments;
                    const radius = drawRadius * progress;
                    const angle = startAngle + (Math.random() - 0.5) * 0.5;
                    const nextX = energyX + Math.cos(angle) * radius;
                    const nextY = energyY + Math.sin(angle) * radius;
                    
                    // 添加随机偏移
                    const offsetX = (Math.random() - 0.5) * 5;
                    const offsetY = (Math.random() - 0.5) * 5;
                    
                    ctx.lineTo(nextX + offsetX, nextY + offsetY);
                    currentX = nextX;
                    currentY = nextY;
                }
                
                ctx.stroke();
            }
            
            // 中心球体（电浆核心）
            const coreGradient = ctx.createRadialGradient(energyX, energyY, 0, energyX, energyY, drawRadius * 0.6);
            if (chargeFull) {
                coreGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
                coreGradient.addColorStop(0.3, 'rgba(220, 240, 255, 0.9)');
                coreGradient.addColorStop(0.6, 'rgba(150, 200, 255, 0.7)');
                coreGradient.addColorStop(1, 'rgba(100, 180, 255, 0.3)');
            } else {
                coreGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
                coreGradient.addColorStop(0.4, 'rgba(180, 220, 255, 0.7)');
                coreGradient.addColorStop(1, 'rgba(100, 180, 255, 0.4)');
            }
            ctx.fillStyle = coreGradient;
            ctx.shadowBlur = chargeFull ? 25 : 15;
            ctx.shadowColor = chargeFull ? '#FFF' : '#88DDFF';
            ctx.beginPath();
            ctx.arc(energyX, energyY, drawRadius * 0.6, 0, Math.PI * 2);
            ctx.fill();
            
            // 环形电弧（围绕球体旋转）
            if (chargePercent > 0.3) {
                ctx.shadowBlur = 10;
                ctx.strokeStyle = chargeFull ? 'rgba(255, 255, 255, 0.8)' : 'rgba(150, 220, 255, 0.6)';
                ctx.lineWidth = chargeFull ? 2.5 : 1.5;
                
                const rings = chargeFull ? 3 : 2;
                for (let i = 0; i < rings; i++) {
                    const ringAngle = time * (2 + i * 0.5) + i * Math.PI * 2 / rings;
                    const ringRadius = drawRadius * 0.85;
                    
                    ctx.beginPath();
                    ctx.arc(energyX, energyY, ringRadius, ringAngle, ringAngle + Math.PI * 0.6);
                    ctx.stroke();
                }
            }
            
            // 内核闪烁点
            if (chargeFull) {
                ctx.fillStyle = 'rgba(255, 255, 255, ' + (0.6 + Math.sin(time * 10) * 0.4) + ')';
                ctx.shadowBlur = 20;
                ctx.shadowColor = '#FFF';
                ctx.beginPath();
                ctx.arc(energyX, energyY, drawRadius * 0.2, 0, Math.PI * 2);
                ctx.fill();
            }
            
            ctx.restore();
            
            // 保存能量球位置和半径，用于碰撞检测
            this.chargeShield = {
                x: energyX,
                y: energyY,
                radius: drawRadius
            };
        } else {
            this.chargeShield = null;
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

    hit(damage = 20) {
        if (!this.invulnerable) {
            this.health -= damage;
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
        this.health = 100;
        this.maxHealth = 100;
        this.baseMaxHealth = 100;
        this.invulnerable = false;
        this.invulnerableTime = 0;
        this.canvasHeight = canvas.height; // 更新canvas高度
        
        // 重置道具效果
        this.powerUps = {
            S: { active: false, endTime: 0, startTime: 0 },
            L: { active: false, endTime: 0, startTime: 0 },
            B: { active: false, endTime: 0, startTime: 0 },
            C: { active: false, endTime: 0, startTime: 0 },
            P: { active: false, endTime: 0, startTime: 0, level: 0 }
        };
        this.explosions = [];
        
        // 重置P槽
        this.pGauge = 0;
        this.pGaugeMax = 100;
        
        // 重置经验和等级
        this.exp = 0;
        this.expMax = 100;
        this.playerLevel = 1;
        
        // 重置低血量P提升状态
        this.lowHealthPBoost = false;
        this.savedPLevel = 0;
    }
    
    // 激活道具
    activatePowerUp(type, difficulty = 1) {
        const now = Date.now();
        
        switch(type) {
            case 'HP':
                // 回血 - 恢复30%最大生命值，不超过最大值
                const healAmount = Math.floor(this.maxHealth * 0.3);
                this.health = Math.min(this.maxHealth, this.health + healAmount);
                break;
                
            case 'P':
                // 强化可叠加 - 不影响其他道具
                this.powerUps.P.active = true;
                this.powerUps.P.level = Math.min(6, this.powerUps.P.level + 1); // 最多6级
                this.powerUps.P.startTime = 0; // P道具无限时长，不需要startTime
                this.powerUps.P.endTime = 0; // 无限时长
                break;
                
            case 'S':
            case 'L':
            case 'B':
            case 'C':
                // 弹道类型道具 - 互斥，切换时重置其他弹道类型
                // 检查是否是相同类型（重置时间）
                const isSameType = this.powerUps[type].active;
                
                // 如果切换了不同的弹道类型，重置P强化效果
                // 但如果处于低血量P提升状态，则保持满级不重置
                if (!isSameType && !this.lowHealthPBoost) {
                    this.powerUps.P.active = false;
                    this.powerUps.P.level = 0;
                } else if (!isSameType && this.lowHealthPBoost) {
                    // 红血状态下切换弹药，更新保存的P等级为0
                    this.savedPLevel = 0;
                    // 保持P满级不变
                }
                
                // 先关闭其他弹道类型
                this.powerUps.S.active = false;
                this.powerUps.L.active = false;
                this.powerUps.B.active = false;
                this.powerUps.C.active = false;
                
                // 根据难度计算持续时间
                const duration = calculateWeaponDuration(difficulty);
                
                // 激活当前类型并设置时间
                this.powerUps[type].active = true;
                this.powerUps[type].startTime = now;
                // duration为0表示无限时长，endTime设为0表示不过期
                this.powerUps[type].endTime = duration > 0 ? now + duration : 0;
                break;
        }
    }
    
    // 增加经验值（击杀敌机时调用）
    addExp(amount) {
        this.exp += amount;
        
        // 如果经验槽满了，自动升级
        while (this.exp >= this.expMax) {
            this.exp -= this.expMax;
            this.upgradePlayerLevel();
        }
    }
    
    // 升级玩家等级
    upgradePlayerLevel() {
        this.playerLevel++;
        
        // 每升一级：
        // 1. P槽最大值增加35% - 按比例保持P槽进度
        const oldPGaugeMax = this.pGaugeMax;
        const pGaugeProgress = this.pGauge / oldPGaugeMax; // 保存当前进度比例
        this.pGaugeMax = Math.floor(this.pGaugeMax * 1.35);
        this.pGauge = Math.floor(this.pGaugeMax * pGaugeProgress); // 按比例恢复进度
        
        // 2. 最大生命值增加，但不超过基础值的3倍 - 增长速率为35%/12 ≈ 2.92%
        const maxAllowedHealth = this.baseMaxHealth * 3;
        const healthIncrease = Math.floor(this.baseMaxHealth * 0.35 / 12);
        this.maxHealth = Math.min(this.maxHealth + healthIncrease, maxAllowedHealth);
        
        // 同时恢复增加的生命值
        this.health = Math.min(this.health + healthIncrease, this.maxHealth);
        
        // 显示升级提示
        this.expUpgradeNotification = {
            level: this.playerLevel,
            timer: 40 // 显示约0.67秒
        };
        
        // 播放升级音效
        if (window.audioManager) {
            audioManager.playPowerUp();
        }
    }
    
    // 增加P槽值（击杀敌机时调用）
    addPGauge(amount) {
        // 满级时不再增加P槽
        if (this.powerUps.P.level >= 6) {
            return;
        }
        
        this.pGauge += amount;
        
        // 如果P槽满了，自动升级P等级
        if (this.pGauge >= this.pGaugeMax) {
            this.pGauge -= this.pGaugeMax; // 扣除一个槽的量
            this.upgradePLevel();
        }
    }
    
    // 升级P等级
    upgradePLevel() {
        if (this.powerUps.P.level < 6) {
            this.powerUps.P.active = true;
            this.powerUps.P.level++;
            this.powerUps.P.startTime = 0; // P道具无限时长，不需要startTime
            this.powerUps.P.endTime = 0; // 无限时长
            
            // 显示升级提示
            this.pUpgradeNotification = {
                level: this.powerUps.P.level,
                timer: 40 // 显示约0.67秒（60fps * 0.67）
            };
            
            // 播放升级音效
            if (window.audioManager) {
                audioManager.playPowerUp();
            }
        }
    }
    
    // 检查道具是否过期
    updatePowerUps() {
        const now = Date.now();
        
        for (let type in this.powerUps) {
            // P道具永不过期，跳过时间检查
            if (type === 'P') continue;
            
            if (this.powerUps[type].active && this.powerUps[type].endTime > 0) {
                if (now >= this.powerUps[type].endTime) {
                    this.powerUps[type].active = false;
                }
            }
        }
        
        // 更新P升级提示计时器
        if (this.pUpgradeNotification) {
            this.pUpgradeNotification.timer--;
            if (this.pUpgradeNotification.timer <= 0) {
                this.pUpgradeNotification = null;
            }
        }
        
        // 更新经验升级提示计时器
        if (this.expUpgradeNotification) {
            this.expUpgradeNotification.timer--;
            if (this.expUpgradeNotification.timer <= 0) {
                this.expUpgradeNotification = null;
            }
        }
        
        // 检查低血量P等级提升机制（血量低于30%时临时提升到P满级）
        const healthPercent = this.health / this.maxHealth;
        if (healthPercent < 0.3 && !this.lowHealthPBoost) {
            // 进入低血量状态，提升P等级到满级
            if (this.powerUps.P.level < 6) {
                this.savedPLevel = this.powerUps.P.level; // 保存当前等级
                this.powerUps.P.level = 6; // 临时提升到满级
                this.powerUps.P.active = true;
                this.lowHealthPBoost = true; // 标记已激活低血量提升
            }
        } else if (healthPercent >= 0.3 && this.lowHealthPBoost) {
            // 回血超过30%，恢复到原始等级
            this.powerUps.P.level = this.savedPLevel;
            if (this.savedPLevel === 0) {
                this.powerUps.P.active = false;
            }
            this.lowHealthPBoost = false; // 取消低血量提升状态
        }
        
        // 更新爆炸效果
        this.explosions = this.explosions.filter(exp => {
            exp.update();
            return exp.active;
        });
    }
}
