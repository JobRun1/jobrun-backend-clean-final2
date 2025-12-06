"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const response_1 = require("../utils/response");
const constants_1 = require("../utils/constants");
const router = (0, express_1.Router)();
/**
 * GET /version
 * Version information endpoint
 */
router.get('/', (req, res) => {
    const response = {
        name: constants_1.APP_NAME,
        version: constants_1.APP_VERSION,
    };
    (0, response_1.sendSuccess)(res, response);
});
exports.default = router;
//# sourceMappingURL=version.js.map