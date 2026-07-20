import type { Request, Response } from 'express';
import { uploadService } from './upload.service.js';

export class UploadController {
  uploadOne(req: Request, res: Response) {
    if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier reçu' });
    }
    res.status(201).json({ url: uploadService.toPublicUrl(req.file.filename) });
  }

  uploadMany(req: Request, res: Response) {
    const files = req.files as Express.Multer.File[] | undefined;
    if (!files?.length) {
      return res.status(400).json({ message: 'Aucun fichier reçu' });
    }
    res.status(201).json({
      urls: files.map((f) => uploadService.toPublicUrl(f.filename)),
    });
  }
}

export const uploadController = new UploadController();
