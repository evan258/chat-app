import express from "express";
import { confirmFileUploads, prepareFileUploads } from "../controllers/fileControllers.js";

const router = express.Router();

router.post("/upload", prepareFileUploads);
router.post("/uploaded", confirmFileUploads);

export default router;
