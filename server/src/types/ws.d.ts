declare module "ws" {
  interface WebSocket {
    userId: string,
    isAlive: boolean,
  }
}

export {};
