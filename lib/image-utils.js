const fs = require('fs');
const path = require('path');
const axios = require('axios');

/**
 * 图片处理工具类
 * 功能: 图片上传、格式转换、临时文件管理
 */
class ImageUtils {
  constructor() {
    this.tempDir = path.join(process.cwd(), 'temp');
    this.ensureTempDir();
  }

  /**
   * 确保临时目录存在
   */
  ensureTempDir() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * 下载图片到本地
   * @param {string} imageUrl - 图片URL
   * @param {string} filename - 文件名
   * @returns {Promise<string>} 本地文件路径
   */
  async downloadImage(imageUrl, filename) {
    try {
      const response = await axios({
        method: 'GET',
        url: imageUrl,
        responseType: 'stream'
      });

      const filePath = path.join(this.tempDir, filename);
      const writer = fs.createWriteStream(filePath);

      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(filePath));
        writer.on('error', reject);
      });
    } catch (error) {
      console.error('图片下载失败:', error);
      throw new Error(`下载图片失败: ${error.message}`);
    }
  }

  /**
   * 将图片转换为Base64
   * @param {string} filePath - 图片文件路径
   * @returns {string} Base64编码
   */
  imageToBase64(filePath) {
    try {
      const imageBuffer = fs.readFileSync(filePath);
      const base64 = imageBuffer.toString('base64');
      const mimeType = this.getMimeType(filePath);
      return `data:${mimeType};base64,${base64}`;
    } catch (error) {
      console.error('图片转换Base64失败:', error);
      throw new Error(`图片转换失败: ${error.message}`);
    }
  }

  /**
   * 获取图片MIME类型
   * @param {string} filePath - 文件路径
   * @returns {string} MIME类型
   */
  getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };
    return mimeTypes[ext] || 'image/jpeg';
  }

  /**
   * 生成临时文件名
   * @param {string} prefix - 文件名前缀
   * @param {string} extension - 文件扩展名
   * @returns {string} 文件名
   */
  generateTempFilename(prefix = 'image', extension = 'jpg') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    return `${prefix}_${timestamp}_${random}.${extension}`;
  }

  /**
   * 清理临时文件
   * @param {string} filePath - 文件路径
   */
  cleanupFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.warn('清理临时文件失败:', error);
    }
  }

  /**
   * 清理所有临时文件
   */
  cleanupAllTempFiles() {
    try {
      const files = fs.readdirSync(this.tempDir);
      files.forEach(file => {
        const filePath = path.join(this.tempDir, file);
        fs.unlinkSync(filePath);
      });
    } catch (error) {
      console.warn('清理临时目录失败:', error);
    }
  }

  /**
   * 验证图片URL是否有效
   * @param {string} imageUrl - 图片URL
   * @returns {Promise<boolean>} 是否有效
   */
  async validateImageUrl(imageUrl) {
    try {
      const response = await axios.head(imageUrl);
      const contentType = response.headers['content-type'];
      return contentType && contentType.startsWith('image/');
    } catch (error) {
      return false;
    }
  }

  /**
   * 压缩图片质量 (简单实现)
   * @param {string} inputPath - 输入文件路径
   * @param {string} outputPath - 输出文件路径
   * @param {number} quality - 质量 0-100
   * @returns {Promise<string>} 输出文件路径
   */
  async compressImage(inputPath, outputPath, quality = 80) {
    // 这里可以集成sharp或者其他图片处理库
    // 现在先简单复制文件
    try {
      fs.copyFileSync(inputPath, outputPath);
      return outputPath;
    } catch (error) {
      throw new Error(`图片压缩失败: ${error.message}`);
    }
  }

  /**
   * 获取图片信息
   * @param {string} filePath - 图片路径
   * @returns {Object} 图片信息
   */
  getImageInfo(filePath) {
    try {
      const stats = fs.statSync(filePath);
      return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        extension: path.extname(filePath),
        filename: path.basename(filePath)
      };
    } catch (error) {
      throw new Error(`获取图片信息失败: ${error.message}`);
    }
  }

  /**
   * 批量下载图片
   * @param {Array} imageUrls - 图片URL数组
   * @param {string} prefix - 文件名前缀
   * @returns {Promise<Array>} 下载结果
   */
  async downloadMultipleImages(imageUrls, prefix = 'frame') {
    const results = [];

    for (let i = 0; i < imageUrls.length; i++) {
      try {
        const filename = this.generateTempFilename(`${prefix}_${i + 1}`, 'jpg');
        const filePath = await this.downloadImage(imageUrls[i], filename);
        results.push({
          success: true,
          url: imageUrls[i],
          localPath: filePath,
          filename: filename
        });
      } catch (error) {
        results.push({
          success: false,
          url: imageUrls[i],
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * 生成下载链接（用于前端下载）
   * @param {string} filePath - 文件路径
   * @returns {string} 下载URL
   */
  generateDownloadUrl(filePath) {
    // 生成一个可用于前端下载的URL
    // 在实际应用中，这里应该生成一个临时的下载令牌或使用文件服务
    const filename = path.basename(filePath);
    return `/api/download/${filename}`;
  }
}

module.exports = ImageUtils;