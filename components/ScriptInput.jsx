import { useState } from 'react';

/**
 * 剧本输入组件 - 儿童绘本风格
 * 功能: 大文本框、格式验证、实时字数统计
 */
const ScriptInput = ({ value, onChange, onValidate }) => {
  const [wordCount, setWordCount] = useState(0);
  const [isValid, setIsValid] = useState(true);
  const [validationMessage, setValidationMessage] = useState('');

  const handleChange = (e) => {
    const newValue = e.target.value;
    const words = newValue.trim().split(/\s+/).filter(word => word.length > 0);
    setWordCount(words.length);

    // 简化的格式验证 - 只检查最基本的内容
    const minLength = newValue.length > 20;
    const hasContent = newValue.trim().length > 0;

    let valid = true;
    let message = '';

    if (!hasContent) {
      valid = false;
      message = '请输入故事内容';
    } else if (!minLength) {
      valid = false;
      message = '故事内容过短，建议至少20个字符';
    } else {
      valid = true;
      message = '故事内容已准备好，可以开始创作绘本啦！';
    }

    setIsValid(valid);
    setValidationMessage(message);

    onChange(newValue);
    if (onValidate) {
      onValidate(valid, message);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* 标题栏 - 儿童绘本风格 */}
      <div className="storybook-card-header">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📝</span>
          <h2 className="text-lg font-bold text-orange-600" style={{ fontFamily: "'Fredoka', sans-serif" }}>
            故事创作
          </h2>
        </div>
        <div className="flex justify-between items-center mt-3">
          <div className="flex items-center gap-4">
            <span className="text-sm text-orange-500 font-medium" style={{ fontFamily: "'Nunito', sans-serif" }}>
              📊 字数: <span className="text-blue-500 font-bold">{wordCount}</span>
            </span>
            <div className={`status-dot ${isValid ? 'status-dot-success' : 'status-dot-warning'}`}></div>
          </div>
          <div
            className={`text-sm font-medium ${isValid ? 'text-green-500' : 'text-amber-500'}`}
            style={{ fontFamily: "'Nunito', sans-serif" }}
          >
            {isValid ? '✅' : '⚠️'} {validationMessage}
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="storybook-card-body flex-1 flex flex-col">
        <textarea
          className={`storybook-textarea flex-1 min-h-[500px] storybook-scrollbar ${!isValid ? 'border-amber-400' : ''}`}
          value={value}
          onChange={handleChange}
          placeholder={`✨ 在这里写下你的故事，AI会帮你把它变成美丽的绘本！

🎨 支持多种写法：
• 童话故事格式
• 小说段落
• 角色对话
• 场景描述

📖 示例1（对话型）：
小兔子：我想去森林里探险！
小熊：好呀，我们一起去吧！

📖 示例2（叙述型）：
在一个阳光明媚的早晨，小兔子蹦蹦跳跳地来到了小熊家门口。"我们去森林里玩吧！"小兔子开心地说。

🌟 AI会自动识别角色、对话、动作和场景，为你创作精美的绘本插图！`}
        />

        {/* 使用说明 - 可爱风格 */}
        <div className="mt-4 p-4 bg-blue-50 rounded-2xl border-2 border-blue-200">
          <p className="mb-3 text-blue-600 font-bold flex items-center gap-2" style={{ fontFamily: "'Fredoka', sans-serif" }}>
            <span className="text-xl">💡</span> 创作小贴士：
          </p>
          <ul className="space-y-2 text-sm text-gray-600" style={{ fontFamily: "'Nunito', sans-serif" }}>
            <li className="flex items-start gap-2">
              <span className="text-green-500 font-bold">🌿</span>
              AI可以理解各种写法，不用担心格式问题
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 font-bold">🐰</span>
              写上角色名字，让故事更生动
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-500 font-bold">✨</span>
              描述角色的表情和动作，画面会更精彩
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-500 font-bold">🌈</span>
              故事越详细，绘本插图越漂亮
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ScriptInput;
