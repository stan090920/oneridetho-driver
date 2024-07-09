import React, { useState } from "react";
import ChatBox from "./ChatBox";
import SendMessage from "./SendMessage";

const ChatPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      <button
        className="fixed bottom-5 left-5 bg-green-600 text-white rounded-full px-4 py-2 z-50"
        onClick={toggleChat}
        title="Toggle Chat"
      >
        Chat
      </button>
      {isOpen && (
        <div className="fixed bottom-5 left-5 w-11/12 sm:w-2/4 max-w-lg h-3/4 max-h-[80vm] bg-white rounded-lg shadow-lg z-50">
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
          <div className="p-4 h-[55vh] overflow-y-auto">
            {/* Chat content goes here */}
            <ChatBox />
          </div>
          <div className="absolute bottom-0 w-full bg-gray-200 shadow-lg">
            <SendMessage />
          </div>
        </div>
      )}
    </>
  );
};

export default ChatPanel;
