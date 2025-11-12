import { retry } from "./retryService.js";
import supabase from "../databaseConnections/Supabase/supabase_connection.js";

export async function uploadRequestersData(structuredData, requestId) {
  try {
    const dataToInsert = {
      request_id: requestId,
      user_type: structuredData.user_type,
      email: structuredData.email,
      created_at: new Date().toISOString(),
      status: "pending",
      department: structuredData.department || null,
      program: structuredData.program || null,
      role: structuredData.role || null,
      country: structuredData.country || null,
      city: structuredData.city || null,
      school: structuredData.school || null,
      full_name: structuredData.full_name || null,
      supervisor: structuredData.supervisor || null,
      contact_number: structuredData.contact_number || null,
      consent_to_contact: structuredData.consent_to_contact || null,
      preferred_contact_method: structuredData.preferred_contact_method || null
    };

    await retry(async () => {
      const { error } = await supabase.from("requesters_analytics").insert([dataToInsert]);
      if (error) throw new Error(error.message);
    });

    console.log("✅ Requester analytics stored in Supabase");
  } catch (err) {
    console.error("❌ Supabase analytics error:", err.message);
  }
}

export async function updateRequestStatus(requestId, status) {
  try {
    await retry(async () => {
      const { error } = await supabase
        .from("requesters_analytics")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("request_id", requestId);

      if (error) throw new Error(error.message);
    });

    console.log(`✅ Analytics status updated to '${status}' for ${requestId}`);
  } catch (err) {
    console.error("❌ Supabase analytics update error:", err.message);
  }
}
