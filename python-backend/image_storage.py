"""
图片存储服务模块
支持多种存储方式：本地文件、云端OSS等
通过环境变量 IMAGE_STORAGE_PROVIDER 切换
"""

import os
import base64
import time
import hashlib
from abc import ABC, abstractmethod
from typing import Optional, Tuple
from pathlib import Path

# 存储Provider类型
STORAGE_LOCAL = "local"
STORAGE_VOLCENGINE_TOS = "volcengine_tos"
STORAGE_ALIYUN_OSS = "aliyun_oss"
STORAGE_TENCENT_COS = "tencent_cos"


class ImageStorageProvider(ABC):
    """图片存储Provider抽象基类"""

    @abstractmethod
    async def save_image(self, image_data: str, filename: str, folder: str = "") -> Tuple[str, str]:
        """
        保存图片

        Args:
            image_data: base64编码的图片数据 或 data:image/png;base64,xxx 格式
            filename: 文件名（不含路径）
            folder: 子文件夹名

        Returns:
            Tuple[local_path, public_url]: 本地路径和公网URL
        """
        pass

    @abstractmethod
    def get_public_url(self, filename: str, folder: str = "") -> str:
        """获取图片的公网访问URL"""
        pass

    @abstractmethod
    def is_url_accessible_externally(self) -> bool:
        """返回的URL是否可被外部服务（如即梦API）访问"""
        pass

    def _extract_base64(self, image_data: str) -> Tuple[str, str]:
        """从data URL或纯base64中提取数据"""
        if image_data.startswith('data:'):
            # data:image/png;base64,xxxxx
            header, data = image_data.split(',', 1)
            # 提取图片格式
            mime_type = header.split(':')[1].split(';')[0]
            ext = mime_type.split('/')[1]
            if ext == 'jpeg':
                ext = 'jpg'
            return data, ext
        else:
            # 纯base64，假设是png
            return image_data, 'png'

    def _generate_filename(self, prefix: str = "img") -> str:
        """生成唯一文件名"""
        timestamp = int(time.time() * 1000)
        random_hash = hashlib.md5(str(timestamp).encode()).hexdigest()[:8]
        return f"{prefix}_{timestamp}_{random_hash}"


class LocalStorageProvider(ImageStorageProvider):
    """
    本地文件存储Provider
    将图片保存到 Next.js 的 public 目录，通过静态服务访问
    """

    def __init__(self, base_path: str = None, base_url: str = None):
        """
        Args:
            base_path: 存储根目录，默认为 ../public/generated
            base_url: 访问URL前缀，默认为 /generated
        """
        if base_path:
            self.base_path = Path(base_path)
        else:
            # 默认存储到 Next.js public 目录
            current_dir = Path(__file__).parent
            self.base_path = current_dir.parent / "public" / "generated"

        self.base_url = base_url or "/generated"

        # 确保目录存在
        self.base_path.mkdir(parents=True, exist_ok=True)
        print(f"📁 [LocalStorage] 初始化，存储路径: {self.base_path}")

    async def save_image(self, image_data: str, filename: str = None, folder: str = "") -> Tuple[str, str]:
        """保存图片到本地"""
        # 提取base64数据
        base64_data, ext = self._extract_base64(image_data)

        # 生成文件名
        if not filename:
            filename = self._generate_filename()
        if not filename.endswith(f'.{ext}'):
            filename = f"{filename}.{ext}"

        # 构建完整路径
        if folder:
            save_dir = self.base_path / folder
            save_dir.mkdir(parents=True, exist_ok=True)
            file_path = save_dir / filename
            url_path = f"{self.base_url}/{folder}/{filename}"
        else:
            file_path = self.base_path / filename
            url_path = f"{self.base_url}/{filename}"

        # 解码并保存
        image_bytes = base64.b64decode(base64_data)
        with open(file_path, 'wb') as f:
            f.write(image_bytes)

        print(f"💾 [LocalStorage] 保存成功: {file_path} ({len(image_bytes)} bytes)")

        return str(file_path), url_path

    def get_public_url(self, filename: str, folder: str = "") -> str:
        """获取本地URL（相对路径）"""
        if folder:
            return f"{self.base_url}/{folder}/{filename}"
        return f"{self.base_url}/{filename}"

    def is_url_accessible_externally(self) -> bool:
        """本地URL无法被外部服务访问"""
        return False


class VolcengineTOSProvider(ImageStorageProvider):
    """
    火山引擎TOS对象存储Provider
    需要配置环境变量：
    - TOS_ACCESS_KEY
    - TOS_SECRET_KEY
    - TOS_ENDPOINT
    - TOS_BUCKET
    - TOS_REGION
    """

    def __init__(self):
        self.access_key = os.getenv('TOS_ACCESS_KEY')
        self.secret_key = os.getenv('TOS_SECRET_KEY')
        self.endpoint = os.getenv('TOS_ENDPOINT')
        self.bucket = os.getenv('TOS_BUCKET')
        self.region = os.getenv('TOS_REGION', 'cn-north-1')

        # 公网访问域名
        self.public_domain = os.getenv('TOS_PUBLIC_DOMAIN', f"{self.bucket}.{self.endpoint}")

        self._client = None

        if self._is_configured():
            print(f"☁️ [VolcengineTOS] 初始化，Bucket: {self.bucket}")
        else:
            print(f"⚠️ [VolcengineTOS] 未配置，请设置TOS环境变量")

    def _is_configured(self) -> bool:
        return all([self.access_key, self.secret_key, self.endpoint, self.bucket])

    def _get_client(self):
        """延迟初始化TOS客户端"""
        if not self._client:
            try:
                import tos
                self._client = tos.TosClientV2(
                    ak=self.access_key,
                    sk=self.secret_key,
                    endpoint=self.endpoint,
                    region=self.region
                )
            except ImportError:
                raise RuntimeError("请安装TOS SDK: pip install tos")
        return self._client

    async def save_image(self, image_data: str, filename: str = None, folder: str = "") -> Tuple[str, str]:
        """上传图片到TOS"""
        if not self._is_configured():
            raise RuntimeError("TOS未配置，请设置环境变量")

        # 提取base64数据
        base64_data, ext = self._extract_base64(image_data)

        # 生成文件名
        if not filename:
            filename = self._generate_filename()
        if not filename.endswith(f'.{ext}'):
            filename = f"{filename}.{ext}"

        # 构建对象Key
        if folder:
            object_key = f"{folder}/{filename}"
        else:
            object_key = filename

        # 解码图片
        image_bytes = base64.b64decode(base64_data)

        # 上传到TOS
        client = self._get_client()
        client.put_object(
            bucket=self.bucket,
            key=object_key,
            content=image_bytes
        )

        # 构建公网URL
        public_url = f"https://{self.public_domain}/{object_key}"

        print(f"☁️ [VolcengineTOS] 上传成功: {object_key} -> {public_url}")

        return object_key, public_url

    def get_public_url(self, filename: str, folder: str = "") -> str:
        """获取公网URL"""
        if folder:
            object_key = f"{folder}/{filename}"
        else:
            object_key = filename
        return f"https://{self.public_domain}/{object_key}"

    def is_url_accessible_externally(self) -> bool:
        """TOS URL可被外部访问"""
        return True


class AliyunOSSProvider(ImageStorageProvider):
    """
    阿里云OSS对象存储Provider（预留）
    需要配置环境变量：
    - OSS_ACCESS_KEY_ID
    - OSS_ACCESS_KEY_SECRET
    - OSS_ENDPOINT
    - OSS_BUCKET
    """

    def __init__(self):
        self.access_key_id = os.getenv('OSS_ACCESS_KEY_ID')
        self.access_key_secret = os.getenv('OSS_ACCESS_KEY_SECRET')
        self.endpoint = os.getenv('OSS_ENDPOINT')
        self.bucket = os.getenv('OSS_BUCKET')
        self.public_domain = os.getenv('OSS_PUBLIC_DOMAIN')

        if self._is_configured():
            print(f"☁️ [AliyunOSS] 初始化，Bucket: {self.bucket}")
        else:
            print(f"⚠️ [AliyunOSS] 未配置")

    def _is_configured(self) -> bool:
        return all([self.access_key_id, self.access_key_secret, self.endpoint, self.bucket])

    async def save_image(self, image_data: str, filename: str = None, folder: str = "") -> Tuple[str, str]:
        """上传图片到OSS（待实现）"""
        raise NotImplementedError("阿里云OSS Provider待实现，请安装oss2并完成代码")

    def get_public_url(self, filename: str, folder: str = "") -> str:
        if folder:
            return f"https://{self.public_domain}/{folder}/{filename}"
        return f"https://{self.public_domain}/{filename}"

    def is_url_accessible_externally(self) -> bool:
        return True


class TencentCOSProvider(ImageStorageProvider):
    """
    腾讯云COS对象存储Provider（预留）
    需要配置环境变量：
    - COS_SECRET_ID
    - COS_SECRET_KEY
    - COS_REGION
    - COS_BUCKET
    """

    def __init__(self):
        self.secret_id = os.getenv('COS_SECRET_ID')
        self.secret_key = os.getenv('COS_SECRET_KEY')
        self.region = os.getenv('COS_REGION')
        self.bucket = os.getenv('COS_BUCKET')
        self.public_domain = os.getenv('COS_PUBLIC_DOMAIN')

        if self._is_configured():
            print(f"☁️ [TencentCOS] 初始化，Bucket: {self.bucket}")
        else:
            print(f"⚠️ [TencentCOS] 未配置")

    def _is_configured(self) -> bool:
        return all([self.secret_id, self.secret_key, self.region, self.bucket])

    async def save_image(self, image_data: str, filename: str = None, folder: str = "") -> Tuple[str, str]:
        """上传图片到COS（待实现）"""
        raise NotImplementedError("腾讯云COS Provider待实现")

    def get_public_url(self, filename: str, folder: str = "") -> str:
        if folder:
            return f"https://{self.public_domain}/{folder}/{filename}"
        return f"https://{self.public_domain}/{filename}"

    def is_url_accessible_externally(self) -> bool:
        return True


# ============ 工厂函数 ============

_storage_instance: Optional[ImageStorageProvider] = None

def get_storage_provider() -> ImageStorageProvider:
    """
    获取图片存储Provider实例（单例模式）
    通过环境变量 IMAGE_STORAGE_PROVIDER 控制使用哪种存储方式

    支持的值：
    - local (默认): 本地文件存储
    - volcengine_tos: 火山引擎TOS
    - aliyun_oss: 阿里云OSS
    - tencent_cos: 腾讯云COS
    """
    global _storage_instance

    if _storage_instance is not None:
        return _storage_instance

    provider_type = os.getenv('IMAGE_STORAGE_PROVIDER', STORAGE_LOCAL).lower()

    print(f"🔧 [Storage] 初始化存储Provider: {provider_type}")

    if provider_type == STORAGE_LOCAL:
        _storage_instance = LocalStorageProvider()
    elif provider_type == STORAGE_VOLCENGINE_TOS:
        _storage_instance = VolcengineTOSProvider()
    elif provider_type == STORAGE_ALIYUN_OSS:
        _storage_instance = AliyunOSSProvider()
    elif provider_type == STORAGE_TENCENT_COS:
        _storage_instance = TencentCOSProvider()
    else:
        print(f"⚠️ [Storage] 未知的Provider类型: {provider_type}，使用本地存储")
        _storage_instance = LocalStorageProvider()

    return _storage_instance


def reset_storage_provider():
    """重置存储Provider实例（用于切换Provider）"""
    global _storage_instance
    _storage_instance = None
