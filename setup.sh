#!/bin/bash

echo "🔧 设置脚本权限..."

# 给脚本添加执行权限
chmod +x config.sh
chmod +x deploy.sh
chmod +x manage.sh
chmod +x setup.sh

echo "✅ 权限设置完成"
echo ""
echo "📋 可用命令:"
echo "  ./deploy.sh   - 一键部署"
echo "  ./manage.sh   - 管理应用"
echo ""
echo "💡 快速开始:"
echo "  ./deploy.sh"