import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import withAdminAuth from "../../hoc/withAdminAuth";
import axios from "axios";

interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  photoUrl?: string;
  governmentIssuedId?: string;
  verificationPhotoUrl?: string;
  verified: boolean;
}

const UserDetails = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [denyReason, setDenyReason] = useState<string>("");
  const [showDenyReason, setShowDenyReason] = useState<boolean>(false);

  useEffect(() => {
    const { id } = router.query;
    if (id && typeof id === "string") {
      const userId = parseInt(id);
      fetchUser(userId);
    }
  }, [router.query]);

  const fetchUser = async (userId: number) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/users/users?id=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setUser(data);
      } else {
        console.error("Failed to fetch user information");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const verifyUser = async () => {
    if (!user) return;

    const confirm = window.confirm(
      "Are you sure you want to verify this user?"
    );
    if (!confirm) return;

    try {
      setIsUpdating(true);
      const response = await axios.put(`/api/users/users?id=${user.id}`, {
        verified: true,
      });
      if (response.status === 200) {
        setUser((prev) => (prev ? { ...prev, verified: true } : prev));
      } else {
        console.error("Failed to verify user");
      }
    } catch (error) {
      console.error("Error verifying user:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDenyVerification = () => {
    setShowDenyReason(true);
  };

  const denyVerification = async () => {
    if (!user || !denyReason.trim()) return;

    try {
      setIsUpdating(true);
      const response = await axios.put(`/api/users/users?id=${user.id}`, {
        verified: false,
        governmentIssuedId: undefined,
        verificationPhotoUrl: undefined,
        denyReason,
      });
      if (response.status === 200) {
        setUser((prev) =>
          prev
            ? {
                ...prev,
                verified: false,
                governmentIssuedId: undefined,
                verificationPhotoUrl: undefined,
              }
            : prev
        );
        setDenyReason("");
        setShowDenyReason(false);
      } else {
        console.error("Failed to deny verification");
      }
    } catch (error) {
      console.error("Error denying verification:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const revokeVerification = async () => {
    if (!user) return;

    const confirm = window.confirm(
      "Are you sure you want to revoke this user's verification?"
    );
    if (!confirm) return;

    try {
      setIsUpdating(true);
      const response = await axios.put(`/api/users/users?id=${user.id}`, {
        verified: false,
        governmentIssuedId: undefined,
        verificationPhotoUrl: undefined,
      });
      if (response.status === 200) {
        setUser((prev) =>
          prev
            ? {
                ...prev,
                verified: false,
                governmentIssuedId: undefined,
                verificationPhotoUrl: undefined,
              }
            : prev
        );
      } else {
        console.error("Failed to revoke verification");
      }
    } catch (error) {
      console.error("Error revoking verification:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white z-10">
          <p>Loading user information...</p>
        </div>
      )}
      <div className="min-h-screen bg-gray-100 flex flex-col">
        <header className="bg-white border-b border-black text-black flex justify-between items-center p-4">
          <button
            onClick={() => router.back()}
            className="p-2 bg-gray-200 rounded"
          >
            Back
          </button>
          <h1 className="text-xl font-bold">User Details</h1>
        </header>
        <main className="px-2 overflow-y-scroll h-[75vh] pt-2">
          <div className="max-w-screen-lg mx-auto bg-white p-6 rounded shadow flex flex-col md:flex-row">
            <div className="flex items-center md:w-1/2">
              {user?.photoUrl && (
                <img
                  src={user.photoUrl}
                  alt={user.name}
                  className="w-24 h-24 rounded-full mr-4"
                />
              )}
              <div>
                <h2 className="text-2xl font-bold">{user?.name}</h2>
                <p className="text-gray-600">{user?.email}</p>
                <p className="text-gray-600">+{user?.phone}</p>
                <p
                  className={`text-sm ${
                    user?.verified ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {user?.verified ? "Verified" : "Unverified"}
                </p>
              </div>
            </div>
          </div>

          <div className="max-w-screen-lg mx-auto bg-white p-6 rounded shadow mt-4">
            <h3 className="text-xl font-semibold">Verification Details</h3>
            {!user?.governmentIssuedId && !user?.verificationPhotoUrl && (
              <p className="text-red-500 mt-2">
                Verification documents have not been provided.
              </p>
            )}
            {user?.governmentIssuedId && (
              <div className="mt-2">
                <h4 className="text-lg font-semibold">Government Issued ID</h4>
                <img
                  src={user.governmentIssuedId}
                  alt="Government ID"
                  className="mt-2 w-full md:max-w-xs"
                />
              </div>
            )}
            {user?.verificationPhotoUrl && (
              <div className="mt-2">
                <h4 className="text-lg font-semibold">Verification Photo</h4>
                <img
                  src={user.verificationPhotoUrl}
                  alt="Verification Photo"
                  className="mt-2 w-full md:max-w-xs"
                />
              </div>
            )}
            {!user?.verified && !user?.governmentIssuedId && !user?.verificationPhotoUrl && !isLoading && (
              <div className="flex flex-col gap-2 mt-2">
                <div className="flex gap-2">
                  <button
                    onClick={verifyUser}
                    className={`bg-blue-500 text-white px-4 py-2 rounded ${
                      isUpdating ? "opacity-50" : ""
                    }`}
                    disabled={isUpdating}
                  >
                    {isUpdating ? "Verifying..." : "Verify User"}
                  </button>
                  <button
                    onClick={handleDenyVerification}
                    className={`bg-red-500 text-white px-4 py-2 rounded ${
                      showDenyReason ? "outline outline-2 outline-red-300" : ""
                    }`}
                    disabled={isUpdating}
                  >
                    {isUpdating ? "Processing..." : "Deny Verification"}
                  </button>
                </div>
                {showDenyReason && (
                  <>
                    <textarea
                      className="mt-2 p-2 border rounded"
                      placeholder="Reason for denial"
                      value={denyReason}
                      onChange={(e) => setDenyReason(e.target.value)}
                    />
                    <button
                      onClick={denyVerification}
                      className="bg-red-500 text-white px-4 py-2 rounded mt-2"
                      disabled={isUpdating}
                    >
                      {isUpdating ? "Denying..." : "Confirm Denial"}
                    </button>
                  </>
                )}
              </div>
            )}
            {user?.verified && (
              <button
                onClick={revokeVerification}
                className="bg-yellow-500 text-white px-4 py-2 mt-2 rounded"
                disabled={isUpdating}
              >
                {isUpdating ? "Revoking..." : "Revoke Verification"}
              </button>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default withAdminAuth(UserDetails);
