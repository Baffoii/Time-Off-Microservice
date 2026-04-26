"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockHcmModule = void 0;
const common_1 = require("@nestjs/common");
const mock_hcm_controller_1 = require("./mock-hcm.controller");
const mock_hcm_service_1 = require("./mock-hcm.service");
const mock_hcm_store_1 = require("./mock-hcm-store");
let MockHcmModule = class MockHcmModule {
};
exports.MockHcmModule = MockHcmModule;
exports.MockHcmModule = MockHcmModule = __decorate([
    (0, common_1.Module)({
        controllers: [mock_hcm_controller_1.MockHcmController],
        providers: [mock_hcm_service_1.MockHcmService, mock_hcm_store_1.MockHcmStore],
        exports: [mock_hcm_service_1.MockHcmService, mock_hcm_store_1.MockHcmStore],
    })
], MockHcmModule);
//# sourceMappingURL=mock-hcm.module.js.map