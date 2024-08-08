import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import useSWR from "swr";
import {
  GoogleMap,
  Marker,
  DirectionsRenderer,
  useJsApiLoader,
  Polyline,
} from "@react-google-maps/api";
import Image from "next/image";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import useDisableHoverOnMobile from "../../scripts/DisableHoverOnMobile";

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
  pickupTime?: string;
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
  const [isCompletingRide, setIsCompletingRide] = useState(false);
  const [error, setError] = useState("");
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [driverLocation, setDriverLocation] = useState({ lat: 0, lng: 0 });
  const [pickupLocation, setPickupLocation] = useState<Location | null>(null);
  const [eta, setEta] = useState("");
  const [dropoffLocation, setDropoffLocation] = useState<Location | null>(null);
  const [isPickedUp, setIsPickedUp] = useState(false);
  const [rideCancelled, setRideCancelled] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [showMapOverlay, setShowMapOverlay] = useState(false);
  const fetcher = (url: string) => axios.get(url).then((res) => res.data);
  const { data: session, status } = useSession();
  const { data: swrRideDetails, error: rideError } = useSWR(
    rideId ? `/api/rides/${rideId}` : null,
    fetcher
  );

  useDisableHoverOnMobile;

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.API_KEY ?? "",
    libraries: ["geometry", "drawing"],
  });

  useEffect(() => {
    if (status !== "loading" && !session) {
      alert("You must be logged in to view this page");
      router.push("/");
    }
  }, [session, status, router]);

  useEffect(() => {
    if (rideId) {
      const storedIsPickedUp = localStorage.getItem(`isPickedUp_${rideId}`);
      if (storedIsPickedUp !== null) {
        setIsPickedUp(JSON.parse(storedIsPickedUp));
      }
    }
  }, [rideId]);

  useEffect(() => {
    if (rideId) {
      localStorage.setItem(`isPickedUp_${rideId}`, JSON.stringify(isPickedUp));
    }
  }, [isPickedUp, rideId]);
  
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

  const [timer, setTimer] = useState(300);
  const [timerActive, setTimerActive] = useState(false);
  const [extraCharges, setExtraCharges] = useState(0);
  const [initialPeriodPassed, setInitialPeriodPassed] = useState(false);
  const [isOpeningMaps, setIsOpeningMaps] = useState(false);
  const [loading, setLoading] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);


  useEffect(() => {
    let interval: number | undefined;
  
    if (timerActive) {
      if (!initialPeriodPassed) {
        interval = window.setInterval(() => {
          setTimer(prevTimer => {
            if (prevTimer - 1 <= 0) {
              setInitialPeriodPassed(true);
              notifyUser(); 
              return 0;
            }
            return prevTimer - 1;
          });
        }, 1000);
      } else {
        interval = window.setInterval(() => {
          setTimer((prevTimer) => prevTimer - 1);
          setElapsedSeconds((prevSeconds) => prevSeconds + 1);

          if (elapsedSeconds + 1 === 60) {
            setExtraCharges((prevCharges) => prevCharges + 1);
            setElapsedSeconds(0);
          }
        }, 1000);
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
        setTimer(300);
        setInitialPeriodPassed(false);
      }
      setTimerActive(true);
    }
  };
  

  const formatTime = () => {
    const absoluteTime = Math.abs(timer);
    const minutes = Math.floor(absoluteTime / 60);
    const seconds = absoluteTime % 60;
    const formattedTime = `${minutes}:${seconds.toString().padStart(2, "0")}`;
    return timer < 0 ? `-${formattedTime}` : formattedTime;
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

      // Check if the ride is a scheduled ride and if it's too early to pick up
      if (rideDetails.status == "Scheduled") {
        if (rideDetails.pickupTime){
          const scheduledTime = new Date(Date.parse(rideDetails.pickupTime)).getTime();
          console.log("Pickup time: " + scheduledTime);

          const currentTime = new Date().getTime();
          const fiveMinutesInMilliseconds = 5 * 60 * 1000;

          if (currentTime < scheduledTime - fiveMinutesInMilliseconds) {
            alert("You can only pick up the customer 5 minutes before the scheduled pickup time.");
            return;
          }
        } else {
          console.error("pickupTime is missing from rideDetails.");
          alert("There is no scheduled pickup time for this ride.");
          return;
        }
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

      setLoading(true);
      const loadingToastId = toast.loading("Processing...");

      try {
        await axios.patch(`/api/rides/${rideId}`, {
          status: "InProgress",
          pickupTime: new Date(),
          driverId: session?.user.id,
        });

        const dropoffCoordinates = JSON.parse(rideDetails.dropoffLocation);

        if (dropoffCoordinates) {
          setDropoffLocation(dropoffCoordinates);
        }

        // Start the timer
        setTimerActive(true);
        toast.success("Arrived at customer location!", { id: loadingToastId });
      } catch (error) {
        console.error("Error updating ride status:", error);
        toast.error("Failed to update ride status", { id: loadingToastId });
      } finally {
        setLoading(false);
      }
    }
    setIsPickedUp(true);
  };

  const handleRideComplete = async () => {
    if (rideDetails) {
      setIsCompletingRide(true);
      const loadingToastId = toast.loading("Processing...");

      try {
        await axios.patch(`/api/rides/${rideId}`, {
          status: "Completed",
          dropoffTime: new Date(),
          driverId: session?.user.id,
        });
        
        toast.success("Ride completed successfully!", { id: loadingToastId });

        // Clear isPickedUp from localStorage
        localStorage.removeItem(`isPickedUp_${rideId}`);

        router.push("/dashboard");
      } catch (error) {
        console.error("Error completing the ride:", error);
        toast.error("Failed to complete the ride.", { id: loadingToastId });
      } finally {
        setIsCompletingRide(false);
      }
    }
  };

  useEffect(() => {
    const fetchRideDetails = async (retryCount = 3, delay = 1000) => {
      if (typeof rideId === "string") {
        setIsLoading(true);
        try {
          const response = await axios.get(`/api/rides/${rideId}`);
          const fetchedRideDetails = response.data;

          setRideDetails(fetchedRideDetails);

          const coordinates = JSON.parse(fetchedRideDetails.pickupLocation);

          if (coordinates) {
            setPickupLocation(coordinates);
          }
        } catch (error) {
          if (retryCount > 0) {
            console.warn(`Retrying... ${retryCount} attempts left.`);
            setTimeout(() => fetchRideDetails(retryCount - 1, delay), delay);
          } else {
            console.error("Error fetching ride details:", error);
            setError("Failed to load ride details.");
          }
        } finally {
          setIsLoading(false);
        }
      }
    };
    fetchRideDetails();
  }, [rideId, router]);

  useEffect(() => {
    if (!mapRef.current || !driverLocation || !(pickupLocation || dropoffLocation)) return;

    const destination = isPickedUp ? dropoffLocation : pickupLocation;
    if (!destination) return;

    let stops = [];
    if (rideDetails?.stops) {
      try {
        stops = Array.isArray(rideDetails.stops)
          ? rideDetails.stops
          : JSON.parse(rideDetails.stops);
      } catch (error) {
        console.error("Error parsing stops:", error);
      }
    }

    const waypoints = isPickedUp && stops.length > 0 ? stops.map((stop: { lat: number, lng: number }) => ({
      location: new google.maps.LatLng(stop.lat, stop.lng),
      stopover: true,
    })) : [];

    const directionsService = new google.maps.DirectionsService();
    directionsService.route(
      {
        origin: driverLocation,
        destination: destination,
        travelMode: google.maps.TravelMode.DRIVING,
        waypoints: waypoints,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          setDirections(result);
          if (result.routes && result.routes[0] && result.routes[0].legs && result.routes[0].legs[0]) {
            const duration = result.routes[0]?.legs[0]?.duration?.text;
            setEta(duration ?? "");
          }
        } else {
          console.error(`Error fetching directions: ${status}`);
        }
      }
    );

  }, [driverLocation, pickupLocation, dropoffLocation, isPickedUp, rideDetails]);


  useEffect(() => {
    const timerId = setTimeout(() => {
      setShowMapOverlay(true); // Show overlay after a delay
    }, 10000); // 5-second delay

    return () => clearTimeout(timerId);
  }, []);

  
  const openInMaps = async () => {
    if (rideDetails?.pickupLocation && rideDetails.dropoffLocation) {
      setIsOpeningMaps(true);
      const loadingToastId = toast.loading("Processing...");

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
        waypoints = stops.map((stop: { lat: string, lng: string }) => `${stop.lat},${stop.lng}`).join('|');
      }

      try {
        const pickupCoords = JSON.parse(rideDetails.pickupLocation);

        const dropoffCoords = JSON.parse(rideDetails.dropoffLocation);

        let url;
        if (!isPickedUp) {
          url = `${baseMapsUrl}&destination=${pickupCoords.lat},${pickupCoords.lng}&travelmode=driving`;
        } else {
          url = `${baseMapsUrl}&destination=${dropoffCoords.lat},${dropoffCoords.lng}${waypoints ? `&waypoints=${waypoints}` : ''}&travelmode=driving`;
        }

        window.open(url, "_blank");
        toast.success("Maps opened successfully!", { id: loadingToastId });
      } catch (error) {
        console.error("Error fetching coordinates:", error);
        toast.error("Failed to get location coordinates.", { id: loadingToastId });
      } finally {
        setIsOpeningMaps(false);
      }
    }else {
      toast.error("Pickup and dropoff locations are required.");
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

  const handlePhotoClick = () => {
    setShowOverlay(true);
  };

  const handleOverlayClick = () => {
    setShowOverlay(false);
  };

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  let stops = [];
  if (rideDetails?.stops) {
    try {
      stops = Array.isArray(rideDetails.stops) ? rideDetails.stops : JSON.parse(rideDetails.stops);
    } catch (error) {
      console.error("Error parsing stops:", error);
    }
  }

  return (
    <div>
      {rideDetails && (
        <>
          {isLoaded && (
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={
                isPickedUp
                  ? dropoffLocation || { lat: 0, lng: 0 }
                  : pickupLocation || { lat: 0, lng: 0 }
              }
              zoom={12}
              onLoad={onMapLoad}
              options={mapOptions}
            >
              <Marker position={driverLocation} label="Driver" />
              {!isPickedUp && pickupLocation && (
                <Marker position={pickupLocation} label="Pickup" />
              )}
              {isPickedUp && dropoffLocation && (
                <Marker position={dropoffLocation} label="Dropoff" />
              )}
              {isPickedUp &&
                stops?.map(
                  (stop: { lat: number; lng: number }, index: number) => (
                    <Marker
                      key={index}
                      position={{ lat: stop.lat, lng: stop.lng }}
                      icon={{
                        url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
                      }}
                    />
                  )
                )}
              {directions && <DirectionsRenderer directions={directions} />}
            </GoogleMap>
          )}

          {showMapOverlay && (
            <div className="z-49 fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <div className="bg-white p-6 rounded-lg shadow-lg text-center">
                <p className="mb-4 text-lg font-semibold">
                  Click below to open directions in Google Maps:
                </p>
                <button 
                  onClick={openInMaps}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg"
                >
                  Open In Maps
                </button>
              </div>
            </div>
          )}

          <div className="fixed bottom-0 left-0 w-full h-[21vh] bg-white border-t border-gray-200 shadow-lg rounded-t-lg p-4 z-50">
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
                    <p>${rideDetails.fare}</p>
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
                  disabled={loading}
                >
                  {loading ? "Processing..." : "Arrived"}
                </button>
              ) : (
                <button
                  onClick={handleRideComplete}
                  className="px-4 py-2 bg-black text-white rounded-md mr-4"
                  disabled={isCompletingRide}
                >
                  {isCompletingRide ? "Processing..." : "Complete Ride"}
                </button>
              )}

              <button
                onClick={openInMaps}
                className="px-4 py-2 bg-black text-white rounded-md"
                disabled={isOpeningMaps}
              >
                {isOpeningMaps ? "Processing" : "Open in Maps"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RidePage;
