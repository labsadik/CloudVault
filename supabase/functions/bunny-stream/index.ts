import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const BUNNY_STREAM_LIBRARY_ID = Deno.env.get('BUNNY_STREAM_LIBRARY_ID');
    const BUNNY_STREAM_API_KEY = Deno.env.get('BUNNY_STREAM_API_KEY');

    if (!BUNNY_STREAM_LIBRARY_ID || !BUNNY_STREAM_API_KEY) {
      throw new Error('Bunny.net stream credentials not configured');
    }

    const STREAM_BASE = `https://video.bunnycdn.com/library/${BUNNY_STREAM_LIBRARY_ID}`;
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    if (action === 'create-video') {
      // Step 1: Create a video placeholder in Bunny Stream
      const { title } = await req.json();
      const createRes = await fetch(`${STREAM_BASE}/videos`, {
        method: 'POST',
        headers: {
          'AccessKey': BUNNY_STREAM_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title }),
      });

      if (!createRes.ok) {
        const errorText = await createRes.text();
        throw new Error(`Create video failed [${createRes.status}]: ${errorText}`);
      }

      const videoData = await createRes.json();
      // Return the video GUID and the direct upload URL
      return new Response(JSON.stringify({
        success: true,
        videoId: videoData.guid,
        libraryId: BUNNY_STREAM_LIBRARY_ID,
        // Client will upload directly to Bunny using TUS or PUT
        uploadUrl: `${STREAM_BASE}/videos/${videoData.guid}`,
        apiKey: BUNNY_STREAM_API_KEY, // needed for client-side upload
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'upload-video') {
      // Upload video binary to Bunny Stream
      const videoId = url.searchParams.get('videoId');
      if (!videoId) throw new Error('Missing videoId');

      const body = await req.arrayBuffer();

      const uploadRes = await fetch(`${STREAM_BASE}/videos/${videoId}`, {
        method: 'PUT',
        headers: {
          'AccessKey': BUNNY_STREAM_API_KEY,
          'Content-Type': 'application/octet-stream',
        },
        body,
      });

      if (!uploadRes.ok) {
        const errorText = await uploadRes.text();
        throw new Error(`Upload video failed [${uploadRes.status}]: ${errorText}`);
      }

      return new Response(JSON.stringify({
        success: true,
        videoId,
        embedUrl: `https://iframe.mediadelivery.net/embed/${BUNNY_STREAM_LIBRARY_ID}/${videoId}`,
        directPlayUrl: `https://iframe.mediadelivery.net/play/${BUNNY_STREAM_LIBRARY_ID}/${videoId}`,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'delete-video') {
      const { videoId } = await req.json();
      if (!videoId) throw new Error('Missing videoId');

      const deleteRes = await fetch(`${STREAM_BASE}/videos/${videoId}`, {
        method: 'DELETE',
        headers: { 'AccessKey': BUNNY_STREAM_API_KEY },
      });

      if (!deleteRes.ok) {
        const errorText = await deleteRes.text();
        throw new Error(`Delete video failed [${deleteRes.status}]: ${errorText}`);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'get-video') {
      const videoId = url.searchParams.get('videoId');
      if (!videoId) throw new Error('Missing videoId');

      const getRes = await fetch(`${STREAM_BASE}/videos/${videoId}`, {
        method: 'GET',
        headers: { 'AccessKey': BUNNY_STREAM_API_KEY },
      });

      if (!getRes.ok) {
        const errorText = await getRes.text();
        throw new Error(`Get video failed [${getRes.status}]: ${errorText}`);
      }

      const data = await getRes.json();
      return new Response(JSON.stringify({
        ...data,
        embedUrl: `https://iframe.mediadelivery.net/embed/${BUNNY_STREAM_LIBRARY_ID}/${videoId}`,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'list-videos') {
      const page = url.searchParams.get('page') || '1';
      const listRes = await fetch(`${STREAM_BASE}/videos?page=${page}&itemsPerPage=50`, {
        method: 'GET',
        headers: { 'AccessKey': BUNNY_STREAM_API_KEY },
      });

      if (!listRes.ok) {
        const errorText = await listRes.text();
        throw new Error(`List videos failed [${listRes.status}]: ${errorText}`);
      }

      const data = await listRes.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Invalid action. Use ?action=create-video|upload-video|delete-video|get-video|list-videos');
  } catch (error: unknown) {
    console.error('Bunny stream error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
