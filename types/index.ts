// TypeScript类型定义
export interface ScriptData {
  id: string;
  content: string;
  characters: Character[];
  scenes: Scene[];
  totalFrames: number;
}

export interface Character {
  name: string;
  description: string;
  visualDescription: string;
}

export interface Scene {
  id: string;
  location: string;
  description: string;
  characters: string[];
  dialogues: Dialogue[];
  actions: Action[];
}

export interface Dialogue {
  character: string;
  text: string;
  emotion?: string;
}

export interface Action {
  description: string;
  type: 'movement' | 'expression' | 'scene_change' | 'camera';
}

export interface StoryboardFrame {
  id: string;
  sequence: number;
  description: string;
  prompt: string;
  imageUrl?: string;
  isGenerating: boolean;
  error?: string;
  metadata: {
    scene: string;
    characters: string[];
    emotion: string;
    cameraAngle: string;
  };
}

export interface GenerationConfig {
  frameCount: number; // 3-12
  style: string;
  resolution: '1k' | '2k' | '4k';
  language: 'zh' | 'en' | 'ja';
  aspectRatio: '16:9' | '1:1' | '9:16';
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export interface VolcengineImageRequest {
  req_key: string;
  prompt: string;
  model_version?: string;
  image_num?: number;
  image_width?: number;
  image_height?: number;
  reference_image?: string;
  reference_image_weight?: number;
}