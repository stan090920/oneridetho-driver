import React, { useEffect, useRef, useState } from "react";
import Message from "./Message";
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  where,
  limit,
  DocumentData,
  QueryDocumentSnapshot,
  Timestamp,
} from "firebase/firestore";
import { db } from "../scripts/Firebase";

interface MessageData {
  id: string;
  text: string;
  name: string;
  avatar: string;
  createdAt: Timestamp;
  uid: string;
  rideId: number;
}

interface ChatBoxProps {
  rideId: number;
}

const ChatBox: React.FC<ChatBoxProps> = ({ rideId }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<MessageData[]>([]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    const q = query(
      collection(db, "messages"),
      where("rideId", "==", rideId),
      orderBy("createdAt"),
      limit(10)
    );
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const messages: MessageData[] = [];
      querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        messages.push({ ...doc.data(), id: doc.id } as MessageData);
      });
      setMessages(messages);
    });

    return (): void => unsubscribe();
  }, [rideId]);

  return (
    <div className="containerWrap bg-inherit">
      {messages.map((message) => (
        <Message key={message.id} message={message} />
      ))}
      <div ref={messagesEndRef}></div>
    </div>
  );
};

export default ChatBox;
