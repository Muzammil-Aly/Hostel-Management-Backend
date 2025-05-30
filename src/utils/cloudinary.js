import { v2 as cloudinary } from "cloudinary";
import exp from "constants";
import fs from "fs/promises"; // modern async API
// import fs from "fs"; // it is used as a file system module to delete the file from the local server after uploading it to cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// cloudinary.uploader
//   .upload("my_image.jpg")
//   .then(result=>console.log(result));

const uploadOnCloudinary = async (localFilePath) => {
  try {
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
      folder: "SabirHeights",
    });

    await fs.unlink(localFilePath);
    return response; // this will gve the url of the image uploaded on cloudinary
  } catch (err) {
    console.log("Error in uploading on cloudinary", err);
    fs.unlink(localFilePath);
  }
};

export { uploadOnCloudinary };
