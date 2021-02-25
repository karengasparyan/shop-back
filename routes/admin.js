import express from 'express';
import SignController from "../controllers/SignController";


const router = express.Router();

router.post('/sign-in', SignController.signIn);


export default router
