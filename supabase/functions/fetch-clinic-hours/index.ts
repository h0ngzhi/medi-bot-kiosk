import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PlaceResult {
  name: string;
  formatted_address?: string;
  formatted_phone_number?: string;
  international_phone_number?: string;
  opening_hours?: {
    weekday_text?: string[];
    open_now?: boolean;
  };
  business_status?: string;
  permanently_closed?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clinicName, address, phone } = await req.json();
    const apiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");

    if (!apiKey) {
      throw new Error("Google Places API key not configured");
    }

    // Search for the clinic using name and address
    const searchQuery = encodeURIComponent(`${clinicName} ${address} Singapore`);
    const searchUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${searchQuery}&inputtype=textquery&fields=place_id,name,business_status&key=${apiKey}`;

    console.log(`Searching for: ${clinicName}`);
    
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();

    if (searchData.status !== "OK" || !searchData.candidates?.length) {
      console.log(`No results found for: ${clinicName}`);
      return new Response(
        JSON.stringify({ 
          found: false, 
          status: "not_found",
          message: "Clinic not found on Google" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const placeId = searchData.candidates[0].place_id;
    const businessStatus = searchData.candidates[0].business_status;

    // Check if permanently closed
    if (businessStatus === "CLOSED_PERMANENTLY") {
      console.log(`Clinic closed permanently: ${clinicName}`);
      return new Response(
        JSON.stringify({ 
          found: true, 
          status: "closed",
          message: "This clinic has permanently closed" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get detailed place information
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_phone_number,international_phone_number,opening_hours,business_status,formatted_address&key=${apiKey}`;
    
    const detailsResponse = await fetch(detailsUrl);
    const detailsData = await detailsResponse.json();

    if (detailsData.status !== "OK") {
      return new Response(
        JSON.stringify({ 
          found: false, 
          status: "error",
          message: "Failed to fetch clinic details" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const place: PlaceResult = detailsData.result;
    
    // Format opening hours
    let formattedHours = "";
    if (place.opening_hours?.weekday_text) {
      formattedHours = place.opening_hours.weekday_text.join(" | ");
    }

    console.log(`Found clinic: ${place.name}, Hours: ${formattedHours ? 'Yes' : 'No'}`);

    return new Response(
      JSON.stringify({
        found: true,
        status: "open",
        data: {
          name: place.name,
          phone: place.formatted_phone_number || place.international_phone_number,
          hours: formattedHours,
          address: place.formatted_address,
          isOpenNow: place.opening_hours?.open_now
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error fetching clinic hours:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ 
        found: false, 
        status: "error",
        message: errorMessage 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
