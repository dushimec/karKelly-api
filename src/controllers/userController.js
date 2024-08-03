import * as userService from '../services/userService.js';

export const registerController = async (req, res) => {
  try {
    const user = await userService.registerUser(req.body);
    res.status(201).send({
      success: true,
      message: "Registration Success, please login",
      user,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: error.message || "Error In Register API",
    });
  }
};

export const loginController = async (req, res) => {
  try {
    const { email, password } = req.body;
    const { user, token } = await userService.loginUser(email, password);

    res.status(200).cookie("token", token, {
      expires: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), 
      secure: false, 
      httpOnly: true, 
      sameSite: "strict", 
    }).send({
      success: true,
      message: "Login Successfully",
      token,
      user,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: "false",
      message: error.message || "Error In Login API",
    });
  }
};

export const getUserProfileController = async (req, res) => {
  try {
    const user = await userService.getUserProfile(req.user._id);
    res.status(200).send({
      success: true,
      message: "User Profile Fetched Successfully",
      user,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: error.message || "Error In Profile API",
    });
  }
};

export const logoutController = async (req, res) => {
  try {
    const { token, options } = userService.logoutUser();
    res.status(200).cookie("token", token, options).send({
      success: true,
      message: "Logout Successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: error.message || "Error In Logout API",
    });
  }
};

export const updateProfileController = async (req, res) => {
  try {
    await userService.updateUserProfile(req.user._id, req.body);
    res.status(200).send({
      success: true,
      message: "User Profile Updated",
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: error.message || "Error In Update Profile API",
    });
  }
};

export const udpatePasswordController = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    await userService.updateUserPassword(req.user._id, oldPassword, newPassword);
    res.status(200).send({
      success: true,
      message: "Password Updated Successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: error.message || "Error In Update Password API",
    });
  }
};

export const updateProfilePicController = async (req, res) => {
  try {
    await userService.updateUserProfilePic(req.user._id, req.file);
    res.status(200).send({
      success: true,
      message: "Profile picture updated",
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: error.message || "Error In Update Profile Pic API",
    });
  }
};

export const passwordResetController = async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    await userService.resetUserPassword(email, newPassword);
    res.status(200).send({
      success: true,
      message: "Your Password Has Been Reset Please Login !",
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: error.message || "Error In Password Reset API",
    });
  }
};
