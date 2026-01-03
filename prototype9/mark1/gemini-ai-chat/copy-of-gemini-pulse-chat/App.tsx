
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Role, Message, ChatState } from './types';
import { createChatSession } from './services/geminiService';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import { GenerateContentResponse } from '@google/genai';

const App: React.FC = () => {
  const [state, setState] = useState<ChatState>({
    messages: [
      {
        id: '1',
        role: Role.MODEL,
        content: 'こんにちは！APIキーを設定して会話を始めましょう。',
        timestamp: new Date(),
      }
    ],
    isStreaming: false,
    error: null,
    apiKey: localStorage.getItem('GEMINI_API_KEY'),
    showSettings: !localStorage.getItem('GEMINI_API_KEY'),
  });

  const [tempKey, setTempKey] = useState(state.apiKey || '');
  const chatSessionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize chat session when apiKey changes
  useEffect(() => {
    if (state.apiKey) {
      chatSessionRef.current = createChatSession(state.apiKey);
    } else {
      chatSessionRef.current = null;
    }
  }, [state.apiKey]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [state.messages]);

  const saveApiKey = () => {
    if (tempKey.trim()) {
      localStorage.setItem('GEMINI_API_KEY', tempKey.trim());
      setState(prev => ({ ...prev, apiKey: tempKey.trim(), showSettings: false }));
    }
  };

  const clearApiKey = () => {
    localStorage.removeItem('GEMINI_API_KEY');
    setState(prev => ({ ...prev, apiKey: null, showSettings: true }));
    setTempKey('');
  };

  const handleSendMessage = useCallback(async (content: string) => {
    if (!state.apiKey) {
      setState(prev => ({ ...prev, showSettings: true }));
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: Role.USER,
      content,
      timestamp: new Date(),
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isStreaming: true,
      error: null,
    }));

    try {
      if (!chatSessionRef.current) {
        chatSessionRef.current = createChatSession(state.apiKey);
      }

      const streamResponse = await chatSessionRef.current.sendMessageStream({ message: content });
      
      let aiContent = "";
      const aiMessageId = (Date.now() + 1).toString();
      
      setState(prev => ({
        ...prev,
        messages: [
          ...prev.messages,
          {
            id: aiMessageId,
            role: Role.MODEL,
            content: "",
            timestamp: new Date(),
          }
        ],
      }));

      for await (const chunk of streamResponse) {
        const c = chunk as GenerateContentResponse;
        const text = c.text;
        if (text) {
          aiContent += text;
          setState(prev => ({
            ...prev,
            messages: prev.messages.map(m => 
              m.id === aiMessageId ? { ...m, content: aiContent } : m
            ),
          }));
        }
      }
    } catch (err: any) {
      console.error("Chat error:", err);
      setState(prev => ({
        ...prev,
        error: "エラーが発生しました。APIキーが正しいか確認してください。",
      }));
    } finally {
      setState(prev => ({ ...prev, isStreaming: false }));
    }
  }, [state.apiKey]);

  return (
    <div className="flex flex-col h-screen bg-slate-950 max-w-4xl mx-auto shadow-2xl overflow-hidden relative">
      {/* Settings Modal */}
      {state.showSettings && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              Gemini API設定
            </h2>
            <p className="text-sm text-slate-400 mb-6">
              Google AI Studioから取得したAPIキーを入力してください。キーはブラウザにのみ保存されます。
            </p>
            <input
              type="password"
              value={tempKey}
              onChange={(e) => setTempKey(e.target.value)}
              placeholder="AIza..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white mb-6 focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <div className="flex gap-3">
              <button
                onClick={saveApiKey}
                className="flex-grow bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all"
              >
                保存して開始
              </button>
              {state.apiKey && (
                <button
                  onClick={() => setState(prev => ({ ...prev, showSettings: false }))}
                  className="px-4 py-3 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700"
                >
                  キャンセル
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800 z-10">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-400 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/20">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </div>
          <div>
            <h1 className="font-bold text-lg text-slate-100">Gemini Pulse</h1>
            <div className="flex items-center space-x-1.5">
              <span className={`w-2 h-2 rounded-full ${state.apiKey ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
              <span className="text-xs text-slate-400 font-medium uppercase tracking-tighter">
                {state.apiKey ? 'Ready to chat' : 'API Key Required'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setState(prev => ({ ...prev, showSettings: true }))}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-all"
            title="Settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </button>
          <button 
            onClick={() => window.location.reload()}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-all"
            title="Reset Conversation"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
              <path d="M21 3v5h-5"></path>
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
              <path d="M3 21v-5h5"></path>
            </svg>
          </button>
        </div>
      </header>

      {/* Messages Container */}
      <main 
        ref={scrollRef}
        className="flex-grow overflow-y-auto p-4 md:p-6 custom-scrollbar bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950"
      >
        <div className="flex flex-col">
          {state.messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
          {state.isStreaming && !state.messages[state.messages.length - 1].content && (
            <div className="flex justify-start mb-6 animate-pulse">
              <div className="bg-slate-800 border border-slate-700 px-4 py-2 rounded-2xl rounded-tl-none">
                <div className="flex space-x-1">
                  <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                </div>
              </div>
            </div>
          )}
          {state.error && (
            <div className="bg-red-900/20 border border-red-500/50 text-red-200 px-4 py-2 rounded-lg text-sm mb-6 text-center">
              {state.error}
            </div>
          )}
        </div>
      </main>

      {/* Input Area */}
      <footer className="w-full">
        <ChatInput 
          onSendMessage={handleSendMessage} 
          isDisabled={state.isStreaming || !state.apiKey} 
        />
        <div className="bg-slate-900 px-4 py-2 text-[10px] text-slate-500 text-center uppercase tracking-widest font-bold border-t border-slate-800/50">
          Powered by Gemini 3 Flash & React
        </div>
      </footer>
    </div>
  );
};

export default App;
