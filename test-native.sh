#!/bin/bash

# 测试 AI-native 版本

echo "=== 测试1: 简单课程查询 ==="
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "CSCI-UA 473 是什么课？"}
    ]
  }' | jq -r '.choices[0].message.content'

echo -e "\n\n=== 测试2: 先修课检查（AI 自己决定调用顺序）==="
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "我能上 CSCI-UA 473 吗？"}
    ]
  }' | jq -r '.choices[0].message.content'

echo -e "\n\n=== 测试3: 查看工具调用轨迹 ==="
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "我能上 CSCI-UA 473 吗？"}
    ]
  }' | jq '.tool_trace'
