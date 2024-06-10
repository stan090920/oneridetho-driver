import Image from "next/image";
import logo from "../assets/logo.svg";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { CiLogout } from "react-icons/ci";
import { useState, useEffect } from "react";
import axios from 'axios';

interface Driver {
  id: number;
  name: string;
  photoUrl?: string;
}

const Navbar = () => {
  const { data: session } = useSession();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

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

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  const handleDropdownItemClick = () => {
    setDropdownOpen(false);
  };

  
  return (
    <div className="bg-black relative">
      <div className="flex items-center justify-between w-[95%] h-[10vh]">
        <div className="flex items-center">
          <Link href="/">
            <div>
              <Image
                src={logo}
                alt="one ride tho"
                draggable="false"
                height={50}
              />
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-3 text-white ">
          {!session ? (
            <>
             
            </>
          ) : (
            <div className="flex items-center gap-3">
              <div onClick={toggleDropdown} className="cursor-pointer">
                <Image
                  src={driver?.photoUrl || "https://res.cloudinary.com/dxmrcocqb/image/upload/v1700749220/Social_Media_Chatting_Online_Blank_Profile_Picture_Head_And_Body_Icon_People_Standing_Icon_Grey_Background_generated_qnojdz.jpg"}
                  alt="pfp"
                  height={45}
                  width={45}
                  style={{ objectFit: "cover" }}
                  className="rounded-full object-cover"
                />
              </div>
              <div className="py-2 pr-4 text-white font-bold">{driver?.name?.split(" ")[0]}</div>
              <div onClick={() => signOut()} className="cursor-pointer">
                <CiLogout size={24} color="red" />
              </div>
            </div>
          )}
        </div>
      </div>
      {dropdownOpen && (
        <div className="absolute right-0 mt-[5px] mr-[115px] sm:mr-[145px] bg-white p-2 rounded shadow-lg w-20 z-50">
          <ul className="flex flex-col gap-2">
            <Link href="/task">
              <li className="text-black hover:bg-gray-200 w-full" onClick={handleDropdownItemClick}>
                Tasks
              </li>
            </Link>
            <Link href="/ratings">
              <li className="text-black hover:bg-gray-200 w-full" onClick={handleDropdownItemClick}>
                Ratings
              </li>
            </Link>
          </ul>
        </div>
      )}
    </div>
  );
};

export default Navbar;