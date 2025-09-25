import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  PrismaClientKnownRequestError,
  PrismaClientUnknownRequestError,
  PrismaClientRustPanicError,
  PrismaClientInitializationError,
  PrismaClientValidationError,
} from '@prisma/client/runtime/library';
import { ErrorCodes } from '../types/error-response.type';

export function handlePrismaError(error: any): never {
  if (error instanceof PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        // Unique constraint violation
        const field = error.meta?.target || 'field';
        throw new ConflictException({
          code: ErrorCodes.DUPLICATE_RESOURCE,
          message: `Resource already exists: ${field}`,
          details: error.meta,
        });

      case 'P2025':
        // Record not found
        throw new NotFoundException({
          code: ErrorCodes.RESOURCE_NOT_FOUND,
          message: 'Record not found',
          details: error.meta,
        });

      case 'P2003':
        // Foreign key constraint violation
        throw new BadRequestException({
          code: ErrorCodes.BUSINESS_RULE_VIOLATION,
          message: 'Foreign key constraint violation',
          details: error.meta,
        });

      case 'P2014':
        // Related record not found
        throw new BadRequestException({
          code: ErrorCodes.BUSINESS_RULE_VIOLATION,
          message: 'Related record not found',
          details: error.meta,
        });

      case 'P2021':
        // Table does not exist
        throw new InternalServerErrorException({
          code: ErrorCodes.DATABASE_ERROR,
          message: 'Database schema error',
          details: error.meta,
        });

      case 'P2022':
        // Column does not exist
        throw new InternalServerErrorException({
          code: ErrorCodes.DATABASE_ERROR,
          message: 'Database column error',
          details: error.meta,
        });

      default:
        throw new InternalServerErrorException({
          code: ErrorCodes.DATABASE_ERROR,
          message: `Database error: ${error.code}`,
          details: error.meta,
        });
    }
  }

  if (error instanceof PrismaClientUnknownRequestError) {
    throw new InternalServerErrorException({
      code: ErrorCodes.DATABASE_ERROR,
      message: 'Unknown database error',
      details: error.message,
    });
  }

  if (error instanceof PrismaClientRustPanicError) {
    throw new InternalServerErrorException({
      code: ErrorCodes.SYSTEM_ERROR,
      message: 'Database engine error',
      details: error.message,
    });
  }

  if (error instanceof PrismaClientInitializationError) {
    throw new InternalServerErrorException({
      code: ErrorCodes.DATABASE_ERROR,
      message: 'Database connection error',
      details: error.message,
    });
  }

  if (error instanceof PrismaClientValidationError) {
    throw new BadRequestException({
      code: ErrorCodes.VALIDATION_ERROR,
      message: 'Database validation error',
      details: error.message,
    });
  }

  // Not a Prisma error, re-throw
  throw error;
}