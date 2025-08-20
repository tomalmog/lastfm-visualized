# CollageFm – Music Taste Visualizer

Turn your top albums into a stunning, color sorted collage. Built with Next.js, Sharp, and music APIs.

![Demo](/public/20x20.jpeg)  
*Example collage generated from a user's top albums*

---

## Features

- ✅ **Supports both Last.fm and Spotify**
- ✅ **Responsive design** – works on mobile and desktop
- ✅ **Dynamic grid sizing** – automatically adjusts to your number of albums
- ✅ **Smart fallbacks** for missing album art (iTunes, MusicBrainz)
- ✅ **Downloadable collage** (JPG) for sharing or printing

---

## Try It Live

**[https://collagefm.vercel.app](https://collagefm.vercel.app)**

Enter your Last.fm username or connect your Spotify account to generate your music collage in seconds.

---

## How It Works

1. Fetches your top albums from **Last.fm** or **Spotify**
2. Downloads album covers and extracts dominant colors
3. Sorts albums by **color temperature and hue**
4. Generates a high-quality collage using **Sharp (Node.js)**
5. Returns a downloadable image

All processing happens server-side.

---

## Tech Stack

- **Next.js 14** (App Router)
- **React** (Client Components)
- **Vercel** (Serverless deployment)
- **Sharp** – for image processing and color extraction
- **Axios** – API calls to Last.fm & Spotify
- **Tailwind CSS** – styling
- **Last.fm API** – scrobbling data
- **Spotify Web API** – user top tracks & albums
