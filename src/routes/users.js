import express from 'express';
import * as userController from '../controllers/userController';

const usersRoutes = express.Router();

usersRoutes.get('/', userController.getAllUsers);
usersRoutes.get('/:id', userController.getUserById);
usersRoutes.post('/', userController.createUser);
usersRoutes.put('/:id', userController.updateUser);
usersRoutes.delete('/:id', userController.deleteUser);
usersRoutes.get('/get/count', userController.getUserCount);

export default usersRoutes;
