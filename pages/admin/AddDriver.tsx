import React, { useState } from 'react';
import { useRouter } from 'next/router';
import withAdminAuth from '../../hoc/withAdminAuth';

interface Driver {
  id: number;
  name: string;
  email: string;
  photoUrl?: string;
  carType: string;
  licensePlate: string;
  phone?: string;
  carImageUrl?: string;
  password: string;
}

const AddDriver = () => {
  const [name, setName] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [carType, setCarType] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [carImage, setCarImage] = useState<File | null>(null);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [carImageUrl, setCarImageUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [carImageUploading, setCarImageUploading] = useState(false);
  const router = useRouter();

  const generatePassword = () => {
    const randomPassword = Math.random().toString(36).slice(-8);
    setPassword(randomPassword);
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const img = document.createElement('img');
        img.src = event.target?.result as string;
        img.onload = async () => {
          const canvas = cropImageToSquare(img);
          if (canvas) {
            canvas.toBlob(async (blob) => {
              if (blob) {
                const squareFile = new File([blob], 'profile.jpg', { type: 'image/jpeg' });
                setPhotoUploading(true);
                const url = await handleFileUpload(squareFile);
                if (url) {
                  setPhotoUrl(url);
                }
                setPhotoUploading(false);
              }
            }, 'image/jpeg');
          }
        };
      };
      reader.readAsDataURL(file);
    } else {
      alert('Please select a valid image file for the photo.');
      setPhoto(null);
    }
  };

  const handleCarImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setCarImage(file);
      setCarImageUploading(true);
      const url = await handleFileUpload(file);
      if (url) {
        setCarImageUrl(url);
      }
      setCarImageUploading(false);
    } else {
      alert('Please select a valid image file for the car image.');
      setCarImage(null);
    }
  };


  const cropImageToSquare = (img: HTMLImageElement) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const size = Math.min(img.width, img.height);

    if (ctx) {
      canvas.width = size;
      canvas.height = size;
      ctx.drawImage(
        img,
        (img.width - size) / 2,
        (img.height - size) / 2,
        size,
        size,
        0,
        0,
        size,
        size
      );
      return canvas;
    }
    return null;
  };

  const handleFileUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/photo', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        console.log(data.imageUrl);
        return data.imageUrl;
      } else {
        console.error('Failed to upload photo');
        return null;
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);


    const newDriver: Driver = {
      id: 0, // This will be set by the backend
      name,
      email,
      carType,
      licensePlate,
      phone,
      photoUrl,
      carImageUrl,
      password,
    };

    try {
      const response = await fetch('/api/drivers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newDriver),
      });

      if (response.ok) {
        // Handle success
        console.log('Driver added successfully');
        router.push('/admin/AdminPanel');
      } else {
        // Handle error
        console.error('Failed to add driver');
      }
    } catch (error) {
      console.error('Error adding driver:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const isSubmitDisabled = photoUploading || carImageUploading || !photoUrl || !carImageUrl;

  return (
    <div className='relative'>
      <header className="bg-white border-b border-black text-black flex justify-between items-center p-4">
        <button onClick={() => router.back()} className="p-2 bg-gray-200 rounded">Back</button>
        <h1 className="text-xl font-bold">Add Driver</h1>
      </header>

      <div className="flex justify-center items-center min-h-[75vh] bg-gray-100 py-3">
        <div className="bg-white px-8 rounded shadow-md w-full max-w-lg h-full max-h-[calc(100vh-4rem)] overflow-auto">
          <h1 className="text-3xl mb-6 text-center">Add Driver</h1>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block mb-2 font-semibold">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block mb-2 font-semibold">Photo</label>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="w-full p-2 border rounded"
                required
              />
              {photoUploading && <p>Uploading photo...</p>}
            </div>
            <div>
              <label className="block mb-2 font-semibold">Car Type</label>
              <input
                type="text"
                value={carType}
                onChange={(e) => setCarType(e.target.value)}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block mb-2 font-semibold">License Plate</label>
              <input
                type="text"
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value)}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block mb-2 font-semibold">Car Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleCarImageChange}
                className="w-full p-2 border rounded"
                required
              />
              {carImageUploading && <p>Uploading car image...</p>}
            </div>
            <div>
              <label className="block mb-2 font-semibold">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block mb-2 font-semibold">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block mb-2 font-semibold">Password</label>
              <div className="flex items-center">
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-2 border rounded"
                  required
                />
                <button type="button" onClick={generatePassword} className="ml-2 p-2 bg-gray-200 rounded">
                  Generate
                </button>
              </div>
            </div>
            <button
              type="submit"
              className="w-full p-2 bg-blue-500 text-white rounded"
              disabled={isSubmitDisabled}
            >
              {isLoading ? 'Adding Driver...' : 'Add Driver'}
            </button>
            <div>
              <br/>
              <br/>
              <br/>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default withAdminAuth(AddDriver);
