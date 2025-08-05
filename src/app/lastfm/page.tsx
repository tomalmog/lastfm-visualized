"use client";

import type React from "react";

import { Analytics } from "@vercel/analytics/next";
import { useState } from "react";
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
import {
  Palette,
  Download,
  Music,
  Grid3X3,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";

interface Album {
  name: string;
  artist: string;
  coverUrl: string;
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

export default function LastFmPage() {
  const [user, setUser] = useState<string>("");
  const [albums, setAlbums] = useState<Album[]>([]);
  const [collage, setCollage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [width, setWidth] = useState<number | string>(10);
  const [height, setHeight] = useState<number | string>(10);
  const [progress, setProgress] = useState<number>(0);
  const [status, setStatus] = useState<string>("");
  const [gridSize, setGridSize] = useState<string>("");
  const [sufficientAlbums, setSufficientAlbums] = useState<boolean>(true);
  const [finalCount, setFinalCount] = useState<number>(100);

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
    if (!user) return;

    const finalWidth = width === "" ? 1 : Number(width);
    const finalHeight = height === "" ? 1 : Number(height);

    if (
      finalWidth < 1 ||
      finalWidth > 20 ||
      finalHeight < 1 ||
      finalHeight > 20
    ) {
      alert("Width and height must be between 1 and 20");
      return;
    }

    const albumCount = finalWidth * finalHeight;
    const dimensions = `${finalWidth}x${finalHeight}`;
    setLoading(true);
    setProgress(0);
    setStatus("Fetching albums from Last.fm...");

    try {
      const res = await fetch(`/api/lastfm?user=${user}&limit=${albumCount}`);
      const data = await res.json();

      if (data.albums) {
        setAlbums(data.albums);
        setProgress(20);
        setStatus("Validating album cover images...");

        const validatedAlbums = await Promise.all(
          data.albums.map(async (album: Album, index: number) => {
            const validUrl = await validateImageUrl(album.coverUrl, 3000);
            const progressPercent = Math.round(
              20 + ((index + 1) / data.albums.length) * 50
            );
            setProgress(progressPercent);
            return {
              ...album,
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
            albums: validatedAlbums,
            dimensions: dimensions,
          }),
        });

        const collageData = await collageRes.json();
        setProgress(90);

        if (collageData.image) {
          setGridSize(collageData.gridSize);
          setSufficientAlbums(collageData.sufficientAlbums);
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
        alert("Failed to fetch albums: " + (data.error || "Unknown error"));
        setAlbums([]);
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

  const albumCount =
    (width === "" ? 1 : Number(width)) * (height === "" ? 1 : Number(height));

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
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
          <Badge
            variant="secondary"
            className="bg-red-100 text-red-700 border-red-200"
          >
            <Music className="h-3 w-3 mr-1" />
            Last.fm
          </Badge>
        </div>
      </header>

      <main className="container mx-auto px-4 pb-12">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Page Title */}
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold">Create Your Last.fm Collage</h2>
            <p className="text-muted-foreground">
              Enter your Last.fm username to generate a beautiful color-sorted
              album collage
            </p>
          </div>

          {/* Form Card */}
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Grid3X3 className="h-5 w-5" />
                Collage Settings
              </CardTitle>
              <CardDescription>
                Configure your username and preferred grid dimensions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="username">Last.fm Username</Label>
                  <Input
                    id="username"
                    type="text"
                    value={user}
                    onChange={(e) => setUser(e.target.value)}
                    placeholder="Enter your Last.fm username"
                    className="text-lg py-3"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div className="space-y-2">
                    <Label htmlFor="width">Width</Label>
                    <Input
                      id="width"
                      type="number"
                      min="1"
                      max="20"
                      value={width}
                      onChange={handleWidthChange}
                      className="text-lg py-3"
                    />
                    <p className="text-xs text-muted-foreground">Max: 20</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="height">Height</Label>
                    <Input
                      id="height"
                      type="number"
                      min="1"
                      max="20"
                      value={height}
                      onChange={handleHeightChange}
                      className="text-lg py-3"
                    />
                    <p className="text-xs text-muted-foreground">Max: 20</p>
                  </div>

                  <div className="space-y-2">
                    <Button
                      type="submit"
                      disabled={loading || !user}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-3 text-lg"
                    >
                      {loading ? "Processing..." : "Generate Collage"}
                    </Button>
                    <p className="text-xs text-muted-foreground">‎ </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {sufficientAlbums ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span
                      className={
                        sufficientAlbums ? "text-green-700" : "text-red-700"
                      }
                    >
                      {sufficientAlbums
                        ? `A ${
                            gridSize ||
                            `${albumCount === 1 ? "1x1" : `${width}x${height}`}`
                          } grid will be made using your top ${finalCount} albums`
                        : "This account does not have enough albums for your requested grid size"}
                    </span>
                  </div>
                  <Badge variant="outline">
                    {albumCount} album{albumCount !== 1 ? "s" : ""} needed
                  </Badge>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Loading Progress */}
          {loading && (
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{status}</span>
                    <span className="text-sm text-muted-foreground">
                      {progress}% complete
                    </span>
                  </div>
                  <Progress value={progress} className="h-3" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Default message */}
          {!loading && albums.length === 0 && (
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
              <CardContent className="pt-6 text-center py-12">
                <Music className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-lg">
                  Enter your Last.fm username and select your preferred
                  dimensions to generate your album collage.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Albums Preview */}
          {albums.length > 0 && (
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
              <CardHeader>
                <CardTitle>
                  Top {albums.length} Albums for "{user}"
                </CardTitle>
                <CardDescription>
                  These albums will be used to create your collage
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3 max-h-96 overflow-y-auto p-4 bg-gray-50 rounded-lg">
                  {albums.map((album, index) => (
                    <div key={index} className="text-center group">
                      <div className="relative overflow-hidden rounded-lg shadow-sm group-hover:shadow-md transition-shadow">
                        <img
                          src={album.coverUrl || "/placeholder-album.png"}
                          alt={`${album.name} cover`}
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
                        className="text-xs mt-1 truncate text-muted-foreground"
                        title={`${album.name} - ${album.artist}`}
                      >
                        {album.name}
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
                  Your albums beautifully arranged by color harmony
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
                      download={`${user}-${width === "" ? 1 : Number(width)}x${
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

      <Analytics />
    </div>
  );
}
