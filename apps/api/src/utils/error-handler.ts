/**
 * Standardized error handling for Fastify routes
 *
 * This module provides consistent error handling across all API endpoints,
 * replacing ad-hoc try-catch patterns with a standardized approach.
 */

import { FastifyReply } from 'fastify';
import { getErrorMessage, isError } from './type-helpers';

/**
 * Custom API error class for structured error responses
 * @class ApiError
 * @extends Error
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {any} details - Optional additional error details
 * @example
 * throw new ApiError(400, 'Invalid input', { field: 'email' });
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Create a 400 Bad Request error
   * @param {string} message - Error message
   * @param {any} details - Optional additional details
   * @returns {ApiError} New ApiError instance with 400 status
   * @example
   * throw ApiError.badRequest('Invalid email format');
   */
  static badRequest(message: string, details?: any): ApiError {
    return new ApiError(400, message, details);
  }

  /**
   * Create a 401 Unauthorized error
   * @param {string} message - Error message (default: 'Unauthorized')
   * @param {any} details - Optional additional details
   * @returns {ApiError} New ApiError instance with 401 status
   */
  static unauthorized(message: string = 'Unauthorized', details?: any): ApiError {
    return new ApiError(401, message, details);
  }

  /**
   * Create a 403 Forbidden error
   * @param {string} message - Error message (default: 'Forbidden')
   * @param {any} details - Optional additional details
   * @returns {ApiError} New ApiError instance with 403 status
   */
  static forbidden(message: string = 'Forbidden', details?: any): ApiError {
    return new ApiError(403, message, details);
  }

  /**
   * Create a 404 Not Found error
   * @param {string} message - Error message
   * @param {any} details - Optional additional details
   * @returns {ApiError} New ApiError instance with 404 status
   */
  static notFound(message: string, details?: any): ApiError {
    return new ApiError(404, message, details);
  }

  /**
   * Create a 409 Conflict error
   * @param {string} message - Error message
   * @param {any} details - Optional additional details
   * @returns {ApiError} New ApiError instance with 409 status
   */
  static conflict(message: string, details?: any): ApiError {
    return new ApiError(409, message, details);
  }

  /**
   * Create a 422 Unprocessable Entity error
   * @param {string} message - Error message
   * @param {any} details - Optional additional details
   * @returns {ApiError} New ApiError instance with 422 status
   */
  static unprocessableEntity(message: string, details?: any): ApiError {
    return new ApiError(422, message, details);
  }

  /**
   * Create a 500 Internal Server Error
   * @param {string} message - Error message (default: 'Internal server error')
   * @param {any} details - Optional additional details
   * @returns {ApiError} New ApiError instance with 500 status
   */
  static internal(message: string = 'Internal server error', details?: any): ApiError {
    return new ApiError(500, message, details);
  }
}

/**
 * Error response format
 */
interface ErrorResponse {
  error: string;
  message?: string;
  details?: any;
  statusCode?: number;
}

/**
 * Handle errors in route handlers
 *
 * @example
 * try {
 *   // route logic
 * } catch (error) {
 *   return handleError(reply, error);
 * }
 */
export function handleError(reply: FastifyReply, error: unknown): FastifyReply {
  // Handle ApiError instances
  if (error instanceof ApiError) {
    const response: ErrorResponse = {
      error: error.message,
      statusCode: error.statusCode,
    };

    if (error.details) {
      response.details = error.details;
    }

    return reply.code(error.statusCode).send(response);
  }

  // Handle standard Error instances
  if (isError(error)) {
    console.error('Unexpected error:', error);
    return reply.code(500).send({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }

  // Handle unknown error types
  console.error('Unknown error:', error);
  return reply.code(500).send({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? getErrorMessage(error) : undefined,
  });
}

/**
 * Async error handler wrapper for route handlers
 *
 * Wraps an async route handler and automatically catches errors
 *
 * @example
 * fastify.get('/route', asyncHandler(async (request, reply) => {
 *   const data = await someAsyncOperation();
 *   return { data };
 * }));
 */
export function asyncHandler<T = any>(
  handler: (request: any, reply: FastifyReply) => Promise<T>
) {
  return async (request: any, reply: FastifyReply): Promise<any> => {
    try {
      return await handler(request, reply);
    } catch (error) {
      return handleError(reply, error);
    }
  };
}

/**
 * Validation error from request parameters
 */
export class ValidationError extends ApiError {
  constructor(message: string, fields?: Record<string, string>) {
    super(400, message, fields);
    this.name = 'ValidationError';
  }
}

/**
 * Database error wrapper
 */
export class DatabaseError extends ApiError {
  constructor(message: string, originalError?: Error) {
    super(500, message, {
      originalMessage: originalError?.message,
    });
    this.name = 'DatabaseError';
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends ApiError {
  constructor(message: string = 'Authentication failed') {
    super(401, message);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization error
 */
export class AuthorizationError extends ApiError {
  constructor(message: string = 'You do not have permission to perform this action') {
    super(403, message);
    this.name = 'AuthorizationError';
  }
}

/**
 * Resource not found error
 */
export class NotFoundError extends ApiError {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(404, message);
    this.name = 'NotFoundError';
  }
}

/**
 * Resource conflict error (e.g., duplicate records)
 */
export class ConflictError extends ApiError {
  constructor(message: string) {
    super(409, message);
    this.name = 'ConflictError';
  }
}
