"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimeOffController = void 0;
const common_1 = require("@nestjs/common");
const time_off_service_1 = require("./time-off.service");
const create_time_off_request_dto_1 = require("./dto/create-time-off-request.dto");
const query_time_off_requests_dto_1 = require("./dto/query-time-off-requests.dto");
let TimeOffController = class TimeOffController {
    constructor(timeOffService) {
        this.timeOffService = timeOffService;
    }
    async create(dto) {
        return this.timeOffService.createRequest(dto);
    }
    async findOne(id) {
        const request = await this.timeOffService.findById(id);
        if (!request) {
            throw new common_1.NotFoundException(`Time-off request with id ${id} not found`);
        }
        return request;
    }
    findAll(query) {
        return this.timeOffService.findAll(query);
    }
};
exports.TimeOffController = TimeOffController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ transform: true, whitelist: true })),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_time_off_request_dto_1.CreateTimeOffRequestDto]),
    __metadata("design:returntype", Promise)
], TimeOffController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TimeOffController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [query_time_off_requests_dto_1.QueryTimeOffRequestsDto]),
    __metadata("design:returntype", void 0)
], TimeOffController.prototype, "findAll", null);
exports.TimeOffController = TimeOffController = __decorate([
    (0, common_1.Controller)('time-off-requests'),
    __metadata("design:paramtypes", [time_off_service_1.TimeOffService])
], TimeOffController);
//# sourceMappingURL=time-off.controller.js.map