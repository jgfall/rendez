import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Google Maps API key not configured' },
      { status: 500 }
    );
  }

  try {
    // Use Google Places API Text Search
    // Documentation: https://developers.google.com/maps/documentation/places/web-service/search-text
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`Google Places API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google Places API error:', data.status, data.error_message);
      return NextResponse.json(
        { error: data.error_message || 'Failed to search places' },
        { status: 500 }
      );
    }

    // Transform Google Places results to our PlaceResult format
    const results = (data.results || []).map((place: any) => {
      // Get photo reference if available - we'll use our proxy endpoint
      let photoUrl = null;
      if (place.photos && place.photos.length > 0) {
        const photoReference = place.photos[0].photo_reference;
        // Use our proxy endpoint to fetch the photo (handles CORS)
        photoUrl = `/api/places/photo?photo_reference=${photoReference}`;
      }

      return {
        name: place.name,
        address: place.formatted_address,
        lat: place.geometry?.location?.lat,
        lng: place.geometry?.location?.lng,
        placeId: place.place_id,
        types: place.types,
        photoUrl: photoUrl,
      };
    });

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error searching places:', error);
    return NextResponse.json(
      { error: 'Failed to search places' },
      { status: 500 }
    );
  }
}

