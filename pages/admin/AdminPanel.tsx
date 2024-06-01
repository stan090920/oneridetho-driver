import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import withAdminAuth from '../../hoc/withAdminAuth';
import axios from 'axios';
import { parseCookies } from 'nookies';
import { useRouter } from 'next/router';
import Dashboard from './Dashboard';

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

interface Ride {
  id: number;
  status: string;
  pickupLocation: string;
  dropoffLocation: string;
  scheduledPickupTime: string;
  fare: number;
  user: {
    name: string;
    phone: string;
  };
  driver?: {
    phone: string;
  };
}

const AdminPanel = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [rides, setRides] = useState<Ride[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);
  const [currentPanel, setCurrentPanel] = useState<string>('drivers');
  const [adminName, setAdminName] = useState<string>('Admin');
  const [loadingDrivers, setLoadingDrivers] = useState<boolean>(true);
  const [loadingRides, setLoadingRides] = useState<boolean>(true);
  const router = useRouter();

  const formatDate = (dateString: string): string => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    };
    return new Intl.DateTimeFormat("en-US", options).format(
      new Date(dateString)
    );
  };

  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        setLoadingDrivers(true);
        const response = await fetch('/api/drivers');
        if (response.ok) {
          const data: Driver[] = await response.json();
          setDrivers(data);
        } else {
          console.error('Failed to fetch drivers');
        }
      } catch (error) {
        console.error('Error fetching drivers:', error);
      } finally {
        setLoadingDrivers(false);
      }
    };

    const fetchRides = async () => {
      try {
        setLoadingRides(true);
        const response = await fetch('/api/allride');
        if (response.ok) {
          const data: Ride[] = await response.json();
          const filteredRides = data.filter(ride => 
            ['Scheduled', 'InProgress', 'Requested'].includes(ride.status)
          );
          setRides(filteredRides);
        } else {
          console.error('Failed to fetch rides');
        }
      } catch (error) {
        console.error('Error fetching rides:', error);
      } finally {
        setLoadingRides(false);
      }
    };

    const fetchAdminDetails = async () => {
      const { 'admin-token': token } = parseCookies();
      try {
        const response = await axios.get('/api/admin/fetch-admin', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setAdminName(response.data.name);
      } catch (error) {
        console.error('Failed to fetch admin details:', error);
      }
    };

    fetchDrivers();
    fetchRides();
    fetchAdminDetails();
  }, []);

  const handleCheckboxChange = (id: number) => {
    setSelectedDriverId(prevId => (prevId === id ? null : id));
  };

  const handleDelete = async () => {
    if (selectedDriverId !== null) {
      if (!window.confirm('Are you sure you want to delete this driver?')) {
          return;
      }

      try {
          const response = await fetch(`/api/drivers?id=${selectedDriverId}`, {
              method: 'DELETE',
          });

          if (response.ok) {
              setDrivers(drivers.filter(driver => driver.id !== selectedDriverId));
              setSelectedDriverId(null);
              console.log('Driver deleted successfully');
          } else {
              const errorText = await response.text();
              console.error('Failed to delete driver:', errorText);
          }
      } catch (error) {
          console.error('Error deleting driver:', error);
      }
    }
  };


  const handleModify = () => {
    if (selectedDriverId !== null) {
      router.push(`/admin/ManageDriver?id=${selectedDriverId}`);
    }
  };

  const handleCancelRide = async (rideId: number) => {
    try {
      const response = await fetch(`/api/rides/cancel/${rideId}`, {
        method: 'POST',
      });

      if (response.ok) {
        setRides(rides.filter(ride => ride.id !== rideId));
        console.log('Ride cancelled successfully');
      } else {
        console.error('Failed to cancel ride');
      }
    } catch (error) {
      console.error('Error cancelling ride:', error);
    }
  };

  const renderDriversPanel = () => (
    <div className="mb-6 max-h-80">
      {loadingDrivers ? (
        <p className="font-semibold text-lg text-center">Loading drivers...</p>
      ) : (
        <>
          <div className="h-96 overflow-auto mx-auto max-w-screen-lg">
            {drivers.map((driver: any) => (
              <div key={driver.id} className="flex items-center justify-between mb-4 h-10">
                <input
                  type="checkbox"
                  checked={selectedDriverId === driver.id}
                  onChange={() => handleCheckboxChange(driver.id)}
                  className="mr-4 cursor-pointer"
                />
                <div className="flex-grow">
                  <Link href={`/admin/DriverDetails?id=${driver.id}`} passHref>
                    <div className="cursor-pointer">
                      <p className="font-semibold">{driver.name}</p>
                      <p className="text-gray-600 hidden sm:block">{driver.email}</p>
                    </div>
                  </Link>
                </div>
                {selectedDriverId === driver.id && (
                  <div className="flex">
                    <button
                      onClick={handleModify}
                      className="p-2 bg-green-500 text-white rounded mr-2"
                    >
                      Modify
                    </button>
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
          <div className="flex justify-center w-full">
            <Link href="/admin/AddDriver" passHref className='max-w-sm w-96'>
              <button
                className="p-4 text-white rounded bg-green-500 hover:bg-green-600 w-full"
              >
                Add Driver
              </button>
            </Link>
          </div>
        </>
      )}
    </div>
  );

  const renderRidesPanel = () => (
    <div className="mb-6 max-h-80">
      {loadingRides ? (
        <p className="font-semibold text-lg text-center">Loading rides...</p>
      ) : (
        <div className="h-96 overflow-auto mx-auto max-w-screen-lg">
          {rides.length === 0 ? (
            <p className="font-semibold text-lg text-center">No Active Rides</p>
          ) : (
            rides.map((ride: any) => (
              <div key={ride.id} className="border-2 py-2 pl-2 pr-2 mt-2 rounded-md">
                <div>
                  <strong>Customer:</strong> {ride.user.name}
                </div>
                <div>
                  <strong>Status:</strong> {ride.status}
                </div>
                <div>
                  <strong>Pickup Location:</strong> {ride.pickupLocation}
                </div>
                <div>
                  <strong>Dropoff Location:</strong> {ride.dropoffLocation}
                </div>
                {ride.scheduledPickupTime && (
                  <div>
                    <strong>Scheduled Pickup Time:</strong> {formatDate(ride.scheduledPickupTime)}
                  </div>
                )}
                {ride.fare && (
                  <div>
                    <strong>Fare:</strong> ${ride.fare.toFixed(2)}
                  </div>
                )}
                <button
                  onClick={() => handleCancelRide(ride.id)}
                  className="mt-2 p-2 bg-red-500 text-white rounded"
                >
                  Cancel Ride
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-white border-b border-black text-black flex justify-between items-center p-4">
        <nav className="flex space-x-4">
          <button 
            onClick={() => setCurrentPanel('rides')} 
            className={`p-2 ${currentPanel === 'rides' ? 'border-b-2 border-black' : ''}`}
          >
            Rides
          </button>
          <button 
            onClick={() => setCurrentPanel('drivers')} 
            className={`p-2 ${currentPanel === 'drivers' ? 'border-b-2 border-black' : ''}`}
          >
            Drivers
          </button>
          <button 
            onClick={() => setCurrentPanel('dashboard')} 
            className={`p-2 ${currentPanel === 'dashboard' ? 'border-b-2 border-black' : ''}`}
          >
            Dashboard
          </button>
        </nav>
        <div className="text-xl font-bold">
          {adminName.split(" ")[0]}
        </div>
      </header>
      <main className="flex-grow p-4">
        {currentPanel === 'drivers' && renderDriversPanel()}
        {currentPanel === 'rides' && renderRidesPanel()}
        {currentPanel === 'dashboard' && <Dashboard />}
      </main>
    </div>
  );
};

export default withAdminAuth(AdminPanel);
