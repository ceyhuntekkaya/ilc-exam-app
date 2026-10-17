import { NextResponse } from "next/server";

/** Bu durumlar gövde taşıyamaz. Boş bir ArrayBuffer bile Next yanıt kurucusunu düşürür. */
const NULL_BODY_STATUS = new Set([101, 204, 205, 304]);

export function proxyResponse(status: number, body: ArrayBuffer, headers: Headers) {
  if (NULL_BODY_STATUS.has(status)) {
    return new NextResponse(null, { status, headers });
  }
  return new NextResponse(body, { status, headers });
}
