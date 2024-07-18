import express, { NextFunction, Request, Response } from "express";
import { config } from "dotenv";
import multer, { StorageEngine } from "multer";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";

config();

const PORT = process.env.PORT || 10000;
const TOKEN = process.env.TOKEN || "image_token";

const uploadDir = path.join(__dirname, "images");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];
  if (token !== TOKEN) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }
  next();
};

const allowedDomains = ["https://www.example.com", "https://sub.example.com"];

const checkReferer = (req: Request, res: Response, next: NextFunction) => {
  const referer = req.headers.referer;
  if (referer) {
    const refererHost = new URL(referer).origin;
    if (allowedDomains.includes(refererHost)) {
      next();
    } else {
      res.status(403).send("Access Denied");
    }
  }
  next();
};

const fileFilter = (
  req: express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only .jpeg, .jpg, .png, .webp formats allowed!"));
  }
};

const storage: StorageEngine = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = uuidv4();
    const extension = path.extname(file.originalname);
    const fileName = `${uniqueSuffix}${extension}`;
    cb(null, fileName);
  },
});

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

const app = express();

app.post(
  "/upload",
  authenticateToken,
  upload.single("image"),
  (req: Request, res: Response) => {
    if (req.file) {
      res.json({
        data: req.file.filename,
      });
    } else {
      res
        .status(400)
        .json({ message: "No file uploaded or file type is not supported!" });
    }
  }
);

app.use(
  "/images",
  checkReferer,
  express.static(uploadDir, {
    maxAge: 86400,
    setHeaders(res, path, stat) {
      res.set("Cache-Control", "public, max-age=86400");
    },
  })
);

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    res.status(400).json({ message: err.message });
  } else if (err) {
    res.status(500).json({ message: err.message });
  } else {
    next();
  }
});

app.disable("x-powered-by");

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
