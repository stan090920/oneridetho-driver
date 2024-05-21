import React, { useState } from 'react';
import { useRouter } from 'next/router';

const AdminLogin = () => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = () => {
    // Replace with your actual admin password logic
    if (password === 'Truelove1974$') {
      router.push('/admin/AdminPanel');
    } else {
      setError('Invalid password');
    }
  };

  return (
    <div className="flex justify-center items-center h-screen">
      <div className="bg-white p-6 rounded shadow-md w-full max-w-sm">
        <h1 className="text-2xl mb-4">Admin Login</h1>
        <input
          type="password"
          placeholder="Enter admin password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-4 p-2 border rounded"
        />
        {error && <p className="text-red-500">{error}</p>}
        <button onClick={handleLogin} className="w-full p-2 bg-blue-500 text-white rounded">
          Login
        </button>
      </div>
    </div>
  );
};

export default AdminLogin;
