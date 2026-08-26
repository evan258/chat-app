import { ReactionType } from "@/generated/prisma";
import { createSlice, PayloadAction } from "@reduxjs/toolkit"

export interface Message {
  id: string | number,
  conversationId: number,
  senderId: string,
  createdAt: null | string,
  previewUrls: string[],      
  text?: string | null,
  unsent: boolean,
  status: "sending" | "sent" | "failed",
  reactions: {userId: string, reaction: ReactionType}[],
}

interface MessagesState {
  messagesByConversation: Record<number, Message[]>,
  typingByConversation: Record<number, Record<number, boolean>>,
  lastReadByConversation: Record<number, Record<number, number>>,
  removingMessagesByConversation: Record<number, number[]>,
}

const initialState: MessagesState = {
  messagesByConversation: {},
  typingByConversation: {},
  lastReadByConversation: {},
  removingMessagesByConversation: {},
}

const messagesSlice = createSlice({
  name: "messages",
  initialState,
  reducers: {
    setMessages: (state, action: PayloadAction<{conversationId: number, messages: Message[]}>) => {
      state.messagesByConversation[action.payload.conversationId] = action.payload.messages;
      
    },
    addOptimisticMessage: (state, action: PayloadAction<Message>) => {
      const message = action.payload;
      if (!state.messagesByConversation[message.conversationId]) {
        state.messagesByConversation[message.conversationId] = [];
      }
      state.messagesByConversation[message.conversationId].push(message);
    },
    confirmMessage: (state, action: PayloadAction<{tempId: string, message: Message}>) => {
      const messages = state.messagesByConversation[action.payload.message.conversationId];
      if (!messages) return;
      const index = messages.findIndex((message) => message.id === action.payload.tempId);

      if (index === -1) return;
      state.messagesByConversation[action.payload.message.conversationId][index] = action.payload.message;
    },
    addIncomingMessage: (state, action: PayloadAction<Message>) => {
      const message = action.payload;
      if (!state.messagesByConversation[message.conversationId]) {
        state.messagesByConversation[message.conversationId] = [];
      }
      state.messagesByConversation[message.conversationId].push(message);
    },
    markMessageAsFailed: (state, action: PayloadAction<{tempId: string, conversationId: number}>) => {
      const messages = state.messagesByConversation[action.payload.conversationId];
      if (!messages) return;
      const index = messages.findIndex((message) => message.id === action.payload.tempId);

      if (index === -1) return;
      state.messagesByConversation[action.payload.conversationId][index] = {...messages[index], status: "failed"};
    },
    markMessageAsUnsent: (state, action: PayloadAction<{messageId: string, conversationId: number}>) => {
      const messages = state.messagesByConversation[action.payload.conversationId];
      if (!messages) return;
      const index = messages.findIndex((message) => message.id === action.payload.messageId);

      if (index === -1) return;
      state.messagesByConversation[action.payload.conversationId][index] = {
        ...messages[index],
        unsent: true,
        text: null,
        previewUrls: [],
      };
    },
    prependMessages: (state, action: PayloadAction<{conversationId: number, messages: Message[]}>) => {
      const currentMessages = state.messagesByConversation[action.payload.conversationId] || [];
      state.messagesByConversation[action.payload.conversationId] = [...action.payload.messages, ...currentMessages];
    },
    removeMessage: (state, action: PayloadAction<{conversationId: number, messageId: number}>) => {
      const {conversationId, messageId} = action.payload;
      if (!state.messagesByConversation[conversationId]) return;
      state.messagesByConversation[conversationId] = state.messagesByConversation[conversationId].filter((message) => message.id !== messageId);
    },
    setTyping: (state, action: PayloadAction<{conversationId: number, userId: number, isTyping: boolean}>) => {
      if (!state.typingByConversation[action.payload.conversationId]) {
        state.typingByConversation[action.payload.conversationId] = {};
      }
      state.typingByConversation[action.payload.conversationId][action.payload.userId] = action.payload.isTyping;
    },
    setLastRead: (state, action: PayloadAction<{conversationId: number, userId: number, messageId: number}>) => {
      const {conversationId, userId, messageId} = action.payload;
      if (!state.lastReadByConversation[conversationId]) {
        state.lastReadByConversation[conversationId] = {};
      }
      state.lastReadByConversation[conversationId][userId] = messageId;
    },
    updateMessageReactions: (state, action: PayloadAction<{messageId: number, conversationId: number, userId: string, reactionType: ReactionType}>) => {
      const {conversationId, messageId, userId, reactionType} = action.payload;

      const message = state.messagesByConversation[conversationId]?.find((message) => message.id === messageId);
      if (!message) return;
      
      const index = message.reactions.findIndex((reaction) => reaction.userId === userId);
      if (index === -1) {
        message.reactions.push({userId, reaction: reactionType})
      } else {
        if (message.reactions[index].reaction === reactionType) {
          message.reactions.splice(index, 1);
        } else {
          message.reactions[index].reaction = reactionType;
        }
      }
    },
    addRemovingMessage: (state, action: PayloadAction<{conversationId: number, messageId: number}>) => {
      const {conversationId, messageId} = action.payload;
      if (!state.removingMessagesByConversation[conversationId]) {
        state.removingMessagesByConversation[conversationId] = [];
      }
      if (!state.removingMessagesByConversation[conversationId].includes(messageId)) {
        state.removingMessagesByConversation[conversationId].push(messageId);
      }
    },
    deleteRemovingMessage: (state, action: PayloadAction<{conversationId: number, messageId: number}>) => {
      const {conversationId, messageId} = action.payload;
      if (!state.removingMessagesByConversation[conversationId]) return;

      state.removingMessagesByConversation[conversationId] = state.removingMessagesByConversation[conversationId].filter(id => id !== messageId);
    },
  },
})

export const {
  setMessages,
  prependMessages,
  addOptimisticMessage,
  confirmMessage,
  addIncomingMessage,
  markMessageAsFailed,
  markMessageAsUnsent,
  removeMessage,
  setTyping,
  setLastRead,
  updateMessageReactions,
  addRemovingMessage,
  deleteRemovingMessage,
} = messagesSlice.actions;

export default messagesSlice.reducer;
