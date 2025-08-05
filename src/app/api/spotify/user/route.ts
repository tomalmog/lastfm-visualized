import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization")

    if (!authorization) {
      return NextResponse.json({ error: "No authorization header" }, { status: 401 })
    }

    const response = await fetch("https://api.spotify.com/v1/me", {
      headers: {
        Authorization: authorization,
      },
    })

    if (response.ok) {
      const userData = await response.json()
      return NextResponse.json(userData)
    } else {
      return NextResponse.json({ error: "Failed to fetch user data" }, { status: response.status })
    }
  } catch (error) {
    console.error("User fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
