import db from '../db/knex';
import { LanguageId } from '../languages';

export interface Submission {
  id: string;
  language: LanguageId;
  source_code: string;
  stdin: string;
  status: string;
  stdout: string;
  stderr: string;
  exit_code: number | null;
  execution_time_ms: number | null;
  created_at: Date;
  completed_at: Date | null;
}

export async function createSubmission(data: Partial<Submission>): Promise<Submission> {
  const [submission] = await db<Submission>('submissions')
    .insert(data)
    .returning('*');
  return submission;
}

export async function getSubmissionById(id: string): Promise<Submission | undefined> {
  return db<Submission>('submissions').where({ id }).first();
}

export async function updateSubmission(id: string, data: Partial<Submission>): Promise<Submission | undefined> {
  const [submission] = await db<Submission>('submissions')
    .where({ id })
    .update(data)
    .returning('*');
  return submission;
}
