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
        
        // Boss系统
        this.boss = null;
        this.bossActive = false;
        this.bossTimer = 0; // Boss计时器
        this.bossInterval = 1080; // 每18秒出现一次Boss (60fps * 18秒)
        
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
        this.maxDifficulty = 10; // 最大难度等级
        
        // 背景
        this.clouds = [];
        this.initClouds();
        
        // UI元素
        this.scoreElement = document.getElementById('score');
        this.livesElement = document.getElementById('lives');
        this.killsElement = document.getElementById('kills');
        this.difficultyElement = document.getElementById('difficulty');
        this.bossProgressElement = document.getElementById('bossProgress');
        this.skillCooldownElement = document.getElementById('skillCooldown');
        this.mobileSkillBtn = document.getElementById('mobileSkillBtn');
        this.startScreen = document.getElementById('startScreen');
        this.gameOverScreen = document.getElementById('gameOver');
        this.startBtn = document.getElementById('startBtn');
        this.restartBtn = document.getElementById('restartBtn');
        
        this.setupEventListeners();
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
            // 显示移动端技能按钮
            if (this.mobileSkillBtn) {
                this.mobileSkillBtn.classList.remove('hidden');
            }
        } else {
            desktopControls.forEach(el => el.style.display = 'block');
            mobileControls.forEach(el => el.style.display = 'none');
            // 隐藏移动端技能按钮
            if (this.mobileSkillBtn) {
                this.mobileSkillBtn.classList.add('hidden');
            }
        }
    }

    setupEventListeners() {
        this.startBtn.addEventListener('click', () => this.startGame());
        this.restartBtn.addEventListener('click', () => this.restartGame());
        
        // 移动端技能按钮
        if (this.mobileSkillBtn) {
            this.mobileSkillBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (this.gameState === 'playing') {
                    this.activateLightningSkill();
                }
            });
            
            // 防止按钮被长按选中
            this.mobileSkillBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
            });
        }
        
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
        
        // 重置Boss系统
        this.boss = null;
        this.bossActive = false;
        this.bossTimer = 0;
        this.bossInterval = 1080; // 每18秒出现一次Boss
        
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

        // 难度系统 - 击败Boss后才能升级（移除自动难度提升）
        // 不再使用时间自动提升难度

        // Boss系统逻辑 - 基于时间触发
        if (!this.bossActive) {
            this.bossTimer++;
            if (this.bossTimer >= this.bossInterval) {
                // 触发Boss战
                this.spawnBoss();
                this.bossTimer = 0; // 重置计时器
            }
        }

        // 生成敌机 - 根据难度动态调整（Boss战期间不生成普通敌机）
        if (!this.bossActive) {
            this.enemySpawnTimer++;
            // 生成间隔：难度越高，间隔越短（从100降到30帧）
            const spawnRate = Math.max(30, this.enemySpawnRate - this.difficulty * 7);
            
            // 难度越高，可能同时生成多架敌机 (增加1.5倍)
            const baseSpawns = Math.min(3, Math.floor(this.difficulty / 3) + 1);
            const simultaneousSpawns = Math.ceil(baseSpawns * 1.5);
            
            if (this.enemySpawnTimer >= spawnRate) {
                // 根据难度生成敌机（数量增加1.5倍）
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
                    
                    if (this.player.lives <= 0) {
                        this.gameOver();
                    }
                }
            }
        });

        // 碰撞检测 - 玩家与敌机
        this.enemies.forEach(enemy => {
            if (this.checkCollision(this.player, enemy)) {
                if (this.player.hit()) {
                    this.createExplosion(this.player.x + this.player.width / 2, 
                                       this.player.y + this.player.height / 2, '#4A90E2');
                    this.audioManager.playPlayerHit(); // 播放玩家受伤音效
                    this.updateUI();
                    
                    if (this.player.lives <= 0) {
                        this.gameOver();
                    }
                }
                // 敌机也被摧毁
                this.createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#FF6600');
                this.audioManager.playExplosion(); // 播放爆炸音效
                enemy.health = 0;
            }
        });

        // Boss战逻辑
        if (this.bossActive && this.boss) {
            // 更新Boss
            this.boss.update(this.canvas, this.player);
            
            // Boss子弹击中玩家
            if (this.boss && this.boss.bullets) {
                this.boss.bullets.forEach(bullet => {
                    if (!bullet.active) return;
                    
                    // 检查是否被蓄力护盾拦截（穿透弹除外）
                    if (this.player.chargeShield && !bullet.isPenetrating) {
                        const shield = this.player.chargeShield;
                        const dx = bullet.x - shield.x;
                        const dy = bullet.y - shield.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        
                        if (distance < shield.radius) {
                            bullet.active = false;
                            this.createExplosion(bullet.x, bullet.y, '#00BFFF', 0.3);
                            return;
                        }
                    }
                    
                    // 检查碰撞 - 圆形子弹使用圆形碰撞检测
                    let hit = false;
                    if (bullet.size) {
                        // 圆形碰撞检测（用于全屏弹幕等圆形子弹）
                        const playerCenterX = this.player.x + this.player.width / 2;
                        const playerCenterY = this.player.y + this.player.height / 2;
                        const dx = bullet.x - playerCenterX;
                        const dy = bullet.y - playerCenterY;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        const collisionDist = bullet.size + Math.min(this.player.width, this.player.height) / 2;
                        hit = distance < collisionDist;
                    } else {
                        // 矩形碰撞检测（用于Bullet类实例）
                        hit = this.checkCollision(bullet, this.player);
                    }
                    
                    if (hit) {
                        bullet.active = false;
                        if (this.player.hit()) {
                            this.createExplosion(this.player.x + this.player.width / 2, 
                                               this.player.y + this.player.height / 2, '#4A90E2');
                            this.audioManager.playPlayerHit();
                            this.updateUI();
                            
                            if (this.player.lives <= 0) {
                                this.gameOver();
                            }
                        }
                    }
                });
            }
            
            // 玩家子弹击中Boss
            let bossDefeated = false;
            this.player.bullets.forEach(bullet => {
                if (!bullet.active || !this.boss || bossDefeated) return;
                
                if (this.checkCollision(bullet, this.boss)) {
                    if (!bullet.penetrating) {
                        bullet.active = false;
                    }
                    
                    const damage = bullet.damage || 1;
                    if (this.boss.hit(damage)) {
                        // Boss被击败 - 先保存位置信息
                        const bossX = this.boss.x;
                        const bossY = this.boss.y;
                        const bossWidth = this.boss.width;
                        const bossHeight = this.boss.height;
                        const bossScore = this.boss.score;
                        
                        this.score += bossScore;
                        this.createExplosion(bossX + bossWidth / 2, 
                                           bossY + bossHeight / 2, '#FFD700', 2);
                        
                        // Boss击败奖励 - 掉落多个道具
                        for (let i = 0; i < 5; i++) {
                            this.powerUps.push(new PowerUp(
                                bossX + bossWidth / 2 - 50 + i * 25,
                                bossY + bossHeight / 2
                            ));
                        }
                        
                        this.audioManager.playExplosion();
                        
                        // 标记Boss已被击败
                        bossDefeated = true;
                        
                        // 清除Boss
                        this.boss = null;
                        this.bossActive = false;
                        this.bossTimer = 0; // 重置Boss计时器
                        
                        // 击败Boss后提升难度
                        if (this.difficulty < this.maxDifficulty) {
                            this.difficulty++;
                            
                            // 显示难度提升提示
                            this.showDifficultyUpgrade();
                        }
                    } else {
                        this.createHitEffect(bullet.x, bullet.y);
                        this.audioManager.playHit();
                    }
                }
            });
            
            // 玩家与Boss碰撞
            if (this.boss && !bossDefeated && this.checkCollision(this.player, this.boss)) {
                if (this.player.hit()) {
                    this.createExplosion(this.player.x + this.player.width / 2, 
                                       this.player.y + this.player.height / 2, '#4A90E2');
                    this.audioManager.playPlayerHit();
                    this.updateUI();
                    
                    if (this.player.lives <= 0) {
                        this.gameOver();
                    }
                }
            }
        }

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
        
        // 绘制Boss
        if (this.bossActive && this.boss) {
            this.boss.draw(this.ctx);
        }
        this.powerUps.forEach(powerUp => powerUp.draw(this.ctx)); // 绘制道具
        this.player.draw(this.ctx);
        this.player.explosions.forEach(exp => exp.draw(this.ctx)); // 绘制爆炸范围
        this.particles.forEach(particle => particle.draw(this.ctx));
        
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

    checkCollision(obj1, obj2) {
        return obj1.x < obj2.x + obj2.width &&
               obj1.x + obj1.width > obj2.x &&
               obj1.y < obj2.y + obj2.height &&
               obj1.y + obj1.height > obj2.y;
    }
    
    spawnBoss() {
        // 清除所有现存敌机和子弹
        this.enemies = [];
        this.enemyBullets = [];
        
        // 创建Boss
        this.boss = new Boss(this.canvas, this.difficulty);
        this.bossActive = true;
        
        // Boss出现提示
        this.showBossWarning();
    }
    
    showBossWarning() {
        // 屏幕警告闪烁效果
        let flashCount = 0;
        const flashInterval = setInterval(() => {
            if (flashCount >= 6) {
                clearInterval(flashInterval);
                return;
            }
            
            // 创建警告文字的闪烁
            const warningOverlay = document.createElement('div');
            warningOverlay.style.position = 'fixed';
            warningOverlay.style.top = '30%';
            warningOverlay.style.left = '50%';
            warningOverlay.style.transform = 'translate(-50%, -50%)';
            warningOverlay.style.fontSize = '48px';
            warningOverlay.style.fontWeight = 'bold';
            warningOverlay.style.color = '#FF0000';
            warningOverlay.style.textShadow = '0 0 20px #FF0000, 0 0 40px #FF0000';
            warningOverlay.style.zIndex = '10000';
            warningOverlay.textContent = '⚠️ WARNING ⚠️';
            warningOverlay.style.animation = 'bossWarning 0.5s ease-out';
            
            document.body.appendChild(warningOverlay);
            
            setTimeout(() => {
                document.body.removeChild(warningOverlay);
            }, 500);
            
            flashCount++;
        }, 300);
        
        // 添加CSS动画
        if (!document.getElementById('boss-warning-style')) {
            const style = document.createElement('style');
            style.id = 'boss-warning-style';
            style.textContent = `
                @keyframes bossWarning {
                    0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
                    50% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
                    100% { opacity: 0; transform: translate(-50%, -50%) scale(1); }
                }
                @keyframes difficultyUp {
                    0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8) rotateY(90deg); }
                    50% { opacity: 1; transform: translate(-50%, -50%) scale(1.3) rotateY(0deg); }
                    100% { opacity: 0; transform: translate(-50%, -50%) scale(1) rotateY(-90deg); }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    showDifficultyUpgrade() {
        // 显示难度提升动画
        const upgradeOverlay = document.createElement('div');
        upgradeOverlay.style.position = 'fixed';
        upgradeOverlay.style.top = '50%';
        upgradeOverlay.style.left = '50%';
        upgradeOverlay.style.transform = 'translate(-50%, -50%)';
        upgradeOverlay.style.fontSize = '64px';
        upgradeOverlay.style.fontWeight = 'bold';
        upgradeOverlay.style.color = '#FFD700';
        upgradeOverlay.style.textShadow = '0 0 30px #FFD700, 0 0 60px #FFA500, 0 0 90px #FF8C00';
        upgradeOverlay.style.zIndex = '10000';
        upgradeOverlay.textContent = `🎖️ 难度 ${this.difficulty} 🎖️`;
        upgradeOverlay.style.animation = 'difficultyUp 2s ease-out';
        
        document.body.appendChild(upgradeOverlay);
        
        setTimeout(() => {
            document.body.removeChild(upgradeOverlay);
        }, 2000);
        
        console.log(`难度提升到 ${this.difficulty}！需要击败 ${this.killsForNextBoss} 架敌机才能挑战下一个Boss`);
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
        
        // 更新生命显示
        const hearts = '❤️'.repeat(this.player.lives);
        this.livesElement.textContent = hearts || '💀';
        
        // 更新技能冷却显示
        if (this.lightningSkill.cooldown > 0) {
            const seconds = Math.ceil(this.lightningSkill.cooldown / 60);
            this.skillCooldownElement.textContent = `${seconds}秒`;
            this.skillCooldownElement.className = 'skill-cooldown';
            
            // 更新移动端按钮
            if (this.mobileSkillBtn) {
                this.mobileSkillBtn.classList.remove('ready');
                this.mobileSkillBtn.classList.add('cooldown');
                this.mobileSkillBtn.querySelector('.skill-icon').style.display = 'none';
                this.mobileSkillBtn.querySelector('.skill-text').style.display = 'none';
                this.mobileSkillBtn.querySelector('.skill-cooldown-text').textContent = seconds;
            }
        } else {
            this.skillCooldownElement.textContent = '就绪';
            this.skillCooldownElement.className = 'skill-ready';
            
            // 更新移动端按钮
            if (this.mobileSkillBtn) {
                this.mobileSkillBtn.classList.remove('cooldown');
                this.mobileSkillBtn.classList.add('ready');
                this.mobileSkillBtn.querySelector('.skill-icon').style.display = 'block';
                this.mobileSkillBtn.querySelector('.skill-text').style.display = 'block';
                this.mobileSkillBtn.querySelector('.skill-cooldown-text').textContent = '';
            }
        }
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
