// src/app/api/lastfm/route.js
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const user = searchParams.get('user');
  const limit = searchParams.get('limit') || '50';
  
  if (!user) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://ws.audioscrobbler.com/2.0/?method=user.gettopalbums&user=${encodeURIComponent(user)}&api_key=${process.env.LASTFM_API_KEY}&format=json&limit=${limit}&period=overall`,
      {
        headers: {
          'User-Agent': 'VisualFM/1.0'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Last.fm API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.error) {
      return NextResponse.json({ error: data.message }, { status: 400 });
    }

    if (!data.topalbums || !data.topalbums.album) {
      return NextResponse.json({ error: 'No albums found for this user' }, { status: 404 });
    }

    const albums = data.topalbums.album.map(album => {
      let coverUrl = null;
      
      if (album.image && Array.isArray(album.image)) {
        // ✅ Use largest available image first
        coverUrl =
          album.image.find(img => img.size === 'extralarge')?.['#text'] ||
          album.image.find(img => img.size === 'mega')?.['#text'] ||
          album.image.find(img => img.size === 'large')?.['#text'] ||
          album.image.find(img => img.size === 'medium')?.['#text'] ||
          album.image.find(img => img.size === 'small')?.['#text'] ||
          null;

        // Filter out known placeholder
        if (coverUrl?.includes('2a96cbd8b46e442fc41c2b86b821562f')) {
          coverUrl = null;
        }
      }

      return {
        name: album.name || 'Unknown Album',
        artist: album.artist?.name || album.artist || 'Unknown Artist',
        coverUrl,
        playcount: parseInt(album.playcount) || 0
      };
    });

    // Filter out invalid albums
    const validAlbums = albums.filter(album => 
      album.name && album.name !== 'Unknown Album' && 
      album.artist && album.artist !== 'Unknown Artist'
    );

    const requestedCount = parseInt(limit, 10);
    const result = validAlbums.slice(0, requestedCount);

    return NextResponse.json({ 
      albums: result,
      total: result.length 
    });
    
  } catch (error) {
    console.error('Last.fm API Error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch data from Last.fm. Please check the username and try again.' 
    }, { status: 500 });
  }
}