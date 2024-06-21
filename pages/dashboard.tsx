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
import { useEffect, useRef, useState } from "react";
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
  pickupLocation: any;
  dropoffLocation: any;
  fare: number;
  user: User;
  paymentMethod: string;
  //@ts-ignore
  stops: Stop[];
  scheduledPickupTime: string;
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


  const { data: session, status } = useSession();
  const router = useRouter();
  const { rideId } = router.query;

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.API_KEY ?? "",
    libraries: ["geometry", "drawing"],
  });

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
      alert('Driver ID not found. Please log in again.');
      return;
    }

    setLoadingRideId(rideId);
    setIsLoading(true);
    setError(null);

    try {
      // Fetch the ride details
      const response = await fetch(`/api/rides/${rideId}`);
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      const rideData = await response.json();

      // Check ride status
      const invalidStatuses = ['Completed', 'Cancelled', 'InProgress'];
      if (invalidStatuses.includes(rideData.status)) {
        alert(`You cannot accept a ride that is ${rideData.status}.`);
        setIsLoading(false);
        setLoadingRideId(null);
        router.push("/");
        return;
      }

      // Check if the ride has already been accepted by another driver
      if (rideData.isAccepted && rideData.driverId === driverId) {
        alert("You already accepted this ride!");
        router.push(`/ride/${rideId}`);
        return;
      } else if (rideData.isAccepted && rideData.driverId !== driverId) {
        alert("This ride has already been accepted by another driver.");
        setIsLoading(false);
        setLoadingRideId(null);
        router.push("/");
        return;
      }

      // Fetch in-progress rides to check for scheduling conflicts
      const inProgressResponse = await fetch('/api/rides/inprogress');
      if (!inProgressResponse.ok) {
        throw new Error(`Error: ${inProgressResponse.status}`);
      }
      const inProgressRides = await inProgressResponse.json();

      if (inProgressRides.length > 0) {
        alert('You currently have a ride in progress and cannot accept a new one.');
        setIsLoading(false);
        setLoadingRideId(null);
        router.push("/");
        return;
      }

      // Check for scheduling conflicts
      const hasConflict = inProgressRides.some((ride: Ride) => {
        const ridePickupTime = new Date(ride.scheduledPickupTime).getTime();
        const newRidePickupTime = new Date(rideData.scheduledPickupTime).getTime();
        return ridePickupTime === newRidePickupTime;
      });

      if (hasConflict) {
        alert('You have another ride scheduled for the same time.');
        setIsLoading(false);
        setLoadingRideId(null);
        return;
      }

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

      // Remove accepted ride from the list
      const updatedRides = rides.filter((ride) => ride.id !== rideId);
      setRides(updatedRides);

      // Redirect to ride details page
      router.push(`/ride/${rideId}`);
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
        let address; 

        if (!isCoordinateFormat(selectedRide.pickupLocation)) {
          const pickupLoc = JSON.parse(selectedRide.pickupLocation);
          address = await reverseGeocode(
            pickupLoc.lat,
            pickupLoc.lng
          );
        } else {
          address = selectedRide.pickupLocation;
        }

        setPickupAddress(address);
      }
    };

    fetchAndSetAddress();
  }, [selectedRide]);

  useEffect(() => {
    const fetchAddress = async (lat: number, lng: number) => {
      try {
        const response = await fetch(`/api/reversegeo?lat=${lat}&lng=${lng}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch address: ${response.status}`);
        }
        const data = await response.json();
        return data.address;
      } catch (error) {
        console.error("Error fetching address:", error);
        return "Address not found";
      }
    };

    const setAddress = async () => {
      if (selectedRide?.dropoffLocation) {
        const dropoffLoc = JSON.parse(selectedRide.dropoffLocation);
        const dropoffAddress = await reverseGeocode(
          dropoffLoc.lat,
          dropoffLoc.lng
        );
        setDropoffAddress(dropoffAddress);
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

          console.log("Pickup location:", ride.pickupLocation);
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


  let parsedPickupLocation;
  let parsedDropoffLocation;

  if (selectedRide && typeof selectedRide.dropoffLocation === "string") {
    parsedPickupLocation = JSON.parse(selectedRide.pickupLocation);
    parsedDropoffLocation = JSON.parse(selectedRide.dropoffLocation);
  }


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

      {inProgressRides.map((ride) => (
        <div
          key={ride.id}
          className="absolute bottom-0 bg-white w-full h-[20vh] pt-4 pb-2 rounded-t-[16px]"
        >
          <a href={`/ride/${ride.id}`}>
            <div className="text-center">Go Back to Ride</div>
            <div className="px-2 mt-2">
              <li>{JSON.parse(ride.pickupLocation)}</li>
              <div className="border-l-2 h-5 border-black"></div>
              <li>{JSON.parse(ride.dropoffLocation)}</li>
            </div>
          </a>
        </div>
      ))}

      {selectedRide && (
        <>
          <Marker position={selectedRide.pickupLocation} />
          <Marker position={selectedRide.dropoffLocation} />
          <Directions
            pickupCoordinates={parsedPickupLocation}
            dropoffCoordinates={parsedDropoffLocation}
            stops={selectedRide.stops ? parseStops(selectedRide.stops) : []}
          />

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
                  <div className="text-center">
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

            <div className="px-2 mt-2">
              <li>{pickupAddress}</li>
              <div className="border-l-2 h-5 border-black"></div>
              <li>{dropoffAddress}</li>
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
