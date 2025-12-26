import { useState } from 'react';
import Head from 'next/head';
import ScriptInput from '../components/ScriptInput';
import ControlPanel from '../components/ControlPanel';
import StoryboardDisplay from '../components/StoryboardDisplay';
import ProgressBar from '../components/ProgressBar';
import { getApiEndpoint } from '../config/api-config';

/**
 * 儿童绘本创作工具 - 主页面
 * 三栏布局: 故事输入(30%) - 控制面板(15%) - 绘本画板(55%)
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
   * AI智能分析剧本 (使用SSE流式进度 + fetch stream方案)
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
      alert('请先输入有效的故事内容');
      return;
    }

    // 启动进度条
    console.log('⏳ [前端] 设置状态: isAnalyzing=true, progress=0, visible=true');
    setIsAnalyzing(true);
    setCurrentConfig(config);
    setAnalysisProgress(0);
    setProgressVisible(prev => {
      const newState = { ...prev, analysis: true };
      console.log('⏳ [前端] progressVisible 新状态:', newState);
      return newState;
    });

    // 清除之前的分析结果
    console.log('🧹 [前端] 清除之前的分析结果');
    setAnalysisResult(null);
    setFrames([]);
    setFirstFrameData(null);

    try {
      // 创建AbortController用于停止控制
      const controller = new AbortController();
      setAnalysisController(controller);

      // 构建请求URL
      const params = new URLSearchParams({
        stream: 'true'
      });

      console.log('🔗 [前端] 调用API: /api/intelligent-analyze-script?stream=true');

      // 使用fetch + ReadableStream处理SSE流
      const response = await fetch(`/api/intelligent-analyze-script?${params.toString()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          script,
          sceneCount: config.frameCount,
          style: config.style,
          genre: config.genre
        }),
        signal: controller.signal
      });

      console.log('📥 [前端] 收到响应:', {
        status: response.status,
        statusText: response.statusText,
        headers: {
          'content-type': response.headers.get('content-type')
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // 处理SSE流 - 使用更健壮的行解析方法
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let eventCount = 0;

      console.log('📊 [前端] 开始读取SSE流...');

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log(`✅ [前端] SSE流读取完成，共收到${eventCount}个事件`);
          break;
        }

        // 将新数据添加到缓冲区
        buffer += decoder.decode(value, { stream: true });
        console.log(`📥 [前端] 收到${value.length}字节数据，缓冲区大小: ${buffer.length}`);

        // 处理完整的行（以 \n\n 分隔的SSE事件）
        // SSE格式: data: {...}\n\n
        const events = buffer.split('\n\n');

        // 保留最后一个不完整的事件在缓冲区
        buffer = events.pop() || '';
        console.log(`📍 [前端] 分割后事件数: ${events.length}, 剩余缓冲: ${buffer.length}`);

        for (const event of events) {
          // 跳过空事件
          if (!event.trim()) {
            console.log('⏭️  [前端] 跳过空事件');
            continue;
          }

          // 提取 data: 行
          const lines = event.split('\n').filter(line => line.trim());
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              eventCount++;
              const dataStr = line.slice(6).trim();
              console.log(`📨 [前端] 收到SSE事件 #${eventCount}: ${dataStr.substring(0, 80)}...`);

              try {
                const data = JSON.parse(dataStr);

                if (data.type === 'progress') {
                  // 实时更新进度条
                  console.log(`📊 [前端] 收到进度事件: Step${data.step}, ${data.progress}%, 消息: ${data.message}`);
                  setAnalysisProgress(data.progress);
                  console.log(`📊 [前端] 进度条已更新为: ${data.progress}%`);
                }
                else if (data.type === 'complete') {
                  // 分析完成
                  console.log('✅ [前端] AI智能分析完成');
                  setAnalysisResult(data.data);

                  const frameStructure = data.data.storyboard_frames.map(frame => ({
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

                  // 2秒后隐藏进度条
                  setTimeout(() => {
                    setProgressVisible(prev => ({ ...prev, analysis: false }));
                  }, 2000);

                  console.log(`✅ 智能分析完成，生成${frameStructure.length}个关键帧`);
                }
                else if (data.type === 'error') {
                  console.error('❌ [前端] AI智能分析失败:', data.error);
                  alert(`智能分析失败: ${data.error}`);
                  setProgressVisible(prev => ({ ...prev, analysis: false }));
                }
              } catch (e) {
                console.error('❌ [前端] 解析SSE数据失败:', e.message, 'Line:', line);
              }
            }
          }
        }
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
   * 生成第一张图 (单步进度 - 从0%推进到100%)
   */
  const handleGenerateFirstFrame = async (config) => {
    console.log('🖼️ [前端] 开始生成第一张图:', {
      config: config,
      analysisResult: !!analysisResult,
      framesLength: frames.length,
      timestamp: new Date().toISOString()
    });

    if (!analysisResult || !frames.length) {
      console.error('❌ [前端] 生成第一张图失败: 缺少分析结果');
      alert('请先进行AI智能分析');
      return;
    }

    // 启动进度条
    setIsGeneratingFirst(true);
    setFirstFrameProgress(0);
    setProgressVisible(prev => ({ ...prev, firstFrame: true }));

    try {
      const firstFrame = frames[0];
      console.log('🎯 [前端] 第一帧数据:', {
        sequence: firstFrame.sequence,
        hasPrompt: !!(firstFrame.prompt || firstFrame.jimengPrompt),
        hasDescription: !!(firstFrame.displayDescription || firstFrame.chineseDescription)
      });

      // 检查是否有提示词
      if (!firstFrame.prompt && !firstFrame.jimengPrompt) {
        console.error('❌ [前端] 生成第一张图失败: 缺少提示词');
        alert('请先完成AI智能分析，生成提示词');
        setProgressVisible(prev => ({ ...prev, firstFrame: false }));
        setIsGeneratingFirst(false);
        return;
      }

      // 更新进度：30% (准备数据完成)
      setFirstFrameProgress(30);

      // 发送到Python后端
      const controller = new AbortController();
      setFirstFrameController(controller);

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

      console.log('📤 [前端] 发送图片生成请求到Python后端');

      // 更新进度：50% (发送请求完成)
      setFirstFrameProgress(50);

      const response = await fetch('/api/generate-image-python', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // 更新进度：75% (收到响应)
      setFirstFrameProgress(75);

      console.log('📥 [前端] 收到图片生成响应, status:', response.status);

      const result = await response.json();
      console.log('📊 [前端] 解析响应数据, success:', result.success);

      if (result.success) {
        console.log('✅ [前端] 图片生成成功');

        setFirstFrameData(result.data);
        setFrames(prevFrames =>
          prevFrames.map((frame, index) =>
            index === 0
              ? { ...frame, imageUrl: result.data.imageUrl, isGenerating: false }
              : frame
          )
        );

        // 完成进度条：100%
        setFirstFrameProgress(100);
        setTimeout(() => {
          setProgressVisible(prev => ({ ...prev, firstFrame: false }));
        }, 2000);

        console.log('🎬 [前端] 第一帧显示完成');
      } else {
        console.error('❌ [前端] 图片生成失败:', result.error);
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
        name: error.name
      });

      let errorMessage = '生成失败，请检查网络连接';
      if (error.name === 'AbortError') {
        console.log('⏹️ [前端] 图片生成被用户停止');
        if (firstFrameController && !firstFrameController.signal.aborted) {
          errorMessage = '图片生成超时，请稍后重试。由于AI生成需要较长时间，请耐心等待...';
          console.warn('⏰ [前端] 请求被中断 (超时)');
          alert(errorMessage);
        } else {
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
   * 生成所有分镜图 (SSE流式逐帧生成 + 实时显示)
   */
  const handleGenerateAllFrames = async (config) => {
    console.log('🎨 [前端] 开始批量生成所有分镜图:', {
      config: config,
      analysisResult: !!analysisResult,
      framesLength: frames.length,
      timestamp: new Date().toISOString()
    });

    if (!analysisResult || !frames.length) {
      console.error('❌ [前端] 批量生成失败: 缺少分析结果', {
        analysisResult: !!analysisResult,
        framesLength: frames.length
      });
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

      // 创建AbortController用于停止控制
      const controller = new AbortController();
      setAllFramesController(controller);

      const requestData = {
        frames: frames,
        referenceImage: firstFrameData?.imageUrl || null,
        config: config
      };

      console.log('📤 [前端] 发送批量生成请求:', {
        framesCount: requestData.frames.length,
        hasReferenceImage: !!requestData.referenceImage,
        configKeys: Object.keys(requestData.config || {})
      });

      console.log('🔗 [前端] 调用API: /api/generate-all-images?stream=true');

      // 使用fetch + ReadableStream处理SSE流
      const response = await fetch('/api/generate-all-images?stream=true', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
        signal: controller.signal
      });

      console.log('📥 [前端] 收到响应:', {
        status: response.status,
        statusText: response.statusText,
        headers: {
          'content-type': response.headers.get('content-type')
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // 处理SSE流
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // 将新数据添加到缓冲区
        buffer += decoder.decode(value, { stream: true });

        // 按行分割处理SSE数据
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // 保留最后一行（可能未完成）

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'progress') {
                // 更新进度条
                setBatchProgress(data.progress);
                console.log(`📊 [前端] ${data.message}`);
              }
              else if (data.type === 'frame_complete') {
                // 逐帧更新UI - 立即显示生成的图片
                setFrames(prevFrames =>
                  prevFrames.map(frame =>
                    frame.sequence === data.sequence
                      ? {
                          ...frame,
                          imageUrl: data.imageUrl,
                          isGenerating: false,
                          error: null
                        }
                      : frame
                  )
                );
                console.log(`✅ [前端] 第${data.sequence}帧生成完成，立即显示`);
              }
              else if (data.type === 'frame_error') {
                // 标记错误帧
                setFrames(prevFrames =>
                  prevFrames.map(frame =>
                    frame.sequence === data.sequence
                      ? {
                          ...frame,
                          error: data.error,
                          isGenerating: false
                        }
                      : frame
                  )
                );
                console.error(`❌ [前端] 第${data.sequence}帧生成失败:`, data.error);
              }
              else if (data.type === 'complete') {
                console.log('✅ [前端] 所有分镜图生成完成');

                // 2秒后隐藏进度条
                setTimeout(() => {
                  setProgressVisible(prev => ({ ...prev, batch: false }));
                }, 2000);
              }
              else if (data.type === 'error') {
                console.error('❌ [前端] 批量生成失败:', data.error);
                alert(`批量生成失败: ${data.error}`);
                setProgressVisible(prev => ({ ...prev, batch: false }));
              }
            } catch (e) {
              console.error('❌ [前端] 解析SSE数据失败:', e.message, 'Line:', line);
            }
          }
        }
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

      // 清除所有isGenerating状态
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
      link.download = `storybook_page_${frame.sequence}.jpg`;
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
        <title>AI绘本创作工坊 - 让故事变成画</title>
        <meta name="description" content="AI驱动的儿童绘本创作工具，让您的故事变成精美的绘本插图" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen">
        {/* 儿童绘本风格头部 */}
        <header className="relative overflow-hidden">
          {/* 背景装饰 */}
          <div className="absolute inset-0 bg-gradient-to-r from-orange-100 via-yellow-50 to-pink-100"></div>
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-2 left-10 text-4xl animate-float">🌟</div>
            <div className="absolute top-4 right-20 text-3xl animate-float delay-200">✨</div>
            <div className="absolute top-1 right-1/3 text-2xl animate-float delay-100">🌈</div>
          </div>

          <div className="relative z-10 px-6 py-5 border-b-4 border-yellow-300">
            <div className="flex justify-between items-center">
              <div className="fade-in-up">
                <h1 className="text-3xl font-bold text-orange-600" style={{ fontFamily: "'Fredoka', sans-serif" }}>
                  <span className="text-4xl mr-2">📚</span>
                  AI绘本创作工坊
                </h1>
                <p className="text-orange-500/80 mt-1 text-lg" style={{ fontFamily: "'Nunito', sans-serif" }}>
                  让您的故事变成精美的绘本插图
                </p>
              </div>
              <div className="flex items-center gap-4 fade-in-up delay-200">
                <div className="flex items-center gap-2 px-4 py-2 bg-white/80 rounded-full border-2 border-green-300 shadow-md">
                  <div className="status-dot status-dot-success"></div>
                  <span className="text-green-600 font-medium" style={{ fontFamily: "'Nunito', sans-serif" }}>
                    系统就绪
                  </span>
                </div>
                <div className="px-3 py-1 bg-blue-50 rounded-full border-2 border-blue-200 text-blue-600 text-sm" style={{ fontFamily: "'Nunito', sans-serif" }}>
                  Claude + 即梦AI
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* 主内容区 - 三栏布局 */}
        <main className="flex h-[calc(100vh-140px)] gap-3 p-3">
          {/* 进度条区域 */}
          <div className="absolute inset-x-0 top-[140px] z-40 px-3">
            {/* AI智能分析进度条 */}
            <ProgressBar
              progress={analysisProgress}
              isVisible={progressVisible.analysis}
              title="AI正在阅读故事"
              subtitle="理解故事 → 规划场景 → 生成绘画指令 → 完成准备"
              variant="primary"
              size="medium"
              animated={true}
            />

            {/* 第一张图生成进度条 */}
            <ProgressBar
              progress={firstFrameProgress}
              isVisible={progressVisible.firstFrame}
              title="绘制第一页插图"
              subtitle="准备画布 → AI绘画中 → 完成创作"
              variant="success"
              size="medium"
              animated={true}
            />

            {/* 批量生成进度条 */}
            <ProgressBar
              progress={batchProgress}
              isVisible={progressVisible.batch}
              title="绘制全部插图"
              subtitle="正在一页一页地画出精美插图，请耐心等待..."
              variant="info"
              size="medium"
              animated={true}
            />
          </div>

          {/* 左栏 - 故事输入 (30%) */}
          <div className="w-[30%] fade-in-up delay-100">
            <div className="storybook-panel h-full">
              <ScriptInput
                value={script}
                onChange={setScript}
                onValidate={handleScriptValidate}
              />
            </div>
          </div>

          {/* 中栏 - 控制面板 (15%) */}
          <div className="w-[15%] fade-in-up delay-200">
            <div className="storybook-panel h-full">
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

          {/* 右栏 - 绘本画板 (55%) */}
          <div className="w-[55%] fade-in-up delay-300">
            <div className="storybook-panel h-full">
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

        {/* 底部状态栏 - 可爱风格 */}
        <footer className="border-t-4 border-yellow-300 bg-gradient-to-r from-orange-50 via-yellow-50 to-pink-50">
          <div className="px-6 py-3">
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-4 text-orange-500" style={{ fontFamily: "'Nunito', sans-serif" }}>
                <span>© 2025 AI绘本创作工坊</span>
                <span className="text-yellow-400">✨</span>
                <span>让每个故事都有精美的插图</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎨</span>
                <span className="text-2xl">📖</span>
                <span className="text-2xl">✨</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
