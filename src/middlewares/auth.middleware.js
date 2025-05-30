import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

export const verifyJwt = asyncHandler(async (req, _, next) => {
  // - is used for response as it is not being used here
  try {
    const token =
      req.cookies?.accessToken || // we have cookies access as we have inserted cookieparser as middleweare so "req has the properties for cookoies as well response "
      req.header("Authorization")?.replace("Bearer ", ""); // sometimes it is provided the header

    if (!token) {
      throw new ApiError(401, "Unauthorized Request");
    }

    const decodeToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    if (decodeToken?._id) {
      // throw new ApiError(401, "Invalid Token: No user ID found");
      console.log("user ID found");
    }

    const user = await User.findById(decodeToken?._id).select(
      "-password -refreshToken"
    );

    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid access TOken");
  }
});
