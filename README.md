# NYU 选课助手

NYU Shanghai Study Away 选课智能助手。

## 功能

- AI 对话选课建议
- 成绩单图片识别
- 课程搜索与查询
- 学生档案管理
- 等价课程查询
- 专业要求与 Core Curriculum 检查

## 本地开发

```bash
npm install
npm run dev
```

访问 http://localhost:3000

## 环境变量

创建 `.env.local`:

```env
QWEN_API_KEY=your_qwen_key
```

API Key 可在阿里云 DashScope 控制台获取。

## 数据文件

- `data/courses_complete.json` - 课程数据
- `data/equivalencies.json` - 等价课程
- `data/satisfying_courses.json` - 满足学位要求的课程
- `data/study_away_rules_complete.json` - Study Away 选课规则
- `data/shanghai_major_requirements.json` - 专业与 Core 要求
