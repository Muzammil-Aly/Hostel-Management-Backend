import { asyncHandler } from "../utils/asynchandler.js";
import mongoose, { isValidObjectId } from "mongoose";
import { Room } from "../models/room.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/Cloudinary.js";
import jwt from "jsonwebtoken";

const createRoom = asyncHandler(async (req, res) => {
  const { roomNumber, capacity, floor } = req.body;
  if (!roomNumber || !capacity || floor === undefined) {
    throw new ApiError(400, "Room number, capacity, and floor are required");
  }

  const room = await Room.findOne({ roomNumber, floor });
  if (room) {
    throw new ApiError(409, "Room with this number and floor already exists");
  }
  const newRoom = await Room.create({ roomNumber, capacity, floor });

  return res
    .status(201)
    .json(new ApiResponse(200, newRoom, "Room created Successfully"));
});

const getAllRooms = asyncHandler(async (req, res) => {
  const rooms = await Room.find().populate({
    path: "occupants",
    select: "username",
  }); // Populate occupants with username
  return res
    .status(200)
    .json(new ApiResponse(200, rooms, "All Rooms fetched successfully"));
});

const getRoomById = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  if (!isValidObjectId(roomId)) {
    throw new ApiError(400, "Invalid room ID");
  }
  const room = await Room.findById(roomId);
  if (!room) {
    throw new ApiError(404, "Room not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, room, "Room fetched successfully"));
});

// const updateRoom = asyncHandler(async (req, res) => {
//   const { roomId } = req.params;
//   const { roomNumber, capacity, floor } = req.body;

//   if (!isValidObjectId(roomId)) {
//     throw new ApiError(400, "Invalid room ID");
//   }

//   const room = await Room.findById(roomId);
//   if (!room) {
//     throw new ApiError(404, "Room not found");
//   }

//   if (roomNumber) {
//     room.roomNumber = roomNumber;
//   }
//   if (capacity) {
//     room.capacity = capacity;
//   }

//   if (floor) {
//     room.floor = floor;
//   }

//   await room.save();

//   return res
//     .status(200)
//     .json(new ApiResponse(200, room, "Room updated successfully"));
// });

const updateRoom = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const { roomNumber, capacity, floor } = req.body;

  if (!isValidObjectId(roomId)) {
    throw new ApiError(400, "Invalid room ID");
  }

  const room = await Room.findById(roomId);
  if (!room) {
    throw new ApiError(404, "Room not found");
  }

  // Determine what the updated values *would* be
  const updatedRoomNumber = roomNumber || room.roomNumber;
  const updatedFloor = floor !== undefined ? floor : room.floor;

  // Check if another room already has this roomNumber and floor
  const duplicateRoom = await Room.findOne({
    _id: { $ne: roomId }, // exclude current room
    roomNumber: updatedRoomNumber,
    floor: updatedFloor,
  });

  if (duplicateRoom) {
    throw new ApiError(
      409,
      "Another room with this roomNumber and floor already exists"
    );
  }

  // Update fields only after validation
  if (roomNumber) {
    room.roomNumber = roomNumber;
  }
  if (capacity) {
    room.capacity = capacity;
  }
  if (floor !== undefined) {
    room.floor = floor;
  }

  await room.save();

  return res
    .status(200)
    .json(new ApiResponse(200, room, "Room updated successfully"));
});

const deleteRoom = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  if (!isValidObjectId(roomId)) {
    throw new ApiError(400, "Invalid room ID");
  }
  const room = await Room.findByIdAndDelete(roomId);
  if (!room) {
    throw new ApiError(404, "Room not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, room, "Room deleted successfully"));
});

// const assignRoom = asyncHandler(async (req, res) => {
//   const { roomId } = req.params;
//   const { userId } = req.body;
//   const {cnic}= req.body;

//   if (!isValidObjectId(roomId)) {
//     throw new ApiError(400, "Invalid room ID");
//   }

//   if (!isValidObjectId(userId)) {
//     throw new ApiError(400, "Invalid user ID");
//   }

//   const room = await Room.findById(roomId);
//   if (!room) {
//     throw new ApiError(404, "Room not found");
//   }

//   const user = await User.findOne({cnic});
//   if (!user) {
//     throw new ApiError(404, "User not found");
//   }

//   const existingRoom = await Room.findOne({ occupants: user._id });
//   if (existingRoom) {
//     throw new ApiError(400, "User is already assigned to another room");
//   }

//   const existedOccupant = room.occupants.find(
//     (occupant) => occupant.toString() === user._id.toString()
//   );

//   if (existedOccupant) {
//     throw new ApiError(400, "User is already assigned to this room");
//   }

//   if (room.occupants.length >= room.capacity) {
//     throw new ApiError(400, "Room is full");
//   }

//   room.occupants.push(user._id);
//   await room.save();

//   return res
//     .status(200)
//     .json(new ApiResponse(200, room, "Room assigned successfully"));
// });

const assignRoom = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const { cnic } = req.body;

  if (!isValidObjectId(roomId)) {
    throw new ApiError(400, "Invalid room ID");
  }

  const room = await Room.findById(roomId);
  if (!room) {
    throw new ApiError(404, "Room not found");
  }

  const user = await User.findOne({ cnic });
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const existingRoom = await Room.findOne({ occupants: user._id });
  if (existingRoom) {
    throw new ApiError(400, "User is already assigned to another room");
  }

  const existedOccupant = room.occupants.find(
    (occupant) => occupant.toString() === user._id.toString()
  );

  if (existedOccupant) {
    throw new ApiError(400, "User is already assigned to this room");
  }

  if (room.occupants.length >= room.capacity) {
    throw new ApiError(400, "Room is full");
  }

  room.occupants.push(user._id);
  await room.save();

  return res
    .status(200)
    .json(new ApiResponse(200, room, "Room assigned successfully"));
});

const assignRoomByNumber = asyncHandler(async (req, res) => {
  const { roomNumber } = req.params;
  const { userId } = req.body;

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user ID");
  }

  const room = await Room.findOne({ roomNumber: roomNumber });
  if (!room) {
    throw new ApiError(404, "Room not found");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const existingRoom = await Room.findOne({ occupants: userId });
  if (existingRoom) {
    throw new ApiError(400, "User is already assigned to another room");
  }

  const existedOccupant = room.occupants.find(
    (occupant) => occupant.toString() === user._id.toString()
  );

  if (existedOccupant) {
    throw new ApiError(400, "User is already assigned to this room");
  }

  if (room.occupants.length >= room.capacity) {
    throw new ApiError(400, "Room is full");
  }

  room.occupants.push(user._id);
  await room.save();

  return res
    .status(200)
    .json(new ApiResponse(200, room, "Room assigned successfully"));
});

const getRoomOccupants = asyncHandler(async (req, res) => {
  const { roomId } = req.params;

  if (!isValidObjectId(roomId)) {
    throw new ApiError(400, "Invalid room ID");
  }

  const room = await Room.findById(roomId).populate({
    path: "occupants",
    select: "username avatar", // Exclude the password field
  });
  if (!room) {
    throw new ApiError(404, "Room not found");
  }
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        room.occupants,
        "Room occupants fetched successfully"
      )
    );
});

const getRoomByNumber = asyncHandler(async (req, res) => {
  const { roomNumber } = req.params;
  if (!roomNumber) {
    throw new ApiError(400, "Room number is required");
  }
  const room = await Room.find({ roomNumber });
  if (!room) {
    throw new ApiError(404, "Room not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, room, "Room fetched successfully"));
});

const updateOccupants = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const { cnic } = req.body;

  if (!isValidObjectId(roomId)) {
    throw new ApiError(400, "Invalid room ID");
  }

  const room = await Room.findById(roomId);
  if (!room) {
    throw new ApiError(404, "Room not found");
  }

  const user = await User.findOne({ cnic });
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const userIndex = room.occupants.findIndex(
    (occupant) => occupant.toString() === user._id.toString()
  );

  if (userIndex !== -1) {
    // User already exists in occupants → remove

    room.occupants.splice(userIndex, 1);
    user.roomNumber = null;
  } else {
    const existingRoom = await Room.findOne({ occupants: user._id });
    if (existingRoom) {
      throw new ApiError(400, "User is already assigned to another room");
    }

    // Add user
    room.occupants.push(user._id);
    user.roomNumber = room._id;
  }

  /*findIndex goes through each occupant ID and checks if any of them match the user._id.

If the user is found, userIndex will be a number >= 0.

If not found, userIndex will be -1.
*/

  // Update isFull status
  room.isFull = room.occupants.length >= room.capacity;
  await Promise.all([room.save(), user.save()]);
  // await room.save();

  return res
    .status(200)
    .json(new ApiResponse(200, room, "Occupants updated successfully"));
});

export {
  createRoom,
  getAllRooms,
  getRoomById,
  updateRoom,
  deleteRoom,
  assignRoom,
  getRoomOccupants,
  getRoomByNumber,
  updateOccupants,
  assignRoomByNumber,
};
