import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

type Data = {
  lat?: number;
  lng?: number;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method === 'POST') {
    const { address } = req.body;
    try {
      // Sanitize input address
      const encodedAddress = encodeURIComponent(address);
      
      // Make geocoding API request
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${process.env.API_KEY}`
      );

      // Check if response contains expected data structure
      if (
        response?.data?.results?.[0]?.geometry?.location
      ) {
        const { lat, lng } = response.data.results[0].geometry.location;
        res.status(200).json({ lat, lng });
      } else {
        res.status(500).json({ error: 'Invalid geocoding response' });
      }
    } catch (error) {
      // Handle specific errors and provide more detailed error message
      let errorMessage = 'Error in geocoding';
      if ((error as any)?.response?.status) {
        errorMessage += ` - Status: ${(error as any).response.status}`;
      }
      console.error(errorMessage, error);
      res.status(500).json({ error: errorMessage });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
