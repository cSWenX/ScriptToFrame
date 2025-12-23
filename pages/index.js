import { useState } from 'react';
import Head from 'next/head';
import ScriptInput from '../components/ScriptInput';
import ControlPanel from '../components/ControlPanel';
import StoryboardDisplay from '../components/StoryboardDisplay';
import ProgressBar from '../components/ProgressBar';
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

  // 停止控制器
  const [analysisController, setAnalysisController] = useState(null);
  const [firstFrameController, setFirstFrameController] = useState(null);
  const [allFramesController, setAllFramesController] = useState(null);

  // 进度条相关状态
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [firstFrameProgress, setFirstFrameProgress] = useState(0);
  const [batchProgress, setBatchProgress] = useState(0);
  const [progressVisible, setProgressVisible] = useState({
    analysis: false,
    firstFrame: false,
    batch: false
  });

  /**
   * 处理剧本验证
   */
  const handleScriptValidate = (isValid, message) => {
    setScriptValid(isValid);
  };

  /**
   * 停止AI智能分析
   */
  const handleStopAnalysis = () => {
    console.log('⏹️ [前端] 停止AI智能分析');
    if (analysisController) {
      analysisController.abort();
    }
    setIsAnalyzing(false);
    setAnalysisProgress(0);
    setProgressVisible(prev => ({ ...prev, analysis: false }));
    setAnalysisController(null);
  };

  /**
   * 停止生成第一张图
   */
  const handleStopFirstFrame = () => {
    console.log('⏹️ [前端] 停止生成第一张图');
    if (firstFrameController) {
      firstFrameController.abort();
    }
    setIsGeneratingFirst(false);
    setFirstFrameProgress(0);
    setProgressVisible(prev => ({ ...prev, firstFrame: false }));
    setFirstFrameController(null);
  };

  /**
   * 停止生成所有分镜
   */
  const handleStopAllFrames = () => {
    console.log('⏹️ [前端] 停止生成所有分镜');
    if (allFramesController) {
      allFramesController.abort();
    }
    setIsGeneratingAll(false);
    setBatchProgress(0);
    setProgressVisible(prev => ({ ...prev, batch: false }));
    setAllFramesController(null);

    // 重置所有正在生成中的帧状态
    setFrames(prevFrames =>
      prevFrames.map(frame => ({ ...frame, isGenerating: false }))
    );
  };

  /**
   * AI智能分析剧本 (新4步工作流 + 进度条)
   */
  const handleAnalyzeScript = async (config) => {
    console.log('🎭 [前端] 开始AI智能分析:', {
      scriptLength: script.length,
      config: config,
      timestamp: new Date().toISOString()
    });

    if (!script || !scriptValid) {
      console.error('❌ [前端] 智能分析失败: 剧本无效', {
        script: !!script,
        scriptValid: scriptValid
      });
      alert('请先输入有效的剧本内容');
      return;
    }

    // 启动进度条
    setIsAnalyzing(true);
    setCurrentConfig(config);
    setAnalysisProgress(0);
    setProgressVisible(prev => ({ ...prev, analysis: true }));

    // 清除之前的分析结果
    console.log('🧹 [前端] 清除之前的分析结果');
    setAnalysisResult(null);
    setFrames([]);
    setFirstFrameData(null);

    // 模拟4步分析进度
    const updateProgress = (step, progress) => {
      const totalSteps = 4;
      const stepProgress = ((step - 1) / totalSteps) * 100 + (progress / totalSteps);
      setAnalysisProgress(Math.min(100, stepProgress));
    };

    try {
      // 创建AbortController用于停止控制
      const controller = new AbortController();
      setAnalysisController(controller);

      // 步骤1: 准备请求 (0-10%)
      updateProgress(1, 10);
      const apiEndpoint = getApiEndpoint('intelligentAnalyze');
      console.log('🔗 [前端] API端点:', apiEndpoint);

      const requestData = {
        script,
        sceneCount: config.frameCount,
        style: config.style,
        genre: config.genre
      };

      // 步骤2: 发送请求 (10-20%)
      updateProgress(1, 20);
      console.log('📤 [前端] 发送请求数据:', {
        ...requestData,
        scriptLength: requestData.script.length,
        script: requestData.script.substring(0, 100) + '...'
      });

      // 步骤3: 等待响应 (20-80%)
      updateProgress(2, 0);
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
        signal: controller.signal // 添加停止信号
      });

      updateProgress(3, 50);
      console.log('📥 [前端] 收到响应:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });

      // 步骤4: 处理结果 (80-100%)
      updateProgress(3, 80);
      const result = await response.json();
      console.log('📊 [前端] 解析响应数据:', {
        success: result.success,
        dataType: typeof result.data,
        error: result.error,
        failedStep: result.failedStep
      });

      updateProgress(4, 90);

      if (result.success) {
        console.log('✅ [前端] 智能分析成功:', {
          frameCount: result.data?.storyboard_frames?.length || 0,
          analysisSteps: result.data?.analysis_steps || 'unknown'
        });

        setAnalysisResult(result.data);
        const frameStructure = result.data.storyboard_frames.map(frame => ({
          ...frame,
          id: `frame_${frame.sequence}`,
          displayDescription: frame.chineseDescription,
          prompt: frame.jimengPrompt,
          isGenerating: false,
          imageUrl: null,
          error: null
        }));
        setFrames(frameStructure);

        console.log('🎬 [前端] 生成的关键帧结构:', frameStructure.map(frame => ({
          sequence: frame.sequence,
          hasPrompt: !!frame.prompt,
          hasDescription: !!frame.displayDescription
        })));

        // 完成进度条
        updateProgress(4, 100);
        setTimeout(() => {
          setProgressVisible(prev => ({ ...prev, analysis: false }));
        }, 2000);

        console.log(`✅ 智能分析完成，生成${frameStructure.length}个关键帧`);
      } else {
        console.error('❌ [前端] 智能分析API返回失败:', result);
        alert(`智能分析失败: ${result.error}`);
        if (result.failedStep) {
          console.error('失败步骤:', result.failedStep);
        }
        setProgressVisible(prev => ({ ...prev, analysis: false }));
      }
    } catch (error) {
      console.error('💥 [前端] 智能分析网络错误:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });

      // 处理停止操作
      if (error.name === 'AbortError') {
        console.log('⏹️ [前端] 智能分析被用户停止');
        // 不显示错误，因为这是用户主动停止的
        return;
      }

      alert('智能分析失败，请检查网络连接和API配置');
      setProgressVisible(prev => ({ ...prev, analysis: false }));
    } finally {
      console.log('🏁 [前端] 智能分析完成，状态重置');
      setIsAnalyzing(false);
      setAnalysisController(null);
    }
  };

  /**
   * 生成第一张图 (新版本支持即梦提示词 + 进度条)
   */
  const handleGenerateFirstFrame = async (config) => {
    console.log('🖼️ [前端] 开始生成第一张图:', {
      config: config,
      analysisResult: !!analysisResult,
      framesLength: frames.length,
      timestamp: new Date().toISOString()
    });

    if (!analysisResult || !frames.length) {
      console.error('❌ [前端] 生成第一张图失败: 缺少分析结果', {
        analysisResult: !!analysisResult,
        framesLength: frames.length
      });
      alert('请先分析剧本');
      return;
    }

    // 启动进度条
    setIsGeneratingFirst(true);
    setFirstFrameProgress(0);
    setProgressVisible(prev => ({ ...prev, firstFrame: true }));

    // 模拟图片生成进度
    const updateProgress = (step, progress) => {
      const totalSteps = 3;
      const stepProgress = ((step - 1) / totalSteps) * 100 + (progress / totalSteps);
      setFirstFrameProgress(Math.min(100, stepProgress));
    };

    try {
      // 步骤1: 准备第一帧数据 (0-20%)
      updateProgress(1, 0);
      const firstFrame = frames[0];
      console.log('🎯 [前端] 第一帧数据:', {
        sequence: firstFrame.sequence,
        hasPrompt: !!(firstFrame.prompt || firstFrame.jimengPrompt),
        hasDescription: !!(firstFrame.displayDescription || firstFrame.chineseDescription),
        promptLength: (firstFrame.prompt || firstFrame.jimengPrompt || '').length,
        descriptionLength: (firstFrame.displayDescription || firstFrame.chineseDescription || '').length
      });

      // 检查是否有提示词
      if (!firstFrame.prompt && !firstFrame.jimengPrompt) {
        console.error('❌ [前端] 生成第一张图失败: 缺少提示词');
        alert('请先完成AI智能分析，生成提示词');
        setProgressVisible(prev => ({ ...prev, firstFrame: false }));
        setIsGeneratingFirst(false);
        return;
      }

      updateProgress(1, 50);

      // 步骤2: 发送到Python后端 (20-80%)
      const controller = new AbortController();
      setFirstFrameController(controller); // 保存到state中供停止按钮使用

      const timeoutId = setTimeout(() => {
        console.warn('⏰ [前端] 图片生成超时，中断请求 (10分钟)');
        controller.abort();
      }, 600000);

      const requestData = {
        frame: firstFrame,
        prompt: firstFrame.prompt || firstFrame.jimengPrompt,
        chineseDescription: firstFrame.displayDescription || firstFrame.chineseDescription,
        style: config.style,
        config: config,
        characters: []
      };

      updateProgress(2, 10);
      console.log('📤 [前端] 发送图片生成请求:', {
        frame: {
          sequence: requestData.frame.sequence,
          hasPrompt: !!requestData.frame.prompt
        },
        promptLength: requestData.prompt.length,
        prompt: requestData.prompt.substring(0, 100) + '...',
        descriptionLength: (requestData.chineseDescription || '').length,
        style: requestData.style,
        configKeys: Object.keys(requestData.config || {})
      });

      updateProgress(2, 30);
      console.log('🔗 [前端] 调用Python后端API: /api/generate-image-python');

      const response = await fetch('/api/generate-image-python', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      updateProgress(2, 70);
      console.log('📥 [前端] 收到图片生成响应:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });

      // 步骤3: 处理结果 (80-100%)
      updateProgress(3, 0);
      const result = await response.json();
      console.log('📊 [前端] 解析图片生成响应数据:', {
        success: result.success,
        hasData: !!result.data,
        hasImageUrl: !!(result.data?.imageUrl),
        error: result.error,
        dataKeys: result.data ? Object.keys(result.data) : []
      });

      updateProgress(3, 50);

      if (result.success) {
        console.log('✅ [前端] 图片生成成功:', {
          imageUrl: result.data.imageUrl ? result.data.imageUrl.substring(0, 100) + '...' : 'none',
          dataSize: JSON.stringify(result.data).length
        });

        setFirstFrameData(result.data);
        setFrames(prevFrames =>
          prevFrames.map((frame, index) =>
            index === 0
              ? { ...frame, imageUrl: result.data.imageUrl, isGenerating: false }
              : frame
          )
        );

        // 完成进度条
        updateProgress(3, 100);
        setTimeout(() => {
          setProgressVisible(prev => ({ ...prev, firstFrame: false }));
        }, 2000);

        console.log('🎬 [前端] 第一帧状态已更新');
      } else {
        console.error('❌ [前端] 图片生成API返回失败:', result);
        alert(`生成失败: ${result.error}`);
        setFrames(prevFrames =>
          prevFrames.map((frame, index) =>
            index === 0
              ? { ...frame, error: result.error, isGenerating: false }
              : frame
          )
        );
        setProgressVisible(prev => ({ ...prev, firstFrame: false }));
      }

    } catch (error) {
      console.error('💥 [前端] 图片生成网络错误:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });

      let errorMessage = '生成失败，请检查网络连接';
      if (error.name === 'AbortError') {
        console.log('⏹️ [前端] 图片生成被用户停止');
        // 区分超时和用户主动停止
        if (firstFrameController && !firstFrameController.signal.aborted) {
          errorMessage = '图片生成超时，请稍后重试。由于AI生成需要较长时间，请耐心等待...';
          console.warn('⏰ [前端] 请求被中断 (超时)');
          alert(errorMessage);
        } else {
          // 用户主动停止，不显示错误
          console.log('👤 [前端] 用户主动停止生成');
        }
      } else if (error.message.includes('timeout')) {
        errorMessage = '网络超时，AI图片生成可能需要几分钟时间，请稍后重试';
        console.warn('⏰ [前端] 网络超时错误');
        alert(errorMessage);
      } else {
        alert(errorMessage);
      }

      setFrames(prevFrames =>
        prevFrames.map((frame, index) =>
          index === 0
            ? { ...frame, error: errorMessage, isGenerating: false }
            : frame
        )
      );
      setProgressVisible(prev => ({ ...prev, firstFrame: false }));
    } finally {
      console.log('🏁 [前端] 图片生成完成，状态重置');
      setIsGeneratingFirst(false);
      setFirstFrameController(null);
    }
  };

  /**
   * 生成所有分镜图 (新版本：智能检测是否需要先分析 + 进度条)
   */
  const handleGenerateAllFrames = async (config) => {
    console.log('🎨 [前端] 开始批量生成所有分镜图:', {
      config: config,
      analysisResult: !!analysisResult,
      framesLength: frames.length,
      timestamp: new Date().toISOString()
    });

    // 智能检测：如果没有提示词，先执行分析
    if (!analysisResult || !frames.length) {
      console.error('❌ [前端] 批量生成失败: 缺少分析结果');
      alert('请先进行AI智能分析');
      return;
    }

    // 检查是否有有效的提示词
    const hasValidPrompts = frames.some(frame => frame.prompt || frame.jimengPrompt);
    if (!hasValidPrompts) {
      console.error('❌ [前端] 批量生成失败: 缺少有效提示词');
      alert('请先完成AI智能分析，生成提示词');
      return;
    }

    // 启动进度条
    setIsGeneratingAll(true);
    setBatchProgress(0);
    setProgressVisible(prev => ({ ...prev, batch: true }));

    try {
      console.log('🔄 [前端] 标记所有未生成的帧为生成中状态');
      // 标记所有未生成的帧为生成中
      setFrames(prevFrames =>
        prevFrames.map(frame =>
          !frame.imageUrl ? { ...frame, isGenerating: true } : frame
        )
      );

      setBatchProgress(10);

      // 创建AbortController用于停止控制
      const controller = new AbortController();
      setAllFramesController(controller);

      const requestData = {
        frames: frames,
        referenceImage: firstFrameData?.imageUrl || null,
        config: config,
        characters: []
      };

      console.log('📤 [前端] 发送批量生成请求:', {
        framesCount: requestData.frames.length,
        hasReferenceImage: !!requestData.referenceImage,
        configKeys: Object.keys(requestData.config || {}),
        framesWithPrompts: requestData.frames.filter(f => f.prompt || f.jimengPrompt).length
      });

      setBatchProgress(20);

      console.log('🔗 [前端] 调用批量生成API: /api/generate-all-images');
      // 使用配置的批量生成API端点
      const response = await fetch(getApiEndpoint('generateAllImages'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
        signal: controller.signal // 添加停止信号
      });

      setBatchProgress(30);

      console.log('📥 [前端] 收到批量生成响应:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });

      setBatchProgress(50);

      const result = await response.json();
      console.log('📊 [前端] 解析批量生成响应数据:', {
        success: result.success,
        hasData: !!result.data,
        dataLength: result.data ? result.data.length : 0,
        hasStats: !!result.stats,
        error: result.error
      });

      setBatchProgress(70);

      if (result.success) {
        console.log('✅ [前端] 批量生成API调用成功:', {
          generatedCount: result.data.length,
          stats: result.stats || 'no stats'
        });

        setBatchProgress(80);

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

        setBatchProgress(100);

        // 完成进度条
        setTimeout(() => {
          setProgressVisible(prev => ({ ...prev, batch: false }));
        }, 2000);

        console.log(`✅ [前端] 成功生成${result.data.length}张分镜图`);
        if (result.stats) {
          console.log('📈 [前端] 批量生成统计:', result.stats);
        }
      } else {
        console.error('❌ [前端] 批量生成API返回失败:', result);
        alert(`批量生成失败: ${result.error}`);
        setProgressVisible(prev => ({ ...prev, batch: false }));
      }
    } catch (error) {
      console.error('💥 [前端] 批量生成网络错误:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });

      // 处理停止操作
      if (error.name === 'AbortError') {
        console.log('⏹️ [前端] 批量生成被用户停止');
        // 用户主动停止，不显示错误
      } else {
        alert('生成失败，请检查网络连接');
      }

      setProgressVisible(prev => ({ ...prev, batch: false }));
    } finally {
      console.log('🏁 [前端] 批量生成完成，状态重置');
      setIsGeneratingAll(false);
      setAllFramesController(null);
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

      // 使用Python后端的图片生成API，增加超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 600000); // 10分钟超时

      const response = await fetch('/api/generate-image-python', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          frame: targetFrame,
          prompt: targetFrame.prompt || targetFrame.jimengPrompt,
          config: currentConfig
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
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
        if (frameIndex === 0) {
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

      let errorMessage = '网络错误';
      if (error.name === 'AbortError') {
        errorMessage = '图片生成超时，请稍后重试。AI生成需要较长时间...';
      } else if (error.message.includes('timeout')) {
        errorMessage = '网络超时，AI图片生成可能需要几分钟时间';
      }

      setFrames(prevFrames =>
        prevFrames.map(frame =>
          frame.id === frameId
            ? { ...frame, error: errorMessage, isGenerating: false }
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
          {/* 进度条区域 */}
          <div className="absolute inset-x-0 top-[120px] z-40 px-2">
            {/* AI智能分析进度条 */}
            <ProgressBar
              progress={analysisProgress}
              isVisible={progressVisible.analysis}
              title="AI智能分析"
              subtitle="正在执行4步工作流：故事切分 → 关键帧提取 → 提示词生成 → 结果整合"
              variant="primary"
              size="medium"
              animated={true}
            />

            {/* 第一张图生成进度条 */}
            <ProgressBar
              progress={firstFrameProgress}
              isVisible={progressVisible.firstFrame}
              title="生成第一张图"
              subtitle="准备数据 → 调用AI生成 → 处理结果"
              variant="success"
              size="medium"
              animated={true}
            />

            {/* 批量生成进度条 */}
            <ProgressBar
              progress={batchProgress}
              isVisible={progressVisible.batch}
              title="批量生成分镜图"
              subtitle="逐个生成所有分镜图片，请耐心等待..."
              variant="info"
              size="medium"
              animated={true}
            />
          </div>
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
                onStopAnalysis={handleStopAnalysis}
                onStopFirstFrame={handleStopFirstFrame}
                onStopAllFrames={handleStopAllFrames}
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