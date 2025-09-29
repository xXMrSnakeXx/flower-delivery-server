import { Schema, model, type InferSchemaType } from 'mongoose';
import { PHONE_REGEX, NAME_REGEX, ADDRESS_REGEX } from '../utils/validation.js';

const normalizeEmail = (v?: string) =>
  typeof v === 'string' ? v.trim().toLowerCase() : v;

const normalizePhone = (v?: string) =>
  typeof v === 'string' ? v.replace(/\s+/g, '').replace(/-/g, '').trim() : v;

const customerSchema = new Schema(
  {
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
      set: normalizeEmail,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please enter a valid email address',
      ],
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      set: normalizePhone,
      validate: {
        validator: (v: string) => PHONE_REGEX.test(v),
        message:
          'Enter a valid phone number (e.g., 063 123 45 67)',
      },
    },
    defaultAddress: {
      type: String,
      trim: true,
      validate: {
        validator: (v: string) =>
          v === undefined || v === '' || ADDRESS_REGEX.test(v),
        message:
          'Address can only contain letters, numbers, spaces, and basic punctuation',
      },
    },
    lastSeenAt: { type: Date, default: () => new Date() },
    timezone: { type: String, default: 'Europe/Kyiv' },
  },
  {
    timestamps: true,
    toJSON: { versionKey: false },
    toObject: { versionKey: false },
  }
);

customerSchema.index({ email: 1, phone: 1 }, { unique: true });

export type Customer = InferSchemaType<typeof customerSchema>;
export const CustomerModel = model<Customer>('Customer', customerSchema);
