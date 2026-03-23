"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDataSource = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("./entities/user.entity");
const feedback_entity_1 = require("./entities/feedback.entity");
const audit_log_entity_1 = require("./entities/audit-log.entity");
exports.AppDataSource = new typeorm_1.DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'insight_user',
    password: process.env.DB_PASSWORD || 'insight_password',
    database: process.env.DB_DATABASE || 'insightstream_dev',
    synchronize: process.env.NODE_ENV !== 'production', // Dev only
    logging: process.env.NODE_ENV !== 'production',
    entities: [user_entity_1.User, feedback_entity_1.Feedback, audit_log_entity_1.AuditLog],
    migrations: [],
    subscribers: [],
});
