import express from "express";
import { prepareFileUploads } from "../controllers/fileControllers.js";

const router = express.Router();

router.post("/upload", prepareFileUploads);

export default router;
