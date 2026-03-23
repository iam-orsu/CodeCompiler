import knex from 'knex';
import { config } from '../config';

const db = knex({
  client: 'pg',
  connection: config.DATABASE_URL,
  pool: {
    min: config.DB_POOL_MIN,
    max: config.DB_POOL_MAX,
  },
});

export default db;
