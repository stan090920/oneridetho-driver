import React, { useState, useEffect } from "react";
import ChatBox from "./ChatBox";
import SendMessage from "./SendMessage";
import { useSession } from "next-auth/react";

interface Ride {
  id: number;
  pickupLocation: string;
  dropoffLocation: string;
}

const ChatPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [rides, setRides] = useState<Ride[]>([]);
  const [selectedRideId, setSelectedRideId] = useState<number | null>(null);
  const { data: session } = useSession();
  const isLoggedIn = session != null;

  const [buttonPosition, setButtonPosition] = useState({ x: 20, y: 500 });
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const fetchRides = async () => {
      if (session) {
        try {
          const response = await fetch("/api/rides/inprogress");
          const text = await response.text();

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = JSON.parse(text);
          setRides(data);
          if (data.length > 0) {
            setSelectedRideId(data[0].id);
          }
        } catch (error) {
          console.error("Error fetching rides:", error);
        }
      }
    };

    // Initial fetch
    fetchRides();

    // Set up interval to fetch rides every 3 seconds
    const intervalId = setInterval(fetchRides, 3000);

    // Clear interval on component unmount
    return () => clearInterval(intervalId);
  }, [session]);

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setButtonPosition({ x: e.clientX - 40, y: e.clientY - 20 }); // Adjust for button center
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (isDragging) {
      const touch = e.touches[0];
      setButtonPosition({ x: touch.clientX - 40, y: touch.clientY - 20 }); // Adjust for button center
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.addEventListener("touchmove", handleTouchMove);
      document.addEventListener("touchend", handleTouchEnd);
    } else {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isDragging]);

  return (
    <>
      {isLoggedIn && rides.length > 0 && (
        <button
          className="fixed bg-green-600 text-white rounded-full px-4 py-2 z-[60] cursor-move"
          onClick={toggleChat}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          style={{
            left: `${buttonPosition.x}px`,
            top: `${buttonPosition.y}px`,
          }}
          title="Toggle Chat"
        >
          Chat
        </button>
      )}
      {isOpen && (
        <div className="fixed bottom-5 left-5 w-11/12 sm:w-2/4 max-w-lg h-4/5 max-h-[90vh] bg-white rounded-lg shadow-lg z-[60]">
          <div className="flex justify-between items-center bg-green-600 text-white p-3 rounded-t-lg">
            <div>Chat</div>
            <button
              className="border border-gray-200 rounded-full p-1 hover:bg-gray-500 active:bg-gray-400"
              onClick={toggleChat}
              title="Toggle Chat"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="3"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <div className="p-4 h-full flex flex-col">
            <div className="flex space-x-2 mb-2 overflow-x-auto">
              {rides.map((ride) => (
                <button
                  key={ride.id}
                  className={`py-2 px-4 rounded-lg ${
                    selectedRideId === ride.id
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-gray-700"
                  }`}
                  onClick={() => setSelectedRideId(ride.id)}
                >
                  Ride {ride.id}
                </button>
              ))}
            </div>
            <div className="p-4 h-[50vh] overflow-y-auto">
              {selectedRideId && <ChatBox rideId={selectedRideId} />}
            </div>

            {selectedRideId && <SendMessage rideId={selectedRideId} />}
          </div>
        </div>
      )}
    </>
  );
};

export default ChatPanel;
