"""
火山引擎即梦API - Python后端服务
使用官方SDK避免签名问题，提供RESTful API给前端调用
"""

import os
import json
import asyncio
import time
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# 尝试导入火山引擎SDK
try:
    from volcengine.visual.VisualService import VisualService
    SDK_AVAILABLE = True
    print("✅ 火山引擎SDK导入成功")
except ImportError as e:
    SDK_AVAILABLE = False
    print(f"⚠️ 火山引擎SDK导入失败: {e}")
    print("📦 暂时以演示模式启动，请稍后安装SDK: pip install volcengine")

app = FastAPI(
    title="ScriptToFrame Image Generation API",
    description="火山引擎即梦图片生成服务",
    version="1.0.0"
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境中应该限制为特定域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 请求模型
class ImageGenerationRequest(BaseModel):
    prompt: str
    frame: Optional[dict] = None

class ImageGenerationResponse(BaseModel):
    success: bool
    data: Optional[dict] = None
    error: Optional[str] = None

# 常量配置
REQ_KEY = "jimeng_t2i_v40"  # 即梦V4模型
MAX_POLL_TIMES = 150  # 最大轮询次数
POLL_INTERVAL = 2  # 轮询间隔(秒)

def create_visual_service():
    """创建并配置火山引擎视觉服务实例"""
    if not SDK_AVAILABLE:
        raise HTTPException(status_code=500, detail="火山引擎SDK未安装")

    # 获取环境变量
    access_key = os.getenv('VOLCENGINE_ACCESS_KEY_ID')
    secret_key = os.getenv('VOLCENGINE_SECRET_ACCESS_KEY')

    if not access_key or not secret_key:
        raise HTTPException(
            status_code=500,
            detail="未配置VOLCENGINE_ACCESS_KEY_ID或VOLCENGINE_SECRET_ACCESS_KEY"
        )

    # 检查密钥是否是Base64编码的，如果是则解码
    import base64
    try:
        # 尝试解码
        decoded_access_key = base64.b64decode(access_key).decode('utf-8')
        decoded_secret_key = base64.b64decode(secret_key).decode('utf-8')
        print(f"🔑 [密钥解码] 使用解码后的密钥")
        access_key = decoded_access_key
        secret_key = decoded_secret_key
    except:
        # 如果解码失败，使用原始密钥
        print(f"🔑 [密钥直接] 使用原始密钥")

    # 创建服务实例
    visual_service = VisualService()
    visual_service.set_ak(access_key.strip())
    visual_service.set_sk(secret_key.strip())

    return visual_service

async def generate_image_with_sdk(prompt: str) -> str:
    """使用官方SDK生成图片"""

    print(f"\n🎨 [API启动] 提示词: \"{prompt[:50]}...\"")

    if not SDK_AVAILABLE:
        # 演示模式 - 返回模拟URL
        print("⚠️ [演示模式] SDK未安装，返回模拟图片URL")
        await asyncio.sleep(2)  # 模拟处理时间
        return f"https://example.com/demo-image-{int(time.time())}.jpg"

    # 创建服务实例
    visual_service = create_visual_service()

    # --- Step 1: 提交任务 ---
    print("\n🚀 [Step 1] 提交任务...")

    submit_form = {
        "req_key": REQ_KEY,
        "prompt": prompt,
        # 可选参数
        "return_url": True,
        "logo_info": {
            "add_logo": False,
            "position": 0,
            "language": 0,
            "opacity": 1
        }
    }

    print(f"📤 [提交参数] {json.dumps(submit_form, indent=2, ensure_ascii=False)}")

    try:
        submit_resp = visual_service.cv_sync2async_submit_task(submit_form)
        print(f"📥 [提交响应] {json.dumps(submit_resp, indent=2, ensure_ascii=False)}")

        # 检查响应状态
        if submit_resp.get('ResponseMetadata', {}).get('Error'):
            error_info = submit_resp['ResponseMetadata']['Error']
            raise HTTPException(
                status_code=400,
                detail=f"任务提交失败: {error_info.get('Message')} (Code: {error_info.get('Code')})"
            )

        # 检查新的响应格式
        if submit_resp.get('code') != 10000:
            raise HTTPException(
                status_code=400,
                detail=f"任务提交失败: {submit_resp.get('message')} (Code: {submit_resp.get('code')})"
            )

        # 获取任务ID - 适配新的响应格式
        submit_data = submit_resp.get('data', {}) or submit_resp.get('Result', {})

        # 检查是否直接返回图片URLs（少见情况）
        if submit_data.get('image_urls'):
            print("✅ [同步成功] 直接获得图片URL")
            return submit_data['image_urls'][0]

        # 检查是否直接返回base64数据（即梦V4常见情况）
        if submit_data.get('binary_data_base64') and len(submit_data['binary_data_base64']) > 0:
            base64_data = submit_data['binary_data_base64'][0]
            print(f"📷 [同步成功] 直接获得base64图片数据，长度: {len(base64_data)}")

            # 将base64数据转换为data URL格式，前端可以直接使用
            data_url = f"data:image/png;base64,{base64_data}"
            print(f"✅ [转换完成] 已转换为data URL格式")
            return data_url

        task_id = submit_data.get('task_id')
        if not task_id:
            raise HTTPException(
                status_code=500,
                detail=f"任务提交响应异常，未获得task_id: {submit_resp}"
            )

        print(f"⏳ [Step 2] 获得 TaskID: {task_id}，开始轮询...")

        # --- Step 2: 轮询结果 ---
        for i in range(MAX_POLL_TIMES):
            await asyncio.sleep(POLL_INTERVAL)

            print(f"🔄 --- [轮询 第 {i+1} 次] ---")

            # 查询任务状态
            query_form = {
                "req_key": REQ_KEY,
                "task_id": task_id,
                # V4查询时需要传递这些参数才能获得URL而不是Base64
                "return_url": True,
                "logo_info": {
                    "add_logo": False,
                    "position": 0,
                    "language": 0,
                    "opacity": 1
                }
            }

            query_resp = visual_service.cv_sync2async_get_result(query_form)
            print(f"📥 [查询响应] {json.dumps(query_resp, indent=2, ensure_ascii=False)}")

            # 检查响应错误 - 适配新的响应格式
            if query_resp.get('ResponseMetadata', {}).get('Error'):
                error_info = query_resp['ResponseMetadata']['Error']
                raise HTTPException(
                    status_code=500,
                    detail=f"查询任务失败: {error_info.get('Message')} (Code: {error_info.get('Code')})"
                )

            # 检查新的响应格式错误
            if query_resp.get('code') and query_resp.get('code') != 10000:
                raise HTTPException(
                    status_code=500,
                    detail=f"查询任务失败: {query_resp.get('message')} (Code: {query_resp.get('code')})"
                )

            query_data = query_resp.get('data', {}) or query_resp.get('Result', {})
            status = query_data.get('status')

            # 优先检查是否有 image_urls
            if query_data.get('image_urls') and len(query_data['image_urls']) > 0:
                image_url = query_data['image_urls'][0]
                print(f"🎉 [成功] 获得图片URL: {image_url}")
                return image_url

            # 检查是否有 binary_data_base64 (即梦V4常见情况)
            if query_data.get('binary_data_base64') and len(query_data['binary_data_base64']) > 0:
                base64_data = query_data['binary_data_base64'][0]
                print(f"📷 [成功] 获得base64图片数据，长度: {len(base64_data)}")

                # 将base64数据转换为data URL格式，前端可以直接使用
                data_url = f"data:image/png;base64,{base64_data}"
                print(f"✅ [转换完成] 已转换为data URL格式")
                return data_url

            # 检查任务状态
            if status == 1 or status == 10000 or status == "done":
                # 任务成功，尝试提取图片URL
                image_url = query_data.get('image_url')

                # 如果没有直接的image_url，尝试解析resp_data
                if not image_url and query_data.get('resp_data'):
                    try:
                        resp_data = query_data['resp_data']
                        if isinstance(resp_data, str):
                            resp_data = json.loads(resp_data)

                        if resp_data.get('image_urls') and len(resp_data['image_urls']) > 0:
                            image_url = resp_data['image_urls'][0]
                    except (json.JSONDecodeError, KeyError) as e:
                        print(f"⚠️ 解析resp_data失败: {e}")

                if image_url:
                    print(f"🎉 [成功] 获得图片URL: {image_url}")
                    return image_url
                else:
                    print("⏳ [等待] 状态成功但图片URL尚未生成...")

            elif status == 2 or status == -1 or status == "failed":
                raise HTTPException(
                    status_code=500,
                    detail=f"任务执行失败 (Status: {status})"
                )
            else:
                print(f"⏳ [处理中] 状态: {status}")

        # 超时
        raise HTTPException(
            status_code=408,
            detail=f"图片生成超时 (等待了 {MAX_POLL_TIMES * POLL_INTERVAL} 秒)"
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ [SDK调用错误]: {str(e)}")
        raise HTTPException(status_code=500, detail=f"SDK调用失败: {str(e)}")

@app.get("/")
async def root():
    """根路径 - API信息"""
    return {
        "service": "ScriptToFrame Image Generation API",
        "version": "1.0.0",
        "sdk_available": SDK_AVAILABLE,
        "endpoints": [
            "POST /api/generate-image - 生成图片",
            "GET /api/health - 健康检查"
        ]
    }

@app.get("/api/health")
async def health_check():
    """健康检查接口"""
    return {
        "status": "healthy",
        "service": "Image Generation Backend",
        "sdk_available": SDK_AVAILABLE,
        "timestamp": int(time.time())
    }

@app.post("/api/generate-image", response_model=ImageGenerationResponse)
async def generate_image(request: ImageGenerationRequest):
    """生成图片接口"""

    try:
        # 提取提示词
        prompt = request.prompt
        if request.frame and request.frame.get('prompt'):
            prompt = request.frame['prompt']
        elif request.frame and request.frame.get('jimengPrompt'):
            prompt = request.frame['jimengPrompt']

        if not prompt or not prompt.strip():
            raise HTTPException(status_code=400, detail="缺少必要参数: prompt")

        # 生成图片
        image_url = await generate_image_with_sdk(prompt.strip())

        # 返回结果
        return ImageGenerationResponse(
            success=True,
            data={
                "imageUrl": image_url,
                "taskId": f"jimeng_v4_{int(time.time())}",
                "prompt": prompt,
                "frame": request.frame
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ [生成失败]: {str(e)}")
        return ImageGenerationResponse(
            success=False,
            error=f"图片生成失败: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn

    # 从环境变量获取配置
    port = int(os.getenv('PORT', 8081))
    debug = os.getenv('DEBUG', 'False').lower() == 'true'

    print(f"""
🚀 启动图片生成服务
📍 端口: {port}
🔧 调试模式: {debug}
📦 SDK状态: {'可用' if SDK_AVAILABLE else '不可用'}
""")

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=debug,
        log_level="info" if debug else "warning"
    )