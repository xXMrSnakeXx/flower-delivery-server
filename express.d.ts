
// import "express-serve-static-core";

// declare module "express-serve-static-core" {
//   interface Request {
//     validatedBody?: unknown;
//     validatedQuery?: unknown;
//     validatedParams?: unknown;
//   }
// }


// express.d.ts (у корені)
import "express-serve-static-core";

declare module "express-serve-static-core" {
  interface Request {
    validatedBody?: unknown;
    validatedQuery?: unknown;
    validatedParams?: unknown;
  }
}

