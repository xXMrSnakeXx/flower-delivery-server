import { Schema, model, type InferSchemaType } from 'mongoose';

const shopSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
  },
  {
    timestamps: true,
    toJSON: { versionKey: false },
    toObject: { versionKey: false },
  }
);

shopSchema.index({ name: 1 });

export type Shop = InferSchemaType<typeof shopSchema>;
export const ShopModel = model<Shop>('Shop', shopSchema);
