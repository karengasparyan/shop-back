import express from 'express';
import CartController from "../controllers/CartController";
import authorization from "../middlewares/authorization";

const router = express.Router();

router.get('/list', CartController.cartList);

router.post('/create-order', CartController.createOrder);

router.get('/order-list', authorization, CartController.orderList);

router.post('/update-order-status', authorization, CartController.updateOrderStatus);

export default router;
