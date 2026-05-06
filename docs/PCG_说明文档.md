# NYU Course Assistant - AI原生选课系统

**腾讯PCG校园AI产品创意大赛2026 - 开放赛道**

---

## 封面页

**作品名称**: NYU Course Assistant - AI原生选课系统

**参赛赛道**: 开放赛道 - AI Agent原生架构

**选手姓名**: [填写姓名]

**Demo链接**: https://nyu-course-assistant-iyfia3l96-yl13132-6607s-projects.vercel.app

---

## 模块一：用户洞察与问题定义

### 目标用户

**NYU Shanghai学生（Study Away场景）**
- 年龄：18-22岁
- 身份特征：大二/大三学生，即将前往NYU New York交换一学期
- 技术水平：熟悉移动应用，期待智能化体验

### 用户痛点

**真实痛点（基于数据和案例）**：

1. **信息过载，决策困难**
   - 1500+门课程，跨上海/纽约两个校区
   - 需要同时考虑：先修课、毕业要求、座位竞争、工作量、教授评价
   - 传统方式：Excel表格 + 10+个网页标签页 + 反复查询

2. **选课风险不可预测**
   - 热门课程（如ML）3小时内满员，Study Away学生选上概率仅20%
   - 工作量评估不准确，导致学期过载或过轻
   - 缺少备选方案，错过选课时间窗口

3. **毕业规划缺乏全局视角**
   - 只关注专业课，忽略Core要求和Minor机会
   - 不知道已修课程可以完成哪些Minor
   - 无法预测未来学期的课程安排

### 使用场景

**场景1：Study Away选课规划（核心场景）**
- 时间：选课开放前2周
- 用户输入："帮我生成Fall 2026去纽约的课表，我想上ML、CV、NLP"
- AI行为：
  1. 自动获取学生档案（专业、已修课、GPA）
  2. 检查专业要求和Study Away限制
  3. 生成课表
  4. **主动发现**工作量过载（55小时/周）
  5. **主动发现**ML座位风险高（选上概率20%）
  6. **主动推荐**备选方案和完整选课策略

**场景2：毕业规划优化**
- 用户输入："我还需要上什么课才能毕业？"
- AI行为：
  1. 分析已修课程
  2. **主动发现**已修2门IMA课，可完成IMA Minor
  3. 检查Core要求缺口
  4. 推荐：2门CS专业课 + 1门Science Core + 1门IMA课（完成Minor）

---

## 模块二：产品方案设计

### 产品概述

**一句话描述**：国内首个AI Agent原生选课系统，让AI主动思考、发现问题、给出方案，而不是被动回答问题。

### 核心功能

**AI Agent自主推理引擎**
- 解决问题：传统AI助手只能"你问，它答"，无法主动发现隐藏风险
- 实现方式：ReAct模式（Reasoning + Acting + Reflection）
  - Reasoning：AI自主决定需要什么信息
  - Acting：动态调用28个工具获取数据
  - Reflection：主动评估风险，发现问题

### 产品架构/功能图

```
用户输入："帮我生成课表"
    ↓
AI推理层（DeepSeek API + Function Calling）
    ↓
工具编排层（28个工具动态调用）
├─ 学生档案工具（get_student_profile）
├─ 专业要求工具（get_major_requirements）
├─ 课程搜索工具（search_courses, find_requirement_courses）
├─ 先修课检查（check_prerequisites, evaluate_course_access）
├─ 课表生成工具（generate_personalized_schedule）
├─ 工作量评估（estimate_workload）
├─ 座位风险预测（get_course_history）
├─ 备选方案推荐（suggest_backup_courses）
├─ Minor机会检测（detect_minor_opportunities）
└─ 社区评价查询（get_community_reviews）
    ↓
数据层（10个JSON数据源）
├─ 1500+门课程数据
├─ 专业要求数据
├─ 历史选课数据
├─ 教授评价数据
└─ 社区评价数据
    ↓
AI输出：完整方案 + 风险预警 + 备选策略
```

### 交互流程

```
[用户] 输入需求
    ↓
[AI] 自主推理（可见的思考过程）
    ├─ Iteration 1: 💭 "我需要了解学生背景" → 调用get_student_profile
    ├─ Iteration 2: 💭 "检查专业要求" → 调用get_major_requirements
    ├─ Iteration 3: 💭 "生成课表" → 调用generate_personalized_schedule
    ├─ Iteration 4: 💭 "检查工作量" → 调用estimate_workload → ⚠️ 发现过载
    ├─ Iteration 5: 💭 "检查座位风险" → 调用get_course_history → ⚠️ 发现高风险
    └─ Iteration 6: 💭 "推荐备选" → 调用suggest_backup_courses
    ↓
[界面] 实时显示AI推理过程（左侧面板）
    ↓
[AI] 输出完整方案
    ├─ ✅ 课表（4门课，16学分）
    ├─ ⚠️ 工作量预警（55小时/周，建议减少1门）
    ├─ ⚠️ 座位风险（ML选上概率20%）
    └─ 💡 推荐方案A/B（稳妥方案 vs 激进方案）
```

### 创新与差异化

**与现有方案对比**：

| 维度 | 传统选课系统 | AI辅助工具 | NYU Course Assistant |
|------|------------|-----------|---------------------|
| 架构 | 规则引擎 | Harness架构 | **AI Agent原生** |
| 交互 | 手动查询 | 你问它答 | **AI主动思考** |
| 风险预警 | 无 | 需要用户询问 | **AI自动发现** |
| 方案完整性 | 只返回课表 | 单点回答 | **完整策略+备选** |
| 推理可见性 | 黑盒 | 黑盒 | **可见推理过程** |

**核心创新**：
1. **AI Agent原生架构**：不是在传统系统上加AI，而是从零设计AI原生系统
2. **主动发现问题**：AI不等用户问，自己发现工作量过载、座位风险、Minor机会
3. **可见推理过程**：用户能看到AI的每一步思考，建立信任
4. **工具动态编排**：28个工具按需组合，不是预设流程

---

## 模块三：AI原生能力说明

### AI核心能力

**产品使用了哪些AI能力？**

1. **大模型对话（DeepSeek API）**
   - 模型：deepseek-chat
   - 能力：理解用户意图、自主推理、生成自然语言回复

2. **Function Calling（工具调用）**
   - 28个工具定义（JSON Schema）
   - AI自主决定调用哪些工具、传入什么参数
   - 支持并行调用（提升效率）

3. **多模态理解（未来扩展）**
   - 计划支持：上传课表截图 → AI自动识别课程 → 生成优化建议

4. **Agent推理模式（ReAct）**
   - Reasoning：AI分析当前状态，决定下一步行动
   - Acting：调用工具获取数据
   - Reflection：评估结果，发现问题，继续推理

### AI如何解决痛点

**痛点1：信息过载 → AI解决方案**
- 传统方式：用户需要手动查询10+个数据源
- AI方案：用户一句话输入，AI自动调用28个工具，整合1500+门课程数据
- 绑定关系：**去掉AI，这个产品还能成立吗？不能。** 人工无法在3-5分钟内完成28个工具的动态编排和数据整合。

**痛点2：风险不可预测 → AI解决方案**
- 传统方式：用户不知道要检查什么风险
- AI方案：AI主动调用`estimate_workload`和`get_course_history`，发现隐藏风险
- 绑定关系：**AI的主动性是核心价值。** 规则引擎无法做到"主动发现未被询问的问题"。

**痛点3：缺乏全局视角 → AI解决方案**
- 传统方式：用户只关注专业课，忽略Minor机会
- AI方案：AI调用`detect_minor_opportunities`，分析已修课程，发现"你已经修了2门IMA课，再修2门就能完成Minor"
- 绑定关系：**AI的推理能力是关键。** 需要理解毕业要求、分析课程关系、生成优化建议。

### AI技术方案

**所用模型/API/平台**：
- DeepSeek API（deepseek-chat模型）
- Function Calling（工具调用）
- Next.js + TypeScript（前端）
- Vercel（部署）

**AI在产品中的工作流程**：
```
1. 用户输入 → DeepSeek API接收
2. AI推理 → 决定调用哪些工具（如get_student_profile）
3. 后端执行工具 → 返回数据给AI
4. AI继续推理 → 决定下一步行动
5. 循环2-4步，直到AI认为信息充足
6. AI生成最终回复 → 返回给用户
```

**技术亮点**：
- **迭代式推理**：最多10轮迭代，平均3-5轮完成任务
- **并行工具调用**：同一轮可调用多个工具，提升效率
- **推理过程可视化**：前端实时显示AI的每一步思考

---

## 模块四：加分项（可选）

### 落地可行性

**技术实现路径**：
1. ✅ 已完成：Web版Demo（Next.js + DeepSeek API）
2. 🔄 进行中：数据扩展（增加更多校区、更多专业）
3. 📅 计划中：移动端适配（响应式设计）
4. 📅 未来：与学校选课系统API对接（实时座位数据）

**开发节奏**：
- Week 1-2：核心架构 + 10个基础工具
- Week 3-4：扩展到28个工具 + 数据完善
- Week 5：UI优化 + 推理过程可视化
- Week 6：Demo录制 + 文档撰写

**所需资源评估**：
- 开发：1人（全栈）
- 数据：NYU官方课程数据（公开）
- API成本：DeepSeek API（¥0.001/1K tokens，月成本<¥100）

### 商业化考虑

**盈利模式**：
1. **B2B（学校采购）**
   - 目标客户：NYU Shanghai、其他国际化大学
   - 定价：¥5-10万/年/校（按学生数量）
   - 价值：减少选课咨询工作量，提升学生满意度

2. **B2C（学生订阅）**
   - 免费版：基础课表生成
   - 付费版：¥99/学期（工作量评估、座位风险预测、社区评价）
   - 目标：1000付费用户 = ¥10万/学期

3. **数据服务**
   - 向学校提供选课数据分析报告
   - 课程热度、学生偏好、毕业进度预测

**目标市场**：
- 一级市场：NYU Shanghai（2000+学生）
- 二级市场：上海纽约大学、昆山杜克大学、西交利物浦（10000+学生）
- 三级市场：所有有Study Away项目的中国大学（100000+学生）

**竞争优势**：
- 技术壁垒：AI Agent原生架构，不是简单的规则引擎
- 数据壁垒：需要深度整合学校数据（课程、要求、历史）
- 先发优势：国内首个AI Agent选课系统

---

## 附录：技术细节

### 28个工具列表

**学生档案类**：
- get_student_profile：获取学生档案
- detect_minor_opportunities：检测Minor机会

**课程查询类**：
- search_courses：关键词搜索课程
- get_course_info：获取课程详情
- find_requirement_courses：查找满足特定要求的课程

**先修课检查类**：
- check_prerequisites：检查先修课是否满足
- evaluate_course_access_with_plan：评估课程可达性+生成桥接计划

**课表生成类**：
- generate_personalized_schedule：生成个性化课表
- replace_schedule_course：替换课表中的课程

**风险评估类**：
- estimate_workload：评估工作量
- get_course_history：查询历史选课数据
- suggest_backup_courses：推荐备选课程

**社区评价类**：
- get_community_reviews：获取社区评价
- get_community_tips：获取社区建议
- search_community_experiences：搜索学生经验

**其他工具**：
- get_major_requirements：获取专业要求
- get_core_curriculum：获取Core要求
- find_study_away_restrictions：查询Study Away限制
- compare_courses：对比多门课程
- get_professor_info：获取教授信息
- simulate_future_semesters：模拟未来学期

### Demo展示建议

**推荐Query**：
```
"帮我生成Fall 2026去纽约的课表，我想上ML、CV、NLP、线性代数"
```

**预期AI行为**（7步推理）：
1. 获取学生档案
2. 检查专业要求和Study Away限制
3. 生成课表
4. **主动发现**工作量过载（55小时/周）
5. **主动发现**ML座位风险（选上概率20%）
6. 推荐备选方案
7. 生成完整建议（2个方案：稳妥 vs 激进）

**展示重点**：
- 左侧面板：实时显示AI推理过程（6-7个iteration）
- 右侧面板：课表可视化 + 风险预警卡片
- 强调：AI主动发现了2个用户没有问的问题

---

**项目地址**：https://github.com/[your-repo]
**Demo地址**：https://nyu-course-assistant.vercel.app
**联系方式**：[填写邮箱]
