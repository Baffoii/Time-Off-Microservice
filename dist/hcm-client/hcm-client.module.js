"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HcmClientModule = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const config_1 = require("@nestjs/config");
const hcm_client_service_1 = require("./hcm-client.service");
const hcm_client_interface_1 = require("./hcm-client.interface");
let HcmClientModule = class HcmClientModule {
};
exports.HcmClientModule = HcmClientModule;
exports.HcmClientModule = HcmClientModule = __decorate([
    (0, common_1.Module)({
        imports: [
            axios_1.HttpModule.registerAsync({
                imports: [config_1.ConfigModule],
                useFactory: (config) => ({
                    timeout: config.get('HCM_TIMEOUT_MS', 5000),
                }),
                inject: [config_1.ConfigService],
            }),
        ],
        providers: [
            hcm_client_service_1.HcmClientService,
            {
                provide: hcm_client_interface_1.HCM_CLIENT_SERVICE,
                useExisting: hcm_client_service_1.HcmClientService,
            },
        ],
        exports: [hcm_client_service_1.HcmClientService, hcm_client_interface_1.HCM_CLIENT_SERVICE],
    })
], HcmClientModule);
//# sourceMappingURL=hcm-client.module.js.map