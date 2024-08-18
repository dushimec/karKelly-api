import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    shippingInfo: {
      address: {
        type: String,
        required: [true, "address is required"],
      },
      city: {
        type: String,
        required: [true, "city name is required"],
      },
    },
    orderItems: [
      {
        name: {
          type: String,
          required: [true, "product name is required"],
        },
        price: {
          type: Number,
          required: [true, "product price is required"],
        },
        quantity: {
          type: Number,
          required: [true, "product quantity is required"],
        },
        image: {
          type: String,
          required: [true, "product image is required"],
        },
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Products",
          required: true,
        },
      },
    ],
    paymentMethod: {
      type: String,
      enum: ["MTN MOMO", "CARD"],
      default: "MTN",
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "user id is required"],
    },
    paidAt: Date,
    paymentInfo: {
      id: String,
      status: String,
    },
    itemPrice: {
      type: Number,
      required: [true, "item price is required"],
    },
    totalAmount: {
      type: Number,
      required: false,
    },
    orderStatus: {
      type: String,
      enum: ["processing", "shipped", "delivered", "canceled"],
      default: "processing",
    },
    deliveredAt: Date,  
    shippedAt: Date,     
    canceledAt: Date,    
  },
  { timestamps: true }
);

export const orderModel = mongoose.model("Orders", orderSchema);
export default orderModel;
