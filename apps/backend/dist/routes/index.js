"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const health_1 = __importDefault(require("./health"));
const version_1 = __importDefault(require("./version"));
const twilio_1 = __importDefault(require("./twilio"));
const messages_1 = __importDefault(require("./messages"));
const booking_1 = __importDefault(require("./booking"));
const calendar_1 = __importDefault(require("./calendar"));
const admin_1 = __importDefault(require("./admin"));
const auth_1 = __importDefault(require("./auth"));
const customers_1 = __importDefault(require("./customers"));
const bookings_1 = __importDefault(require("./bookings"));
const agents_1 = __importDefault(require("./agents"));
const settings_1 = __importDefault(require("./settings"));
const analytics_1 = __importDefault(require("./analytics"));
const leads_1 = __importDefault(require("./leads"));
const fakeData_1 = __importDefault(require("./fakeData"));
const demoMode_1 = __importDefault(require("./demoMode"));
const availability_1 = __importDefault(require("./availability"));
const blockedTimes_1 = __importDefault(require("./blockedTimes"));
const handover_1 = __importDefault(require("./handover"));
const router = (0, express_1.Router)();
// Phase 1 routes
router.use('/health', health_1.default);
router.use('/version', version_1.default);
// Phase 2 routes - Communication Engine
router.use('/twilio', twilio_1.default);
router.use('/messages', messages_1.default);
router.use('/booking', booking_1.default);
router.use('/calendar', calendar_1.default);
// Phase 5 routes - Admin Dashboard
router.use('/admin', admin_1.default);
// Phase 5.1 routes - Authentication
router.use('/auth', auth_1.default);
// Client dashboard routes
router.use('/customers', customers_1.default);
router.use('/bookings', bookings_1.default);
router.use('/agents', agents_1.default);
router.use('/settings', settings_1.default);
router.use('/analytics', analytics_1.default);
router.use('/leads', leads_1.default);
router.use('/fake-data', fakeData_1.default);
router.use('/demo-mode', demoMode_1.default);
// Calendar Phase 2 routes
router.use('/availability', availability_1.default);
router.use('/blocked-times', blockedTimes_1.default);
// Phase 11A routes - Human Handover
router.use('/handover', handover_1.default);
exports.default = router;
//# sourceMappingURL=index.js.map