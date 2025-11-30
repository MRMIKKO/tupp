# WWII Plane Shooter Game

一款经典的二战题材FG射击游戏，支持桌面和移动设备。

## 游戏特色

- 🎮 支持键盘和触摸屏操作
- ✈️ 多种二战战斗机类型（零式、Me-109、喷火、斯图卡）
- ⚡ 闪电清屏技能
- 🎵 8位复古风格背景音乐和音效
- 📱 完美支持移动端

## 操作说明

### 桌面端
- WASD / 方向键：移动FG
- 空格键：射击
- K键：释放闪电技能（冷却时间10秒）
- M键：静音/取消静音

### 移动端
- 触摸屏幕：移动FG（FG跟随手指）
- 自动射击
- 点击右下角按钮：释放闪电技能

## 本地运行

直接在浏览器中打开 `index.html` 文件即可开始游戏。

或使用本地服务器：
```bash
# Python 3
python3 -m http.server 8000

# 然后访问 http://localhost:8000
```

## 在线部署

### 方式一：使用 Netlify Drop（最简单）
1. 访问 https://app.netlify.com/drop
2. 将整个 games 文件夹拖入页面
3. 获得部署链接

### 方式二：使用 GitHub Pages
1. 创建 GitHub 仓库
2. 推送代码
3. 在仓库设置中启用 GitHub Pages

### 方式三：使用 Vercel
1. 访问 https://vercel.com
2. 导入项目
3. 一键部署

## 技术栈

- HTML5 Canvas
- 原生 JavaScript (ES6+)
- Web Audio API
- CSS3 动画

## 游戏截图

享受游戏吧！✈️💥
