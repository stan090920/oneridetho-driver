import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import Image from 'next/image';

interface Rating {
  id: number;
  value: number;
  comment?: string;
}

interface Driver {
  id: number;
  name: string;
  photoUrl?: string;
  rating?: number;
  numberOfRatings?: number;
  ratings: Rating[];
}

const RatingsPage = () => {
  const { data: session } = useSession();
  const [driver, setDriver] = useState<Driver | null>(null);

  useEffect(() => {
    if (session?.user) {
      fetchDriverRatings();
    }
  }, [session]);

  const fetchDriverRatings = async () => {
    try {
      const response = await axios.get<Driver>(`/api/ratings`);
      setDriver(response.data);
    } catch (error) {
      console.error('Error fetching driver ratings:', error);
    }
  };

  if (!session) {
    return <div>Please log in to see your ratings.</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Your Ratings</h1>
      {driver && (
        <div className="flex items-center mb-6">
          <Image
            src={driver.photoUrl || '/default-profile.png'}
            alt={driver.name}
            width={50}
            height={50}
            className="rounded-full"
          />
          <div className="ml-4">
            <h2 className="text-xl">{driver.name}</h2>
            <p>Current Rating: {driver.rating?.toFixed(2)}</p>
            <p>Total Ratings: {driver.numberOfRatings}</p>
          </div>
        </div>
      )}
      {driver?.ratings && driver.ratings.length > 0 ? (
        <table className="min-w-full bg-white border border-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="py-2 px-4 border-r border-gray-200">Rating</th>
              <th className="py-2 px-4">Comment</th>
            </tr>
          </thead>
          <tbody>
            {driver.ratings.map((rating) => (
              <tr key={rating.id} className="border-b border-gray-200">
                <td className="py-2 px-4 border-r border-gray-200 text-center">{rating.value}</td>
                <td className="py-2 px-4">{rating.comment || 'No comment'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div>No ratings available.</div>
      )}
    </div>
  );
};

export default RatingsPage;
