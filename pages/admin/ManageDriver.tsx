import React, { useState, useEffect } from 'react';
import withAdminAuth from '../../hoc/withAdminAuth';
import { useRouter } from 'next/router';

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
  const router = useRouter();
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
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [carImageUploading, setCarImageUploading] = useState(false);

  useEffect(() => {
    const { id } = router.query;
    if (id && typeof id === 'string') {
      const driverId = parseInt(id);
      fetchDriver(driverId);
    }
  }, [router.query]);

  const fetchDriver = async (driverId: number) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/drivers?id=${driverId}`);
      if (response.ok) {
        const data = await response.json();
        setDriver(data);
      } else {
        console.error('Failed to fetch driver information');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setPhotoUploading(true);
      const url = await handleFileUpload(file);
      if (url) {
        setDriver({ ...driver, photoUrl: url });
      }
      setPhotoUploading(false);
    } else {
      alert('Please select a valid image file for the photo.');
    }
  };

  const handleCarImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setCarImageUploading(true);
      const url = await handleFileUpload(file);
      if (url) {
        setDriver({ ...driver, carImageUrl: url });
      }
      setCarImageUploading(false);
    } else {
      alert('Please select a valid image file for the car image.');
    }
  };

  const handleFileUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/photo', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        return data.imageUrl;
      } else {
        console.error('Failed to upload photo');
        return null;
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      return null;
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(`/api/drivers?id=${driver.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(driver),
      });

      if (response.ok) {
        console.log('Driver updated successfully');
        router.push('/admin/AdminPanel');
      } else {
        console.error('Failed to update driver');
      }
    } catch (error) {
      console.error('Error updating driver:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this driver?')) {
      return;
    }
    
    setIsLoading(true);

    try {
      const response = await fetch(`/api/drivers?id=${driver.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        console.log('Driver deleted successfully');
        router.push('/admin/AdminPanel');
      } else {
        console.error('Failed to delete driver');
      }
    } catch (error) {
      console.error('Error deleting driver:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white z-10">
          <p>Loading driver information...</p>
        </div>
      )}

      <header className="bg-white border-b border-black text-black flex justify-between items-center p-4">
        <button onClick={() => router.back()} className="p-2 bg-gray-200 rounded">Back</button>
        <h1 className="text-xl font-bold">Manage Driver</h1>
      </header>

      <div className="flex justify-center items-center min-h-[75vh] bg-gray-100 py-3">
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
              {driver.photoUrl && (
                <img src={driver.photoUrl} className="block w-16 h-16 mb-2" alt='driver-photo' />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="w-full p-2 border rounded"
              />
              {photoUploading && <p>Uploading photo...</p>}
            </div>
            <div>
              <label className="block mb-2 font-semibold">Car Image</label>
              {driver.carImageUrl && (
                <img src={driver.carImageUrl} className="block w-16 h-16 mb-2" alt='car-image' />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleCarImageChange}
                className="w-full p-2 border rounded"
              />
              {carImageUploading && <p>Uploading car image...</p>}
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
              <br/>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default withAdminAuth(ManageDriver);
