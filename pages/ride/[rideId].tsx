import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import useSWR from "swr";
import {
  GoogleMap,
  LoadScript,
  Marker,
  DirectionsRenderer,
} from "@react-google-maps/api";
import Image from "next/image";
import { useSession } from "next-auth/react";

const mapContainerStyle = {
  width: "100%",
  height: "90vh",
};

const mapOptions = {
  fullscreenControl: false,
  mapTypeControl: false,
  streetViewControl: false,
  zoomControl: false,
};

interface User {
  id: number;
  name: string;
  rating: number;
  photoUrl: string;
  phone: number;
}
interface Location {
  lat: number;
  lng: number;
}

interface Ride {
  id: number;
  pickupLocation: string;
  dropoffLocation: any;
  fare: number;
  user: User;
  status: string;
  stops?: Location[];
}

interface Location {
  lat: number;
  lng: number;
}

// Function to calculate distance between two coordinates using Haversine formula
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km
  return distance;
};


const RidePage = () => {
  const router = useRouter();
  const { rideId } = router.query;
  const [rideDetails, setRideDetails] = useState<Ride | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [directions, setDirections] = useState(null);
  const [driverLocation, setDriverLocation] = useState({ lat: 0, lng: 0 });
  const [pickupLocation, setPickupLocation] = useState<Location | null>(null);
  const [eta, setEta] = useState("");
  const [dropoffLocation, setDropoffLocation] = useState<Location | null>(null);
  const [isPickedUp, setIsPickedUp] = useState(false);
  const [rideCancelled, setRideCancelled] = useState(false);
  const fetcher = (url: string) => axios.get(url).then((res) => res.data);
  const { data: session, status } = useSession();
  const { data: swrRideDetails, error: rideError } = useSWR(
    rideId ? `/api/rides/${rideId}` : null,
    fetcher
  );


  useEffect(() => {
    if (status !== "loading" && !session) {
      alert("You must be logged in to view this page");
      router.push("/");
    }
  }, [session, status, router]);
  
  useEffect(() => {
    if (swrRideDetails?.status === "Cancelled") {
      alert("Ride has been cancelled");
      router.push("/dashboard");
    }
  }, [swrRideDetails, router]);
  const mapRef = useRef();

  const onMapLoad = useCallback((map: any) => {
    mapRef.current = map;
  }, []);

  const [timer, setTimer] = useState(600);
  const [timerActive, setTimerActive] = useState(false);
  const [extraCharges, setExtraCharges] = useState(0);
  const [initialPeriodPassed, setInitialPeriodPassed] = useState(false);


  useEffect(() => {
    let interval: number | undefined;
  
    if (timerActive) {
      if (!initialPeriodPassed) {
        interval = window.setInterval(() => {
          setTimer(prevTimer => {
            if (prevTimer - 1 <= 0) {
              setInitialPeriodPassed(true);
              notifyUser(); 
            }
            return Math.max(prevTimer - 1, 0); 
          });
        }, 1000);
      } else {
        interval = window.setInterval(() => {
          setExtraCharges(prevCharges => prevCharges + 1);
        }, 60000);
      }
    } else {
      clearInterval(interval);
    }
  
    return () => clearInterval(interval);
  }, [timerActive, timer, initialPeriodPassed]);
  
  
  const handleStartStopTimer = () => {
    if (timerActive) {
      setTimerActive(false);
    } else {
      if (!initialPeriodPassed && timer <= 0) {
        setTimer(600);
        setInitialPeriodPassed(false);
      }
      setTimerActive(true);
    }
  };
  

  const formatTime = () => {
    const minutes = Math.floor(timer / 60);
    const seconds = timer % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const notifyUser = async () => {
    try {
      await axios.post("/api/sendNotification", { rideId: rideDetails?.id });
      console.log("Notification sent to user");
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  };

  const updateDriverLocation = useCallback(
    async (lat: number, lng: number) => {
      try {
        const driverId = session?.user.id;
        await axios.patch("/api/drivers/location", {
          driverId,
          location: { lat, lng },
        });
        setDriverLocation({ lat, lng });
      } catch (error) {
        console.error("Error updating driver location:", error);
      }
    },
    [session?.user.id]
  );

  useEffect(() => {
    let watchId: number | undefined;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          updateDriverLocation(latitude, longitude);
        },
        (error) => {
          console.error("Error watching position:", error);
        },
        { enableHighAccuracy: true }
      );
    }
    // Clean up
    return () => {
      if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
    };
  }, [updateDriverLocation]);

  const fetchCoordinates = async (address: any) => {
    try {
      const response = await axios.post("/api/geocode", { address });
      if (response.data && response.data.lat && response.data.lng) {
        return response.data; // Ensure this returns { lat: number, lng: number }
      } else {
        console.error("Invalid coordinates response:", response.data);
        return null;
      }
    } catch (error) {
      console.error("Error fetching coordinates:", error);
      return null;
    }
  };

  // Check if the driver is within the reasonable distance threshold from the pickup point
  const isDriverNearPickup = () => {
    if (!driverLocation || !pickupLocation) return false;
    const distance = calculateDistance(
      driverLocation.lat,
      driverLocation.lng,
      pickupLocation.lat,
      pickupLocation.lng
    );
    return distance <= 0.2; // Threshold distance in km (adjust as needed)
  };


  const handlePickedUp = async () => {
    if (rideDetails) {
      if (rideDetails.status === "Completed") {
        alert("This ride has already been completed.");
        return;
      }

      // Check if the driver is near the pickup location
      if (!isDriverNearPickup()) {
        const proceed = window.confirm(
          "You are not yet at the pickup location. Do you want to mark the ride as arrived anyway?"
        );
        if (!proceed) {
          return;
        }
      }

      try {
        await axios.patch(`/api/rides/${rideId}`, {
          status: "InProgress",
          pickupTime: new Date(),
        });

        const dropoffCoordinates = await fetchCoordinates(
          rideDetails.dropoffLocation
        );
        if (dropoffCoordinates) {
          setDropoffLocation(dropoffCoordinates);
        }
      } catch (error) {
        console.error("Error updating ride status:", error);
      }
    }
    setIsPickedUp(true);
  };

  const handleRideComplete = async () => {
    if (rideDetails) {
      try {
        await axios.patch(`/api/rides/${rideId}`, {
          status: "Completed",
          dropoffTime: new Date(),
        });
        alert("Ride completed successfully!");

        router.push("/dashboard");
      } catch (error) {
        console.error("Error completing the ride:", error);
        alert("Failed to complete the ride.");
      }
    }
  };

  useEffect(() => {
    const fetchRideDetails = async () => {
      if (typeof rideId === "string") {
        setIsLoading(true);
        try {
          const response = await axios.get(`/api/rides/${rideId}`);
          const fetchedRideDetails = response.data;

          setRideDetails(fetchedRideDetails);

          const coordinates = await fetchCoordinates(
            fetchedRideDetails.pickupLocation
          );
          if (coordinates) {
            setPickupLocation(coordinates);
          }
        } catch (error) {
          console.error("Error fetching ride details:", error);
          setError("Failed to load ride details.");
        } finally {
          setIsLoading(false);
        }
      }
    };
    fetchRideDetails();
  }, [rideId, router]);

  useEffect(() => {
    const updateDirections = () => {
      if (!mapRef.current || !driverLocation || !(pickupLocation || dropoffLocation)) return;

      const destination = isPickedUp ? dropoffLocation : pickupLocation;
      if (!destination) return;

      const directionsService = new google.maps.DirectionsService();

      directionsService.route(
        {
          origin: driverLocation,
          destination: destination,
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === google.maps.DirectionsStatus.OK) {
            //@ts-ignore
            setDirections(result);
            //@ts-ignore
            const duration = result.routes[0].legs[0].duration.text;
            setEta(duration);
          } else {
            console.error(`Error fetching directions: ${status}`);
          }
        }
      );
    };

    const intervalId = setInterval(updateDirections, 3000); // Update directions every 3 seconds
    return () => clearInterval(intervalId);
  }, [driverLocation, pickupLocation, dropoffLocation, isPickedUp]);

  
  const openInMaps = () => {
    if (rideDetails && rideDetails.pickupLocation && rideDetails.dropoffLocation) {
      const baseMapsUrl = 'https://www.google.com/maps/dir/?api=1';
      let waypoints = '';
  
      let stops = [];
      if (rideDetails.stops) {
        try {
          stops = Array.isArray(rideDetails.stops) ? rideDetails.stops : JSON.parse(rideDetails.stops);
        } catch (error) {
          console.error("Error parsing stops:", error);
        }
      }
  
      if (stops.length > 0) {
        //@ts-ignore
        waypoints = stops.map(stop => `${stop.lat},${stop.lng}`).join('|');
      }
  
      const pickupCoords = `${rideDetails.pickupLocation},${rideDetails.pickupLocation}`;
      const dropoffCoords = `${rideDetails.dropoffLocation},${rideDetails.dropoffLocation}`;
      const url = `${baseMapsUrl}&origin=${pickupCoords}&destination=${dropoffCoords}${waypoints ? `&waypoints=${waypoints}` : ''}`;
  
      window.open(url, "_blank");
    }
  };


  
  

  const [manualDriverLat, setManualDriverLat] = useState("");
  const [manualDriverLng, setManualDriverLng] = useState("");

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          setManualDriverLat(lat.toString());
          setManualDriverLng(lng.toString());
          setDriverLocation({ lat, lng });

          await updateDriverLocation(lat, lng);
        },
        (error) => {
          console.error("Error getting current location:", error);
        }
      );
    } else {
      console.error("Geolocation is not supported by this browser.");
    }
  };

  const [showOverlay, setShowOverlay] = useState(false);

  const handlePhotoClick = () => {
    setShowOverlay(true);
  };

  const handleOverlayClick = () => {
    setShowOverlay(false);
  };

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;


  return (
    <div>
      {rideDetails && (
        <>
          <LoadScript googleMapsApiKey={process.env.API_KEY || ""}>
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={isPickedUp ? dropoffLocation || { lat: 0, lng: 0 } : pickupLocation || { lat: 0, lng: 0 }}
              zoom={12}
              onLoad={onMapLoad}
              options={mapOptions}
            >
              <Marker position={driverLocation} label="Driver" />
              {!isPickedUp && pickupLocation && <Marker position={pickupLocation} label="Pickup" />}
              {isPickedUp && dropoffLocation && <Marker position={dropoffLocation} label="Dropoff" />}
              {directions && <DirectionsRenderer directions={directions} />}
            </GoogleMap>
          </LoadScript>
          <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 shadow-lg rounded-t-lg p-4">
            <div className="flex items-center justify-between mb-4">
              {rideDetails.user ? (
                <div className="flex items-center">
                  <div className="relative mr-4">
                    <Image
                      src={rideDetails.user.photoUrl}
                      alt="Profile Picture"
                      width={50}
                      height={50}
                      className="rounded-full cursor-pointer"
                      onClick={handlePhotoClick}
                    />
                    {showOverlay && (
                      <div className="overlay" onClick={handleOverlayClick}>
                        <div className="overlay-content">
                          <Image
                            src={rideDetails.user.photoUrl}
                            alt="Profile Picture"
                            layout="fill"
                            className="rounded-full"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="text-sm">
                    <div className="font-semibold">{rideDetails.user.name}</div>
                    <p>{eta}</p>
                  </div>
                </div>
              ) : (
                <p>Loading user details...</p>
              )}

              <div>
                <button
                  onClick={handleStartStopTimer}
                  className="px-4 py-2 bg-black text-white rounded-md mr-4"
                >
                  {timerActive ? `${formatTime()}` : "Start Timer"}
                </button>
                {initialPeriodPassed && <p>Extra Charges: ${extraCharges}</p>}
              </div>
            </div>

            <div className="flex justify-between">
              {!isPickedUp ? (
                <button
                  onClick={handlePickedUp}
                  className="px-4 py-2 bg-black text-white rounded-md mr-4"
                >
                  Arrived
                </button>
              ) : (
                <button
                  onClick={handleRideComplete}
                  className="px-4 py-2 bg-black text-white rounded-md mr-4"
                >
                  Complete Ride
                </button>
              )}

              <button
                onClick={openInMaps}
                className="px-4 py-2 bg-black text-white rounded-md"
              >
                Open in Maps
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RidePage;
