import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Music, Palette, Sparkles, Users } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 p-4">
      {/* Header
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-pink-600">
              <Palette className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              CollageFm
            </h1>
          </div>
        </div>
      </header> */}

      {/* Header */}
      <header className="container mx-auto px-4 py-6 p-4">
        <div className="flex items-center justify-between px-2">
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
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-12">
        <div className="text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight">
              Your Music,{" "}
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Beautifully Arranged
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Transform your favorite albums into stunning visual collages,
              automatically sorted by color. Connect your music streaming
              service and watch your taste come to life.
            </p>
          </div>

          {/* Preview Images */}
          <div className="flex justify-center gap-8 max-w-5xl mx-auto">
            {/* Image 1 */}
            <div className="relative w-1/2 rounded-2xl overflow-hidden shadow-2xl border bg-gradient-to-br from-gray-100 to-gray-200">
              <img
                src="/20x20.jpeg"
                alt="Example album collage sorted by color"
                className="w-full h-full object-cover"
              />
              <div className="absolute -top-4 -right-4 bg-white rounded-full p-3 shadow-lg"></div>
            </div>

            {/* Image 2 */}
            <div className="relative w-1/2 rounded-2xl overflow-hidden shadow-2xl border bg-gradient-to-br from-gray-100 to-gray-200">
              <img
                src="/example2.jpeg"
                alt="Example album collage sorted by color"
                className="w-full h-full object-cover"
              />
              <div className="absolute -top-4 -right-4 bg-white rounded-full p-3 shadow-lg"></div>
            </div>
          </div>

          {/* Service Selection */}
          <div className="max-w-4xl mx-auto">
            <h3 className="text-2xl font-semibold mb-8">
              Choose Your Music Service
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Spotify Option */}
              <Card className="relative overflow-hidden border-2 hover:border-green-500 transition-colors group cursor-pointer">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Music className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl">Spotify</CardTitle>
                  <CardDescription className="text-base">
                    Connect your Spotify account to create collages from your
                    most played albums
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <Button
                    asChild
                    className="w-full bg-green-500 hover:bg-green-600 text-white"
                  >
                    <Link href="/spotify">Continue with Spotify</Link>
                  </Button>
                  <p className="text-sm text-muted-foreground mt-3">
                    Access your listening history and top tracks
                  </p>
                </CardContent>
              </Card>

              {/* Last.fm Option */}
              <Card className="relative overflow-hidden border-2 hover:border-red-500 transition-colors group cursor-pointer">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Users className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl">Last.fm</CardTitle>
                  <CardDescription className="text-base">
                    Enter your Last.fm username to generate collages from your
                    scrobbled music
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <Button
                    asChild
                    variant="outline"
                    className="w-full border-red-500 text-red-500 hover:bg-red-500 hover:text-white bg-transparent"
                  >
                    <Link href="/lastfm">Continue with Last.fm</Link>
                  </Button>
                  <p className="text-sm text-muted-foreground mt-3">
                    No account connection required
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Features */}
          <div className="max-w-4xl mx-auto pt-16">
            <h3 className="text-2xl font-semibold mb-8">How It Works</h3>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center space-y-4">
                <div className="mx-auto w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <Music className="h-6 w-6 text-purple-600" />
                </div>
                <h4 className="font-semibold">Connect Your Music</h4>
                <p className="text-muted-foreground text-sm">
                  Link your Spotify account or enter your Last.fm username to
                  access your music data
                </p>
              </div>
              <div className="text-center space-y-4">
                <div className="mx-auto w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center">
                  <Palette className="h-6 w-6 text-pink-600" />
                </div>
                <h4 className="font-semibold">Smart Color Sorting</h4>
                <p className="text-muted-foreground text-sm">
                  Our algorithm analyzes album artwork and arranges them by
                  color and visual appeal
                </p>
              </div>
              <div className="text-center space-y-4">
                <div className="mx-auto w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-yellow-600" />
                </div>
                <h4 className="font-semibold">Beautiful Collages</h4>
                <p className="text-muted-foreground text-sm">
                  Download and share your personalized music collages with
                  friends and social media
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 mt-16 border-t">
        <div className="text-center text-muted-foreground">
          <p>&copy; 2025 CollageFm. Transform your music into art.</p>
        </div>
      </footer>
    </div>
  );
}
