import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization")

    if (!authorization) {
      return NextResponse.json({ error: "No authorization header" }, { status: 401 })
    }

    if (!authorization.startsWith('Bearer ')) {
      return NextResponse.json({ error: "Invalid authorization header format" }, { status: 401 })
    }

    const response = await fetch("https://api.spotify.com/v1/me", {
      headers: {
        Authorization: authorization,
      },
    })

    const userData = await response.json()

    if (!response.ok) {
      console.error("Spotify user API error:", response.status, userData)
      return NextResponse.json({ 
        error: userData.error?.message || "Failed to fetch user data",
        details: userData,
        status: response.status
      }, { status: response.status })
    }

    return NextResponse.json(userData)
  } catch (error) {
    console.error("User fetch error:", error)
    return NextResponse.json({ 
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}