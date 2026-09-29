"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase-server";
import { requireAdmin } from "@/lib/admin";

// Mark one entry paid or unpaid.
//
// A server action is a public web address that anyone can send a request to,
// not just a function your page happens to call. So it checks for an admin
// itself, and then admin_set_paid() checks again inside the database.
export async function setPaid(formData: FormData) {
  const entryId = String(formData.get("entryId") ?? "");
  const paid = formData.get("paid") === "true";

  const supabase = await createClient();
  await requireAdmin(supabase);

  const { error } = await supabase.rpc("admin_set_paid", {
    p_entry_id: entryId,
    p_paid: paid,
  });
  if (error) throw new Error(error.message);

  // Re-draw the admin page so it shows the new state.
  revalidatePath("/admin");
}
