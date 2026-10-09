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
  const userId = order.user?._id || order.user;
  const user = await userModel.findById(userId).select("name email");
  if (!user?.email) throw new Error("Order customer has no email address");
  const html = orderEmailHtml(order, user);
  await createMailer().sendMail({
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: `KarKelly order received - ${order._id}`,
    html,
  });
};

const createMailer = () => nodemailer.createTransport({
  service: "gmail",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const orderEmailHtml = (order, customer) => {
  const items = order.orderItems.map((item) => {
    const imageUrl = trustedHttpsUrl(item.image);
    const image = imageUrl
      ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(item.name)}" width="88" style="width:88px;height:88px;object-fit:cover;border-radius:8px;">`
      : "";
    return `
      <tr>
        <td style="padding:12px;border-bottom:1px solid #e2e8f0;">${image}</td>
        <td style="padding:12px;border-bottom:1px solid #e2e8f0;">
          <strong>${escapeHtml(item.name)}</strong><br>
          Quantity: ${escapeHtml(item.quantity)}
        </td>
        <td style="padding:12px;border-bottom:1px solid #e2e8f0;text-align:right;">
          RWF ${escapeHtml(Number(item.price).toLocaleString("en-RW"))}
        </td>
      </tr>`;
  }).join("");
  const address = order.shippingInfo || {};
  const logoUrl = trustedHttpsUrl(process.env.BRAND_LOGO_URL);
  const logo = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="KarKelly" width="140" style="display:block;height:auto;margin:0 auto 20px;">`
    : `<strong style="display:block;font-size:24px;margin-bottom:20px;">KarKelly</strong>`;

  return `
    <div style="background:#f1f5f9;padding:24px;font-family:Arial,sans-serif;color:#172033;">
      <div style="max-width:680px;margin:auto;background:#fff;border-radius:12px;padding:24px;">
        <div style="text-align:center;">${logo}</div>
        <h1 style="font-size:24px;">Order received</h1>
        <p>Hello ${escapeHtml(customer.name || "Customer")}, your order has been recorded.</p>
        <p><strong>Order:</strong> ${escapeHtml(order._id)}<br>
        <strong>Date:</strong> ${escapeHtml(new Date(order.createdAt).toLocaleString())}<br>
        <strong>Status:</strong> ${escapeHtml(order.orderStatus || "processing")}<br>
        <strong>Payment method:</strong> ${escapeHtml(order.paymentMethod || "MTN")}</p>
        <h2 style="font-size:18px;">Items</h2>
        <table style="width:100%;border-collapse:collapse;"><tbody>${items}</tbody></table>
        <p style="text-align:right;font-size:18px;"><strong>Total: RWF ${escapeHtml(Number(order.totalAmount).toLocaleString("en-RW"))}</strong></p>
        <h2 style="font-size:18px;">Delivery details</h2>
        <p>${escapeHtml(address.address)}<br>${escapeHtml(address.city)}, ${escapeHtml(address.country)}</p>
      </div>
    </div>`;
};

export const sendAdminOrderEmail = async (order) => {
  const recipients = (process.env.ORDER_NOTIFICATION_EMAILS ||
    "ndayiyasoni@gmail.com,musany89@gmail.com")
    .split(",")
    .map((email) => email.trim())
    .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
  if (!recipients.length) throw new Error("No valid order notification email recipients are configured");
  const customer = await userModel.findById(order.user?._id || order.user).select("name email phone");
  const html = orderEmailHtml(order, customer || {});
  const mailer = createMailer();
  const deliveries = await Promise.allSettled(recipients.map((email) => mailer.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: `New KarKelly order - ${order._id}`,
    html,
  })));
  const failed = deliveries.filter((delivery) => delivery.status === "rejected");
  if (failed.length) {
    throw new Error(`Order email failed for ${failed.length} of ${recipients.length} configured recipient(s)`);
  }
  return recipients.length;
};
