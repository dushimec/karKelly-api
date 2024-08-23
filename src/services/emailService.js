import nodemailer from 'nodemailer';
import userModel from '../models/userModel';
import 'dotenv/config'

export const sendProductCreationEmail = async (productName) => {
  try {
    const users = await userModel.find({}, 'email');
    const emails = users.map(user => user.email);

    let transporter = nodemailer.createTransport({
      service: 'gmail',
      port:465,
      secure:true,
      logger:true,
      debug:true,
      secureConnection:false,
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
    `,
    };

    await transporter.sendMail(mailOptions);
    console.log('Emails sent successfully!');
  } catch (error) {
    console.error('Error sending emails:', error);
  }
};
