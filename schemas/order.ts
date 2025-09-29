import Joi from 'joi';
import { PHONE_REGEX, NAME_REGEX, ADDRESS_REGEX } from '../utils/validation.js';

export type OrderItemInput = { productId: string; qty: number };
export type ProductsQuery = { sort: 'price' | 'date'; order: 'asc' | 'desc' };
export const productsQuerySchema = Joi.object<ProductsQuery>({
  sort: Joi.string().valid('price', 'date').default('date'),
  order: Joi.string().valid('asc', 'desc').default('desc'),
});

export type ShopParams = { id: string };
export const shopParamsSchema = Joi.object<ShopParams>({
  id: Joi.string().hex().length(24).required(),
});

export type OrdersBulkInfoInput = {
  orderIds: string | string[];
};

export const ordersBulkInfoSchema = Joi.object<OrdersBulkInfoInput>({
  orderIds: Joi.alternatives()
    .try(
      Joi.string().hex().length(24).required(),
      Joi.array()
        .items(Joi.string().hex().length(24).required())
        .min(1)
        .required()
    )
    .required(),
});

export type OrderInput = {
  name?: string;
  email: string;
  phone: string;
  address: string;
  shopId: string | string[];
  items: { productId: string; qty: number }[];
  customerTimezone?: string;
  clientCreatedAt?: string;
  customerOffsetMinutes?: number;
};

export const orderSchema = Joi.object<OrderInput>({
  name: Joi.string().trim().pattern(NAME_REGEX).optional().messages({
    'string.pattern.base':
      'Name can only contain letters, spaces, apostrophes and hyphens',
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'Please enter a valid email address',
  }),
  phone: Joi.string().trim().pattern(PHONE_REGEX).required().messages({
    'string.pattern.base':
      'Enter a valid phone number (e.g., 063 123 45 67)',
  }),
  address: Joi.string().trim().pattern(ADDRESS_REGEX).required().messages({
    'string.pattern.base':
      'Address can only contain letters, numbers, spaces, and basic punctuation',
  }),
  shopId: Joi.alternatives()
    .try(
      Joi.string().hex().length(24),
      Joi.array().items(Joi.string().hex().length(24))
    )
    .required(),
  items: Joi.array()
    .items(
      Joi.object({
        productId: Joi.string().hex().length(24).required(),
        qty: Joi.number().integer().positive().required(),
      })
    )
    .min(1)
    .required(),
  customerTimezone: Joi.string().optional(),
  clientCreatedAt: Joi.string().isoDate().optional(),
  customerOffsetMinutes: Joi.number().integer().optional(),
});
