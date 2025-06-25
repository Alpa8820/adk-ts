import { Kysely, MysqlDialect, PostgresDialect, SqliteDialect } from "kysely";
import {
	type Database,
	DatabaseSessionService,
} from "./database-session-service";

// For PostgreSQL
export function createPostgresSessionService(
	connectionString: string,
	options?: any,
): DatabaseSessionService {
	const { Pool } = require("pg");

	const db = new Kysely<Database>({
		dialect: new PostgresDialect({
			pool: new Pool({
				connectionString,
				...options,
			}),
		}),
	});

	return new DatabaseSessionService({ db });
}

// For MySQL
export function createMysqlSessionService(
	connectionString: string,
	options?: any,
): DatabaseSessionService {
	const { createPool } = require("mysql2");

	const db = new Kysely<Database>({
		dialect: new MysqlDialect({
			pool: createPool({
				uri: connectionString,
				...options,
			}),
		}),
	});

	return new DatabaseSessionService({ db });
}

// For SQLite
export function createSqliteSessionService(
	filename: string,
	options?: any,
): DatabaseSessionService {
	const Database = require("better-sqlite3");

	const db = new Kysely<Database>({
		dialect: new SqliteDialect({
			database: new Database(filename, options),
		}),
	});

	return new DatabaseSessionService({ db });
}

// Generic factory that auto-detects database type from URL (like SQLAlchemy)
export function createDatabaseSessionService(
	databaseUrl: string,
	options?: any,
): DatabaseSessionService {
	if (
		databaseUrl.startsWith("postgres://") ||
		databaseUrl.startsWith("postgresql://")
	) {
		return createPostgresSessionService(databaseUrl, options);
	}

	if (databaseUrl.startsWith("mysql://")) {
		return createMysqlSessionService(databaseUrl, options);
	}

	if (
		databaseUrl.startsWith("sqlite://") ||
		databaseUrl.includes(".db") ||
		databaseUrl === ":memory:"
	) {
		const filename = databaseUrl.startsWith("sqlite://")
			? databaseUrl.substring(9)
			: databaseUrl;
		return createSqliteSessionService(filename, options);
	}

	throw new Error(`Unsupported database URL: ${databaseUrl}`);
}
