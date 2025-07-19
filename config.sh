#!/bin/bash

# 应用配置
APP_NAME="stickers"
APP_PORT=8000
DOCKER_IMAGE="stickers-app"
CONTAINER_NAME="stickers"

# 宿主机数据目录（用于Docker挂载）
HOST_DATA_DIR="$(pwd)/stickers"
HOST_TAGS_FILE="$(pwd)/tags.json"

# 容器内数据目录
CONTAINER_DATA_DIR="/app/stickers"
CONTAINER_TAGS_FILE="/app/tags.json"

# 导出配置供其他脚本使用
export APP_NAME APP_PORT DOCKER_IMAGE CONTAINER_NAME
export HOST_DATA_DIR HOST_TAGS_FILE
export CONTAINER_DATA_DIR CONTAINER_TAGS_FILE
