import { Router } from 'express';
import { route } from '../middleware/validate.js';
import { CustomerModel } from '../models/Customer.js';
import { prefillSchema, type PrefillBody } from '../schemas/customer.js';

export const customersRouter = Router();

const normalizeEmail = (v?: string): string =>
  typeof v === 'string' ? v.trim().toLowerCase() : '';

const normalizePhone = (v?: string): string =>
  typeof v === 'string' ? v.replace(/\s+/g, '').replace(/-/g, '').trim() : '';

customersRouter.post(
  '/prefill',
  route<PrefillBody, unknown, unknown>(
    { body: prefillSchema },
    async (req, res, next) => {
      try {
        const { email, phone } = req.validatedBody;
        const normEmail = normalizeEmail(email);
        const normPhone = normalizePhone(phone);

        const customer = await CustomerModel.findOne({
          email: normEmail,
          phone: normPhone,
        }).lean();

        if (!customer) {
          return res.json(null);
        }

        return res.json({
          name: customer.name ?? null,
          email: customer.email,
          phone: customer.phone,
          defaultAddress: customer.defaultAddress ?? null,
          timezone: customer.timezone ?? 'Europe/Kyiv',
        });
      } catch (e) {
        next(e);
      }
    }
  )
);
