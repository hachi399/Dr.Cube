
import React from 'react';
import { Message, Role } from '../types';

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === Role.USER;

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start animate-fade-in'}`}>
      <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-3 shadow-lg ${
        isUser 
          ? 'bg-blue-600 text-white rounded-tr-none' 
          : 'bg-slate-800 text-slate-100 border border-slate-700 rounded-tl-none'
      }`}>
        <div className="flex items-center mb-1 space-x-2">
          <span className="text-xs font-bold uppercase tracking-wider opacity-70">
            {isUser ? 'You' : 'Gemini'}
          </span>
          <span className="text-[10px] opacity-50">
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
          {message.content}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
