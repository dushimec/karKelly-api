import { User } from '../models/user';
import bcrypt from 'bcryptjs';

export const getAllUsers = async () => {
    return await User.find().select('-passwordHash');
}

export const getUserById = async (userId) => {
    return await User.findById(userId).select('-passwordHash');
}

export const createUser = async (data) => {
    let user = new User({
        name: data.name,
        email: data.email,
        passwordHash: bcrypt.hashSync(data.password, 10),
        phone: data.phone,
        isAdmin: data.isAdmin,
    });
    user = await user.save();
    return user;
}

export const updateUser = async (userId, data) => {
    const userExist = await User.findById(userId);
    let newPassword = data.password ? bcrypt.hashSync(data.password, 10) : userExist.passwordHash;

    const user = await User.findByIdAndUpdate(
        userId,
        {
            name: data.name,
            email: data.email,
            passwordHash: newPassword,
            phone: data.phone,
            isAdmin: data.isAdmin,
            street: data.street,
            apartment: data.apartment,
            city: data.city,
            
        },
        { new: true }
    );
    return user;
}

export const deleteUser = async (userId) => {
    return await User.findByIdAndRemove(userId);
}

export const getUserCount = async () => {
    return await User.countDocuments();
}
