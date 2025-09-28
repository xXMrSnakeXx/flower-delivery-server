import { Router } from 'express';
import { Types } from 'mongoose';
import { route } from '../middleware/validate.js';
import { ProductModel } from '../models/Product.js';
import { OrderModel } from '../models/Order.js';
import { CustomerModel } from '../models/Customer.js';
import type { Product } from '../models/Product.js';
import {
  ordersBulkInfoSchema,
  orderSchema,
  type OrderInput,
  type OrdersBulkInfoInput,
} from '../schemas/order.js';

export const ordersRouter = Router();

const normalizeEmail = (v?: string): string =>
  typeof v === 'string' ? v.trim().toLowerCase() : '';

const normalizePhone = (v?: string): string =>
  typeof v === 'string' ? v.replace(/\s+/g, '').replace(/-/g, '').trim() : '';

const normalizeName = (v?: string): string | undefined =>
  typeof v === 'string' ? v.trim() : undefined;

type ItemInput = { productId: string; qty: number };

interface Prod {
  _id: Types.ObjectId;
  shopId?: Types.ObjectId;
  name: string;
  priceCents: number;
}

interface CustomerUpdate {
  $set: {
    defaultAddress: string;
    lastSeenAt: Date;
    name?: string;
  };
  $setOnInsert: {
    email: string;
    phone: string;
    timezone: string;
  };
}

ordersRouter.post(
  '/',
  route<OrderInput, unknown, unknown>(
    { body: orderSchema },
    async (req, res, next) => {
      try {
        const body = req.validatedBody as OrderInput;
        const {
          name,
          email,
          phone,
          address,
          items,
          customerTimezone,
          clientCreatedAt,
          customerOffsetMinutes,
        } = body;
        const maybeShopId = body.shopId as string | string[] | undefined;

        if (!Array.isArray(items) || items.length === 0) {
          return res
            .status(400)
            .json({ error: 'Order must contain at least one item' });
        }

        const ids = items.map((i) => i.productId);
        if (ids.some((id) => !Types.ObjectId.isValid(id))) {
          return res.status(400).json({ error: 'Invalid productId in items' });
        }

        const productObjectIds = ids.map((id) => new Types.ObjectId(id));
        const productsRaw = await ProductModel.find({
          _id: { $in: productObjectIds },
        }).lean();

        const products = productsRaw as unknown as Array<
          Product & { _id: Types.ObjectId; shopId?: Types.ObjectId }
        >;

        if (products.length !== ids.length) {
          return res
            .status(400)
            .json({ error: 'One or more products not found' });
        }

        const pmap = new Map<string, Prod>(
          products.map((p) => [
            p._id.toString(),
            {
              _id: p._id,
              shopId: p.shopId,
              name: p.name,
              priceCents: p.priceCents,
            },
          ])
        );

        const groups = new Map<
          string,
          { products: Prod[]; items: ItemInput[] }
        >();

        for (const it of items) {
          const p = pmap.get(it.productId);
          if (!p) {
            return res
              .status(400)
              .json({ error: `Product not found: ${it.productId}` });
          }

          const sid = p.shopId?.toString();
          if (!sid) {
            return res
              .status(400)
              .json({ error: `Product missing shopId: ${it.productId}` });
          }

          if (!groups.has(sid)) {
            groups.set(sid, { products: [], items: [] });
          }

          const grp = groups.get(sid);
          if (grp) {
            grp.products.push(p);
            grp.items.push({ productId: it.productId, qty: it.qty });
          }
        }

        if (typeof maybeShopId === 'string') {
          if (!Types.ObjectId.isValid(maybeShopId)) {
            return res.status(400).json({ error: 'Invalid shopId' });
          }
          if (!(groups.size === 1 && groups.has(maybeShopId))) {
            return res
              .status(400)
              .json({ error: 'Items do not belong to the provided shopId' });
          }
        }

        if (Array.isArray(maybeShopId)) {
          for (const s of maybeShopId) {
            if (!Types.ObjectId.isValid(s)) {
              return res.status(400).json({ error: 'Invalid shopId in array' });
            }
          }
        }

        const normalizedEmail = normalizeEmail(email);
        const normalizedPhone = normalizePhone(phone);
        const normalizedName = normalizeName(name);

        const customerUpdate: CustomerUpdate = {
          $set: {
            defaultAddress: address,
            lastSeenAt: new Date(),
            ...(normalizedName && { name: normalizedName }),
          },
          $setOnInsert: {
            email: normalizedEmail,
            phone: normalizedPhone,
            timezone: 'Europe/Kyiv',
          },
        };

        await CustomerModel.findOneAndUpdate(
          { email: normalizedEmail, phone: normalizedPhone },
          customerUpdate,
          { new: true, upsert: true, runValidators: true }
        );

        const createdOrderIds: string[] = [];

        for (const [shopIdString, grp] of Array.from(groups.entries())) {
          const pm = new Map<string, Prod>(
            grp.products.map((p) => [p._id.toString(), p])
          );

          let totalCents = 0;
          const orderItems = grp.items.map((it) => {
            const p = pm.get(it.productId);
            if (!p) {
              throw new Error(`Product not found: ${it.productId}`);
            }

            const line = {
              productId: p._id,
              name: p.name,
              qty: it.qty,
              priceCents: p.priceCents,
            };
            totalCents += line.priceCents * line.qty;
            return line;
          });

          const orderDoc = await OrderModel.create({
            customer: {
              name: normalizedName,
              email: normalizedEmail,
              phone: normalizedPhone,
              timezone: customerTimezone || 'Europe/Kyiv',
            },
            shopId: new Types.ObjectId(shopIdString),
            delivery: { address },
            items: orderItems,
            totalCents,
            status: 'created',
            clientCreatedAt:
              typeof clientCreatedAt === 'string' ? clientCreatedAt : undefined,
            customerTimeZone:
              typeof customerTimezone === 'string'
                ? customerTimezone
                : undefined,
            customerOffsetMinutes:
              typeof customerOffsetMinutes === 'number'
                ? customerOffsetMinutes
                : undefined,
          });

          createdOrderIds.push(orderDoc._id.toString());
        }

        return res.status(201).json({ orderIds: createdOrderIds });
      } catch (e) {
        next(e);
      }
    }
  )
);

interface PopulatedShop {
  _id: Types.ObjectId;
  name: string;
  address: string;
}

interface PopulatedProduct {
  _id: Types.ObjectId;
  name: string;
  imageUrl?: string;
  priceCents: number;
}

interface LeanOrderWithPopulates {
  _id: Types.ObjectId;
  shopId: PopulatedShop | Types.ObjectId | null;
  customer?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    timezone?: string | null;
  } | null;
  delivery?: { address?: string | null } | null;
  items: Array<{
    productId: PopulatedProduct | Types.ObjectId | null;
    qty: number;
  }>;
  totalCents: number;
  status: string;
  createdAt?: Date;
  updatedAt?: Date;
  clientCreatedAt?: string | null;
  customerTimeZone?: string | null;
  customerOffsetMinutes?: number | null;
}

interface OrderResponse {
  orderId: string;
  shop: {
    id: string;
    name: string;
    address: string;
  } | null;
  customer: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    timezone: string;
  };
  delivery: { address?: string | null };
  items: Array<{
    productId: string | null;
    name: string | null;
    image: string | null;
    quantity: number;
    priceCents: number;
    lineTotalCents: number;
  }>;
  totalCents: number;
  status: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  clientCreatedAt: string | null;
  customerTimeZone: string | null;
  customerOffsetMinutes: number | null;
}

interface BulkInfoResponse {
  orders: OrderResponse[];
  grandTotalCents?: number;
}

ordersRouter.post(
  '/bulk-info',
  route<OrdersBulkInfoInput, unknown, unknown>(
    { body: ordersBulkInfoSchema },
    async (req, res, next) => {
      try {
        const body = req.validatedBody as OrdersBulkInfoInput;
        const { orderIds } = body;

        const orderIdArray = Array.isArray(orderIds) ? orderIds : [orderIds];

        if (orderIdArray.some((id) => !Types.ObjectId.isValid(id))) {
          return res
            .status(400)
            .json({ error: 'Invalid order ID(s) provided' });
        }

        const orderObjectIds = orderIdArray.map((id) => new Types.ObjectId(id));
        const ordersRaw = await OrderModel.find({
          _id: { $in: orderObjectIds },
        })
          .populate('shopId', 'name address')
          .populate('items.productId', 'name imageUrl priceCents')
          .lean<LeanOrderWithPopulates[]>();

        if (ordersRaw.length !== orderIdArray.length) {
          const foundIds = ordersRaw.map((o) => o._id.toString());
          const missingIds = orderIdArray.filter(
            (id) => !foundIds.includes(id)
          );
          return res.status(404).json({
            error: 'Some orders not found',
            missingOrderIds: missingIds,
          });
        }

        const ordersResponse: OrderResponse[] = ordersRaw.map((order) => {
          const shop =
            order.shopId && 'name' in order.shopId
              ? (order.shopId as PopulatedShop)
              : null;

          const items = (order.items || []).map((it) => {
            const prod =
              it.productId && 'name' in it.productId
                ? (it.productId as PopulatedProduct)
                : null;

            const productIdStr = prod
              ? prod._id.toString()
              : it.productId
              ? it.productId.toString()
              : null;
            const unitPrice = prod ? prod.priceCents : 0;
            const lineTotal = unitPrice * (it.qty || 0);

            return {
              productId: productIdStr,
              name: prod ? prod.name : null,
              image: prod?.imageUrl || 'https://placehold.co/100x100',
              quantity: it.qty,
              priceCents: unitPrice,
              lineTotalCents: lineTotal,
            };
          });

          return {
            orderId: order._id.toString(),
            shop: shop
              ? {
                  id: shop._id.toString(),
                  name: shop.name,
                  address: shop.address,
                }
              : null,
            customer: {
              name: order.customer?.name ?? null,
              email: order.customer?.email ?? null,
              phone: order.customer?.phone ?? null,
              timezone: order.customer?.timezone || 'Europe/Kyiv',
            },
            delivery: { address: order.delivery?.address ?? null },
            items,
            totalCents: order.totalCents,
            status: order.status,
            createdAt: order.createdAt ?? null,
            updatedAt: order.updatedAt ?? null,
            clientCreatedAt: order.clientCreatedAt ?? null,
            customerTimeZone: order.customerTimeZone ?? null,
            customerOffsetMinutes: order.customerOffsetMinutes ?? null,
          };
        });

        const response: BulkInfoResponse = {
          orders: ordersResponse,
        };

        if (ordersResponse.length > 1) {
          response.grandTotalCents = ordersResponse.reduce(
            (sum, o) => sum + (o.totalCents ?? 0),
            0
          );
        }

        return res.status(200).json(response);
      } catch (err) {
        next(err);
      }
    }
  )
);
