import userModel from "../models/userModel.js";
import cloudinary from "cloudinary";
import { getDataUri } from "../utils/features.js";

export const registerUser = async (userData) => {
  const { name, email, password, address,  phone, } = userData;

  if (!name || !email || !password || !address || !phone  ) {
    throw new Error("Please Provide All Fields");
  }

  const existingUser = await userModel.findOne({ email });

  if (existingUser) {
    throw new Error("Email already taken");
  }

  return await userModel.create({
    name,
    email,
    password,
    address,
    phone,
  });
};

export const loginUser = async (email, password) => {
  if (!email || !password) {
    throw new Error("Please Add Email OR Password");
  }

  const user = await userModel.findOne({ email });

  if (!user) {
    throw new Error("User Not Found");
  }

  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    throw new Error("Invalid credentials");
  }

  const token = user.generateToken();
  return { user, token };
};

export const getUserProfile = async (userId) => {
  const user = await userModel.findById(userId);
  user.password = undefined;
  return user;
};

export const logoutUser = () => {
  return {
    token: "",
    options: {
      expires: new Date(Date.now()),
      secure: process.env.NODE_ENV === "development" ? true : false,
      httpOnly: process.env.NODE_ENV === "development" ? true : false,
      sameSite: process.env.NODE_ENV === "development" ? true : false,
    }
  };
};

export const updateUserProfile = async (userId, userData) => {
  const user = await userModel.findById(userId);
  const { name, email, address,  phone } = userData;

  if (name) user.name = name;
  if (email) user.email = email;
  if (address) user.address = address;
  if (phone) user.phone = phone;

  await user.save();
  return user;
};

export const updateUserPassword = async (userId, oldPassword, newPassword) => {
  const user = await userModel.findById(userId);

  if (!oldPassword || !newPassword) {
    throw new Error("Please provide old or new password");
  }

  const isMatch = await user.comparePassword(oldPassword);

  if (!isMatch) {
    throw new Error("Invalid Old Password");
  }

  user.password = newPassword;
  await user.save();
};

export const updateUserProfilePic = async (userId, file) => {
  const user = await userModel.findById(userId);
  const dataUri = getDataUri(file);

  await cloudinary.v2.uploader.destroy(user.profilePic.public_id);

  const cdb = await cloudinary.v2.uploader.upload(dataUri.content);
  user.profilePic = {
    public_id: cdb.public_id,
    url: cdb.secure_url,
  };

  await user.save();
};

export const resetUserPassword = async (email, newPassword, answer) => {
  if (!email || !newPassword || !answer) {
    throw new Error("Please Provide All Fields");
  }

  const user = await userModel.findOne({ email, answer });

  if (!user) {
    throw new Error("Invalid user or answer");
  }

  user.password = newPassword;
  await user.save();
};
