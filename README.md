# Stickers 文件管理器

一个简单易用的文件管理和分享工具，支持图片、视频和GIF文件的上传、管理、标签分类和置顶功能。

## 功能特性

- 📁 文件上传（支持拖拽上传）
- 🏷️ 文件标签管理
- 📌 文件置顶功能
- 📋 一键复制到剪贴板
- 🔍 标签筛选
- 📱 响应式设计，支持移动端

## 快速部署

### 一键部署

1. **克隆项目**
```bash
git clone <your-repo-url>
cd sticker_web
```

2. **设置权限**
```bash
chmod +x *.sh
```

3. **一键部署**
```bash
./deploy.sh
```

4. **访问应用**
打开浏览器访问：http://localhost:8000

### 配置说明

在 `config.sh` 文件中可以修改配置：
```bash
APP_NAME="stickers"        # 应用名称
APP_PORT=8000             # 应用端口
DOCKER_IMAGE="stickers-app"  # Docker镜像名
CONTAINER_NAME="stickers"    # 容器名称
```

### 管理命令

使用管理脚本：
```bash
./manage.sh [命令]
```

可用命令：
- `deploy` - 部署应用
- `start` - 启动容器
- `stop` - 停止容器
- `restart` - 重启容器
- `logs` - 查看日志
- `status` - 查看状态
- `clean` - 清理容器和镜像

### 手动Docker命令

如果需要手动操作：

**构建镜像**
```bash
docker build -t stickers-app .
```

**运行容器**
```bash
docker run -d \
  --name stickers \
  -p 8000:8000 \
  -v $(pwd)/stickers:/app/stickers \
  -v $(pwd)/tags.json:/app/tags.json \
  --restart unless-stopped \
  stickers-app
```

**查看状态**
```bash
docker ps
```

**查看日志**
```bash
docker logs stickers
```

**停止容器**
```bash
docker stop stickers
```

**删除容器**
```bash
docker rm stickers
```

## 使用说明

### 上传文件
- 点击上传区域选择文件
- 或直接拖拽文件到上传区域
- 支持批量上传

### 管理文件
- **复制**: 点击复制按钮将文件复制到剪贴板
- **标签**: 为文件添加标签，便于分类管理
- **置顶**: 重要文件可以置顶显示
- **删除**: 删除不需要的文件

### 筛选文件
- 使用标签筛选器快速找到特定类型的文件
- 置顶文件会优先显示

## 目录结构

```
sticker_web/
├── main.py              # 主应用文件
├── index.html           # 前端页面
├── style.css            # 样式文件
├── script.js            # JavaScript文件
├── requirements.txt     # Python依赖
├── Dockerfile          # Docker配置
├── config.sh           # 配置文件
├── deploy.sh           # 一键部署脚本
├── manage.sh           # 管理脚本
├── setup.sh            # 权限设置脚本
├── .gitignore          # Git忽略文件
├── README.md           # 说明文档
├── stickers/           # 文件存储目录
└── tags.json           # 标签数据文件
```

## 技术栈

- **后端**: FastAPI + Python
- **前端**: HTML + CSS + JavaScript
- **部署**: Docker
- **文件存储**: 本地文件系统

## 注意事项

1. 确保 `stickers` 目录有写入权限
2. 首次运行会自动创建必要的目录和文件
3. 建议定期备份 `stickers` 目录和 `tags.json` 文件
4. 修改端口请在 `config.sh` 中配置

## 故障排除

**容器无法启动**
```bash
./manage.sh status  # 查看状态
./manage.sh logs    # 查看日志
```

**端口被占用**
部署脚本会自动检查并释放端口

**文件上传失败**
- 检查 `stickers` 目录权限
- 确保磁盘空间充足

**无法访问应用**
```bash
./manage.sh status  # 检查应用状态
```
