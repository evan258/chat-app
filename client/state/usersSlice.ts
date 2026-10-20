import { createSlice, PayloadAction } from "@reduxjs/toolkit"

export interface User{
  id: string,
  name: string,
  avatarUrl?: string,
  expiresAt?: string,
}

interface UserState {
  byId: Record<string, User>,
  activeUsers: Record<string, boolean>,
}

const initialState: UserState = {
  byId: {},
  activeUsers: {},
}

const userSlice = createSlice({
  name: "users",
  initialState,
  reducers: {
    setUsers: (state, action: PayloadAction<User[]>) => {
      for (const user of action.payload) {
        state.byId[user.id] = user;
      }
    },
    addUser: (state, action: PayloadAction<User>) => {
      state.byId[action.payload.id] = action.payload;
    },
    removeUser: (state, action: PayloadAction<string>) => {
      delete state.byId[action.payload];
    },
    updateUser: (state, action: PayloadAction<User>) => {
      state.byId[action.payload.id] = action.payload;
    },
    updateUserAvatars: (state, action: PayloadAction<{id: string, avatarUrl?: string, expiresAt?: string}[]>) => {
      for (const item of action.payload) {
        const user = state.byId[item.id];
        if (!user) continue;
        user.avatarUrl = item.avatarUrl;
        user.expiresAt = item.expiresAt;
      }
    },
    setActiveUsers: (state,action: PayloadAction<string[]>) => {
      for (const userId of action.payload) {
        state.activeUsers[userId] = true;
      }
    },
    setUserActive: (state,action: PayloadAction<string>) => {
      state.activeUsers[action.payload] = true;
    },
    setUserInactive: (state,action: PayloadAction<string>) => {
      delete state.activeUsers[action.payload];
    },
  },
});

export const {
  setUsers,
  addUser,
  removeUser,
  updateUser,
  updateUserAvatars,
  setActiveUsers,
  setUserActive,
  setUserInactive,
} = userSlice.actions;

export default userSlice.reducer;
