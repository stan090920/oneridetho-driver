import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface Driver {
  id: number;
  name: string;
  email: string;
  photoUrl?: string;
  carType: string;
  licensePlate: string;
  phone?: string;
  carImageUrl?: string;
  password: string;
}


const AdminPanel = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);

  useEffect(() => {
    // Fetch the list of drivers from the database
    const fetchDrivers = async () => {
      try {
        const response = await fetch('/api/drivers');
        if (response.ok) {
          const data: Driver[] = await response.json();
          setDrivers(data);
        } else {
          console.error('Failed to fetch drivers');
        }
      } catch (error) {
        console.error('Error fetching drivers:', error);
      }
    };

    fetchDrivers();
  }, []);

  const handleCheckboxChange = (id: number) => {
    setSelectedDriverId(prevId => (prevId === id ? null : id));
  };

  const handleDelete = async () => {
    if (selectedDriverId !== null) {
        try {
        const response = await fetch(`/api/drivers?id=${selectedDriverId}`, {
          method: 'DELETE',
        });
        
        if (response.ok) {
          // Remove the driver from the state
          setDrivers(drivers.filter(driver => driver.id !== selectedDriverId));
          setSelectedDriverId(null);
          console.log('Driver deleted successfully');
        } else {
          console.error('Failed to delete driver');
        }
      } catch (error) {
        console.error('Error deleting driver:', error);
      }
    }
  };

  const handleModify = () => {
    if (selectedDriverId !== null) {
      console.log(`Modifying driver with ID: ${selectedDriverId}`);
      // Implement the modify functionality here
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="bg-white rounded shadow-md w-full max-w-lg sm:p-8">
        <h1 className="text-3xl mb-6 text-center">Admin Panel</h1>
        <div className="mb-6 max-h-60 overflow-auto">
          {drivers.map((driver: any) => (
            <div key={driver.id} className="flex items-center justify-between mb-4">
              <input
                type="checkbox"
                checked={selectedDriverId === driver.id}
                onChange={() => handleCheckboxChange(driver.id)}
                className="mr-4"
              />
              <div className="flex-grow">
                <p className="font-semibold">{driver.name}</p>
                <p className="text-gray-600">{driver.email}</p>
              </div>
              {selectedDriverId === driver.id && (
                <div className="flex">
                  {/*<button
                    onClick={handleModify}
                    className="p-2 bg-green-500 text-white rounded mr-2"
                  >
                    Modify
              </button>*/}
                  <button
                    onClick={handleDelete}
                    className="p-2 bg-red-500 text-white rounded"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
        <Link href="/admin/AddDriver" passHref>
          <button className="block w-full p-4 bg-blue-500 text-white rounded">
            Add Driver
          </button>
        </Link>
      </div>
    </div>
  );
};

export default AdminPanel;
