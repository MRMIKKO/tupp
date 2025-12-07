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
            lightningBolts: [],
            cooldownAttempts: 0 // 冷却期间尝试次数（彩蛋）
        };
        
        // 敌机生成
        this.enemySpawnTimer = 0;
        this.enemySpawnRate = 100; // 初始生成间隔（帧数）
        this.difficulty = 1;
        this.difficultyTimer = 0; // 难度计时器
        this.difficultyIncreaseInterval = 600; // 每10秒增加难度（60fps * 10）
        
        // 后方敌机预警系统
        this.rearWarnings = []; // 预警标记数组 {x, y, timer, maxTimer}
        
        // B弹碎片控制器（每帧最多2个爆炸产生碎片）
        this.fragmentSpawnControl = {
            frameCount: 0,
            maxPerFrame: 2 // 每帧最多2个爆炸产生碎片
        };
        
        // 性能优化配置
        this.maxEnemies = 15; // 屏幕上最大敌机数量（从30增加到60，2倍）
        this.maxBullets = 88; // 最大子弹数量（玩家+敌机）
        this.maxParticles = 66; // 最大粒子数量
        this.maxPowerUps = 8; // 最大道具数量
        this.maxFragments = 40; // 最大碎片数量（B弹P3+专用）
        
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
            shakeThreshold: 12, // 摇动阈值（降低以提高灵敏度）
            lastShakeTime: 0,
            shakeCooldown: 1000, // 1秒冷却时间，防止误触
            isInitialized: false // 标记是否已初始化
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
        // 注册设备运动事件监听器
        this.deviceMotionHandler = (event) => {
            if (this.gameState !== 'playing') return;
            
            const acceleration = event.accelerationIncludingGravity;
            if (!acceleration) return;
            
            const currentX = acceleration.x || 0;
            const currentY = acceleration.y || 0;
            const currentZ = acceleration.z || 0;
            
            // 首次初始化，记录初始值
            if (!this.shakeDetection.isInitialized) {
                this.shakeDetection.lastX = currentX;
                this.shakeDetection.lastY = currentY;
                this.shakeDetection.lastZ = currentZ;
                this.shakeDetection.isInitialized = true;
                return;
            }
            
            // 计算加速度变化
            const deltaX = Math.abs(currentX - this.shakeDetection.lastX);
            const deltaY = Math.abs(currentY - this.shakeDetection.lastY);
            const deltaZ = Math.abs(currentZ - this.shakeDetection.lastZ);
            
            // 计算总变化量
            const totalDelta = deltaX + deltaY + deltaZ;
            
            // 检测是否超过阈值（使用更灵敏的检测）
            if (totalDelta > this.shakeDetection.shakeThreshold) {
                const now = Date.now();
                if (now - this.shakeDetection.lastShakeTime > this.shakeDetection.shakeCooldown) {
                    this.shakeDetection.lastShakeTime = now;
                    console.log(`摇一摇触发！变化量: ${totalDelta.toFixed(2)}`);
                    this.activateLightningSkill();
                }
            }
            
            // 更新上次的值
            this.shakeDetection.lastX = currentX;
            this.shakeDetection.lastY = currentY;
            this.shakeDetection.lastZ = currentZ;
        };
    }
    
    // 在游戏开始前请求设备运动权限（静默处理，不显示UI提示）
    async requestMotionPermissionBeforeStart() {
        // 检测是否为iOS设备且需要权限请求
        if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
            try {
                console.log('请求iOS设备运动权限...');
                
                const permission = await DeviceMotionEvent.requestPermission();
                console.log('权限请求结果:', permission);
                
                if (permission === 'granted') {
                    window.addEventListener('devicemotion', this.deviceMotionHandler, false);
                    console.log('✓ 设备运动权限已授予，摇一摇功能已启用');
                } else {
                    console.log('✗ 设备运动权限被拒绝');
                }
            } catch (error) {
                console.error('请求设备运动权限时出错:', error);
                // 某些浏览器可能不支持，降级到直接监听
                window.addEventListener('devicemotion', this.deviceMotionHandler, false);
            }
        } else if (typeof DeviceMotionEvent !== 'undefined') {
            // 非iOS设备或旧版本iOS，直接添加监听器
            window.addEventListener('devicemotion', this.deviceMotionHandler, false);
            console.log('✓ 设备运动监听已启动（无需权限）');
        } else {
            console.log('✗ 设备不支持运动传感器');
        }
    }

    setupEventListeners() {
        this.startBtn.addEventListener('click', async () => {
            // 先请求权限，然后再开始游戏
            await this.requestMotionPermissionBeforeStart();
            this.startGame();
        });
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
        this.lightningSkill.cooldownAttempts = 0; // 重置彩蛋计数器
        
        // 重置摇一摇检测状态
        this.shakeDetection.isInitialized = false;
        this.shakeDetection.lastShakeTime = 0;
        
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
        // 重置每帧碎片生成计数器
        this.fragmentSpawnControl.frameCount = 0;
        
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
            this.difficulty++;
            this.updateUI();
            this.difficultyTimer = 0;
        }

        // 生成敌机 - 根据难度动态调整
        this.enemySpawnTimer++;
        // 生成间隔：难度越高，间隔越短（从100降到20帧）
        const spawnRate = Math.max(20, this.enemySpawnRate - this.difficulty * 4);
        
        // 难度越高，可能同时生成多架敌机
        let simultaneousSpawns = Math.min(5, Math.floor(this.difficulty / 3) + 1);

        // 难度10级以下，增加2.5倍敌机数量
        if (this.difficulty < 6) {
            simultaneousSpawns = Math.floor(simultaneousSpawns * 3.5);
        }

        // // 难度5之前，敌机数量增加2倍
        if (this.difficulty >= 6 &&  this.difficulty < 10) {
            simultaneousSpawns = Math.min(10, simultaneousSpawns * 2);
        }
        // 难度超过12后，敌机增加数量减少2倍
        if (this.difficulty > 10) {
            // 总体减少1.5倍同时出现的敌机数量
            simultaneousSpawns = Math.max(1, Math.floor(simultaneousSpawns / 1.5));
        }
        
        if (this.enemySpawnTimer >= spawnRate) {
            // 性能优化：限制屏幕上的敌机数量
            if (this.enemies.length >= this.maxEnemies) {
                this.enemySpawnTimer = 0;
                return; // 达到上限，不再生成
            }
            
            // 根据难度生成敌机
            for (let i = 0; i < simultaneousSpawns; i++) {
                // 检查是否超过上限
                if (this.enemies.length >= this.maxEnemies) {
                    break;
                }
                
                // 确保敌机不重叠，传入当前难度
                const newEnemy = new Enemy(this.canvas, null, this.difficulty);
                newEnemy.x += i * 80; // 横向偏移避免重叠
                
                // 难度超过5时，有30%概率从底部出现阻击玩家
                if (this.difficulty > 5 && Math.random() < 0.3) {
                    // 先创建预警标记（2秒 = 120帧）
                    this.rearWarnings.push({
                        x: newEnemy.x + newEnemy.width / 2,
                        timer: 120, // 2秒预警时间
                        maxTimer: 120,
                        enemyX: newEnemy.x, // 保存敌机位置用于稍后生成
                        enemyData: {
                            x: newEnemy.x,
                            difficulty: this.difficulty,
                            offset: i * 80
                        }
                    });
                    // 不立即添加敌机，等预警结束后再添加
                    continue;
                }
                
                this.enemies.push(newEnemy);
            }
            this.enemySpawnTimer = 0;
        }
        
        // 更新后方敌机预警系统
        this.rearWarnings = this.rearWarnings.filter(warning => {
            warning.timer--;
            
            // 预警时间结束，生成敌机
            if (warning.timer <= 0) {
                const enemy = new Enemy(this.canvas, null, warning.enemyData.difficulty);
                enemy.x = warning.enemyData.x;
                enemy.y = this.canvas.height; // 从底部出现
                enemy.speed = -Math.abs(enemy.speed); // 向上移动（负速度）
                enemy.isBottomSpawned = true; // 标记为底部生成的敌机
                this.enemies.push(enemy);
                return false; // 移除预警标记
            }
            
            return true; // 保留预警标记
        });

        // 更新敌机
        this.enemies.forEach(enemy => {
            enemy.update(this.canvas);
            
            // 将敌机子弹转移到独立数组 - 性能优化：限制子弹数量
            if (enemy.bullets.length > 0) {
                const availableSlots = this.maxBullets - (this.player.bullets.length + this.enemyBullets.length);
                if (availableSlots > 0) {
                    const bulletsToAdd = enemy.bullets.slice(0, availableSlots);
                    this.enemyBullets.push(...bulletsToAdd);
                }
                enemy.bullets = [];
            }
        });
        
        // 更新敌机子弹
        this.enemyBullets = this.enemyBullets.filter(bullet => {
            bullet.update();
            return bullet.active;
        });
        
        // 性能优化：定期清理超限的碎片（优先清理最老的碎片）
        const currentFragments = this.player.bullets.filter(b => b.isFragment);
        if (currentFragments.length > this.maxFragments) {
            const fragmentsToRemove = currentFragments.slice(0, currentFragments.length - this.maxFragments);
            fragmentsToRemove.forEach(frag => frag.active = false);
        }
        
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
        
        // 更新爆炸范围伤害（性能优化：每2帧检测一次）
        if (!this.explosionCheckFrame) this.explosionCheckFrame = 0;
        this.explosionCheckFrame++;
        
        if (this.explosionCheckFrame % 2 === 0) {
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
                                
                                // B弹P3+击杀时不显示彩色爆炸效果（已有碎片效果）
                                if (explosion.pLevel < 3) {
                                    this.createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#FFA500', false);
                                }
                                break;
                            }
                        }
                    }
                });
            });
        }

        // 碰撞检测 - 玩家子弹击中敌机（性能优化：跳过已销毁的敌机）
        this.player.bullets.forEach(bullet => {
            if (!bullet.active || bullet.isVisible === false) return; // 跳过不活跃或不可见的子弹
            
            this.enemies.forEach(enemy => {
                if (enemy.health <= 0) return; // 跳过已销毁的敌机
                
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
                            
                            // B弹P3+击杀时不显示彩色爆炸效果（已有碎片效果）
                            // 包括碎片自己击杀时也不显示
                            const hasFragments = bullet.isBomb && bullet.bombPLevel >= 3;
                            const isFragmentKill = bullet.isFragment;
                            if (!hasFragments && !isFragmentKill) {
                                this.createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#FF6600', false);
                            }
                            
                            // 增加经验值（击杀敌机）- 随难度递减以平衡游戏
                            // 难度1: 10, 难度5: 8, 难度10: 6, 难度15: 4, 难度20+: 3
                            const expIncrease = Math.max(3, 10 - Math.floor(this.difficulty / 3));
                            this.player.addExp(expIncrease);
                            
                            // 增加P槽值（击杀敌机）- 随难度递减，但速度比经验慢
                            // 难度1: 10, 难度10: 8, 难度20: 6, 难度30+: 5
                            const pGaugeIncrease = Math.max(5, 10 - Math.floor(this.difficulty / 5));
                            this.player.addPGauge(pGaugeIncrease);
                            
                            // 随机生成道具（30%概率）- 性能优化：限制道具数量
                            if (Math.random() < 0.3 && this.powerUps.length < this.maxPowerUps) {
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
                        // 保留爆炸光晕效果，不隐藏
                        const explosion = new Explosion(
                            enemy.x + enemy.width / 2, 
                            enemy.y + enemy.height / 2, 
                            bullet.bombRadius || 80,
                            bullet.bombDamage || 1,
                            false, // 不隐藏爆炸光晕
                            bullet.bombPLevel || 0
                        );
                        this.player.explosions.push(explosion);
                        
                        // P3+: 爆炸时向周围发射穿透碎片（防御后方敌机）
                        // 性能优化：每帧最多2个爆炸产生碎片，随机选择
                        if (bullet.bombPLevel >= 3 && this.fragmentSpawnControl.frameCount < this.fragmentSpawnControl.maxPerFrame) {
                            // 统计当前碎片数量
                            const currentFragments = this.player.bullets.filter(b => b.isFragment).length;
                            const availableFragmentSlots = this.maxFragments - currentFragments;
                            
                            // 只在碎片数量未超限时生成
                            if (availableFragmentSlots > 0) {
                                const availableSlots = this.maxBullets - (this.player.bullets.length + this.enemyBullets.length);
                                // 保持12个方向的碎片
                                const fragmentCount = Math.min(12, availableSlots, availableFragmentSlots);
                                const fragmentSpeed = 8; // 碎片速度
                                const fragmentDamage = 0.5 + bullet.bombPLevel * 0.2; // 碎片伤害
                                
                                for (let i = 0; i < fragmentCount; i++) {
                                    const angle = (Math.PI * 2 * i) / 12; // 12个方向均匀分布
                                    const fragment = new Bullet(
                                        enemy.x + enemy.width / 2,
                                        enemy.y + enemy.height / 2,
                                        fragmentSpeed,
                                        true,
                                        this.canvas.height
                                    );
                                    fragment.damage = fragmentDamage;
                                    fragment.size = 6; // 碎片大小
                                    fragment.penetrating = true; // 可穿透
                                    fragment.isFragment = true; // 标记为碎片
                                    fragment.speedX = Math.cos(angle) * fragmentSpeed;
                                    fragment.speedY = Math.sin(angle) * fragmentSpeed;
                                    this.player.bullets.push(fragment);
                                }
                                
                                // 增加本帧碎片生成计数
                                this.fragmentSpawnControl.frameCount++;
                            }
                        }
                        
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
        
        // 性能优化：定期强制清理最老的粒子（如果超过限制）
        if (this.particles.length > this.maxParticles) {
            this.particles = this.particles.slice(-this.maxParticles);
        }

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
        
        // 绘制弹药效果时间槽（在P槽左侧）
        this.drawAmmoGauge();
        
        // 绘制P槽UI
        this.drawPGauge();
        
        // 绘制经验槽UI
        this.drawExpGauge();
        
        // 绘制HP槽UI
        this.drawHPGauge();
        
        // 绘制后方敌机预警
        this.drawRearWarnings();
        
        // 绘制闪电效果
        this.drawLightning();
    }

    // 激活闪电清屏技能
    activateLightningSkill() {
        if (!this.lightningSkill.available || this.lightningSkill.cooldown > 0) {
            const remainingSeconds = Math.ceil(this.lightningSkill.cooldown / 60);
            
            // 彩蛋：冷却期间尝试触发
            this.lightningSkill.cooldownAttempts++;
            console.log(`⚡ 技能冷却中... 还需 ${remainingSeconds} 秒 (尝试: ${this.lightningSkill.cooldownAttempts}/3)`);
            
            // 彩蛋触发：冷却期间尝试3次
            if (this.lightningSkill.cooldownAttempts >= 3) {
                this.difficulty += 5;
                this.lightningSkill.cooldownAttempts = 0; // 重置计数
                this.updateUI();
                
                console.log('🎉 彩蛋触发！难度+10！当前难度：' + this.difficulty);
                
                // 视觉提示：屏幕闪烁
                this.lightningSkill.lightningFlash = 15;
            }
            
            return;
        }
        
        // 检查是否有敌机
        if (this.enemies.length === 0) {
            console.log('⚡ 没有敌机可以清除');
            return;
        }
        
        console.log('⚡ 闪电技能激活！清除' + this.enemies.length + '个敌机');
        
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
        this.lightningSkill.cooldownAttempts = 0; // 重置冷却尝试计数
        
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
    
    // 绘制弹药效果时间槽（在P槽左侧）
    drawAmmoGauge() {
        const x = this.canvas.width - 35; // P槽左侧（P槽在width-25，向右移10px后间隔变为0px）
        const y = 60; // 与P槽对齐
        const width = 6; // 更细的竖条
        const height = 150; // 与P槽相同高度
        const radius = 3; // 更小的圆角
        
        // 获取当前激活的弹药道具（S、L、B、C）
        let activeAmmo = null;
        let ammoProgress = 0;
        let ammoColor = '#888888';
        
        const now = Date.now();
        const ammoTypes = {
            S: { color: '#FFD700' }, // 三弹道 - 金黄色（普通子弹颜色）
            L: { color: '#00FFFF' }, // 激光 - 青色
            B: { color: '#FF4500' }, // 爆炸弹 - 橙红色
            C: { color: '#FF6600' }  // 追踪火箭炮 - 橙色
        };
        
        // 查找当前激活的弹药道具
        for (let type of ['S', 'L', 'B', 'C']) {
            if (this.player.powerUps[type].active) {
                const powerUp = this.player.powerUps[type];
                const endTime = powerUp.endTime;
                const startTime = powerUp.startTime;
                
                if (endTime > 0 && startTime > 0) {
                    const totalDuration = endTime - startTime;
                    const remaining = endTime - now;
                    ammoProgress = Math.max(0, Math.min(1, remaining / totalDuration));
                    ammoColor = ammoTypes[type].color;
                    activeAmmo = type;
                    break; // 只显示第一个激活的弹药
                } else if (endTime === 0) {
                    // 无限时长的道具
                    ammoProgress = 1;
                    ammoColor = ammoTypes[type].color;
                    activeAmmo = type;
                    break;
                }
            }
        }
        
        this.ctx.save();
        
        // 绘制圆角矩形外框
        this.ctx.strokeStyle = activeAmmo ? ammoColor : '#555555';
        this.ctx.lineWidth = 1;
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
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.fill();
        
        // 弹药时间进度条（从下往上填充）
        if (ammoProgress > 0 && activeAmmo) {
            const fillHeight = height * ammoProgress;
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
            
            // 渐变效果
            const gradient = this.ctx.createLinearGradient(x, y + height, x, fillY);
            const baseColor = ammoColor;
            gradient.addColorStop(0, baseColor);
            gradient.addColorStop(0.5, baseColor + 'CC'); // 半透明
            gradient.addColorStop(1, baseColor + '99'); // 更透明
            
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(x, fillY, width, fillHeight);
            
            // 闪烁效果（剩余时间<20%时）
            if (ammoProgress < 0.2) {
                const flash = Math.sin(Date.now() / 100) * 0.5 + 0.5;
                this.ctx.shadowBlur = 10 * flash;
                this.ctx.shadowColor = ammoColor;
                this.ctx.fillRect(x, fillY, width, fillHeight);
            }
            
            this.ctx.restore();
        }
        
        this.ctx.restore();
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

    createExplosion(x, y, color, skipEffect = false) {
        // B弹P3+时跳过粒子爆炸效果（已有碎片）
        if (skipEffect) {
            return;
        }
        
        // 性能优化：限制粒子数量，减少爆炸粒子
        const availableSlots = this.maxParticles - this.particles.length;
        if (availableSlots <= 0) return;
        
        const particleCount = Math.min(availableSlots, 30); // 从45减到30
        const mainCount = Math.min(Math.floor(particleCount * 0.44), 13); // 从20减到13
        const goldCount = Math.min(Math.floor(particleCount * 0.33), 10); // 从15减到10
        const whiteCount = Math.min(particleCount - mainCount - goldCount, 7); // 从10减到7
        
        for (let i = 0; i < mainCount; i++) {
            this.particles.push(new Particle(x, y, color));
        }
        // 添加火焰颜色
        for (let i = 0; i < goldCount; i++) {
            this.particles.push(new Particle(x, y, '#FFD700'));
        }
        for (let i = 0; i < whiteCount; i++) {
            this.particles.push(new Particle(x, y, '#FFF'));
        }
    }

    createHitEffect(x, y) {
        // 性能优化：限制粒子数量
        if (this.particles.length >= this.maxParticles) return;
        
        const particleCount = Math.min(5, this.maxParticles - this.particles.length);
        for (let i = 0; i < particleCount; i++) {
            this.particles.push(new Particle(x, y, '#FFD700'));
        }
    }

    updateUI() {
        this.scoreElement.textContent = this.score;
        this.killsElement.textContent = this.kills;
        this.difficultyElement.textContent = this.difficulty;
    }
    
    // 绘制后方敌机预警UI
    drawRearWarnings() {
        this.ctx.save();
        
        this.rearWarnings.forEach(warning => {
            const x = warning.x;
            const y = this.canvas.height - 40; // 屏幕底部上方40px
            const progress = warning.timer / warning.maxTimer; // 预警进度（1到0）
            const pulseTime = Date.now() * 0.01;
            
            // 脉冲动画（更快速的脉动）
            const pulse = Math.sin(pulseTime * 2) * 0.2 + 0.8; // 0.6到1.0之间脉动
            
            // 外层脉冲光晕（增强可见性）
            this.ctx.globalAlpha = 0.25 * pulse * progress;
            const glowGradient = this.ctx.createRadialGradient(x, y, 0, x, y, 40);
            glowGradient.addColorStop(0, '#FF0000');
            glowGradient.addColorStop(0.4, '#FF4444');
            glowGradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
            this.ctx.fillStyle = glowGradient;
            this.ctx.beginPath();
            this.ctx.arc(x, y, 40, 0, Math.PI * 2);
            this.ctx.fill();
            
            // 紧凑的三角形警告图标
            this.ctx.globalAlpha = pulse * progress;
            const triSize = 12;
            const triY = y;
            
            // 三角形阴影
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = '#FF0000';
            
            // 三角形背景（橙红渐变）
            const triGradient = this.ctx.createLinearGradient(x, triY - triSize, x, triY + triSize);
            triGradient.addColorStop(0, '#FF6600');
            triGradient.addColorStop(1, '#FF0000');
            this.ctx.fillStyle = triGradient;
            this.ctx.strokeStyle = '#FFFFFF';
            this.ctx.lineWidth = 2;
            
            this.ctx.beginPath();
            this.ctx.moveTo(x, triY - triSize);
            this.ctx.lineTo(x - triSize * 0.8, triY + triSize * 0.6);
            this.ctx.lineTo(x + triSize * 0.8, triY + triSize * 0.6);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();
            
            // 感叹号（更清晰）
            this.ctx.shadowBlur = 5;
            this.ctx.shadowColor = '#FFFFFF';
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.fillRect(x - 1.5, triY - 8, 3, 9);
            this.ctx.beginPath();
            this.ctx.arc(x, triY + 4, 2, 0, Math.PI * 2);
            this.ctx.fill();
            
            // 重置阴影
            this.ctx.shadowBlur = 0;
            
            // 精确倒计时（紧凑显示）
            this.ctx.globalAlpha = progress;
            const timeLeft = (warning.timer / 60).toFixed(1);
            
            // 倒计时背景（深色圆角矩形）
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            this.ctx.beginPath();
            this.ctx.roundRect(x - 18, triY + 16, 36, 16, 3);
            this.ctx.fill();
            
            // 倒计时文字
            this.ctx.fillStyle = timeLeft < 0.5 ? '#FFFF00' : '#FFFFFF'; // 最后0.5秒变黄色
            this.ctx.font = 'bold 12px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 3;
            this.ctx.strokeText(timeLeft + 's', x, triY + 24);
            this.ctx.fillText(timeLeft + 's', x, triY + 24);
            
            // 向上跳动箭头指示器
            const arrowY = triY - 20;
            const arrowBounce = Math.sin(pulseTime * 3) * 4; // 上下跳动
            
            this.ctx.globalAlpha = pulse * progress;
            this.ctx.strokeStyle = '#FF3333';
            this.ctx.lineWidth = 2.5;
            this.ctx.shadowBlur = 8;
            this.ctx.shadowColor = '#FF0000';
            
            // 箭头杆
            this.ctx.beginPath();
            this.ctx.moveTo(x, arrowY + arrowBounce);
            this.ctx.lineTo(x, arrowY - 14 + arrowBounce);
            this.ctx.stroke();
            
            // 箭头头部（填充）
            this.ctx.fillStyle = '#FF3333';
            this.ctx.shadowBlur = 5;
            this.ctx.beginPath();
            this.ctx.moveTo(x, arrowY - 14 + arrowBounce);
            this.ctx.lineTo(x - 5, arrowY - 8 + arrowBounce);
            this.ctx.lineTo(x + 5, arrowY - 8 + arrowBounce);
            this.ctx.closePath();
            this.ctx.fill();
            
            // 重置阴影
            this.ctx.shadowBlur = 0;
            
            // 底部位置标记线（连接到屏幕底部）
            this.ctx.globalAlpha = 0.4 * pulse * progress;
            this.ctx.strokeStyle = '#FF0000';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 5]);
            this.ctx.beginPath();
            this.ctx.moveTo(x, triY + 18);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
            
            // 底部三角形标记（在屏幕边缘）
            this.ctx.globalAlpha = pulse * progress;
            this.ctx.fillStyle = '#FF0000';
            this.ctx.shadowBlur = 8;
            this.ctx.shadowColor = '#FF0000';
            this.ctx.beginPath();
            this.ctx.moveTo(x, this.canvas.height);
            this.ctx.lineTo(x - 6, this.canvas.height - 10);
            this.ctx.lineTo(x + 6, this.canvas.height - 10);
            this.ctx.closePath();
            this.ctx.fill();
            
            // 底部位置圆环脉冲
            this.ctx.globalAlpha = 0.3 * pulse * progress;
            this.ctx.strokeStyle = '#FF0000';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(x, this.canvas.height - 5, 8 + pulse * 3, 0, Math.PI * 2);
            this.ctx.stroke();
            
            // 敌机轮廓图标（临近时显示）
            if (progress < 0.4) { // 临近时显示
                this.ctx.shadowBlur = 0;
                this.ctx.globalAlpha = (0.4 - progress) / 0.4 * pulse; // 淡入效果
                this.ctx.fillStyle = '#FFFFFF';
                this.ctx.strokeStyle = '#FF0000';
                this.ctx.lineWidth = 1.5;
                
                const iconSize = 8;
                const iconY = triY - 28;
                
                // 简化的敌机形状
                this.ctx.beginPath();
                this.ctx.moveTo(x, iconY - iconSize);
                this.ctx.lineTo(x - iconSize * 0.7, iconY + iconSize * 0.2);
                this.ctx.lineTo(x, iconY + iconSize * 0.5);
                this.ctx.lineTo(x + iconSize * 0.7, iconY + iconSize * 0.2);
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.stroke();
            }
        });
        
        this.ctx.restore();
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
