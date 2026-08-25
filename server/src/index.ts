import express from "express";
import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import cors from "cors";
import helmet from "helmet";
import messageRoutes from "./routes/messageRoutes.js"
import { authMiddleware } from "./middlewares/authMiddleware.js";

const app = express();

app.use(cors());
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({policy: "cross-origin"}));
app.use(express.json());

app.get("/", (_req, res) => {
  res.send("This is home route");
});

app.use("/messages", authMiddleware, messageRoutes);

const server = createServer(app);

const wss = new WebSocketServer({noServer: true});

server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  })
});

const PORT = Number(process.env.PORT) || 3003;
server.listen(PORT, () => {
  console.log(`server is running on port ${PORT}`);
});
