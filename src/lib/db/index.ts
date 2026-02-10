import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';

const globalForDb = globalThis as unknown as {
    mysqlPool: mysql.Pool | undefined;
};

const connection = globalForDb.mysqlPool ?? mysql.createPool({
    uri: process.env.DATABASE_URL!,
    connectionLimit: 10,
    waitForConnections: true,
    queueLimit: 0,
    enableKeepAlive: true,
});

if (process.env.NODE_ENV !== 'production') {
    globalForDb.mysqlPool = connection;
}

export const db = drizzle(connection, { schema, mode: 'default' });
