# NYU Course Assistant - 启动指南

## 快速启动

### 方法1：命令行
```bash
cd C:\Users\LeeYb\Desktop\选课\nyu-course-assistant
npm run dev
```

### 方法2：运行脚本
```bash
bash C:\Users\LeeYb\Desktop\选课\nyu-course-assistant\start.sh
```

### 方法3：双击（Windows）
在文件夹里双击 `start.sh`（如果安装了 Git Bash）

---

## 访问地址

启动后打开浏览器访问：
```
http://localhost:3000
```

---

## 停止服务

在终端按 `Ctrl + C`

---

## 环境要求

确保已配置：
```bash
# .env.local 文件
DEEPSEEK_API_KEY=your_api_key_here
```

---

## 故障排查

### 端口被占用
```bash
# 查找占用端口的进程
netstat -ano | findstr :3000

# 杀掉进程（替换 PID）
taskkill /PID <进程ID> /F
```

### 依赖缺失
```bash
npm install
```

### API Key 未配置
检查 `.env.local` 文件是否存在且包含 `DEEPSEEK_API_KEY`
