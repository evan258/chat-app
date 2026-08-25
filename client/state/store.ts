import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';

import conversationsReducer from "./conversationsSlice";
import messagesReducer from "./messagesSlice";
import friendshipsReducer from "./friendshipsSlice";
import notificationsReducer from "./notificationsSlice";

export const store = configureStore({
  reducer: {
    conversations: conversationsReducer,
    messages: messagesReducer,
    friendships: friendshipsReducer,
    notifications: notificationsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
