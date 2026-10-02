import express from "express";
import { getUser, searchUsers } from "../controllers/userControllers.js";

const router = express.Router();

router.get("/", searchUsers);
router.get("/:userId", getUser);

export default router;
