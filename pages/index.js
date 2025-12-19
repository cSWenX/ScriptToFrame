import { useState } from 'react';
import Head from 'next/head';
import ScriptInput from '../components/ScriptInput';
import ControlPanel from '../components/ControlPanel';
import StoryboardDisplay from '../components/StoryboardDisplay';

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
   * AI分析剧本
   */
  const handleAnalyzeScript = async (config) => {
    if (!script || !scriptValid) {
      alert('请先输入有效的剧本内容');
      return;
    }

    setIsAnalyzing(true);
    setCurrentConfig(config);

    try {
      // 临时使用模拟API，Claude代理SSL问题解决后可切换回 '/api/analyze-script'
      const apiEndpoint = '/api/mock-analyze-script'; // 可改回 '/api/analyze-script'

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          script,
          frameCount: config.frameCount,
          style: config.style,
          genre: config.genre
        }),
      });

      const result = await response.json();

      if (result.success) {
        setAnalysisResult(result.data);
        // 初始化分镜框架
        const frameStructure = result.data.storyboard_frames.map(frame => ({
          ...frame,
          id: `frame_${frame.sequence}`,
          isGenerating: false,
          imageUrl: null,
          error: null
        }));
        setFrames(frameStructure);
      } else {
        alert(`分析失败: ${result.error}`);
      }
    } catch (error) {
      console.error('分析失败:', error);
      alert('分析失败，请检查网络连接');
    } finally {
      setIsAnalyzing(false);
    }
  };

  /**
   * 生成第一张图
   */
  const handleGenerateFirstFrame = async (config) => {
    if (!analysisResult || !frames.length) {
      alert('请先分析剧本');
      return;
    }

    setIsGeneratingFirst(true);

    try {
      const firstFrame = frames[0];

      // 临时使用模拟API
      const response = await fetch('/api/mock-generate-first-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          frame: firstFrame,
          characters: analysisResult.script_analysis.characters,
          style: config.style,
          config: config
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
   * 生成所有分镜图
   */
  const handleGenerateAllFrames = async (config) => {
    if (!firstFrameData) {
      alert('请先生成第一张图');
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

      // 临时使用模拟API
      const response = await fetch('/api/mock-generate-all-images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          frames: frames.filter((_, index) => index > 0), // 排除第一帧
          referenceImage: firstFrameData.imageUrl,
          characters: analysisResult.script_analysis.characters,
          config: config
        }),
      });

      const result = await response.json();

      if (result.success) {
        // 更新所有帧的结果
        setFrames(prevFrames =>
          prevFrames.map((frame, index) => {
            if (index === 0) return frame; // 第一帧不变

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

      // 临时使用模拟API
      const response = await fetch('/api/mock-regenerate-image', {
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