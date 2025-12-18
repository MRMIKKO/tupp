// 音效管理器 - 复古8位音效风格
class AudioManager {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.musicGain = null;
        this.sfxGain = null;
        this.bgmOscillators = [];
        this.bgmPlaying = false;
        this.bgmLoopTimeout = null; // 添加循环定时器引用
        this.muted = false;
        this.chargingOscillator = null; // 蓄力音效振荡器
        this.chargingGain = null; // 蓄力音效增益节点
        
        this.initAudioContext();
    }

    initAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // 主音量控制
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = 0.3;
            this.masterGain.connect(this.audioContext.destination);
            
            // 背景音乐音量
            this.musicGain = this.audioContext.createGain();
            this.musicGain.gain.value = 0.4;
            this.musicGain.connect(this.masterGain);
            
            // 音效音量
            this.sfxGain = this.audioContext.createGain();
            this.sfxGain.gain.value = 0.6;
            this.sfxGain.connect(this.masterGain);
        } catch (e) {
            console.log('Web Audio API not supported');
        }
    }

    // 解锁音频（移动端需要）
    unlockAudio() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    // 播放射击音效
    playShoot() {
        if (!this.audioContext || this.muted) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(400, this.audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.sfxGain);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.1);
    }
    
    // 播放蓄力音效
    playCharging() {
        if (!this.audioContext || this.muted) return;
        
        // 如果已经有蓄力音效在播放，先停止
        this.stopCharging();
        
        this.chargingOscillator = this.audioContext.createOscillator();
        this.chargingGain = this.audioContext.createGain();
        
        this.chargingOscillator.type = 'sine';
        this.chargingOscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
        this.chargingOscillator.frequency.linearRampToValueAtTime(800, this.audioContext.currentTime + 1.5);
        
        this.chargingGain.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        this.chargingGain.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 1.5);
        
        this.chargingOscillator.connect(this.chargingGain);
        this.chargingGain.connect(this.sfxGain);
        
        this.chargingOscillator.start();
        this.chargingOscillator.stop(this.audioContext.currentTime + 1.5);
        
        // 1.5秒后自动清空引用
        setTimeout(() => {
            this.chargingOscillator = null;
            this.chargingGain = null;
        }, 1500);
    }
    
    // 停止蓄力音效
    stopCharging() {
        if (this.chargingOscillator) {
            try {
                this.chargingGain.gain.cancelScheduledValues(this.audioContext.currentTime);
                this.chargingGain.gain.setValueAtTime(this.chargingGain.gain.value, this.audioContext.currentTime);
                this.chargingGain.gain.linearRampToValueAtTime(0.01, this.audioContext.currentTime + 0.05);
                this.chargingOscillator.stop(this.audioContext.currentTime + 0.05);
            } catch (e) {
                // 振荡器可能已经停止
            }
            this.chargingOscillator = null;
            this.chargingGain = null;
        }
    }
    
    // 播放蓄力发射音效
    playChargedShoot() {
        if (!this.audioContext || this.muted) return;
        
        // 主音效 - 爆发声
        const oscillator1 = this.audioContext.createOscillator();
        const gainNode1 = this.audioContext.createGain();
        
        oscillator1.type = 'sawtooth';
        oscillator1.frequency.setValueAtTime(1200, this.audioContext.currentTime);
        oscillator1.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 0.3);
        
        gainNode1.gain.setValueAtTime(0.5, this.audioContext.currentTime);
        gainNode1.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
        
        oscillator1.connect(gainNode1);
        gainNode1.connect(this.sfxGain);
        
        // 副音效 - 能量释放
        const oscillator2 = this.audioContext.createOscillator();
        const gainNode2 = this.audioContext.createGain();
        
        oscillator2.type = 'sine';
        oscillator2.frequency.setValueAtTime(2400, this.audioContext.currentTime);
        oscillator2.frequency.exponentialRampToValueAtTime(400, this.audioContext.currentTime + 0.4);
        
        gainNode2.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gainNode2.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.4);
        
        oscillator2.connect(gainNode2);
        gainNode2.connect(this.sfxGain);
        
        oscillator1.start();
        oscillator1.stop(this.audioContext.currentTime + 0.3);
        oscillator2.start();
        oscillator2.stop(this.audioContext.currentTime + 0.4);
    }

    // 播放爆炸音效
    playExplosion() {
        if (!this.audioContext || this.muted) return;
        
        // 低频爆炸声
        const bass = this.audioContext.createOscillator();
        const bassGain = this.audioContext.createGain();
        
        bass.type = 'sawtooth';
        bass.frequency.setValueAtTime(120, this.audioContext.currentTime);
        bass.frequency.exponentialRampToValueAtTime(30, this.audioContext.currentTime + 0.3);
        
        bassGain.gain.setValueAtTime(0.8, this.audioContext.currentTime);
        bassGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
        
        bass.connect(bassGain);
        bassGain.connect(this.sfxGain);
        
        // 噪音层
        const bufferSize = this.audioContext.sampleRate * 0.3;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noise = this.audioContext.createBufferSource();
        const noiseGain = this.audioContext.createGain();
        
        noise.buffer = buffer;
        noiseGain.gain.setValueAtTime(0.4, this.audioContext.currentTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
        
        noise.connect(noiseGain);
        noiseGain.connect(this.sfxGain);
        
        bass.start();
        bass.stop(this.audioContext.currentTime + 0.3);
        noise.start();
        noise.stop(this.audioContext.currentTime + 0.3);
    }

    // 播放击中音效
    playHit() {
        if (!this.audioContext || this.muted) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.15);
        
        gainNode.gain.setValueAtTime(0.4, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.sfxGain);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.15);
    }

    // 播放玩家受伤音效
    playPlayerHit() {
        if (!this.audioContext || this.muted) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(300, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(50, this.audioContext.currentTime + 0.4);
        
        gainNode.gain.setValueAtTime(0.5, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.4);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.sfxGain);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.4);
    }

    // 播放游戏结束音效
    playGameOver() {
        if (!this.audioContext || this.muted) return;
        
        const notes = [330, 294, 262, 220];
        notes.forEach((freq, i) => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime + i * 0.2);
            
            gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime + i * 0.2);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + i * 0.2 + 0.3);
            
            oscillator.connect(gainNode);
            gainNode.connect(this.sfxGain);
            
            oscillator.start(this.audioContext.currentTime + i * 0.2);
            oscillator.stop(this.audioContext.currentTime + i * 0.2 + 0.3);
        });
    }
    
    // 播放道具拾取音效
    playPowerUp() {
        if (!this.audioContext || this.muted) return;
        
        // 上升音阶
        const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
        notes.forEach((freq, i) => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime + i * 0.08);
            
            gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime + i * 0.08);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + i * 0.08 + 0.15);
            
            oscillator.connect(gainNode);
            gainNode.connect(this.sfxGain);
            
            oscillator.start(this.audioContext.currentTime + i * 0.08);
            oscillator.stop(this.audioContext.currentTime + i * 0.08 + 0.15);
        });
    }

    // 播放BOSS出场飞过音效
    playBossFlyby() {
        if (!this.audioContext || this.muted) return;
        
        // 战斗机引擎声 - 低频轰鸣
        const engine = this.audioContext.createOscillator();
        const engineGain = this.audioContext.createGain();
        const engineFilter = this.audioContext.createBiquadFilter();
        
        engine.type = 'sawtooth';
        engine.frequency.setValueAtTime(60, this.audioContext.currentTime);
        engine.frequency.linearRampToValueAtTime(100, this.audioContext.currentTime + 1.5);
        engine.frequency.linearRampToValueAtTime(40, this.audioContext.currentTime + 3.0);
        
        engineFilter.type = 'lowpass';
        engineFilter.frequency.setValueAtTime(300, this.audioContext.currentTime);
        
        // 音量由远及近再远（多普勒效果）
        engineGain.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        engineGain.gain.linearRampToValueAtTime(0.6, this.audioContext.currentTime + 1.5);
        engineGain.gain.linearRampToValueAtTime(0.05, this.audioContext.currentTime + 3.0);
        
        engine.connect(engineFilter);
        engineFilter.connect(engineGain);
        engineGain.connect(this.sfxGain);
        
        // 喷气声 - 噪音层
        const bufferSize = this.audioContext.sampleRate * 3.0;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            const progress = i / bufferSize;
            const envelope = Math.sin(progress * Math.PI); // 中间大两边小
            data[i] = (Math.random() * 2 - 1) * envelope * 0.3;
        }
        
        const jet = this.audioContext.createBufferSource();
        const jetFilter = this.audioContext.createBiquadFilter();
        const jetGain = this.audioContext.createGain();
        
        jet.buffer = buffer;
        jetFilter.type = 'bandpass';
        jetFilter.frequency.setValueAtTime(500, this.audioContext.currentTime);
        jetFilter.Q.value = 2;
        
        jetGain.gain.setValueAtTime(0.4, this.audioContext.currentTime);
        
        jet.connect(jetFilter);
        jetFilter.connect(jetGain);
        jetGain.connect(this.sfxGain);
        
        // 启动音效
        engine.start();
        engine.stop(this.audioContext.currentTime + 3.0);
        jet.start();
        jet.stop(this.audioContext.currentTime + 3.0);
    }

    // 播放闪电技能音效
    playLightning() {
        if (!this.audioContext || this.muted) return;
        
        // 主闪电声 - 高频噪音
        const bufferSize = this.audioContext.sampleRate * 0.5;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
        }
        
        const noise = this.audioContext.createBufferSource();
        const noiseFilter = this.audioContext.createBiquadFilter();
        const noiseGain = this.audioContext.createGain();
        
        noise.buffer = buffer;
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.setValueAtTime(2000, this.audioContext.currentTime);
        
        noiseGain.gain.setValueAtTime(0.6, this.audioContext.currentTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
        
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.sfxGain);
        
        // 雷鸣声 - 低频
        const thunder = this.audioContext.createOscillator();
        const thunderGain = this.audioContext.createGain();
        
        thunder.type = 'sawtooth';
        thunder.frequency.setValueAtTime(80, this.audioContext.currentTime);
        thunder.frequency.exponentialRampToValueAtTime(30, this.audioContext.currentTime + 0.6);
        
        thunderGain.gain.setValueAtTime(0.5, this.audioContext.currentTime);
        thunderGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.6);
        
        thunder.connect(thunderGain);
        thunderGain.connect(this.sfxGain);
        
        // 电流声 - 调制
        const zap = this.audioContext.createOscillator();
        const zapGain = this.audioContext.createGain();
        
        zap.type = 'square';
        zap.frequency.setValueAtTime(1000, this.audioContext.currentTime);
        zap.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.3);
        
        zapGain.gain.setValueAtTime(0.4, this.audioContext.currentTime);
        zapGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
        
        zap.connect(zapGain);
        zapGain.connect(this.sfxGain);
        
        // 启动所有音效
        noise.start();
        noise.stop(this.audioContext.currentTime + 0.5);
        thunder.start();
        thunder.stop(this.audioContext.currentTime + 0.6);
        zap.start();
        zap.stop(this.audioContext.currentTime + 0.3);
    }

    // 开始播放背景音乐 - 紧张战争风格
    playBackgroundMusic() {
        if (!this.audioContext || this.muted || this.bgmPlaying) return;
        
        this.unlockAudio();
        this.bgmPlaying = true;
        
        // 主旋律 - 史诗般的空战主题，参考《1943》和经典街机风格
        const melody = [
            // A段 - 英雄主题（上升旋律）
            { note: 392, duration: 0.3 },  // G4
            { note: 440, duration: 0.3 },  // A4
            { note: 494, duration: 0.4 },  // B4
            { note: 523, duration: 0.2 },  // C5
            { note: 587, duration: 0.6 },  // D5 - 延长
            
            { note: 523, duration: 0.3 },  // C5
            { note: 494, duration: 0.3 },  // B4
            { note: 440, duration: 0.4 },  // A4
            { note: 392, duration: 0.6 },  // G4 - 延长
            
            // B段 - 紧张感递增
            { note: 440, duration: 0.25 }, // A4
            { note: 494, duration: 0.25 }, // B4
            { note: 523, duration: 0.3 },  // C5
            { note: 587, duration: 0.3 },  // D5
            { note: 659, duration: 0.4 },  // E5
            { note: 698, duration: 0.2 },  // F5
            { note: 784, duration: 0.6 },  // G5 - 高潮
            
            // C段 - 回旋主题
            { note: 659, duration: 0.3 },  // E5
            { note: 587, duration: 0.3 },  // D5
            { note: 523, duration: 0.3 },  // C5
            { note: 494, duration: 0.3 },  // B4
            { note: 440, duration: 0.4 },  // A4
            { note: 392, duration: 0.4 },  // G4
            
            // D段 - 尾声过渡
            { note: 523, duration: 0.3 },  // C5
            { note: 659, duration: 0.3 },  // E5
            { note: 587, duration: 0.3 },  // D5
            { note: 523, duration: 0.3 },  // C5
            { note: 494, duration: 0.6 },  // B4
            { note: 440, duration: 0.6 },  // A4
        ];
        
        // 低音 - 有节奏的贝斯线，营造推进感
        const bass = [
            { note: 196, duration: 0.8 },  // G2
            { note: 220, duration: 0.8 },  // A2
            { note: 147, duration: 0.8 },  // D2
            { note: 165, duration: 0.8 },  // E2
            
            { note: 131, duration: 0.8 },  // C2
            { note: 196, duration: 0.8 },  // G2
            { note: 147, duration: 0.8 },  // D2
            { note: 196, duration: 0.8 },  // G2
        ];
        
        this.playMelodyLoop(melody, bass);
    }

    playMelodyLoop(melody, bass) {
        if (!this.bgmPlaying) return;
        
        let time = 0;
        const loopDuration = melody.reduce((sum, note) => sum + note.duration, 0);
        
        // 播放旋律 - 使用三角波和正弦波混合，更加柔和悦耳
        melody.forEach(({ note, duration }) => {
            // 主音色 - 三角波（温暖柔和）
            const oscillator1 = this.audioContext.createOscillator();
            const gainNode1 = this.audioContext.createGain();
            
            oscillator1.type = 'triangle';
            oscillator1.frequency.setValueAtTime(note, this.audioContext.currentTime + time);
            
            // 平滑的音量包络
            gainNode1.gain.setValueAtTime(0, this.audioContext.currentTime + time);
            gainNode1.gain.linearRampToValueAtTime(0.12, this.audioContext.currentTime + time + 0.05);
            gainNode1.gain.exponentialRampToValueAtTime(0.08, this.audioContext.currentTime + time + duration * 0.6);
            gainNode1.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + time + duration);
            
            oscillator1.connect(gainNode1);
            gainNode1.connect(this.musicGain);
            
            oscillator1.start(this.audioContext.currentTime + time);
            oscillator1.stop(this.audioContext.currentTime + time + duration);
            
            // 和声音色 - 正弦波（清澈明亮）
            const oscillator2 = this.audioContext.createOscillator();
            const gainNode2 = this.audioContext.createGain();
            
            oscillator2.type = 'sine';
            oscillator2.frequency.setValueAtTime(note, this.audioContext.currentTime + time);
            
            gainNode2.gain.setValueAtTime(0, this.audioContext.currentTime + time);
            gainNode2.gain.linearRampToValueAtTime(0.06, this.audioContext.currentTime + time + 0.05);
            gainNode2.gain.exponentialRampToValueAtTime(0.03, this.audioContext.currentTime + time + duration * 0.7);
            gainNode2.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + time + duration);
            
            oscillator2.connect(gainNode2);
            gainNode2.connect(this.musicGain);
            
            oscillator2.start(this.audioContext.currentTime + time);
            oscillator2.stop(this.audioContext.currentTime + time + duration);
            
            this.bgmOscillators.push(oscillator1, oscillator2);
            time += duration;
        });
        
        // 播放低音 - 温暖的贝斯，提供节奏支撑
        let bassTime = 0;
        bass.forEach(({ note, duration }) => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.type = 'sine';  // 使用正弦波让低音更圆润
            oscillator.frequency.setValueAtTime(note, this.audioContext.currentTime + bassTime);
            
            // 柔和的低音包络
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime + bassTime);
            gainNode.gain.linearRampToValueAtTime(0.15, this.audioContext.currentTime + bassTime + 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.08, this.audioContext.currentTime + bassTime + duration * 0.5);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + bassTime + duration);
            
            oscillator.connect(gainNode);
            gainNode.connect(this.musicGain);
            
            oscillator.start(this.audioContext.currentTime + bassTime);
            oscillator.stop(this.audioContext.currentTime + bassTime + duration);
            
            this.bgmOscillators.push(oscillator);
            bassTime += duration;
        });
        
        // 添加打击乐效果 - 军鼓节奏
        this.addPercussion(loopDuration);
        
        // 循环播放 - 保存定时器引用以便清理
        this.bgmLoopTimeout = setTimeout(() => {
            if (this.bgmPlaying) {
                this.playMelodyLoop(melody, bass);
            }
        }, loopDuration * 1000);
    }
    
    // 添加打击乐节奏
    addPercussion(loopDuration) {
        const beatInterval = 0.2; // 每0.2秒一个节拍
        const numBeats = Math.floor(loopDuration / beatInterval);
        
        for (let i = 0; i < numBeats; i++) {
            const time = i * beatInterval;
            
            // 军鼓效果
            const bufferSize = this.audioContext.sampleRate * 0.05;
            const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
            const data = buffer.getChannelData(0);
            
            for (let j = 0; j < bufferSize; j++) {
                data[j] = (Math.random() * 2 - 1) * Math.exp(-j / bufferSize * 10);
            }
            
            const noise = this.audioContext.createBufferSource();
            const noiseGain = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();
            
            noise.buffer = buffer;
            filter.type = 'highpass';
            filter.frequency.value = 1000;
            
            // 强拍和弱拍
            const isStrongBeat = i % 4 === 0;
            noiseGain.gain.setValueAtTime(isStrongBeat ? 0.15 : 0.08, this.audioContext.currentTime + time);
            noiseGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + time + 0.05);
            
            noise.connect(filter);
            filter.connect(noiseGain);
            noiseGain.connect(this.musicGain);
            
            noise.start(this.audioContext.currentTime + time);
            noise.stop(this.audioContext.currentTime + time + 0.05);
        }
    }

    // BOSS战专属音乐 - 惊心动魄、战斗爆燃
    playBossBattleMusic() {
        if (!this.audioContext || this.muted || this.bgmPlaying) return;
        
        this.unlockAudio();
        this.bgmPlaying = true;
        
        // BOSS战旋律 - 极快节奏、高度紧张
        const melody = [
            // A段 - 急促警报
            { note: 659, duration: 0.12 },  // E5
            { note: 784, duration: 0.12 },  // G5
            { note: 880, duration: 0.12 },  // A5
            { note: 1047, duration: 0.12 }, // C6
            { note: 880, duration: 0.12 },  // A5
            { note: 784, duration: 0.12 },  // G5
            { note: 659, duration: 0.12 },  // E5
            { note: 784, duration: 0.12 },  // G5
            
            // B段 - 疯狂冲刺
            { note: 988, duration: 0.1 },   // B5
            { note: 880, duration: 0.1 },   // A5
            { note: 988, duration: 0.1 },   // B5
            { note: 1047, duration: 0.15 }, // C6
            { note: 1175, duration: 0.1 },  // D6
            { note: 1047, duration: 0.1 },  // C6
            { note: 988, duration: 0.15 },  // B5
            { note: 880, duration: 0.1 },   // A5
            
            // C段 - 极限爆发
            { note: 1319, duration: 0.08 }, // E6
            { note: 1175, duration: 0.08 }, // D6
            { note: 1047, duration: 0.08 }, // C6
            { note: 988, duration: 0.08 },  // B5
            { note: 880, duration: 0.08 },  // A5
            { note: 784, duration: 0.08 },  // G5
            { note: 880, duration: 0.12 },  // A5
            { note: 1047, duration: 0.12 }, // C6
            
            // D段 - 紧张持续
            { note: 784, duration: 0.1 },   // G5
            { note: 880, duration: 0.1 },   // A5
            { note: 988, duration: 0.1 },   // B5
            { note: 880, duration: 0.1 },   // A5
            { note: 784, duration: 0.1 },   // G5
            { note: 659, duration: 0.15 },  // E5
            { note: 784, duration: 0.15 },  // G5
            { note: 880, duration: 0.2 },   // A5
        ];
        
        // BOSS战低音 - 暴力脉动
        const bass = [
            { note: 165, duration: 0.2 },  // E2
            { note: 165, duration: 0.2 },  // E2
            { note: 131, duration: 0.2 },  // C2
            { note: 131, duration: 0.2 },  // C2
            { note: 147, duration: 0.2 },  // D2
            { note: 147, duration: 0.2 },  // D2
            { note: 110, duration: 0.2 },  // A1
            { note: 110, duration: 0.2 },  // A1
        ];
        
        this.playBossBattleMelodyLoop(melody, bass);
    }
    
    // BOSS战音乐循环 - 特殊强化版本
    playBossBattleMelodyLoop(melody, bass) {
        if (!this.bgmPlaying) return;
        
        let time = 0;
        const loopDuration = melody.reduce((sum, note) => sum + note.duration, 0);
        
        // 播放旋律 - 使用锯齿波和方波，制造刺耳紧张感
        melody.forEach(({ note, duration }) => {
            // 主音色 - 锯齿波（锐利、刺激）
            const oscillator1 = this.audioContext.createOscillator();
            const gainNode1 = this.audioContext.createGain();
            
            oscillator1.type = 'sawtooth';
            oscillator1.frequency.setValueAtTime(note, this.audioContext.currentTime + time);
            
            // 强力的音量包络
            gainNode1.gain.setValueAtTime(0, this.audioContext.currentTime + time);
            gainNode1.gain.linearRampToValueAtTime(0.18, this.audioContext.currentTime + time + 0.02);
            gainNode1.gain.exponentialRampToValueAtTime(0.12, this.audioContext.currentTime + time + duration * 0.5);
            gainNode1.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + time + duration);
            
            oscillator1.connect(gainNode1);
            gainNode1.connect(this.musicGain);
            
            oscillator1.start(this.audioContext.currentTime + time);
            oscillator1.stop(this.audioContext.currentTime + time + duration);
            
            // 和声音色 - 方波（金属感）
            const oscillator2 = this.audioContext.createOscillator();
            const gainNode2 = this.audioContext.createGain();
            
            oscillator2.type = 'square';
            oscillator2.frequency.setValueAtTime(note * 1.01, this.audioContext.currentTime + time); // 略微失谐
            
            gainNode2.gain.setValueAtTime(0, this.audioContext.currentTime + time);
            gainNode2.gain.linearRampToValueAtTime(0.1, this.audioContext.currentTime + time + 0.02);
            gainNode2.gain.exponentialRampToValueAtTime(0.05, this.audioContext.currentTime + time + duration * 0.6);
            gainNode2.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + time + duration);
            
            oscillator2.connect(gainNode2);
            gainNode2.connect(this.musicGain);
            
            oscillator2.start(this.audioContext.currentTime + time);
            oscillator2.stop(this.audioContext.currentTime + time + duration);
            
            // 颤音层 - 增加紧张感
            const vibrato = this.audioContext.createOscillator();
            const vibratoGain = this.audioContext.createGain();
            
            vibrato.type = 'sine';
            vibrato.frequency.setValueAtTime(note * 2, this.audioContext.currentTime + time);
            
            vibratoGain.gain.setValueAtTime(0, this.audioContext.currentTime + time);
            vibratoGain.gain.linearRampToValueAtTime(0.06, this.audioContext.currentTime + time + 0.02);
            vibratoGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + time + duration);
            
            vibrato.connect(vibratoGain);
            vibratoGain.connect(this.musicGain);
            
            vibrato.start(this.audioContext.currentTime + time);
            vibrato.stop(this.audioContext.currentTime + time + duration);
            
            this.bgmOscillators.push(oscillator1, oscillator2, vibrato);
            time += duration;
        });
        
        // 播放低音 - 暴力重低音
        let bassTime = 0;
        bass.forEach(({ note, duration }) => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            const distortion = this.audioContext.createWaveShaper();
            
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(note, this.audioContext.currentTime + bassTime);
            
            // 失真效果
            const curve = new Float32Array(256);
            for (let i = 0; i < 256; i++) {
                const x = (i - 128) / 128;
                curve[i] = Math.tanh(x * 2); // 轻微失真
            }
            distortion.curve = curve;
            
            // 强力低音包络
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime + bassTime);
            gainNode.gain.linearRampToValueAtTime(0.25, this.audioContext.currentTime + bassTime + 0.02);
            gainNode.gain.exponentialRampToValueAtTime(0.15, this.audioContext.currentTime + bassTime + duration * 0.3);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + bassTime + duration);
            
            oscillator.connect(distortion);
            distortion.connect(gainNode);
            gainNode.connect(this.musicGain);
            
            oscillator.start(this.audioContext.currentTime + bassTime);
            oscillator.stop(this.audioContext.currentTime + bassTime + duration);
            
            this.bgmOscillators.push(oscillator);
            bassTime += duration;
        });
        
        // 添加战斗打击乐 - 更加密集
        this.addBossBattlePercussion(loopDuration);
        
        // 添加紧张气氛层
        this.addTensionLayer(loopDuration);
        
        // 循环播放
        this.bgmLoopTimeout = setTimeout(() => {
            if (this.bgmPlaying) {
                this.playBossBattleMelodyLoop(melody, bass);
            }
        }, loopDuration * 1000);
    }
    
    // 添加BOSS战打击乐 - 超密集节奏
    addBossBattlePercussion(loopDuration) {
        const beatInterval = 0.1; // 每0.1秒一个节拍（双倍密度）
        const numBeats = Math.floor(loopDuration / beatInterval);
        
        for (let i = 0; i < numBeats; i++) {
            const time = i * beatInterval;
            
            // 强力军鼓
            const bufferSize = this.audioContext.sampleRate * 0.04;
            const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
            const data = buffer.getChannelData(0);
            
            for (let j = 0; j < bufferSize; j++) {
                data[j] = (Math.random() * 2 - 1) * Math.exp(-j / bufferSize * 8);
            }
            
            const noise = this.audioContext.createBufferSource();
            const noiseGain = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();
            
            noise.buffer = buffer;
            filter.type = 'highpass';
            filter.frequency.value = 1500;
            
            // 强拍和弱拍
            const isStrongBeat = i % 4 === 0;
            const isAccent = i % 8 === 0;
            const volume = isAccent ? 0.25 : (isStrongBeat ? 0.18 : 0.1);
            
            noiseGain.gain.setValueAtTime(volume, this.audioContext.currentTime + time);
            noiseGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + time + 0.04);
            
            noise.connect(filter);
            filter.connect(noiseGain);
            noiseGain.connect(this.musicGain);
            
            noise.start(this.audioContext.currentTime + time);
            noise.stop(this.audioContext.currentTime + time + 0.04);
            
            // 底鼓 - 每4拍一次
            if (i % 4 === 0) {
                const kick = this.audioContext.createOscillator();
                const kickGain = this.audioContext.createGain();
                
                kick.type = 'sine';
                kick.frequency.setValueAtTime(80, this.audioContext.currentTime + time);
                kick.frequency.exponentialRampToValueAtTime(30, this.audioContext.currentTime + time + 0.08);
                
                kickGain.gain.setValueAtTime(0.3, this.audioContext.currentTime + time);
                kickGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + time + 0.08);
                
                kick.connect(kickGain);
                kickGain.connect(this.musicGain);
                
                kick.start(this.audioContext.currentTime + time);
                kick.stop(this.audioContext.currentTime + time + 0.08);
            }
        }
    }
    
    // 添加紧张气氛层
    addTensionLayer(loopDuration) {
        // 持续的紧张底噪
        const bufferSize = this.audioContext.sampleRate * loopDuration;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            // 低频脉动噪音
            const pulse = Math.sin(i / this.audioContext.sampleRate * 8 * Math.PI);
            data[i] = (Math.random() * 2 - 1) * pulse * 0.1;
        }
        
        const tension = this.audioContext.createBufferSource();
        const tensionFilter = this.audioContext.createBiquadFilter();
        const tensionGain = this.audioContext.createGain();
        
        tension.buffer = buffer;
        tensionFilter.type = 'lowpass';
        tensionFilter.frequency.setValueAtTime(200, this.audioContext.currentTime);
        tensionFilter.Q.value = 5;
        
        tensionGain.gain.setValueAtTime(0.15, this.audioContext.currentTime);
        
        tension.connect(tensionFilter);
        tensionFilter.connect(tensionGain);
        tensionGain.connect(this.musicGain);
        
        tension.start(this.audioContext.currentTime);
        tension.stop(this.audioContext.currentTime + loopDuration);
        
        this.bgmOscillators.push(tension);
    }
    
    // 停止背景音乐
    stopBackgroundMusic() {
        this.bgmPlaying = false;
        
        // 清除循环定时器
        if (this.bgmLoopTimeout) {
            clearTimeout(this.bgmLoopTimeout);
            this.bgmLoopTimeout = null;
        }
        
        // 停止所有音频振荡器
        this.bgmOscillators.forEach(osc => {
            try {
                osc.stop();
            } catch (e) {
                // 忽略已经停止的振荡器
            }
        });
        this.bgmOscillators = [];
    }

    // 切换静音
    toggleMute() {
        this.muted = !this.muted;
        if (this.muted) {
            this.stopBackgroundMusic();
            this.masterGain.gain.value = 0;
        } else {
            this.masterGain.gain.value = 0.3;
            this.playBackgroundMusic();
        }
        return this.muted;
    }
}
