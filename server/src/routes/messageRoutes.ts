import express from "express";
import { getMessages, getOlderMessages } from "../controllers/messageControllers.js";

const router = express.Router();

router.get("/conversations/:conversationId", getMessages);
router.get("/conversations/:conversationId/messages/:messageId", getOlderMessages);

export default router;
