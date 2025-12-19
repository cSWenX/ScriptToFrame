import { useState } from 'react';

/**
 * 剧本输入组件 - 未来科技风格
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
      message = '请输入剧本内容';
    } else if (!minLength) {
      valid = false;
      message = '剧本内容过短，建议至少20个字符';
    } else {
      valid = true;
      message = '剧本内容已输入，可以进行AI分析';
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
      <div className="cyber-card-header">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
          <h2 className="text-lg font-semibold text-cyan-300 neon-text">剧本输入</h2>
        </div>
        <div className="flex justify-between items-center mt-3">
          <div className="flex items-center gap-4">
            <span className="text-sm text-cyan-400/80 font-['Rajdhani']">
              字数: <span className="text-cyan-300 font-bold">{wordCount}</span>
            </span>
            <div className={`status-indicator ${isValid ? 'status-success' : 'status-warning'}`}></div>
          </div>
          <div className={`text-sm font-['Rajdhani'] ${isValid ? 'text-green-400' : 'text-yellow-400'}`}>
            {isValid ? '✓' : '⚠'} {validationMessage}
          </div>
        </div>
      </div>

      <div className="cyber-card-body flex-1 flex flex-col">
        <textarea
          className={`cyber-textarea flex-1 min-h-[500px] cyber-scrollbar ${!isValid ? 'border-yellow-500/50' : ''}`}
          value={value}
          onChange={handleChange}
          placeholder={`请输入漫剧剧本内容，AI会智能解析剧本并生成分镜图。

支持多种格式：
• 标准剧本格式
• 小说段落
• 对话形式
• 场景描述

示例1（对话型）：
小明：我有话要对你说...
小红：什么事？

示例2（叙述型）：
在咖啡厅里，小明紧张地看着小红。他深呼吸后说："我喜欢你很久了！"小红脸红，低声回答："我也是..."

AI会自动识别角色、对话、动作和场景信息。`}
        />

        <div className="mt-4 text-xs text-cyan-400/70 font-['Rajdhani']">
          <p className="mb-2 text-cyan-300 font-semibold">
            <span className="text-cyan-400">►</span> 使用说明：
          </p>
          <ul className="list-none space-y-1 ml-4">
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">●</span>
              AI可识别多种剧本格式，无需严格按照特定格式
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-0.5">●</span>
              建议包含角色名称、对话内容、场景描述
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-400 mt-0.5">●</span>
              动作和表情描述有助于生成更准确的分镜图
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-400 mt-0.5">●</span>
              内容越详细，生成的分镜图效果越好
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ScriptInput;