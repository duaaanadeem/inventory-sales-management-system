import Head from "next/head";
import type { AppProps } from "next/app";
import { inter } from "@/src/lib/fonts";
import "./globals.css";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Inventory &amp; Sales Management System</title>
        <meta
          name="description"
          content="Business management dashboard"
        />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=5"
        />
        <meta name="theme-color" content="#2563eb" />
      </Head>
      <div className={inter.className}>
        <Component {...pageProps} />
      </div>
    </>
  );
}
