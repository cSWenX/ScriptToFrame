import { useState } from 'react';
import Head from 'next/head';
import ScriptInput from '../components/ScriptInput';
import ControlPanel from '../components/ControlPanel';
import StoryboardDisplay from '../components/StoryboardDisplay';
import { getApiEndpoint } from '../config/api-config';

/**
 * ScriptToFrame 主页面
 * 三栏布局: 剧本输入(30%) - 控制面板(15%) - 分镜显示(55%)
 */
export default function Home() {
  const [script, setScript] = useState('');
  const [scriptValid, setScriptValid] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [firstFrameData, setFirstFrameData] = useState(null);
  const [frames, setFrames] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingFirst, setIsGeneratingFirst] = useState(false);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [currentConfig, setCurrentConfig] = useState(null);

  /**
   * 处理剧本验证
   */
  const handleScriptValidate = (isValid, message) => {
    setScriptValid(isValid);
  };

  /**
   * AI智能分析剧本 (新4步工作流)
   */
  const handleAnalyzeScript = async (config) => {
    if (!script || !scriptValid) {
      alert('请先输入有效的剧本内容');
      return;
    }

    setIsAnalyzing(true);
    setCurrentConfig(config);

    // 清除之前的分析结果
    setAnalysisResult(null);
    setFrames([]);
    setFirstFrameData(null);

    try {
      // 使用配置的智能分析API端点
      const apiEndpoint = getApiEndpoint('intelligentAnalyze');

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          script,
          sceneCount: config.frameCount, // 改为sceneCount
          style: config.style,
          genre: config.genre
        }),
      });

      const result = await response.json();

      if (result.success) {
        setAnalysisResult(result.data);
        // 新的框架结构包含完整提示词和中文描述
        const frameStructure = result.data.storyboard_frames.map(frame => ({
          ...frame,
          id: `frame_${frame.sequence}`,
          // 新增字段支持
          displayDescription: frame.chineseDescription,
          prompt: frame.jimengPrompt,
          isGenerating: false,
          imageUrl: null,
          error: null
        }));
        setFrames(frameStructure);

        console.log(`✅ 智能分析完成，生成${frameStructure.length}个关键帧`);
      } else {
        alert(`智能分析失败: ${result.error}`);
        if (result.failedStep) {
          console.error('失败步骤:', result.failedStep);
        }
      }
    } catch (error) {
      console.error('智能分析网络错误:', error);
      alert('智能分析失败，请检查网络连接和API配置');
    } finally {
      setIsAnalyzing(false);
    }
  };

  /**
   * 生成第一张图 (新版本支持即梦提示词)
   */
  const handleGenerateFirstFrame = async (config) => {
    if (!analysisResult || !frames.length) {
      alert('请先分析剧本');
      return;
    }

    setIsGeneratingFirst(true);

    try {
      const firstFrame = frames[0];

      // 检查是否有提示词
      if (!firstFrame.prompt && !firstFrame.jimengPrompt) {
        alert('请先完成AI智能分析，生成提示词');
        setIsGeneratingFirst(false);
        return;
      }

      // 使用配置的图片生成API端点
      const response = await fetch(getApiEndpoint('generateFirstImage'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // 新的数据结构
          frame: firstFrame,
          prompt: firstFrame.prompt || firstFrame.jimengPrompt,
          chineseDescription: firstFrame.displayDescription || firstFrame.chineseDescription,
          style: config.style,
          config: config,
          // 兼容性字段
          characters: [] // 不再需要，但保持兼容性
        }),
      });

      const result = await response.json();

      if (result.success) {
        setFirstFrameData(result.data);
        // 更新第一帧的图片
        setFrames(prevFrames =>
          prevFrames.map((frame, index) =>
            index === 0
              ? { ...frame, imageUrl: result.data.imageUrl, isGenerating: false }
              : frame
          )
        );
      } else {
        alert(`生成失败: ${result.error}`);
        setFrames(prevFrames =>
          prevFrames.map((frame, index) =>
            index === 0
              ? { ...frame, error: result.error, isGenerating: false }
              : frame
          )
        );
      }
    } catch (error) {
      console.error('生成第一张图失败:', error);
      alert('生成失败，请检查网络连接');
    } finally {
      setIsGeneratingFirst(false);
    }
  };

  /**
   * 生成所有分镜图 (新版本：智能检测是否需要先分析)
   */
  const handleGenerateAllFrames = async (config) => {
    // 智能检测：如果没有提示词，先执行分析
    if (!analysisResult || !frames.length) {
      alert('请先进行AI智能分析');
      return;
    }

    // 检查是否有有效的提示词
    const hasValidPrompts = frames.some(frame => frame.prompt || frame.jimengPrompt);
    if (!hasValidPrompts) {
      alert('请先完成AI智能分析，生成提示词');
      return;
    }

    setIsGeneratingAll(true);

    try {
      // 标记所有未生成的帧为生成中
      setFrames(prevFrames =>
        prevFrames.map(frame =>
          !frame.imageUrl ? { ...frame, isGenerating: true } : frame
        )
      );

      // 使用配置的批量生成API端点
      const response = await fetch(getApiEndpoint('generateAllImages'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          frames: frames, // 发送所有帧（API内部处理）
          referenceImage: firstFrameData?.imageUrl || null,
          config: config,
          // 兼容性字段
          characters: [] // 不再需要，但保持兼容性
        }),
      });

      const result = await response.json();

      if (result.success) {
        // 更新所有帧的结果
        setFrames(prevFrames =>
          prevFrames.map((frame) => {
            const generatedFrame = result.data.find(f => f.sequence === frame.sequence);
            if (generatedFrame) {
              return {
                ...frame,
                imageUrl: generatedFrame.imageUrl,
                isGenerating: false,
                error: generatedFrame.error || null
              };
            }
            return { ...frame, isGenerating: false };
          })
        );

        console.log(`✅ 成功生成${result.data.length}张分镜图`);
      } else {
        alert(`批量生成失败: ${result.error}`);
      }
    } catch (error) {
      console.error('批量生成失败:', error);
      alert('生成失败，请检查网络连接');
    } finally {
      setIsGeneratingAll(false);
      setFrames(prevFrames =>
        prevFrames.map(frame => ({ ...frame, isGenerating: false }))
      );
    }
  };

  /**
   * 重新生成单个分镜图
   */
  const handleRegenerateFrame = async (frameId) => {
    const frameIndex = frames.findIndex(f => f.id === frameId);
    if (frameIndex === -1) return;

    // 标记该帧为生成中
    setFrames(prevFrames =>
      prevFrames.map(frame =>
        frame.id === frameId
          ? { ...frame, isGenerating: true, error: null }
          : frame
      )
    );

    try {
      const targetFrame = frames[frameIndex];
      const isFirstFrame = frameIndex === 0;

      // 使用配置的重新生成API端点
      const response = await fetch(getApiEndpoint('regenerateImage'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          frame: targetFrame,
          isFirstFrame: isFirstFrame,
          referenceImage: isFirstFrame ? null : firstFrameData?.imageUrl,
          characters: analysisResult.script_analysis.characters,
          config: currentConfig
        }),
      });

      const result = await response.json();

      if (result.success) {
        setFrames(prevFrames =>
          prevFrames.map(frame =>
            frame.id === frameId
              ? { ...frame, imageUrl: result.data.imageUrl, isGenerating: false }
              : frame
          )
        );

        // 如果是第一帧，更新参考图数据
        if (isFirstFrame) {
          setFirstFrameData(result.data);
        }
      } else {
        setFrames(prevFrames =>
          prevFrames.map(frame =>
            frame.id === frameId
              ? { ...frame, error: result.error, isGenerating: false }
              : frame
          )
        );
      }
    } catch (error) {
      console.error('重新生成失败:', error);
      setFrames(prevFrames =>
        prevFrames.map(frame =>
          frame.id === frameId
            ? { ...frame, error: '网络错误', isGenerating: false }
            : frame
        )
      );
    }
  };

  /**
   * 下载单个图片
   */
  const handleDownloadFrame = async (frame) => {
    if (!frame.imageUrl) return;

    try {
      const link = document.createElement('a');
      link.href = frame.imageUrl;
      link.download = `frame_${frame.sequence}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('下载失败:', error);
    }
  };

  /**
   * 下载所有图片
   */
  const handleDownloadAll = async () => {
    const validFrames = frames.filter(frame => frame.imageUrl);

    if (validFrames.length === 0) {
      alert('没有可下载的图片');
      return;
    }

    for (const frame of validFrames) {
      await handleDownloadFrame(frame);
      // 稍微延迟避免浏览器阻止多次下载
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  };

  return (
    <>
      <Head>
        <title>ScriptToFrame - AI漫剧分镜生成器</title>
        <meta name="description" content="基于AI的未来科技漫剧分镜生成平台" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen">
        {/* 未来科技风格头部 */}
        <header className="border-b border-cyan-500/30 backdrop-blur-md relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-900/50 to-gray-800/50"></div>
          <div className="relative z-10 px-6 py-6">
            <div className="flex justify-between items-center">
              <div className="fade-in-up">
                <h1 className="text-3xl font-bold neon-blue font-['Orbitron']">
                  SCRIPT<span className="neon-purple">TO</span>FRAME
                </h1>
                <p className="text-cyan-300/80 mt-1 font-['Rajdhani'] text-lg tracking-wide">
                  AI驱动的未来分镜生成平台
                </p>
              </div>
              <div className="flex items-center gap-4 fade-in-up delay-200">
                <div className="status-indicator status-success"></div>
                <span className="text-cyan-300 font-['Rajdhani'] text-sm">
                  系统在线 | v1.0.0
                </span>
                <div className="text-xs text-cyan-400/60">
                  Claude + 火山引擎即梦
                </div>
              </div>
            </div>
          </div>

          {/* 动态装饰线 */}
          <div className="absolute bottom-0 left-0 right-0 h-px">
            <div className="h-full bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-60"></div>
          </div>
        </header>

        {/* 主内容区 - 三栏布局 */}
        <main className="flex h-[calc(100vh-120px)] gap-2 p-2">
          {/* 左栏 - 剧本输入 (30%) */}
          <div className="w-[30%] fade-in-up delay-100">
            <div className="cyber-panel h-full">
              <ScriptInput
                value={script}
                onChange={setScript}
                onValidate={handleScriptValidate}
              />
            </div>
          </div>

          {/* 中栏 - 控制面板 (15%) */}
          <div className="w-[15%] fade-in-up delay-200">
            <div className="cyber-panel h-full">
              <ControlPanel
                onAnalyzeScript={handleAnalyzeScript}
                onGenerateFirstFrame={handleGenerateFirstFrame}
                onGenerateAllFrames={handleGenerateAllFrames}
                isAnalyzing={isAnalyzing}
                isGeneratingFirst={isGeneratingFirst}
                isGeneratingAll={isGeneratingAll}
                analysisResult={analysisResult}
              />
            </div>
          </div>

          {/* 右栏 - 分镜显示 (55%) */}
          <div className="w-[55%] fade-in-up delay-300">
            <div className="cyber-panel h-full">
              <StoryboardDisplay
                frames={frames}
                onRegenerateFrame={handleRegenerateFrame}
                onDownloadFrame={handleDownloadFrame}
                onDownloadAll={handleDownloadAll}
                isGenerating={isGeneratingAll}
              />
            </div>
          </div>
        </main>

        {/* 底部状态栏 */}
        <footer className="border-t border-cyan-500/30 backdrop-blur-md">
          <div className="px-6 py-3">
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-4 text-cyan-400/70">
                <span>© 2025 ScriptToFrame</span>
                <span>|</span>
                <span>AI分镜生成技术</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="status-indicator status-info"></div>
                <span className="text-cyan-300/80">就绪</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}