import { ConversationType, ReactionType } from "../generated/prisma";
import { createSlice, PayloadAction } from "@reduxjs/toolkit"

export type ReactionAction = "added" | "removed" | "changed";

interface LastActivityMessage {
  type: "message",
  id: number,
  senderId: string,
  text: string | null,
  filesLen: number,
  unsent: boolean,
}

interface LastActivityReaction {
  type: "reaction",
  messageId: number,
  senderId: string,
  reaction: ReactionType,
  reactionAction: ReactionAction,
}

type LastActivity = LastActivityMessage | LastActivityReaction;

export interface Conversation {
  id: number,
  type: ConversationType,
  members: string[],
  avatarUrl?: string,
  name?: string,
  unreadCount: number,
  lastActivity?: LastActivity;
}

interface ConversationsState {
  conversations: Conversation[],
  openConversationId: null | number,
}

const initialState: ConversationsState = {
  conversations: [],
  openConversationId: null,
}

const conversationsSlice = createSlice({
  name: "conversations",
  initialState,
  reducers: {
    setConversations: (state, action: PayloadAction<Conversation[]>) => {
      state.conversations = action.payload;
    },
    setOpenConversationId: (state, action: PayloadAction<number | null>) => {
      state.openConversationId = action.payload;
    },
    newMessageInConversation: (state, action: PayloadAction<{conversationId: number}>) => {
      const conversation = state.conversations.find((conv) => conv.id === action.payload.conversationId);
      if (!conversation) return;
      conversation.unreadCount = (conversation.unreadCount || 0) + 1;
    },
    removeConversation: (state, action: PayloadAction<{conversationId: number}>) => {
      state.conversations = state.conversations.filter((conversation) => conversation.id !== action.payload.conversationId);
      if (state.openConversationId === action.payload.conversationId) {
        state.openConversationId = null;
      }
    },
    removeMemberFromConversation: (state, action: PayloadAction<{conversationId: number, memberId: string}>) => {
      const conversation = state.conversations.find((conversation) => conversation.id === action.payload.conversationId);
      if (!conversation) return;
      conversation.members = conversation.members.filter((id) => id !== action.payload.memberId);
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
    updateLastActivity: (state, action: PayloadAction<{conversationId: number, lastActivity: LastActivity}>) => {
      const index = state.conversations.findIndex((conv) => conv.id === action.payload.conversationId);
      if (index === -1) return;
      state.conversations[index].lastActivity = action.payload.lastActivity;
    },
    markLastActivityUnsent: (state, action: PayloadAction<{conversationId: number, messageId: number}>) => {
      const conversation = state.conversations.find(
        (conversation) => conversation.id === action.payload.conversationId
      );

      if (!conversation?.lastActivity) return;

      if (
        conversation.lastActivity.type === "message" &&
        conversation.lastActivity.id === action.payload.messageId
      ) {
        conversation.lastActivity.unsent = true;
        conversation.lastActivity.text = null;
        conversation.lastActivity.filesLen = 0;
      }
    },
  },
})

export const {
  setConversations,
  setOpenConversationId,
  newMessageInConversation,
  removeConversation,
  removeMemberFromConversation,
  updateConversation,
  addConversation,
  updateSeenConversation,
  updateLastActivity,
  markLastActivityUnsent,
} = conversationsSlice.actions;

export default conversationsSlice.reducer;
