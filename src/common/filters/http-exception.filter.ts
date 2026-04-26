import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { HcmTimeoutError, HcmServerError, HcmNotFoundError } from '../exceptions';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any).message || exception.message;
    } else if (exception instanceof HcmTimeoutError) {
      status = HttpStatus.GATEWAY_TIMEOUT;
      message = exception.message;
    } else if (exception instanceof HcmServerError) {
      status = HttpStatus.BAD_GATEWAY;
      message = exception.message;
    } else if (exception instanceof HcmNotFoundError) {
      status = HttpStatus.NOT_FOUND;
      message = exception.message;
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = exception.message;
      this.logger.error(exception.stack);
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
    }

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
