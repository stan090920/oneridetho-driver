import Image from "next/image";
import logo from "../assets/logo.svg";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { CiLogout } from "react-icons/ci";
import { useState } from "react";


const Navbar = () => {
  const { data: session } = useSession();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
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
                  src={session.user?.image || "https://res.cloudinary.com/dxmrcocqb/image/upload/v1700749220/Social_Media_Chatting_Online_Blank_Profile_Picture_Head_And_Body_Icon_People_Standing_Icon_Grey_Background_generated_qnojdz.jpg"}
                  alt="pfp"
                  height={40}
                  width={40}
                  className="rounded-full"
                />
              </div>
              <div>{session.user?.name}</div>
              <div onClick={() => signOut()} className="cursor-pointer">
                <CiLogout size={24} color="red" />
              </div>
            </div>
          )}
        </div>
      </div>
      {dropdownOpen && (
        <div className="absolute right-0 mt-[5px] mr-[40px] sm:mr-[80px] bg-white p-2 rounded shadow-lg w-20 z-50">
          <ul className="flex flex-col gap-2">
            <Link href="/task">
              <li className="text-black hover:bg-gray-200 w-full">
                Tasks
              </li>
            </Link>
            <Link href="/ratings">
              <li className="text-black hover:bg-gray-200 w-full">
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