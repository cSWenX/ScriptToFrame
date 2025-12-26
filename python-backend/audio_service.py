"""
音频生成服务模块
支持多种TTS提供商：WebSocket TTS、火山引擎TTS等
通过环境变量 AUDIO_PROVIDER 切换
"""

import os
import asyncio
import json
import time
import hashlib
from abc import ABC, abstractmethod
from typing import Optional, Tuple
from pathlib import Path

# 音频Provider类型
AUDIO_WEBSOCKET_TTS = "websocket_tts"
AUDIO_VOLCENGINE_TTS = "volcengine_tts"

class AudioProvider(ABC):
    """音频生成Provider抽象基类"""

    @abstractmethod
    async def synthesize(self, text: str, speaker_id: str = "child",
                        speed_factor: str = "1.0", pitch_factor: str = "1.0") -> bytes:
        """
        合成音频

        Args:
            text: 要合成的文本
            speaker_id: 说话人ID
            speed_factor: 语速因子
            pitch_factor: 音调因子

        Returns:
            bytes: PCM音频数据
        """
        pass

    @abstractmethod
    async def synthesize_and_save(self, text: str, filename: str, folder: str = "",
                                  speaker_id: str = "child", speed_factor: str = "1.0",
                                  pitch_factor: str = "1.0") -> Tuple[str, str]:
        """
        合成音频并保存

        Args:
            text: 要合成的文本
            filename: 文件名前缀
            folder: 子文件夹
            speaker_id: 说话人ID
            speed_factor: 语速因子
            pitch_factor: 音调因子

        Returns:
            Tuple[local_path, public_url]: 本地路径和访问URL
        """
        pass

    def _generate_filename(self, prefix: str = "audio") -> str:
        """生成唯一文件名"""
        timestamp = int(time.time() * 1000)
        random_hash = hashlib.md5(str(timestamp).encode()).hexdigest()[:8]
        return f"{prefix}_{timestamp}_{random_hash}"


class WebSocketTTSProvider(AudioProvider):
    """
    WebSocket TTS Provider
    使用自定义WebSocket TTS服务
    """

    def __init__(self):
        self.server_url = os.getenv('TTS_WEBSOCKET_URL',
            'wss://u703085-b0ba-2ca13868.bjb1.seetacloud.com:8443/ws/tts')
        self.sample_rate = 16000

        # 音频保存路径
        current_dir = Path(__file__).parent
        self.base_path = current_dir.parent / "public" / "audio"
        self.base_url = "/audio"

        # 确保目录存在
        self.base_path.mkdir(parents=True, exist_ok=True)

        print(f"🔊 [WebSocketTTS] 初始化")
        print(f"   服务地址: {self.server_url}")
        print(f"   存储路径: {self.base_path}")

    async def synthesize(self, text: str, speaker_id: str = "child",
                        speed_factor: str = "1.0", pitch_factor: str = "1.0") -> bytes:
        """合成音频，返回PCM数据"""
        try:
            import websockets
            import numpy as np
        except ImportError:
            raise RuntimeError("请安装依赖: pip install websockets numpy")

        audio_data = []

        async with websockets.connect(self.server_url) as websocket:
            # 1. 初始化会话
            init_message = {
                "type": "init_session",
                "speaker_id": speaker_id,
                "speed_factor": speed_factor,
                "pitch_factor": pitch_factor
            }
            await websocket.send(json.dumps(init_message))

            # 等待初始化响应
            response = await websocket.recv()
            response_data = json.loads(response)
            print(f"🔊 [WebSocketTTS] 会话初始化: {response_data.get('message')}")

            # 2. 逐字符发送文本
            for char in text:
                text_message = {
                    "type": "text",
                    "text": char
                }
                await websocket.send(json.dumps(text_message))

            # 3. 发送结束信号
            end_message = {"type": "end"}
            await websocket.send(json.dumps(end_message))

            # 4. 接收音频数据
            while True:
                message = await websocket.recv()

                if isinstance(message, bytes):
                    # PCM音频数据
                    audio_array = np.frombuffer(message, dtype=np.int16)
                    audio_data.extend(audio_array)
                else:
                    response_data = json.loads(message)
                    if response_data.get("type") == "audio":
                        self.sample_rate = response_data.get("sample_rate", 16000)
                    elif response_data.get("type") == "end_response":
                        break

        # 转换为bytes
        audio_array = np.array(audio_data, dtype=np.int16)
        return audio_array.tobytes()

    async def synthesize_and_save(self, text: str, filename: str = None, folder: str = "",
                                  speaker_id: str = "child", speed_factor: str = "1.0",
                                  pitch_factor: str = "1.0") -> Tuple[str, str]:
        """合成音频并保存为WAV文件"""
        import wave
        import numpy as np

        # 生成文件名
        if not filename:
            filename = self._generate_filename()
        if not filename.endswith('.wav'):
            filename = f"{filename}.wav"

        # 构建完整路径
        if folder:
            save_dir = self.base_path / folder
            save_dir.mkdir(parents=True, exist_ok=True)
            file_path = save_dir / filename
            url_path = f"{self.base_url}/{folder}/{filename}"
        else:
            file_path = self.base_path / filename
            url_path = f"{self.base_url}/{filename}"

        # 合成音频
        print(f"🔊 [WebSocketTTS] 开始合成: {text[:30]}...")
        start_time = time.time()

        pcm_data = await self.synthesize(text, speaker_id, speed_factor, pitch_factor)

        # 保存为WAV文件
        audio_array = np.frombuffer(pcm_data, dtype=np.int16)
        with wave.open(str(file_path), 'wb') as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(self.sample_rate)
            wav_file.writeframes(audio_array.tobytes())

        elapsed = time.time() - start_time
        duration = len(audio_array) / self.sample_rate

        print(f"✅ [WebSocketTTS] 合成完成")
        print(f"   文本长度: {len(text)} 字符")
        print(f"   音频时长: {duration:.2f} 秒")
        print(f"   处理耗时: {elapsed:.2f} 秒")
        print(f"   保存路径: {file_path}")

        return str(file_path), url_path


class VolcengineTTSProvider(AudioProvider):
    """
    火山引擎TTS Provider（预留）
    需要配置火山引擎TTS相关密钥
    """

    def __init__(self):
        self.app_id = os.getenv('VOLCENGINE_TTS_APP_ID')
        self.access_token = os.getenv('VOLCENGINE_TTS_ACCESS_TOKEN')

        if self._is_configured():
            print(f"🔊 [VolcengineTTS] 初始化成功")
        else:
            print(f"⚠️ [VolcengineTTS] 未配置")

    def _is_configured(self) -> bool:
        return all([self.app_id, self.access_token])

    async def synthesize(self, text: str, speaker_id: str = "child",
                        speed_factor: str = "1.0", pitch_factor: str = "1.0") -> bytes:
        raise NotImplementedError("火山引擎TTS Provider待实现")

    async def synthesize_and_save(self, text: str, filename: str = None, folder: str = "",
                                  speaker_id: str = "child", speed_factor: str = "1.0",
                                  pitch_factor: str = "1.0") -> Tuple[str, str]:
        raise NotImplementedError("火山引擎TTS Provider待实现")


# ============ 工厂函数 ============

_audio_instance: Optional[AudioProvider] = None

def get_audio_provider() -> AudioProvider:
    """
    获取音频Provider实例（单例模式）
    通过环境变量 AUDIO_PROVIDER 控制使用哪种TTS服务

    支持的值：
    - websocket_tts (默认): WebSocket TTS服务
    - volcengine_tts: 火山引擎TTS
    """
    global _audio_instance

    if _audio_instance is not None:
        return _audio_instance

    provider_type = os.getenv('AUDIO_PROVIDER', AUDIO_WEBSOCKET_TTS).lower()

    print(f"🔧 [Audio] 初始化音频Provider: {provider_type}")

    if provider_type == AUDIO_WEBSOCKET_TTS:
        _audio_instance = WebSocketTTSProvider()
    elif provider_type == AUDIO_VOLCENGINE_TTS:
        _audio_instance = VolcengineTTSProvider()
    else:
        print(f"⚠️ [Audio] 未知的Provider类型: {provider_type}，使用WebSocket TTS")
        _audio_instance = WebSocketTTSProvider()

    return _audio_instance


def reset_audio_provider():
    """重置音频Provider实例（用于切换Provider）"""
    global _audio_instance
    _audio_instance = None
