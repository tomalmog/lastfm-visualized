// src/app/api/generate-collage/route.js
import sharp from "sharp";
import axios from "axios";

// Helper: Check if buffer is valid
function isValidBuffer(buffer) {
  return Buffer.isBuffer(buffer) && buffer.length > 100;
}

// Extract average color by resizing to 1x1
async function getAverageColor(buffer) {
  try {
    const { data } = await sharp(buffer)
      .resize(1, 1)
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    if (!data || data.length < 3) throw new Error("No pixel data");

    return { r: data[0], g: data[1], b: data[2] };
  } catch (err) {
    console.warn("Color extraction failed:", err.message);
    return { r: 0, g: 0, b: 0 }; // Fallback black
  }
}

function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s = max === 0 ? 0 : (max - min) / max;
  if (max === min) h = 0;
  else {
    h = max === r ? (g - b) / (max - min) + (g < b ? 6 : 0)
      : max === g ? (b - r) / (max - min) + 2
      : (r - g) / (max - min) + 4;
    h /= 6;
  }
  return { h, s, v: max };
}

function parseDimensions(dimensionsStr) {
  const [cols, rows] = dimensionsStr.split('x').map(Number);
  return { cols, rows };
}

function getTemperatureGroup(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max === 0 ? 0 : (max - min) / max;

  if (saturation < 0.3) return 'monochrome';

  const hue = rgbToHsv(r, g, b).h * 360;
  return hue >= 120 && hue <= 240 ? 'cool' : 'warm';
}

// iTunes fallback cover fetch
async function getFallbackCover(album, artist) {
  const search = encodeURIComponent(`${artist} ${album}`);
  const url = `https://itunes.apple.com/search?term=${search}&media=music&entity=album&limit=1`;

  try {
    const res = await axios.get(url);
    const result = res.data?.results?.[0];
    if (result?.artworkUrl100) {
      return result.artworkUrl100.replace("100x100bb", "600x600bb");
    }
  } catch {}
  return null;
}

async function fetchCoverFromMusicBrainz(albumName, artistName) {
  try {
    // Step 1: Search MusicBrainz for the release
    const query = encodeURIComponent(`${artistName} ${albumName}`);
    const searchUrl = `https://musicbrainz.org/ws/2/release?query=${query}&limit=1&fmt=json`;
    
    const searchRes = await axios.get(searchUrl, {
      headers: { 'User-Agent': 'LastFM-Collage-Generator/1.0' }
    });

    const releases = searchRes.data?.releases;
    if (!releases || releases.length === 0) return null;

    const mbid = releases[0].id; // MusicBrainz ID

    // get cover from Cover Art Archive
    const coverUrl = `https://coverartarchive.org/release/${mbid}/front-600.jpg`;

    // Test if cover exists
    const headRes = await axios.head(coverUrl);
    if (headRes.status === 200) {
      return coverUrl;
    }
  } catch (err) {
    console.warn(`MusicBrainz lookup failed for ${albumName}:`, err.message);
  }
  return null;
}

async function fetchAlbumImagesFromLastFM(artist, albumName) {
  try {
    const url = `https://ws.audioscrobbler.com/2.0/?method=album.getImages&artist=${encodeURIComponent(artist)}&album=${encodeURIComponent(albumName)}&api_key=${process.env.LASTFM_API_KEY}&format=json`;

    const res = await axios.get(url);
    const images = res.data?.images?.image;

    if (!Array.isArray(images)) return null;

    // Filter for valid urls
    for (const img of images) {
      const imgUrl = img?.sizes?.size?.find(s => s.size === 'large')?.['#text'] || img['#text'];
      if (!imgUrl) continue;
      if (imgUrl.includes('2a96cbd8b46e442fc41c2b86b821562f')) continue; // Skip placeholder
      return imgUrl; // Return first valid image
    }

    return null;
  } catch (err) {
    console.warn(`Failed to fetch additional images for ${albumName}:`, err.message);
    return null;
  }
}


export async function POST(request) {
  try {
    const { albums, dimensions = "10x10" } = await request.json();

    if (!albums || !Array.isArray(albums) || albums.length === 0) {
      return Response.json({ error: "No albums provided" }, { status: 400 });
    }

    const { cols, rows } = parseDimensions(dimensions);
    const totalSlots = cols * rows;
    const size = 100;
    const width = cols * size;
    const height = rows * size;

    console.log(`Creating ${dimensions} collage for ${albums.length} albums`);

    // Process album covers in parallel
    const results = await Promise.allSettled(albums.slice(0, totalSlots).map(async (album, index) => {
      let url = album.coverUrl;

      // Skip known placeholder URLs
      if (
        !url ||
        typeof url !== "string" ||
        url.includes('2a96cbd8b46e442fc41c2b86b821562f') ||
        url === ''
      ) {
        console.warn(`Skipping placeholder image: ${album.name}`);
        url = await getFallbackCover(album.name, album.artist || "");
      }

      if (!url) {
        throw new Error("No cover URL found");
      }

      try {
        let buffer = null;
let finalCoverUrl = null;

const originalUrl = album.coverUrl;

// 1. Try Last.fm 300x300 version
if (originalUrl) {
  const largeUrl = originalUrl.replace(/\/i\/u\/\d+[s]?\/(.*)$/, '/i/u/300x300/$1');
  try {
    const res = await axios.get(largeUrl, { 
      responseType: 'arraybuffer', 
      timeout: 10000,
      validateStatus: s => s === 200,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (res.data?.length > 100) {
      buffer = Buffer.from(res.data);
      finalCoverUrl = largeUrl;
    }
  } catch (err) {
    console.warn(`300x300 failed for ${album.name}`);
  }
}

// 2. If that fails, try MusicBrainz
if (!buffer) {
  const mbUrl = await fetchCoverFromMusicBrainz(album.name, album.artist);
  if (mbUrl) {
    try {
      const res = await axios.get(mbUrl, { 
        responseType: 'arraybuffer', 
        timeout: 10000,
        validateStatus: s => s === 200,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      if (res.data?.length > 100) {
        buffer = Buffer.from(res.data);
        finalCoverUrl = mbUrl;
      }
    } catch (err) {
      console.warn(`MusicBrainz cover failed for ${album.name}`);
    }
  }
}

// 3. If still no image, use black fallback
if (!buffer) {

  const fallback = await sharp({ 
    create: { width: size, height: size, channels: 3, background: { r: 0, g: 0, b: 0 } } 
  }).jpeg({ quality: 90 }).toBuffer();
  processedAlbums.push({
    buffer: fallback,
    color: { r: 0, g: 0, b: 0 },
    name: album.name
  });
}

        const resized = await sharp(buffer)
          .resize(size, size, { 
            fit: 'cover',
            position: 'center'
          })
          .removeAlpha()
          .jpeg({ quality: 90 })
          .toBuffer();

        const color = await getAverageColor(buffer);

        return {
          buffer: resized,
          color,
          name: album.name
        };
      } catch (err) {
        console.error(`Failed to fetch or process image for ${album.name}:`, err.message);
        throw err;
      }
    }));

    // Build processed list and replace failures with fallback
    const processed = await Promise.all(results.map(async (res, idx) => {
      if (res.status === "fulfilled") return res.value;

      console.warn(`Album ${albums[idx].name} failed: ${res.reason}`);

      const fallback = await sharp({
        create: {
          width: size,
          height: size,
          channels: 3,
          background: { r: 0, g: 0, b: 0 }
        }
      }).jpeg({ quality: 90 }).toBuffer();

      return {
        buffer: fallback,
        color: { r: 0, g: 0, b: 0 },
        name: albums[idx].name || "fallback"
      };
    }));

    // Fill empty slots
    while (processed.length < totalSlots) {
      const fallback = await sharp({
        create: {
          width: size,
          height: size,
          channels: 3,
          background: { r: 0, g: 0, b: 0 }
        }
      }).jpeg({ quality: 90 }).toBuffer();

      processed.push({ buffer: fallback, color: { r: 0, g: 0, b: 0 }, name: "empty-slot" });
    }

    // Group and sort
    const cool = [], warm = [], mono = [];
    for (const album of processed) {
      const group = getTemperatureGroup(album.color.r, album.color.g, album.color.b);
      if (group === "cool") cool.push(album);
      else if (group === "monochrome") mono.push(album);
      else warm.push(album);
    }

    const byHue = list => list.sort((a, b) => rgbToHsv(a.color.r, a.color.g, a.color.b).h - rgbToHsv(b.color.r, b.color.g, b.color.b).h);
    const byBrightness = list => list.sort((a, b) =>
      (0.299 * a.color.r + 0.587 * a.color.g + 0.114 * a.color.b) -
      (0.299 * b.color.r + 0.587 * b.color.g + 0.114 * b.color.b));

    const sorted = [...byHue(warm), ...byHue(cool), ...byBrightness(mono)];

    const diagonalPositions = [];
    for (let sum = 0; sum < cols + rows - 1; sum++) {
      for (let col = 0; col < cols; col++) {
        const row = sum - col;
        if (row >= 0 && row < rows) {
          diagonalPositions.push({ col, row });
        }
      }
    }

    const composite = [];
    for (let i = 0; i < Math.min(sorted.length, totalSlots, diagonalPositions.length); i++) {
      const img = sorted[i];
      const pos = diagonalPositions[i];

      try {
        const meta = await sharp(img.buffer).metadata();
        if (!meta.width || !meta.height) continue;

        composite.push({
          input: img.buffer,
          left: pos.col * size,
          top: pos.row * size
        });
      } catch {}
    }

    if (!composite.length) {
      return Response.json({ error: "No valid images after processing" }, { status: 500 });
    }

    const finalImage = await sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 10, g: 10, b: 10 }
      }
    }).composite(composite).jpeg({ quality: 95 }).toBuffer();

    const base64 = finalImage.toString("base64");

    return Response.json({
      image: `data:image/jpeg;base64,${base64}`,
      processedCount: composite.length,
      totalRequested: albums.length,
      dimensions,
      gridSize: `${cols}x${rows}`,
      totalSlots
    });
  } catch (err) {
    console.error("Fatal error:", err.message);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}