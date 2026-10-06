import { redirect } from "next/navigation";

// Öğrenci paneli tek ana sayfa: eski bağlantılar /student'a gider.
export default function Page() {
  redirect("/student");
  
}
