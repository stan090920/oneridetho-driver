import { Spinner } from "@/components/Spinner";
import {
  GoogleMap,
  InfoWindow,
  Marker,
  useJsApiLoader,
  DirectionsService,
  DirectionsRenderer,
} from "@react-google-maps/api";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { useRouter } from "next/router";
import { useEffect, useRef, useState, useCallback } from "react";
import { HiMiniStar } from "react-icons/hi2";
import axios from 'axios';
import toast from "react-hot-toast";

interface User {
  id: number;
  name: string;
 photoUrl: string;
  rating: number;
  phone: number;
}

interface Ride {
  id: number;
  status: string;
  pickupLocation: any;
  dropoffLocation: any;
  passengerCount: number;
  isAccepted: boolean;
  fare: number;
  user: User;
  paymentMethod: string;
  //@ts-ignore
  stops: Stop[];
  scheduledPickupTime: string;
  driverId: number;
}
interface Coordinates {
  lat: number;
  lng: number;
}

interface Stop {
  address: string;
  lat: number;
  lng: number;
}

interface SimpleMapProps {
  pickupCoordinates: Coordinates | null;
  dropoffCoordinates: Coordinates | null;
  stops: Coordinates[];
}

const directionsRendererOptions = {
  polylineOptions: {
    strokeColor: "#FF0000",
    strokeOpacity: 0.8,
    strokeWeight: 5,
  },
};
  

const containerStyle = {
  width: "100%",
  height: "90vh",
};

const defaultCenter = {
  lat: 25.06,
  lng: -77.345,
};

function Directions({ pickupCoordinates, dropoffCoordinates, stops }: Readonly<SimpleMapProps>) {
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const count = useRef(0);

  // console.log("Pickup Coordinates: ", pickupCoordinates);
  // console.log("Dropoff Coordinates: ", dropoffCoordinates);
  // console.log("Stops: ", stops);

  useEffect(() => {
    setDirections(null);
    count.current = 0;
  }, [pickupCoordinates, dropoffCoordinates, stops]);

  const directionsCallback = (
    result: google.maps.DirectionsResult | null,
    status: google.maps.DirectionsStatus
  ) => {
    if (status === "OK" && count.current === 0) {
      count.current += 1;
      setDirections(result);
    }
  };

  return (
    <>
      {pickupCoordinates && dropoffCoordinates && (
        <DirectionsService
          options={{
            origin: { lat: pickupCoordinates.lat, lng: pickupCoordinates.lng },
            destination: {
              lat: dropoffCoordinates.lat,
              lng: dropoffCoordinates.lng,
            },
            waypoints: stops.map((stop) => ({
              location: new google.maps.LatLng(stop.lat, stop.lng),
              stopover: true,
            })),
            optimizeWaypoints: true,
            travelMode: google.maps.TravelMode.DRIVING,
          }}
          callback={directionsCallback}
        />
      )}
      {directions && <DirectionsRenderer directions={directions} options={directionsRendererOptions} />}
    </>
  );
}

function parseStops(stops: Stop[] | string | undefined): Coordinates[] {
  if (!stops) return [];

  try {
    if (typeof stops === "string") {
      const parsedStops = JSON.parse(stops) as Stop[];
      return parsedStops.map((stop) => ({ lat: stop.lat, lng: stop.lng }));
    } else {
      return stops.map((stop) => ({ lat: stop.lat, lng: stop.lng }));
    }
  } catch (e) {
    console.error("Error parsing stops data:", e);
    return [];
  }
}


const Dashboard = () => {
  const [rides, setRides] = useState<Ride[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [showSchedulePopup, setShowSchedulePopup] = useState(false);
  const [scheduledPickupTime, setScheduledPickupTime] = useState("");
  const [inProgressRides, setInProgressRides] = useState<Ride[]>([]);
  const [driverLocation, setDriverLocation] = useState({ lat: 0, lng: 0 });
  const [eta, setEta] = useState<string | null>(null);


  const { data: session, status } = useSession();
  const router = useRouter();
  const { rideId } = router.query;

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.API_KEY ?? "",
    libraries: ["geometry", "drawing"],
  });

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
    return dateTime.toLocaleString("en-US", options);
  };

  const onMarkerClick = (ride: Ride) => {
    setSelectedRide(ride);
  };

  useEffect(() => {
    if (status !== "loading" && !session) {
      alert("You must be logged in to view this page");
      router.push("/");
    }
  }, [session, status, router]);

  const fetchRideById = async (rideId: any) => {
    try {
      const response = await fetch(`/api/rides/${rideId}`);
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      }
      return null;
    }
  };

  const [loadingRideId, setLoadingRideId] = useState<number | null>(null);

  useEffect(() => {
    if (rideId) {
      (async () => {
        setIsLoading(true);
        const ride = await fetchRideById(rideId);
        if (ride) {
          setSelectedRide(ride);
        }
        setIsLoading(false);
      })();
    }
  }, [rideId]);

  const acceptRide = async (rideId: number) => {
    const driverId = session?.user.id;

    if (!driverId) {
      alert("Driver ID not found. Please log in again.");
      return;
    }

    setLoadingRideId(rideId);
    setIsLoading(true);
    setError(null);

    try {
      const rideData = await fetchRideData(rideId);
      validateRideStatus(rideData);

      await checkForConflicts(rideData);
      await acceptRideAndRedirect(rideId, driverId);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
        console.error("Error accepting ride:", err.message);
      }
    } finally {
      setIsLoading(false);
      setLoadingRideId(null);
    }
  };

  const fetchRideData = async (rideId: number) => {
    const response = await fetch(`/api/rides/${rideId}`);
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }
    return await response.json();
  };

  const validateRideStatus = (rideData: Ride) => {
    const invalidStatuses = ["Completed", "Cancelled", "InProgress"];

    if (invalidStatuses.includes(rideData.status)) {
      alert(`You cannot accept a ride that is ${rideData.status}.`);
      throw new Error("Invalid ride status");
    }

    if (rideData.isAccepted) {
      const message =
        rideData.driverId === session?.user.id
          ? "You already accepted this ride!"
          : "This ride has already been accepted by another driver.";
      alert(message);
      throw new Error(message);
    }
  };

  const checkForConflicts = async (rideData: Ride) => {
    await checkDriverDistance();
    const inProgressRides = await fetchInProgressRides();

    checkInProgressRides(inProgressRides);
    checkForSchedulingConflicts(inProgressRides, rideData);
  };

  const checkDriverDistance = () => {
    if (eta) {
      const etaInMinutes = parseFloat(eta.split(" ")[0]);
      if (isNaN(etaInMinutes) || etaInMinutes > 15) {
        alert("You are too far away to accept this ride.");
        throw new Error("Driver too far");
      }
    }
  };

  const fetchInProgressRides = async () => {
    const response = await fetch("/api/rides/inprogress");
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }
    return await response.json();
  };

  const checkInProgressRides = (inProgressRides: Ride[]) => {
    const hasNonScheduledRide = inProgressRides.some(
      (ride) => ride.status === "InProgress" || ride.status === "Requested"
    );

    if (hasNonScheduledRide) {
      alert(
        "You currently have a ride in progress or a requested ride that you have accepted and cannot accept a new requested ride."
      );
      throw new Error("Ride conflict");
    }
  };

  const checkForSchedulingConflicts = (
    inProgressRides: Ride[],
    rideData: Ride
  ) => {
    const hasConflict = inProgressRides.some((ride) => {
      const ridePickupTime = new Date(ride.scheduledPickupTime).getTime();
      const newRidePickupTime = new Date(
        rideData.scheduledPickupTime
      ).getTime();
      return ridePickupTime === newRidePickupTime;
    });

    if (hasConflict) {
      alert("You have another ride scheduled for the same time.");
      throw new Error("Scheduling conflict");
    }
  };

  const acceptRideAndRedirect = async (rideId: number, driverId: number) => {
    const acceptResponse = await fetch(`/api/rides/accept/${rideId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ driverId }),
    });

    if (!acceptResponse.ok) {
      throw new Error(`Error: ${acceptResponse.status}`);
    }

    const updatedRides = rides.filter((ride) => ride.id !== rideId);
    setRides(updatedRides);

    router.push(`/ride/${rideId}`);
  };



  useEffect(() => {
    const fetchRideDetails = async () => {
      if (!rideId) return;

      setIsLoading(true);
      try {
        const response = await fetch(`/api/rides/${rideId}`);
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        const rideData = await response.json();

        if (rideData.isAccepted) {
          // Check if the current driver is the one who accepted the ride
          const acceptedDriverId = rideData.driverId;
          const currentDriverId = session?.user.id;

          if (acceptedDriverId === currentDriverId) {
            setSelectedRide(rideData);
          } else {
            alert("This ride has already been accepted by another driver.");
            setSelectedRide(null);
            router.push("/");
          }
        } else {
          setSelectedRide(rideData);
        }
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchRideDetails();
  }, [rideId]);

  useEffect(() => {
    const fetchUnacceptedRides = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/rides/unaccepted");
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        const data: Ride[] = await response.json();
        setRides(data);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchUnacceptedRides();
  }, []);

  const handleScheduleRide = async (rideId: number) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/rides/schedule/${rideId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ scheduledPickupTime }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      setShowSchedulePopup(false);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const reverseGeocode = async (lat: number, lng: number): Promise<string> =>  {
    try {
      const response = await axios.post('/api/reverseGeocode', { lat, lng });
      return response.data.address;
    } catch (error) {
      console.error('Error in reverse geocoding:', error);
      return '';
    }
  };

  function isCoordinateFormat(location: string) {
    return (
      location &&
      typeof location === "object" &&
      "lat" in location &&
      "lng" in location
    );
  }

  const getCoordinates = async (address: any) => {
    const response = await fetch("/api/geocode", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ address }),
    });
    const data = await response.json();
    return data;
  };

  const isTextualAddress = (location: any) => {
    return isNaN(parseFloat(location));
  };

  useEffect(() => {
    const fetchAndSetAddress = async () => {
      if (selectedRide?.pickupLocation) {
        let address = ""; 

        if (typeof selectedRide.pickupLocation === "string") {
          const pickupLoc = JSON.parse(selectedRide.pickupLocation);
          address = await reverseGeocode(pickupLoc.lat, pickupLoc.lng);
        } else{
          address = await reverseGeocode(
            selectedRide.pickupLocation.lat,
            selectedRide.pickupLocation.lng
          );
        }

        setPickupAddress(typeof address === 'object' ? JSON.stringify(address) : address);
      }
    };

    fetchAndSetAddress();
  }, [selectedRide]);

  useEffect(() => {
    const setAddress = async () => {
      if (selectedRide?.dropoffLocation) {
        let dropoffAddress = "";

        if (typeof selectedRide.dropoffLocation === "string"){
          const dropoffLoc = JSON.parse(selectedRide.dropoffLocation);
          dropoffAddress = await reverseGeocode(dropoffLoc.lat, dropoffLoc.lng);
        } else{
          dropoffAddress = await reverseGeocode(
            selectedRide.dropoffLocation.lat,
            selectedRide.dropoffLocation.lng
          );
        }
          
        setDropoffAddress(typeof dropoffAddress === 'object' ? JSON.stringify(dropoffAddress) : dropoffAddress);
      }
    };

    setAddress();
  }, [selectedRide]);

  function removePlusCode(fullAddress: string): string {
    if (typeof fullAddress === "string") {
      return fullAddress.trim();
    }
    return "";
  }

  function shortenAddress(fullAddress: string): string {
    if (typeof fullAddress === "string") {
      const cleanedAddress = removePlusCode(fullAddress);
      const parts = cleanedAddress.split(",");
      if (parts.length > 3) {
        return `${parts[0].trim()}, ${parts[1].trim()}`;
      }
      return cleanedAddress;
    }
    return "";
  }

  useEffect(() => {
    const fetchRides = async () => {
      try {
        const response = await fetch("/api/rides/unaccepted");
        if (!response.ok) {
          throw new Error("Failed to fetch rides");
        }
        let ridesData = await response.json();

        for (let ride of ridesData) {
          ride.pickupLocation = JSON.parse(ride.pickupLocation);
          ride.dropoffLocation = JSON.parse(ride.dropoffLocation);
        }

        setRides(ridesData);
      } catch (error) {
        console.error("Error fetching rides:", error);
      }
    };

    fetchRides();
  }, []);

  useEffect(() => {
    const fetchInProgressRides = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/rides/inprogress');
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        const rides = await response.json();
        setInProgressRides(rides);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchInProgressRides();
  }, []);

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


  
  let parsedPickupLocation: Coordinates;
  let parsedDropoffLocation: Coordinates;

  if (selectedRide && typeof selectedRide.dropoffLocation === "string") {
    parsedPickupLocation = JSON.parse(selectedRide.pickupLocation);
    parsedDropoffLocation = JSON.parse(selectedRide.dropoffLocation);
  } else {
    parsedPickupLocation = selectedRide?.pickupLocation;
    parsedDropoffLocation = selectedRide?.dropoffLocation;
  }


  useEffect(() => {
    if (selectedRide) {
      calculateDistanceAndEta();
    }
  }, [selectedRide]);

  const calculateDistanceAndEta = () => {
    const directionsService = new window.google.maps.DirectionsService();
    const pickupLocation = selectedRide?.pickupLocation;

    if (!pickupLocation) {
      console.error("Pickup location is not defined");
      return;
    }

    //console.log(`Driver location: lat=${driverLocation.lat}, lng=${driverLocation.lng}`);

    directionsService.route(
      {
        origin: {
          lat: driverLocation.lat,
          lng: driverLocation.lng,
        },
        destination: parsedPickupLocation,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (
          status === window.google.maps.DirectionsStatus.OK &&
          result?.routes[0]?.legs[0]
        ) {
          const route = result.routes[0].legs[0];
          if (route.distance && route.duration) {
            setEta(route.duration.text);
          } else {
            console.error("Distance or duration information is missing");
          }
        } else {
          console.error(`Error fetching directions: ${status}`, result);
        }
      }
    );
  };


  const mapOptions = {
    fullscreenControl: false,
    mapTypeControl: false,
    streetViewControl: false,
    zoomControl: false,
  };

  const renderSchedulePopup = () => {
    if (!selectedRide) return null;

    return (
      <div className="schedule-popup">
        <h2>Schedule Ride</h2>
        <input
          type="datetime-local"
          value={scheduledPickupTime}
          onChange={(e) => setScheduledPickupTime(e.target.value)}
        />
        <button onClick={() => handleScheduleRide(selectedRide.id)}>
          Schedule
        </button>
        <button onClick={() => setShowSchedulePopup(false)}>Cancel</button>
      </div>
    );
  };


  return session && isLoaded ? (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={defaultCenter}
      zoom={13}
      options={mapOptions}
    >
      {!selectedRide &&
        rides.map((ride) => (
          <Marker
            key={ride.id}
            position={ride.pickupLocation}
            onClick={() => onMarkerClick(ride)}
          />
        ))}

      {inProgressRides.map((ride) => {
        const pickupCoords = JSON.parse(ride.pickupLocation);
        const dropoffCoords = JSON.parse(ride.dropoffLocation);

        return (
          <div
            key={ride.id}
            className="absolute bottom-0 bg-white w-full h-[20vh] pt-4 pb-2 rounded-t-[16px]"
          >
            <a href={`/ride/${ride.id}`}>
              <div className="text-center">Click to go Back to Ride</div>
              <div className="px-2 mt-2">
                <li>{`Latitude: ${pickupCoords.lat}, Longitude: ${pickupCoords.lng}`}</li>
                <div className="border-l-2 h-5 border-black"></div>
                <li>{`Latitude: ${dropoffCoords.lat}, Longitude: ${dropoffCoords.lng}`}</li>
              </div>
            </a>
          </div>
        );
      })}

      {selectedRide && (
        <>
          <Marker position={selectedRide.pickupLocation} />
          <Marker position={selectedRide.dropoffLocation} />
          <Directions
            pickupCoordinates={parsedPickupLocation}
            dropoffCoordinates={parsedDropoffLocation}
            stops={selectedRide.stops ? parseStops(selectedRide.stops) : []}
          />

          {eta && (
            <div className="absolute top-0 left-0 bg-white p-4 rounded-b-[16px] shadow-md w-full text-center">
              <p>{`${eta} from Pickup`}</p>
            </div>
          )}

          <div className="absolute bottom-0 bg-white w-full h-[30vh] pt-4 pb-2 rounded-t-[16px] overflow-y-scroll">
            {showSchedulePopup && renderSchedulePopup()}

            <div className="flex items-center justify-between gap-4 px-4">
              <div className="flex items-center gap-2">
                <div className="font-bold text-[24px]">
                  ${selectedRide.fare}
                </div>
                {selectedRide.paymentMethod === "Card" && (
                  <span className="text-[20px] rounded-full border-2 border-black pl-3 pr-3">
                    💳 Paid
                  </span>
                )}
              </div>

              <button
                onClick={() => acceptRide(selectedRide.id)}
                className="rounded-full bg-black text-white py-3 px-10 text-center flashing-border"
              >
                {loadingRideId === selectedRide.id ? (
                  <Spinner />
                ) : (
                  selectedRide.user.name.split(" ")[0]
                )}
              </button>

              <div className="flex items-center gap-2 font-semibold">
                {selectedRide.passengerCount} Pass
              </div>
            </div>

            <div className="px-2 mt-2">
              <p>
                {typeof pickupAddress === "object"
                  ? JSON.stringify(pickupAddress)
                  : pickupAddress || "Loading..."}
              </p>
              <div className="border-l-2 h-6 border-black ml-[2px]">
                {(() => {
                  let stops;
                  if (typeof selectedRide.stops === "string") {
                    try {
                      stops = JSON.parse(selectedRide.stops);
                    } catch (e) {
                      console.error("Error parsing stops data:", e);
                      stops = [];
                    }
                  } else {
                    stops = selectedRide.stops;
                  }

                  return (
                    <div className="ml-2">
                      {Array.isArray(stops) && stops.length > 0 ? (
                        <div className="font-medium">
                          {stops.length} stop{stops.length > 1 ? "s" : ""}
                        </div>
                      ) : (
                        <div className="font-medium">0 stops</div>
                      )}
                    </div>
                  );
                })()}
              </div>
              <p>
                {typeof dropoffAddress === "object"
                  ? JSON.stringify(dropoffAddress)
                  : dropoffAddress || "Loading..."}
              </p>
            </div>
            {/* Displaying the status and pickup time */}
            <div className="px-2 mt-2 font-bold text-[18px] text-green-600">
              {selectedRide.status === "Requested" && <p>Booked Now</p>}
              {selectedRide.status === "Scheduled" && (
                <p>
                  Scheduled for{" "}
                  {new Date(selectedRide.scheduledPickupTime).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </GoogleMap>
  ) : (
    <div>Loading...</div>
  );
};

export default Dashboard;
