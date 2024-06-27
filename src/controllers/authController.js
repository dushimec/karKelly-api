import * as authService from '../services/authService';

export const loginUser = async (req, res) => {
    try {
        const result = await authService.loginUser(req.body);
        res.status(200).send(result);
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
}

export const registerUser = async (req, res) => {
    try {
        const user = await authService.registerUser(req.body);
        res.send(user);
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
}
