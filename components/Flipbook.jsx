import { useState, useEffect, useRef, useCallback } from 'react';
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
    <div className="w-full h-full relative bg-stone-50">
      <img
        src={page.image_url}
        alt={`第${pageNumber}页`}
        className="w-full h-full object-cover"
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

const Flipbook = () => {
  const { state } = useProject();
  const { project } = state;
  const { pages, title, settings } = project;

  const [currentPage, setCurrentPage] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef(null);
  const [bookDimensions, setBookDimensions] = useState({ width: 800, height: 450 });

  // 有效页面（有图片的）
  const validPages = pages.filter(p => p.image_url);
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

      // 可用空间（留出顶部和底部控制栏的空间）
      const availableWidth = windowWidth * 0.85;
      const availableHeight = windowHeight * 0.60;

      // 单页尺寸：根据图片比例计算
      // 单页宽度 = 单页高度 * 图片比例
      let pageHeight = availableHeight;
      let pageWidth = pageHeight * aspectRatio;

      // 如果总宽度超出可用宽度，则按宽度重新计算
      if (pageWidth * 2 > availableWidth) {
        pageWidth = availableWidth / 2;
        pageHeight = pageWidth / aspectRatio;
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
   * - 封面：front=封面，back=第1页文字
   * - 第i页：front=第i页图片，back=第i+1页文字（或结束页）
   * - 封底：front=封底，back=空白
   */
  const bookPages = [];

  // 封面页
  // front: 封面（右侧显示）
  // back: 第1页的文字（翻开后在左侧显示）
  bookPages.push({
    type: 'cover',
    front: { type: 'cover' },
    back: validPages.length > 0
      ? { type: 'text', page: validPages[0], pageNumber: 1 }
      : { type: 'empty' }
  });

  // 内容页
  for (let i = 0; i < validPages.length; i++) {
    const currentValidPage = validPages[i];
    const nextValidPage = validPages[i + 1];
    const isLast = i === validPages.length - 1;

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

  // 获取当前页的音频URL
  const getCurrentAudioUrl = useCallback(() => {
    // currentPage 表示已翻过的页数
    // currentPage = 1 时，显示第1页（封面翻过，显示第1页图文）
    const pageIndex = currentPage - 1;
    if (pageIndex >= 0 && pageIndex < validPages.length) {
      return validPages[pageIndex]?.audio_url;
    }
    return null;
  }, [currentPage, validPages]);

  // 翻页时自动播放音频
  useEffect(() => {
    if (currentPage === 0 || currentPage >= totalBookPages - 1) {
      // 封面或封底，停止播放
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
      return;
    }

    const audioUrl = getCurrentAudioUrl();
    console.log(`📖 [Flipbook] 翻到第 ${currentPage} 页, 音频URL:`, audioUrl);

    if (audioUrl && audioRef.current && !isMuted) {
      audioRef.current.src = audioUrl;
      audioRef.current.load();

      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('🔊 [Flipbook] 音频开始播放');
            setIsPlaying(true);
          })
          .catch(err => {
            console.log('⚠️ [Flipbook] 自动播放被阻止:', err.message);
            setIsPlaying(false);
          });
      }
    } else {
      setIsPlaying(false);
    }
  }, [currentPage, isMuted, getCurrentAudioUrl, totalBookPages]);

  // 音频结束处理
  const handleAudioEnded = useCallback(() => {
    console.log('🔊 [Flipbook] 音频播放结束, autoPlay:', autoPlay);
    setIsPlaying(false);

    if (autoPlay && currentPage < totalBookPages - 1) {
      console.log('📖 [Flipbook] 自动翻页到下一页');
      setTimeout(() => {
        setCurrentPage(prev => prev + 1);
      }, 800);
    }
  }, [autoPlay, currentPage, totalBookPages]);

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
    if (!audioRef.current) return;

    const audioUrl = getCurrentAudioUrl();
    if (!audioUrl) {
      console.log('⚠️ [Flipbook] 当前页没有音频');
      return;
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      if (audioRef.current.src !== audioUrl) {
        audioRef.current.src = audioUrl;
        audioRef.current.load();
      }
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(err => console.error('播放失败:', err));
    }
  }, [isPlaying, getCurrentAudioUrl]);

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
    <div className="h-full flex flex-col items-center justify-center bg-gradient-to-b from-stone-100 to-stone-200 overflow-hidden">
      {/* 隐藏的音频元素 */}
      <audio
        ref={audioRef}
        onEnded={handleAudioEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onError={(e) => console.error('音频错误:', e)}
      />

      {/* 顶部控制栏 */}
      <div className="w-full px-6 py-3 flex items-center justify-between z-10">
        <h2 className="text-lg font-bold text-stone-700 flex items-center gap-2">
          <span>📖</span>
          {title || '未命名绘本'}
        </h2>
        <div className="flex items-center gap-4">
          {/* 自动播放开关 */}
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-xs text-stone-500">自动播放</span>
            <div
              className={`w-10 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${
                autoPlay ? 'bg-amber-500' : 'bg-stone-300'
              }`}
              onClick={() => setAutoPlay(!autoPlay)}
            >
              <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${
                autoPlay ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </div>
          </label>

          {/* 播放/暂停按钮 */}
          <button
            onClick={toggleAudio}
            className={`p-2 rounded-full transition-all ${
              isPlaying
                ? 'bg-amber-500 text-white animate-pulse'
                : 'bg-amber-100 text-amber-600 hover:bg-amber-200'
            }`}
            title={isPlaying ? '暂停' : '播放'}
          >
            {isPlaying ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            )}
          </button>

          {/* 静音开关 */}
          <button
            onClick={() => {
              setIsMuted(!isMuted);
              if (!isMuted && audioRef.current) {
                audioRef.current.pause();
                setIsPlaying(false);
              }
            }}
            className={`p-2 rounded-full transition-colors ${
              isMuted ? 'bg-stone-300 text-stone-500' : 'bg-amber-100 text-amber-600'
            }`}
            title={isMuted ? '取消静音' : '静音'}
          >
            {isMuted ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            )}
          </button>

          <span className="text-sm text-stone-500">
            {currentPage} / {totalBookPages - 1}
          </span>
        </div>
      </div>

      {/* 3D 书籍容器 */}
      <div
        className="relative flex-1 flex items-center justify-center"
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
      <div className="w-full px-6 py-4 flex items-center justify-center gap-8 z-10">
        <button
          onClick={prevPage}
          disabled={currentPage === 0}
          className={`p-3 rounded-full transition-all shadow-md active:scale-95 ${
            currentPage === 0
              ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
              : 'bg-white text-amber-600 hover:bg-amber-50 hover:shadow-lg'
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* 进度指示器 */}
        <div className="flex gap-2">
          {bookPages.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-500 ${
                i === currentPage ? 'w-8 bg-amber-500' :
                i < currentPage ? 'w-2 bg-amber-300' : 'w-2 bg-stone-300'
              }`}
            />
          ))}
        </div>

        <button
          onClick={currentPage === totalBookPages - 1 ? resetBook : nextPage}
          className={`p-3 rounded-full transition-all shadow-md active:scale-95 ${
            currentPage === totalBookPages - 1
              ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-amber-200'
              : 'bg-white text-amber-600 hover:bg-amber-50 hover:shadow-lg'
          }`}
        >
          {currentPage === totalBookPages - 1 ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
        </button>
      </div>

      {/* 键盘提示 */}
      <p className="text-center text-xs text-stone-500 pb-3">
        ⌨️ ← → 翻页 | 空格 播放/暂停 | 点击书页翻页
      </p>
    </div>
  );
};

export default Flipbook;
