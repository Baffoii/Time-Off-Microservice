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
exports.MockHcmController = void 0;
const common_1 = require("@nestjs/common");
const mock_hcm_service_1 = require("./mock-hcm.service");
let MockHcmController = class MockHcmController {
    constructor(mockHcmService) {
        this.mockHcmService = mockHcmService;
    }
    getBatchBalances() {
        return this.mockHcmService.getBatchBalances();
    }
    getBalance(employeeId, locationId) {
        return this.mockHcmService.getBalance(employeeId, locationId);
    }
    submitTimeOff(body) {
        return this.mockHcmService.submitTimeOff(body.employeeId, body.locationId, body.days);
    }
    setBalance(body) {
        return this.mockHcmService.setBalance(body.employeeId, body.locationId, body.balanceDays);
    }
    setMode(body) {
        return this.mockHcmService.setMode(body.mode);
    }
    reset() {
        return this.mockHcmService.reset();
    }
};
exports.MockHcmController = MockHcmController;
__decorate([
    (0, common_1.Get)('balances/batch'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MockHcmController.prototype, "getBatchBalances", null);
__decorate([
    (0, common_1.Get)('balances/:employeeId/:locationId'),
    __param(0, (0, common_1.Param)('employeeId')),
    __param(1, (0, common_1.Param)('locationId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], MockHcmController.prototype, "getBalance", null);
__decorate([
    (0, common_1.Post)('time-off'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MockHcmController.prototype, "submitTimeOff", null);
__decorate([
    (0, common_1.Post)('admin/balances'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MockHcmController.prototype, "setBalance", null);
__decorate([
    (0, common_1.Post)('admin/mode'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MockHcmController.prototype, "setMode", null);
__decorate([
    (0, common_1.Post)('admin/reset'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MockHcmController.prototype, "reset", null);
exports.MockHcmController = MockHcmController = __decorate([
    (0, common_1.Controller)('hcm'),
    __metadata("design:paramtypes", [mock_hcm_service_1.MockHcmService])
], MockHcmController);
//# sourceMappingURL=mock-hcm.controller.js.map