import asyncio
import websockets
import json
import numpy as np
import wave
import time

class SimpleTTSClient:
    def __init__(self, server_url, speaker_id):
        self.server_url = server_url
        self.speaker_id = speaker_id
        self.audio_data = []
        self.sample_rate = 16000
        
        # 时延记录相关变量
        self.text_sent_time = 0
        self.first_audio_received_time = 0
        self.first_audio_received = False
        
    async def synthesize_text(self, text):
        """简单的文本合成"""
        async with websockets.connect(self.server_url) as websocket:
            # 1. 初始化会话
            init_message = {
                "type": "init_session",
                "speaker_id": self.speaker_id,
                "speed_factor":"1.0",
                "pitch_factor":"1.0"
            }
            await websocket.send(json.dumps(init_message))
            
            # 等待初始化响应
            response = await websocket.recv()
            response_data = json.loads(response)
            print(f"会话初始化: {response_data.get('message')}")
            
            # 2. 发送文本
            for i, char in enumerate(text):
                print(char)

                text_message = {
                    "type": "text",
                    "text": char
                }

                # 记录第一个字符发送时间
                if i == 0:
                    self.text_sent_time = time.time()
                    print(f"文本发送开始时间: {self.text_sent_time}")

                await websocket.send(json.dumps(text_message))
            
            # 3. 发送结束信号
            end_message = {"type": "end"}
            await websocket.send(json.dumps(end_message))
            
            # 4. 接收音频数据
            while True:
                message = await websocket.recv()
                
                if isinstance(message, bytes):
                    # 记录首个音频包到达时延
                    if not self.first_audio_received:
                        self.first_audio_received_time = time.time()
                        latency = (self.first_audio_received_time - self.text_sent_time) * 1000  # 转换为毫秒
                        print("=== 首个音频包时延统计 ===")
                        print(f"文本发送时间: {self.text_sent_time:.6f} s")
                        print(f"首个音频包到达时间: {self.first_audio_received_time:.6f} s")
                        print(f"首个音频包到达时延: {latency:.2f} ms")
                        print("========================")
                        self.first_audio_received = True
                    
                    # PCM音频数据
                    audio_array = np.frombuffer(message, dtype=np.int16)
                    self.audio_data.extend(audio_array)
                else:
                    response_data = json.loads(message)
                    if response_data.get("type") == "audio":
                        self.sample_rate = response_data.get("sample_rate", 16000)
                    elif response_data.get("type") == "end_response":
                        break
    
    def save_audio(self, output_file):
        """保存音频文件"""
        if self.audio_data:
            audio_array = np.array(self.audio_data, dtype=np.int16)
            with wave.open(output_file, 'wb') as wav_file:
                wav_file.setnchannels(1)
                wav_file.setsampwidth(2)
                wav_file.setframerate(self.sample_rate)
                wav_file.writeframes(audio_array.tobytes())
            print(f"音频已保存: {output_file}")


async def main():
    SERVER_URL = "wss://u703085-b0ba-2ca13868.bjb1.seetacloud.com:8443/ws/tts"
    SPEAKER_ID = "child"
    TEXT = '''你好呀～我是豆包，很高兴能和你聊天'''
    OUTPUT_FILE = "./output6.wav"
    
    print(f"开始合成: {TEXT}")
    
    client = SimpleTTSClient(SERVER_URL, SPEAKER_ID)
    await client.synthesize_text(TEXT)
    client.save_audio(OUTPUT_FILE)
    
    print("合成完成！")


if __name__ == "__main__":
    asyncio.run(main())
