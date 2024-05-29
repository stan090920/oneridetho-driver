import React, { useState, useEffect } from 'react';
import withAdminAuth from '../../hoc/withAdminAuth';
import axios from 'axios';
import { parseCookies } from 'nookies';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface RideStats {
  totalRides: number;
  activeRides: number;
  scheduledRides: number;
  completedRides: number;
  cancelledRides: number;
}

interface DriverStats {
  totalDrivers: number;
  averageRating: number;
  topPerformingDrivers: { id: number; name: string; completedRides: number }[];
}

interface EarningsStats {
  totalEarnings: number;
  oneRideThoPayment: number;  // Add this field
  earningsByDriver: { driverId: number; driverName: string; amount: number }[];
  earningsTrends: { date: string; earnings: number }[];
}

interface CancellationStats {
  cancellationRate: number;
  reasons: string[];
}

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  averageUserRating: number;
}

const Dashboard = () => {
  const [rideStats, setRideStats] = useState<RideStats | null>(null);
  const [driverStats, setDriverStats] = useState<DriverStats | null>(null);
  const [earningsStats, setEarningsStats] = useState<EarningsStats | null>(null);
  const [cancellationStats, setCancellationStats] = useState<CancellationStats | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { 'admin-token': token } = parseCookies();
        const headers = { Authorization: `Bearer ${token}` };

        const [rideResponse, driverResponse, earningsResponse, cancellationResponse, userResponse] = await Promise.all([
          axios.get<RideStats>('/api/rides/statistics', { headers }),
          axios.get<DriverStats>('/api/drivers/statistics', { headers }),
          axios.get<EarningsStats>('/api/earnings/statistics', { headers }),
          axios.get<CancellationStats>('/api/cancellations/statistics', { headers }),
          axios.get<UserStats>('/api/users/statistics', { headers })
        ]);

        setRideStats(rideResponse.data);
        setDriverStats(driverResponse.data);
        setEarningsStats(earningsResponse.data);
        setCancellationStats(cancellationResponse.data);
        setUserStats(userResponse.data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    };

    fetchData();
  }, []);

  if (!rideStats || !driverStats || !earningsStats || !cancellationStats || !userStats) {
    return <p className='font-semibold text-lg text-center'>Loading dashboard data...</p>;
  }

  return (
    <div className="p-4 h-[75vh] overflow-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        {/* Ride Statistics */}
        <div className="p-4 bg-white shadow rounded-lg">
          <h3 className="font-semibold mb-2">Ride Statistics</h3>
          <p>Total Rides: {rideStats.totalRides}</p>
          <p>Active Rides: {rideStats.activeRides}</p>
          <p>Scheduled Rides: {rideStats.scheduledRides}</p>
          <p>Completed Rides: {rideStats.completedRides}</p>
          <p>Cancelled Rides: {rideStats.cancelledRides}</p>
        </div>

        {/* Driver Performance */}
        <div className="p-4 bg-white shadow rounded-lg">
          <h3 className="font-semibold mb-2">Driver Performance</h3>
          <p>Total Drivers: {driverStats.totalDrivers}</p>
          <p>Average Rating: {driverStats.averageRating}</p>
          <h4 className="font-semibold mt-2">Top Performing Drivers</h4>
          <ul>
            {driverStats.topPerformingDrivers.map(driver => (
              <li key={driver.id}>{driver.name} - {driver.completedRides} rides</li>
            ))}
          </ul>
        </div>

        {/* Earnings */}
        <div className="p-4 bg-white shadow rounded-lg">
          <h3 className="font-semibold mb-2">Earnings</h3>
          <p>Total Earnings: ${earningsStats.totalEarnings.toFixed(2)}</p>
          <p>OneRideTho Payment: ${earningsStats.oneRideThoPayment.toFixed(2)}</p> {/* Add this line */}
          <h4 className="font-semibold mt-2">Earnings by Driver</h4>
          <ul>
            {earningsStats?.earningsByDriver.map(earning => (
              <li key={earning.driverId}>
                {earning?.driverName}: ${earning.amount.toFixed(2)}
              </li>
            ))}
          </ul>
        </div>

        {/* Cancellations */}
        <div className="p-4 bg-white shadow rounded-lg">
          <h3 className="font-semibold mb-2">Cancellations</h3>
          <p>Cancellation Rate: {cancellationStats.cancellationRate}%</p>
        </div>

        {/* User Activity */}
        <div className="p-4 bg-white shadow rounded-lg">
          <h3 className="font-semibold mb-2">User Activity</h3>
          <p>Total Users: {userStats.totalUsers}</p>
          <p>Active Users: {userStats.activeUsers}</p>
          <p>Average User Rating: {userStats.averageUserRating}</p>
        </div>
      </div>

      {/* Example of a chart */}
      <div className="p-4 bg-white shadow rounded-lg mb-4">
        <h3 className="font-semibold mb-2">Earnings Trends</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={earningsStats.earningsTrends}>
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="earnings" stroke="#8884d8" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default withAdminAuth(Dashboard);
