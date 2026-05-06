# Demo演示查询 - 体现AI原生优势

## Query 1: 主动发现工作量过载 + 座位风险（核心Demo）

**用户输入**：
```
帮我生成Fall 2026去纽约的课表，我想上ML、CV、NLP、线性代数
```

**AI行为**（3-5次迭代）：
1. 调用 `generate_personalized_schedule` → 生成4门课课表
2. 调用 `estimate_workload` → **主动发现**工作量55小时/周（过载）
3. 调用 `get_course_history` (ML) → **主动发现**座位风险高（选上概率20%）
4. 调用 `suggest_backup_courses` → 推荐备选方案

**展示亮点**：
- ✅ **AI主动预警**：用户没问工作量，AI自己发现了
- ✅ **AI主动预警**：用户没问座位，AI自己查了历史数据
- ✅ **完整方案**：不只是课表，还有风险分析 + 备选方案 + 选课时间建议
- ✅ **可见推理**：左侧面板显示AI的每一步思考

**对比传统系统**：
- ❌ 传统系统：只返回课表，不会主动检查工作量和座位
- ❌ 需要用户追问："这个课表会不会太累？" "ML能选上吗？"
- ❌ 4次对话才能得到完整信息

---

## Query 2: 主动发现Minor机会（体现全局规划）

**用户输入**：
```
我还需要上什么课才能毕业？
```

**AI行为**（4-6次迭代）：
1. 调用 `get_student_profile` → 获取已修课程
2. 调用 `detect_minor_opportunities` → **主动发现**已修2门IMA课，可完成IMA Minor
3. 调用 `get_major_requirements` → 检查专业要求
4. 调用 `find_requirement_courses` (Core) → 查找Core课程缺口
5. 生成完整建议：2门CS + 1门Science Core + 1门IMA（完成Minor）

**展示亮点**：
- ✅ **AI主动发现机会**：用户不知道自己可以完成Minor，AI发现了
- ✅ **全局规划**：不只是专业课，还考虑Core要求和Minor机会
- ✅ **一次性给出完整方案**：16学分，平衡专业/Core/Minor

**对比传统系统**：
- ❌ 传统系统：只列出专业课缺口，不会检测Minor机会
- ❌ 用户需要自己去查："我能不能完成IMA Minor？"

---

## Query 3: 智能先修课桥接计划（解决复杂依赖）

**用户输入**：
```
我想上CSCI-UA 473 (Machine Learning)，但我没上过先修课，怎么办？
```

**AI行为**（2-3次迭代）：
1. 调用 `evaluate_course_access_with_plan` → 检查先修课
2. **主动生成桥接计划**：
   - Fall 2026: CSCI-UA 201 (Computer Systems)
   - Spring 2027: CSCI-UA 310 (Basic Algorithms)
   - Fall 2027: CSCI-UA 473 (Machine Learning) ✅

**展示亮点**：
- ✅ **AI自动规划路径**：不只是说"你缺先修课"，而是给出完整的3学期计划
- ✅ **考虑等效课**：自动识别上海课程等效纽约课程
- ✅ **时间线可视化**：清晰的学期规划图

**对比传统系统**：
- ❌ 传统系统：只显示"Prerequisites not met"
- ❌ 用户需要自己查："我要先上什么课？" "那门课又要先上什么？"

---

## Query 4: 社区评价 + 教授信息整合（信息聚合）

**用户输入**：
```
CSCI-UA 480这门课怎么样？难不难？
```

**AI行为**（2次迭代）：
1. 调用 `get_community_reviews` → 获取学长学姐评价
2. 调用 `get_professor_info` → 获取教授信息

**AI输出**：
```
📊 CSCI-UA 480 (Machine Learning)

⭐ 社区评价（基于15条真实评价）：
- 难度：4.5/5（较难）
- 工作量：12小时/周
- 推荐度：4.8/5

💬 学长学姐说：
"Project很有挑战，但学到很多。建议有扎实的线性代数和Python基础"
"Prof. Chen讲得很清楚，但作业量大，期末Project要提前规划"

👨‍🏫 教授信息：
- Prof. Chen
- 评分：4.7/5
- 教学风格：理论+实践结合，注重Project
- 研究方向：Deep Learning, Computer Vision

⚠️ 建议：
- 确保已掌握线性代数和概率论
- 预留每周12小时学习时间
- 提前组队（Project需要3-4人）
```

**展示亮点**：
- ✅ **信息聚合**：一次查询得到评价+教授+建议
- ✅ **真实数据**：不是AI编的，是真实学生评价
- ✅ **可操作建议**：不只是信息，还有行动建议

**对比传统系统**：
- ❌ 需要打开3个网页：RateMyProfessor + 微信群 + Albert
- ❌ 信息分散，需要自己整合

---

## Query 5: 对比多门课程（决策支持）

**用户输入**：
```
CSCI-UA 473 (CV)和CSCI-UA 467 (NLP)哪个更适合我？我想做AI产品经理
```

**AI行为**（2次迭代）：
1. 调用 `get_student_profile` → 了解背景
2. 调用 `compare_courses` → 多维度对比

**AI输出**：
```
📊 课程对比：CV vs NLP

| 维度 | CSCI-UA 473 (CV) | CSCI-UA 467 (NLP) |
|------|------------------|-------------------|
| 难度 | 4.2/5 | 3.8/5 ⭐ |
| 工作量 | 11小时/周 | 10小时/周 ⭐ |
| 座位 | 5个空位（紧张） | 12个空位（充足）⭐ |
| 职业相关性 | 图像识别、自动驾驶 | 对话系统、AI助手 ⭐ |
| Project类型 | 图像分类、目标检测 | 聊天机器人、文本生成 ⭐ |

💡 推荐：**CSCI-UA 467 (NLP)**

理由：
1. ✅ 更符合AI产品经理方向（对话系统、AI助手）
2. ✅ 难度适中，工作量更轻
3. ✅ 座位充足，选上概率95%
4. ✅ Project更贴近产品场景（聊天机器人）

⚠️ 但如果你对计算机视觉感兴趣，CV也是不错的选择，只是座位竞争激烈。
```

**展示亮点**：
- ✅ **个性化推荐**：基于用户职业目标（AI产品经理）
- ✅ **多维度对比**：难度/工作量/座位/职业相关性
- ✅ **清晰的决策建议**：不只是对比，还给出推荐和理由

**对比传统系统**：
- ❌ 需要手动查询每门课的信息
- ❌ 需要自己对比和决策
- ❌ 不考虑职业目标

---

## Demo演示顺序建议

### 3分钟完整Demo流程：

**0:00-0:30 开场**
- 展示传统选课流程：打开10个网页，Excel表格，反复查询
- 问题：信息过载，决策困难，风险不可预测

**0:30-1:30 核心Demo（Query 1）**
- 用户："帮我生成Fall 2026去纽约的课表，我想上ML、CV、NLP、线性代数"
- 展示AI推理过程（左侧面板实时滚动）
- AI主动发现工作量过载 + 座位风险
- 输出完整方案（课表 + 风险预警 + 备选方案）
- **旁白**："看，AI不是被动回答，而是主动思考、发现问题、给出方案"

**1:30-2:00 Minor机会检测（Query 2）**
- 用户："我还需要上什么课才能毕业？"
- AI发现IMA Minor机会
- **旁白**："AI不只是回答问题，还能发现你没想到的机会"

**2:00-2:30 先修课桥接（Query 3）**
- 用户："我想上ML，但没上过先修课"
- AI生成3学期桥接计划
- **旁白**："AI不只是说'你不能选'，而是告诉你'怎么才能选'"

**2:30-3:00 结尾**
- 展示架构图：AI Agent原生架构
- 核心创新：ReAct模式（推理+行动+反思）
- 28个工具动态编排
- GitHub + Demo链接

---

## 快速测试命令（开发用）

```bash
# Query 1
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"帮我生成Fall 2026去纽约的课表，我想上ML、CV、NLP、线性代数"}]}'

# Query 2
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"我还需要上什么课才能毕业？"}]}'

# Query 3
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"我想上CSCI-UA 473，但我没上过先修课，怎么办？"}]}'

# Query 4
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"CSCI-UA 480这门课怎么样？难不难？"}]}'

# Query 5
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"CSCI-UA 473和CSCI-UA 467哪个更适合我？我想做AI产品经理"}]}'
```

---

## 前端展示优化建议

### 1. 添加"Demo模式"按钮
```typescript
const DEMO_QUERIES = [
  "帮我生成Fall 2026去纽约的课表，我想上ML、CV、NLP、线性代数",
  "我还需要上什么课才能毕业？",
  "我想上CSCI-UA 473，但我没上过先修课，怎么办？",
  "CSCI-UA 480这门课怎么样？难不难？",
  "CSCI-UA 473和CSCI-UA 467哪个更适合我？我想做AI产品经理"
];

// 添加快捷按钮
<div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
  {DEMO_QUERIES.map((query, i) => (
    <button
      key={i}
      onClick={() => setInput(query)}
      style={{
        padding: '6px 12px',
        background: '#f0f0f0',
        border: '1px solid #ddd',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '12px'
      }}
    >
      Demo {i + 1}
    </button>
  ))}
</div>
```

### 2. 高亮关键发现
在AI回复中自动高亮：
- ⚠️ 工作量过载
- ⚠️ 座位风险
- 💡 Minor机会
- ✅ 推荐方案

### 3. 添加"对比模式"
左右分屏：
- 左边：传统方式（打开多个网页截图）
- 右边：AI Agent（一次性完成）

---

这5个Query覆盖了所有核心痛点和AI原生优势，适合3分钟Demo展示。
