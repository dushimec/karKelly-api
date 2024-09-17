import userModel from "../models/userModel.js";
import cloudinary from "cloudinary";
import { getDataUri } from "../utils/features.js";

import crypto from "crypto";
import nodemailer from "nodemailer";


export const registerUser = async (userData, file) => {
  const { name, email, password, address, phone } = userData;

  if (!name || !email || !password || !address || !phone) {
    throw new Error("Please Provide All Fields");
  }

  const existingUser = await userModel.findOne({ email });

  if (existingUser) {
    throw new Error("Email already taken");
  }

  const dataUri = getDataUri(file);
  const cdb = await cloudinary.v2.uploader.upload(dataUri.content);
  const image = {
    public_id: cdb.public_id,
    url: cdb.secure_url,
  };

  
  const verificationToken = crypto.randomBytes(32).toString("hex");

  const user = await userModel.create({
    name,
    email,
    password,
    address,
    phone,
    profilePic: [image],
    verificationToken,
  });

  await user.save();

  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
  await sendVerificationEmail(user.email, verificationUrl);

  return user;
};


const sendVerificationEmail = async (email, verificationUrl) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Email Verification",
    html: `<p>Please verify your email by clicking on the link below:</p><a href="${verificationUrl}">Verify Email</a>`,
  };

  await transporter.sendMail(mailOptions);
};


export const loginUser = async (email, password) => {
  if (!email || !password) {
    throw new Error("Please Add Email OR Password");
  }

  const user = await userModel.findOne({ email });

  if (!user) {
    throw new Error("User Not Found");
  }

  if (!user.isVerified) {
    throw new Error("Please verify your email before logging in.");
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
      secure: false,
      httpOnly: true,
      sameSite: "strict",
    },
  };
};

export const updateUserProfile = async (userId, userData) => {
  const user = await userModel.findById(userId);
  const { name, email, address, phone } = userData;

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

export const resetUserPassword = async (email, newPassword) => {
  if (!email || !newPassword) {
    throw new Error("Please Provide All Fields");
  }

  const user = await userModel.findOne({ email });

  if (!user) {
    throw new Error("Invalid user or answer");
  }

  user.password = newPassword;
  await user.save();
};

export const getAllUsers = async () => {
  return await userModel.find().select("-password");
};

export const verifyEmail = async (token) => {
  if (!token) {
    throw new Error("Verification token is required.");
  }

  const user = await userModel.findOne({ verificationToken: token });

  if (!user) {
    throw new Error("Invalid or expired verification token.");
  }

  
  const tokenExpiration = 24 * 60 * 60 * 1000; 
  if (Date.now() - user.tokenIssuedAt > tokenExpiration) {
    throw new Error("Verification token has expired.");
  }

  user.isVerified = true;
  user.verificationToken = undefined;
  await user.save();

  return user;
};
