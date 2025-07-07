import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export function validateGithubWebhook(req: Request, res: Response, next: NextFunction) {
    const signature = req.headers['x-hub-signature-256'] as string;
    const githubSecret = process.env.GITHUB_WEBHOOK_SECRET;

    if (!githubSecret) {
        return res.status(500).send('Server is not configured for webhooks');
    }

    if (!signature) {
        return res.status(400).send('No X-Hub-Signature-256 found on request');
    }

    const hmac = crypto.createHmac('sha256', githubSecret);
    const digest = 'sha256=' + hmac.update(JSON.stringify(req.body)).digest('hex');

    if (signature !== digest) {
        return res.status(400).send('Invalid signature');
    }

    next();
}
