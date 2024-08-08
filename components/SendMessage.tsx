import React, { useState, FormEvent, useEffect } from "react";
import { db } from "../scripts/Firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useSession } from "next-auth/react";
import axios from "axios";

interface SendMessageProps {
  rideId: number;
  customerEmail: string;
}

interface Driver {
  id: number;
  name: string;
  photoUrl?: string;
}

const SendMessage: React.FC<SendMessageProps> = ({ rideId, customerEmail }) => {
  const [value, setValue] = useState("");
  const { data: session } = useSession();
  const [driver, setDriver] = useState<Driver | null>(null);

  useEffect(() => {
    const fetchDriver = async () => {
      if (session) {
        try {
          const response = await axios.get(
            `/api/drivers?id=${session.user.id}`
          );
          setDriver(response.data);
        } catch (error) {
          console.error("Error fetching driver:", error);
        }
      }
    };

    fetchDriver();
  }, [session]);

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();

    if (value.trim() === "") {
      alert("Please enter a message");
      return;
    }

    try {
      if (session?.user) {
        const { id: uid } = session.user;
        const userId = `driver_${uid}`;

        await addDoc(collection(db, "messages"), {
          text: value,
          name: driver?.name,
          avatar: driver?.photoUrl,
          createdAt: serverTimestamp(),
          uid: userId,
          rideId,
        });

        // Send email to the customer
        await fetch("/api/send-notification", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            recipient_email: customerEmail,
            subject: "New Message from your driver",
            text: `A new message has been sent regarding ride ID: ${rideId}. Please check your messages.`,
            html: `<p>A new message has been sent regarding ride ID: ${rideId}. Please check your messages.</p>`,
          }),
        });

        setValue("");
      } else {
        setValue("");
        alert("User session not found");
      }
    } catch (error) {
      console.error(error);
      setValue("");
    }

    setValue("");
  };

  return (
    <div className="relative bg-gray-200 w-full py-4 shadow-lg">
      <form onSubmit={handleSendMessage} className="flex px-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="input w-full focus:outline-none bg-gray-100 rounded-l-lg text-black"
          type="text"
        />
        <button
          type="submit"
          className="w-auto bg-gray-500 text-white rounded-r-lg px-5 text-sm"
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default SendMessage;
