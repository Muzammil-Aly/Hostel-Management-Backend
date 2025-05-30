import { asyncHandler } from "../utils/asynchandler.js";
import mongoose, { isValidObjectId } from "mongoose";
import { PaymentModel } from "../models/payment.model.js";
import { Room } from "../models/room.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/Cloudinary.js";
import jwt from "jsonwebtoken";
import ExcelJS from "exceljs";

// const createPayment = asyncHandler(async (req, res) => {
//   const { cnic, amount, method, roomNumber, month, year } = req.body;

//   // Validate required fields
//   if (!cnic || !amount || !method) {
//     throw new ApiError(400, "cnic,amount, and method are required.");
//   }

//   // Validate ObjectIds

//   const user = await User.findOne({ cnic });
//   if (!user) {
//     throw new ApiError(404, "User not found.");
//   }

//   // Validate amount
//   const comingamount = Number(amount);
//   if (isNaN(comingamount) || comingamount <= 0) {
//     throw new ApiError(400, "Amount must be a positive number.");
//   }

//   // Validate method
//   const validMethods = ["cash", "card", "online"];
//   if (!validMethods.includes(method)) {
//     throw new ApiError(
//       400,
//       "Payment method must be one of: cash, card, online."
//     );
//   }

//   // Check room and user exist
//   const room = await Room.findOne({
//     roomNumber,
//   });
//   if (!room) {
//     throw new ApiError(404, "Room not found.");
//   }

//   const now = new Date();
//   const currentMonth = now.getMonth() + 1;
//   const currentYear = now.getFullYear();

//   const paymentMonth = month || currentMonth;
//   const paymentYear = year || currentYear;

//   //   🛑 Prevent duplicate current month paid payment
//   const existingCurrent = await PaymentModel.findOne({
//     student: user._id,
//     room: room._id,
//     month: paymentMonth,
//     year: paymentYear,
//     status: "paid",
//   });

//   if (existingCurrent) {
//     throw new ApiError(409, "Payment for this month has already been paid.");
//   }

//   // ✅ Save current month payment
//   const newPayment = await PaymentModel.create({
//     student: user._id,
//     room: room._id,
//     amount,
//     method,
//     status: "paid",
//     month: paymentMonth,
//     year: paymentYear,
//   });

//   const paidStudent = await PaymentModel.findOne({
//     student: user._id,
//     month: paymentMonth,
//     year: paymentYear,
//     status: "paid",
//   }).populate({
//     path: "student",
//     select: "username",
//   });

//   // ✅ Schedule pending payment for next month (if not already exists)
//   const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1);
//   const nextMonth = nextMonthDate.getMonth() + 1;
//   const nextYear = nextMonthDate.getFullYear();

//   const alreadyScheduled = await PaymentModel.findOne({
//     student: user._id,
//     month: nextMonth,
//     year: nextYear,
//   });

//   if (!alreadyScheduled) {
//     await PaymentModel.create({
//       student: user._id,
//       amount,
//       method: "cash", // default method for future bill
//       status: "pending",
//       month: nextMonth,
//       year: nextYear,
//     });
//   }

//   return res
//     .status(200)
//     .json(
//       new ApiResponse(
//         200,
//         { newPayment, paidStudent },
//         "Payment processed successfully."
//       )
//     );
// });

const updatePayment = asyncHandler(async (req, res) => {
  const { cnic, amount, method, roomNumber, month, year } = req.body;

  if (!cnic || !amount || !method) {
    throw new ApiError(400, "cnic, amount, and method are required.");
  }

  const user = await User.findOne({ cnic });
  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  // Validate amount
  const comingamount = Number(amount);
  if (isNaN(comingamount) || comingamount <= 0) {
    throw new ApiError(400, "Amount must be a positive number.");
  }

  // Validate method
  const validMethods = ["cash", "card", "online"];
  if (!validMethods.includes(method.toLowerCase())) {
    throw new ApiError(400, "Invalid payment method.");
  }
  const room = await Room.findOne({
    roomNumber,
  });
  if (!room) {
    throw new ApiError(404, "Room not found.");
  }

  if (String(room._id) !== String(user.roomNumber)) {
    throw new ApiError(400, "Provided room does not belong to the user.");
  }

  // Check if payment exists for the user and room

  // Check if payment exists for the user and room
  const existingPayment = await PaymentModel.findOne({
    student: user._id,
    room: room._id,
    month,
    year,
    status: { $ne: "paid" }, // only allow updates if status is NOT 'paid'
  });

  if (!existingPayment) {
    throw new ApiError(
      400,
      "Either payment does not exist or has already been paid."
    );
  }

  if (comingamount < existingPayment.amount) {
    throw new ApiError(
      400,
      `The amount is insufficient. Required amount is ${existingPayment.amount}.`
    );
  }

  const updatedPayment = await PaymentModel.findOneAndUpdate(
    { student: user._id, room: room._id, month, year },
    {
      $set: {
        amount: comingamount,
        method,
        room: room._id,
        status: "paid",
      },
    },
    { new: true }
  ).populate({ path: "student", select: "username email phone cnic" });

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedPayment, "Payment updated successfully.")
    );
});

const getPayment = asyncHandler(async (req, res) => {
  const { cnic } = req.body;

  const user = await User.findOne({ cnic });
  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  // Correct way to find payment related to the user
  const payment = await PaymentModel.findOne({ student: user._id }); // use "student" or your actual field name
  if (!payment) {
    throw new ApiError(404, "Payment not found.");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Payment fetched successfully."));
});

const getAllPayments = asyncHandler(async (req, res) => {
  const payments = await PaymentModel.find().populate({
    path: "student",
    select: "username email phone cnic",
  });
  return res
    .status(200)
    .json(new ApiResponse(200, payments, "Payments fetched successfully."));
});
const deletePayment = asyncHandler(async (req, res) => {
  const { paymentId } = req.params;

  if (!isValidObjectId(paymentId)) {
    throw new ApiError(400, "Invalid payment ID.");
  }

  const payment = await PaymentModel.findByIdAndDelete(paymentId);
  if (!payment) {
    throw new ApiError(404, "Payment not found.");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Payment deleted successfully."));
});

// const getPaidPayments = asyncHandler(async (req, res) => {
//   const paidPayments = await PaymentModel.find({
//     status: "paid",
//   })
//     .populate("student")
//     .populate("room");

//   if (!paidPayments.length) {
//     throw new ApiError(404, "No paid payments found.");
//   }

//   return res
//     .status(200)
//     .json(
//       new ApiResponse(
//         200,
//         paidPayments,
//         "All paid payments retrieved successfully."
//       )
//     );
// });

const getPaidPayments = asyncHandler(async (req, res) => {
  const filterType = req.query.filter; // "this", "before", or "after"

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  let filterQuery = { status: "paid" };

  if (filterType === "this") {
    filterQuery = {
      ...filterQuery,
      month: currentMonth,
      year: currentYear,
    };
  } else if (filterType === "before") {
    filterQuery = {
      ...filterQuery,
      $or: [
        { year: { $lt: currentYear } },
        { year: currentYear, month: { $lt: currentMonth } },
      ],
    };
  } else if (filterType === "after") {
    filterQuery = {
      ...filterQuery,
      $or: [
        { year: { $gt: currentYear } },
        { year: currentYear, month: { $gt: currentMonth } },
      ],
    };
  }

  const paidPayments = await PaymentModel.find(filterQuery).populate({
    path: "student",
    populate: [
      { path: "roomNumber", model: "Room", select: "roomNumber -_id" },
    ],
  });

  if (!paidPayments.length) {
    throw new ApiError(404, "No paid payments found for the specified filter.");
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      paidPayments, // student now includes populated roomNumber info
      `Paid payments retrieved successfully (${filterType || "all"}).`
    )
  );
});

// const getUnPaidPayments = asyncHandler(async (req, res) => {
//   const UnpaidPayments = await PaymentModel.find({
//     status: { $in: ["pending", "failed"] },
//   })
//     .populate("student")
//     .populate("room");

//   if (!UnpaidPayments.length) {
//     throw new ApiError(404, "No paid payments found.");
//   }

//   return res
//     .status(200)
//     .json(
//       new ApiResponse(
//         200,
//         UnpaidPayments,
//         "All Un-paid payments retrieved successfully."
//       )
//     );
// });
const getUnPaidPayments = asyncHandler(async (req, res) => {
  const filterType = req.query.filter; // "this", "before", or "after"

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  let filterQuery = {
    status: { $in: ["pending", "failed"] },
  };

  if (filterType === "this") {
    filterQuery = {
      ...filterQuery,
      month: currentMonth,
      year: currentYear,
    };
  } else if (filterType === "before") {
    filterQuery = {
      ...filterQuery,
      $or: [
        { year: { $lt: currentYear } },
        { year: currentYear, month: { $lt: currentMonth } },
      ],
    };
  } else if (filterType === "after") {
    filterQuery = {
      ...filterQuery,
      $or: [
        { year: { $gt: currentYear } },
        { year: currentYear, month: { $gt: currentMonth } },
      ],
    };
  }

  const unpaidPayments = await PaymentModel.find(filterQuery).populate({
    path: "student",
    populate: [
      { path: "roomNumber", model: "Room", select: "roomNumber -_id" },
    ],
  });

  if (!unpaidPayments.length) {
    throw new ApiError(
      404,
      "No unpaid payments found for the specified filter."
    );
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        unpaidPayments,
        `Unpaid payments retrieved successfully (${filterType || "all"}).`
      )
    );
});
// const refreshNextMonthPayments = asyncHandler(async (req, res) => {
//   const now = new Date();
//   const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1);
//   const nextMonth = nextMonthDate.getMonth() + 1;
//   const nextYear = nextMonthDate.getFullYear();

//   // Fetch all users who have a room assigned
//   const users = await User.find({ roomNumber: { $ne: null } }).populate(
//     "roomNumber"
//   );

//   console.log("Total users found with rooms:", users.length);
//   let createdCount = 0;

//   for (const user of users) {
//     const existing = await PaymentModel.findOne({
//       student: user._id,
//       month: nextMonth,
//       year: nextYear,
//     });

//     if (!existing) {
//       await PaymentModel.create({
//         student: user._id,
//         room: user.roomNumber._id,
//         amount: user.roomNumber.rent || 10000, // Use your actual logic
//         method: "cash",
//         status: "pending",
//         month: nextMonth,
//         year: nextYear,
//       });
//       createdCount++;
//     }
//   }

//   return res
//     .status(200)
//     .json(
//       new ApiResponse(
//         200,
//         { createdPayments: createdCount },
//         `Pending payments created for ${createdCount} users for ${nextMonth}/${nextYear}`
//       )
//     );
// });
// const exportPaymentsToExcel = asyncHandler(async (req, res) => {
//   const payments = await PaymentModel.find().populate({
//     path: "student",
//     select: "username email phone  roomNumber cnic ",
//     populate: {
//       path: "roomNumber",
//       model: "Room",
//       select: "roomNumber capacity floor isFull -_id",
//     },
//   });

//   const workbook = new ExcelJS.Workbook();
//   const worksheet = workbook.addWorksheet("Payments");

//   // Define columns
//   worksheet.columns = [
//     { header: "No", key: "no", width: 5 },
//     { header: "Student Name", key: "username", width: 20 },
//     { header: "Email", key: "email", width: 25 },
//     { header: "Phone", key: "phone", width: 15 },
//     { header: "Amount", key: "amount", width: 10 },
//     { header: "Method", key: "method", width: 10 },
//     { header: "Status", key: "status", width: 10 },
//     { header: "Month", key: "month", width: 10 },
//     { header: "Year", key: "year", width: 10 },
//     { header: "Cnic", key: "cnic", width: 10 },
//     { header: "RoomNumber", key: "roomNumber", width: 20 },
//     { header: "Floor", key: "floor", width: 10 },
//     { header: "Capacity", key: "capacity", width: 10 },
//     { header: "Full", key: "isFull", width: 10 },
//   ];

//   // Add rows
//   payments.forEach((payment, index) => {
//     worksheet.addRow({
//       no: index + 1,
//       username: payment.student?.username || "N/A",
//       email: payment.student?.email || "N/A",
//       phone: payment.student?.phone || "N/A",
//       amount: payment.amount,
//       method: payment.method,
//       status: payment.status,
//       month: payment.month,
//       year: payment.year,
//       cnic: payment.student?.cnic || "N/A",
//       roomNumber: payment.student?.roomNumber?.roomNumber || "N/A",
//       capacity: payment.student?.roomNumber?.capacity || "N/A",

//       floor: payment.student?.roomNumber?.floor || "N/A",
//       //   isFull: payment.student?.roomNumber?.isFull || "N/A",
//       isFull:
//         payment.student?.roomNumber?.isFull !== undefined
//           ? payment.student.roomNumber.isFull
//           : "N/A",
//     });
//   });

//   // Set response headers
//   res.setHeader(
//     "Content-Type",
//     "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
//   );
//   res.setHeader("Content-Disposition", "attachment; filename=payments.xlsx");

//   // Send Excel file
//   await workbook.xlsx.write(res);
//   res.end();
// });

const refreshNextMonthPayments = asyncHandler(async (req, res) => {
  const { month, year } = req.body;

  // Validate month and year
  if (!month || !year || month < 1 || month > 12 || year < 1900) {
    return res.status(400).json({
      message:
        "Invalid or missing month and/or year. Please provide valid values.",
    });
  }

  // Fetch all users who have a room assigned
  const users = await User.find({ roomNumber: { $ne: null } }).populate(
    "roomNumber"
  );

  console.log("Total users found with rooms:", users.length);
  let createdCount = 0;

  for (const user of users) {
    const existing = await PaymentModel.findOne({
      student: user._id,
      month,
      year,
    });

    if (!existing) {
      await PaymentModel.create({
        student: user._id,
        room: user.roomNumber._id,
        amount: user.roomNumber.rent || 10000, // Use your actual logic
        method: "cash",
        status: "pending",
        month,
        year,
      });
      createdCount++;
    }
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { createdPayments: createdCount },
        `Pending payments created for ${createdCount} users for ${month}/${year}`
      )
    );
});

const exportPaymentsToExcel = asyncHandler(async (req, res) => {
  const { month, year, status } = req.query;

  const filter = {};
  if (month) filter.month = parseInt(month);
  if (year) filter.year = parseInt(year);

  if (status) {
    if (status.toLowerCase() === "paid") filter.status = "paid";
    else if (
      status.toLowerCase() === "unpaid" ||
      status.toLowerCase() === "pending"
    ) {
      filter.status = "pending"; // treat pending as unpaid
    }
  }

  const payments = await PaymentModel.find(filter).populate({
    path: "student",
    select: "username email phone roomNumber cnic",
    populate: {
      path: "roomNumber",
      model: "Room",
      select: "roomNumber capacity floor isFull -_id",
    },
  });

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Payments");

  worksheet.columns = [
    { header: "No", key: "no", width: 5 },
    { header: "Student Name", key: "username", width: 20 },
    { header: "Email", key: "email", width: 25 },
    { header: "Phone", key: "phone", width: 15 },
    { header: "Amount", key: "amount", width: 10 },
    { header: "Method", key: "method", width: 10 },
    { header: "Status", key: "status", width: 10 },
    { header: "Month", key: "month", width: 10 },
    { header: "Year", key: "year", width: 10 },
    { header: "Cnic", key: "cnic", width: 10 },
    { header: "RoomNumber", key: "roomNumber", width: 20 },
    { header: "Floor", key: "floor", width: 10 },
    { header: "Capacity", key: "capacity", width: 10 },
    { header: "Full", key: "isFull", width: 10 },
  ];

  payments.forEach((payment, index) => {
    worksheet.addRow({
      no: index + 1,
      username: payment.student?.username || "N/A",
      email: payment.student?.email || "N/A",
      phone: payment.student?.phone || "N/A",
      amount: payment.amount,
      method: payment.method,
      status: payment.status === "paid" ? "Paid" : "Unpaid",
      month: payment.month,
      year: payment.year,
      cnic: payment.student?.cnic || "N/A",
      roomNumber: payment.student?.roomNumber?.roomNumber || "N/A",
      capacity: payment.student?.roomNumber?.capacity || "N/A",
      floor: payment.student?.roomNumber?.floor || "N/A",
      isFull:
        payment.student?.roomNumber?.isFull !== undefined
          ? payment.student.roomNumber.isFull
          : "N/A",
    });
  });

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", "attachment; filename=payments.xlsx");

  await workbook.xlsx.write(res);
  res.end();
});

export {
  // createPayment,
  updatePayment,
  getPayment,
  getAllPayments,
  deletePayment,
  getPaidPayments,
  getUnPaidPayments,
  refreshNextMonthPayments,
  exportPaymentsToExcel,
};
