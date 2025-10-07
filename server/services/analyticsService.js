import { retry } from "./retryService.js";
import supabase from "../databaseConnections/Supabase/supabase_connection.js";

export async function uploadRequestersData(requester, userType, requestId) {
  try {
    const dataToInsert = {
      request_id: requestId,
      user_type: userType,
      email: requester.email,
      created_at: new Date().toISOString(),
      status: "pending",
      department: requester.department || null,
      program: requester.program || null,
      country: requester.country || null,
      city: requester.city || null,
      school: requester.school || null,
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
