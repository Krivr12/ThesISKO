import supabase from "../databaseConnections/Supabase/supabase_connection.js";

/**
 * Upload requester's metadata for analytics (called when creating a request).
 */
export async function uploadRequestersData(requester, userType, requestId) {
  try {
    const dataToInsert = {
      request_id: requestId,
      user_type: userType,
      email: requester.email,
      created_at: new Date().toISOString(),
      status: "pending", // 🔹 default status when first created
      // student
      department: requester.department || null,
      program: requester.program || null,
      // guest
      country: requester.country || null,
      city: requester.city || null,
      school: requester.school || null,
    };

    const { error } = await supabase
      .from("requesters_analytics")
      .insert([dataToInsert]);

    if (error) {
      console.error("❌ Failed to insert analytics:", error.message);
    } else {
      console.log("✅ Requester analytics stored in Supabase");
    }
  } catch (err) {
    console.error("❌ Supabase analytics error:", err.message);
  }
}

/**
 * Update status of a request in analytics (approve/reject).
 */
export async function updateRequestStatus(requestId, status) {
  try {
    const { error } = await supabase
      .from("requesters_analytics")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("request_id", requestId);

    if (error) {
      console.error("❌ Failed to update analytics status:", error.message);
    } else {
      console.log(`✅ Analytics status updated to '${status}' for ${requestId}`);
    }
  } catch (err) {
    console.error("❌ Supabase analytics update error:", err.message);
  }
}
