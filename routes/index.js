import express from 'express';
import products from './products';
import filter from './filter';
import admin from './admin';
import cart from "./cart";


const router = express.Router();

router.use('/products', products);
router.use('/filter', filter);
router.use('/admin', admin);
router.use('/cart', cart);

export default router;
