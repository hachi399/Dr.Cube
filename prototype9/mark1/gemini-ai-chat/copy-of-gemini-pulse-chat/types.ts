
export enum Role {
  USER = 'user',
  MODEL = 'model'
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: Date;
}

export interface ChatState {
  messages: Message[];
  isStreaming: boolean;
  error: string | null;
  apiKey: string | null;
  showSettings: boolean;
}
