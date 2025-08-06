"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Palette,
  Download,
  Music,
  Grid3X3,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  LogOut,
} from "lucide-react";
import Link from "next/link";

interface SpotifyTrack {
  name: string;
  artist: string;
  album: string;
  coverUrl: string;
  external_urls: {
    spotify: string;
  };
}

interface SpotifyUser {
  display_name: string;
  id: string;
  images: Array<{ url: string }>;
}

// Image validation function with timeout
const validateImageUrl = (
  url: string,
  timeout = 5000
): Promise<string | null> => {
  return new Promise((resolve) => {
    if (!url || url.trim() === "" || !url.includes("http")) {
      resolve(null);
      return;
    }
    const img = new Image();
    const timer = setTimeout(() => {
      resolve(null);
    }, timeout);
    img.onload = () => {
      clearTimeout(timer);
      resolve(url);
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    img.src = url;
  });
};

export default function SpotifyPage() {
  const [user, setUser] = useState<SpotifyUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [collage, setCollage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [width, setWidth] = useState<number | string>(10);
  const [height, setHeight] = useState<number | string>(10);
  const [progress, setProgress] = useState<number>(0);
  const [status, setStatus] = useState<string>("");
  const [gridSize, setGridSize] = useState<string>("");
  const [sufficientTracks, setSufficientTracks] = useState<boolean>(true);
  const [finalCount, setFinalCount] = useState<number>(100);
  const [timeRange, setTimeRange] = useState<string>("medium_term");

  // Check for access token in URL or localStorage on component mount
  useEffect(() => {
    console.log("Component mounted, checking URL and localStorage...");

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const error = urlParams.get("error");
    const storedToken = localStorage.getItem("spotify_access_token");
    const tokenExpiry = localStorage.getItem("spotify_token_expiry");

    console.log("URL params check:", {
      hasCode: !!code,
      hasError: !!error,
      code: code ? code.substring(0, 20) + "..." : "None",
      error: error || "None",
    });

    console.log("LocalStorage check:", {
      hasStoredToken: !!storedToken,
      tokenExpiry: tokenExpiry
        ? new Date(parseInt(tokenExpiry)).toLocaleString()
        : "None",
      isTokenValid:
        storedToken && tokenExpiry && Date.now() < parseInt(tokenExpiry),
    });

    // Handle Spotify auth error
    if (error) {
      console.error("Spotify auth error:", error);
      alert(`Spotify authentication error: ${error}`);
      return;
    }

    // Priority 1: If we have a code, exchange it (regardless of stored token)
    if (code) {
      console.log("Found authorization code, exchanging for token...");
      exchangeCodeForToken(code);
      return;
    }

    // Priority 2: Check if we have a valid stored token
    if (storedToken && tokenExpiry && Date.now() < parseInt(tokenExpiry)) {
      console.log("Using valid stored token");
      setAccessToken(storedToken);
      fetchUserProfile(storedToken);
      return;
    }

    // Priority 3: Clean up expired token
    if (storedToken && tokenExpiry && Date.now() >= parseInt(tokenExpiry)) {
      console.log("Stored token expired, cleaning up");
      localStorage.removeItem("spotify_access_token");
      localStorage.removeItem("spotify_token_expiry");
    }

    console.log("No valid authentication found, user needs to login");
  }, []);

  const exchangeCodeForToken = async (code: string) => {
    try {
      console.log("Exchanging code for token...");
      setStatus("Exchanging authorization code for access token...");

      const response = await fetch("/api/spotify/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();
      console.log("Token exchange response:", response.status, data);

      if (response.ok && data.access_token) {
        console.log("✅ Token exchange successful");
        setAccessToken(data.access_token);
        localStorage.setItem("spotify_access_token", data.access_token);
        localStorage.setItem(
          "spotify_token_expiry",
          (Date.now() + data.expires_in * 1000).toString()
        );

        // Clean up URL immediately
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );

        await fetchUserProfile(data.access_token);
        setStatus("");
      } else {
        console.error("❌ Failed to get access token:", data);
        setStatus("");
        alert(
          `Authentication failed: ${
            data.error || data.error_description || "Unknown error"
          }`
        );
      }
    } catch (error) {
      console.error("❌ Error exchanging code for token:", error);
      setStatus("");
      alert("Failed to authenticate with Spotify. Please try again.");
    }
  };

  const fetchUserProfile = async (token: string) => {
    try {
      console.log("Fetching user profile...");
      setStatus("Fetching user profile...");

      const response = await fetch("/api/spotify/user", {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("User profile response:", response.status);

      if (response.ok) {
        const userData = await response.json();
        console.log("✅ User data received:", userData.display_name);
        setUser(userData);
        setStatus("");
      } else {
        const errorData = await response.json();
        console.error("❌ Failed to fetch user profile:", errorData);
        setStatus("");
      }
    } catch (error) {
      console.error("❌ Error fetching user profile:", error);
      setStatus("");
    }
  };

  const handleSpotifyLogin = () => {
    console.log("Starting Spotify login...");

    const clientId = "38c11be9caab4721bc1f34f7a4c47f92";

    const redirectUri = `${window.location.origin}/spotify`;
    const scopes = "user-top-read user-read-private";

    console.log("Auth URL params:", { clientId, redirectUri, scopes });

    const authUrl =
      `https://accounts.spotify.com/authorize?` +
      `client_id=${clientId}&` +
      `response_type=code&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${encodeURIComponent(scopes)}`;

    console.log("Redirecting to:", authUrl);
    window.location.href = authUrl;
  };

  const handleLogout = () => {
    console.log("Logging out...");
    localStorage.removeItem("spotify_access_token");
    localStorage.removeItem("spotify_token_expiry");
    setAccessToken(null);
    setUser(null);
    setTracks([]);
    setCollage(null);
  };

  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "") {
      setWidth("");
    } else {
      const numValue = Number.parseInt(value, 10);
      if (!isNaN(numValue)) {
        setWidth(numValue);
      }
    }
  };

  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "") {
      setHeight("");
    } else {
      const numValue = Number.parseInt(value, 10);
      if (!isNaN(numValue)) {
        setHeight(numValue);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!accessToken) return;

    const finalWidth = width === "" ? 1 : Number(width);
    const finalHeight = height === "" ? 1 : Number(height);

    if (
      finalWidth < 1 ||
      finalWidth > 10 ||
      finalHeight < 1 ||
      finalHeight > 10
    ) {
      alert("Width and height must be between 1 and 10");
      return;
    }

    const trackCount = finalWidth * finalHeight;
    const dimensions = `${finalWidth}x${finalHeight}`;
    setLoading(true);
    setProgress(0);
    setStatus("Fetching your top tracks from Spotify...");

    try {
      const res = await fetch(
        `/api/spotify/tracks?limit=${trackCount}&time_range=${timeRange}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      const data = await res.json();

      if (data.tracks) {
        setTracks(data.tracks);
        setProgress(20);
        setStatus("Validating album cover images...");

        const validatedTracks = await Promise.all(
          data.tracks.map(async (track: SpotifyTrack, index: number) => {
            const validUrl = await validateImageUrl(track.coverUrl, 3000);
            const progressPercent = Math.round(
              20 + ((index + 1) / data.tracks.length) * 50
            );
            setProgress(progressPercent);
            return {
              ...track,
              coverUrl: validUrl || "/placeholder-album.png",
            };
          })
        );

        setProgress(70);
        setStatus("Generating collage...");

        const collageRes = await fetch("/api/generate-collage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            albums: validatedTracks.map((track) => ({
              name: track.album,
              artist: track.artist,
              coverUrl: track.coverUrl,
            })),
            dimensions: dimensions,
          }),
        });

        const collageData = await collageRes.json();
        setProgress(90);

        if (collageData.image) {
          setGridSize(collageData.gridSize);
          setSufficientTracks(collageData.sufficientAlbums);
          setFinalCount(collageData.finalCount);
          setCollage(collageData.image);
          setProgress(100);
          setStatus("Collage generated successfully!");
        } else {
          alert(
            "Failed to generate collage: " +
              (collageData.error || "Unknown error")
          );
        }
      } else {
        alert("Failed to fetch tracks: " + (data.error || "Unknown error"));
        setTracks([]);
      }
    } catch (err) {
      alert("Error: Could not connect to API.");
      console.error(err);
      setStatus("Error occurred");
    } finally {
      setLoading(false);
      setTimeout(() => {
        setProgress(0);
        setStatus("");
      }, 2000);
    }
  };

  const trackCount =
    (width === "" ? 1 : Number(width)) * (height === "" ? 1 : Number(height));

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 p-4">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Link
              href="/"
              className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-pink-600">
                <Palette className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                CollageFm
              </h1>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Badge
              variant="secondary"
              className="bg-green-100 text-green-700 border-green-200"
            >
              <Music className="h-3 w-3 mr-1" />
              Spotify
            </Badge>
            {user && (
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 pb-12">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Page Title */}
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold">Create Your Spotify Collage</h2>
            <p className="text-gray-600">
              Connect your Spotify account to generate a beautiful color-sorted
              album collage from your top tracks
            </p>
          </div>

          {/* Status Display */}
          {status && (
            <Card className="shadow-lg border-0 bg-blue-50/80 backdrop-blur">
              <CardContent className="pt-6">
                <div className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-blue-700 font-medium">{status}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Authentication */}
          {!accessToken ? (
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center gap-2">
                  <Music className="h-6 w-6 text-green-600" />
                  Connect to Spotify
                </CardTitle>
                <CardDescription>
                  You need to connect your Spotify account to access your music
                  data
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <Button
                  onClick={handleSpotifyLogin}
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg"
                >
                  <ExternalLink className="h-5 w-5 mr-2" />
                  Connect with Spotify
                </Button>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    We only access your top tracks and basic profile
                    information. Your data is never stored.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* User Profile */}
              {user && (
                <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      {user.images?.[0] && (
                        <img
                          src={user.images[0].url || "/placeholder.svg"}
                          alt="Profile"
                          className="w-12 h-12 rounded-full"
                        />
                      )}
                      <div>
                        <p className="font-semibold">
                          Connected as {user.display_name}
                        </p>
                        <p className="text-sm text-gray-600">
                          Ready to generate your collage
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Form Card */}
              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Grid3X3 className="h-5 w-5" />
                    Collage Settings
                  </CardTitle>
                  <CardDescription>
                    Configure your preferred grid dimensions and time period
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="timeRange">Time Period</Label>
                      <select
                        id="timeRange"
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-lg"
                      >
                        <option value="short_term">Last 4 weeks</option>
                        <option value="medium_term">Last 6 months</option>
                        <option value="long_term">All time</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                      <div className="space-y-2">
                        <Label htmlFor="width">Width</Label>
                        <Input
                          id="width"
                          type="number"
                          min="1"
                          max="10"
                          value={width}
                          onChange={handleWidthChange}
                          className="text-lg py-3"
                        />
                        <p className="text-xs text-gray-600">Max: 10</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="height">Height</Label>
                        <Input
                          id="height"
                          type="number"
                          min="1"
                          max="10"
                          value={height}
                          onChange={handleHeightChange}
                          className="text-lg py-3"
                        />
                        <p className="text-xs text-gray-600">Max: 10</p>
                      </div>

                      <Button
                        onClick={(e) => {
                          e.preventDefault();
                          handleSubmit(e as any);
                        }}
                        disabled={loading}
                        className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-3 text-lg"
                      >
                        {loading ? "Processing..." : "Generate Collage"}
                      </Button>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        {sufficientTracks ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span
                          className={
                            sufficientTracks ? "text-green-700" : "text-red-700"
                          }
                        >
                          {sufficientTracks
                            ? `A ${
                                gridSize ||
                                `${
                                  trackCount === 1
                                    ? "1x1"
                                    : `${width}x${height}`
                                }`
                              } grid will be made using your top ${finalCount} tracks`
                            : "You don't have enough tracks for your requested grid size"}
                        </span>
                      </div>
                      <Badge variant="outline">
                        {trackCount} track{trackCount !== 1 ? "s" : ""} needed
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Loading Progress */}
          {loading && (
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{status}</span>
                    <span className="text-sm text-gray-600">
                      {progress}% complete
                    </span>
                  </div>
                  <Progress value={progress} className="h-3" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Default message */}
          {!loading && tracks.length === 0 && accessToken && (
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
              <CardContent className="pt-6 text-center py-12">
                <Music className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 text-lg">
                  Select your preferred dimensions and time period to generate
                  your Spotify collage.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Tracks Preview */}
          {tracks.length > 0 && (
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
              <CardHeader>
                <CardTitle>Your Top {tracks.length} Tracks</CardTitle>
                <CardDescription>
                  These album covers will be used to create your collage
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3 max-h-96 overflow-y-auto p-4 bg-gray-50 rounded-lg">
                  {tracks.map((track, index) => (
                    <div key={index} className="text-center group">
                      <div className="relative overflow-hidden rounded-lg shadow-sm group-hover:shadow-md transition-shadow">
                        <img
                          src={track.coverUrl || "/placeholder-album.png"}
                          alt={`${track.album} cover`}
                          className="w-full aspect-square object-cover"
                          onError={(
                            e: React.SyntheticEvent<HTMLImageElement, Event>
                          ) => {
                            const target = e.target as HTMLImageElement;
                            if (target.src !== "/placeholder-album.png") {
                              target.src = "/placeholder-album.png";
                            }
                          }}
                        />
                      </div>
                      <p
                        className="text-xs mt-1 truncate text-gray-600"
                        title={`${track.name} - ${track.artist}`}
                      >
                        {track.album}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Generated Collage */}
          {collage && (
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Your {gridSize} Color Sorted Collage
                </CardTitle>
                <CardDescription>
                  Your top tracks' albums beautifully arranged by color harmony
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex justify-center">
                  <div className="relative group">
                    <img
                      src={collage || "/placeholder.svg"}
                      alt="Album collage sorted by color"
                      className="border rounded-lg shadow-lg max-w-full h-auto"
                      style={{ maxHeight: "80vh" }}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg" />
                  </div>
                </div>
                <div className="text-center">
                  <Button
                    asChild
                    size="lg"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <a
                      href={collage}
                      download={`spotify-${width === "" ? 1 : Number(width)}x${
                        height === "" ? 1 : Number(height)
                      }-album-collage.jpg`}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Collage
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
