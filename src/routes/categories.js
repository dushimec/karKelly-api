import express from 'express';
import * as categoryController from '../controllers/categoryController';

const categoryRoutes = express.Router();

categoryRoutes.get('/', categoryController.getAllCategories);
categoryRoutes.get('/:id', categoryController.getCategoryById);
categoryRoutes.post('/createCategory', categoryController.createCategory);
categoryRoutes.put('/:id', categoryController.updateCategory);
categoryRoutes.delete('/:id', categoryController.deleteCategory);

export default categoryRoutes;
