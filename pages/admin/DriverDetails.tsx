import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import withAdminAuth from '../../hoc/withAdminAuth';
import axios from 'axios';

interface Driver {
  id: number;
  name: string;
  email: string;
  photoUrl?: string;
  carType: string;
  licensePlate: string;
  phone?: string;
  carImageUrl?: string;
  rating?: number;
  numberOfRatings?: number;
  ratings: Rating[];
}

interface Rating {
  id: number;
  rating: number;
  comment: string;
}

interface Earning {
  id: number;
  date: string;
  amount: number;
}

const DriverDetails = () => {
  const router = useRouter();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [totalEarnings, setTotalEarnings] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    const { id } = router.query;
    if (id && typeof id === 'string') {
      const driverId = parseInt(id);
      fetchDriver(driverId);
      fetchDriverEarnings(driverId);
    }
  }, [router.query]);

  const fetchDriver = async (driverId: number) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/drivers?id=${driverId}`);
      if (response.ok) {
        const data = await response.json();
        setDriver(data);
        setRatings(data.ratings);
      } else {
        console.error('Failed to fetch driver information');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDriverEarnings = async (driverId: number, start?: string, end?: string) => {
    try {
      const queryParams = new URLSearchParams({ id: driverId.toString() });
      if (start) queryParams.append('startDate', start);
      if (end) queryParams.append('endDate', end);

      const response = await fetch(`/api/drivers/fetch-earnings?${queryParams}`);
      if (response.ok) {
        const data = await response.json();
        setEarnings(data.rides);
        setTotalEarnings(data.total);
      } else {
        console.error('Failed to fetch driver earnings');
      }
    } catch (error) {
      console.error('Error fetching driver earnings:', error);
    }
  };

  const handleDateFilter = () => {
    const { id } = router.query;
    if (id && typeof id === 'string') {
      const driverId = parseInt(id);
      fetchDriverEarnings(driverId, startDate, endDate);
    }
  };

  const paymentToOneRideTho = totalEarnings * 0.3;

  const handleResetRatings = async () => {
    try {
      setIsResetting(true);
      const response = await axios.delete(`/api/drivers/reset-ratings?id=${driver?.id}`);
      if (response.status === 200) {
        fetchDriver(driver?.id!);
      } else {
        console.error('Failed to reset ratings');
      }
    } catch (error) {
      console.error('Error resetting ratings:', error);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className='relative'>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white z-10">
          <p>Loading driver information...</p>
        </div>
      )}
      <div className="min-h-screen bg-gray-100 flex flex-col">
        <header className="bg-white border-b border-black text-black flex justify-between items-center p-4">
          <button onClick={() => router.back()} className="p-2 bg-gray-200 rounded">Back</button>
          <h1 className="text-xl font-bold">Driver Details</h1>
        </header>
        <main className="px-2 overflow-y-scroll h-[75vh] pt-2">
          <div className="max-w-screen-lg mx-auto bg-white p-6 rounded shadow flex flex-col md:flex-row">
            <div className="flex items-center md:w-1/2">
              {driver?.photoUrl && (
                <img src={driver.photoUrl} alt={driver.name} className="w-24 h-24 rounded-full mr-4" />
              )}
              <div>
                <h2 className="text-2xl font-bold">{driver?.name}</h2>
                <p className="text-gray-600">{driver?.email}</p>
                <p className="text-gray-600">{driver?.phone}</p>
                <p className="text-gray-600">Average Rating: {driver?.rating?.toFixed(2)}</p>
                <p className="text-gray-600">Total Ratings: {driver?.numberOfRatings}</p>
                <button onClick={handleResetRatings} className="bg-red-500 text-white px-4 py-2 mt-2 rounded">
                  {isResetting ? "Resetting" : "Reset Ratings"}
                </button>
              </div>
            </div>
            <div className="mt-4 md:mt-0 md:ml-4 md:w-1/2">
              <h3 className="text-xl font-semibold">Car Details</h3>
              <p className="text-gray-600"><strong>Car Type:</strong> {driver?.carType}</p>
              <p className="text-gray-600"><strong>License Plate:</strong> {driver?.licensePlate}</p>
              {driver?.carImageUrl && (
                <img src={driver.carImageUrl} alt="Car" className="mt-2 w-full md:max-w-xs" />
              )}
            </div>
          </div>
          <div className="max-w-screen-lg mx-auto bg-white p-6 rounded shadow mt-4">
            <h3 className="text-xl font-semibold">Earnings</h3>
            <div className="mb-4">
              <label className="block">
                Start Date:
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded"
                />
              </label>
              <label className="block mt-2">
                End Date:
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded"
                />
              </label>
              <button onClick={handleDateFilter} className="bg-blue-500 text-white px-4 py-2 mt-2 rounded">
                Filter
              </button>
            </div>
            {earnings.length > 0 ? (
              <div>
                <p><strong>Total Driver Earnings for Selected Period:</strong> ${totalEarnings.toFixed(2)}</p>
                <p><strong>Payout To ORT for Selected Period:</strong> ${paymentToOneRideTho.toFixed(2)}</p>
                <h4 className="mt-2">Earnings Details:</h4>
                {earnings.map((earning) => (
                  <div key={earning.id} className="border-t mt-2 pt-2">
                    <p><strong>Ride ID:</strong> {earning.id}</p>
                    <p><strong>Amount:</strong> ${earning.amount.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p>No earnings information available for the selected period.</p>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default withAdminAuth(DriverDetails);
