import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import { componentParameters, componentParameterValues } from '../db/schema.js';
import { eq, and, isNull } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { requireAdmin } from '../middleware/auth';
import { safeJsonParse, safeJsonParseArray, safeJsonParseObject } from '../utils/safe-json';

interface GetParametersQuery {
  websiteId?: string;
  adUnitId?: string;
}

interface SaveParametersBody {
  websiteId?: string;
  adUnitId?: string;
  parameters: Record<string, any>;
}

interface ValidateParametersBody {
  parameters: Record<string, any>;
}

/**
 * Component Parameters Routes
 * Handles parameter schemas and user-configured values
 */
type ComponentType = 'bidder' | 'module' | 'analytics';

export default async function componentParametersRoutes(fastify: FastifyInstance) {

  // Get parameter schema for a component
  fastify.get('/components/:type/:code/parameters', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { type, code } = request.params as { type: string; code: string };

    // Validate component type
    if (!['bidder', 'module', 'analytics'].includes(type)) {
      return reply.code(400).send({
        error: 'Invalid component type. Must be bidder, module, or analytics.',
      });
    }

    const componentType = type as ComponentType;

    try {
      // Fetch parameter schema from database
      const params = db
        .select()
        .from(componentParameters)
        .where(
          and(
            eq(componentParameters.componentType, componentType),
            eq(componentParameters.componentCode, code)
          )
        )
        .all();

      // Transform to API response format
      const parameters = params.map((param) => ({
        name: param.parameterName,
        type: param.parameterType,
        required: Boolean(param.required),
        defaultValue: safeJsonParse(param.defaultValue, undefined),
        description: param.description || '',
        validation: {
          pattern: param.validationPattern || undefined,
          min: param.minValue || undefined,
          max: param.maxValue || undefined,
          enum: safeJsonParseArray(param.enumValues, undefined),
        },
      }));

      return reply.send({
        data: {
          componentCode: code,
          componentType: type,
          parameters,
        },
      });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({
        error: 'Failed to fetch parameter schema',
        details: err instanceof Error ? err.message : String(err),
      });
    }
  });

  // Get saved parameter values for a component
  fastify.get('/publishers/:publisherId/components/:type/:code/parameters', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { publisherId, type, code } = request.params as {
      publisherId: string;
      type: string;
      code: string;
    };
    const { websiteId, adUnitId } = request.query as GetParametersQuery;

    const componentType = type as ComponentType;

    try {
      // Build query conditions
      const conditions = [
        eq(componentParameterValues.publisherId, publisherId),
        eq(componentParameterValues.componentType, componentType),
        eq(componentParameterValues.componentCode, code),
      ];

      if (adUnitId) {
        conditions.push(eq(componentParameterValues.adUnitId, adUnitId));
      } else if (websiteId) {
        conditions.push(eq(componentParameterValues.websiteId, websiteId));
        conditions.push(isNull(componentParameterValues.adUnitId));
      } else {
        // Publisher-level parameters (no website or ad unit)
        conditions.push(isNull(componentParameterValues.websiteId));
        conditions.push(isNull(componentParameterValues.adUnitId));
      }

      const values = db
        .select()
        .from(componentParameterValues)
        .where(and(...conditions))
        .all();

      // Transform to key-value pairs
      const parameters: Record<string, any> = {};
      values.forEach((val) => {
        parameters[val.parameterName] = safeJsonParse(val.parameterValue, null);
      });

      return reply.send({ data: parameters });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({
        error: 'Failed to fetch parameter values',
        details: err instanceof Error ? err.message : String(err),
      });
    }
  });

  // Save parameter values for a component
  fastify.post('/publishers/:publisherId/components/:type/:code/parameters', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { publisherId, type, code } = request.params as {
      publisherId: string;
      type: string;
      code: string;
    };
    const { websiteId, adUnitId, parameters } = request.body as SaveParametersBody;

    const componentType = type as ComponentType;

    if (!parameters || typeof parameters !== 'object') {
      return reply.code(400).send({
        error: 'Invalid request. parameters object is required.',
      });
    }

    try {
      const now = new Date().toISOString();

      // First, get the parameter schema for validation
      const schema = db
        .select()
        .from(componentParameters)
        .where(
          and(
            eq(componentParameters.componentType, componentType),
            eq(componentParameters.componentCode, code)
          )
        )
        .all();

      // Validate parameters against schema
      const validationErrors: Array<{ field: string; message: string }> = [];

      for (const paramDef of schema) {
        const value = parameters[paramDef.parameterName];

        // Check required fields
        if (paramDef.required && (value === undefined || value === null)) {
          validationErrors.push({
            field: paramDef.parameterName,
            message: 'This field is required',
          });
          continue;
        }

        // Skip validation if value is not provided
        if (value === undefined || value === null) continue;

        // Type validation
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (actualType !== paramDef.parameterType && paramDef.parameterType !== 'object') {
          validationErrors.push({
            field: paramDef.parameterName,
            message: `Expected type ${paramDef.parameterType}, got ${actualType}`,
          });
          continue;
        }

        // Number range validation
        if (paramDef.parameterType === 'number') {
          if (paramDef.minValue !== null && value < paramDef.minValue) {
            validationErrors.push({
              field: paramDef.parameterName,
              message: `Value must be at least ${paramDef.minValue}`,
            });
          }
          if (paramDef.maxValue !== null && value > paramDef.maxValue) {
            validationErrors.push({
              field: paramDef.parameterName,
              message: `Value must be at most ${paramDef.maxValue}`,
            });
          }
        }

        // Enum validation
        if (paramDef.enumValues) {
          const allowedValues = safeJsonParseArray(paramDef.enumValues, []);
          if (!allowedValues.includes(value)) {
            validationErrors.push({
              field: paramDef.parameterName,
              message: `Value must be one of: ${allowedValues.join(', ')}`,
            });
          }
        }

        // Regex pattern validation
        if (paramDef.validationPattern && typeof value === 'string') {
          const regex = new RegExp(paramDef.validationPattern);
          if (!regex.test(value)) {
            validationErrors.push({
              field: paramDef.parameterName,
              message: 'Value does not match required pattern',
            });
          }
        }
      }

      if (validationErrors.length > 0) {
        return reply.code(400).send({
          error: 'Validation failed',
          details: validationErrors,
        });
      }

      // Delete existing parameter values for this component/scope
      const deleteConditions = [
        eq(componentParameterValues.publisherId, publisherId),
        eq(componentParameterValues.componentType, componentType),
        eq(componentParameterValues.componentCode, code),
      ];

      if (adUnitId) {
        deleteConditions.push(eq(componentParameterValues.adUnitId, adUnitId));
      } else if (websiteId) {
        deleteConditions.push(eq(componentParameterValues.websiteId, websiteId));
        deleteConditions.push(isNull(componentParameterValues.adUnitId));
      } else {
        deleteConditions.push(isNull(componentParameterValues.websiteId));
        deleteConditions.push(isNull(componentParameterValues.adUnitId));
      }

      db.delete(componentParameterValues)
        .where(and(...deleteConditions))
        .run();

      // Insert new parameter values
      const valuesToInsert = Object.entries(parameters).map(([name, value]) => ({
        id: uuidv4(),
        publisherId,
        componentType,
        componentCode: code,
        websiteId: adUnitId ? undefined : websiteId, // Clear websiteId if adUnitId is set
        adUnitId,
        parameterName: name,
        parameterValue: JSON.stringify(value),
        createdAt: now,
        updatedAt: now,
      }));

      if (valuesToInsert.length > 0) {
        db.insert(componentParameterValues).values(valuesToInsert).run();
      }

      return reply.send({
        data: { success: true, parametersCount: valuesToInsert.length },
        message: 'Parameters saved successfully',
      });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({
        error: 'Failed to save parameter values',
        details: err instanceof Error ? err.message : String(err),
      });
    }
  });

  // Validate parameters without saving
  fastify.post('/components/:type/:code/parameters/validate', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { type, code } = request.params as { type: string; code: string };
    const { parameters } = request.body as ValidateParametersBody;

    const componentType = type as ComponentType;

    if (!parameters || typeof parameters !== 'object') {
      return reply.code(400).send({
        error: 'Invalid request. parameters object is required.',
      });
    }

    try {
      // Get parameter schema
      const schema = db
        .select()
        .from(componentParameters)
        .where(
          and(
            eq(componentParameters.componentType, componentType),
            eq(componentParameters.componentCode, code)
          )
        )
        .all();

      const errors: Array<{ field: string; message: string }> = [];

      // Validate each parameter
      for (const paramDef of schema) {
        const value = parameters[paramDef.parameterName];

        // Check required fields
        if (paramDef.required && (value === undefined || value === null)) {
          errors.push({
            field: paramDef.parameterName,
            message: 'This field is required',
          });
          continue;
        }

        if (value === undefined || value === null) continue;

        // Type validation
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (actualType !== paramDef.parameterType && paramDef.parameterType !== 'object') {
          errors.push({
            field: paramDef.parameterName,
            message: `Expected type ${paramDef.parameterType}, got ${actualType}`,
          });
          continue;
        }

        // Additional validations (range, enum, pattern) same as above
        if (paramDef.parameterType === 'number') {
          if (paramDef.minValue !== null && value < paramDef.minValue) {
            errors.push({
              field: paramDef.parameterName,
              message: `Value must be at least ${paramDef.minValue}`,
            });
          }
          if (paramDef.maxValue !== null && value > paramDef.maxValue) {
            errors.push({
              field: paramDef.parameterName,
              message: `Value must be at most ${paramDef.maxValue}`,
            });
          }
        }

        if (paramDef.enumValues) {
          const allowedValues = safeJsonParseArray(paramDef.enumValues, []);
          if (!allowedValues.includes(value)) {
            errors.push({
              field: paramDef.parameterName,
              message: `Value must be one of: ${allowedValues.join(', ')}`,
            });
          }
        }

        if (paramDef.validationPattern && typeof value === 'string') {
          const regex = new RegExp(paramDef.validationPattern);
          if (!regex.test(value)) {
            errors.push({
              field: paramDef.parameterName,
              message: 'Value does not match required pattern',
            });
          }
        }
      }

      return reply.send({
        valid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({
        error: 'Validation failed',
        details: err instanceof Error ? err.message : String(err),
      });
    }
  });

  // Delete parameter values for a component
  fastify.delete('/publishers/:publisherId/components/:type/:code/parameters', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { publisherId, type, code } = request.params as {
      publisherId: string;
      type: string;
      code: string;
    };
    const { websiteId, adUnitId } = request.query as GetParametersQuery;

    const componentType = type as ComponentType;

    try {
      const deleteConditions = [
        eq(componentParameterValues.publisherId, publisherId),
        eq(componentParameterValues.componentType, componentType),
        eq(componentParameterValues.componentCode, code),
      ];

      if (adUnitId) {
        deleteConditions.push(eq(componentParameterValues.adUnitId, adUnitId));
      } else if (websiteId) {
        deleteConditions.push(eq(componentParameterValues.websiteId, websiteId));
        deleteConditions.push(isNull(componentParameterValues.adUnitId));
      } else {
        deleteConditions.push(isNull(componentParameterValues.websiteId));
        deleteConditions.push(isNull(componentParameterValues.adUnitId));
      }

      const result = db
        .delete(componentParameterValues)
        .where(and(...deleteConditions))
        .run();

      return reply.send({
        data: { success: true, deletedCount: result.changes },
        message: 'Parameters deleted successfully',
      });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({
        error: 'Failed to delete parameters',
        details: err instanceof Error ? err.message : String(err),
      });
    }
  });
}
