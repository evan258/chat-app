import express from "express";
import { getNotifications, removeNotification } from "../controllers/notificationControllers.js";

const router = express.Router();

router.get("/", getNotifications);
router.delete("/:notificationId", removeNotification);

export default router;
