import nodemailer from "nodemailer";
import userModel from "../models/userModel.js";
import { getProductInterestGroup } from "./productInterestService.js";
import "dotenv/config";

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
}[character]));

const trustedHttpsUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
};

export const sendProductLaunchEmails = async (product) => {
  if (product.publicationStatus !== "published") return 0;
  const interest = await getProductInterestGroup(product);
  if (!interest) return 0;

  const users = await userModel.find({
    isVerified: true,
    productInterests: interest,
    email: { $type: "string", $ne: "" },
  }).select("name email");
  if (users.length === 0) return 0;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  const frontendUrl = trustedHttpsUrl(process.env.FRONTEND_URL) || "https://karkelly.site/";
  const logoUrl = trustedHttpsUrl(process.env.BRAND_LOGO_URL);
  const productUrl = new URL(`/products/${encodeURIComponent(String(product._id))}`, frontendUrl).href;
  const imageUrl = trustedHttpsUrl(product.images?.[0]?.url);
  const safeName = escapeHtml(product.name);
  const subjectName = String(product.name).replace(/[\r\n]+/g, " ").slice(0, 200);
  const safeDescription = escapeHtml(product.description);
  const logo = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="KarKelly" width="148" style="display:block;max-width:148px;height:auto;margin:0 auto 24px;">`
    : `<div style="font-size:24px;font-weight:700;color:#172554;margin-bottom:24px;">KarKelly</div>`;
  const productImage = imageUrl
    ? `<img src="${escapeHtml(imageUrl)}" alt="${safeName}" style="display:block;width:100%;max-width:520px;height:auto;border-radius:12px;margin:0 auto 24px;">`
    : "";
  const html = `
    <div style="background:#f3f4f6;padding:32px 12px;font-family:Arial,sans-serif;color:#172033;">
      <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;padding:32px 24px;text-align:center;">
        ${logo}
        <p style="margin:0 0 8px;color:#64748b;font-size:13px;text-transform:uppercase;letter-spacing:1px;">Picked for you</p>
        <h1 style="margin:0 0 20px;font-size:28px;line-height:1.25;">Something new in ${escapeHtml(interest === "school-supplies" ? "Books & Stationery" : interest)}</h1>
        ${productImage}
        <h2 style="margin:0 0 12px;font-size:22px;">${safeName}</h2>
        <p style="margin:0 auto 24px;max-width:480px;color:#475569;line-height:1.6;">${safeDescription}</p>
        <p style="font-size:20px;font-weight:700;margin:0 0 24px;">RWF ${escapeHtml(Number(product.price).toLocaleString("en-RW"))}</p>
        <a href="${escapeHtml(productUrl)}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:14px 24px;border-radius:8px;font-weight:700;">Explore the product</a>
        <p style="margin:28px 0 0;color:#94a3b8;font-size:12px;">You’re receiving this because you added or purchased something in this category.</p>
      </div>
    </div>`;

  const results = await Promise.allSettled(users.map((user) => transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: `New in ${interest === "school-supplies" ? "Books & Stationery" : interest}: ${subjectName}`,
    html: `<p>Hello ${escapeHtml(user.name || "there")},</p>${html}`,
  })));
  const failed = results.filter((result) => result.status === "rejected");
  if (failed.length) {
    console.error(`Product launch email delivery failed for ${failed.length} recipient(s).`);
  }
  return results.length - failed.length;
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
