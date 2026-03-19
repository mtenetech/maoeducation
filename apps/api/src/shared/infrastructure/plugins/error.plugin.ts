import { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import { AppError } from '../../domain/errors/app.errors'

export const errorPlugin = fp(async (app: FastifyInstance) => {
  app.setErrorHandler((error, req, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
          ...(error.code === 'VALIDATION_ERROR' && 'fields' in error
            ? { fields: (error as { fields?: unknown }).fields }
            : {}),
        },
      })
    }

    // Errores de validación del schema de Fastify (Zod/JSON Schema)
    if (error.statusCode === 400 && error.validation) {
      return reply.status(422).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Datos de entrada inválidos',
          fields: error.validation,
        },
      })
    }

    // Error inesperado
    req.log.error({ err: error, reqId: req.id }, 'Unhandled error')
    return reply.status(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Error interno del servidor',
      },
    })
  })
})
