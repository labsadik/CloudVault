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
    const BUNNY_STORAGE_ZONE = Deno.env.get('BUNNY_STORAGE_ZONE');
    const BUNNY_STORAGE_HOST = Deno.env.get('BUNNY_STORAGE_HOST');
    const BUNNY_STORAGE_PASSWORD = Deno.env.get('BUNNY_STORAGE_PASSWORD');

    if (!BUNNY_STORAGE_ZONE || !BUNNY_STORAGE_HOST || !BUNNY_STORAGE_PASSWORD) {
      throw new Error('Bunny.net storage credentials not configured');
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    if (action === 'upload') {
      const formData = await req.formData();
      const file = formData.get('file') as File;
      const path = formData.get('path') as string;

      if (!file || !path) {
        throw new Error('Missing file or path');
      }

      const arrayBuffer = await file.arrayBuffer();

      const uploadUrl = `https://${BUNNY_STORAGE_HOST}/${BUNNY_STORAGE_ZONE}/${path}`;
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'AccessKey': BUNNY_STORAGE_PASSWORD,
          'Content-Type': 'application/octet-stream',
        },
        body: arrayBuffer,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`Bunny upload failed [${uploadResponse.status}]: ${errorText}`);
      }

      const cdnUrl = `https://${BUNNY_STORAGE_ZONE}.b-cdn.net/${path}`;

      return new Response(JSON.stringify({
        success: true,
        url: cdnUrl,
        path,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'delete') {
      const { path } = await req.json();
      if (!path) throw new Error('Missing path');

      const deleteUrl = `https://${BUNNY_STORAGE_HOST}/${BUNNY_STORAGE_ZONE}/${path}`;
      const deleteResponse = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: { 'AccessKey': BUNNY_STORAGE_PASSWORD },
      });

      if (!deleteResponse.ok) {
        const errorText = await deleteResponse.text();
        throw new Error(`Bunny delete failed [${deleteResponse.status}]: ${errorText}`);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'list') {
      const path = url.searchParams.get('path') || '/';
      const listUrl = `https://${BUNNY_STORAGE_HOST}/${BUNNY_STORAGE_ZONE}/${path}`;
      const listResponse = await fetch(listUrl, {
        method: 'GET',
        headers: { 'AccessKey': BUNNY_STORAGE_PASSWORD, 'Accept': 'application/json' },
      });

      if (!listResponse.ok) {
        const errorText = await listResponse.text();
        throw new Error(`Bunny list failed [${listResponse.status}]: ${errorText}`);
      }

      const data = await listResponse.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Invalid action. Use ?action=upload|delete|list');
  } catch (error: unknown) {
    console.error('Bunny storage error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
