"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimeOffModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const time_off_request_entity_1 = require("../database/entities/time-off-request.entity");
const time_off_balance_entity_1 = require("../database/entities/time-off-balance.entity");
const employee_entity_1 = require("../database/entities/employee.entity");
const location_entity_1 = require("../database/entities/location.entity");
const employee_location_entity_1 = require("../database/entities/employee-location.entity");
const time_off_service_1 = require("./time-off.service");
const time_off_controller_1 = require("./time-off.controller");
const hcm_client_module_1 = require("../hcm-client/hcm-client.module");
let TimeOffModule = class TimeOffModule {
};
exports.TimeOffModule = TimeOffModule;
exports.TimeOffModule = TimeOffModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                time_off_request_entity_1.TimeOffRequest,
                time_off_balance_entity_1.TimeOffBalance,
                employee_entity_1.Employee,
                location_entity_1.Location,
                employee_location_entity_1.EmployeeLocation,
            ]),
            hcm_client_module_1.HcmClientModule,
        ],
        providers: [time_off_service_1.TimeOffService],
        controllers: [time_off_controller_1.TimeOffController],
        exports: [time_off_service_1.TimeOffService],
    })
], TimeOffModule);
//# sourceMappingURL=time-off.module.js.map