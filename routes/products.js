import express from 'express';
import ProductsController from "../controllers/ProductsController";
import multer, { memoryStorage } from "multer";
import authorization from "../middlewares/authorization";
import CartController from "../controllers/CartController";

const router = express.Router();


router.get('/', ProductsController.list);

router.post('/single-product', ProductsController.singleProduct);

router.post('/create-product', authorization, ProductsController.createProduct);

router.post('/update-product', authorization, ProductsController.updateProduct);

router.post('/delete-product', authorization, ProductsController.deleteProduct);

router.get('/attributes-list', authorization, ProductsController.getAttributesList);

const upload2 = multer({ storage: memoryStorage() });

router.post('/upload-image', authorization, upload2.array('file[]'), ProductsController.uploadImage);

router.post('/upload-sidebar-image', authorization, upload2.array('file[]'), ProductsController.uploadSliderImage);

router.get('/slider-images-list', ProductsController.getSliderImages);

router.post('/update-slider-image-desc',  authorization, ProductsController.updateSliderImagesDesc);

router.get('/catalog-list', ProductsController.getCatalogList);


export default router;
