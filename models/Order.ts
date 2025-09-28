import { Schema, model, type InferSchemaType } from 'mongoose';
import { PHONE_REGEX, NAME_REGEX, ADDRESS_REGEX } from '../utils/validation.js';

const orderItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true, trim: true },
    qty: { type: Number, required: true, min: 1 },
    priceCents: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const orderSchema = new Schema(
  {
    customer: {
      name: {
        type: String,
        trim: true,
        validate: {
          validator: (v: string) =>
            v === undefined || v === '' || NAME_REGEX.test(v),
          message:
            'Name can only contain letters, spaces, apostrophes and hyphens',
        },
      },
      email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
      },
      phone: {
        type: String,
        required: true,
        trim: true,
        validate: {
          validator: (v: string) => PHONE_REGEX.test(v),
          message:
            'Please enter a valid phone number (7-20 digits, may include +, -, spaces, parentheses)',
        },
      },
      timezone: {
        type: String,
        default: 'Europe/Kyiv',
        trim: true,
      },
    },
    shopId: {
      type: Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
      index: true,
    },
    delivery: {
      address: {
        type: String,
        required: true,
        trim: true,
        validate: {
          validator: (v: string) => ADDRESS_REGEX.test(v),
          message:
            'Address can only contain letters, numbers, spaces, and basic punctuation',
        },
      },
    },
    items: {
      type: [orderItemSchema],
      validate: {
        validator: (v: unknown[]) => Array.isArray(v) && v.length > 0,
        message: 'At least one item is required',
      },
    },
    totalCents: { type: Number, required: true, min: 0 },
    status: { type: String, default: 'created', index: true },

    clientCreatedAt: { type: String, default: undefined },
    customerTimeZone: { type: String, default: undefined, index: true },
    customerOffsetMinutes: { type: Number, default: undefined },
  },
  {
    timestamps: true,
    toJSON: { versionKey: false },
    toObject: { versionKey: false },
  }
);

orderSchema.index({ 'customer.email': 1, 'customer.phone': 1, createdAt: -1 });
orderSchema.index({ shopId: 1, createdAt: -1 });

export type Order = InferSchemaType<typeof orderSchema>;
export const OrderModel = model<Order>('Order', orderSchema);
