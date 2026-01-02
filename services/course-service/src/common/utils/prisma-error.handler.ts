import { Prisma } from '@prisma/client';
import { AppException, Errors } from '../exceptions';

/**
 * Prisma 에러를 AppException으로 변환
 */
export function handlePrismaError(error: any): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        // Unique constraint violation
        throw new AppException(Errors.Database.UNIQUE_VIOLATION);

      case 'P2025':
        // Record not found
        throw new AppException(Errors.Database.NOT_FOUND);

      case 'P2003':
        // Foreign key constraint violation
        throw new AppException(Errors.Database.FK_VIOLATION);

      case 'P2014':
        // Related record not found
        throw new AppException(Errors.Database.FK_VIOLATION, '관련 레코드를 찾을 수 없습니다');

      case 'P2021':
      case 'P2022':
        // Table/Column does not exist
        throw new AppException(Errors.Database.CONNECTION_ERROR, '데이터베이스 스키마 오류');

      default:
        throw new AppException(Errors.Database.CONNECTION_ERROR, `데이터베이스 오류: ${error.code}`);
    }
  }

  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    throw new AppException(Errors.Database.CONNECTION_ERROR, '알 수 없는 데이터베이스 오류');
  }

  if (error instanceof Prisma.PrismaClientRustPanicError) {
    throw new AppException(Errors.System.INTERNAL, '데이터베이스 엔진 오류');
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    throw new AppException(Errors.Database.CONNECTION_ERROR);
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    throw new AppException(Errors.Validation.INVALID_INPUT, '데이터베이스 유효성 검증 오류');
  }

  // Not a Prisma error, re-throw
  throw error;
}