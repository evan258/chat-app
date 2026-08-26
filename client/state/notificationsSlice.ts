import { Conversation, Notification, User } from "../generated/prisma";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface NotificationExtended extends Notification {
  initiator: User,
  conversation?: Conversation,
}
interface NotificationsState {
  notifications: NotificationExtended[],
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
    setNotifications: (state, action: PayloadAction<NotificationExtended[]>) => {
      state.notifications = action.payload;
    },
    addNotification: (state, action: PayloadAction<NotificationExtended>) => {
      state.notifications = [action.payload, ...state.notifications]
    },
    removeNotification: (state, action: PayloadAction<number>) => {
      const index = state.notifications.findIndex((notification) => notification.id === action.payload);
      if (index === -1) return;
      state.notifications.splice(index, 1);
    },
    setLastReadNotificationId: (state, action: PayloadAction<number | null>) => {
      state.lastReadNotificationId = action.payload;
    },
    updateLastReadNotificationId: (state) => {
      const lastNotification = state.notifications[0];
      state.lastReadNotificationId = lastNotification?.id ?? null;
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
