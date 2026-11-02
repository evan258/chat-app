import express from "express";
import { getNotifications, markNotificationsRead, removeNotification } from "../controllers/notificationControllers.js";

const router = express.Router();

router.get("/", getNotifications);
router.put("/read", markNotificationsRead);
router.delete("/:notificationId", removeNotification);

export default router;
