import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  const requestId = req.headers['x-request-id'] || 'unknown';
  
  logger.error({ err, requestId }, 'Unhandled Express Error caught');

  const statusCode = err.status || 500;
  const message = err.message || 'Internal Server Error';

  const responsePayload = { error: message, requestId };

  if (res.headersSent) {
    return next(err);
  }
  
  res.status(statusCode).json(responsePayload);
}

export function notFoundHandler(req: Request, res: Response, next: NextFunction) {
  res.status(404).json({ 
    error: 'Route not found', 
    requestId: req.headers['x-request-id'] || 'unknown' 
  });
}
