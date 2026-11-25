import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from 'express';
import { Error as MongooseError } from 'mongoose';
import { ZodError, type ZodType } from 'zod';
export class ApiError extends Error { constructor(public status: number, message: string, public errors?: { field: string; message: string }[]) { super(message); } }
export function success(res: Response, data: unknown, message = 'Request successful', status = 200) { return res.status(status).json({ success: true, message, data }); }
export const asyncHandler = (handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler => (req, res, next) => { Promise.resolve(handler(req, res, next)).catch(next); };
export const validate = (schema: ZodType, part: 'body' | 'query' | 'params' = 'body'): RequestHandler => (req, res, next) => { const parsed = schema.safeParse(req[part]); if (!parsed.success) return next(parsed.error); if (part === 'body') req.body = parsed.data; else res.locals[part] = parsed.data; next(); };
export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  if (error instanceof ZodError) { res.status(422).json({ success: false, message: 'Validation failed', errors: error.issues.map(i => ({ field: i.path.join('.'), message: i.message })) }); return; }
  if (error instanceof ApiError) { res.status(error.status).json({ success: false, message: error.message, ...(error.errors ? { errors: error.errors } : {}) }); return; }
  if (error instanceof MongooseError.ValidationError || error instanceof MongooseError.CastError || error instanceof MongooseError.StrictModeError) { res.status(422).json({ success: false, message: 'Invalid record fields or references' }); return; }
  if (error && typeof error === 'object' && 'code' in error && error.code === 11000) { res.status(409).json({ success: false, message: 'A record with that email or linked lead already exists' }); return; }
  if (error instanceof SyntaxError && 'body' in error) { res.status(400).json({ success: false, message: 'Invalid JSON body' }); return; }
  if (error && typeof error === 'object' && 'status' in error && error.status === 413) { res.status(413).json({ success: false, message: 'Request body is too large' }); return; }
  console.error('API request failed', error instanceof Error ? error.name : 'UnknownError'); res.status(500).json({ success: false, message: 'The request could not be completed' });
};
