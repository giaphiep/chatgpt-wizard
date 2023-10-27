import express from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { createWorker } from 'tesseract.js';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';
config();

const app = express();
const port = process.env.PORT || 3000;

// Check if 'temp' directory exists, if not, create it
const dir = './uploads';
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir);
}

// Set up multer for file uploading with disk storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(
      null,
      file.fieldname + '-' + Date.now() + path.extname(file.originalname)
    );
  },
});
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 3 * 1024 * 1024, // limit file size to 3MB
  },
});

// Helper function to delete file
const deleteFile = async (filePath) => {
  try {
    await fs.promises.unlink(filePath);
  } catch (err) {
    console.error('Failed to delete the file', err);
  }
};

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 60, // limit each IP to 60 requests per windowMs
  handler: function (req, res) {
    res
      .status(429)
      .json({ message: 'Too many requests, please try again after 10 mins.' });
  },
});

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); // Allows access from any origin
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept'
  );
  next();
});

app.get('/', limiter, async (req, res) => {
  res.send('Github: https://github.com/giaphiep/chatgpt-wizard');
})

app.post('/upload', limiter, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded.' });
  }

  const worker = await createWorker();
  try {
    const {
      data: { text },
    } = await worker.recognize(req.file.path);

    await worker.terminate();
    await deleteFile(req.file.path);

    res.status(200).json({ text });
  } catch (error) {
    await deleteFile(req.file.path);

    console.error(error);
    return res.status(500).json({ message: 'Error processing the file.' });
  }
});

app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
