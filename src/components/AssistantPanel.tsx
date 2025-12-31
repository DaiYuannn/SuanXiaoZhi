import React, { useState } from 'react';
import { aiChat, recognizeIntent } from '../api/endpoints';
import { auditApi, auditError } from '../analytics/audit';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

interface AssistantMessage {
  role: 'user' | 'bot';
  content: string;
}

const AssistantPanel: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setMessages(prev => [...prev, { role: 'user', content: trimmed }]);
    setInput('');
    setError(null);
    setLoading(true);

    try {
      auditApi('ai_chat_start', { textLen: trimmed.length, from: 'assistant_panel' });
      const ai = await aiChat([
        { role: 'system', content: '你是金智通的智能助手，请围绕用户个人理财问题，用简短要点和小标题回答，语言自然、可执行。' },
        { role: 'user', content: trimmed }
      ]);
      const md = (ai as any)?.data?.content || '';
      const htmlBody = DOMPurify.sanitize(marked.parse(md) as string);

      let cta = '';
      try {
        auditApi('intent_recognize_start', { textLen: trimmed.length, from: 'assistant_panel' });
        const res = await recognizeIntent(trimmed);
        const intents = res.data || [];
        auditApi('intent_recognize_success', { intentsCount: intents.length, from: 'assistant_panel' });
        const top = intents.sort((a: any, b: any) => b.score - a.score)[0];
        if (top) {
          if (top.type === 'navigate' && top.payload?.route) {
            cta = `<div class='mt-3 text-xs'><a href='#' class='chat-link text-primary underline' data-action='navigate' data-target='${top.payload.route}'>前往相关页面：${top.payload.route}</a></div>`;
          } else if (top.type === 'incentive') {
            cta = `<div class='mt-3 text-xs'>激励触发：${top.payload?.name || '行为奖励'} 已记录 🎯</div>`;
          }
        }
      } catch (e) {
        auditError('assistant_panel_intent_fail', e as any);
      }

      setMessages(prev => [...prev, { role: 'bot', content: `${htmlBody}${cta}` }]);
      setLoading(false);
    } catch (e: any) {
      auditError('assistant_panel_ai_chat_fail', e);
      setLoading(false);
      setError('智能助手暂时开小差了，请稍后再试。');
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMessage(input);
  };

  return (
    <>
      {/* 浮动按钮 */}
      <button
        onClick={() => setOpen(v => !v)}
        className="fixed right-4 bottom-20 z-40 rounded-full w-12 h-12 bg-primary text-white shadow-lg"
        title={open ? '关闭助手' : '打开助手'}
      >
        <i className="fas fa-robot" />
      </button>

      {/* 浮层面板 */}
      {open && (
        <div className="fixed right-4 bottom-36 z-40 w-96 max-w-[95vw] bg-white border border-border-light rounded-xl shadow-xl flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border-light">
            <div className="text-sm font-medium">智能助手</div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setMessages([]);
                  setError(null);
                }}
                className="text-xs px-2 py-1 rounded bg-gray-100"
              >
                重置
              </button>
              <button onClick={() => setOpen(false)} className="text-xs px-2 py-1 rounded bg-gray-100">关闭</button>
            </div>
          </div>
          <div className="p-3 space-y-2 overflow-auto max-h-80">
            {messages.map((m, idx) => (
              <div key={idx} className={`text-sm ${m.role === 'user' ? 'text-text-primary text-right' : 'text-text-secondary text-left'}`}>
                <div
                  className={`inline-block px-2 py-1 rounded ${m.role === 'user' ? 'bg-primary/10' : 'bg-gray-100'}`}
                  dangerouslySetInnerHTML={{ __html: m.content }}
                />
              </div>
            ))}
            {loading && <div className="text-xs text-text-secondary">思考中…</div>}
            {error && <div className="text-xs text-danger">{error}</div>}
          </div>
          <form onSubmit={onSubmit} className="p-3 border-t border-border-light flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              className="flex-1 px-3 py-2 border border-border-light rounded"
              placeholder="问问我：如何优化本周餐饮支出？"
            />
            <button disabled={loading} className="px-3 py-2 rounded bg-primary text-white disabled:opacity-50">发送</button>
          </form>
        </div>
      )}
    </>
  );
};

export default AssistantPanel;
