import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOLFCOURSEAPI_KEY = Deno.env.get('GOLFCOURSEAPI_KEY');
const BASE_URL = 'https://api.golfcourseapi.com';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const query = url.searchParams.get('query');
    const courseId = url.searchParams.get('id');

    console.log(`Golf course lookup - Action: ${action}, Query: ${query}, ID: ${courseId}`);

    if (!GOLFCOURSEAPI_KEY) {
      console.error('GOLFCOURSEAPI_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let apiUrl: string;
    
    if (action === 'search' && query) {
      apiUrl = `${BASE_URL}/v1/search?search_query=${encodeURIComponent(query)}`;
    } else if (action === 'details' && courseId) {
      apiUrl = `${BASE_URL}/v1/courses/${courseId}`;
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Use action=search&query=... or action=details&id=...' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Calling GolfCourseAPI: ${apiUrl}`);

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Key ${GOLFCOURSEAPI_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`GolfCourseAPI error: ${response.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ error: `API error: ${response.status}`, details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log(`GolfCourseAPI response received successfully`);

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in golf-course-lookup:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
