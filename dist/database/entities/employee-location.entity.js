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
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeeLocation = void 0;
const typeorm_1 = require("typeorm");
const employee_entity_1 = require("./employee.entity");
const location_entity_1 = require("./location.entity");
let EmployeeLocation = class EmployeeLocation {
};
exports.EmployeeLocation = EmployeeLocation;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], EmployeeLocation.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], EmployeeLocation.prototype, "employeeId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], EmployeeLocation.prototype, "locationId", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], EmployeeLocation.prototype, "active", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => employee_entity_1.Employee, (e) => e.employeeLocations),
    __metadata("design:type", employee_entity_1.Employee)
], EmployeeLocation.prototype, "employee", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => location_entity_1.Location, (l) => l.employeeLocations),
    __metadata("design:type", location_entity_1.Location)
], EmployeeLocation.prototype, "location", void 0);
exports.EmployeeLocation = EmployeeLocation = __decorate([
    (0, typeorm_1.Entity)(),
    (0, typeorm_1.Unique)(['employeeId', 'locationId'])
], EmployeeLocation);
//# sourceMappingURL=employee-location.entity.js.map