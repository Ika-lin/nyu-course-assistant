# NYU Course Assistant - AI原生选课系统

NYU Shanghai Study Away 选课智能助手，基于AI Agent原生架构。

## 在线Demo

🔗 **https://nyu-course-assistant-iyfia3l96-yl13132-6607s-projects.vercel.app**

## 功能特性

- 🤖 AI Agent自主推理（ReAct模式）
- 📊 个性化课表生成
- ⚠️ 工作量评估与座位风险预测
- 💡 Minor机会自动检测
- 🔍 28个工具动态编排
- 📈 可视化AI推理过程

## 本地开发

```bash
npm install
npm run dev
```

访问 http://localhost:3000

## 环境变量

创建 `.env.local`:

```env
DEEPSEEK_API_KEY=your_deepseek_key
```

API Key 可在 [DeepSeek平台](https://platform.deepseek.com) 获取。

## 技术栈

- **前端**: Next.js 14 + TypeScript + React
- **AI**: DeepSeek API + Function Calling
- **部署**: Vercel
- **架构**: AI Agent原生（28个工具动态编排）

## 数据文件

- `data/courses_complete.json` - 1500+门课程数据
- `data/equivalencies.json` - 等价课程映射
- `data/satisfying_courses.json` - 满足学位要求的课程
- `data/study_away_rules_complete.json` - Study Away选课规则
- `data/shanghai_major_requirements.json` - 专业与Core要求

## 项目文档

- [产品说明文档](docs/PCG_说明文档.md)
- [AI原生架构分析](docs/ai-native-analysis.md)
- [Demo演示脚本](docs/demo-queries.md)
