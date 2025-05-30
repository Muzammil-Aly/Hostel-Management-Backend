import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

const corsOptions = {
  origin: process.env.CORS_ORIGIN || "http://localhost:8002",
  credentials: true,
};

app.use(cors(corsOptions));
app.options("/*", cors(corsOptions));

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

app.use(express.static("public"));
app.use(cookieParser());

// your routes
import userRouter from "./routes/user.routes.js";
import roomRouter from "./routes/room.routes.js";
import paymentRouter from "./routes/payment.routes.js";

app.use("/api/v1/users", userRouter);
app.use("/api/v1/room", roomRouter);
app.use("/api/v1/payment", paymentRouter);

import globalErrorHandler from "./utils/errorHandler.js";
app.use(globalErrorHandler);

export { app };
