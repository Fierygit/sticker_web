#!/bin/bash

# 加载配置
source ./config.sh

echo "🚀 开始部署 $APP_NAME 应用..."
echo "📋 配置信息:"
echo "   应用名称: $APP_NAME"
echo "   端口: $APP_PORT"
echo "   镜像名称: $DOCKER_IMAGE"
echo "   容器名称: $CONTAINER_NAME"
echo ""

# 检查Docker是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装，请先安装 Docker"
    exit 1
fi

# 检查端口是否被占用
echo "🔍 检查端口 $APP_PORT 是否被占用..."
PORT_PID=$(lsof -ti:$APP_PORT)

if [ ! -z "$PORT_PID" ]; then
    echo "⚠️  端口 $APP_PORT 被进程 $PORT_PID 占用"
    echo "🔪 正在终止占用端口的进程..."
    
    # 尝试优雅关闭
    kill $PORT_PID 2>/dev/null
    sleep 2
    
    # 检查进程是否还在运行
    if kill -0 $PORT_PID 2>/dev/null; then
        echo "🔨 强制终止进程..."
        kill -9 $PORT_PID 2>/dev/null
    fi
    
    # 再次检查端口
    sleep 1
    NEW_PID=$(lsof -ti:$APP_PORT)
    if [ ! -z "$NEW_PID" ]; then
        echo "❌ 无法释放端口 $APP_PORT，请手动处理"
        exit 1
    fi
    
    echo "✅ 端口 $APP_PORT 已释放"
else
    echo "✅ 端口 $APP_PORT 可用"
fi

# 停止并删除现有容器
echo "🛑 停止现有容器..."
if docker ps -q -f name=$CONTAINER_NAME | grep -q .; then
    docker stop $CONTAINER_NAME
    echo "✅ 容器已停止"
fi

if docker ps -aq -f name=$CONTAINER_NAME | grep -q .; then
    docker rm $CONTAINER_NAME
    echo "✅ 容器已删除"
fi

# 创建必要的目录
echo "📁 创建数据目录..."
mkdir -p "$HOST_DATA_DIR"

# 创建标签文件（如果不存在）
if [ ! -f "$HOST_TAGS_FILE" ]; then
    echo "📝 创建标签文件..."
    echo '{}' > "$HOST_TAGS_FILE"
fi

# 构建Docker镜像
echo "🔨 构建 Docker 镜像..."
if docker build -t $DOCKER_IMAGE .; then
    echo "✅ 镜像构建成功"
else
    echo "❌ 镜像构建失败"
    exit 1
fi

# 运行容器
echo "🚀 启动容器..."
if docker run -d \
    --name $CONTAINER_NAME \
    -p $APP_PORT:8000 \
    -v "$HOST_DATA_DIR:$CONTAINER_DATA_DIR" \
    -v "$HOST_TAGS_FILE:$CONTAINER_TAGS_FILE" \
    --restart unless-stopped \
    $DOCKER_IMAGE; then
    echo "✅ 容器启动成功"
else
    echo "❌ 容器启动失败"
    exit 1
fi

# 等待应用启动
echo "⏳ 等待应用启动..."
sleep 3

# 检查容器状态
if docker ps | grep -q $CONTAINER_NAME; then
    echo "✅ 应用部署成功！"
    echo ""
    echo "📱 访问地址: http://localhost:$APP_PORT"
    echo "📊 查看日志: docker logs $CONTAINER_NAME"
    echo "🛑 停止应用: docker stop $CONTAINER_NAME"
    echo "🔄 重启应用: docker restart $CONTAINER_NAME"
    echo ""
    echo "🎉 部署完成！"
else
    echo "❌ 容器启动失败，请检查日志："
    docker logs $CONTAINER_NAME
    exit 1
fi
