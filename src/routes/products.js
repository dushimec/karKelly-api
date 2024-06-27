import express from 'express';
import multer from 'multer';
import * as productController from '../controllers/productController';

const productsRoutes = express.Router();

const FILE_TYPE_MAP = {
    'image/png': 'png',
    'image/jpeg': 'jpeg',
    'image/jpg': 'jpg'
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const isValid = FILE_TYPE_MAP[file.mimetype];
        let uploadError = new Error('invalid image type');

        if (isValid) {
            uploadError = null;
        }
        cb(uploadError, 'public/uploads');
    },
    filename: function (req, file, cb) {
        const fileName = file.originalname.split(' ').join('-');
        const extension = FILE_TYPE_MAP[file.mimetype];
        cb(null, `${fileName}-${Date.now()}.${extension}`);
    }
});

const uploadOptions = multer({ storage: storage });

productsRoutes.get('/', productController.getAllProducts);
productsRoutes.get('/:id', productController.getProductById);
productsRoutes.post('/add', uploadOptions.single('image'), productController.createProduct);
productsRoutes.put('/:id', productController.updateProduct);
productsRoutes.delete('/:id', productController.deleteProduct);
productsRoutes.get('/get/count', productController.getProductCount);
productsRoutes.get('/get/featured/:count', productController.getFeaturedProducts);
productsRoutes.put('/gallery-images/:id', uploadOptions.array('images', 10), productController.updateProductGallery);

export default productsRoutes;
