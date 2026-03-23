import { Knex } from 'knex';

export async function runMigrations(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('submissions');
  
  if (!exists) {
    await knex.schema.createTable('submissions', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('language', 20).notNullable();
      table.text('source_code').notNullable();
      table.text('stdin').defaultTo('');
      table.string('status', 20).notNullable().defaultTo('queued');
      table.text('stdout').defaultTo('');
      table.text('stderr').defaultTo('');
      table.integer('exit_code').nullable();
      table.integer('execution_time_ms').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('completed_at').nullable();
    });
    console.log("✅ Migrations Complete: 'submissions' table successfully mounted.");
  } else {
    console.log("✅ Migrations Clean: 'submissions' table verified.");
  }
}
