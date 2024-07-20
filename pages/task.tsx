import React, { useEffect, useState } from "react";
import Link from "next/link";
import { FaHistory } from "react-icons/fa";
import { useSession } from "next-auth/react";
import router from "next/router";
import axios from 'axios';
import toast from "react-hot-toast";

type Ride = {
  id: number;
  status: string;
  pickupLocation: any;
  dropoffLocation: any;
  passengerCount: number;
  scheduledPickupTime?: string;
  isAccepted: boolean;
  driverId: number;
  fare?: number;
  user?: {
    name: string;
  };
};

interface Coordinates {
  lat: number;
  lng: number;
}

interface DailyEarning {
  date: string;
  total: number;
}

const Task = () => {
  const [requestedRides, setRequestedRides] = useState<Ride[]>([]);
  const [scheduledRides, setScheduledRides] = useState<Ride[]>([]);
  const [inProgressRides, setInProgressRides] = useState<Ride[]>([]);
  const [completedRides, setCompletedRides] = useState<Ride[]>([]);
  const [cancelledRides, setCancelledRides] = useState<Ride[]>([]);
  const { data: session, status } = useSession();
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status !== "loading" && !session) {
      alert("You must be logged in to view this page");
      router.push("/");
    }
  }, [session, status, router]);


  const [showRequestedRides, setShowRequestedRides] = useState(true);
  const [showRideHistory, setShowRideHistory] = useState(false);
  const [rideHistoryType, setRideHistoryType] = useState<
    "completed" | "cancelled" | "none"
  >("none");
  const [activeButton, setActiveButton] = useState<
    "requested" | "scheduled" | "history" | "inProgress"
  >("requested");

  const formatDate = (dateString: string): string => {
    const dateTime = new Date(Date.parse(dateString));
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    };
    return dateTime.toLocaleString('en-US', options);
  };

  // Function to fetch rides data
  useEffect(() => {
    fetchRidesData(); // Initial fetch when the component mounts

    const intervalId = setInterval(fetchRidesData, 1000); // Fetch data every 10 seconds

    // Cleanup interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  // Fetch rides data function
  const fetchRidesData = async () => {
    try {
      const response = await fetch("/api/allride");
      const data = await response.json();
      if (Array.isArray(data)) {
        // Function to process ride locations
        const processRideLocations = async (ride: Ride) => {
          const pickupLocation = JSON.parse(ride.pickupLocation);
          const dropoffLocation = JSON.parse(ride.dropoffLocation);
          const pickupAddress = await reverseGeocode(pickupLocation.lat, pickupLocation.lng);
          const dropoffAddress = await reverseGeocode(dropoffLocation.lat, dropoffLocation.lng);
          return {...ride, pickupLocation: pickupAddress, dropoffLocation: dropoffAddress, };
        };

        // Filter and process rides based on status and acceptance
        const requested = await Promise.all(data.filter((ride) => ride.status === "Requested" && !ride.isAccepted).map(processRideLocations)
        );
        const scheduled = await Promise.all(data.filter((ride) => ride.status === "Scheduled" && !ride.isAccepted).map(processRideLocations));
        const inProgress = await Promise.all(
          data.filter((ride) =>
                (ride.status === "InProgress" && ride.driverId === session?.user.id) ||
                (ride.isAccepted && (ride.status === "Requested" || ride.status === "Scheduled") && ride.driverId === session?.user.id)
            ).map(processRideLocations));

        const completed = await Promise.all(data.filter((ride) => (ride.status === "Completed") && 
          ride.driverId === session?.user.id).map(processRideLocations));
        const cancelled = await Promise.all(data.filter((ride) => (ride.status === "Cancelled") && 
          ride.driverId === session?.user.id).map(processRideLocations));

        // Update state with fetched data
        setRequestedRides(requested);
        setScheduledRides(scheduled);
        setInProgressRides(inProgress);
        setCompletedRides(completed);
        setCancelledRides(cancelled);
      }
    } catch (error) {
      console.error("Error fetching rides:", error);
    }
  };



  const handleRideHistoryType = async (type: "completed" | "cancelled") => {
    setShowRideHistory(false);
    setRideHistoryType(type);
    try {
      const response = await fetch(`/api/rides/${type}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${type} rides: ${response.status} ${response.statusText}`);
      }

      const rides = await response.json();
      console.log(`Fetched ${type} rides:`, rides);
      type === "completed" 
        ? setCompletedRides(rides) 
        : setCancelledRides(rides);
    } catch (error) {
      console.error(`Error fetching ${type} rides:`, error);
    }
  };

  const [dailyEarnings, setDailyEarnings] = useState<DailyEarning[]>([]);
  const [totalEarnings, setTotalEarnings] = useState<number | undefined>(
    undefined
  );

  
  const renderNoRidesMessage = () => {
    return <div className="text-center py-[200px] font-bold text-[24px]">No rides</div>;
  };

  useEffect(() => {
    fetchEarningsData();
  }, []);

  const fetchEarningsData = async () => {
    try {
      const response = await fetch("/api/earnings");
      const data = await response.json();

      if (data.daily) {
        setDailyEarnings(data.daily);
      }
      if (data.total !== undefined) {
        setTotalEarnings(data.total);
      } else {
        console.error("Total earnings data is missing");
      }
    } catch (error) {
      console.error("Failed to fetch earnings data:", error);
    }
  };

  const paymentToOneRideTho = totalEarnings ? totalEarnings * 0.3 : 0;

    
  const reverseGeocode = async (lat: number, lng: number): Promise<string> =>  {
    try {
      const response = await axios.post('/api/reverseGeocode', { lat, lng });
      setAddress(response.data.address);
      return response.data.address;
    } catch (error) {
      console.error('Error in reverse geocoding:', error);
      return '';
    }
  };

  const unacceptRide = async (rideId: number) => {
    setLoading(true);
    const loadingToastId = toast.loading("Unaccepting Ride...");

    try {
      const response = await fetch(`/api/rides/unaccept/${rideId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rideId }),
      });

      const responseText = await response.text();

      if (response.ok) {
        toast.success("Ride Unaccepted!", { id: loadingToastId });
        router.reload();
      } else {
        console.error("Failed to unaccept ride:", responseText);
        toast.error("Failed to unaccept ride", { id: loadingToastId });
      }
    } catch (error) {
      console.error("Error unaccepting ride:", error);
      toast.error("Error unaccepting ride", { id: loadingToastId });
    } finally {
      setLoading(false);
    }
  };



  const RenderRides = (rides: Ride[]) => {
    return rides.length > 0 ? (
      rides.map((ride) => {
        const rideLink =
          ride.status === "InProgress" ||
          ((ride.status === "Requested" || ride.status === "Scheduled") &&
            ride.isAccepted)
            ? `/ride/${ride.id}`
            : `/dashboard?rideId=${ride.id}`;

        return (
          <li key={ride.id} className="border-2 py-2 pl-2 pr-2 mt-2 rounded-md">
            <Link href={rideLink}>
              <strong>Ride ID:</strong> {ride.id}
              <div>
                <strong>Status:</strong> {ride.status}
              </div>
              <div>
                <strong>Customer Name:</strong> {ride.user?.name}
              </div>
              <div>
                <strong>Pickup Location:</strong> {ride.pickupLocation}
              </div>
              <div>
                <strong>Dropoff Location:</strong> {ride.dropoffLocation}
              </div>
              <div>
                <strong>Passengers:</strong> {ride.passengerCount}
              </div>
              {ride.scheduledPickupTime && (
                <div>
                  <strong>Scheduled Pickup Time:</strong>{" "}
                  {formatDate(ride.scheduledPickupTime)}
                </div>
              )}
              {ride.fare && (
                <div>
                  <strong>Fare:</strong> ${ride.fare.toFixed(2)}
                </div>
              )}
            </Link>
            {(ride.status === "Requested" || ride.status === "Scheduled") &&
              ride.isAccepted && (
                <button
                  onClick={() => unacceptRide(ride.id)}
                  className="bg-red-500 text-white px-4 py-2 mt-2 rounded"
                  disabled={loading}
                >
                  Unaccept
                </button>
              )}
          </li>
        );
      })
    ) : (
      renderNoRidesMessage()
    );
  };



  return (
    <div>
      <div className="bg-green-400 mt-5 ml-2 px-2 w-[300px] pb-5 pt-3 rounded-md">
        <div className="flex items-center justify-between w-[95%]">
          <div className="text-[16px]">Weekly Earning</div>
          <div className="text-[16px]">Payout To ORT</div>
        </div>
        <div className="flex items-center justify-between w-[75%]">
        <div className="ml-2 text-[20px]">
          $
          {totalEarnings !== undefined
            ? totalEarnings.toFixed(2)
            : "Loading..."}
        </div>

        <div className="text-[20px]">
        ${paymentToOneRideTho.toFixed(2)}
        </div>
        </div>
      </div>

      <div className="flex items-center mt-2 pb-2">
        <button
          onClick={() => {
            setShowRequestedRides(false);
            setActiveButton("inProgress");
          }}
          className={`font-bold text-[18px] px-2 ${
            activeButton === "inProgress" ? "text-blue-500" : ""
          }`}
        >
          In Progress
        </button>
        <button
          onClick={() => {
            setShowRequestedRides(true);
            setActiveButton("requested");
          }}
          className={`font-bold text-[18px] px-2 ${
            activeButton === "requested" ? "text-blue-500" : ""
          }`}
        >
          Booked Now
        </button>
        <button
          onClick={() => {
            setShowRequestedRides(false);
            setActiveButton("scheduled");
          }}
          className={`font-bold text-[18px] px-2 ${
            activeButton === "scheduled" ? "text-blue-500" : ""
          }`}
        >
          Scheduled
        </button>
        <button
          onClick={() => {
            setShowRideHistory(true);
            setActiveButton("history");
          }}
          className={`font-bold text-[24px] px-2 ${
            activeButton === "history" ? "text-blue-500" : ""
          }`}
        >
          <FaHistory />
        </button>
      </div>

      {showRideHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white p-4 rounded-md">
            <button
              onClick={() => handleRideHistoryType("completed")}
              className="text-blue-500 hover:underline"
            >
              Completed Rides
            </button>
            <br />
            <button
              onClick={() => handleRideHistoryType("cancelled")}
              className="text-blue-500 hover:underline"
            >
              Cancelled Rides
            </button>
            <br />
            <button
              onClick={() => setShowRideHistory(false)}
              className="text-red-500 hover:underline"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <ul className="px-2 overflow-y-scroll h-[60vh]">
        {(activeButton === "requested" || activeButton === "scheduled") &&
          (showRequestedRides
            ? RenderRides(requestedRides)
            : RenderRides(scheduledRides))}
        {activeButton === "history" &&
          (rideHistoryType === "completed"
            ? RenderRides(completedRides)
            : RenderRides(cancelledRides))}
        {activeButton === "inProgress" &&
            RenderRides(inProgressRides)}
      </ul>
    </div>
  );
};

export default Task;
