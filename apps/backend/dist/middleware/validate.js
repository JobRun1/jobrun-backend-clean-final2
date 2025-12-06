"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = validate;
/**
 * Zod validation middleware factory
 */
function validate(schema) {
    return (req, res, next) => {
        try {
            schema.parse(req.body);
            next();
        }
        catch (error) {
            next(error);
        }
    };
}
//# sourceMappingURL=validate.js.map