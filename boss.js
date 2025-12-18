// Boss类 - 超大型轰炸机
class Boss {
    constructor(canvas, difficulty = 1) {
        this.width = 180;
        this.height = 150;
        this.x = canvas.width / 2 - this.width / 2;
        this.y = -this.height;
        this.speed = 0.5;
        this.canvasWidth = canvas.width;
        this.canvasHeight = canvas.height;
        // Boss强度至少为P3（难度3）
        this.difficulty = Math.max(3, difficulty);
        
        // Boss属性 - 血量随难度大幅提升
        this.maxHealth = 150 + this.difficulty * 80; // 更厚的血量
        this.health = this.maxHealth;
        this.score = 5000 * this.difficulty;
        this.active = true;
        this.defeated = false;
        
        // 移动模式
        this.movePattern = 'entry'; // entry, hover, strafe, charge
        this.moveTimer = 0;
        this.targetY = 80;
        this.moveDirection = 1;
        
        // 冲撞系统（血量<50%激活）
        this.chargeAttack = {
            active: false,
            charging: false, // 蓄力阶段
            returning: false, // 返回阶段
            chargeTime: 0,
            maxChargeTime: 60, // 1秒蓄力
            targetX: 0,
            targetY: 0,
            initialX: 0, // 记录冲撞前位置
            initialY: 0,
            speed: 0,
            maxSpeed: 12, // 冲撞速度
            returnSpeed: 4, // 返回速度
            cooldown: 0,
            maxCooldown: 300, // 5秒冷却
            damage: 0, // 动态计算（玩家最大血量的1/3）
            totalCharges: 0, // 本轮总冲撞次数
            currentCharge: 0, // 当前已完成冲撞次数
            waitTime: 0, // 返回后的等待时间
            waitDuration: 30 // 等待30帧后进行下次冲撞
        };
        
        // 攻击模式
        this.attackTimer = 0;
        this.attackCooldown = 45; // 0.75秒（更快）
        this.attackPhase = 0;
        this.bullets = [];
        
        // 击中闪烁效果
        this.hitFlash = 0; // 闪烁计时器
        this.hitFlashDuration = 10; // 闪烁持续帧数
        
        // 炮塔位置
        this.turrets = [
            { x: -60, y: 30, angle: 0 },
            { x: 60, y: 30, angle: 0 },
            { x: -45, y: 75, angle: 0 },
            { x: 45, y: 75, angle: 0 },
            { x: 0, y: 105, angle: 0 }
        ];
        
        // 引擎效果
        this.enginePulse = 0;
    }
    
    update(canvas, player) {
        this.moveTimer++;
        this.attackTimer++;
        this.enginePulse += 0.1;
        
        // 击中闪烁效果衰减
        if (this.hitFlash > 0) {
            this.hitFlash--;
        }
        
        // 检查是否可以发动冲撞（血量<50%）
        const healthPercent = this.health / this.maxHealth;
        if (healthPercent < 0.5 && !this.chargeAttack.active) {
            this.chargeAttack.cooldown++;
            if (this.chargeAttack.cooldown >= this.chargeAttack.maxCooldown) {
                this.initiateChargeAttack(player);
            }
        }
        
        // 冲撞攻击逻辑
        if (this.chargeAttack.active) {
            if (this.chargeAttack.charging) {
                // 蓄力阶段：震动效果
                this.chargeAttack.chargeTime++;
                this.x += (Math.random() - 0.5) * 6; // 震动幅度
                this.y += (Math.random() - 0.5) * 6;
                
                if (this.chargeAttack.chargeTime >= this.chargeAttack.maxChargeTime) {
                    // 蓄力完成，开始冲撞
                    this.chargeAttack.charging = false;
                    this.chargeAttack.chargeTime = 0;
                }
            } else if (this.chargeAttack.returning) {
                // 返回阶段：返回初始位置（只在所有冲撞结束后才返回）
                const dx = this.chargeAttack.initialX - this.x;
                const dy = this.chargeAttack.initialY - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > 5) {
                    this.x += (dx / distance) * this.chargeAttack.returnSpeed;
                    this.y += (dy / distance) * this.chargeAttack.returnSpeed;
                } else {
                    // 返回完成，结束冲撞模式
                    this.x = this.chargeAttack.initialX;
                    this.y = this.chargeAttack.initialY;
                    this.chargeAttack.active = false;
                    this.chargeAttack.returning = false;
                    this.chargeAttack.speed = 0;
                    this.chargeAttack.cooldown = 0;
                    this.chargeAttack.currentCharge = 0;
                    this.chargeAttack.totalCharges = 0;
                    this.movePattern = 'hover';
                    this.moveTimer = 0;
                }
            } else if (!this.chargeAttack.returning && this.chargeAttack.currentCharge < this.chargeAttack.totalCharges) {
                // 等待阶段或冲撞阶段
                if (this.chargeAttack.waitTime > 0 && this.chargeAttack.waitTime < this.chargeAttack.waitDuration) {
                    // 等待中：准备下次冲撞（不移动，在当前位置等待）
                    this.chargeAttack.waitTime++;
                } else if (this.chargeAttack.waitTime >= this.chargeAttack.waitDuration) {
                    // 等待结束，重新锁定玩家并开始蓄力
                    this.chargeAttack.charging = true;
                    this.chargeAttack.chargeTime = 0;
                    this.chargeAttack.targetX = player.x + player.width / 2;
                    this.chargeAttack.targetY = player.y + player.height / 2;
                    this.chargeAttack.waitTime = 0;
                } else {
                    // 冲撞阶段：高速移动
                    const dx = this.chargeAttack.targetX - (this.x + this.width / 2);
                    const dy = this.chargeAttack.targetY - (this.y + this.height / 2);
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance > 10) {
                        this.x += (dx / distance) * this.chargeAttack.speed;
                        this.y += (dy / distance) * this.chargeAttack.speed;
                        this.chargeAttack.speed = Math.min(this.chargeAttack.maxSpeed, this.chargeAttack.speed + 0.5);
                    } else {
                        // 单次冲撞完成
                        this.chargeAttack.speed = 0;
                        this.chargeAttack.currentCharge++;
                        
                        // 检查是否还有剩余冲撞次数
                        if (this.chargeAttack.currentCharge < this.chargeAttack.totalCharges) {
                            // 还有冲撞次数，在当前位置短暂等待后继续
                            this.chargeAttack.waitTime = 1;
                        } else {
                            // 所有冲撞完成，开始返回初始位置
                            this.chargeAttack.returning = true;
                        }
                    }
                }
            }
        } else {
            // 正常移动逻辑
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
        
        // 攻击逻辑（冲撞时不攻击）
        if (!this.chargeAttack.active && this.attackTimer >= this.attackCooldown) {
            this.attack(player);
            this.attackTimer = 0;
        }
        
        // 更新子弹
        this.bullets = this.bullets.filter(bullet => {
            bullet.update();
            return bullet.active && bullet.y < canvas.height + 50 && bullet.y > -50;
        });
    }
    
    initiateChargeAttack(player) {
        if (!player) return;
        
        // 记录当前位置（冲撞前位置）
        this.chargeAttack.initialX = this.x;
        this.chargeAttack.initialY = this.y;
        
        // 随机决定冲撞次数：2-4次
        this.chargeAttack.totalCharges = 2 + Math.floor(Math.random() * 3); // 2, 3, 或 4次
        this.chargeAttack.currentCharge = 0;
        
        this.chargeAttack.active = true;
        this.chargeAttack.charging = true;
        this.chargeAttack.returning = false;
        this.chargeAttack.chargeTime = 0;
        this.chargeAttack.waitTime = 0;
        this.chargeAttack.targetX = player.x + player.width / 2;
        this.chargeAttack.targetY = player.y + player.height / 2;
        this.chargeAttack.speed = 2;
        // 伤害为玩家最大血量的1/3
        this.chargeAttack.damage = Math.floor(player.maxHealth / 3);
        
        // 不在控制台输出次数，保持神秘感
    }
    
    attack(player) {
        if (!player) return;
        
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        
        // 随机选择弹药类型：S(散弹)/L(激光)/B(爆炸)/C(追踪火箭)
        const weaponTypes = ['S', 'L', 'B', 'C'];
        const weaponType = weaponTypes[Math.floor(Math.random() * weaponTypes.length)];
        
        // 强度随难度提升
        const difficultyBonus = this.difficulty * 0.15; // 难度加成
        
        switch(weaponType) {
            case 'S':
                // 散弹模式 - 多发散射（Boss版本：深红色）
                const bulletCount = Math.min(7, 3 + Math.floor(this.difficulty / 2));
                const spreadAngle = Math.PI / 2; // 90度扇形
                
                for (let i = 0; i < bulletCount; i++) {
                    const angle = Math.PI / 2 - spreadAngle / 2 + (spreadAngle / (bulletCount - 1)) * i;
                    const bullet = new Bullet(centerX, this.y + this.height, 6 + difficultyBonus, false, this.canvasHeight);
                    bullet.speedX = Math.cos(angle) * (6 + difficultyBonus);
                    bullet.speedY = Math.sin(angle) * (6 + difficultyBonus);
                    bullet.damage = 1 + difficultyBonus;
                    bullet.size = 6;
                    bullet.isBossWeapon = true;
                    bullet.bossWeaponType = 'S';
                    this.bullets.push(bullet);
                }
                break;
                
            case 'L':
                // 激光模式 - 快速直线（Boss版本：暗青色）
                const laserCount = 1 + Math.floor(this.difficulty / 3);
                for (let i = 0; i < laserCount; i++) {
                    const targetX = player.x + player.width / 2 + (Math.random() - 0.5) * 100;
                    const targetY = player.y + player.height / 2;
                    const dx = targetX - centerX;
                    const dy = targetY - centerY;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    const laser = new Bullet(centerX, centerY, 10 + difficultyBonus, false, this.canvasHeight);
                    laser.speedX = (dx / distance) * (10 + difficultyBonus);
                    laser.speedY = (dy / distance) * (10 + difficultyBonus);
                    laser.damage = 2 + difficultyBonus;
                    laser.size = 8;
                    laser.isLaser = true;
                    laser.isBossWeapon = true;
                    laser.bossWeaponType = 'L';
                    this.bullets.push(laser);
                }
                break;
                
            case 'B':
                // 爆炸弹模式 - 爆炸子弹（Boss版本：暗橙色）
                const bombCount = 1 + Math.floor(this.difficulty / 4);
                for (let i = 0; i < bombCount; i++) {
                    const offsetX = (i - bombCount / 2) * 30;
                    const bomb = new Bullet(centerX + offsetX, this.y + this.height, 5 + difficultyBonus * 0.5, false, this.canvasHeight);
                    bomb.speedX = 0;
                    bomb.speedY = 5 + difficultyBonus * 0.5;
                    bomb.damage = 1 + difficultyBonus * 0.5;
                    bomb.size = 10;
                    bomb.isBomb = true;
                    bomb.bombRadius = 120 + this.difficulty * 5;
                    bomb.bombDamage = 2 + difficultyBonus;
                    bomb.isBossWeapon = true;
                    bomb.bossWeaponType = 'B';
                    this.bullets.push(bomb);
                }
                break;
                
            case 'C':
                // 追踪火箭模式 - 追踪导弹（Boss版本：深紫色）
                const missileCount = 1 + Math.floor(this.difficulty / 3);
                for (let i = 0; i < missileCount; i++) {
                    const offsetX = (i - missileCount / 2) * 40;
                    const missile = new Bullet(centerX + offsetX, this.y + this.height, 7 + difficultyBonus, false, this.canvasHeight);
                    
                    // 初始朝向玩家
                    const dx = (player.x + player.width / 2) - (centerX + offsetX);
                    const dy = (player.y + player.height / 2) - (this.y + this.height);
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    missile.speedX = (dx / distance) * (7 + difficultyBonus);
                    missile.speedY = (dy / distance) * (7 + difficultyBonus);
                    missile.damage = 1.5 + difficultyBonus;
                    missile.size = 9;
                    missile.isHoming = true;
                    missile.homingStrength = 0.08 + this.difficulty * 0.005;
                    missile.isMissile = true;
                    missile.isBossWeapon = true;
                    missile.bossWeaponType = 'C';
                    missile.target = player; // 设置追踪目标
                    this.bullets.push(missile);
                }
                break;
        }
        
        this.attackPhase++;
    }
    
    
    hit(damage = 1) {
        this.health -= damage;
        // 触发击中闪烁效果
        this.hitFlash = this.hitFlashDuration;
        return this.health <= 0;
    }
    
    draw(ctx) {
        ctx.save();
        
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        
        // 计算冲撞蓄力的颜色混合值
        let chargeIntensity = 0;
        if (this.chargeAttack.active) {
            if (this.chargeAttack.charging) {
                // 蓄力阶段：闪烁警告（不显示次数，增加恐惧感）
                chargeIntensity = Math.sin(this.chargeAttack.chargeTime * 0.3) * 0.5 + 0.5;
                
                // 警告文字不显示次数
                ctx.fillStyle = `rgba(255, 255, 0, ${chargeIntensity})`;
                ctx.font = 'bold 28px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('⚠️ CHARGE ATTACK ⚠️', centerX, this.y - 60);
            } else if (this.chargeAttack.returning) {
                // 返回阶段：减弱的红色效果
                chargeIntensity = 0.3;
            } else {
                // 冲撞阶段：强烈红色
                chargeIntensity = 0.8;
            }
        }
        
        // 计算击中闪烁的颜色混合值
        const hitFlashIntensity = this.hitFlash > 0 ? this.hitFlash / this.hitFlashDuration : 0;
        
        // 辅助函数：将颜色变亮（混合白色）
        const lightenColor = (color, intensity) => {
            // 将十六进制颜色转换为RGB，然后混合白色
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            
            const newR = Math.min(255, Math.floor(r + (255 - r) * intensity));
            const newG = Math.min(255, Math.floor(g + (255 - g) * intensity));
            const newB = Math.min(255, Math.floor(b + (255 - b) * intensity));
            
            return `rgb(${newR}, ${newG}, ${newB})`;
        };
        
        // 辅助函数：将颜色混合红色（冲撞效果）
        const reddenColor = (color, intensity) => {
            // 将十六进制颜色转换为RGB，然后增加红色分量
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            
            const newR = Math.min(255, Math.floor(r + (255 - r) * intensity * 0.8));
            const newG = Math.max(0, Math.floor(g * (1 - intensity * 0.5)));
            const newB = Math.max(0, Math.floor(b * (1 - intensity * 0.5)));
            
            return `rgb(${newR}, ${newG}, ${newB})`;
        };
        
        // Boss主体 - 超大型轰炸机（应用击中闪烁和冲撞效果）
        let baseColor1 = '#2A2A2A';
        let baseColor2 = '#4A4A4A';
        
        // 优先应用击中闪烁效果
        if (hitFlashIntensity > 0) {
            baseColor1 = lightenColor(baseColor1, hitFlashIntensity * 0.8);
            baseColor2 = lightenColor(baseColor2, hitFlashIntensity * 0.8);
        }
        // 如果在蓄力冲撞，应用红色效果
        else if (chargeIntensity > 0) {
            baseColor1 = reddenColor(baseColor1, chargeIntensity * 0.7);
            baseColor2 = reddenColor(baseColor2, chargeIntensity * 0.7);
        }
        
        const bodyGradient = ctx.createLinearGradient(this.x, centerY, this.x + this.width, centerY);
        bodyGradient.addColorStop(0, baseColor1);
        bodyGradient.addColorStop(0.5, baseColor2);
        bodyGradient.addColorStop(1, baseColor1);
        ctx.fillStyle = bodyGradient;
        
        let strokeColor = '#000';
        if (hitFlashIntensity > 0) {
            strokeColor = lightenColor('#000000', hitFlashIntensity * 0.6);
        } else if (chargeIntensity > 0) {
            strokeColor = reddenColor('#000000', chargeIntensity * 0.5);
        }
        ctx.strokeStyle = strokeColor;
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
        
        // 巨大机翼（应用击中闪烁和冲撞效果）
        let wingColor1 = '#3A3A3A';
        let wingColor2 = '#5A5A5A';
        
        if (hitFlashIntensity > 0) {
            wingColor1 = lightenColor(wingColor1, hitFlashIntensity * 0.8);
            wingColor2 = lightenColor(wingColor2, hitFlashIntensity * 0.8);
        } else if (chargeIntensity > 0) {
            wingColor1 = reddenColor(wingColor1, chargeIntensity * 0.7);
            wingColor2 = reddenColor(wingColor2, chargeIntensity * 0.7);
        }
        
        const wingGradient = ctx.createLinearGradient(this.x, centerY, this.x + this.width, centerY);
        wingGradient.addColorStop(0, wingColor1);
        wingGradient.addColorStop(0.5, wingColor2);
        wingGradient.addColorStop(1, wingColor1);
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
            
            // 炮塔基座 (6*1.5=9)（应用击中闪烁和冲撞效果）
            let turretColor = '#555555';
            let turretStroke = '#000000';
            
            if (hitFlashIntensity > 0) {
                turretColor = lightenColor(turretColor, hitFlashIntensity * 0.7);
                turretStroke = lightenColor(turretStroke, hitFlashIntensity * 0.5);
            } else if (chargeIntensity > 0) {
                turretColor = reddenColor(turretColor, chargeIntensity * 0.6);
                turretStroke = reddenColor(turretStroke, chargeIntensity * 0.4);
            }
            
            ctx.fillStyle = turretColor;
            ctx.beginPath();
            ctx.arc(0, 0, 9, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = turretStroke;
            ctx.lineWidth = 1.5;
            ctx.stroke();
            
            // 炮管 (12*1.5=18, 4*1.5=6, 2*1.5=3)（应用击中闪烁和冲撞效果）
            let barrelColor = '#333333';
            if (hitFlashIntensity > 0) {
                barrelColor = lightenColor(barrelColor, hitFlashIntensity * 0.7);
            } else if (chargeIntensity > 0) {
                barrelColor = reddenColor(barrelColor, chargeIntensity * 0.6);
            }
            
            ctx.fillStyle = barrelColor;
            ctx.fillRect(0, -3, 18, 6);
            ctx.strokeRect(0, -3, 18, 6);
            
            // 炮口 (2*1.5=3)（应用击中闪烁和冲撞效果）
            let muzzleColor = '#FF6B6B';
            if (hitFlashIntensity > 0) {
                muzzleColor = lightenColor(muzzleColor, hitFlashIntensity * 0.5);
            } else if (chargeIntensity > 0) {
                muzzleColor = reddenColor(muzzleColor, chargeIntensity * 0.8);
            }
            
            ctx.fillStyle = muzzleColor;
            ctx.beginPath();
            ctx.arc(18, 0, 3, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
        });
        
        // 引擎发光效果（应用击中闪烁和冲撞效果）
        const engineGlow = Math.sin(this.enginePulse) * 0.3 + 0.7;
        let engineBoost = 1;
        
        if (hitFlashIntensity > 0) {
            engineBoost = 1 + hitFlashIntensity * 0.5; // 被击中时引擎更亮
        } else if (chargeIntensity > 0) {
            engineBoost = 1 + chargeIntensity * 1.2; // 冲撞蓄力时引擎大幅增强
        }
        
        // 左引擎 (15*1.5=22.5, 10*1.5=15, 8*1.5=12)
        const leftEngineGradient = ctx.createRadialGradient(this.x + 22.5, this.y + 15, 0, this.x + 22.5, this.y + 15, 12);
        leftEngineGradient.addColorStop(0, `rgba(255, 100, 50, ${Math.min(1, engineGlow * engineBoost)})`);
        leftEngineGradient.addColorStop(0.5, `rgba(255, 150, 100, ${Math.min(1, engineGlow * 0.6 * engineBoost)})`);
        leftEngineGradient.addColorStop(1, 'rgba(100, 50, 0, 0)');
        ctx.fillStyle = leftEngineGradient;
        ctx.beginPath();
        ctx.arc(this.x + 22.5, this.y + 15, 12, 0, Math.PI * 2);
        ctx.fill();
        
        // 右引擎 (15*1.5=22.5, 10*1.5=15, 8*1.5=12)
        const rightEngineGradient = ctx.createRadialGradient(this.x + this.width - 22.5, this.y + 15, 0, this.x + this.width - 22.5, this.y + 15, 12);
        rightEngineGradient.addColorStop(0, `rgba(255, 100, 50, ${Math.min(1, engineGlow * engineBoost)})`);
        rightEngineGradient.addColorStop(0.5, `rgba(255, 150, 100, ${Math.min(1, engineGlow * 0.6 * engineBoost)})`);
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
