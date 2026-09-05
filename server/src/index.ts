import express from "express";
import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import cors from "cors";
import helmet from "helmet";
import { authMiddleware } from "./middlewares/authMiddleware.js";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { setupWebSocket } from "./websocket.js";
import messageRoutes from "./routes/messageRoutes.js"
import fileRoutes from "./routes/fileRoutes.js"
import conversationRoutes from "./routes/conversationRoutes.js"
import friendshipRoutes from "./routes/friendshipRoutes.js"
import notificationRoutes from "./routes/notificationRoutes.js"

const app = express();

app.use(cors());
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({policy: "cross-origin"}));
app.use(express.json());

app.get("/", (_req, res) => {
  res.send("This is home route");
});

app.use("/messages", authMiddleware, messageRoutes);
app.use("/files", authMiddleware, fileRoutes);
app.use("/conversations", authMiddleware, conversationRoutes);
app.use("/friendships", authMiddleware, friendshipRoutes);
app.use("/notifications", authMiddleware, notificationRoutes);

const server = createServer(app);

const wss = new WebSocketServer({noServer: true});

setupWebSocket(wss);

const JWKS = createRemoteJWKSet(
  new URL(`${process.env.CLIENT_URL}/api/auth/jwks`)
);

server.on("upgrade", async (request, socket, head) => {
  try {
    const reqUrl = new URL(request.url || "", `http://${request.headers.host}`)
    const token = reqUrl.searchParams.get("token");

    if (!token) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }
    const {payload} = await jwtVerify(token, JWKS);
    if (!payload?.sub) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      ws.userId = payload.sub!;
      wss.emit("connection", ws, request);
    });
  } catch (err) {
    console.log(err);
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    socket.destroy();
  }
});

const PORT = Number(process.env.PORT) || 3003;
server.listen(PORT, () => {
  console.log(`server is running on port ${PORT}`);
});
