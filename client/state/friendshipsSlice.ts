import { Friendship } from "@/types/prisma";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface FriendshipsState {
  friendships: Friendship[],
  onlineFriends: Record<number, boolean>,
}

const initialState: FriendshipsState = {
  friendships: [],
  onlineFriends: [],
}

const friendshipsSlice = createSlice({
  name: "friendships",
  initialState,
  reducers: {
    setFriendships: (state, action: PayloadAction<Friendship[]>) => {
      state.friendships = action.payload;
    },
    addFriendships: (state, action: PayloadAction<Friendship>) => {
      state.friendships = [action.payload, ...state.friendships];
    },
    updateFriendship: (state, action: PayloadAction<Partial<Friendship>>) => {
      const index = state.friendships.findIndex((f) => f.id === action.payload.id);
      if (index === -1) return;
      state.friendships[index] = {...state.friendships[index], ...action.payload};
    },
    removeFriendship: (state, action: PayloadAction<number>) => {
      state.friendships = state.friendships.filter((f) => f.id !== action.payload)
    },
    setOnlineFriends: (state, action: PayloadAction<Record<number, boolean>>) => {
      state.onlineFriends = action.payload;
    },
    addOnlineFriend: (state, action: PayloadAction<number>) => {
      state.onlineFriends[action.payload] = true;
    },
    removeOnlineFriend: (state, action: PayloadAction<number>) => {
      state.onlineFriends[action.payload] = false;
    },
  },
})

export const {
  setFriendships,
  addFriendships,
  updateFriendship,
  removeFriendship,
} = friendshipsSlice.actions;

export default friendshipsSlice.reducer;
