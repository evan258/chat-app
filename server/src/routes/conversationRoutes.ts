import express from "express";
import { getConversations, markConversationAsRead } from "../controllers/conversationControllers.js";

const router = express.Router();

router.get("/", getConversations);
router.patch("/:conversationId/read", markConversationAsRead);

export default router;
