# 新旧版本工作方式对比

## 启动方式（完全相同）

### 旧版和新版都只需要：
```bash
cd C:\Users\LeeYb\Desktop\选课\nyu-course-assistant
npm run dev
```

**不需要额外的后端服务！**

---

## 架构对比

### 旧版（Intent Planning）
```
浏览器
  ↓ HTTP
Next.js Server (localhost:3000)
  ├─ /api/chat (route.ts)
  │   ├─ 1. AI 判断意图 → DeepSeek API
  │   ├─ 2. 你的代码决定调用工具
  │   ├─ 3. /api/tools 执行工具（读本地 JSON）
  │   └─ 4. AI 生成回复 → DeepSeek API
  └─ /api/tools (tools/route.ts)
      └─ 读取 data/*.json
```

### 新版（Native Function Calling）
```
浏览器
  ↓ HTTP
Next.js Server (localhost:3000)
  ├─ /api/chat (route.ts)
  │   ├─ 1. AI 自己决定调用工具 → DeepSeek API
  │   ├─ 2. /api/tools 执行工具（读本地 JSON）
  │   ├─ 3. 把结果返回给 AI → DeepSeek API
  │   └─ 4. AI 决定继续调用 or 生成回复
  └─ /api/tools (tools/route.ts)
      └─ 读取 data/*.json
```

**唯一区别：AI 调用次数可能更多（循环决策）**

---

## 工作流程对比

### 用户问："我能上 CSCI-UA 473 吗？"

#### 旧版流程
```
1. 浏览器 → POST /api/chat
2. route.ts:
   - AI 判断意图 → "course_access"
   - 你的代码: if (intent === 'course_access') {
       调用 /api/tools (get_student_profile)
       调用 /api/tools (check_prerequisites)
     }
   - AI 生成回复
3. 返回浏览器
```

**AI 调用次数**: 2次（判断意图 + 生成回复）
**工具调用**: 你的代码决定

#### 新版流程
```
1. 浏览器 → POST /api/chat
2. route.ts:
   第1轮:
   - AI 决定 → "调用 get_student_profile"
   - 执行 /api/tools (get_student_profile)
   
   第2轮:
   - AI 看到结果 → "调用 check_prerequisites"
   - 执行 /api/tools (check_prerequisites)
   
   第3轮:
   - AI 看到结果 → "生成回复"
3. 返回浏览器
```

**AI 调用次数**: 3次（每轮决策）
**工具调用**: AI 自己决定

---

## 关键区别

| 维度 | 旧版 | 新版 |
|------|------|------|
| **启动方式** | `npm run dev` | `npm run dev` |
| **后端服务** | 只需要 Next.js | 只需要 Next.js |
| **端口** | 3000 | 3000 |
| **AI 调用次数** | 2次/请求 | 3-5次/请求 |
| **决策者** | 你的代码 | AI |
| **代码量** | 600行 | 200行 |

---

## 你不需要额外启动的东西

❌ **不需要 Flask 后端**（你之前的 Study Away Advisor V2 需要）
❌ **不需要 Python 服务**
❌ **不需要端口 5002**
❌ **不需要数据库**

✅ **只需要 Next.js**（端口 3000）
✅ **工具执行在 Next.js 内部**（/api/tools）
✅ **数据存在本地 JSON**（data/*.json）

---

## 为什么不需要额外后端？

### Next.js 的 API Routes 就是后端

```typescript
// app/api/chat/route.ts
export async function POST(request: Request) {
  // 这就是后端代码，运行在 Node.js 服务器
  const result = await callTool(...);
  return NextResponse.json(result);
}

// app/api/tools/route.ts
export async function POST(request: Request) {
  // 这也是后端代码，读取本地 JSON
  const data = JSON.parse(fs.readFileSync('data/courses.json'));
  return NextResponse.json(data);
}
```

**Next.js = 前端 + 后端一体化**

---

## 对比你之前的项目

### Study Away Advisor V2（需要两个服务）
```
前端: HTML + JavaScript
后端: Flask (Python) 端口 5002
  └─ course_query_api.py

启动：
1. python course_query_api.py  # 启动 Flask
2. 打开 AI_Advisor_Final.html  # 打开前端
```

### NYU Course Assistant（只需要一个服务）
```
前端 + 后端: Next.js 端口 3000
  ├─ app/page.tsx (前端)
  └─ app/api/*/route.ts (后端)

启动：
1. npm run dev  # 前后端一起启动
2. 打开 http://localhost:3000
```

---

## 总结

### 启动方式
**旧版和新版完全相同**：
```bash
npm run dev
```

### 工作方式
- **旧版**: AI 判断意图 → 你的代码调用工具 → AI 生成回复
- **新版**: AI 自己决定调用工具 → 循环直到 AI 满意 → 生成回复

### 后端服务
**都不需要额外的后端**，Next.js 自带后端功能。

### 唯一区别
**新版 AI 调用次数更多**（因为 AI 自己决策），但用户体验和启动方式完全一样。
