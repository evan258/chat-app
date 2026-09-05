import express from "express";
import { acceptFriendRequest, addFriendRequest, getFriendships, rejectFriendRequest, unfriendUser } from "../controllers/friendshipControllers.js";

const router = express.Router();

router.get("/", getFriendships);
router.post("/:friendId", addFriendRequest);
router.post("/:userId/accept", acceptFriendRequest);
router.delete("/:userId/reject", rejectFriendRequest);
router.delete("/:userId", unfriendUser);

export default router;
