import { Schema, model, type InferSchemaType } from 'mongoose';

const productSchema = new Schema(
  {
    shopId: {
      type: Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    priceCents: {
      type: Number,
      required: true,
      min: 0,
      index: true,
      validate: {
        validator: Number.isInteger,
        message: 'priceCents must be an integer amount in cents',
      },
    },
    imageUrl: { type: String, default: 'https://placehold.co/600x400' },
    isBouquet: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { versionKey: false },
    toObject: { versionKey: false },
  }
);

productSchema.index({ shopId: 1, createdAt: -1 });
productSchema.index({ shopId: 1, priceCents: 1 });

export type Product = InferSchemaType<typeof productSchema>;
export const ProductModel = model<Product>('Product', productSchema);
