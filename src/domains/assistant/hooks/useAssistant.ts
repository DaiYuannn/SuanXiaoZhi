import { useState } from 'react';
import { aiChat, type ChatMessage } from '../api/assistant-api.js';

export interface AssistantState {
  messages: ChatMessage[];
  loading: boolean;
  error?: string;
}

export function useAssistant(initialSystem?: string) {
  const [state, setState] = useState<AssistantState>({
    messages: initialSystem ? [{ role: 'system', content: initialSystem }] : [],
    loading: false,
  });

  async function send(content: string) {
    const msgs: ChatMessage[] = [...state.messages, { role: 'user', content }];
    setState(s => ({ ...s, messages: msgs, loading: true, error: undefined }));
    try {
      const r = await aiChat(msgs);
      const assistant: ChatMessage = { role: 'assistant', content: r.data.content };
      setState(s => ({ ...s, messages: [...msgs, assistant], loading: false }));
    } catch (e: any) {
      setState(s => ({ ...s, loading: false, error: e?.message || '浼氳瘽澶辫触' }));
    }
  }

  function reset() {
    setState({ messages: initialSystem ? [{ role: 'system', content: initialSystem }] : [], loading: false });
  }

  return { state, send, reset };
}


