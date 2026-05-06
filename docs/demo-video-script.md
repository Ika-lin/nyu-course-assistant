# Demo视频脚本（3分钟）- AI Agent原生架构

## 视频结构

**总时长**：3分钟
**核心主题**：展示AI Agent自主推理过程

---

## 开场（20秒）

### 画面：分屏对比

**左边：传统AI助手（Harness架构）**
```
用户："帮我生成课表"
AI：[调用1个工具] 返回课表
用户："这个课表会不会太累？"
AI：[调用1个工具] 工作量适中
用户："ML能选上吗？"
AI：[调用1个工具] 座位已满
用户："有什么备选吗？"
AI：[调用1个工具] 推荐NLP

→ 4次对话，4个工具调用
```

**右边：AI Agent（你的系统）**
```
用户："帮我生成课表"
AI：[自主推理7步]
  1. 获取背景
  2. 检查要求
  3. 生成课表
  4. 评估工作量 → 发现过载
  5. 查询风险 → 发现ML风险高
  6. 推荐备选
  7. 生成完整建议

→ 1次对话，7个工具调用，主动发现3个问题
```

### 旁白
```
"传统AI助手：你问，它答（Harness架构）
AI Agent：它主动思考，发现问题，给出方案

这就是AI Agent原生架构的力量"
```

---

## 核心演示：AI Agent推理过程（2分20秒）

### 画面：全屏展示tool_trace

**用户输入**：
```
"帮我生成Fall 2026的课表，我想上ML、CV、NLP、线性代数"
```

### AI Agent推理过程（动画展示，每步10-15秒）

#### Step 1（15秒）
```
[Iteration 1] AI思考：
💭 "用户想生成课表，我需要先了解他的背景"

🔧 调用工具：get_student_profile(yl8888)

📊 结果：
- 专业：Computer Science
- 已修课：20门
- GPA：3.3
- 学习风格：喜欢project-based课程
```

**画面特效**：
- 左侧：tool_trace实时滚动
- 右侧：学生档案卡片弹出

---

#### Step 2（15秒）
```
[Iteration 2] AI思考：
💭 "他是CS专业，我需要检查专业要求和Study Away限制"

🔧 调用工具：get_major_requirements(Computer Science)
🔧 调用工具：find_study_away_restrictions(Computer Science)

📊 结果：
- 至少2门core在上海修
- 最多3门CS选修在纽约
- Capstone必须在上海完成
```

**画面特效**：
- 专业要求清单展开
- Study Away限制高亮显示

---

#### Step 3（15秒）
```
[Iteration 3] AI思考：
💭 "现在可以生成课表了"

🔧 调用工具：generate_personalized_schedule(
  student_id: yl8888,
  term: Fall 2026,
  courses: [ML, CV, NLP, 线性代数]
)

📊 结果：
✅ 课表生成成功（4门课）
```

**画面特效**：
- 左侧课表视图实时更新
- 4门课卡片依次弹出

---

#### Step 4（20秒）⭐ 关键
```
[Iteration 4] AI思考：
💭 "等等，我应该检查一下工作量会不会太大"

🔧 调用工具：estimate_workload([ML, CV, NLP, 线性代数], yl8888)

📊 结果：
⚠️ 总工作量：55小时/周
⚠️ 工作量等级：OVERLOAD（过载）
⚠️ 建议：减少1门课

【详细分析】
- CSCI-UA 480 (ML): 12小时/周，难度4.5
- CSCI-UA 473 (CV): 11小时/周，难度4.2
- CSCI-UA 467 (NLP): 10小时/周，难度3.8
- MATH-UA 140: 8小时/周，难度3.5
```

**画面特效**：
- 工作量柱状图动画
- 红色警告框弹出
- "OVERLOAD"文字闪烁

**旁白**：
```
"看，AI主动发现了问题
用户没有问，但AI自己检查了工作量
这就是AI Agent的主动性"
```

---

#### Step 5（20秒）⭐ 关键
```
[Iteration 5] AI思考：
💭 "工作量过载了！我还应该检查座位风险"

🔧 调用工具：get_course_history(CSCI-UA 480)

📊 结果：
⚠️ 历史数据：
- Fall 2025: 开放注册后3小时满员，waitlist 15人
- Spring 2025: 开放注册后1小时满员，waitlist 8人
- Fall 2024: 开放注册后6小时满员，无waitlist

⚠️ 预测：
- Study Away学生选上概率：20%
- Waitlist转正概率：30%
```

**画面特效**：
- 历史数据折线图
- 座位竞争热力图
- "20%"数字放大显示

**旁白**：
```
"AI又发现了第二个问题
ML座位风险很高，Study Away学生选上概率只有20%
AI继续推理，寻找解决方案"
```

---

#### Step 6（20秒）
```
[Iteration 6] AI思考：
💭 "ML风险很高，我应该推荐备选方案"

🔧 调用工具：suggest_backup_courses(CSCI-UA 480, seats_full, yl8888)

📊 结果：
💡 备选课程：
1. CSCI-UA 467 (NLP)
   - 难度：3.8（相近）
   - 座位：12个空位（充足）
   - 选上概率：95%

2. CSCI-UA 473 (CV)
   - 难度：4.2（更高）
   - 座位：5个空位（紧张）
   - 选上概率：40%
```

**画面特效**：
- 备选课程卡片弹出
- 对比表（ML vs NLP vs CV）

---

#### Step 7（15秒）
```
[Iteration 7] AI思考：
💭 "我已经收集了所有信息，现在可以给用户一个完整的建议了"

✅ 生成最终回复
```

**画面特效**：
- 所有信息汇总
- 最终回复展开

---

### 最终回复展示（20秒）

**画面：右侧显示完整回复**

```
✅ 已生成课表（4门课）

📚 CSCI-UA 480 (Machine Learning) - 周二四 2:00-3:15pm
📚 CSCI-UA 473 (Computer Vision) - 周一三 3:30-4:45pm
📚 CSCI-UA 467 (NLP) - 周一三 2:00-3:15pm
📚 MATH-UA 140 (Linear Algebra) - 周二四 3:30-4:45pm

⚠️ 工作量预警
总计55小时/周（过载）
建议：减少1门课或调整到下学期

⚠️ 座位风险
CSCI-UA 480 (ML)
- 历史满员时间：3小时
- Study Away学生选上概率：20%
建议：准备备选课程

💡 推荐方案

方案A（稳妥）：
✅ CSCI-UA 467 (NLP) - 座位充足，难度适中
✅ MATH-UA 140 (线性代数) - 确定能选上
⚠️ CSCI-UA 473 (CV) - 5个空位，可以尝试
✅ ECON-UA 266 (Game Theory) - 备选

工作量：38小时/周（适中）
选上概率：90%

方案B（激进）：
⚠️ CSCI-UA 480 (ML) - 冲一下
✅ CSCI-UA 467 (NLP) - 如果ML满了，立即选这个
⚠️ CSCI-UA 473 (CV) - 5个空位
✅ MATH-UA 140 (线性代数) - 确定能选上

工作量：55小时/周（过载）
选上概率：30%

【选课时间建议】
9:00:00 - 立即选MATH-UA 140（确保拿下）
9:00:30 - 尝试CSCI-UA 480（大概率满）
9:01:00 - 如果ML满了，立即选CSCI-UA 467
9:02:00 - 选CSCI-UA 473
```

**旁白**：
```
"看，AI Agent完成了7步推理：
1. 了解背景
2. 检查要求
3. 生成课表
4. 主动发现工作量过载
5. 主动发现座位风险
6. 推荐备选方案
7. 生成完整建议

这不是你问，它答
而是AI主动思考，发现问题，给出方案

这就是AI Agent原生架构"
```

---

## 结尾（20秒）

### 画面：核心架构图

```
AI Agent原生架构

用户输入
    ↓
AI推理（Reasoning）
"我需要什么信息？"
    ↓
AI行动（Acting）
动态调用28个工具
    ↓
AI反思（Reflection）
"有什么问题？如何优化？"
    ↓
主动预警 + 完整方案
```

### 旁白
```
"NYU Course Assistant
国内首个AI Agent原生选课系统

核心创新：
✅ ReAct模式：推理 + 行动 + 反思
✅ 28个工具动态编排
✅ AI自主决策，主动发现问题

这不是AI辅助选课
而是AI重新定义选课"
```

### 文字
```
AI Agent原生架构
github.com/your-repo
Demo: nyu-course-assistant.vercel.app
```

---

## 录制清单

### 需要准备的素材

1. **测试query**
```
"帮我生成Fall 2026的课表，我想上ML、CV、NLP、线性代数"
```

2. **预期AI行为**
- 7步推理
- 主动发现2个问题（工作量过载、座位风险）
- 推荐2个方案

3. **画面元素**
- tool_trace实时滚动（左侧）
- 数据可视化（右侧）：
  - 学生档案卡片
  - 专业要求清单
  - 课表视图
  - 工作量柱状图
  - 历史数据折线图
  - 备选课程卡片

4. **特效**
- 每步推理：文字动画
- 发现问题：红色警告框
- 推荐方案：绿色卡片弹出

---

## 录制技巧

### 1. 开发者工具设置
```
F12 → Console → 筛选"tool_trace"
显示：
- iteration
- thinking
- tool
- result
```

### 2. 录屏软件
- OBS Studio（免费）
- 分辨率：1920x1080
- 帧率：60fps
- 格式：MP4

### 3. 后期剪辑
- 加速：tool_trace滚动（1.5x速度）
- 慢放：关键发现（工作量过载、座位风险）
- 字幕：每步AI思考的文字
- 背景音乐：轻快的科技感音乐

---

## 测试脚本

### 启动服务
```bash
cd "C:\Users\LeeYb\Desktop\选课\nyu-course-assistant"
npm run dev
```

### 测试query
```
帮我生成Fall 2026的课表，我想上ML、CV、NLP、线性代数
```

### 预期tool_trace
```
[Iteration 1] get_student_profile
[Iteration 2] get_major_requirements, find_study_away_restrictions
[Iteration 3] generate_personalized_schedule
[Iteration 4] estimate_workload → 发现过载
[Iteration 5] get_course_history → 发现座位风险
[Iteration 6] suggest_backup_courses
[Iteration 7] 生成最终回复
```

### 检查点
- ✅ tool_trace显示7步推理
- ✅ 主动发现工作量过载
- ✅ 主动发现座位风险
- ✅ 推荐2个方案
- ✅ 左侧课表视图更新

---

需要调整哪些部分？
