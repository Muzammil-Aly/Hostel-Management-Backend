import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import {
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
} from "../controllers/room.controller.js";
const router = Router();

router.route("/createRoom").post(createRoom);
router.route("/getAllRooms").get(getAllRooms);
router.route("/getRoomById/:roomId").get(getRoomById);
router.route("/getRoomByNumber/:roomNumber").get(getRoomByNumber);
router.route("/updateRoom/:roomId").patch(verifyJwt, updateRoom);
router.route("/deleteRoom/:roomId").delete(verifyJwt, deleteRoom);
router.route("/assignRoom/:roomId").patch(assignRoom);
router.route("/getRoomOccupants/:roomId").get(getRoomOccupants);
router.route("/updateOccupants/:roomId").patch(updateOccupants);

router.route("/assignRoomByNumber/:roomNumber").patch(assignRoomByNumber);

export default router;
