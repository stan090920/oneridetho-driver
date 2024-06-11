import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

type Data = {
  address?: string;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method === 'POST') {
    const { lat, lng } = req.body;
    try {
      const response = await axios.get(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.API_KEY}`);
      const address = response.data.results[0].formatted_address;
      res.status(200).json({ address });
    } catch (error) {
      res.status(500).json({ error: 'Error in reverse geocoding' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
