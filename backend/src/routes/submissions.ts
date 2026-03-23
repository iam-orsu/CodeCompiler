import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { createSubmission, getSubmissionById } from '../models/submission';
import { addExecutionJob } from '../queue/queue';
import { LANGUAGES, LanguageId } from '../languages';

const router = Router();

const submissionSchema = z.object({
  language: z.string(),
  source_code: z.string().min(1, "Source code cannot be empty"),
  stdin: z.string().optional().default(''),
});

router.post('/submissions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parseRes = submissionSchema.safeParse(req.body);
    if (!parseRes.success) {
      return res.status(400).json({ error: 'Invalid input parameters', details: parseRes.error.format() });
    }

    const { language, source_code, stdin } = parseRes.data;
    
    const langValid = LANGUAGES.some(l => l.id === language);
    if (!langValid) {
      return res.status(400).json({ error: `Language identifier ${language} is unsupported.` });
    }

    const submission = await createSubmission({
      language: language as LanguageId,
      source_code,
      stdin,
      status: 'queued'
    });

    await addExecutionJob(submission.id);

    res.status(201).json({
      id: submission.id,
      status: submission.status,
      created_at: submission.created_at
    });
  } catch (error) {
    next(error);
  }
});

router.get('/submissions/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const submission = await getSubmissionById(id);
    if (!submission) {
      return res.status(404).json({ error: 'Submission logic sequence not found' });
    }
    res.json(submission);
  } catch (error) {
    next(error);
  }
});

router.get('/languages', (req: Request, res: Response) => {
  const filtered = LANGUAGES.filter(l => !l.isWebMode && !l.isSpecial);
  res.json(filtered);
});

export default router;
