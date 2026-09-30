import { Html, Head, Main, NextScript } from "next/document";
import { inter } from "@/src/lib/fonts";

export default function Document() {
  return (
    <Html lang="en" className={inter.className}>
      <Head />
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
