import { useState, useCallback } from 'react';
import Head from 'next/head';
import { ProjectProvider, useProject } from '../contexts/ProjectContext';
import NavigationDock from '../components/NavigationDock';
import StoryEngine from '../components/StoryEngine';
import PhaseController from '../components/PhaseController';
import MultiViewPanel from '../components/MultiViewPanel';
import ProgressBar from '../components/ProgressBar';

/**
 * 儿童绘本创作 IDE - 主页面
 * 架构: 导航侧边栏 + 三栏工作区 (30% + 15% + 55%)
 *
 * 工作流程:
 * 1. 全局设置 (风格/画幅/分辨率)
 * 2. 剧本确认 - AI分析故事，生成分镜脚本和角色
 * 3. 角色定妆 - 生成角色三视图并锁定
 * 4. 图片生成 - 使用角色参考图生成页面插图
 * 5. 音频合成 - 为每页生成配音
 */
function IDEWorkspace() {
  const { state, actions } = useProject();
  const { project, progress } = state;

  // 生成状态
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingCharacters, setIsGeneratingCharacters] = useState(false);
  const [isGeneratingPages, setIsGeneratingPages] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);

  /**
   * 阶段1: AI 分析故事
   * 生成分镜脚本 + 提取角色
   */
  const handleAnalyzeStory = useCallback(async () => {
    const { rawStory, style_preset, settings } = project;

    if (!rawStory || rawStory.trim().length < 50) {
      alert('请先输入至少50个字符的故事');
      return;
    }

    console.log('🎭 [IDE] 开始AI分析故事...');
    setIsAnalyzing(true);
    actions.updatePhaseStatus(1, 'in_progress');
    actions.setProgress({
      visible: true,
      value: 0,
      title: 'AI正在阅读故事',
      subtitle: '理解故事 → 识别角色 → 生成脚本'
    });

    try {
      const response = await fetch('/api/intelligent-analyze-script?stream=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script: rawStory,
          sceneCount: settings.pageCount || 8,
          style: style_preset
        })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const event of events) {
          if (!event.trim()) continue;
          const lines = event.split('\n').filter(l => l.trim());
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'progress') {
                  actions.setProgress({
                    value: data.progress,
                    subtitle: data.message
                  });
                } else if (data.type === 'complete') {
                  const result = data.data;

                  // 清空旧数据
                  actions.clearAssets();

                  // 添加角色资产（已包含三视图提示词）
                  const characters = result.characters || [];
                  characters.forEach(char => {
                    actions.addAsset({
                      id: char.id,
                      name: char.name,
                      identity: char.identity,
                      appearance: char.appearance,
                      details: char.details,
                      personality: char.personality,
                      prompt: char.prompt,  // 三视图提示词
                      image_url: null,
                      locked: false
                    });
                  });

                  // 设置分镜页面
                  const pages = result.pages || [];
                  actions.setPages(pages);

                  // 保存脚本数据
                  actions.setScriptData(result);

                  // 更新阶段状态
                  actions.updatePhaseStatus(1, 'completed');
                  actions.setLeftTab('script');
                  actions.setPhase(2);
                  actions.setRightTab('assets');

                  actions.setProgress({ visible: false });

                  console.log(`✅ [IDE] 分析完成: ${characters.length}个角色, ${pages.length}页`);

                } else if (data.type === 'error') {
                  throw new Error(data.error);
                }
              } catch (e) {
                if (e.message.includes('JSON')) {
                  console.warn('解析SSE数据失败:', e);
                } else {
                  throw e;
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('分析失败:', error);
      alert('分析失败: ' + error.message);
      actions.updatePhaseStatus(1, 'pending');
      actions.setProgress({ visible: false });
    } finally {
      setIsAnalyzing(false);
    }
  }, [project, actions]);

  /**
   * 阶段2: 生成单个角色三视图
   */
  const handleGenerateCharacter = useCallback(async (asset) => {
    console.log('🎨 [IDE] 生成角色三视图:', asset.name);

    try {
      const response = await fetch('/api/generate-character', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId: asset.id,
          characterName: asset.name,
          prompt: asset.prompt
        })
      });

      const result = await response.json();
      if (result.success) {
        actions.updateAsset({
          id: asset.id,
          image_url: result.data.image_url
        });
        console.log(`✅ [IDE] 角色 ${asset.name} 三视图生成成功`);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('生成角色失败:', error);
      alert(`生成 ${asset.name} 失败: ${error.message}`);
    }
  }, [actions]);

  /**
   * 阶段2: 批量生成所有角色三视图
   */
  const handleGenerateAllCharacters = useCallback(async () => {
    const unlockedAssets = project.assets.filter(a => !a.locked);

    if (unlockedAssets.length === 0) {
      alert('没有需要生成的角色');
      return;
    }

    console.log(`🎨 [IDE] 批量生成 ${unlockedAssets.length} 个角色...`);
    setIsGeneratingCharacters(true);
    actions.updatePhaseStatus(2, 'in_progress');
    actions.setProgress({
      visible: true,
      value: 0,
      title: '生成角色三视图',
      subtitle: `0/${unlockedAssets.length}`
    });

    try {
      for (let i = 0; i < unlockedAssets.length; i++) {
        const asset = unlockedAssets[i];
        actions.setProgress({
          value: Math.round((i / unlockedAssets.length) * 100),
          subtitle: `正在生成: ${asset.name} (${i + 1}/${unlockedAssets.length})`
        });

        await handleGenerateCharacter(asset);
      }

      actions.setProgress({
        value: 100,
        subtitle: '全部生成完成'
      });

      setTimeout(() => {
        actions.setProgress({ visible: false });
      }, 1000);

      console.log('✅ [IDE] 全部角色生成完成');

    } catch (error) {
      console.error('批量生成角色失败:', error);
      actions.setProgress({ visible: false });
    } finally {
      setIsGeneratingCharacters(false);
    }
  }, [project.assets, handleGenerateCharacter, actions]);

  /**
   * 阶段2: 锁定所有角色
   */
  const handleLockAllCharacters = useCallback(() => {
    const generatedAssets = project.assets.filter(a => a.image_url && !a.locked);

    if (generatedAssets.length === 0) {
      alert('没有可锁定的角色');
      return;
    }

    generatedAssets.forEach(asset => {
      actions.lockAsset(asset.id);
    });

    // 检查是否全部锁定
    const allLocked = project.assets.every(a => a.locked || !a.image_url);
    if (allLocked && project.assets.some(a => a.image_url)) {
      actions.updatePhaseStatus(2, 'completed');
      actions.setPhase(3);
      actions.setRightTab('storyboard');
      console.log('✅ [IDE] 全部角色已锁定，进入图片生成阶段');
    }
  }, [project.assets, actions]);

  /**
   * 阶段3: 生成单页图片
   */
  const handleGeneratePage = useCallback(async (pageIndex) => {
    const page = project.pages.find(p => p.page_index === pageIndex);
    if (!page) return;

    console.log('🖼️ [IDE] 生成页面图片:', pageIndex);

    actions.updatePage({
      page_index: pageIndex,
      status: 'generating'
    });

    try {
      // 获取锁定的角色名字（用于提示词拼接，不发送图片数据避免请求过大）
      const lockedCharacters = project.assets
        .filter(a => a.locked && a.image_url)
        .map(a => ({ name: a.name }));  // 只发送名字

      const response = await fetch('/api/generate-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageIndex,
          jimengPrompt: page.jimeng_prompt,
          styleId: project.style_preset,
          characters: lockedCharacters,
          aspectRatio: project.settings.aspectRatio,
          resolution: project.settings.resolution
        })
      });

      const result = await response.json();
      if (result.success) {
        actions.updatePage({
          page_index: pageIndex,
          image_url: result.data.image_url,
          status: 'ready'
        });
        console.log(`✅ [IDE] 第 ${pageIndex} 页生成成功`);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('生成页面失败:', error);
      actions.updatePage({
        page_index: pageIndex,
        error: error.message,
        status: 'error'
      });
    }
  }, [project.pages, project.assets, project.style_preset, project.settings, actions]);

  /**
   * 阶段3: 批量生成所有页面
   */
  const handleGenerateAllPages = useCallback(async () => {
    const pendingPages = project.pages.filter(p => !p.image_url);

    if (pendingPages.length === 0) {
      alert('没有需要生成的页面');
      return;
    }

    console.log(`🚀 [IDE] 批量生成 ${pendingPages.length} 页...`);
    setIsGeneratingPages(true);
    actions.updatePhaseStatus(3, 'in_progress');
    actions.setProgress({
      visible: true,
      value: 0,
      title: '批量生成绘本插图',
      subtitle: `0/${pendingPages.length}`
    });

    try {
      for (let i = 0; i < pendingPages.length; i++) {
        const page = pendingPages[i];
        actions.setProgress({
          value: Math.round((i / pendingPages.length) * 100),
          subtitle: `正在绘制第 ${page.page_index} 页 (${i + 1}/${pendingPages.length})`
        });

        await handleGeneratePage(page.page_index);
      }

      actions.setProgress({
        value: 100,
        subtitle: '全部生成完成'
      });

      // 直接标记完成（不再依赖异步state检查）
      // 因为所有页面都已成功生成
      actions.updatePhaseStatus(3, 'completed');

      setTimeout(() => {
        actions.setProgress({ visible: false });
      }, 1500);

      console.log('✅ [IDE] 全部页面生成完成');

    } catch (error) {
      console.error('批量生成失败:', error);
      actions.setProgress({ visible: false });
    } finally {
      setIsGeneratingPages(false);
    }
  }, [project.pages, handleGeneratePage, actions]);

  /**
   * 阶段4: 生成所有音频
   */
  const handleGenerateAllAudio = useCallback(async () => {
    console.log('🔊 [IDE] 生成音频...');
    setIsGeneratingAudio(true);
    actions.updatePhaseStatus(4, 'in_progress');
    actions.setProgress({
      visible: true,
      value: 0,
      title: '合成配音',
      subtitle: '准备中...'
    });

    try {
      for (let i = 0; i < project.pages.length; i++) {
        const page = project.pages[i];
        actions.setProgress({
          value: Math.round((i / project.pages.length) * 100),
          subtitle: `正在合成第 ${page.page_index} 页配音 (${i + 1}/${project.pages.length})`
        });

        // 获取页面文本 - 从dialogues拼接（方案C：带角色名）
        let text = '';
        if (page.dialogues && Array.isArray(page.dialogues) && page.dialogues.length > 0) {
          text = page.dialogues
            .map(d => d.role === '旁白' ? d.text : `${d.role}说：${d.text}`)
            .join(' ');
        } else {
          // 兼容旧数据格式
          text = page.narration || page.text || page.display_text || '';
        }

        if (!text.trim()) {
          console.log(`⚠️ [IDE] 第 ${page.page_index} 页没有对话文本，跳过`);
          continue;
        }

        console.log(`📝 [IDE] 第 ${page.page_index} 页配音文本: ${text.substring(0, 50)}...`);

        // 调用Python后端TTS API
        const response = await fetch('http://localhost:8081/api/generate-audio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: text,
            page_index: page.page_index,
            speaker_id: 'child',
            speed_factor: '1.0',
            pitch_factor: '1.0'
          })
        });

        const result = await response.json();
        if (result.success) {
          actions.updatePage({
            page_index: page.page_index,
            audio_url: result.data.audioUrl
          });
          console.log(`✅ [IDE] 第 ${page.page_index} 页配音完成: ${result.data.audioUrl}`);
        } else {
          console.error(`❌ [IDE] 第 ${page.page_index} 页配音失败:`, result.error);
        }
      }

      actions.setProgress({
        value: 100,
        subtitle: '全部配音完成'
      });

      actions.updatePhaseStatus(4, 'completed');

      setTimeout(() => {
        actions.setProgress({ visible: false });
      }, 1000);

      console.log('✅ [IDE] 全部音频生成完成');

    } catch (error) {
      console.error('音频生成失败:', error);
      alert('音频生成失败: ' + error.message);
      actions.setProgress({ visible: false });
    } finally {
      setIsGeneratingAudio(false);
    }
  }, [project.pages, actions]);

  /**
   * 局部修图
   */
  const handleInpaint = useCallback(async (page, maskData, prompt) => {
    console.log('🖊️ [IDE] 局部修图:', page.page_index, prompt);
    // TODO: 实现 inpainting API 调用
    alert('局部修图功能开发中...');
  }, []);

  /**
   * 调试: 为所有页面设置测试音频
   */
  const handleDebugSetTestAudio = useCallback(async () => {
    const testText = "乌龟听了，笑着说：哎呀，我不是你们的妈妈。我是乌龟。你们的妈妈头顶上有两只大眼睛，披着绿色的衣裳。你们到前面去找找吧！";

    console.log('🔊 [DEBUG] 为所有页面设置测试音频...');

    try {
      // 先生成一个测试音频
      const response = await fetch('http://localhost:8081/api/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: testText,
          page_index: 999, // 使用特殊索引
          speaker_id: 'child',
          speed_factor: '1.0',
          pitch_factor: '1.0'
        })
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error);
      }

      const audioUrl = result.data.audioUrl;
      console.log('✅ [DEBUG] 测试音频生成成功:', audioUrl);

      // 为所有页面设置这个音频
      for (const page of project.pages) {
        actions.updatePage({
          page_index: page.page_index,
          audio_url: audioUrl
        });
        console.log(`✅ [DEBUG] 第 ${page.page_index} 页音频已设置`);
      }

      alert(`已为 ${project.pages.length} 页设置测试音频: ${audioUrl}`);
    } catch (error) {
      console.error('❌ [DEBUG] 设置测试音频失败:', error);
      alert('设置测试音频失败: ' + error.message);
    }
  }, [project.pages, actions]);

  // 暴露调试函数到window（开发环境使用）
  if (typeof window !== 'undefined') {
    window.debugSetTestAudio = handleDebugSetTestAudio;
  }

  return (
    <>
      <Head>
        <title>AI绘本创作工坊 - IDE</title>
        <meta name="description" content="AI驱动的儿童绘本创作集成开发环境" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="h-screen flex overflow-hidden">
        {/* 左侧导航栏 */}
        <NavigationDock />

        {/* 主工作区 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 进度条区域 */}
          {progress.visible && (
            <div className="absolute inset-x-0 top-0 z-50 px-4 pt-2">
              <ProgressBar
                progress={progress.value}
                isVisible={progress.visible}
                title={progress.title}
                subtitle={progress.subtitle}
                variant="primary"
                size="medium"
                animated={true}
              />
            </div>
          )}

          {/* 三栏工作区 */}
          <main className="flex-1 flex gap-2 p-2 overflow-hidden">
            {/* 左栏 - 故事引擎 (30%) */}
            <div className="w-[30%] flex-shrink-0">
              <div className="storybook-panel h-full overflow-hidden">
                <StoryEngine />
              </div>
            </div>

            {/* 中栏 - 指挥塔 (15%) */}
            <div className="w-[15%] flex-shrink-0">
              <div className="storybook-panel h-full overflow-hidden">
                <PhaseController
                  onAnalyzeStory={handleAnalyzeStory}
                  onGenerateAllCharacters={handleGenerateAllCharacters}
                  onLockAllCharacters={handleLockAllCharacters}
                  onGenerateAllPages={handleGenerateAllPages}
                  onGenerateAllAudio={handleGenerateAllAudio}
                  isAnalyzing={isAnalyzing}
                  isGeneratingCharacters={isGeneratingCharacters}
                  isGeneratingPages={isGeneratingPages}
                  isGeneratingAudio={isGeneratingAudio}
                />
              </div>
            </div>

            {/* 右栏 - 多功能视窗 (55%) */}
            <div className="flex-1 min-w-0">
              <div className="storybook-panel h-full overflow-hidden">
                <MultiViewPanel
                  onGenerateCharacter={handleGenerateCharacter}
                  onGeneratePage={handleGeneratePage}
                  onGenerateAll={handleGenerateAllPages}
                  onInpaint={handleInpaint}
                  isGenerating={isGeneratingPages}
                  isGeneratingCharacters={isGeneratingCharacters}
                />
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}

/**
 * 页面入口 - 包裹 Provider
 */
export default function IDEPage() {
  return (
    <ProjectProvider>
      <IDEWorkspace />
    </ProjectProvider>
  );
}
