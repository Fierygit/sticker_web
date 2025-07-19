
from fastapi import FastAPI, File, UploadFile, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import os
import shutil
from pathlib import Path
from typing import List
import uvicorn
import json
import configparser

app = FastAPI()

STICKERS_DIR = "./stickers"
CONFIG_FILE = "./config.ini"
TAGS_FILE = "./tags.json"

# 确保stickers目录存在
Path(STICKERS_DIR).mkdir(exist_ok=True)

# 读取配置文件
def load_config():
    config = configparser.ConfigParser()
    if not os.path.exists(CONFIG_FILE):
        # 创建默认配置文件
        config['DEFAULT'] = {'delete_password': 'admin123'}
        with open(CONFIG_FILE, 'w') as f:
            config.write(f)
    else:
        config.read(CONFIG_FILE)
    return config

def load_tags_data():
    """加载标签数据"""
    if os.path.exists(TAGS_FILE):
        try:
            with open(TAGS_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                # 兼容旧格式，如果没有pinned字段则添加
                if isinstance(data, dict) and 'files' not in data:
                    data = {'files': data, 'pinned': []}
                return data
        except:
            return {'files': {}, 'pinned': []}
    return {'files': {}, 'pinned': []}

def save_tags_data(tags_data):
    """保存标签数据"""
    try:
        with open(TAGS_FILE, 'w', encoding='utf-8') as f:
            json.dump(tags_data, f, ensure_ascii=False, indent=2)
        return True
    except:
        return False

def get_file_tags(filename):
    """获取文件的标签"""
    tags_data = load_tags_data()
    return tags_data.get('files', {}).get(filename, [])

def set_file_tags(filename, tags):
    """设置文件的标签"""
    tags_data = load_tags_data()
    if 'files' not in tags_data:
        tags_data['files'] = {}
    tags_data['files'][filename] = tags
    return save_tags_data(tags_data)

def is_file_pinned(filename):
    """检查文件是否置顶"""
    tags_data = load_tags_data()
    return filename in tags_data.get('pinned', [])

def pin_file(filename):
    """置顶文件"""
    tags_data = load_tags_data()
    if 'pinned' not in tags_data:
        tags_data['pinned'] = []
    if filename not in tags_data['pinned']:
        tags_data['pinned'].append(filename)
        return save_tags_data(tags_data)
    return True

def unpin_file(filename):
    """取消置顶文件"""
    tags_data = load_tags_data()
    if 'pinned' not in tags_data:
        tags_data['pinned'] = []
    if filename in tags_data['pinned']:
        tags_data['pinned'].remove(filename)
        return save_tags_data(tags_data)
    return True

def remove_file_from_tags(filename):
    """从标签数据中移除文件"""
    tags_data = load_tags_data()
    if 'files' not in tags_data:
        tags_data['files'] = {}
    if 'pinned' not in tags_data:
        tags_data['pinned'] = []
    
    if filename in tags_data['files']:
        del tags_data['files'][filename]
    if filename in tags_data['pinned']:
        tags_data['pinned'].remove(filename)
    save_tags_data(tags_data)

@app.get("/api/files")
async def get_files():
    try:
        files = []
        tags_data = load_tags_data()
        pinned_files = tags_data.get('pinned', [])
        
        for file_path in Path(STICKERS_DIR).iterdir():
            if file_path.is_file():
                stat = file_path.stat()
                tags = get_file_tags(file_path.name)
                files.append({
                    "name": file_path.name,
                    "size": stat.st_size,
                    "modified": stat.st_mtime,
                    "tags": tags,
                    "pinned": file_path.name in pinned_files
                })
        
        # 按置顶状态和修改时间排序
        files.sort(key=lambda x: (not x['pinned'], -x['modified']))
        return files
    except Exception as e:
        raise HTTPException(status_code=500, detail="读取文件列表失败")

@app.get("/api/tags")
async def get_tags():
    """获取所有标签"""
    try:
        tags_data = load_tags_data()
        all_tags = set()
        for tags in tags_data.get('files', {}).values():
            all_tags.update(tags)
        return sorted(list(all_tags))
    except Exception as e:
        raise HTTPException(status_code=500, detail="读取标签失败")

@app.post("/api/files/tag")
async def add_file_tag(request: Request):
    """给文件添加标签"""
    try:
        data = await request.json()
        filename = data.get("filename")
        tag = data.get("tag")
        
        if not filename or not tag:
            raise HTTPException(status_code=400, detail="文件名和标签不能为空")
        
        file_path = Path(STICKERS_DIR) / filename
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="文件不存在")
        
        current_tags = get_file_tags(filename)
        if tag not in current_tags:
            current_tags.append(tag)
            if not set_file_tags(filename, current_tags):
                raise HTTPException(status_code=500, detail="保存标签失败")
        
        return {"message": "标签添加成功"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/files/tag")
async def remove_file_tag(request: Request):
    """删除文件标签"""
    try:
        data = await request.json()
        filename = data.get("filename")
        tag = data.get("tag")
        
        if not filename or not tag:
            raise HTTPException(status_code=400, detail="文件名和标签不能为空")
        
        file_path = Path(STICKERS_DIR) / filename
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="文件不存在")
        
        current_tags = get_file_tags(filename)
        if tag in current_tags:
            current_tags.remove(tag)
            if not set_file_tags(filename, current_tags):
                raise HTTPException(status_code=500, detail="保存标签失败")
        
        return {"message": "标签删除成功"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/upload")
async def upload_files(files: List[UploadFile] = File(...)):
    try:
        uploaded_files = []
        for file in files:
            file_path = Path(STICKERS_DIR) / file.filename
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            uploaded_files.append({"filename": file.filename})
        
        return {"message": "上传成功", "files": uploaded_files}
    except Exception as e:
        raise HTTPException(status_code=500, detail="上传失败")

@app.delete("/api/delete/{filename}")
async def delete_file(filename: str, request: Request):
    try:
        data = await request.json()
        password = data.get("password")
        
        config = load_config()
        correct_password = config['DEFAULT']['delete_password']
        
        if password != correct_password:
            raise HTTPException(status_code=401, detail="密码错误")
        
        file_path = Path(STICKERS_DIR) / filename
        if file_path.exists():
            file_path.unlink()
            # 同时删除标签数据
            remove_file_from_tags(filename)
            return {"message": "删除成功"}
        else:
            raise HTTPException(status_code=404, detail="文件不存在")
    except Exception as e:
        if "密码错误" in str(e):
            raise e
        raise HTTPException(status_code=500, detail="删除失败")

@app.post("/api/files/pin")
async def toggle_pin_file(request: Request):
    """切换文件置顶状态"""
    try:
        data = await request.json()
        filename = data.get("filename")
        
        if not filename:
            raise HTTPException(status_code=400, detail="文件名不能为空")
        
        file_path = Path(STICKERS_DIR) / filename
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="文件不存在")
        
        if is_file_pinned(filename):
            if not unpin_file(filename):
                raise HTTPException(status_code=500, detail="取消置顶失败")
            return {"message": "取消置顶成功", "pinned": False}
        else:
            if not pin_file(filename):
                raise HTTPException(status_code=500, detail="置顶失败")
            return {"message": "置顶成功", "pinned": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 静态文件服务 - API路由必须在静态文件挂载之前
app.mount("/stickers", StaticFiles(directory=STICKERS_DIR), name="stickers")

# 使用子应用来避免路由冲突
static_app = StaticFiles(directory=".", html=True)

@app.get("/{full_path:path}")
async def serve_static(full_path: str):
    # 如果是API路径，返回404让FastAPI处理
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404)
    
    # 否则提供静态文件
    from starlette.responses import FileResponse
    from starlette.exceptions import HTTPException as StarletteHTTPException
    
    try:
        if full_path == "" or full_path == "/":
            return FileResponse("index.html")
        
        file_path = Path(full_path)
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        else:
            return FileResponse("index.html")  # SPA fallback
    except:
        raise HTTPException(status_code=404)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
