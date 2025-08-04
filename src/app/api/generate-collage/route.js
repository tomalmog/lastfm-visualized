// src/app/api/generate-collage/route.js
import sharp from "sharp";
import axios from "axios";

// Helper: Check if buffer is valid
function isValidBuffer(buffer) {
  return Buffer.isBuffer(buffer) && buffer.length > 100;
}

function isValidPngBuffer(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 8) return false;
  const signature = buffer.slice(0, 8);
  const pngHeader = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
  return pngHeader.every((b, i) => b === signature[i]);
}

// Extract average color by resizing to 1x1
async function getAverageColor(buffer) {
  try {
    if (!Buffer.isBuffer(buffer)) {
      throw new Error("Not a buffer");
    }

    const { data } = await sharp(buffer)
      .resize(1, 1)
      .removeAlpha() 
      .raw()
      .toBuffer({ resolveWithObject: true });

    if (!data || data.length < 3) {
      throw new Error("No pixel data");
    }

    return { r: data[0], g: data[1], b: data[2] };
  } catch (err) {
    console.warn("Color extraction failed:", err.message);
    return { r: 0, g: 0, b: 0 }; // Fallback black
  }
}

// RGB to HSV for sorting by hue
function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, v = max;
  const d = max - min;
  s = max === 0 ? 0 : d / max;
  if (max === min) h = 0;
  else {
    h =
      max === r ? (g - b) / d + (g < b ? 6 : 0) :
      max === g ? (b - r) / d + 2 :
      (r - g) / d + 4;
    h /= 6;
  }
  return { h, s, v };
}

// Parse dimensions string (e.g., "10x10" -> { cols: 10, rows: 10 })
function parseDimensions(dimensionsStr) {
  const [cols, rows] = dimensionsStr.split('x').map(Number);
  return { cols, rows };
}

// Determine color temperature group
function getTemperatureGroup(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max === 0 ? 0 : (max - min) / max;
  
  // If it's very unsaturated (grayscale-ish), it's monochrome
  if (saturation < 0.3) {
    return 'monochrome';
  }
  
  // Calculate color temperature
  // Cool colors: blues, cyans, some greens
  // Warm colors: reds, oranges, yellows, magentas
  const hsv = rgbToHsv(r, g, b);
  const hue = hsv.h * 360; // Convert to degrees
  
  // Cool: 120-240 degrees (green through blue to purple)
  if (hue >= 120 && hue <= 240) {
    return 'cool';
  }
  // Warm: everything else (red, orange, yellow, magenta)
  else {
    return 'warm';
  }
}

export async function POST(request) {
  try {
    const { albums, dimensions = "10x10" } = await request.json();

    if (!albums || !Array.isArray(albums) || albums.length === 0) {
      return Response.json({ error: "No albums provided" }, { status: 400 });
    }

    // Parse dimensions
    const { cols, rows } = parseDimensions(dimensions);
    const totalSlots = cols * rows;
    const size = 100; // Size of each album cover
    const width = cols * size;
    const height = rows * size;

    console.log(`Creating ${dimensions} collage (${totalSlots} slots) with ${albums.length} albums`);

    const processedAlbums = [];

    // Process each album (up to the number of slots available)
    for (let i = 0; i < Math.min(albums.length, totalSlots); i++) {
      const album = albums[i];
      const coverUrl = album.coverUrl;

      console.log(`Processing ${i + 1}/${Math.min(albums.length, totalSlots)}: ${album.name} - ${coverUrl}`);

      try {
        // Validate URL
        if (!coverUrl || typeof coverUrl !== "string") {
          console.warn(`Invalid cover URL: ${album.name}`);
          continue;
        }

        // Fetch image with better headers
        const imgRes = await axios.get(coverUrl, {
          responseType: "arraybuffer",
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        const buffer = Buffer.from(imgRes.data);

        // Skip tiny/placeholder images
        if (buffer.length < 100) {
          console.warn(`Image too small (likely placeholder): ${album.name}`);
          throw new Error("Placeholder image");
        }

        // Resize and clean up image 
        let resizedBuffer;
        try {
          resizedBuffer = await sharp(buffer)
            .resize(size, size, { 
              fit: 'cover',
              position: 'center'
            })
            .removeAlpha() // Remove transparency
            .jpeg({ quality: 90 }) // Use JPEG instead of PNG for better compatibility
            .toBuffer();
        } catch (resizeErr) {
          console.warn(`Resize failed for ${album.name}:`, resizeErr.message);
          throw resizeErr;
        }

        // Validate resized buffer
        if (!isValidBuffer(resizedBuffer)) {
          console.warn(`Invalid resized buffer for ${album.name}`);
          throw new Error("Invalid image after resize");
        }

        // Extract color from original buffer (before resize for better accuracy)
        const color = await getAverageColor(buffer);

        processedAlbums.push({
          buffer: resizedBuffer,
          color,
          name: album.name // Keep name for debugging
        });
        
      } catch (err) {
        console.warn(`Failed to process album: ${album.name}`, err.message);

        // Create fallback black image
        try {
          const fallback = await sharp({
            create: {
              width: size,
              height: size,
              channels: 3,
              background: { r: 0, g: 0, b: 0 },
            },
          })
            .jpeg({ quality: 90 })
            .toBuffer();

          processedAlbums.push({
            buffer: fallback,
            color: { r: 0, g: 0, b: 0 },
            name: album.name || 'fallback'
          });
        } catch (fallbackErr) {
          console.error("Failed to create fallback image", fallbackErr);
        }
      }
    }

    // If we don't have enough albums to fill the grid, create more fallback images
    while (processedAlbums.length < totalSlots) {
      try {
        const fallback = await sharp({
          create: {
            width: size,
            height: size,
            channels: 3,
            background: { r: 0, g: 0, b: 0 },
          },
        })
          .jpeg({ quality: 90 })
          .toBuffer();

        processedAlbums.push({
          buffer: fallback,
          color: { r: 0, g: 0, b: 0 },
          name: 'empty-slot'
        });
      } catch (fallbackErr) {
        console.error("Failed to create empty slot fallback", fallbackErr);
        break;
      }
    }

    // If no valid albums
    if (processedAlbums.length === 0) {
      return Response.json({ error: "No valid album covers to process" }, { status: 500 });
    }


// Group albums by temperature, then sort by hue within each group
            const coolAlbums = [];
            const monochromeAlbums = [];
            const warmAlbums = [];

            // Separate into temperature groups
            processedAlbums.forEach(album => {
            const tempGroup = getTemperatureGroup(album.color.r, album.color.g, album.color.b);
            if (tempGroup === 'cool') {
                coolAlbums.push(album);
            } else if (tempGroup === 'monochrome') {
                monochromeAlbums.push(album);
            } else {
                warmAlbums.push(album);
            }
            });

            // Sort each group by hue
            coolAlbums.sort((a, b) => {
            const hsv1 = rgbToHsv(a.color.r, a.color.g, a.color.b);
            const hsv2 = rgbToHsv(b.color.r, b.color.g, b.color.b);
            return hsv1.h - hsv2.h;
            });

            monochromeAlbums.sort((a, b) => {
            // Sort monochrome by brightness (dark to light)
            const brightness1 = 0.299 * a.color.r + 0.587 * a.color.g + 0.114 * a.color.b;
            const brightness2 = 0.299 * b.color.r + 0.587 * b.color.g + 0.114 * b.color.b;
            return brightness1 - brightness2;
            });

            warmAlbums.sort((a, b) => {
            const hsv1 = rgbToHsv(a.color.r, a.color.g, a.color.b);
            const hsv2 = rgbToHsv(b.color.r, b.color.g, b.color.b);
            return hsv1.h - hsv2.h;
            });

            // Combine groups
            const sortedAlbums = [...warmAlbums, ...coolAlbums, ...monochromeAlbums,];

            console.log(`Color distribution: ${coolAlbums.length} cool, ${monochromeAlbums.length} monochrome, ${warmAlbums.length} warm`);


const diagonalPositions = [];
for (let sum = 0; sum < cols + rows - 1; sum++) {
  for (let col = 0; col < cols; col++) {
    const row = sum - col;
    if (row >= 0 && row < rows) {
      diagonalPositions.push({ col, row });
    }
  }
}

// Create composite array with diagonal positioning
const composite = [];
for (let i = 0; i < Math.min(sortedAlbums.length, totalSlots, diagonalPositions.length); i++) {
  const img = sortedAlbums[i];
  const pos = diagonalPositions[i];
  
  try {
    // Validate the buffer one more time before adding to composite
    if (!Buffer.isBuffer(img.buffer) || img.buffer.length === 0) {
      console.warn(`Invalid buffer for ${img.name}, skipping`);
      continue;
    }

    // Test that sharp can actually process this buffer
    const metadata = await sharp(img.buffer).metadata();
    if (!metadata.width || !metadata.height) {
      console.warn(`Invalid image metadata for ${img.name}, skipping`);
      continue;
    }

    composite.push({
      input: img.buffer,
      left: pos.col * size,
      top: pos.row * size,
    });
    
  } catch (e) {
    console.warn(`Failed validation for ${img.name}:`, e.message);
    continue; // Skip invalid
  }
}



    console.log(`✅ Using ${composite.length} fully validated images in ${dimensions} composite`);

    if (composite.length === 0) {
      return Response.json(
        { error: "No valid images after final validation" },
        { status: 500 }
      );
    }

    // Generate final image
    let finalImage;
    try {
      // Create the base canvas
      const canvas = sharp({
        create: {
          width,
          height,
          channels: 3,
          background: { r: 10, g: 10, b: 10 },
        }
      });

      // Apply composite operation
      finalImage = await canvas
        .composite(composite)
        .jpeg({ quality: 95 })
        .toBuffer();
        
    } catch (compositeErr) {
      console.error("Final composite failed:", compositeErr);
      console.error("Composite array length:", composite.length);
      console.error("Dimensions:", dimensions, "Total slots:", totalSlots);
      console.error("Canvas size:", width, "x", height);
      return Response.json({ error: "Failed to generate final image" }, { status: 500 });
    }

    // Convert to base64
    const base64 = finalImage.toString("base64");
    const dataUrl = `data:image/jpeg;base64,${base64}`;

    return Response.json({ 
      image: dataUrl,
      processedCount: composite.length,
      totalRequested: albums.length,
      dimensions: dimensions,
      gridSize: `${cols}x${rows}`,
      totalSlots: totalSlots
    });
    
  } catch (error) {
    console.error("Collage generation error:", error);
    return Response.json({ error: "Failed to generate collage" }, { status: 500 });
  }
}