"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AllExceptionsFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllExceptionsFilter = void 0;
const common_1 = require("@nestjs/common");
const exceptions_1 = require("../exceptions");
let AllExceptionsFilter = AllExceptionsFilter_1 = class AllExceptionsFilter {
    constructor() {
        this.logger = new common_1.Logger(AllExceptionsFilter_1.name);
    }
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        let status;
        let message;
        if (exception instanceof common_1.HttpException) {
            status = exception.getStatus();
            const exceptionResponse = exception.getResponse();
            message =
                typeof exceptionResponse === 'string'
                    ? exceptionResponse
                    : exceptionResponse.message || exception.message;
        }
        else if (exception instanceof exceptions_1.HcmTimeoutError) {
            status = common_1.HttpStatus.GATEWAY_TIMEOUT;
            message = exception.message;
        }
        else if (exception instanceof exceptions_1.HcmServerError) {
            status = common_1.HttpStatus.BAD_GATEWAY;
            message = exception.message;
        }
        else if (exception instanceof exceptions_1.HcmNotFoundError) {
            status = common_1.HttpStatus.NOT_FOUND;
            message = exception.message;
        }
        else if (exception instanceof Error) {
            status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
            message = exception.message;
            this.logger.error(exception.stack);
        }
        else {
            status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
            message = 'Internal server error';
        }
        response.status(status).json({
            statusCode: status,
            message,
            timestamp: new Date().toISOString(),
            path: request.url,
        });
    }
};
exports.AllExceptionsFilter = AllExceptionsFilter;
exports.AllExceptionsFilter = AllExceptionsFilter = AllExceptionsFilter_1 = __decorate([
    (0, common_1.Catch)()
], AllExceptionsFilter);
//# sourceMappingURL=http-exception.filter.js.map