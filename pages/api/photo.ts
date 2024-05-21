import { NextApiRequest, NextApiResponse } from 'next';
import cloudinary from 'cloudinary';
import { IncomingForm } from 'formidable';

cloudinary.v2.config({ 
  cloud_name: process.env.CLOUD_NAME, 
  api_key: process.env.API_KEY_CLOUD, 
  api_secret: process.env.API_SECRET
});

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  const form = new IncomingForm();

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('Error parsing form data:', err);
      res.status(500).json({ message: 'Error uploading photo' });
      return;
    }

    if (!files.file) {
      res.status(400).json({ message: 'No file uploaded.' });
      return;
    }

    try {
      const file = Array.isArray(files.file) ? files.file[0] : files.file;
      const result = await cloudinary.v2.uploader.upload(file.filepath);


      res.status(200).json({ imageUrl: result.secure_url });
    } catch (error) {
      console.error('Error uploading file:', error);
      res.status(500).json({ message: 'Error uploading file' });
    }
  });
}
