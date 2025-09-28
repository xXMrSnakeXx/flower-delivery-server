import Joi from 'joi';
import { PHONE_REGEX } from '../utils/validation.js';

export type PrefillBody = { email: string; phone: string };

export const prefillSchema = Joi.object<PrefillBody>({
  email: Joi.string().email().required(),
  phone: Joi.string().trim().pattern(PHONE_REGEX).required(),
});
