import { useEffect } from "react";
import { clearToken } from "@/lib/api";
import { loadInitialData } from "@/lib/loaders";
import { connectSocket, disconnectSocket } from "@/lib/socket";

// fetch conversations / friendships / notifications and open the socket once the user is known
export function useInitialData(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;

    loadInitialData();
    connectSocket();

    return () => {
      disconnectSocket();
      clearToken();
    };
  }, [userId]);
}
