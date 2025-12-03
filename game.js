// 游戏主控制器
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // 设置画布大小 - 移动端适配
        this.setCanvasSize();
        window.addEventListener('resize', () => this.setCanvasSize());
        
        // 检测移动设备
        this.detectMobileDevice();
        
        // 音效管理器
        this.audioManager = new AudioManager();
        
        // 游戏状态
        this.gameState = 'start'; // 'start', 'playing', 'gameOver'
        this.score = 0;
        this.kills = 0;
        
        // 游戏对象
        this.player = new Player(this.canvas);
        this.enemies = [];
        this.enemyBullets = []; // 独立的敌机子弹数组
        this.particles = [];
        this.powerUps = []; // 道具数组
        
        // 清屏技能
        this.lightningSkill = {
            available: true,
            cooldown: 0,
            maxCooldown: 300, // 5秒冷却（60fps * 5）
            lightningFlash: 0,
            lightningBolts: []
        };
        
        // 敌机生成
        this.enemySpawnTimer = 0;
        this.enemySpawnRate = 100; // 初始生成间隔（帧数）
        this.difficulty = 1;
        this.difficultyTimer = 0; // 难度计时器
        this.difficultyIncreaseInterval = 600; // 每10秒增加难度（60fps * 10）
        this.maxDifficulty = 20; // 最大难度等级
        
        // 背景
        this.clouds = [];
        this.initClouds();
        
        // UI元素
        this.scoreElement = document.getElementById('score');
        this.killsElement = document.getElementById('kills');
        this.difficultyElement = document.getElementById('difficulty');
        this.startScreen = document.getElementById('startScreen');
        this.gameOverScreen = document.getElementById('gameOver');
        this.startBtn = document.getElementById('startBtn');
        this.restartBtn = document.getElementById('restartBtn');
        
        // 摇一摇检测
        this.shakeDetection = {
            lastX: 0,
            lastY: 0,
            lastZ: 0,
            shakeThreshold: 15, // 摇动阈值
            lastShakeTime: 0,
            shakeCooldown: 1000 // 1秒冷却时间，防止误触
        };
        
        this.setupEventListeners();
        this.setupShakeDetection();
    }

    setCanvasSize() {
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight * 0.85;
        } else {
            this.canvas.width = 800;
            this.canvas.height = 600;
        }
    }

    detectMobileDevice() {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
                        || window.innerWidth <= 768;
        
        const desktopControls = document.querySelectorAll('.desktop-controls');
        const mobileControls = document.querySelectorAll('.mobile-controls');
        
        if (isMobile) {
            desktopControls.forEach(el => el.style.display = 'none');
            mobileControls.forEach(el => el.style.display = 'block');
        } else {
            desktopControls.forEach(el => el.style.display = 'block');
            mobileControls.forEach(el => el.style.display = 'none');
        }
    }
    
    // 设置摇一摇检测
    setupShakeDetection() {
        if (window.DeviceMotionEvent) {
            window.addEventListener('devicemotion', (event) => {
                if (this.gameState !== 'playing') return;
                
                const acceleration = event.accelerationIncludingGravity;
                if (!acceleration) return;
                
                const currentX = acceleration.x || 0;
                const currentY = acceleration.y || 0;
                const currentZ = acceleration.z || 0;
                
                // 计算加速度变化
                const deltaX = Math.abs(currentX - this.shakeDetection.lastX);
                const deltaY = Math.abs(currentY - this.shakeDetection.lastY);
                const deltaZ = Math.abs(currentZ - this.shakeDetection.lastZ);
                
                // 检测是否超过阈值
                if ((deltaX > this.shakeDetection.shakeThreshold || 
                     deltaY > this.shakeDetection.shakeThreshold || 
                     deltaZ > this.shakeDetection.shakeThreshold)) {
                    
                    const now = Date.now();
                    if (now - this.shakeDetection.lastShakeTime > this.shakeDetection.shakeCooldown) {
                        this.shakeDetection.lastShakeTime = now;
                        this.activateLightningSkill();
                    }
                }
                
                // 更新上次的值
                this.shakeDetection.lastX = currentX;
                this.shakeDetection.lastY = currentY;
                this.shakeDetection.lastZ = currentZ;
            });
        }
    }

    setupEventListeners() {
        this.startBtn.addEventListener('click', () => this.startGame());
        this.restartBtn.addEventListener('click', () => this.restartGame());
        
        // 静音快捷键 + 清屏技能
        document.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'm') {
                const muted = this.audioManager.toggleMute();
                console.log(muted ? '已静音' : '已取消静音');
            }
            
            // K键 - 清屏技能
            if (e.key.toLowerCase() === 'k' && this.gameState === 'playing') {
                this.activateLightningSkill();
            }
        });
    }

    initClouds() {
        for (let i = 0; i < 5; i++) {
            this.clouds.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                width: Math.random() * 60 + 40,
                height: Math.random() * 30 + 20,
                speed: Math.random() * 0.3 + 0.1
            });
        }
    }

    startGame() {
        this.gameState = 'playing';
        this.startScreen.classList.add('hidden');
        this.score = 0;
        this.kills = 0;
        this.enemies = [];
        this.enemyBullets = [];
        this.particles = [];
        this.player.reset(this.canvas);
        this.difficulty = 1;
        this.difficultyTimer = 0; // 重置难度计时器
        this.enemySpawnTimer = 0; // 重置敌机生成计时器
        
        // 重置技能冷却
        this.lightningSkill.available = true;
        this.lightningSkill.cooldown = 0;
        this.lightningSkill.lightningFlash = 0;
        this.lightningSkill.lightningBolts = [];
        
        // 确保移动端按钮在游戏中显示
        this.detectMobileDevice();
        
        this.updateUI();
        
        // 先停止之前的背景音乐，避免重叠
        this.audioManager.stopBackgroundMusic();
        
        // 开始播放背景音乐
        this.audioManager.unlockAudio();
        this.audioManager.playBackgroundMusic();
        
        this.gameLoop();
    }

    restartGame() {
        this.gameOverScreen.classList.add('hidden');
        this.startGame();
    }

    gameLoop() {
        if (this.gameState !== 'playing') return;

        this.update();
        this.draw();
        
        requestAnimationFrame(() => this.gameLoop());
    }

    update() {
        // 更新背景云
        this.clouds.forEach(cloud => {
            cloud.y += cloud.speed;
            if (cloud.y > this.canvas.height) {
                cloud.y = -cloud.height;
                cloud.x = Math.random() * this.canvas.width;
            }
        });

        // 更新玩家（传入敌人列表用于追踪弹）
        this.player.update(this.canvas, this.audioManager, this.enemies);

        // 难度系统 - 每10秒自动提升难度
        this.difficultyTimer++;
        if (this.difficultyTimer >= this.difficultyIncreaseInterval) {
            if (this.difficulty < this.maxDifficulty) {
                this.difficulty++;
                
                this.updateUI();
            }
            this.difficultyTimer = 0;
        }

        // 生成敌机 - 根据难度动态调整
        this.enemySpawnTimer++;
        // 生成间隔：难度越高，间隔越短（从100降到20帧）
        const spawnRate = Math.max(20, this.enemySpawnRate - this.difficulty * 4);
        
        // 难度越高，可能同时生成多架敌机
        let simultaneousSpawns = Math.min(5, Math.floor(this.difficulty / 3) + 1);
        // 难度5之前，敌机数量增加2倍
        if (this.difficulty < 5) {
            simultaneousSpawns = Math.min(10, simultaneousSpawns * 2);
        }
        
        if (this.enemySpawnTimer >= spawnRate) {
            // 根据难度生成敌机
            for (let i = 0; i < simultaneousSpawns; i++) {
                // 确保敌机不重叠，传入当前难度
                const newEnemy = new Enemy(this.canvas, null, this.difficulty);
                newEnemy.x += i * 80; // 横向偏移避免重叠
                
                // 难度超过7时，有30%概率从底部出现阻击玩家
                if (this.difficulty > 7 && Math.random() < 0.3) {
                    newEnemy.y = this.canvas.height; // 从底部出现
                    newEnemy.speed = -Math.abs(newEnemy.speed); // 向上移动（负速度）
                    newEnemy.isBottomSpawned = true; // 标记为底部生成的敌机
                }
                
                this.enemies.push(newEnemy);
            }
            this.enemySpawnTimer = 0;
        }

        // 更新敌机
        this.enemies.forEach(enemy => {
            enemy.update(this.canvas);
            
            // 将敌机子弹转移到独立数组
            if (enemy.bullets.length > 0) {
                this.enemyBullets.push(...enemy.bullets);
                enemy.bullets = [];
            }
        });
        
        // 更新敌机子弹
        this.enemyBullets = this.enemyBullets.filter(bullet => {
            bullet.update();
            return bullet.active;
        });
        
        // 更新道具
        this.powerUps = this.powerUps.filter(powerUp => {
            powerUp.update();
            
            // 检测玩家拾取道具
            if (powerUp.checkCollision(this.player)) {
                this.player.activatePowerUp(powerUp.type, this.difficulty); // 传入当前难度
                this.audioManager.playPowerUp(); // 播放道具音效
                return false; // 移除道具
            }
            
            return powerUp.active;
        });
        
        // 更新玩家道具效果
        this.player.updatePowerUps();
        
        // 更新爆炸范围伤害
        this.player.explosions.forEach(explosion => {
            this.enemies.forEach(enemy => {
                if (explosion.checkEnemyInRange(enemy)) {
                    // 应用爆炸伤害倍数
                    const explosionDamage = explosion.damage || 1;
                    for (let i = 0; i < explosionDamage; i++) {
                        if (enemy.hit()) {
                            this.score += enemy.score;
                            this.kills++;
                            
                            // 增加经验值（击杀敌机）- 随难度递减以平衡游戏
                            // 难度1: 10, 难度5: 8, 难度10: 6, 难度15: 4, 难度20+: 3
                            const expIncrease = Math.max(3, 10 - Math.floor(this.difficulty / 3));
                            this.player.addExp(expIncrease);
                            
                            // 增加P槽值（击杀敌机）- 随难度递减，但速度比经验慢
                            // 难度1: 10, 难度10: 8, 难度20: 6, 难度30+: 5
                            const pGaugeIncrease = Math.max(5, 10 - Math.floor(this.difficulty / 5));
                            this.player.addPGauge(pGaugeIncrease);
                            
                            enemy.health = 0;
                            this.createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#FFA500');
                            break;
                        }
                    }
                }
            });
        });

        // 碰撞检测 - 玩家子弹击中敌机
        this.player.bullets.forEach(bullet => {
            if (!bullet.active) return;
            
            this.enemies.forEach(enemy => {
                if (this.checkCollision(bullet, enemy)) {
                    // 如果是爆炸弹，无论击杀与否都产生爆炸
                    const shouldExplode = bullet.isBomb;
                    
                    // 根据子弹伤害计算击杀
                    const damage = bullet.damage || 1;
                    
                    // 普通子弹失效，蓄力子弹可穿透
                    if (!bullet.penetrating) {
                        bullet.active = false;
                    }
                    
                    // 对敌机造成伤害
                    let enemyDestroyed = false;
                    for (let i = 0; i < damage; i++) {
                        if (enemy.hit()) {
                            // 敌机被摧毁
                            this.score += enemy.score;
                            this.kills++;
                            this.createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#FF6600');
                            
                            // 增加经验值（击杀敌机）- 随难度递减以平衡游戏
                            // 难度1: 10, 难度5: 8, 难度10: 6, 难度15: 4, 难度20+: 3
                            const expIncrease = Math.max(3, 10 - Math.floor(this.difficulty / 3));
                            this.player.addExp(expIncrease);
                            
                            // 增加P槽值（击杀敌机）- 随难度递减，但速度比经验慢
                            // 难度1: 10, 难度10: 8, 难度20: 6, 难度30+: 5
                            const pGaugeIncrease = Math.max(5, 10 - Math.floor(this.difficulty / 5));
                            this.player.addPGauge(pGaugeIncrease);
                            
                            // 随机生成道具（30%概率）
                            if (Math.random() < 0.3) {
                                this.powerUps.push(new PowerUp(
                                    enemy.x + enemy.width / 2 - 15,
                                    enemy.y + enemy.height / 2 - 15
                                ));
                            }
                            
                            enemy.health = 0; // 标记为销毁
                            this.audioManager.playExplosion(); // 播放爆炸音效
                            enemyDestroyed = true;
                            break;
                        }
                    }
                    
                    // 爆炸弹：每次击中都产生范围伤害爆炸
                    if (shouldExplode) {
                        const explosion = new Explosion(
                            enemy.x + enemy.width / 2, 
                            enemy.y + enemy.height / 2, 
                            bullet.bombRadius || 80,
                            bullet.bombDamage || 1
                        );
                        this.player.explosions.push(explosion);
                        
                        if (!enemyDestroyed) {
                            // 击中但未摧毁也播放爆炸音效
                            this.audioManager.playExplosion();
                        }
                    }
                    
                    if (enemy.health > 0 && !shouldExplode) {
                        // 击中但未摧毁（非爆炸弹）
                        this.createHitEffect(bullet.x, bullet.y);
                        this.audioManager.playHit(); // 播放击中音效
                    }
                }
            });
        });

        // 移除被摧毁的敌机
        this.enemies = this.enemies.filter(enemy => {
            if (enemy.health <= 0) return false;
            if (enemy.isOffScreen(this.canvas)) return false;
            return true;
        });

        // 碰撞检测 - 敌机子弹击中玩家或蓄力护盾
        this.enemyBullets.forEach(bullet => {
            if (!bullet.active) return;
            
            // 检查是否被蓄力护盾拦截
            if (this.player.chargeShield) {
                const shield = this.player.chargeShield;
                const dx = bullet.x - shield.x;
                const dy = bullet.y - shield.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < shield.radius) {
                    // 子弹被护盾拦截
                    bullet.active = false;
                    // 创建小爆炸效果
                    this.createExplosion(bullet.x, bullet.y, '#00BFFF', 0.3);
                    return;
                }
            }
            
            // 检查是否击中玩家
            if (this.checkCollision(bullet, this.player)) {
                bullet.active = false;
                if (this.player.hit()) {
                    this.createExplosion(this.player.x + this.player.width / 2, 
                                       this.player.y + this.player.height / 2, '#4A90E2');
                    this.audioManager.playPlayerHit(); // 播放玩家受伤音效
                    this.updateUI();
                    
                    if (this.player.health <= 0) {
                        this.gameOver();
                    }
                }
            }
        });

        // 碰撞检测 - 玩家与敌机
        this.enemies.forEach(enemy => {
            if (this.checkCollision(this.player, enemy)) {
                if (this.player.hit(30)) { // 撞击伤害更高
                    this.createExplosion(this.player.x + this.player.width / 2, 
                                       this.player.y + this.player.height / 2, '#4A90E2');
                    this.audioManager.playPlayerHit(); // 播放玩家受伤音效
                    this.updateUI();
                    
                    if (this.player.health <= 0) {
                        this.gameOver();
                    }
                }
                // 敌机也被摧毁
                this.createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#FF6600');
                this.audioManager.playExplosion(); // 播放爆炸音效
                enemy.health = 0;
            }
        });

        // 更新粒子
        this.particles = this.particles.filter(particle => {
            particle.update();
            return !particle.isDead();
        });

        // 更新UI
        this.updateUI();
    }

    draw() {
        // 清空画布 - 天空背景
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(1, '#E0F6FF');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 绘制云朵
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        this.clouds.forEach(cloud => {
            this.ctx.beginPath();
            this.ctx.arc(cloud.x, cloud.y, cloud.width / 3, 0, Math.PI * 2);
            this.ctx.arc(cloud.x + cloud.width / 3, cloud.y - cloud.height / 4, cloud.width / 2.5, 0, Math.PI * 2);
            this.ctx.arc(cloud.x + cloud.width / 1.5, cloud.y, cloud.width / 3.5, 0, Math.PI * 2);
            this.ctx.fill();
        });

        // 绘制游戏对象
        this.enemies.forEach(enemy => enemy.draw(this.ctx));
        this.enemyBullets.forEach(bullet => bullet.draw(this.ctx)); // 绘制敌机子弹
        
        this.powerUps.forEach(powerUp => powerUp.draw(this.ctx)); // 绘制道具
        this.player.draw(this.ctx);
        this.player.explosions.forEach(exp => exp.draw(this.ctx)); // 绘制爆炸范围
        this.particles.forEach(particle => particle.draw(this.ctx));
        
        // 绘制P槽UI
        this.drawPGauge();
        
        // 绘制经验槽UI
        this.drawExpGauge();
        
        // 绘制HP槽UI
        this.drawHPGauge();
        
        // 绘制闪电效果
        this.drawLightning();
    }

    // 激活闪电清屏技能
    activateLightningSkill() {
        if (!this.lightningSkill.available || this.lightningSkill.cooldown > 0) {
            console.log(`技能冷却中... 还需 ${Math.ceil(this.lightningSkill.cooldown / 60)} 秒`);
            return;
        }
        
        // 播放闪电音效
        this.audioManager.playLightning();
        
        // 生成闪电效果
        this.lightningSkill.lightningFlash = 20; // 闪光持续帧数
        this.lightningSkill.lightningBolts = [];
        
        // 为每个敌机创建闪电
        this.enemies.forEach(enemy => {
            const bolt = this.createLightningBolt(
                this.canvas.width / 2,
                0,
                enemy.x + enemy.width / 2,
                enemy.y + enemy.height / 2
            );
            this.lightningSkill.lightningBolts.push(bolt);
            
            // 创建爆炸效果
            this.createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#FFD700');
            
            // 增加分数和击杀
            this.score += enemy.score * 2; // 技能击杀双倍分数
            this.kills++;
        });
        
        // 清除所有敌机
        this.enemies = [];
        
        // 清除所有敌机子弹
        this.enemyBullets = [];
        
        // 开始冷却
        this.lightningSkill.cooldown = this.lightningSkill.maxCooldown;
        this.lightningSkill.available = false;
        
        this.updateUI();
    }
    
    // 创建闪电路径
    createLightningBolt(x1, y1, x2, y2) {
        const points = [{x: x1, y: y1}];
        const segments = 8;
        const jitter = 30;
        
        for (let i = 1; i < segments; i++) {
            const t = i / segments;
            const x = x1 + (x2 - x1) * t + (Math.random() - 0.5) * jitter;
            const y = y1 + (y2 - y1) * t + (Math.random() - 0.5) * jitter;
            points.push({x, y});
        }
        
        points.push({x: x2, y: y2});
        return points;
    }
    
    // 绘制闪电
    drawLightning() {
        if (this.lightningSkill.lightningFlash > 0) {
            // 屏幕闪光效果
            this.ctx.save();
            const alpha = this.lightningSkill.lightningFlash / 20;
            this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.3})`;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.restore();
            
            // 绘制闪电
            this.ctx.save();
            this.ctx.strokeStyle = '#00FFFF';
            this.ctx.lineWidth = 3;
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = '#00FFFF';
            
            this.lightningSkill.lightningBolts.forEach(bolt => {
                this.ctx.beginPath();
                this.ctx.moveTo(bolt[0].x, bolt[0].y);
                
                for (let i = 1; i < bolt.length; i++) {
                    this.ctx.lineTo(bolt[i].x, bolt[i].y);
                }
                
                this.ctx.stroke();
                
                // 分支闪电
                if (Math.random() > 0.7 && bolt.length > 3) {
                    const branchIndex = Math.floor(Math.random() * (bolt.length - 2)) + 1;
                    const branchPoint = bolt[branchIndex];
                    this.ctx.beginPath();
                    this.ctx.moveTo(branchPoint.x, branchPoint.y);
                    this.ctx.lineTo(
                        branchPoint.x + (Math.random() - 0.5) * 50,
                        branchPoint.y + (Math.random() - 0.5) * 50
                    );
                    this.ctx.stroke();
                }
            });
            
            this.ctx.restore();
            
            this.lightningSkill.lightningFlash--;
            
            // 清空闪电数组当效果结束时
            if (this.lightningSkill.lightningFlash === 0) {
                this.lightningSkill.lightningBolts = [];
            }
        }
        
        // 更新技能冷却
        if (this.lightningSkill.cooldown > 0) {
            this.lightningSkill.cooldown--;
            if (this.lightningSkill.cooldown === 0) {
                this.lightningSkill.available = true;
            }
        }
    }
    
    // 绘制P槽UI
    drawPGauge() {
        const x = this.canvas.width - 25; // 屏幕右侧
        const y = 60; // 从顶部60px开始
        const width = 10; // 竖条宽度（减半）
        const height = 150; // 竖条高度
        const radius = 5; // 圆角半径（减半）
        
        // 满级时显示满槽，否则显示实际进度
        const progress = this.player.powerUps.P.level >= 6 ? 1 : (this.player.pGauge / this.player.pGaugeMax);
        
        this.ctx.save();
        
        // 绘制圆角矩形外框
        this.ctx.strokeStyle = '#0066CC';
        this.ctx.lineWidth = 1.5; // 更细的边框
        this.ctx.beginPath();
        this.ctx.moveTo(x + radius, y);
        this.ctx.lineTo(x + width - radius, y);
        this.ctx.arcTo(x + width, y, x + width, y + radius, radius);
        this.ctx.lineTo(x + width, y + height - radius);
        this.ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
        this.ctx.lineTo(x + radius, y + height);
        this.ctx.arcTo(x, y + height, x, y + height - radius, radius);
        this.ctx.lineTo(x, y + radius);
        this.ctx.arcTo(x, y, x + radius, y, radius);
        this.ctx.closePath();
        this.ctx.stroke();
        
        // 背景
        this.ctx.fillStyle = 'rgba(0, 50, 100, 0.3)';
        this.ctx.fill();
        
        // P槽进度条 - 蓝色渐变（从下往上填充）
        if (progress > 0) {
            const fillHeight = height * progress;
            const fillY = y + height - fillHeight;
            
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.moveTo(x + radius, y);
            this.ctx.lineTo(x + width - radius, y);
            this.ctx.arcTo(x + width, y, x + width, y + radius, radius);
            this.ctx.lineTo(x + width, y + height - radius);
            this.ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
            this.ctx.lineTo(x + radius, y + height);
            this.ctx.arcTo(x, y + height, x, y + height - radius, radius);
            this.ctx.lineTo(x, y + radius);
            this.ctx.arcTo(x, y, x + radius, y, radius);
            this.ctx.closePath();
            this.ctx.clip();
            
            const gradient = this.ctx.createLinearGradient(x, y + height, x, fillY);
            gradient.addColorStop(0, '#0099FF');
            gradient.addColorStop(0.5, '#00CCFF');
            gradient.addColorStop(1, '#00FFFF');
            
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(x, fillY, width, fillHeight);
            
            // 发光效果
            if (progress > 0.8) {
                this.ctx.shadowBlur = 15;
                this.ctx.shadowColor = '#00FFFF';
                this.ctx.fillRect(x, fillY, width, fillHeight);
            }
            
            this.ctx.restore();
        }
        
        // P等级显示（在槽的上方）
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 3;
        this.ctx.strokeText(`P×${this.player.powerUps.P.level}`, x + width / 2, y - 10);
        this.ctx.fillText(`P×${this.player.powerUps.P.level}`, x + width / 2, y - 10);
        
        this.ctx.restore();
        
        // 绘制P升级提示（在玩家飞机顶部）
        if (this.player.pUpgradeNotification) {
            const notification = this.player.pUpgradeNotification;
            const alpha = Math.min(1, notification.timer / 10); // 更快的淡入淡出效果
            const offsetY = (40 - notification.timer) * 0.75; // 更快的向上飘动效果
            
            this.ctx.save();
            this.ctx.globalAlpha = alpha;
            
            // 在玩家飞机机头位置显示（贴着机头出现，然后向上飘）
            const textX = this.player.x + this.player.width / 2;
            const textY = this.player.y - offsetY; // 从机头位置开始，向上飘动
            
            // 文字描边
            this.ctx.strokeStyle = '#0066CC';
            this.ctx.lineWidth = 3;
            this.ctx.font = 'bold 18px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.strokeText('Level Up!', textX, textY);
            
            // 文字填充
            this.ctx.fillStyle = '#00FFFF';
            this.ctx.fillText('Level Up!', textX, textY);
            
            this.ctx.restore();
        }
    }
    
    // 绘制经验槽UI（在P槽正下方）
    drawExpGauge() {
        const pGaugeY = 60; // P槽顶部Y坐标
        const pGaugeHeight = 150; // P槽高度
        const spacing = 35; // P槽与经验槽之间的间距（增加15px）
        
        const x = this.canvas.width - 25; // 屏幕右侧，与P槽对齐
        const y = pGaugeY + pGaugeHeight + spacing; // P槽下方
        const width = 10; // 竖条宽度，与P槽一致
        const height = 150; // 竖条高度，与P槽一致
        const radius = 5; // 圆角半径，与P槽一致
        
        const progress = this.player.exp / this.player.expMax;
        
        this.ctx.save();
        
        // 绘制圆角矩形外框
        this.ctx.strokeStyle = '#FFD700';
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.moveTo(x + radius, y);
        this.ctx.lineTo(x + width - radius, y);
        this.ctx.arcTo(x + width, y, x + width, y + radius, radius);
        this.ctx.lineTo(x + width, y + height - radius);
        this.ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
        this.ctx.lineTo(x + radius, y + height);
        this.ctx.arcTo(x, y + height, x, y + height - radius, radius);
        this.ctx.lineTo(x, y + radius);
        this.ctx.arcTo(x, y, x + radius, y, radius);
        this.ctx.closePath();
        this.ctx.stroke();
        
        // 背景
        this.ctx.fillStyle = 'rgba(100, 80, 0, 0.3)';
        this.ctx.fill();
        
        // 经验槽进度条 - 金色渐变（从下往上填充）
        if (progress > 0) {
            const fillHeight = height * progress;
            const fillY = y + height - fillHeight;
            
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.moveTo(x + radius, y);
            this.ctx.lineTo(x + width - radius, y);
            this.ctx.arcTo(x + width, y, x + width, y + radius, radius);
            this.ctx.lineTo(x + width, y + height - radius);
            this.ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
            this.ctx.lineTo(x + radius, y + height);
            this.ctx.arcTo(x, y + height, x, y + height - radius, radius);
            this.ctx.lineTo(x, y + radius);
            this.ctx.arcTo(x, y, x + radius, y, radius);
            this.ctx.closePath();
            this.ctx.clip();
            
            const gradient = this.ctx.createLinearGradient(x, y + height, x, fillY);
            gradient.addColorStop(0, '#FFD700');
            gradient.addColorStop(0.5, '#FFA500');
            gradient.addColorStop(1, '#FFFF00');
            
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(x, fillY, width, fillHeight);
            
            // 发光效果
            if (progress > 0.8) {
                this.ctx.shadowBlur = 15;
                this.ctx.shadowColor = '#FFD700';
                this.ctx.fillRect(x, fillY, width, fillHeight);
            }
            
            this.ctx.restore();
        }
        
        // EXP等级显示（在槽的上方）
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 3;
        this.ctx.strokeText(`Lv${this.player.playerLevel}`, x + width / 2, y - 10);
        this.ctx.fillText(`Lv${this.player.playerLevel}`, x + width / 2, y - 10);
        
        this.ctx.restore();
        
        // 绘制经验升级提示（在玩家飞机顶部偏右）
        if (this.player.expUpgradeNotification) {
            const notification = this.player.expUpgradeNotification;
            const alpha = Math.min(1, notification.timer / 10);
            const offsetY = (40 - notification.timer) * 0.75;
            
            this.ctx.save();
            this.ctx.globalAlpha = alpha;
            
            const textX = this.player.x + this.player.width / 2 + 30; // 偏右避免与P升级重叠
            const textY = this.player.y - offsetY;
            
            // 文字描边
            this.ctx.strokeStyle = '#CC6600';
            this.ctx.lineWidth = 3;
            this.ctx.font = 'bold 18px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.strokeText('Level Up!', textX, textY);
            
            // 文字填充
            this.ctx.fillStyle = '#FFD700';
            this.ctx.fillText('Level Up!', textX, textY);
            
            this.ctx.restore();
        }
    }
    
    // 绘制HP槽UI（在P槽下方）
    // 绘制HP槽UI（在屏幕左侧，与P槽对称）
    drawHPGauge() {
        const pGaugeTopY = 60; // P槽顶部Y坐标
        const baseHeight = 150; // 基础高度
        const width = 10; // 竖条宽度，与P槽一致
        const radius = 5; // 圆角半径，与P槽一致
        
        // 根据最大生命值计算高度
        // 基础100HP = 150px, 最大300HP = 450px（3倍高度）
        const maxAllowedHeight = baseHeight * 3; // 450px
        const heightRatio = this.player.maxHealth / this.player.baseMaxHealth; // 1.0 到 3.0
        const height = Math.min(baseHeight * heightRatio, maxAllowedHeight);
        
        // HP槽始终与P槽顶部对齐，向下延伸
        const y = pGaugeTopY;
        const x = 15; // 屏幕左侧
        
        const progress = this.player.health / this.player.maxHealth;
        
        this.ctx.save();
        
        // 绘制圆角矩形外框
        this.ctx.strokeStyle = '#FF6666';
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.moveTo(x + radius, y);
        this.ctx.lineTo(x + width - radius, y);
        this.ctx.arcTo(x + width, y, x + width, y + radius, radius);
        this.ctx.lineTo(x + width, y + height - radius);
        this.ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
        this.ctx.lineTo(x + radius, y + height);
        this.ctx.arcTo(x, y + height, x, y + height - radius, radius);
        this.ctx.lineTo(x, y + radius);
        this.ctx.arcTo(x, y, x + radius, y, radius);
        this.ctx.closePath();
        this.ctx.stroke();
        
        // 背景
        this.ctx.fillStyle = 'rgba(100, 50, 50, 0.3)';
        this.ctx.fill();
        
        // HP槽进度条 - 红绿渐变（从下往上填充）
        if (progress > 0) {
            const fillHeight = height * progress;
            const fillY = y + height - fillHeight;
            
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.moveTo(x + radius, y);
            this.ctx.lineTo(x + width - radius, y);
            this.ctx.arcTo(x + width, y, x + width, y + radius, radius);
            this.ctx.lineTo(x + width, y + height - radius);
            this.ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
            this.ctx.lineTo(x + radius, y + height);
            this.ctx.arcTo(x, y + height, x, y + height - radius, radius);
            this.ctx.lineTo(x, y + radius);
            this.ctx.arcTo(x, y, x + radius, y, radius);
            this.ctx.closePath();
            this.ctx.clip();
            
            // 根据血量百分比改变颜色
            const gradient = this.ctx.createLinearGradient(x, y + height, x, fillY);
            if (progress > 0.6) {
                // 高血量：绿色
                gradient.addColorStop(0, '#00FF00');
                gradient.addColorStop(0.5, '#66FF66');
                gradient.addColorStop(1, '#99FF99');
            } else if (progress > 0.3) {
                // 中血量：橙色
                gradient.addColorStop(0, '#FF9900');
                gradient.addColorStop(0.5, '#FFAA33');
                gradient.addColorStop(1, '#FFBB66');
            } else {
                // 低血量：红色
                gradient.addColorStop(0, '#FF0000');
                gradient.addColorStop(0.5, '#FF3333');
                gradient.addColorStop(1, '#FF6666');
            }
            
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(x, fillY, width, fillHeight);
            
            // 低血量闪烁效果
            if (progress <= 0.3) {
                this.ctx.shadowBlur = 15;
                this.ctx.shadowColor = '#FF0000';
                this.ctx.fillRect(x, fillY, width, fillHeight);
            }
            
            this.ctx.restore();
        }
        
        // HP标识显示（在槽的上方）
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 3;
        this.ctx.strokeText('HP', x + width / 2, y - 10);
        this.ctx.fillText('HP', x + width / 2, y - 10);
        
        this.ctx.restore();
    }

    checkCollision(obj1, obj2) {
        return obj1.x < obj2.x + obj2.width &&
               obj1.x + obj1.width > obj2.x &&
               obj1.y < obj2.y + obj2.height &&
               obj1.y + obj1.height > obj2.y;
    }

    createExplosion(x, y, color) {
        for (let i = 0; i < 20; i++) {
            this.particles.push(new Particle(x, y, color));
        }
        // 添加火焰颜色
        for (let i = 0; i < 15; i++) {
            this.particles.push(new Particle(x, y, '#FFD700'));
        }
        for (let i = 0; i < 10; i++) {
            this.particles.push(new Particle(x, y, '#FFF'));
        }
    }

    createHitEffect(x, y) {
        for (let i = 0; i < 5; i++) {
            this.particles.push(new Particle(x, y, '#FFD700'));
        }
    }

    updateUI() {
        this.scoreElement.textContent = this.score;
        this.killsElement.textContent = this.kills;
        this.difficultyElement.textContent = this.difficulty;
    }

    gameOver() {
        this.gameState = 'gameOver';
        this.audioManager.stopBackgroundMusic(); // 停止背景音乐
        this.audioManager.playGameOver(); // 播放游戏结束音效
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('finalKills').textContent = this.kills;
        this.gameOverScreen.classList.remove('hidden');
    }
}

// 启动游戏
window.addEventListener('load', () => {
    const game = new Game();
});
