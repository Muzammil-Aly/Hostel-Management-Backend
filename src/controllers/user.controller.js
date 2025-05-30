import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose, { isValidObjectId } from "mongoose";
import { PaymentModel } from "../models/payment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { Room } from "../models/room.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);

    const refreshToken = await user.generateRefreshToken();
    const accesToken = await user.generateAccessToken();

    if (!user) {
      console.log("user is not found generateacesstoken");
    }
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accesToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went Wrong while generating refresh and access token"
    );
  }
};

// const registerUser = asyncHandler(async (req, res) => {
//   const {
//     username,
//     email,
//     password,
//     phone,
//     fullName,
//     cnic,
//     roomNumber, // assumed to be used to look up Room ObjectId
//     paymentAmount,
//     paymentMethod,
//     paymentMonth,
//     paymentYear,
//   } = req.body;

//   // Basic validation
//   if (
//     [email, phone, username, password, fullName, cnic].some(
//       (field) => !field || field.trim() === ""
//     )
//   ) {
//     throw new ApiError(400, "All fields are required");
//   }

//   if (!email.includes("@")) {
//     throw new ApiError(400, "Invalid email format");
//   }

//   const existedUser = await User.findOne({
//     $or: [{ username }, { email }],
//   });

//   if (existedUser) {
//     throw new ApiError(409, "User with this email or username already exists");
//   }

//   // Avatar upload
//   const avatarLocalPath = req.files?.avatar?.[0]?.path;
//   if (!avatarLocalPath) {
//     throw new ApiError(400, "Avatar file is required");
//   }

//   const avatar = await uploadOnCloudinary(avatarLocalPath);
//   if (!avatar) {
//     throw new ApiError(400, "Failed to upload avatar");
//   }
//   // Optional: Resolve room ObjectId from roomNumber if needed
//   const room = await Room.findOne({ roomNumber }); // assuming Room model
//   if (!room) {
//     throw new ApiError(404, "Room not found");
//   }

//   // First create user without payment (we’ll add that later)
//   const user = await User.create({
//     username: username.toLowerCase(),
//     fullName,
//     phone,
//     avatar: avatar.url,
//     email,
//     password,
//     cnic,
//     roomNumber: room._id,
//   });

//   const alreadyAssigned = await Room.findOne({ occupants: user._id });
//   if (alreadyAssigned) {
//     throw new ApiError(400, "User is already assigned to another room");
//   }

//   if (room.occupants.find((id) => id.toString() === user._id.toString())) {
//     throw new ApiError(400, "User already in this room");
//   }

//   if (room.occupants.length >= room.capacity) {
//     throw new ApiError(400, "Room is full");
//   }

//   room.occupants.push(user._id);
//   await room.save();

//   // Now create payment linked to user
//   const payment = await PaymentModel.create({
//     student: user._id,
//     amount: paymentAmount,
//     method: paymentMethod,
//     month: paymentMonth,
//     year: paymentYear,
//     room: room._id,
//     status: "paid", // or "pending"
//   });

//   // Now update user with payment reference
//   user.payment = payment._id;
//   await user.save();

//   // Return user info without password
//   const createdUser = await User.findById(user._id)
//     .select("-password -refreshToken")
//     .populate("payment");

//   return res
//     .status(201)
//     .json(new ApiResponse(201, createdUser, "User registered successfully"));
// });

const registerUser = asyncHandler(async (req, res) => {
  const {
    username,
    email,
    password,
    phone,
    fullName,
    cnic,
    roomNumber,
    paymentAmount,
    paymentMethod,
    paymentMonth,
    paymentYear,
  } = req.body;

  // 1. Basic validation
  if (
    [email, phone, username, password, fullName, cnic].some(
      (field) => !field || field.trim() === ""
    )
  ) {
    throw new ApiError(400, "All fields are required");
  }

  if (!email.includes("@")) {
    throw new ApiError(400, "Invalid email format");
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with this email or username already exists");
  }

  // 2. Upload avatar
  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (!avatar) {
    throw new ApiError(400, "Failed to upload avatar");
  }

  // 3. Find and validate room
  const room = await Room.findOne({ roomNumber });
  if (!room) {
    throw new ApiError(404, "Room not found");
  }

  if (room.occupants.length >= room.capacity) {
    throw new ApiError(400, "Room is full");
  }

  // 4. Now create the user safely
  const user = await User.create({
    username: username.toLowerCase(),
    fullName,
    phone,
    avatar: avatar.url,
    email,
    password,
    cnic,
    roomNumber: room._id,
  });

  // 5. Validate if already assigned to another room
  const alreadyAssigned = await Room.findOne({ occupants: user._id });
  if (alreadyAssigned) {
    await User.findByIdAndDelete(user._id); // cleanup
    throw new ApiError(400, "User is already assigned to another room");
  }

  if (room.occupants.find((id) => id.toString() === user._id.toString())) {
    await User.findByIdAndDelete(user._id); // cleanup
    throw new ApiError(400, "User already in this room");
  }

  // 6. Add user to room
  room.occupants.push(user._id);
  await room.save();

  // 7. Create payment
  const payment = await PaymentModel.create({
    student: user._id,
    amount: paymentAmount,
    method: paymentMethod,
    month: paymentMonth,
    year: paymentYear,
    room: room._id,
    status: "paid",
  });

  // 8. Link payment to user
  user.payment = payment._id;
  await user.save();

  const createdUser = await User.findById(user._id)
    .select("-password -refreshToken")
    .populate("payment");

  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User registered successfully"));
});

const updateUserCredentials = asyncHandler(async (req, res) => {
  const { username, email, phone, fullName, roomNumber, cnic } = req.body;

  const room = await Room.findOne({ roomNumber });
  if (!room) {
    throw new ApiError(400, "Room not found");
  }
  console.log("email : ", email);
  if (
    [email, phone, username, fullName, roomNumber, cnic].some(
      (field) => !field || field.trim() === ""
    )
  ) {
    throw new ApiError(400, "All fields are required");
  }
  if (email.includes("@")) {
    console.log("Valid: Email contains @");
  } else {
    console.log("Invalid: Email does not contain @");
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!existedUser) {
    throw new ApiError(404, "User with this email or username does not exist");
  }

  const user = await User.findByIdAndUpdate(
    existedUser._id,
    {
      // username, email, password, phone, fullName, roomNumber

      $set: {
        username,
        email,
        phone,
        fullName,
        cnic,
        roomNumber: room._id, // Assuming roomNumber is used to look up Room ObjectId
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "All fields  has been updated"));
});

const loginUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  if (!(email || username)) {
    throw new ApiError(400, "username or email is required");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }], // with $or MONGODB OPERATOR it can find any one of them
  });

  if (!user) {
    throw new ApiError(404, "User does not exit");
  }

  const isPasswordvalid = await user.isPasswordCorrect(password); // this is the method call from user model

  if (!isPasswordvalid) {
    throw new ApiError(401, "Invalid user Credentials");
  }

  const { accesToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true, // the response will be only editable from the servre side only
    secure: true,
    sameSite: "None",
  };
  return res
    .status(200)
    .cookie("accessToken", accesToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accesToken,
          refreshToken,
        },

        "User logged In Successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  // as there is no id how to loggout? so there is a middleware "auth.middleware"
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: { refreshToken: 1 },
    },
    {
      new: true,
    }
  );
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized Request!");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshToken(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old password");
  }

  user.password = newPassword;

  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changes successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;

  if (!fullName || !email) {
    throw new ApiError(400, "All fields are mandatory");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        fullName, // fullName:fullName
        email, // email: email
      },
    },
    { new: true } // Ensures the function returns the updated user document instead of the old one.
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Accout details has been updated."));
});

const updateUserName = asyncHandler(async (req, res) => {
  const { username } = req.body;
  console.log("The username is ", username);

  if (!username) {
    throw new ApiError(400, "Username field is mandatory");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        username,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Username has been updated"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;
  // console.log("Avatar url", req.files.path);

  if (!avatarLocalPath) {
    throw new ApiError(400, "Error while uploading the avatar");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    {
      new: true,
    }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar image has been updated"));
});

const deleteUser = asyncHandler(async (req, res) => {
  await User.findByIdAndDelete(req.user._id);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "User deleted successfully"));
});

const deleteCreatedUser = asyncHandler(async (req, res) => {
  const { cnic } = req.body;
  const user = await User.findOne({ cnic });

  if (!user) {
    throw new ApiError("User not found!");
  }

  await User.findByIdAndDelete(user._id);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "User deleted successfully"));
});

const allUsers = asyncHandler(async (req, res) => {
  const getUsers = await User.find().select("-password -refreshToken -carts ");
  return res
    .status(200)
    .json(new ApiResponse(200, getUsers, "All users fetched successfully"));
});

const updateRole = asyncHandler(async (req, res) => {
  const { role } = req.body; // Expected role: 'buyer' or 'seller'

  if (!role || (role !== "student" && role !== "admin")) {
    return res.status(400).json({ message: "Invalid role specified" });
  }

  const user = await User.findById(req.user._id);

  // Check if the user is allowed to switch roles (you can implement any further checks here)
  if (user.role.includes(role)) {
    return res.status(400).json({ message: `You are already a ${role}` });
  }

  // Update the user's role
  user.role = role; // Switch the role (either "buyer" or "seller")
  await user.save();

  return res.status(200).json(new ApiResponse(200, role, "Role is updated"));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  changeCurrentPassword,
  updateAccountDetails,
  updateUserAvatar,
  updateUserName,
  refreshAccessToken,
  getCurrentUser,
  deleteUser,
  allUsers,
  updateRole,
  updateUserCredentials,
  deleteCreatedUser,
};
