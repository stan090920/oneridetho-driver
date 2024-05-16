import Navbar from '@/components/Navbar';
import '@/styles/globals.css'
import { SessionProvider } from 'next-auth/react'
import type { AppProps } from "next/app";

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <SessionProvider session={pageProps.session}>
      <Navbar />
     <Component {...pageProps} />
     </SessionProvider>
  )
}
