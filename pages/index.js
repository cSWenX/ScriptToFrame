/**
 * Toby AI 绘本创作平台 - 首页
 */

import Head from 'next/head';
import NavigationDock from '../components/NavigationDock';
import { useRouter } from 'next/router';
import { ProjectProvider } from '../contexts/ProjectContext';

// 首页内容组件
function HomePageContent() {
  const router = useRouter();

  const features = [
    {
      icon: '📝',
      title: '智能创作',
      description: '输入故事文本，AI智能分析并自动规划分镜，让创作变得简单'
    },
    {
      icon: '🎨',
      title: '精美插画',
      description: '多种画风选择，AI生成高质量绘本插图，打造独特的视觉风格'
    },
    {
      icon: '🎙️',
      title: '专业配音',
      description: '支持多种音色和情感调节，为每页生成生动的语音旁白'
    },
    {
      icon: '📖',
      title: '互动翻页',
      description: '3D翻书效果，图文音三位一体，带来沉浸式阅读体验'
    },
    {
      icon: '☁️',
      title: '云端同步',
      description: '作品保存到云端，随时随地访问，支持一键分享'
    }
  ];

  return (
    <>
      <Head>
        <title>Toby - AI绘本创作平台</title>
        <meta name="description" content="让美好，被看见。AI驱动的绘本创作平台，让每个人都能创作属于自己的精美绘本。" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="h-screen flex overflow-hidden">
        {/* 左侧导航栏 */}
        <NavigationDock />

        {/* 主内容区 - 可滚动 */}
        <div className="flex-1 overflow-y-auto bg-gradient-to-br from-orange-50 via-white to-yellow-50">
          {/* 英雄区域 - 占满整屏 */}
          <div className="min-h-screen flex items-center justify-center px-8 pt-8">
            <div className="text-center max-w-4xl">
              {/* 平台名称 */}
              <h1 className="text-6xl md:text-7xl font-black mb-6 bg-gradient-to-r from-orange-500 via-pink-500 to-yellow-500 bg-clip-text text-transparent animate-fade-in" style={{ fontFamily: "'Fredoka', sans-serif" }}>
                Toby. AI 绘本创作平台
              </h1>

              {/* 口号 */}
              <p className="text-2xl md:text-3xl font-medium text-gray-700 mb-12 animate-slide-up" style={{ fontFamily: "'Nunito', sans-serif" }}>
                让美好，被看见
              </p>

              {/* CTA按钮 */}
              <button
                onClick={() => router.push('/ide')}
                className="px-8 py-4 bg-gradient-to-r from-orange-500 to-pink-500 text-white text-xl font-bold rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
              >
                🚀 开始创作
              </button>
            </div>
          </div>

          {/* 功能介绍区域 - 向下滚动才可见 */}
          <div className="px-8 pb-12">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-3xl font-bold text-center text-gray-800 mb-12" style={{ fontFamily: "'Fredoka', sans-serif" }}>
                ✨ 强大的创作功能
              </h2>

              {/* 功能卡片网格 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {features.map((feature, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-2 border-orange-200"
                  >
                    <div className="text-5xl mb-4">{feature.icon}</div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2" style={{ fontFamily: "'Fredoka', sans-serif" }}>
                      {feature.title}
                    </h3>
                    <p className="text-gray-600">
                      {feature.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 底部信息 */}
          <div className="px-8 pb-6 text-center text-gray-500 text-sm" style={{ fontFamily: "'Nunito', sans-serif" }}>
            <p>© 2025 Toby AI. All rights reserved.</p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 1s ease-out;
        }

        .animate-slide-up {
          animation: slide-up 0.8s ease-out 0.3s both;
        }
      `}</style>
    </>
  );
}

// 禁用静态生成，使用动态渲染
export const getServerSideProps = () => {
  return {
    props: {},
  };
};

// 导出的页面组件，包裹ProjectProvider
export default function HomePage() {
  return (
    <ProjectProvider>
      <HomePageContent />
    </ProjectProvider>
  );
}
