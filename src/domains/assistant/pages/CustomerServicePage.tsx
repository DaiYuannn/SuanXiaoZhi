import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './styles.module.css';
import ComplianceNotice from '../../../shared/components/ComplianceNotice';
import { aiChat, recognizeIntent } from '../api/assistant-api';
import { auditError, auditApi } from '../../../shared/audit/audit-service';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import robotIcon from '../../../../robot.png';

interface ChatMessage {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

const CustomerServicePage: React.FC = () => {
  const navigate = useNavigate();
  const [chatInputValue, setChatInputValue] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const chatMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const originalTitle = document.title;
    document.title = '算小智 - 智能客服';
    return () => { 
      document.title = originalTitle; 
    };
  }, []);

  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [chatMessages, isTyping]);

  // 添加事件监听器来处理聊天链接点击
  useEffect(() => {
    const handleChatLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target && target.classList.contains('chat-link')) {
        e.preventDefault();
        const action = (target as any).dataset.action as string | undefined;
        const targetPath = (target as any).dataset.target as string | undefined;
        if (action === 'navigate' && targetPath) {
          navigate(targetPath);
        } else if (action === 'risk-assessment') {
          console.log('打开风险测评弹窗');
        }
      }
    };
    document.addEventListener('click', handleChatLinkClick);
    return () => {
      document.removeEventListener('click', handleChatLinkClick);
    };
  }, [navigate]);

  const handleChatInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= 500) {
      setChatInputValue(value);
      setCharCount(value.length);
      
      // 自动调整高度
      const textarea = e.target;
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  };

  const generateAIResponse = (userMessage: string): string => {
    if (userMessage.includes('添加交易') || userMessage.includes('记账')) {
      return `
        <p class="text-sm text-gray-800 mb-3">添加交易很简单，您可以：</p>
        <ul class="text-sm text-gray-800 space-y-1 mb-3">
          <li>• 点击首页的"添加交易"按钮</li>
          <li>• 或者在智能记账页面点击"添加新交易"</li>
          <li>• 支持手动录入或导入银行流水</li>
        </ul>
        <p class="text-sm text-gray-800">需要我为您<a href="#" class="chat-link text-blue-600 underline" data-action="navigate" data-target="/accounting">跳转到智能记账页面</a>吗？</p>
      `;
    } else if (userMessage.includes('财务规划') || userMessage.includes('规划')) {
      return `
        <p class="text-sm text-gray-800 mb-3">财务规划是根据您的财务状况和目标制定的个性化方案，包括：</p>
        <ul class="text-sm text-gray-800 space-y-1 mb-3">
          <li>• 预算管理和储蓄计划</li>
          <li>• 债务优化和信用管理</li>
          <li>• 投资策略和风险控制</li>
        </ul>
        <p class="text-sm text-gray-800">您可以<a href="#" class="chat-link text-blue-600 underline" data-action="navigate" data-target="/financial-planning">查看您的财务规划</a>或创建新的规划方案。</p>
      `;
    } else if (userMessage.includes('理财产品') || userMessage.includes('理财') || userMessage.includes('投资')) {
      return `
        <p class="text-sm text-gray-800 mb-3">选择理财产品需要考虑您的风险承受能力和投资目标。建议您：</p>
        <ul class="text-sm text-gray-800 space-y-1 mb-3">
          <li>• 先完成<a href="#" class="chat-link text-blue-600 underline" data-action="risk-assessment">风险测评</a>了解自己的风险偏好</li>
          <li>• 查看我们为您推荐的<a href="#" class="chat-link text-blue-600 underline" data-action="navigate" data-target="/financial-products">理财产品</a></li>
          <li>• 关注产品的风险等级和预期收益</li>
        </ul>
        <p class="text-sm text-gray-800">需要我为您推荐合适的理财产品吗？</p>
      `;
    } else if (userMessage.includes('消费分析') || userMessage.includes('分析')) {
      return `
        <p class="text-sm text-gray-800 mb-3">消费分析可以帮助您：</p>
        <ul class="text-sm text-gray-800 space-y-1 mb-3">
          <li>• 了解消费趋势和习惯</li>
          <li>• 发现消费优化空间</li>
          <li>• 制定更合理的预算计划</li>
        </ul>
        <p class="text-sm text-gray-800">您可以<a href="#" class="chat-link text-blue-600 underline" data-action="navigate" data-target="/consumption-analysis">查看详细的消费分析报告</a>。</p>
      `;
    } else if (userMessage.includes('账户') || userMessage.includes('银行')) {
      return `
        <p class="text-sm text-gray-800 mb-3">管理银行账户的方法：</p>
        <ul class="text-sm text-gray-800 space-y-1 mb-3">
          <li>• 在个人中心可以添加或解绑银行账户</li>
          <li>• 支持多家银行的储蓄卡和信用卡</li>
          <li>• 所有数据传输都经过加密保护</li>
        </ul>
        <p class="text-sm text-gray-800">需要我为您<a href="#" class="chat-link text-blue-600 underline" data-action="navigate" data-target="/user-settings">跳转到账户管理页面</a>吗？</p>
      `;
    } else {
      return `
        <p class="text-sm text-gray-800 mb-3">感谢您的咨询！我理解您的问题。</p>
        <p class="text-sm text-gray-800 mb-3">如果您有以下方面的问题，我可以为您提供更详细的解答：</p>
        <ul class="text-sm text-gray-800 space-y-1 mb-3">
          <li>• 智能记账和交易管理</li>
          <li>• 消费分析和财务报告</li>
          <li>• 个性化财务规划</li>
          <li>• 理财产品推荐和投资建议</li>
          <li>• 账户安全和隐私保护</li>
        </ul>
        <p class="text-sm text-gray-800">您可以具体说明您想了解的方面，我会为您提供专业的帮助。</p>
      `;
    }
  };

  const sendMessage = async (message: string) => {
    if (!message.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString() + '-user',
      type: 'user',
      content: message,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInputValue('');
    setCharCount(0);
    
    const textarea = document.querySelector('#chat-input') as HTMLTextAreaElement;
    if (textarea) {
      textarea.style.height = 'auto';
    }

    // 延迟显示输入指示器
    setTimeout(() => setIsTyping(true), 300);

    try {
      auditApi('ai_chat_start', { textLen: message.length });
      const ai = await aiChat([
        { role: 'system', content: '你是金融助理，请用小标题和要点列表回答，语言自然简洁。' },
        { role: 'user', content: message }
      ]);
      const md = (ai as any)?.data?.content || '';
      const htmlBody = DOMPurify.sanitize(marked.parse(md) as string);

      let cta = '';
      try {
        auditApi('intent_recognize_start', { textLen: message.length });
        const res = await recognizeIntent(message);
        const intents = res.data || [];
        auditApi('intent_recognize_success', { intentsCount: intents.length });
        const top = intents.sort((a,b) => b.score - a.score)[0];
        if (top) {
          const payload = (top.payload ?? {}) as { route?: string; name?: string };
          if (top.type === 'navigate' && payload.route) {
            cta = `<div class='mt-3 text-xs'><a href='#' class='chat-link text-blue-600 underline' data-action='navigate' data-target='${payload.route}'>前往相关页面：${payload.route}</a></div>`;
          } else if (top.type === 'incentive') {
            cta = `<div class='mt-3 text-xs'>激励触发：${payload.name || '行为奖励'} 已记录 🎯</div>`;
          }
        }
      } catch {}

      setIsTyping(false);
      setChatMessages(prev => [...prev, { id: Date.now().toString() + '-bot', type: 'bot', content: `${htmlBody}${cta}`, timestamp: new Date() }]);
    } catch (e: any) {
      auditError('ai_chat_fail', e);
      setIsTyping(false);
      // 降级本地规则
      setChatMessages(prev => [...prev, { id: Date.now().toString() + '-bot', type: 'bot', content: generateAIResponse(message), timestamp: new Date() }]);
    }
  };

  const handleSendClick = () => {
    sendMessage(chatInputValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(chatInputValue);
    }
  };

  const handleQuickQuestion = (question: string) => {
    sendMessage(question);
  };

  const handleFaqClick = (question: string) => {
    sendMessage(question);
  };

  return (
    <div className="p-4 md:p-6">
      {/* 页面头部 */}
      <div className="mb-4 md:mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-text-primary">智能客服</h2>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2.5 h-2.5 md:w-3 md:h-3 bg-green-500 rounded-full mr-1 md:mr-2"></div>
            <span className="text-xs md:text-sm text-green-600 font-medium">在线</span>
          </div>
        </div>
      </div>

      {/* 智能客服主容器 */}
      <div className={`${styles.solidCard} rounded-xl shadow-md overflow-hidden`}>
        {/* 对话区域 - 修复消息重叠问题 */}
        <div ref={chatMessagesRef} className={`${styles.chatContainer} space-y-4`}>
          {/* 欢迎消息 */}
          <div className="flex items-start space-x-2 md:space-x-3">
            <img src={robotIcon} alt="机器人" className="w-7 h-7 md:w-8 md:h-8 rounded-full object-cover border border-gray-200 flex-shrink-0" />
            <div className={`${styles.chatBubbleBot} p-3 md:p-4 shadow-sm`}>
              <p className="text-xs md:text-sm text-gray-800">您好！我是算小智智能客服，很高兴为您服务。我可以帮您解答记账、理财、规划等方面的问题。请问有什么可以帮助您的吗？</p>
            </div>
          </div>

          {/* 动态消息 */}
          {chatMessages.map((message) => (
            <div key={message.id} className={`flex items-start ${message.type === 'user' ? 'justify-end' : ''} space-x-2 md:space-x-3`}>
              {message.type === 'bot' && (
                <img src={robotIcon} alt="机器人" className="w-7 h-7 md:w-8 md:h-8 rounded-full object-cover border border-gray-200 flex-shrink-0" />
              )}
              <div className={`${message.type === 'user' ? styles.chatBubbleUser : styles.chatBubbleBot} p-3 md:p-4 shadow-sm`}>
                <div className="text-xs md:text-sm" dangerouslySetInnerHTML={{ __html: message.content }} />
              </div>
              {message.type === 'user' && (
                <img 
                  src="https://s.coze.cn/image/naBkmaCk7jI/" 
                  alt="用户头像" 
                  className="w-7 h-7 md:w-8 md:h-8 rounded-full flex-shrink-0" 
                />
              )}
            </div>
          ))}

          {/* 正在输入指示器 - 修复三个点问题 */}
          {isTyping && (
            <div className="flex items-start space-x-2 md:space-x-3">
              <img src={robotIcon} alt="机器人" className="w-7 h-7 md:w-8 md:h-8 rounded-full object-cover border border-gray-200 flex-shrink-0" />
              <div className={styles.typingBubble}>
                <div className={styles.typingDot}></div>
                <div className={styles.typingDot}></div>
                <div className={styles.typingDot}></div>
              </div>
            </div>
          )}
        </div>

        {/* 输入区域 */}
        <div className="border-t border-gray-200 p-4 md:p-6">
          <div className="flex items-end space-x-2 md:space-x-3">
            <div className="flex-1">
              <div className="relative">
                <textarea 
                  id="chat-input"
                  className={`${styles.chatInput} w-full px-3 md:px-4 py-2.5 md:py-3 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm`}
                  rows={1}
                  placeholder="请输入您的问题..."
                  maxLength={500}
                  value={chatInputValue}
                  onChange={handleChatInputChange}
                  onKeyDown={handleKeyDown}
                />
                <button 
                  onClick={handleSendClick}
                  className={`absolute right-2 bottom-2 w-7 h-7 md:w-8 md:h-8 ${styles.solidBg} rounded-lg flex items-center justify-center text-white hover:shadow-lg transition-all`}
                >
                  <i className="fas fa-paper-plane text-xs md:text-sm"></i>
                </button>
              </div>
              <div className="flex justify-between items-center mt-2">
                <div className="flex space-x-1 md:space-x-2 overflow-x-auto">
                  <button 
                    onClick={() => handleQuickQuestion('如何添加交易？')}
                    className={`${styles.quickQuestion} px-2 md:px-3 py-1 text-xs whitespace-nowrap`}
                  >
                    如何添加交易？
                  </button>
                  <button 
                    onClick={() => handleQuickQuestion('什么是财务规划？')}
                    className={`${styles.quickQuestion} px-2 md:px-3 py-1 text-xs whitespace-nowrap`}
                  >
                    什么是财务规划？
                  </button>
                  <button 
                    onClick={() => handleQuickQuestion('如何选择理财产品？')}
                    className={`${styles.quickQuestion} px-2 md:px-3 py-1 text-xs whitespace-nowrap`}
                  >
                    如何选择理财产品？
                  </button>
                </div>
                <span className="text-xs text-gray-500 flex-shrink-0 ml-2">{charCount}/500</span>
              </div>
            </div>
          </div>
          <div className="mt-3"><ComplianceNotice variant="ai" /></div>
        </div>
      </div>

      {/* 常见问题/热门话题区 */}
      <div className="mt-4 md:mt-6">
        <div className={`${styles.solidCard} rounded-xl p-4 md:p-6 shadow-md`}>
          <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">常见问题</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            <div 
              onClick={() => handleFaqClick('如何添加银行账户？')}
              className="p-3 md:p-4 bg-gray-50 rounded-lg hover:bg-blue-500 hover:text-white transition-all cursor-pointer"
            >
              <h4 className="font-medium text-sm mb-1">如何添加银行账户？</h4>
              <p className="text-xs text-gray-500 hover:text-white/80">了解如何安全地添加和管理您的银行账户</p>
            </div>
            <div 
              onClick={() => handleFaqClick('智能记账的工作原理？')}
              className="p-3 md:p-4 bg-gray-50 rounded-lg hover:bg-blue-500 hover:text-white transition-all cursor-pointer"
            >
              <h4 className="font-medium text-sm mb-1">智能记账的工作原理？</h4>
              <p className="text-xs text-gray-500 hover:text-white/80">了解我们的AI如何自动分类和记录您的交易</p>
            </div>
            <div 
              onClick={() => handleFaqClick('风险测评有什么用？')}
              className="p-3 md:p-4 bg-gray-50 rounded-lg hover:bg-blue-500 hover:text-white transition-all cursor-pointer"
            >
              <h4 className="font-medium text-sm mb-1">风险测评有什么用？</h4>
              <p className="text-xs text-gray-500 hover:text-white/80">了解风险测评如何帮助您选择合适的理财产品</p>
            </div>
            <div 
              onClick={() => handleFaqClick('如何查看消费分析报告？')}
              className="p-3 md:p-4 bg-gray-50 rounded-lg hover:bg-blue-500 hover:text-white transition-all cursor-pointer"
            >
              <h4 className="font-medium text-sm mb-1">如何查看消费分析报告？</h4>
              <p className="text-xs text-gray-500 hover:text-white/80">学习如何生成和解读您的个人消费分析报告</p>
            </div>
            <div 
              onClick={() => handleFaqClick('理财产品赎回规则？')}
              className="p-3 md:p-4 bg-gray-50 rounded-lg hover:bg-blue-500 hover:text-white transition-all cursor-pointer"
            >
              <h4 className="font-medium text-sm mb-1">理财产品赎回规则？</h4>
              <p className="text-xs text-gray-500 hover:text-white/80">了解不同理财产品的赎回条件和费用</p>
            </div>
            <div 
              onClick={() => handleFaqClick('数据安全与隐私保护？')}
              className="p-3 md:p-4 bg-gray-50 rounded-lg hover:bg-blue-500 hover:text-white transition-all cursor-pointer"
            >
              <h4 className="font-medium text-sm mb-1">数据安全与隐私保护？</h4>
              <p className="text-xs text-gray-500 hover:text-white/80">了解我们如何保护您的财务数据安全</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerServicePage;
