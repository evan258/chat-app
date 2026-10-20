import express from "express";
import { prepareFileUploads, refreshUrls } from "../controllers/fileControllers.js";

const router = express.Router();

router.post("/upload", prepareFileUploads);
router.post("/refresh", refreshUrls);

export default router;
