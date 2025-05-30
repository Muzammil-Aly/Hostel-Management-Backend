import multer from "multer";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // file has access from multer
    cb(null, "./public/temp");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname + "-" + Date.now()); // file has different options
  },
});

export const upload = multer({ storage });
