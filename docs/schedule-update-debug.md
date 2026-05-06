# 课表更新问题排查

## 问题
用户生成课表后，右边 AI 回复显示了新课表，但左边课表视图没有更新。

## 已确认
1. ✅ 后端正确返回 `schedule_result`
2. ✅ 数据格式正确（包含 `schedule`, `selected_section`, `days` 等）
3. ✅ 前端代码逻辑正确（`scheduleFromPersonalizedResult` 函数）
4. ✅ 课表渲染是响应式的（使用 `schedule` state）

## 可能原因

### 1. 状态更新时机问题
```typescript
if (data.schedule_result?.schedule) {
  setSchedule(nextSchedule);  // 更新状态
  setActiveTab('plan');       // 切换标签
}
updateAssistantMessage(content);  // 更新消息
```

可能的问题：
- React 批量更新导致状态没有立即生效
- `setActiveTab('plan')` 后用户手动切回聊天标签

### 2. LocalStorage 同步问题
```typescript
window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ 
  profile, 
  schedule: nextSchedule,  // 保存新课表
  plan, 
  academicPlan 
}));
```

如果页面刷新，会从 localStorage 加载旧数据。

### 3. 用户没有切换到 plan 标签
代码会自动切换到 `plan` 标签，但用户可能：
- 没注意到标签切换
- 手动切回了聊天标签
- 在聊天标签看不到课表更新

## 排查步骤

### 1. 添加调试日志
已在 `app/page.tsx:408-415` 添加 console.log：
```typescript
console.log('[Schedule Update] Generated schedule:', nextSchedule);
console.log('[Schedule Update] Schedule state updated, switched to plan tab');
```

### 2. 测试步骤
1. 打开浏览器开发者工具（F12）
2. 切换到 Console 标签
3. 在聊天中输入："帮我生成下学期的课表"
4. 观察控制台输出：
   - 是否有 `[Schedule Update]` 日志？
   - `nextSchedule` 数组长度是多少？
   - 是否有错误信息？

### 3. 检查状态
在控制台执行：
```javascript
// 检查当前 schedule 状态
console.log('Current schedule:', window.localStorage.getItem('nyu-academic-agent'));
```

## 临时解决方案

如果问题是用户没注意到标签切换，可以：

### 方案1: 添加提示
```typescript
if (data.schedule_result?.schedule) {
  setSchedule(nextSchedule);
  setActiveTab('plan');
  // 添加提示
  alert('课表已生成！请查看左侧"AI 规划"标签');
}
```

### 方案2: 强制刷新课表视图
```typescript
if (data.schedule_result?.schedule) {
  setSchedule([]); // 先清空
  setTimeout(() => {
    setSchedule(nextSchedule); // 再设置
    setActiveTab('plan');
  }, 0);
}
```

### 方案3: 在聊天标签也显示课表
修改 UI，让课表在所有标签都可见（不只是 plan 标签）。

## 下一步

1. 用户测试时打开浏览器控制台
2. 查看 `[Schedule Update]` 日志
3. 根据日志确定问题原因
4. 选择合适的解决方案
