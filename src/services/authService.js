import { User } from '../models/user';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const loginUser = async (data) => {
    const user = await User.findOne({ email: data.email });
    const secret = process.env.secret;
    if (!user) {
        throw new Error('The user not found');
    }

    if (user && bcrypt.compareSync(data.passwordHash, user.passwordHash)) {
        const token = jwt.sign(
            {
                userId: user.id,
                isAdmin: user.isAdmin
            },
            secret,
            { expiresIn: '1d' }
        );
        return { user: user.email, token: token };
    } else {
        throw new Error('Password is wrong');
    }
}

export const registerUser = async (data) => {
    let user = new User({
        name: data.name,
        email: data.email,
        passwordHash: bcrypt.hashSync(data.passwordHash, 10),
        phone: data.phone,
        isAdmin: data.isAdmin,
    });
    user = await user.save();

    return user;
}
