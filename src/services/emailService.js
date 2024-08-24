import nodemailer from 'nodemailer';
import userModel from '../models/userModel';
import 'dotenv/config';

export const sendProductCreationEmail = async (productName, productImageUrl) => {
  try {
    const users = await userModel.find({}, 'email');
    const emails = users.map(user => user.email);

    let transporter = nodemailer.createTransport({
      service: 'gmail',
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    let mailOptions = {
      from: process.env.EMAIL_USER,
      to: emails.join(','),
      subject: 'New Product Created!',
      html: `
      <p>A new product named <strong>${productName}</strong> has been added to our store.</p>
      <img src="${productImageUrl}" alt="${productName}" style="width: 300px; height: auto;"/>
    `,
    };

    await transporter.sendMail(mailOptions);
    console.log('Emails sent successfully!');
  } catch (error) {
    console.error('Error sending emails:', error);
  }
};
