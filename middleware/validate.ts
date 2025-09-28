import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { ObjectSchema, ValidationError } from 'joi';

type Schemas<B, Q, P> = {
  body?: ObjectSchema<B>;
  query?: ObjectSchema<Q>;
  params?: ObjectSchema<P>;
};

type Validated<B, Q, P> = {
  validatedBody: B;
  validatedQuery: Q;
  validatedParams: P;
};

export function route<B = unknown, Q = unknown, P = unknown>(
  schemas: Schemas<B, Q, P>,
  handler: (
    req: Request & Validated<B, Q, P>,
    res: Response,
    next: NextFunction
  ) => any | Promise<any>
): RequestHandler {
  return async (req, res, next) => {
    try {
      if (schemas.body) {
        const { error, value } = schemas.body.validate(req.body, {
          abortEarly: false,
          stripUnknown: true,
          convert: true,
        });
        if (error) return res.status(400).json(formatJoi(error));
        req.validatedBody = value as B;
      }

      if (schemas.query) {
        const { error, value } = schemas.query.validate(req.query, {
          abortEarly: false,
          stripUnknown: true,
          convert: true,
        });
        if (error) return res.status(400).json(formatJoi(error));
        req.validatedQuery = value as Q;
      }

      if (schemas.params) {
        const { error, value } = schemas.params.validate(req.params, {
          abortEarly: false,
          stripUnknown: true,
          convert: true,
        });
        if (error) return res.status(400).json(formatJoi(error));
        req.validatedParams = value as P;
      }

      await Promise.resolve(
        handler(req as Request & Validated<B, Q, P>, res, next)
      );
    } catch (e) {
      next(e);
    }
  };
}

function formatJoi(error: ValidationError) {
  return {
    error: 'Validation error',
    details: error.details.map((d) => ({
      path: Array.isArray(d.path) ? d.path.join('.') : String(d.path ?? ''),
      message: d.message,
    })),
  };
}
