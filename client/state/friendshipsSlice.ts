import { Friendship, FriendshipStatus } from "../generated/prisma";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface FriendshipsState {
  friendships: Friendship[],
}

const initialState: FriendshipsState = {
  friendships: [],
}

const friendshipsSlice = createSlice({
  name: "friendships",
  initialState,
  reducers: {
    setFriendships: (state, action: PayloadAction<Friendship[]>) => {
      state.friendships = action.payload;
    },

    addFriendship: (state, action: PayloadAction<Friendship>) => {
      state.friendships = [action.payload, ...state.friendships];
    },

    updateFriendship: (state,action: PayloadAction<{userId: string,friendId: string,status: FriendshipStatus}>) => {
      const { userId, friendId, status } = action.payload;

      const index = state.friendships.findIndex((friendship) =>
        (friendship.userId === userId && friendship.friendId === friendId) ||
        (friendship.userId === friendId && friendship.friendId === userId)
      );

      if (index === -1) return;

      state.friendships[index] = {...state.friendships[index], status};
    },

    removeFriendship: (state,action: PayloadAction<{userId: string,friendId: string}>) => {
      const { userId, friendId } = action.payload;

      const index = state.friendships.findIndex((friendship) =>
        (friendship.userId === userId && friendship.friendId === friendId) ||
        (friendship.userId === friendId && friendship.friendId === userId)
      );

      if (index === -1) return;
      state.friendships.splice(index, 1);
    },
  },
});

export const {
  setFriendships,
  addFriendship,
  updateFriendship,
  removeFriendship,
} = friendshipsSlice.actions;

export default friendshipsSlice.reducer;
