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
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv
from pathlib import Path

# 加载环境变量
load_dotenv()

# 导入图片存储模块
from image_storage import get_storage_provider

# 导入音频服务模块
from audio_service import get_audio_provider

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

# 挂载静态文件目录（用于本地存储模式）
generated_path = Path(__file__).parent.parent / "public" / "generated"
generated_path.mkdir(parents=True, exist_ok=True)
app.mount("/generated", StaticFiles(directory=str(generated_path)), name="generated")

# 挂载音频静态文件目录
audio_path = Path(__file__).parent.parent / "public" / "audio"
audio_path.mkdir(parents=True, exist_ok=True)
app.mount("/audio", StaticFiles(directory=str(audio_path)), name="audio")

# 请求模型
class ImageGenerationRequest(BaseModel):
    prompt: str
    frame: Optional[dict] = None
    save_to_storage: bool = True  # 是否保存到存储（返回URL而非base64）

class ImageGenerationResponse(BaseModel):
    success: bool
    data: Optional[dict] = None
    error: Optional[str] = None

# 音频生成请求模型
class AudioGenerationRequest(BaseModel):
    text: str
    page_index: Optional[int] = None
    speaker_id: str = "child"
    speed_factor: str = "1.0"
    pitch_factor: str = "1.0"

class AudioGenerationResponse(BaseModel):
    success: bool
    data: Optional[dict] = None
    error: Optional[str] = None

# 图片编辑请求模型（图生图）
class ImageEditRequest(BaseModel):
    image_url: str  # 原图URL或base64
    prompt: str  # 修改提示词
    page_index: Optional[int] = None
    strength: float = 0.65  # 修改强度 0-1，越大改动越大

class ImageEditResponse(BaseModel):
    success: bool
    data: Optional[dict] = None
    error: Optional[str] = None

# 常量配置
REQ_KEY = "jimeng_t2i_v40"  # 即梦V4模型
REQ_KEY_I2I = "jimeng_high_aes_i2i"  # 即梦图生图模型
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

# 画幅尺寸映射表（即梦API支持的尺寸）
ASPECT_RATIO_SIZES = {
    "16:9": {"width": 1920, "height": 1080},
    "4:3": {"width": 1440, "height": 1080},
    "1:1": {"width": 1080, "height": 1080},
    "3:4": {"width": 1080, "height": 1440},
    "9:16": {"width": 1080, "height": 1920},
    "21:9": {"width": 2520, "height": 1080},
    "3:2": {"width": 1620, "height": 1080},
    "2:3": {"width": 1080, "height": 1620},
}

async def generate_image_with_sdk(prompt: str, request_id: str = None, aspect_ratio: str = "16:9") -> str:
    """使用官方SDK生成图片

    Args:
        prompt: 提示词
        request_id: 请求ID
        aspect_ratio: 画幅比例，支持 16:9, 4:3, 1:1, 3:4, 9:16 等
    """

    if not request_id:
        request_id = f"img_{int(time.time())}"

    # 获取尺寸
    size_config = ASPECT_RATIO_SIZES.get(aspect_ratio, ASPECT_RATIO_SIZES["16:9"])

    print(f"\n🎨 [Python后端-{request_id}] API启动")
    print(f"📝 [Python后端-{request_id}] 生成参数:", {
        "prompt": f"{prompt[:50]}..." if len(prompt) > 50 else prompt,
        "prompt_length": len(prompt),
        "aspect_ratio": aspect_ratio,
        "size": f"{size_config['width']}x{size_config['height']}",
        "timestamp": time.strftime('%Y-%m-%d %H:%M:%S')
    })

    if not SDK_AVAILABLE:
        # 演示模式 - 返回模拟URL
        print(f"⚠️ [Python后端-{request_id}] 演示模式: SDK未安装，返回模拟图片URL")
        await asyncio.sleep(2)  # 模拟处理时间
        demo_url = f"https://example.com/demo-image-{int(time.time())}.jpg"
        print(f"✅ [Python后端-{request_id}] 演示模式完成: {demo_url}")
        return demo_url

    # 创建服务实例
    print(f"🔧 [Python后端-{request_id}] 初始化火山引擎SDK...")
    visual_service = create_visual_service()
    print(f"✅ [Python后端-{request_id}] SDK初始化完成")

    # --- Step 1: 提交任务 ---
    print(f"\n🚀 [Python后端-{request_id}] Step 1: 提交任务...")

    submit_form = {
        "req_key": REQ_KEY,
        "prompt": prompt,
        # 尺寸参数
        "width": size_config["width"],
        "height": size_config["height"],
        # 可选参数
        "return_url": True,
        "logo_info": {
            "add_logo": False,
            "position": 0,
            "language": 0,
            "opacity": 1
        }
    }

    print(f"📤 [Python后端-{request_id}] 提交参数: {json.dumps(submit_form, indent=2, ensure_ascii=False)}")

    try:
        submit_start = time.time()
        submit_resp = visual_service.cv_sync2async_submit_task(submit_form)
        submit_time = time.time() - submit_start

        print(f"📥 [Python后端-{request_id}] 提交响应 (耗时: {submit_time:.2f}s): {json.dumps(submit_resp, indent=2, ensure_ascii=False)}")

        # 检查响应状态
        if submit_resp.get('ResponseMetadata', {}).get('Error'):
            error_info = submit_resp['ResponseMetadata']['Error']
            print(f"❌ [Python后端-{request_id}] 任务提交失败 - ResponseMetadata错误: {error_info}")
            raise HTTPException(
                status_code=400,
                detail=f"任务提交失败: {error_info.get('Message')} (Code: {error_info.get('Code')})"
            )

        # 检查新的响应格式
        if submit_resp.get('code') != 10000:
            print(f"❌ [Python后端-{request_id}] 任务提交失败 - 业务错误: code={submit_resp.get('code')}, message={submit_resp.get('message')}")
            raise HTTPException(
                status_code=400,
                detail=f"任务提交失败: {submit_resp.get('message')} (Code: {submit_resp.get('code')})"
            )

        # 获取任务ID - 适配新的响应格式
        submit_data = submit_resp.get('data', {}) or submit_resp.get('Result', {})
        print(f"📊 [Python后端-{request_id}] 解析提交数据: {json.dumps(submit_data, indent=2, ensure_ascii=False)}")

        # 检查是否直接返回图片URLs（少见情况）
        if submit_data.get('image_urls'):
            result_url = submit_data['image_urls'][0]
            print(f"✅ [Python后端-{request_id}] 同步成功 - 直接获得图片URL: {result_url}")
            return result_url

        # 检查是否直接返回base64数据（即梦V4常见情况）
        if submit_data.get('binary_data_base64') and len(submit_data['binary_data_base64']) > 0:
            base64_data = submit_data['binary_data_base64'][0]
            print(f"📷 [Python后端-{request_id}] 同步成功 - 获得base64图片数据，长度: {len(base64_data)}")

            # 将base64数据转换为data URL格式，前端可以直接使用
            data_url = f"data:image/png;base64,{base64_data}"
            print(f"✅ [Python后端-{request_id}] 转换完成 - 已转换为data URL格式")
            return data_url

        task_id = submit_data.get('task_id')
        if not task_id:
            print(f"❌ [Python后端-{request_id}] 任务提交失败 - 未获得task_id")
            raise HTTPException(
                status_code=500,
                detail=f"任务提交响应异常，未获得task_id: {submit_resp}"
            )

        print(f"⏳ [Python后端-{request_id}] Step 2: 获得TaskID: {task_id}，开始轮询...")

        # --- Step 2: 轮询结果 ---
        for i in range(MAX_POLL_TIMES):
            await asyncio.sleep(POLL_INTERVAL)

            print(f"🔄 [Python后端-{request_id}] 轮询第 {i+1}/{MAX_POLL_TIMES} 次")

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

            query_start = time.time()
            query_resp = visual_service.cv_sync2async_get_result(query_form)
            query_time = time.time() - query_start

            print(f"📥 [Python后端-{request_id}] 查询响应 (耗时: {query_time:.2f}s): {json.dumps(query_resp, indent=2, ensure_ascii=False)}")

            # 检查响应错误 - 适配新的响应格式
            if query_resp.get('ResponseMetadata', {}).get('Error'):
                error_info = query_resp['ResponseMetadata']['Error']
                print(f"❌ [Python后端-{request_id}] 查询失败 - ResponseMetadata错误: {error_info}")
                raise HTTPException(
                    status_code=500,
                    detail=f"查询任务失败: {error_info.get('Message')} (Code: {error_info.get('Code')})"
                )

            # 检查新的响应格式错误
            if query_resp.get('code') and query_resp.get('code') != 10000:
                print(f"❌ [Python后端-{request_id}] 查询失败 - 业务错误: code={query_resp.get('code')}, message={query_resp.get('message')}")
                raise HTTPException(
                    status_code=500,
                    detail=f"查询任务失败: {query_resp.get('message')} (Code: {query_resp.get('code')})"
                )

            query_data = query_resp.get('data', {}) or query_resp.get('Result', {})
            status = query_data.get('status')

            print(f"📊 [Python后端-{request_id}] 任务状态: {status}")

            # 优先检查是否有 image_urls
            if query_data.get('image_urls') and len(query_data['image_urls']) > 0:
                image_url = query_data['image_urls'][0]
                print(f"🎉 [Python后端-{request_id}] 获得图片URL: {image_url}")
                return image_url

            # 检查是否有 binary_data_base64 (即梦V4常见情况)
            if query_data.get('binary_data_base64') and len(query_data['binary_data_base64']) > 0:
                base64_data = query_data['binary_data_base64'][0]
                print(f"📷 [Python后端-{request_id}] 获得base64图片数据，长度: {len(base64_data)}")

                # 将base64数据转换为data URL格式，前端可以直接使用
                data_url = f"data:image/png;base64,{base64_data}"
                print(f"✅ [Python后端-{request_id}] 转换完成 - 已转换为data URL格式")
                return data_url

            # 检查任务状态
            if status == 1 or status == 10000 or status == "done":
                # 任务成功，尝试提取图片URL
                print(f"✅ [Python后端-{request_id}] 任务状态成功，尝试提取图片URL...")
                image_url = query_data.get('image_url')

                # 如果没有直接的image_url，尝试解析resp_data
                if not image_url and query_data.get('resp_data'):
                    try:
                        print(f"🔍 [Python后端-{request_id}] 解析resp_data...")
                        resp_data = query_data['resp_data']
                        if isinstance(resp_data, str):
                            resp_data = json.loads(resp_data)

                        if resp_data.get('image_urls') and len(resp_data['image_urls']) > 0:
                            image_url = resp_data['image_urls'][0]
                            print(f"📷 [Python后端-{request_id}] 从resp_data提取到图片URL: {image_url}")
                    except (json.JSONDecodeError, KeyError) as e:
                        print(f"⚠️ [Python后端-{request_id}] 解析resp_data失败: {e}")

                if image_url:
                    print(f"🎉 [Python后端-{request_id}] 最终获得图片URL: {image_url}")
                    return image_url
                else:
                    print(f"⏳ [Python后端-{request_id}] 状态成功但图片URL尚未生成，继续等待...")

            elif status == 2 or status == -1 or status == "failed":
                print(f"❌ [Python后端-{request_id}] 任务执行失败，状态: {status}")
                raise HTTPException(
                    status_code=500,
                    detail=f"任务执行失败 (Status: {status})"
                )
            else:
                print(f"⏳ [Python后端-{request_id}] 任务处理中，状态: {status}")

        # 超时
        total_wait_time = MAX_POLL_TIMES * POLL_INTERVAL
        print(f"⏰ [Python后端-{request_id}] 图片生成超时，等待时间: {total_wait_time}秒")
        raise HTTPException(
            status_code=408,
            detail=f"图片生成超时 (等待了 {total_wait_time} 秒)"
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ [Python后端-{request_id}] SDK调用错误:", {
            "error_type": type(e).__name__,
            "error_message": str(e),
            "timestamp": time.strftime('%Y-%m-%d %H:%M:%S')
        })
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
    storage = get_storage_provider()
    audio = get_audio_provider()
    return {
        "status": "healthy",
        "service": "Image & Audio Generation Backend",
        "sdk_available": SDK_AVAILABLE,
        "storage_provider": type(storage).__name__,
        "storage_external_accessible": storage.is_url_accessible_externally(),
        "audio_provider": type(audio).__name__,
        "timestamp": int(time.time())
    }

@app.post("/api/generate-image", response_model=ImageGenerationResponse)
async def generate_image(request: ImageGenerationRequest):
    """生成图片接口"""

    request_id = f"api_{int(time.time())}"

    print(f"\n🎯 [Python后端-{request_id}] 收到图片生成请求:", {
        "timestamp": time.strftime('%Y-%m-%d %H:%M:%S'),
        "has_prompt": bool(request.prompt),
        "has_frame": bool(request.frame),
        "prompt_length": len(request.prompt) if request.prompt else 0,
        "save_to_storage": request.save_to_storage
    })

    try:
        # 提取提示词
        prompt = request.prompt
        if request.frame and request.frame.get('prompt'):
            prompt = request.frame['prompt']
        elif request.frame and request.frame.get('jimengPrompt'):
            prompt = request.frame['jimengPrompt']

        # 提取画幅参数
        aspect_ratio = "16:9"  # 默认值
        if request.frame and request.frame.get('aspectRatio'):
            aspect_ratio = request.frame['aspectRatio']

        print(f"📝 [Python后端-{request_id}] 解析参数:", {
            "final_prompt": f"{prompt[:50]}..." if prompt and len(prompt) > 50 else prompt,
            "aspect_ratio": aspect_ratio,
            "frame_data": request.frame if request.frame else None,
            "prompt_source": "request.prompt" if request.prompt else ("frame.prompt" if request.frame and request.frame.get('prompt') else ("frame.jimengPrompt" if request.frame and request.frame.get('jimengPrompt') else "none"))
        })

        if not prompt or not prompt.strip():
            print(f"❌ [Python后端-{request_id}] 参数验证失败: 缺少提示词")
            raise HTTPException(status_code=400, detail="缺少必要参数: prompt")

        print(f"🎨 [Python后端-{request_id}] 开始图片生成... 画幅: {aspect_ratio}")

        # 生成图片（返回base64或URL）
        image_data = await generate_image_with_sdk(prompt.strip(), request_id, aspect_ratio)

        # 确定文件夹和文件名
        folder = ""
        filename_prefix = "img"
        if request.frame:
            frame_type = request.frame.get('type', '')
            if frame_type == 'character':
                folder = "characters"
                char_id = request.frame.get('characterId', request_id)
                filename_prefix = f"char_{char_id}"
            elif frame_type == 'page':
                folder = "pages"
                page_index = request.frame.get('pageIndex', 0)
                filename_prefix = f"page_{page_index}"

        # 如果需要保存到存储
        final_url = image_data
        storage_info = {}

        if request.save_to_storage and image_data.startswith("data:"):
            print(f"💾 [Python后端-{request_id}] 保存图片到存储...")
            storage = get_storage_provider()

            local_path, public_url = await storage.save_image(
                image_data,
                filename=filename_prefix,
                folder=folder
            )

            final_url = public_url
            storage_info = {
                "storage_provider": type(storage).__name__,
                "local_path": local_path,
                "external_accessible": storage.is_url_accessible_externally()
            }

            print(f"💾 [Python后端-{request_id}] 存储完成: {public_url}")

        print(f"✅ [Python后端-{request_id}] 图片生成完成:", {
            "url_type": "file_url" if not final_url.startswith("data:") else "data_url",
            "url_length": len(final_url),
            "is_demo": "example.com" in final_url,
            **storage_info
        })

        # 返回结果
        response_data = {
            "imageUrl": final_url,
            "taskId": f"jimeng_v4_{request_id}",
            "prompt": prompt,
            "frame": request.frame,
            **storage_info
        }

        print(f"📤 [Python后端-{request_id}] 构造响应:", {
            "success": True,
            "response_keys": list(response_data.keys()),
            "url_preview": final_url[:100] + "..." if len(final_url) > 100 else final_url
        })

        return ImageGenerationResponse(
            success=True,
            data=response_data
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ [Python后端-{request_id}] 生成失败:", {
            "error_type": type(e).__name__,
            "error_message": str(e),
            "timestamp": time.strftime('%Y-%m-%d %H:%M:%S')
        })
        return ImageGenerationResponse(
            success=False,
            error=f"图片生成失败: {str(e)}"
        )

@app.post("/api/generate-audio", response_model=AudioGenerationResponse)
async def generate_audio(request: AudioGenerationRequest):
    """生成音频接口"""

    request_id = f"audio_{int(time.time())}"

    print(f"\n🔊 [Python后端-{request_id}] 收到音频生成请求:", {
        "timestamp": time.strftime('%Y-%m-%d %H:%M:%S'),
        "text_length": len(request.text) if request.text else 0,
        "page_index": request.page_index,
        "speaker_id": request.speaker_id,
        "speed_factor": request.speed_factor,
        "pitch_factor": request.pitch_factor
    })

    try:
        if not request.text or not request.text.strip():
            print(f"❌ [Python后端-{request_id}] 参数验证失败: 缺少文本")
            raise HTTPException(status_code=400, detail="缺少必要参数: text")

        # 获取音频Provider
        audio_provider = get_audio_provider()

        # 生成文件名
        if request.page_index is not None:
            filename = f"page_{request.page_index}"
            folder = "pages"
        else:
            filename = f"audio_{request_id}"
            folder = ""

        print(f"🎤 [Python后端-{request_id}] 开始音频合成...")

        # 合成并保存音频
        local_path, audio_url = await audio_provider.synthesize_and_save(
            text=request.text.strip(),
            filename=filename,
            folder=folder,
            speaker_id=request.speaker_id,
            speed_factor=request.speed_factor,
            pitch_factor=request.pitch_factor
        )

        print(f"✅ [Python后端-{request_id}] 音频生成完成:", {
            "audio_url": audio_url,
            "local_path": local_path
        })

        return AudioGenerationResponse(
            success=True,
            data={
                "audioUrl": audio_url,
                "localPath": local_path,
                "text": request.text,
                "pageIndex": request.page_index,
                "speakerId": request.speaker_id
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ [Python后端-{request_id}] 音频生成失败:", {
            "error_type": type(e).__name__,
            "error_message": str(e),
            "timestamp": time.strftime('%Y-%m-%d %H:%M:%S')
        })
        return AudioGenerationResponse(
            success=False,
            error=f"音频生成失败: {str(e)}"
        )

async def edit_image_with_sdk(image_url: str, prompt: str, strength: float = 0.65, request_id: str = None) -> str:
    """使用官方SDK进行图生图编辑"""
    import base64
    import httpx

    if not request_id:
        request_id = f"edit_{int(time.time())}"

    print(f"\n🖌️ [Python后端-{request_id}] 图生图API启动")
    print(f"📝 [Python后端-{request_id}] 编辑参数:", {
        "prompt": f"{prompt[:50]}..." if len(prompt) > 50 else prompt,
        "strength": strength,
        "image_url_type": "base64" if image_url.startswith("data:") else "url",
        "timestamp": time.strftime('%Y-%m-%d %H:%M:%S')
    })

    if not SDK_AVAILABLE:
        print(f"⚠️ [Python后端-{request_id}] 演示模式: SDK未安装")
        await asyncio.sleep(2)
        return f"https://example.com/demo-edited-{int(time.time())}.jpg"

    # 创建服务实例
    print(f"🔧 [Python后端-{request_id}] 初始化火山引擎SDK...")
    visual_service = create_visual_service()

    # 准备图片数据
    binary_data = None

    if image_url.startswith("data:"):
        # 从 data URL 提取 base64
        try:
            base64_part = image_url.split(",", 1)[1]
            binary_data = base64_part
            print(f"📷 [Python后端-{request_id}] 从data URL提取base64，长度: {len(binary_data)}")
        except:
            raise HTTPException(status_code=400, detail="无效的data URL格式")
    elif image_url.startswith("http"):
        # 下载图片并转为base64
        print(f"📥 [Python后端-{request_id}] 下载原图: {image_url[:100]}...")
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.get(image_url)
                resp.raise_for_status()
                binary_data = base64.b64encode(resp.content).decode('utf-8')
                print(f"📷 [Python后端-{request_id}] 下载完成，base64长度: {len(binary_data)}")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"无法下载原图: {str(e)}")
    elif image_url.startswith("/"):
        # 本地路径
        local_file = Path(__file__).parent.parent / "public" / image_url.lstrip("/")
        if local_file.exists():
            with open(local_file, "rb") as f:
                binary_data = base64.b64encode(f.read()).decode('utf-8')
            print(f"📷 [Python后端-{request_id}] 读取本地文件: {local_file}")
        else:
            raise HTTPException(status_code=400, detail=f"本地文件不存在: {image_url}")
    else:
        raise HTTPException(status_code=400, detail="不支持的图片URL格式")

    # 构建图生图请求
    submit_form = {
        "req_key": REQ_KEY_I2I,
        "prompt": prompt,
        "binary_data_base64": [binary_data],
        "strength": strength,  # 控制修改程度
        "return_url": True,
        "logo_info": {
            "add_logo": False,
            "position": 0,
            "language": 0,
            "opacity": 1
        }
    }

    print(f"📤 [Python后端-{request_id}] 提交图生图任务...")

    try:
        submit_start = time.time()
        submit_resp = visual_service.cv_sync2async_submit_task(submit_form)
        submit_time = time.time() - submit_start

        print(f"📥 [Python后端-{request_id}] 提交响应 (耗时: {submit_time:.2f}s)")

        # 检查响应
        if submit_resp.get('ResponseMetadata', {}).get('Error'):
            error_info = submit_resp['ResponseMetadata']['Error']
            raise HTTPException(status_code=400, detail=f"任务提交失败: {error_info.get('Message')}")

        if submit_resp.get('code') and submit_resp.get('code') != 10000:
            raise HTTPException(status_code=400, detail=f"任务提交失败: {submit_resp.get('message')}")

        submit_data = submit_resp.get('data', {}) or submit_resp.get('Result', {})

        # 检查是否直接返回结果
        if submit_data.get('image_urls') and len(submit_data['image_urls']) > 0:
            return submit_data['image_urls'][0]

        if submit_data.get('binary_data_base64') and len(submit_data['binary_data_base64']) > 0:
            return f"data:image/png;base64,{submit_data['binary_data_base64'][0]}"

        task_id = submit_data.get('task_id')
        if not task_id:
            raise HTTPException(status_code=500, detail="未获得task_id")

        print(f"⏳ [Python后端-{request_id}] 获得TaskID: {task_id}，开始轮询...")

        # 轮询结果
        for i in range(MAX_POLL_TIMES):
            await asyncio.sleep(POLL_INTERVAL)

            query_form = {
                "req_key": REQ_KEY_I2I,
                "task_id": task_id,
                "return_url": True,
                "logo_info": {"add_logo": False}
            }

            query_resp = visual_service.cv_sync2async_get_result(query_form)
            query_data = query_resp.get('data', {}) or query_resp.get('Result', {})

            if query_data.get('image_urls') and len(query_data['image_urls']) > 0:
                print(f"🎉 [Python后端-{request_id}] 图生图完成!")
                return query_data['image_urls'][0]

            if query_data.get('binary_data_base64') and len(query_data['binary_data_base64']) > 0:
                print(f"🎉 [Python后端-{request_id}] 图生图完成!")
                return f"data:image/png;base64,{query_data['binary_data_base64'][0]}"

            status = query_data.get('status')
            if status == 2 or status == -1 or status == "failed":
                raise HTTPException(status_code=500, detail="图生图任务执行失败")

            print(f"🔄 [Python后端-{request_id}] 轮询 {i+1}/{MAX_POLL_TIMES}，状态: {status}")

        raise HTTPException(status_code=408, detail="图生图任务超时")

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ [Python后端-{request_id}] 图生图错误: {str(e)}")
        raise HTTPException(status_code=500, detail=f"图生图失败: {str(e)}")


@app.post("/api/edit-image", response_model=ImageEditResponse)
async def edit_image(request: ImageEditRequest):
    """图片编辑接口（图生图）"""

    request_id = f"edit_{int(time.time())}"

    print(f"\n🖌️ [Python后端-{request_id}] 收到图片编辑请求:", {
        "timestamp": time.strftime('%Y-%m-%d %H:%M:%S'),
        "prompt": request.prompt[:50] if request.prompt else "",
        "page_index": request.page_index,
        "strength": request.strength,
        "image_url_type": "base64" if request.image_url.startswith("data:") else "url"
    })

    try:
        if not request.prompt or not request.prompt.strip():
            raise HTTPException(status_code=400, detail="缺少修改提示词")

        if not request.image_url:
            raise HTTPException(status_code=400, detail="缺少原图")

        # 执行图生图
        image_data = await edit_image_with_sdk(
            image_url=request.image_url,
            prompt=request.prompt.strip(),
            strength=request.strength,
            request_id=request_id
        )

        # 保存结果
        final_url = image_data
        storage_info = {}

        if image_data.startswith("data:"):
            print(f"💾 [Python后端-{request_id}] 保存编辑后的图片...")
            storage = get_storage_provider()

            folder = "pages"
            filename_prefix = f"edited_{request.page_index}" if request.page_index else f"edited_{request_id}"

            local_path, public_url = await storage.save_image(
                image_data,
                filename=filename_prefix,
                folder=folder
            )

            final_url = public_url
            storage_info = {
                "storage_provider": type(storage).__name__,
                "local_path": local_path
            }

        print(f"✅ [Python后端-{request_id}] 图片编辑完成: {final_url[:100]}...")

        return ImageEditResponse(
            success=True,
            data={
                "imageUrl": final_url,
                "prompt": request.prompt,
                "pageIndex": request.page_index,
                **storage_info
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ [Python后端-{request_id}] 编辑失败: {str(e)}")
        return ImageEditResponse(
            success=False,
            error=f"图片编辑失败: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn

    # 从环境变量获取配置
    port = int(os.getenv('PORT', 8081))
    debug = os.getenv('DEBUG', 'False').lower() == 'true'
    storage_provider = os.getenv('IMAGE_STORAGE_PROVIDER', 'local')
    audio_provider_type = os.getenv('AUDIO_PROVIDER', 'websocket_tts')

    # 初始化Provider（打印配置信息）
    storage = get_storage_provider()
    audio = get_audio_provider()

    print(f"""
🚀 启动图片/音频生成服务
═══════════════════════════════════════
📍 端口: {port}
🔧 调试模式: {debug}
📦 SDK状态: {'✅ 可用' if SDK_AVAILABLE else '❌ 不可用'}
💾 图片存储: {storage_provider} ({type(storage).__name__})
🌐 外部可访问: {'✅ 是' if storage.is_url_accessible_externally() else '❌ 否（仅本地）'}
🔊 音频服务: {audio_provider_type} ({type(audio).__name__})
═══════════════════════════════════════

💡 配置说明:
   # 图片存储
   export IMAGE_STORAGE_PROVIDER=local          # 本地存储（默认）
   export IMAGE_STORAGE_PROVIDER=volcengine_tos # 火山引擎TOS

   # 音频服务
   export AUDIO_PROVIDER=websocket_tts          # WebSocket TTS（默认）
   export AUDIO_PROVIDER=volcengine_tts         # 火山引擎TTS
""")

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=debug,
        log_level="info" if debug else "warning"
    )