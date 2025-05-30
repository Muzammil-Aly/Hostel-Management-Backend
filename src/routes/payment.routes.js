import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import {
  // createPayment,
  deletePayment,
  exportPaymentsToExcel,
  getAllPayments,
  getPaidPayments,
  getPayment,
  getUnPaidPayments,
  refreshNextMonthPayments,
  updatePayment,
} from "../controllers/payment.controller.js";

const router = Router();

router.route("/updatePayment").post(verifyJwt, updatePayment);
router.route("/getAllPayments").get(verifyJwt, getAllPayments);
router.route("/getPayment/:paymentId").get(verifyJwt, getPayment);
router.route("/deletePayment/:paymentId").delete(verifyJwt, deletePayment);
router.route("/getUnPaidPayments").get(verifyJwt, getUnPaidPayments);
router.route("/getPaidPayments").get(verifyJwt, getPaidPayments);
router.route("/getPayment").get(verifyJwt, getPayment);

router
  .route("/refreshNextMonthPayments")
  .post(verifyJwt, refreshNextMonthPayments);

router.get("/exportPaymentsToExcel", exportPaymentsToExcel);

export default router;
