import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useProject } from '../contexts/ProjectContext';

/**
 * 翻页书预览组件 (Flipbook)
 * 3D翻书效果：左页文字，右页图片（同一页的文字和图片配对）
 * 根据图片比例动态调整书本大小
 * 支持音频自动播放和翻页
 */

// 从dialogues提取显示文本（方案C：带角色名）
const getPageText = (page) => {
  if (!page) return '';
  if (page.dialogues && Array.isArray(page.dialogues) && page.dialogues.length > 0) {
    return page.dialogues
      .map(d => d.role === '旁白' ? d.text : `${d.role}说："${d.text}"`)
      .join('\n\n');
  }
  return page.narration || page.text || page.display_text || '';
};

// 封面内容
const CoverContent = ({ title }) => (
  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-amber-100 to-amber-200 text-amber-900">
    <div className="border-4 border-white/40 p-6 rounded-xl w-full h-full flex flex-col items-center justify-center">
      <span className="text-4xl mb-4 animate-bounce">📚</span>
      <h1 className="text-2xl md:text-3xl font-black mb-3 tracking-tight">{title || '我的绘本'}</h1>
      <h2 className="text-sm font-medium opacity-80 mb-4">AI Picture Book</h2>
      <div className="px-3 py-1 bg-white/30 rounded-full text-xs font-bold uppercase tracking-wider">
        点击翻页 →
      </div>
    </div>
  </div>
);

// 封底内容
const BackCoverContent = () => (
  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-amber-100 to-amber-200 text-amber-900">
    <span className="text-3xl mb-3">🎉</span>
    <h1 className="text-2xl font-bold mb-2">完</h1>
    <p className="text-xs opacity-60 uppercase tracking-widest">The End</p>
  </div>
);

// 图片页内容
const ImagePageContent = ({ page, pageNumber }) => {
  if (!page?.image_url) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-stone-100">
        <span className="text-5xl opacity-20">🖼️</span>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-stone-50 flex items-center justify-center">
      <img
        src={page.image_url}
        alt={`第${pageNumber}页`}
        className="max-w-full max-h-full object-contain"
        draggable={false}
      />
      {/* 底部页码 */}
      <div className="absolute bottom-3 right-3 px-2 py-0.5 bg-black/30 rounded-full text-white/90 text-xs font-medium backdrop-blur-sm">
        {pageNumber}
      </div>
    </div>
  );
};

// 文字页内容
const TextPageContent = ({ page, pageNumber, totalPages }) => {
  const text = getPageText(page);
  const firstChar = text.charAt(0);
  const restText = text.slice(1);

  return (
    <div className="w-full h-full p-5 md:p-6 flex flex-col bg-[#fffbf0]">
      {/* 顶部装饰 */}
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-amber-200/50">
        <span className="text-2xl text-amber-300 font-serif font-bold">
          {String(pageNumber).padStart(2, '0')}
        </span>
        <div className="h-[1px] flex-1 bg-gradient-to-r from-amber-200 to-transparent" />
      </div>

      {/* 故事文字 */}
      <div className="flex-1 overflow-y-auto storybook-scrollbar">
        <div className="font-serif text-stone-700 leading-relaxed text-sm md:text-base text-justify">
          {firstChar && (
            <span className="float-left text-4xl text-amber-600 font-serif mr-2 mt-[-2px] leading-none select-none drop-shadow-sm">
              {firstChar}
            </span>
          )}
          <span className="whitespace-pre-wrap">{restText}</span>
        </div>
      </div>

      {/* 底部页码 */}
      <div className="mt-3 pt-3 border-t border-amber-200/30 text-center">
        <span className="text-stone-400 font-serif text-xs tracking-widest">
          {pageNumber} / {totalPages}
        </span>
      </div>
    </div>
  );
};

// 结束文字页
const EndTextContent = () => (
  <div className="w-full h-full p-8 flex flex-col items-center justify-center text-center bg-[#fffbf0]">
    <span className="text-4xl mb-4">✨</span>
    <p className="text-lg text-stone-600 font-serif">感谢阅读</p>
    <p className="text-sm text-stone-400 mt-2">The End</p>
  </div>
);

// 空白页
const EmptyPageContent = () => (
  <div className="w-full h-full flex items-center justify-center bg-[#fffbf0] opacity-10">
    <span className="text-6xl">📖</span>
  </div>
);

// 获取当前页的字幕文本
const getSubtitleText = (page) => {
  if (!page) return '';
  // 优先使用 tts_text
  if (page.tts_text && page.tts_text.trim()) {
    return page.tts_text;
  }
  // 其次从 voice_script 拼接
  if (page.voice_script && Array.isArray(page.voice_script) && page.voice_script.length > 0) {
    return page.voice_script
      .map(v => v.role === '旁白' ? v.text : `${v.role}：${v.text}`)
      .join(' ');
  }
  // 兼容旧数据
  if (page.dialogues && Array.isArray(page.dialogues) && page.dialogues.length > 0) {
    return page.dialogues
      .map(d => d.role === '旁白' ? d.text : `${d.role}：${d.text}`)
      .join(' ');
  }
  return page.narration || page.text || page.display_text || '';
};

const Flipbook = () => {
  const { state } = useProject();
  const { project } = state;
  const { pages, title, settings } = project;

  const [currentPage, setCurrentPage] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);
  const [bookDimensions, setBookDimensions] = useState({ width: 800, height: 450 });

  // 有效页面（有图片的）- 使用 useMemo 缓存，防止每次渲染都生成新数组
  const validPages = useMemo(() => {
    return pages.filter(p => p.image_url);
  }, [pages]);
  const totalPages = validPages.length;

  // 获取图片比例
  const aspectRatio = (() => {
    const ratioMap = {
      '16:9': 16 / 9,
      '4:3': 4 / 3,
      '1:1': 1,
      '3:4': 3 / 4,
      '9:16': 9 / 16
    };
    return ratioMap[settings?.aspectRatio] || 16 / 9;
  })();

  // 根据窗口大小和图片比例计算书本尺寸
  useEffect(() => {
    const calculateDimensions = () => {
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      // 可用空间（留出顶部和底部控制栏的空间，使用更大的可用区域）
      const availableWidth = windowWidth * 0.90;
      const availableHeight = windowHeight * 0.75;

      // 单页尺寸：根据图片比例计算
      // 单页宽度 = 单页高度 * 图片比例
      let pageHeight = availableHeight;
      let pageWidth = pageHeight * aspectRatio;

      // 如果总宽度超出可用宽度，则按宽度重新计算
      if (pageWidth * 2 > availableWidth) {
        pageWidth = availableWidth / 2;
        pageHeight = pageWidth / aspectRatio;
      }

      // 确保最小尺寸
      const minWidth = 300;
      const minHeight = 200;
      if (pageWidth < minWidth) {
        pageWidth = minWidth;
        pageHeight = pageWidth / aspectRatio;
      }
      if (pageHeight < minHeight) {
        pageHeight = minHeight;
        pageWidth = pageHeight * aspectRatio;
      }

      setBookDimensions({
        width: Math.floor(pageWidth * 2),
        height: Math.floor(pageHeight)
      });
    };

    calculateDimensions();
    window.addEventListener('resize', calculateDimensions);
    return () => window.removeEventListener('resize', calculateDimensions);
  }, [aspectRatio]);

  /**
   * 构建书页结构 - 核心逻辑
   *
   * 书本结构说明：
   * - 每张"纸"有正面(front)和背面(back)
   * - 正面：翻页前显示在右侧
   * - 背面：翻页后显示在左侧（经过180度旋转）
   *
   * 目标效果：
   * - 翻开封面后：左边=第1页文字，右边=第1页图片
   * - 翻过第1页后：左边=第2页文字，右边=第2页图片
   *
   * 实现方式：
   * - 封面：front=封面（如果有封面图片则显示），back=第1页文字
   * - 第i页：front=第i页图片，back=第i+1页文字（或结束页）
   * - 封底：front=封底，back=空白
   */
  const bookPages = [];

  // 分离封面页和内容页
  const coverPage = validPages.find(p => p.is_cover);
  const contentPages = validPages.filter(p => !p.is_cover);

  // 封面页
  // front: 封面（如果有封面图片则显示图片，否则显示默认封面）
  // back: 第1页的文字（翻开后在左侧显示）
  bookPages.push({
    type: 'cover',
    front: coverPage && coverPage.image_url
      ? { type: 'image', page: coverPage, pageNumber: 0, isCover: true }
      : { type: 'cover' },
    back: contentPages.length > 0
      ? { type: 'text', page: contentPages[0], pageNumber: 1 }
      : { type: 'empty' }
  });

  // 内容页
  for (let i = 0; i < contentPages.length; i++) {
    const currentValidPage = contentPages[i];
    const nextValidPage = contentPages[i + 1];
    const isLast = i === contentPages.length - 1;

    // 第i张内容纸：
    // front: 第i页图片（右侧显示，与左侧的第i页文字配对）
    // back: 第i+1页文字（翻过去后在左侧显示，与下一页图片配对）
    bookPages.push({
      type: 'content',
      front: {
        type: 'image',
        page: currentValidPage,
        pageNumber: i + 1
      },
      back: isLast
        ? { type: 'end-text' }  // 最后一页，背面是结束文字
        : { type: 'text', page: nextValidPage, pageNumber: i + 2 }
    });
  }

  // 封底页
  bookPages.push({
    type: 'end',
    front: { type: 'end' },
    back: { type: 'empty' }
  });

  const totalBookPages = bookPages.length;

  // 获取当前页的字幕
  const getCurrentSubtitle = useCallback(() => {
    // currentPage 表示已翻过的页数
    // currentPage = 1 时，显示第1页的字幕
    const pageIndex = currentPage - 1;
    if (pageIndex >= 0 && pageIndex < contentPages.length) {
      return getSubtitleText(contentPages[pageIndex]);
    }
    return '';
  }, [currentPage, contentPages]);

  // 获取当前页的音频URL
  const getCurrentAudioUrl = useCallback(() => {
    // currentPage 表示已翻过的页数
    // currentPage = 1 时，显示第1页（封面翻过，显示第1页图文）
    const pageIndex = currentPage - 1;
    if (pageIndex >= 0 && pageIndex < contentPages.length) {
      return contentPages[pageIndex]?.audio_url;
    }
    return null;
  }, [currentPage, contentPages]);

  // 翻页时自动播放音频
  // 核心逻辑：
  // 1. 翻到新页面 → 自动获取该页音频 → 自动播放
  // 2. 用户操作（翻页、点击播放按钮）优先级最高
  useEffect(() => {
    // 如果是封面（currentPage=0）或封底（currentPage>总页数），停止播放
    if (currentPage === 0 || currentPage > validPages.length) {
      if (audioRef.current) {
        audioRef.current.pause();
        // 只有当真的在播放时才改变状态，避免不必要的渲染
        if (!audioRef.current.paused) {
          setIsPlaying(false);
        }
      }
      return;
    }

    const audioUrl = getCurrentAudioUrl();
    console.log(`📖 [Flipbook] 翻到第 ${currentPage} 页, 音频URL:`, audioUrl);

    if (!audioRef.current) return;

    // 如果没有音频 URL，停止播放
    if (!audioUrl) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    // 【关键修复】：严格比较当前 src 和 目标 url
    // 浏览器中的 src 属性通常是绝对路径（http://...），而数据中的可能是相对路径
    // 我们创建一个临时的 URL 对象来对比绝对路径，确保准确性
    const currentSrc = audioRef.current.src;
    const targetSrc = new URL(audioUrl, window.location.href).href;

    if (currentSrc === targetSrc) {
      // URL 没变，说明是同一页的音频，不做任何操作（保留当前的播放/暂停状态）
      // 这样点击"暂停"导致重渲染时，代码会在这里直接 return，不会执行下面的 .play()
      console.log('🔊 [Flipbook] 音频URL未改变，保持当前状态');
      return;
    }

    // --- 只有 URL 确实改变了（翻页了），才执行加载和自动播放 ---

    // 停止当前播放
    audioRef.current.pause();
    audioRef.current.currentTime = 0;

    // 设置新的音频源
    audioRef.current.src = audioUrl;

    // 确保音量正常
    if (audioRef.current.volume === 0 || audioRef.current.volume !== 1.0) {
      audioRef.current.volume = 1.0;
      console.log('🔊 [Flipbook] 设置音量为 1.0');
    }

    // 确保不是静音状态
    if (audioRef.current.muted) {
      audioRef.current.muted = false;
      console.log('🔊 [Flipbook] 取消静音');
    }

    console.log('🔊 [Flipbook] 音频元素状态:', {
      src: audioRef.current.src,
      volume: audioRef.current.volume,
      muted: audioRef.current.muted,
      readyState: audioRef.current.readyState
    });

    // 监听loadeddata事件，等音频数据加载完成后再播放
    // 使用 { once: true } 自动移除监听器，更简洁
    const handleLoadedData = () => {
      console.log('🔊 [Flipbook] 音频数据已加载，readyState:', audioRef.current?.readyState);
      // 只有在加载新页面音频时，才自动播放
      if (audioRef.current) {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('✅ [Flipbook] 音频开始播放');
              setIsPlaying(true);
            })
            .catch(err => {
              console.error('❌ [Flipbook] 播放失败:', err.message, err);
              setIsPlaying(false);
            });
        }
      }
    };

    // 添加错误处理
    const handleError = (e) => {
      console.error('❌ [Flipbook] 音频加载错误:', {
        error: e,
        src: audioRef.current?.src,
        networkState: audioRef.current?.networkState,
        readyState: audioRef.current?.readyState
      });
      setIsPlaying(false);
    };

    audioRef.current.addEventListener('loadeddata', handleLoadedData, { once: true });
    audioRef.current.addEventListener('error', handleError, { once: true });

    // 开始加载音频
    try {
      audioRef.current.load();
      console.log('🔊 [Flipbook] 开始加载音频...');
    } catch (err) {
      console.error('❌ [Flipbook] 加载音频失败:', err);
      setIsPlaying(false);
    }
  }, [currentPage, getCurrentAudioUrl, validPages.length]);

  // 音频播放完毕的处理
  const handleAudioEnded = useCallback(() => {
    console.log('🔊 [Flipbook] 音频播放结束');
    setIsPlaying(false);
    // 不再自动翻页，用户需要手动翻页
  }, []);

  // 下载项目
  const handleDownload = async () => {
    try {
      const response = await fetch('/api/download-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id })
      });

      if (response.ok) {
        const projectName = project.story_name || project.title || '未命名绘本';
        const fileName = `${project.id}-${projectName}.zip`;

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        console.log(`✅ 下载绘本: ${fileName}`);
      } else {
        const error = await response.json();
        alert('下载失败: ' + (error.error || '未知错误'));
      }
    } catch (error) {
      console.error('下载绘本失败:', error);
      alert('下载失败: ' + error.message);
    }
  };

  // 翻页
  const nextPage = () => {
    if (currentPage < totalBookPages - 1) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const resetBook = () => {
    setCurrentPage(0);
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  // 切换音频播放/暂停
  const toggleAudio = useCallback(() => {
    if (!audioRef.current) {
      console.log('⚠️ [Flipbook] 音频元素不存在');
      return;
    }

    const audioUrl = getCurrentAudioUrl();
    if (!audioUrl) {
      console.log('⚠️ [Flipbook] 当前页没有音频');
      return;
    }

    // 直接检查 audio 元素的 paused 状态，而不是依赖 React 状态
    const isPaused = audioRef.current.paused;

    console.log('🔊 [Flipbook] 切换播放状态:', {
      currentState: isPaused ? '暂停' : '播放中',
      isPlayingState: isPlaying,
      actualPaused: audioRef.current.paused,
      src: audioRef.current.src
    });

    if (!isPaused) {
      // 当前正在播放 → 暂停
      audioRef.current.pause();
      setIsPlaying(false);
      console.log('⏸️  [Flipbook] 音频已暂停');
    } else {
      // 当前暂停 → 播放
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('▶️  [Flipbook] 音频继续播放');
            setIsPlaying(true);
          })
          .catch(err => {
            console.error('❌ [Flipbook] 播放失败:', err.message);
            setIsPlaying(false);
          });
      }
    }
  }, [getCurrentAudioUrl, isPlaying]);

  // 键盘导航
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') prevPage();
      if (e.key === 'ArrowRight') nextPage();
      if (e.key === ' ') {
        e.preventDefault();
        toggleAudio();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleAudio]);

  // 空状态
  if (validPages.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-stone-100">
        <span className="text-6xl mb-4">📖</span>
        <h2 className="text-xl font-bold text-stone-600 mb-2">绘本还未完成</h2>
        <p className="text-stone-500">请先完成所有分镜图的生成</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-between bg-gradient-to-b from-stone-100 to-stone-200 overflow-hidden p-2">
      {/* 隐藏的音频元素 */}
      <audio
        ref={audioRef}
        onEnded={handleAudioEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onError={(e) => console.error('音频错误:', e)}
      />

      {/* 顶部控制栏 */}
      <div className="w-full px-4 py-2 flex items-center justify-between z-10 flex-shrink-0">
        <h2 className="text-base font-bold text-stone-700 flex items-center gap-2">
          <span>📖</span>
          {title || '未命名绘本'}
        </h2>
        <div className="flex items-center gap-3">
          {/* 下载按钮 */}
          <button
            onClick={handleDownload}
            className="p-1.5 rounded-full bg-purple-500 text-white hover:bg-purple-600 transition-all shadow-sm"
            title="下载绘本"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>

          {/* 播放/暂停 互斥按钮 */}
          {!isPlaying ? (
            // 显示播放按钮
            <button
              onClick={() => {
                if (audioRef.current) {
                  audioRef.current.play()
                    .then(() => {
                      console.log('▶️  [Flipbook] 点击播放按钮，音频开始播放');
                      setIsPlaying(true);
                    })
                    .catch(e => {
                      console.error('❌ [Flipbook] 播放失败:', e.message);
                      setIsPlaying(false);
                    });
                }
              }}
              className="p-1.5 rounded-full bg-green-500 text-white hover:bg-green-600 transition-all shadow-sm"
              title="播放"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </button>
          ) : (
            // 显示暂停按钮
            <button
              onClick={() => {
                if (audioRef.current) {
                  audioRef.current.pause();
                  setIsPlaying(false);
                  console.log('⏸️  [Flipbook] 点击暂停按钮，音频已暂停');
                }
              }}
              className="p-1.5 rounded-full bg-amber-500 text-white hover:bg-amber-600 transition-all shadow-sm animate-pulse"
              title="暂停"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
              </svg>
            </button>
          )}

          <span className="text-xs text-stone-500 font-mono">
            {currentPage} / {totalBookPages - 1}
          </span>
        </div>
      </div>

      {/* 3D 书籍容器 */}
      <div
        className="relative flex-1 flex items-center justify-center w-full min-h-0"
        style={{ perspective: '2000px' }}
      >
        <div
          className="relative"
          style={{
            width: `${bookDimensions.width}px`,
            height: `${bookDimensions.height}px`,
            transformStyle: 'preserve-3d'
          }}
        >
          {bookPages.map((bookPage, index) => {
            const isFlipped = index < currentPage;
            const zIndex = isFlipped ? index : totalBookPages - index;

            return (
              <div
                key={index}
                onClick={() => isFlipped ? prevPage() : nextPage()}
                className="absolute top-0 left-0 w-full h-full cursor-pointer"
                style={{
                  transformStyle: 'preserve-3d',
                  transformOrigin: 'left center',
                  transform: isFlipped ? 'rotateY(-180deg)' : 'rotateY(0deg)',
                  transition: 'transform 1s cubic-bezier(0.645, 0.045, 0.355, 1)',
                  zIndex: zIndex,
                }}
              >
                {/* 正面 (翻页前在右侧显示) */}
                <div
                  className="absolute inset-0 w-full h-full rounded-r-lg overflow-hidden"
                  style={{
                    backfaceVisibility: 'hidden',
                    background: '#fffbf0',
                    boxShadow: isFlipped ? 'none' : '2px 4px 20px rgba(0,0,0,0.15)'
                  }}
                >
                  {bookPage.front.type === 'cover' && <CoverContent title={title} />}
                  {bookPage.front.type === 'image' && (
                    <ImagePageContent
                      page={bookPage.front.page}
                      pageNumber={bookPage.front.pageNumber}
                    />
                  )}
                  {bookPage.front.type === 'end' && <BackCoverContent />}
                </div>

                {/* 背面 (翻页后在左侧显示) */}
                <div
                  className="absolute inset-0 w-full h-full rounded-l-lg overflow-hidden"
                  style={{
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                    background: '#fffbf0',
                    boxShadow: '-2px 4px 20px rgba(0,0,0,0.15)'
                  }}
                >
                  {bookPage.back.type === 'text' && (
                    <TextPageContent
                      page={bookPage.back.page}
                      pageNumber={bookPage.back.pageNumber}
                      totalPages={totalPages}
                    />
                  )}
                  {bookPage.back.type === 'end-text' && <EndTextContent />}
                  {bookPage.back.type === 'empty' && <EmptyPageContent />}
                </div>
              </div>
            );
          })}

          {/* 封底背板 */}
          <div
            className="absolute top-0 left-0 w-full h-full bg-stone-800 rounded-lg shadow-2xl"
            style={{ zIndex: -1, transform: 'translateZ(-3px)' }}
          />
        </div>
      </div>

      {/* 底部导航 */}
      <div className="w-full px-4 py-2 flex items-center justify-center gap-6 z-10 flex-shrink-0">
        <button
          onClick={prevPage}
          disabled={currentPage === 0}
          className={`p-2 rounded-full transition-all shadow-md active:scale-95 ${
            currentPage === 0
              ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
              : 'bg-white text-amber-600 hover:bg-amber-50 hover:shadow-lg'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* 进度指示器 */}
        <div className="flex gap-1.5">
          {bookPages.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i === currentPage ? 'w-6 bg-amber-500' :
                i < currentPage ? 'w-1.5 bg-amber-300' : 'w-1.5 bg-stone-300'
              }`}
            />
          ))}
        </div>

        <button
          onClick={currentPage === totalBookPages - 1 ? resetBook : nextPage}
          className={`p-2 rounded-full transition-all shadow-md active:scale-95 ${
            currentPage === totalBookPages - 1
              ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-amber-200'
              : 'bg-white text-amber-600 hover:bg-amber-50 hover:shadow-lg'
          }`}
        >
          {currentPage === totalBookPages - 1 ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
        </button>
      </div>

      {/* 字幕显示框 */}
      {getCurrentSubtitle() && (
        <div className="w-full max-w-3xl mx-auto px-4 py-2 flex-shrink-0">
          <div
            className="relative bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50
                       rounded-2xl px-6 py-4 shadow-lg border-2 border-amber-200
                       transform transition-all duration-500 ease-out"
            style={{
              boxShadow: '0 4px 20px rgba(251, 191, 36, 0.2), inset 0 1px 0 rgba(255,255,255,0.8)'
            }}
          >
            {/* 装饰性引号 */}
            <span className="absolute -top-2 -left-1 text-4xl text-amber-300 opacity-60 select-none">"</span>
            <span className="absolute -bottom-4 -right-1 text-4xl text-amber-300 opacity-60 select-none">"</span>

            {/* 字幕文字 */}
            <p
              className="text-center text-stone-700 leading-relaxed relative z-10"
              style={{
                fontFamily: "'Comic Neue', 'Nunito', 'PingFang SC', sans-serif",
                fontSize: '1.1rem',
                fontWeight: '600',
                letterSpacing: '0.02em'
              }}
            >
              {getCurrentSubtitle()}
            </p>

            {/* 页码指示 */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2
                            bg-amber-400 text-white text-xs font-bold
                            px-3 py-1 rounded-full shadow-md">
              📖 第 {currentPage} 页
            </div>
          </div>
        </div>
      )}

      {/* 键盘提示 */}
      <p className="text-center text-xs text-stone-400 pb-1">
        ⌨️ ← → 翻页 | 空格 播放/暂停
      </p>
    </div>
  );
};

export default Flipbook;
