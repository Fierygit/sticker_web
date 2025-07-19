#!/bin/bash

# 加载配置
source ./config.sh

# 显示帮助信息
show_help() {
    echo "📋 $APP_NAME 管理脚本"
    echo ""
    echo "用法: ./manage.sh [命令]"
    echo ""
    echo "可用命令:"
    echo "  deploy    - 部署应用"
    echo "  start     - 启动容器"
    echo "  stop      - 停止容器"
    echo "  restart   - 重启容器"
    echo "  logs      - 查看日志"
    echo "  status    - 查看状态"
    echo "  clean     - 清理容器和镜像"
    echo "  help      - 显示帮助信息"
    echo ""
}

# 检查容器状态
check_container() {
    if docker ps | grep -q $CONTAINER_NAME; then
        return 0  # 运行中
    elif docker ps -a | grep -q $CONTAINER_NAME; then
        return 1  # 已停止
    else
        return 2  # 不存在
    fi
}

# 部署应用
deploy_app() {
    echo "🚀 开始部署..."
    ./deploy.sh
}

# 启动容器
start_container() {
    check_container
    case $? in
        0)
            echo "✅ 容器已在运行中"
            ;;
        1)
            echo "🚀 启动容器..."
            docker start $CONTAINER_NAME
            echo "✅ 容器已启动"
            ;;
        2)
            echo "❌ 容器不存在，请先部署应用"
            echo "💡 运行: ./manage.sh deploy"
            ;;
    esac
}

# 停止容器
stop_container() {
    check_container
    case $? in
        0)
            echo "🛑 停止容器..."
            docker stop $CONTAINER_NAME
            echo "✅ 容器已停止"
            ;;
        1)
            echo "✅ 容器已停止"
            ;;
        2)
            echo "❌ 容器不存在"
            ;;
    esac
}

# 重启容器
restart_container() {
    check_container
    case $? in
        0|1)
            echo "🔄 重启容器..."
            docker restart $CONTAINER_NAME
            echo "✅ 容器已重启"
            ;;
        2)
            echo "❌ 容器不存在，请先部署应用"
            ;;
    esac
}

# 查看日志
show_logs() {
    check_container
    if [ $? -eq 2 ]; then
        echo "❌ 容器不存在"
        return
    fi
    
    echo "📋 查看容器日志 (按 Ctrl+C 退出):"
    docker logs -f $CONTAINER_NAME
}

# 查看状态
show_status() {
    echo "📊 应用状态:"
    echo "   应用名称: $APP_NAME"
    echo "   端口: $APP_PORT"
    echo "   访问地址: http://localhost:$APP_PORT"
    echo ""
    
    check_container
    case $? in
        0)
            echo "🟢 容器状态: 运行中"
            echo ""
            docker ps --filter name=$CONTAINER_NAME --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
            ;;
        1)
            echo "🟡 容器状态: 已停止"
            ;;
        2)
            echo "🔴 容器状态: 不存在"
            ;;
    esac
    
    # 检查端口占用
    PORT_PID=$(lsof -ti:$APP_PORT 2>/dev/null)
    if [ ! -z "$PORT_PID" ]; then
        echo "⚠️  端口 $APP_PORT 被进程 $PORT_PID 占用"
    else
        echo "✅ 端口 $APP_PORT 可用"
    fi
}

# 清理容器和镜像
clean_all() {
    echo "🧹 清理容器和镜像..."
    
    # 停止并删除容器
    if docker ps -aq -f name=$CONTAINER_NAME | grep -q .; then
        docker stop $CONTAINER_NAME 2>/dev/null
        docker rm $CONTAINER_NAME 2>/dev/null
        echo "✅ 容器已删除"
    fi
    
    # 删除镜像
    if docker images -q $DOCKER_IMAGE | grep -q .; then
        docker rmi $DOCKER_IMAGE 2>/dev/null
        echo "✅ 镜像已删除"
    fi
    
    # 清理未使用的镜像
    docker image prune -f
    echo "✅ 清理完成"
}

# 主逻辑
case "${1:-help}" in
    deploy)
        deploy_app
        ;;
    start)
        start_container
        ;;
    stop)
        stop_container
        ;;
    restart)
        restart_container
        ;;
    logs)
        show_logs
        ;;
    status)
        show_status
        ;;
    clean)
        clean_all
        ;;
    help|*)
        show_help
        ;;
esac