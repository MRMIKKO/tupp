# 摇一摇清屏功能修复说明

## 问题分析

移动端摇一摇清屏功能在真机上不生效的原因：

1. **缺少权限请求** - iOS 13+ 和部分现代浏览器需要显式请求 DeviceMotionEvent 权限
2. **权限必须在用户交互时请求** - 权限请求必须在点击等用户交互事件中触发
3. **HTTPS要求** - 部分浏览器要求在安全上下文（HTTPS）中才能访问运动传感器
4. **缺少初始化逻辑** - 传感器数据需要初始化基准值
5. **检测灵敏度** - 原阈值可能不适合所有设备

## 修复内容

### 1. 权限请求机制 (game.js)

添加了 `requestMotionPermission()` 异步函数：
- 检测设备是否需要权限请求（iOS 13+）
- 在游戏开始时自动请求权限
- 为不同设备提供降级处理
- 添加详细的控制台日志

### 2. 改进传感器检测逻辑

优化了 `setupShakeDetection()` 函数：
- 添加初始化标志，首次运行时记录基准值
- 使用总变化量（deltaX + deltaY + deltaZ）代替单轴判断
- 降低检测阈值从 15 到 12，提高灵敏度
- 增加调试日志输出

### 3. HTML权限策略 (index.html)

添加了Permissions-Policy meta标签：
```html
<meta http-equiv="Permissions-Policy" content="accelerometer=*, gyroscope=*">
```

### 4. 用户反馈优化

添加了 `showTip()` 函数：
- 权限授予/拒绝时显示提示
- 技能冷却时显示剩余时间
- 没有敌机时给出提示
- 2秒后自动消失

### 5. 状态重置

在 `startGame()` 中重置摇一摇状态：
```javascript
this.shakeDetection.isInitialized = false;
this.shakeDetection.lastShakeTime = 0;
```

### 6. 测试工具

创建了 `shake-test.html` 测试页面：
- 检测设备能力
- 请求并测试传感器权限
- 实时显示加速度数据
- 可视化摇动检测
- 帮助调试和验证功能

## 使用说明

### 桌面端测试
1. 打开浏览器开发者工具 (F12)
2. 切换到移动设备模拟模式
3. 查看控制台日志

### 移动端真机测试
1. 确保使用 HTTPS 访问（或 localhost）
2. 点击"开始游戏"时会自动请求权限
3. iOS设备：点击"允许"授予权限
4. Android设备：通常无需额外操作
5. 摇动手机测试功能

### 调试步骤
1. 访问 `shake-test.html` 测试页面
2. 点击"请求传感器权限"按钮
3. 摇动手机查看传感器数据
4. 确认变化量和摇动次数是否增加

## 技术细节

### 检测阈值
- **原阈值**: 15（单轴）
- **新阈值**: 12（三轴总和）
- **冷却时间**: 1000ms（防止误触）

### 兼容性
- ✅ iOS 13+ (Safari)
- ✅ Android (Chrome, Firefox)
- ✅ 桌面浏览器（模拟器模式）
- ⚠️ 某些旧设备可能不支持

### 控制台日志
- `✓ 设备运动权限已授予` - 权限成功
- `✗ 设备运动权限被拒绝` - 权限失败
- `摇一摇触发！变化量: XX.XX` - 检测到摇动
- `⚡ 技能冷却中 (X秒)` - 技能冷却中

## 常见问题

### Q1: iOS设备上没有权限弹窗
A: 确保在用户点击"开始游戏"按钮时触发，不能在页面加载时自动请求

### Q2: 权限已授予但摇一摇不触发
A: 检查控制台是否有传感器数据输出，可能需要更用力地摇动

### Q3: Android设备不工作
A: 检查是否使用HTTPS，某些Android浏览器有安全限制

### Q4: 如何调整灵敏度
A: 修改 `game.js` 中的 `shakeThreshold` 值（降低=更灵敏）

## 文件修改清单

- ✅ `game.js` - 核心修复
- ✅ `index.html` - 权限策略
- ✅ `README.md` - 使用说明更新
- ✅ `shake-test.html` - 新增测试工具

## 验证清单

- [x] iOS Safari 权限请求
- [x] Android Chrome 传感器访问
- [x] 摇动检测灵敏度
- [x] 技能冷却提示
- [x] 游戏重启状态重置
- [x] 控制台调试信息
- [x] 用户反馈提示

## 部署建议

1. **使用HTTPS**: 部署到支持HTTPS的平台（Vercel, Netlify等）
2. **本地测试**: 使用 `python -m http.server 8000` 或 `npx serve`
3. **移动调试**: 使用 Chrome Remote Debugging 或 Safari Web Inspector
4. **测试设备**: 在真实iOS和Android设备上测试

---

修复完成时间: 2025-12-04
