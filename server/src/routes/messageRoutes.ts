import express from "express";
import { getMessages } from "../controllers/messageControllers.js";

const router = express.Router();

router.get("/conversations/:conversationId", getMessages);

export default router;
