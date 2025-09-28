import { Router } from 'express';
import { route } from '../middleware/validate.js';
import { ShopModel } from '../models/Shop.js';
import { ProductModel } from '../models/Product.js';
import {
  productsQuerySchema,
  shopParamsSchema,
  type ProductsQuery,
  type ShopParams,
} from '../schemas/order.js';

export const shopsRouter = Router();

shopsRouter.get('/', async (_req, res, next) => {
  try {
    const shops = await ShopModel.find().select('_id name address').lean();
    res.json(shops);
  } catch (e) {
    next(e);
  }
});

shopsRouter.get(
  '/:id/products',
  route<unknown, ProductsQuery, ShopParams>(
    { query: productsQuerySchema, params: shopParamsSchema },
    async (req, res, next) => {
      try {
        const { id } = req.validatedParams;
        const { sort, order } = req.validatedQuery;
        const sortObj: Record<string, 1 | -1> = {};
        if (sort === 'price') sortObj.priceCents = order === 'asc' ? 1 : -1;
        else sortObj.createdAt = order === 'asc' ? 1 : -1;

        const products = await ProductModel.find({ shopId: id })
          .select(
            '_id shopId name description priceCents imageUrl isBouquet createdAt'
          )
          .sort(sortObj)
          .lean();

        res.json(products);
      } catch (e) {
        next(e);
      }
    }
  )
);
