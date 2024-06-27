import * as userService from '../services/userService';

export const getAllUsers = async (req, res) => {
    try {
        const userList = await userService.getAllUsers();
        res.send(userList);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

export const getUserById = async (req, res) => {
    try {
        const user = await userService.getUserById(req.params.id);
        res.send(user);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

export const createUser = async (req, res) => {
    try {
        const user = await userService.createUser(req.body);
        res.send(user);
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
}

export const updateUser = async (req, res) => {
    try {
        const user = await userService.updateUser(req.params.id, req.body);
        res.send(user);
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
}

export const deleteUser = async (req, res) => {
    try {
        const user = await userService.deleteUser(req.params.id);
        if (user) {
            res.status(200).json({ success: true, message: 'The user is deleted!' });
        } else {
            res.status(404).json({ success: false, message: 'User not found!' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

export const getUserCount = async (req, res) => {
    try {
        const userCount = await userService.getUserCount();
        res.send({ userCount });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}
