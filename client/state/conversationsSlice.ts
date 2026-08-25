import { Message, MessageReaction } from "@/types/prisma";
import { createSlice, PayloadAction } from "@reduxjs/toolkit"

export interface Conversation {
  id: number,
  type: "Direct" | "Group",
  members: number[],
  avatarUrl?: string,
  name: string,
  unreadCount?: number,
  lastActivity?: Message | MessageReaction;
}

interface ConversationsState {
  conversations: Conversation[],
}

const initialState: ConversationsState = {
  conversations: [],
}

const conversationsSlice = createSlice({
  name: "conversations",
  initialState,
  reducers: {
    setConversations: (state, action: PayloadAction<Conversation[]>) => {
      state.conversations = action.payload;
    },
    newMessageInConversation: (state, action: PayloadAction<{conversationId: number}>) => {
      const conversation = state.conversations.find((conv) => conv.id === action.payload.conversationId);
      if (!conversation) return;
      conversation.unreadCount = (conversation.unreadCount || 0) + 1;
    },
    updateConversation: (state, action: PayloadAction<Partial<Conversation>>) => {
      const index = state.conversations.findIndex((conv) => conv.id === action.payload.id);
      if (index === -1) return;
      state.conversations[index] = {...state.conversations[index], ...action.payload};
    },
    addConversation: (state, action: PayloadAction<Conversation>) => {
      state.conversations = [action.payload, ...state.conversations];
    },
    updateSeenConversation: (state, action: PayloadAction<{conversationId: number}>) => {
      const conversation = state.conversations.find((conv) => conv.id === action.payload.conversationId);
      if (!conversation) return;
      conversation.unreadCount = 0;
    },
    updateLastActivity: (state, action: PayloadAction<{conversationId: number, lastActivity: MessageReaction | Message}>) => {
      const index = state.conversations.findIndex((conv) => conv.id === action.payload.conversationId);
      if (index === -1) return;
      state.conversations[index].lastActivity = action.payload.lastActivity;
    }
  },
})

export const {
  setConversations,
  newMessageInConversation,
  updateConversation,
  addConversation,
  updateSeenConversation,
  updateLastActivity,
} = conversationsSlice.actions;

export default conversationsSlice.reducer;
