import Image from "next/image";
import React from "react";
import { useSession } from "next-auth/react";
import { Timestamp } from "firebase/firestore";

interface MessageProps {
  message: {
    uid: string;
    avatar: string;
    name: string;
    createdAt: Timestamp;
    text: string;
  };
}

const Message: React.FC<MessageProps> = ({ message }) => {
  const { data: session } = useSession();

  // Extracting time from Timestamp
  const messageTime = message.createdAt?.toDate().toLocaleTimeString();

  return (
    <div>
      <div
        className={`chat ${
          message.uid === session?.user?.id ? "chat-end" : "chat-start"
        }`}
      >
        <div className="chat-image avatar">
          <div className="w-10 rounded-full">
            <Image
              alt="User Avatar"
              src={message.avatar}
              height={45}
              width={45}
            />
          </div>
        </div>
        <div className="chat-header">{message.name}</div>
        <div className="chat-bubble">{message.text}</div>
        <div className="chat-footer opacity-50">Delivered at {messageTime}</div>
      </div>
    </div>
  );
};

export default Message;
