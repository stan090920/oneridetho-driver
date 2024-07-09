import React, { useState, FormEvent, useEffect } from "react";
import { db } from "../scripts/Firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useSession } from "next-auth/react";
import axios from "axios";

interface Driver {
  id: number;
  name: string;
  photoUrl?: string;
}

function SendMessage() {
  const [value, setValue] = useState("");
  const { data: session } = useSession();
  const [driver, setDriver] = useState<Driver | null>(null);

  useEffect(() => {
    const fetchDriver = async () => {
      if (session) {
        try {
          const response = await axios.get(`/api/drivers?id=${session.user.id}`);
          setDriver(response.data);
        } catch (error) {
          console.error('Error fetching driver:', error);
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
      if (session?.user && driver) {
        const { id: uid, name: displayName, photoUrl: photoURL } = driver;

        await addDoc(collection(db, "messages"), {
          text: value,
          name: displayName,
          avatar: photoURL,
          createdAt: serverTimestamp(),
          uid,
        });
      } else {
        alert("User session not found");
      }
    } catch (error) {
      console.error(error);
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
}

export default SendMessage;
