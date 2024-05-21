import React, { useState, useEffect } from 'react';

interface Driver {
  id: number;
  name: string;
  email: string;
  photoUrl?: string;
  carType: string;
  licensePlate: string;
  phone?: string;
  carImageUrl?: string;
}

const ManageDriver = () => {
  const [driver, setDriver] = useState<Driver>({
    id: 0,
    name: '',
    email: '',
    carType: '',
    licensePlate: '',
    phone: '',
    photoUrl: '',
    carImageUrl: '',
  });

  useEffect(() => {
    // Fetch driver information from API based on driver ID
    // For demo purposes, let's assume the driver ID is 1
    fetchDriver(1);
  }, []);

  const fetchDriver = async (driverId: number) => {
    // Replace this with your actual API endpoint to fetch driver information
    const response = await fetch(`/api/drivers/${driverId}`);
    if (response.ok) {
      const data = await response.json();
      setDriver(data); // Set driver information in state
    } else {
      // Handle error
      console.error('Failed to fetch driver information');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    // Implement update logic here
    console.log('Updating driver:', driver);
  };

  const handleDelete = async () => {
    // Implement delete logic here
    console.log('Deleting driver:', driver);
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 py-8">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-lg h-full max-h-[calc(100vh-4rem)] overflow-auto">
        <h1 className="text-3xl mb-6 text-center">Manage Driver</h1>
        <form onSubmit={handleUpdate} className="space-y-6">
          <div>
            <label className="block mb-2 font-semibold">Name</label>
            <input
              type="text"
              value={driver.name}
              onChange={(e) => setDriver({ ...driver, name: e.target.value })}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block mb-2 font-semibold">Email</label>
            <input
              type="email"
              value={driver.email}
              onChange={(e) => setDriver({ ...driver, email: e.target.value })}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block mb-2 font-semibold">Car Type</label>
            <input
              type="text"
              value={driver.carType}
              onChange={(e) => setDriver({ ...driver, carType: e.target.value })}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block mb-2 font-semibold">License Plate</label>
            <input
              type="text"
              value={driver.licensePlate}
              onChange={(e) => setDriver({ ...driver, licensePlate: e.target.value })}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block mb-2 font-semibold">Phone</label>
            <input
              type="tel"
              value={driver.phone}
              onChange={(e) => setDriver({ ...driver, phone: e.target.value })}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block mb-2 font-semibold">Photo</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setDriver({ ...driver, photoUrl: e.target.files?.[0]?.name || '' })}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block mb-2 font-semibold">Car Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setDriver({ ...driver, carImageUrl: e.target.files?.[0]?.name || '' })}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div className="flex justify-between space-x-2">
            <button type="submit" className="w-1/2 p-2 bg-blue-500 text-white rounded">
              Update
            </button>
            <button type="button" onClick={handleDelete} className="w-1/2 p-2 bg-red-500 text-white rounded">
              Delete
            </button>
          </div>
          <div>
            <br/>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ManageDriver;
