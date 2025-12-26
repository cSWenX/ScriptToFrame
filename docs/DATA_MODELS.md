# ScriptToFrame 数据模型文档

## 概述

本文档详细描述了ScriptToFrame系统中使用的所有数据结构、API请求响应格式、错误码定义和配置对象，为开发者提供准确的数据规范。

## 数据流架构

```
┌─────────────────────────────────────────────────────────────────┐
│                      数据流架构                                   │
└─────────────────────────────────────────────────────────────────┘

用户输入
    │
    ▼ ScriptInputModel
┌─────────────────┐
│   剧本验证       │
└─────────────────┘
    │
    ▼ AnalysisRequestModel
┌─────────────────┐
│  AI智能分析     │ ← 4步工作流
└─────────────────┘
    │
    ▼ AnalysisResponseModel
┌─────────────────┐
│ 分镜帧数据结构   │
└─────────────────┘
    │
    ▼ ImageGenerationModel
┌─────────────────┐
│   图片生成      │
└─────────────────┘
    │
    ▼ StoryboardFrameModel
┌─────────────────┐
│  最终结果展示    │
└─────────────────┘
```

## 核心数据模型

### 1. 剧本相关模型

#### ScriptInputModel (剧本输入)
```typescript
interface ScriptInputModel {
  content: string;              // 剧本内容
  length: number;               // 内容长度
  wordCount: number;            // 字数统计
  isValid: boolean;             // 验证状态
  validationMessage: string;    // 验证消息
  format: ScriptFormat;         // 剧本格式
  language: string;             // 语言 (zh-CN, en-US)
  createdAt: Date;              // 创建时间
  lastModified: Date;           // 最后修改时间
}

enum ScriptFormat {
  STANDARD = 'standard',        // 标准剧本格式
  DIALOGUE = 'dialogue',        // 对话形式
  NARRATIVE = 'narrative',      // 叙述形式
  MIXED = 'mixed'              // 混合格式
}
```

#### ScriptValidationResult (验证结果)
```typescript
interface ScriptValidationResult {
  isValid: boolean;             // 是否有效
  score: number;               // 质量评分 (0-100)
  issues: ValidationIssue[];    // 问题列表
  suggestions: string[];        // 改进建议
  estimatedScenes: number;      // 预估场景数
  detectedGenre: string;        // 检测到的题材
  detectedCharacters: string[]; // 检测到的角色
}

interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  code: string;                 // 错误码
  message: string;              // 错误消息
  position?: {                  // 错误位置 (可选)
    line: number;
    column: number;
  };
}
```

### 2. 分析请求/响应模型

#### AnalysisRequestModel (分析请求)
```typescript
interface AnalysisRequestModel {
  script: string;               // 剧本内容
  sceneCount: number;           // 目标场景数 (3-12)
  style: StyleType;             // 画风类型
  genre: GenreType;             // 题材类型
  config: AnalysisConfig;       // 分析配置
  requestId?: string;           // 请求ID (可选)
  userId?: string;              // 用户ID (可选)
}

enum StyleType {
  DEFAULT = 'default',          // 默认风格
  ANIME = 'anime',              // 日漫风格
  MANGA = 'manga',              // 国漫风格
  KOREAN = 'korean',            // 韩漫风格
  REALISTIC = 'realistic',      // 写实风格
  CYBERPUNK = 'cyberpunk',      // 赛博朋克
  TRADITIONAL = 'traditional'   // 传统风格
}

enum GenreType {
  GENERAL = 'general',          // 通用
  XUANHUAN = 'xuanhuan',        // 玄幻修仙
  URBAN = 'urban',              // 都市逆袭
  SYSTEM = 'system',            // 系统流
  APOCALYPSE = 'apocalypse',    // 末日题材
  ROMANCE = 'romance',          // 霸总甜宠
  ANCIENT = 'ancient',          // 古风宫斗
  COMEDY = 'comedy',            // 搞笑沙雕
  SUSPENSE = 'suspense'         // 悬疑惊悚
}

interface AnalysisConfig {
  quality: 'standard' | 'high' | 'premium';
  language: 'zh' | 'en' | 'ja';
  aspectRatio: '16:9' | '1:1' | '9:16';
  resolution: '1k' | '2k' | '4k';
  enableCache: boolean;
  timeout: number;              // 超时时间 (毫秒)
}
```

#### AnalysisResponseModel (分析响应)
```typescript
interface AnalysisResponseModel {
  success: boolean;
  data?: AnalysisResultData;
  error?: string;
  failedStep?: string;
  requestId: string;
  timestamp: string;
  processingTime: number;       // 处理时间 (毫秒)
}

interface AnalysisResultData {
  script_analysis: ScriptAnalysisData;
  storyboard_frames: StoryboardFrameData[];
  recommendedStyle: StyleType;
  recommendedGenre: GenreType;
  intelligentAnalysisComplete: boolean;
  metadata: AnalysisMetadata;
}

interface ScriptAnalysisData {
  sceneCount: number;
  frameCount: number;
  genre_detected: string;
  characters: CharacterData[];
  scenes: SceneData[];
  segmented_story: string;      // Step1结果
  extracted_frames: string;     // Step2结果
}

interface CharacterData {
  name: string;
  description: string;
  visual_description: string;
  role: 'protagonist' | 'antagonist' | 'supporting';
  appearances: number[];        // 出现的帧序号
}

interface SceneData {
  location: string;
  description: string;
  environment: string;
  lighting: string;
  mood: string;
}

interface AnalysisMetadata {
  version: string;              // 分析算法版本
  model: string;                // 使用的AI模型
  steps: StepExecutionData[];   // 各步骤执行信息
}

interface StepExecutionData {
  step: number;
  name: string;
  startTime: string;
  endTime: string;
  duration: number;
  inputTokens: number;
  outputTokens: number;
  success: boolean;
  error?: string;
}
```

### 3. 分镜帧模型

#### StoryboardFrameData (分镜帧数据)
```typescript
interface StoryboardFrameData {
  // 基础信息
  sequence: number;             // 帧序号 (1-based)
  id: string;                   // 唯一标识
  sceneIndex: number;           // 所属场景索引
  frameType: FrameType;         // 帧类型

  // 内容描述
  chineseDescription: string;   // 中文描述
  displayDescription?: string;  // 显示描述 (别名)
  jimengPrompt: string;         // 即梦提示词
  prompt?: string;              // 通用提示词 (别名)

  // 生成状态
  imageUrl?: string;            // 生成的图片URL/Base64
  isGenerating: boolean;        // 是否生成中
  error?: string;               // 错误信息

  // 元数据
  generatedAt?: string;         // 生成时间
  generationTime?: number;      // 生成耗时 (毫秒)
  modelVersion?: string;        // 生成模型版本
  settings: FrameSettings;      // 生成设置
}

enum FrameType {
  START = '开始帧',             // 开始帧
  END = '结束帧',               // 结束帧
  MIDDLE = '中间帧',            // 中间帧
  TRANSITION = '转场帧'         // 转场帧
}

interface FrameSettings {
  style: StyleType;
  quality: string;
  aspectRatio: string;
  resolution: string;
  seed?: number;                // 随机种子 (可选)
  iterations?: number;          // 迭代次数 (可选)
}
```

#### FrameGenerationModel (帧生成模型)
```typescript
interface FrameGenerationRequest {
  frame: StoryboardFrameData;
  prompt: string;
  config: GenerationConfig;
  referenceImage?: string;      // 参考图片 (可选)
  characters?: CharacterData[]; // 角色信息 (可选)
}

interface FrameGenerationResponse {
  success: boolean;
  data?: FrameGenerationData;
  error?: string;
  requestId: string;
}

interface FrameGenerationData {
  imageUrl: string;             // 生成的图片
  taskId: string;               // 任务ID
  prompt: string;               // 使用的提示词
  frame: StoryboardFrameData;   // 原始帧数据
  metadata: GenerationMetadata;
}

interface GenerationConfig {
  style: StyleType;
  quality: 'standard' | 'high' | 'premium';
  aspectRatio: string;
  resolution: string;
  useReference: boolean;
  enhancePrompt: boolean;
  timeout: number;
}

interface GenerationMetadata {
  model: string;
  version: string;
  parameters: Record<string, any>;
  generationTime: number;
  retryCount: number;
}
```

### 4. 批量操作模型

#### BatchGenerationModel (批量生成)
```typescript
interface BatchGenerationRequest {
  frames: StoryboardFrameData[];
  config: GenerationConfig;
  referenceImage?: string;
  characters?: CharacterData[];
  options: BatchOptions;
}

interface BatchOptions {
  concurrency: number;          // 并发数 (1-5)
  retryAttempts: number;        // 重试次数
  skipExisting: boolean;        // 跳过已存在的图片
  priority: 'speed' | 'quality'; // 优先级
}

interface BatchGenerationResponse {
  success: boolean;
  data: BatchGenerationResult[];
  stats: BatchStatistics;
  requestId: string;
  completedAt: string;
}

interface BatchGenerationResult {
  sequence: number;
  imageUrl?: string;
  prompt: string;
  chineseDescription: string;
  frameType: FrameType;
  error?: string;
  progress: number;             // 进度百分比
  generatedAt: string;
  responseTime: number;
}

interface BatchStatistics {
  total: number;                // 总数
  success: number;              // 成功数
  failed: number;               // 失败数
  skipped: number;              // 跳过数
  successRate: number;          // 成功率百分比
  averageTime: number;          // 平均耗时
  totalTime: number;            // 总耗时
}
```

## API请求响应格式

### 1. 标准响应格式

#### BaseResponse (基础响应)
```typescript
interface BaseResponse<T = any> {
  success: boolean;             // 操作成功标志
  data?: T;                     // 响应数据
  error?: string;               // 错误信息
  message?: string;             // 提示信息
  code?: string;                // 业务码
  timestamp: string;            // 时间戳
  requestId: string;            // 请求ID
}
```

#### PaginatedResponse (分页响应)
```typescript
interface PaginatedResponse<T> extends BaseResponse<T[]> {
  pagination: {
    page: number;               // 当前页
    pageSize: number;           // 页大小
    total: number;              // 总数
    totalPages: number;         // 总页数
    hasNext: boolean;           // 是否有下一页
    hasPrev: boolean;           // 是否有上一页
  };
}
```

### 2. 具体API响应格式

#### 健康检查响应
```typescript
// GET /api/health
interface HealthCheckResponse extends BaseResponse {
  data: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    service: string;
    version: string;
    timestamp: number;
    dependencies: {
      [serviceName: string]: {
        status: 'healthy' | 'unhealthy';
        responseTime?: number;
        lastChecked: string;
        error?: string;
      };
    };
    uptime: number;             // 运行时间 (秒)
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
  };
}
```

#### AI分析响应
```typescript
// POST /api/intelligent-analyze-script
interface AnalysisResponse extends BaseResponse {
  data: {
    script_analysis: {
      sceneCount: number;
      frameCount: number;
      genre_detected: string;
      characters: CharacterData[];
      scenes: SceneData[];
      quality_score: number;
      segmented_story: string;
      extracted_frames: string;
    };
    storyboard_frames: StoryboardFrameData[];
    processing_steps: {
      step1_story_segmentation: StepResult;
      step2_frame_extraction: StepResult;
      step3_prompt_generation: StepResult;
      step4_result_parsing: StepResult;
    };
    recommendations: {
      style: StyleType;
      genre: GenreType;
      improvements: string[];
    };
  };
}

interface StepResult {
  success: boolean;
  duration: number;             // 毫秒
  inputTokens: number;
  outputTokens: number;
  error?: string;
}
```

#### 图片生成响应
```typescript
// POST /api/generate-image-python
interface ImageGenerationResponse extends BaseResponse {
  data: {
    imageUrl: string;           // 图片URL或Base64
    taskId: string;             // 生成任务ID
    prompt: string;             // 使用的提示词
    frame: StoryboardFrameData;
    generation_info: {
      model: string;
      quality: string;
      resolution: string;
      generation_time: number;
      retry_count: number;
    };
  };
}
```

## 配置对象定义

### 1. 应用配置

#### AppConfig (应用配置)
```typescript
interface AppConfig {
  app: {
    name: string;
    version: string;
    environment: 'development' | 'staging' | 'production';
    debug: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
  };

  server: {
    port: number;
    host: string;
    timeout: number;
    cors: CORSConfig;
  };

  apis: {
    deepseek: DeepSeekConfig;
    anthropic: AnthropicConfig;
    volcengine: VolcengineConfig;
  };

  features: {
    enableCache: boolean;
    enableMetrics: boolean;
    enableRateLimit: boolean;
    maxConcurrentRequests: number;
  };

  storage: {
    type: 'local' | 's3' | 'oss';
    config: StorageConfig;
  };
}

interface CORSConfig {
  origin: string | string[];
  credentials: boolean;
  methods: string[];
  headers: string[];
}
```

### 2. API配置

#### DeepSeekConfig
```typescript
interface DeepSeekConfig {
  apiKey: string;
  baseURL: string;
  model: string;
  maxTokens: number;
  temperature: number;
  timeout: number;
  retryAttempts: number;
  rateLimit: {
    requests: number;
    window: number;             // 毫秒
  };
}
```

#### VolcengineConfig
```typescript
interface VolcengineConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  service: string;
  model: string;
  timeout: number;
  maxPollTimes: number;
  pollInterval: number;
  endpoints: {
    submit: string;
    query: string;
  };
}
```

### 3. 用户界面配置

#### UIConfig (界面配置)
```typescript
interface UIConfig {
  theme: {
    mode: 'light' | 'dark' | 'cyber';
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
  };

  layout: {
    panelRatios: {
      scriptInput: number;      // 30%
      controlPanel: number;     // 15%
      storyboard: number;       // 55%
    };
    breakpoints: {
      mobile: number;
      tablet: number;
      desktop: number;
    };
  };

  features: {
    enableAnimations: boolean;
    enableSounds: boolean;
    autoSave: boolean;
    showProgressBars: boolean;
  };

  defaults: {
    frameCount: number;
    style: StyleType;
    genre: GenreType;
    quality: string;
  };
}
```

## 错误码定义

### 1. HTTP状态码扩展

```typescript
enum HTTPStatusCode {
  // 成功
  OK = 200,
  CREATED = 201,
  ACCEPTED = 202,

  // 客户端错误
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  METHOD_NOT_ALLOWED = 405,
  CONFLICT = 409,
  PAYLOAD_TOO_LARGE = 413,
  RATE_LIMITED = 429,

  // 服务器错误
  INTERNAL_ERROR = 500,
  NOT_IMPLEMENTED = 501,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503,
  GATEWAY_TIMEOUT = 504
}
```

### 2. 业务错误码

#### GeneralErrorCodes (通用错误)
```typescript
enum GeneralErrorCodes {
  // 参数错误 (1000-1099)
  INVALID_PARAMETER = 'E1000',
  MISSING_PARAMETER = 'E1001',
  PARAMETER_TYPE_ERROR = 'E1002',
  PARAMETER_RANGE_ERROR = 'E1003',

  // 认证错误 (1100-1199)
  INVALID_API_KEY = 'E1100',
  API_KEY_EXPIRED = 'E1101',
  INSUFFICIENT_PERMISSIONS = 'E1102',

  // 资源错误 (1200-1299)
  RESOURCE_NOT_FOUND = 'E1200',
  RESOURCE_ALREADY_EXISTS = 'E1201',
  RESOURCE_LOCKED = 'E1202',

  // 系统错误 (1300-1399)
  SYSTEM_MAINTENANCE = 'E1300',
  SYSTEM_OVERLOADED = 'E1301',
  CONFIGURATION_ERROR = 'E1302'
}
```

#### AnalysisErrorCodes (分析错误)
```typescript
enum AnalysisErrorCodes {
  // 剧本验证错误 (2000-2099)
  SCRIPT_EMPTY = 'E2000',
  SCRIPT_TOO_SHORT = 'E2001',
  SCRIPT_TOO_LONG = 'E2002',
  SCRIPT_FORMAT_INVALID = 'E2003',
  SCRIPT_CONTENT_INAPPROPRIATE = 'E2004',

  // 分析过程错误 (2100-2199)
  ANALYSIS_STEP1_FAILED = 'E2100',      // 故事切分失败
  ANALYSIS_STEP2_FAILED = 'E2101',      // 关键帧提取失败
  ANALYSIS_STEP3_FAILED = 'E2102',      // 提示词生成失败
  ANALYSIS_STEP4_FAILED = 'E2103',      // 结果解析失败
  ANALYSIS_TIMEOUT = 'E2104',           // 分析超时

  // AI模型错误 (2200-2299)
  MODEL_UNAVAILABLE = 'E2200',
  MODEL_RESPONSE_INVALID = 'E2201',
  MODEL_QUOTA_EXCEEDED = 'E2202',
  MODEL_RATE_LIMITED = 'E2203'
}
```

#### GenerationErrorCodes (生成错误)
```typescript
enum GenerationErrorCodes {
  // 提示词错误 (3000-3099)
  PROMPT_EMPTY = 'E3000',
  PROMPT_TOO_LONG = 'E3001',
  PROMPT_INAPPROPRIATE = 'E3002',

  // 图片生成错误 (3100-3199)
  GENERATION_FAILED = 'E3100',
  GENERATION_TIMEOUT = 'E3101',
  GENERATION_REJECTED = 'E3102',
  GENERATION_QUOTA_EXCEEDED = 'E3103',

  // 火山引擎API错误 (3200-3299)
  VOLCENGINE_AUTH_FAILED = 'E3200',
  VOLCENGINE_BALANCE_INSUFFICIENT = 'E3201',
  VOLCENGINE_SERVICE_UNAVAILABLE = 'E3202',
  VOLCENGINE_CONTENT_MODERATION_FAILED = 'E3203'
}
```

### 3. 错误响应模型

#### ErrorResponse (错误响应)
```typescript
interface ErrorResponse extends BaseResponse {
  success: false;
  error: string;                // 用户友好的错误信息
  code: string;                 // 错误码
  details?: ErrorDetails;       // 详细错误信息
  suggestions?: string[];       // 解决建议
  documentation?: string;       // 文档链接
}

interface ErrorDetails {
  field?: string;               // 错误字段
  value?: any;                  // 错误值
  constraint?: string;          // 约束条件
  stackTrace?: string;          // 堆栈跟踪 (仅开发环境)
  requestId: string;            // 请求ID
  correlationId?: string;       // 关联ID
}
```

## 数据验证规则

### 1. 输入验证

#### ScriptValidationRules (剧本验证)
```typescript
interface ScriptValidationRules {
  minLength: number;            // 最小长度: 20
  maxLength: number;            // 最大长度: 50000
  allowedCharacters: RegExp;    // 允许的字符
  forbiddenWords: string[];     // 禁用词列表
  maxLines: number;             // 最大行数: 2000
  encodings: string[];          // 支持的编码: ['utf-8', 'gbk']
}

const DEFAULT_SCRIPT_VALIDATION: ScriptValidationRules = {
  minLength: 20,
  maxLength: 50000,
  allowedCharacters: /^[\u4e00-\u9fa5\u3400-\u4db5\ue000-\ufaafa-zA-Z0-9\s\.,;:!?\-"'""''（）【】《》\n\r\t]*$/,
  forbiddenWords: [], // 配置敏感词
  maxLines: 2000,
  encodings: ['utf-8', 'gbk']
};
```

#### ParameterValidationRules (参数验证)
```typescript
interface ParameterValidationRules {
  sceneCount: {
    min: number;                // 3
    max: number;                // 12
  };
  style: {
    allowed: StyleType[];
  };
  genre: {
    allowed: GenreType[];
  };
  quality: {
    allowed: string[];          // ['standard', 'high', 'premium']
  };
}
```

### 2. 数据转换

#### DataTransformers (数据转换器)
```typescript
interface DataTransformers {
  // 将前端数据转换为后端格式
  frontendToBackend(data: any): any;

  // 将后端数据转换为前端格式
  backendToFrontend(data: any): any;

  // 标准化提示词
  normalizePrompt(prompt: string): string;

  // 清理HTML标签
  sanitizeText(text: string): string;

  // 格式化时间
  formatTimestamp(timestamp: string | number): string;
}

// 实现示例
const dataTransformers: DataTransformers = {
  frontendToBackend: (frontendFrame) => ({
    prompt: frontendFrame.jimengPrompt || frontendFrame.prompt,
    chinese_description: frontendFrame.chineseDescription,
    sequence: frontendFrame.sequence,
    frame_type: frontendFrame.frameType
  }),

  backendToFrontend: (backendFrame) => ({
    jimengPrompt: backendFrame.prompt,
    chineseDescription: backendFrame.chinese_description,
    sequence: backendFrame.sequence,
    frameType: backendFrame.frame_type,
    id: `frame_${backendFrame.sequence}`,
    imageUrl: null,
    isGenerating: false,
    error: null
  }),

  normalizePrompt: (prompt: string): string => {
    return prompt
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\-.,!?]/g, '')
      .substring(0, 1000);
  },

  sanitizeText: (text: string): string => {
    return text.replace(/<[^>]*>/g, '');
  },

  formatTimestamp: (timestamp: string | number): string => {
    return new Date(timestamp).toISOString();
  }
};
```

## 存储模型

### 1. 数据库模型 (可选扩展)

#### UserModel (用户模型)
```typescript
interface UserModel {
  id: string;
  username: string;
  email: string;
  created_at: Date;
  updated_at: Date;
  preferences: UserPreferences;
  usage_stats: UsageStats;
}

interface UserPreferences {
  default_style: StyleType;
  default_genre: GenreType;
  auto_save: boolean;
  notifications: boolean;
  theme: string;
}

interface UsageStats {
  total_scripts: number;
  total_frames_generated: number;
  last_active: Date;
  quota_used: number;
  quota_limit: number;
}
```

#### ProjectModel (项目模型)
```typescript
interface ProjectModel {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  script_content: string;
  analysis_result: AnalysisResultData;
  frames: StoryboardFrameData[];
  config: ProjectConfig;
  status: ProjectStatus;
  created_at: Date;
  updated_at: Date;
}

enum ProjectStatus {
  DRAFT = 'draft',
  ANALYZING = 'analyzing',
  GENERATING = 'generating',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

interface ProjectConfig {
  style: StyleType;
  genre: GenreType;
  scene_count: number;
  quality: string;
  resolution: string;
}
```

### 2. 缓存模型

#### CacheEntry (缓存条目)
```typescript
interface CacheEntry<T = any> {
  key: string;
  value: T;
  created_at: number;
  expires_at: number;
  access_count: number;
  last_accessed: number;
  size: number;               // 字节数
  tags: string[];             // 标签，用于批量失效
}

interface CacheConfig {
  maxSize: number;            // 最大缓存大小 (字节)
  maxEntries: number;         // 最大条目数
  defaultTTL: number;         // 默认TTL (毫秒)
  evictionPolicy: 'lru' | 'lfu' | 'ttl';
  compressionEnabled: boolean;
}
```

## 类型安全

### 1. TypeScript类型定义

```typescript
// 类型守卫
export function isStoryboardFrame(obj: any): obj is StoryboardFrameData {
  return obj &&
    typeof obj.sequence === 'number' &&
    typeof obj.id === 'string' &&
    typeof obj.chineseDescription === 'string' &&
    typeof obj.jimengPrompt === 'string' &&
    typeof obj.isGenerating === 'boolean';
}

export function isAnalysisResponse(obj: any): obj is AnalysisResponse {
  return obj &&
    typeof obj.success === 'boolean' &&
    (obj.success ? !!obj.data : !!obj.error);
}

// 实用类型
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type Required<T, K extends keyof T> = T & RequiredKeys<T, K>;
export type Nullable<T> = T | null;
export type Maybe<T> = T | undefined;

// 联合类型
export type APIResponse<T = any> = SuccessResponse<T> | ErrorResponse;
export type ProcessingStatus = 'idle' | 'processing' | 'completed' | 'failed';
export type GenerationProgress = 'pending' | 'analyzing' | 'generating' | 'completed';
```

### 2. 运行时类型检查

```typescript
import Joi from 'joi';

// 验证模式
const ScriptInputSchema = Joi.object({
  content: Joi.string().min(20).max(50000).required(),
  format: Joi.string().valid(...Object.values(ScriptFormat)).default('standard'),
  language: Joi.string().valid('zh-CN', 'en-US', 'ja-JP').default('zh-CN')
});

const AnalysisRequestSchema = Joi.object({
  script: Joi.string().min(20).required(),
  sceneCount: Joi.number().integer().min(3).max(12).required(),
  style: Joi.string().valid(...Object.values(StyleType)).required(),
  genre: Joi.string().valid(...Object.values(GenreType)).required(),
  config: Joi.object({
    quality: Joi.string().valid('standard', 'high', 'premium').default('standard'),
    timeout: Joi.number().positive().max(300000).default(120000)
  }).default({})
});

// 验证函数
export function validateAnalysisRequest(data: any): AnalysisRequestModel {
  const { error, value } = AnalysisRequestSchema.validate(data);
  if (error) {
    throw new Error(`Invalid analysis request: ${error.message}`);
  }
  return value;
}
```

---

**文档版本**: v1.0.0
**最后更新**: 2025-12-24
**维护者**: ScriptToFrame Team