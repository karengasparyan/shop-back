import express from 'express';
import FilterController from "../controllers/FilterController";
import authorization from "../middlewares/authorization";

const router = express.Router();

router.get('/price', FilterController.getPriceMinMax);

router.get('/list', FilterController.getSidebarList);

router.get('/get-sidebar-titles', FilterController.getSidebarTitles);

router.post('/create-update-sidebar-title', authorization, FilterController.createUpdateSidebarTitles);


export default router
