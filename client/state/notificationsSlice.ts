import { NotificationType } from "../generated/prisma";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface Notification {
  id: number,
  type: NotificationType,

  initiatorId: string,
  recipientId: string,

  // who did it, sent along because they may not be in usersById (for example someone who unfriended you)
  initiator: {
    id: string,
    name: string,
    avatarUrl?: string,
    expiresAt?: string,
  },

  // the conversation it is about, for group and friend request accepted notifications
  conversationId?: {
    id: number,
    name: string | null,
    avatarUrl?: string,
    expiresAt?: string,
  },

  createdAt: string,
}
interface NotificationsState {
  notifications: Notification[],
  lastReadNotificationId: number | null,
}

const initialState : NotificationsState = {
  notifications: [],
  lastReadNotificationId: null,
}

const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    setNotifications: (state, action: PayloadAction<Notification[]>) => {
      state.notifications = action.payload;
    },
    addNotification: (state, action: PayloadAction<Notification>) => {
      state.notifications = [action.payload, ...state.notifications]
    },
    removeNotification: (state, action: PayloadAction<number>) => {
      state.notifications = state.notifications.filter((notification) => notification.id !== action.payload);
    },
    setLastReadNotificationId: (state, action: PayloadAction<number | null>) => {
      state.lastReadNotificationId = action.payload;
    },
    updateLastReadNotificationId: (state) => {
      state.lastReadNotificationId = state.notifications[0]?.id ?? null;
    },
  },
})

export const {
  setNotifications,
  addNotification,
  removeNotification,
  setLastReadNotificationId,
  updateLastReadNotificationId,
} = notificationsSlice.actions;

export default notificationsSlice.reducer;
