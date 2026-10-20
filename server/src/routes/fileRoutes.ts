import express from "express";
import { confirmFileUploads, prepareFileUploads, refreshUrls } from "../controllers/fileControllers.js";

const router = express.Router();

router.post("/upload", prepareFileUploads);
router.post("/uploaded", confirmFileUploads);
router.post("/refresh", refreshUrls);

export default router;
