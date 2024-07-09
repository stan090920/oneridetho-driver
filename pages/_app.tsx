import ChatPanel from '@/components/ChatPanel';
import Navbar from '@/components/Navbar';
import '@/styles/globals.css'
import { SessionProvider } from 'next-auth/react'
import type { AppProps } from "next/app";
import { Toaster } from "react-hot-toast";

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <SessionProvider session={pageProps.session}>
      <Toaster position="bottom-center" />
      <Navbar />
      <ChatPanel />
      <Component {...pageProps} />
    </SessionProvider>
  );
}
