import { Lexend, Nunito } from "next/font/google";

// Lexend: okuma akıcılığı için tasarlanmış gövde fontu; Nunito: yuvarlak, sıcak başlıklar.
// latin-ext şart: ğ, ş, İ, ı bu alt kümede.
const lexend = Lexend({
  variable: "--font-lexend",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin", "latin-ext"],
  weight: ["600", "700", "800"],
  display: "swap",
});

export const studentFontClass = `${lexend.variable} ${nunito.variable}`;
