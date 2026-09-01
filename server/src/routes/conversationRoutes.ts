import express from "express";
import { createConversation, getConversations, removeMember, updateConversation } from "../controllers/conversationControllers.js";

const router = express.Router();

router.get("/", getConversations);
router.post("/", createConversation);
router.put("/:conversationId", updateConversation);
router.delete("/:conversationId/members/:memberId", removeMember);

export default router;
