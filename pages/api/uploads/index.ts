import { NextApiRequest, NextApiResponse } from 'next';
var cloudinary = require('cloudinary').v2;

export default async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
  const { method } = req;

  switch (method) {
    case 'GET':
      try {
        var timestamp = Math.round(new Date().getTime() / 1000);

        const signature = cloudinary.utils.api_sign_request(
          { timestamp: timestamp, tags: 'video_review' },
          process.env.CLOUDINARY_SECRET
        );

        res.json({
          timestamp: timestamp,
          signature: signature,
        });
      } catch (e) {
        res.statusCode = 500;
        console.error('Request error', e);
        res.json({ error: 'Error creating upload' });
      }
      break;
    default:
      res.setHeader('Allow', ['GET']);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
};
