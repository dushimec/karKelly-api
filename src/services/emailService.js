import nodemailer from "nodemailer";
import userModel from "../models/userModel.js";
import "dotenv/config";

export const sendProductCreationEmail = async (
  productName,
  productImageUrl
) => {
  try {
    const users = await userModel.find({}, "email");
    const emails = users.map((user) => user.email);

    let transporter = nodemailer.createTransport({
      service: "gmail",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    let mailOptions = {
      from: process.env.EMAIL_USER,
      to: emails.join(","),
      subject: "New Product Created!",
      html: `
      <p>A new product named <strong>${productName}</strong> has been added to our store.</p>
      <img src="${productImageUrl}" alt="${productName}" style="width: 300px; height: auto;"/>
    `,
    };

    await transporter.sendMail(mailOptions);
    console.log("Emails sent successfully!");
  } catch (error) {
    console.error("Error sending emails:", error);
  }
};

export const sendReceiptEmail = async (order) => {
  try {
    const user = await userModel.findById(order.user._id);
    const email = user.email;
    const productDetails = order.orderItems
      .map(
        (item) => `
      <p>${item.product.name} - Quantity: ${item.quantity} - Price: ${item.price}</p>
    `
      )
      .join("");

    const orderDateTime = new Date(order.createdAt).toLocaleString();

    let transporter = nodemailer.createTransport({
      service: "gmail",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    let mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Inyemeza bwishyu",
      html: `
        <h2>Murakoze kuri order yanyu!</h2>
        <p>Itariki n'igihe cy'itangwa rya order: ${orderDateTime}</p>
        <p>Total Amount: ${order.totalAmount}</p>
        <h3>Ibicuruzwa:</h3>
        ${productDetails}
       <p>Turabashimira kubwo ku tugurira kandi turifuza ko mwishimira ibyo mwaguze!,</p>
       <p>Ikitonderwa mwihutire kwishyura kuko order imaze iminsi 2 itishyuwe duhita tuyihagarika, Murakoze.</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log("Receipt email sent successfully!");
  } catch (error) {
    console.error("Error sending receipt email:", error);
  }
};
