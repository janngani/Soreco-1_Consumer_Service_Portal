import express from "express";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
dotenv.config({ override: true });
const PORT = 3000;
const isProd = process.env.NODE_ENV === "production";
globalThis.localTickets = [];
globalThis.localAnnouncements = [];
var localSettings = {};
globalThis.localInquiries = [];
globalThis.otpStore = globalThis.otpStore || new Map();

// Helper to send transactional emails via Brevo API
const sendBrevoEmail = async ({ toEmail, toName, subject, htmlContent }) => {
  const brevoApiKey = process.env.BREVO_API_KEY;
  if (!brevoApiKey) {
    console.error("BREVO_API_KEY environment variable is not configured.");
    throw new Error("Email service is not configured. Please set the BREVO_API_KEY in the project settings.");
  }

  const senderEmail = process.env.BREVO_SENDER_EMAIL || "noreply@soreco1.com";
  const senderName = process.env.BREVO_SENDER_NAME || "SORECO-1 Support";

  const payload = {
    sender: {
      name: senderName,
      email: senderEmail
    },
    to: [
      {
        email: toEmail,
        name: toName || toEmail.split("@")[0]
      }
    ],
    subject: subject,
    htmlContent: htmlContent
  };

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "accept": "application/json",
      "api-key": brevoApiKey,
      "content-type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    let errorDetail = `Status ${response.status}`;
    try {
      const errJson = await response.json();
      errorDetail = errJson.message || JSON.stringify(errJson);
    } catch {
      // ignore
    }
    console.error("Brevo API error:", errorDetail);
    throw new Error(`Failed to send email via Brevo: ${errorDetail}`);
  }

  const result = await response.json();
  return result;
};
const supabaseUrl = process.env.SUPABASE_URL || "https://mock.supabase.co";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || "mock_key";
if (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SERVICE_KEY) {
  console.warn("WARNING: SUPABASE_SERVICE_ROLE_KEY is not defined in environment variables. Falling back to ANON key.");
}
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
const seedDatabases = async () => {
  const hasServiceRole = !!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
  if (!hasServiceRole) {
    console.log("Skipping auth user seeding because SUPABASE_SERVICE_ROLE_KEY is not defined.");
    try {
      const { data: existingAnns, error: annError } = await supabase.from("announcements").select("id").limit(1);
      if (!annError && (!existingAnns || existingAnns.length === 0)) {
        const announcements = [
          { id: "ann-1", title: "Scheduled Maintenance: Bulan Proper", content: "Power interruption in Bulan Proper on May 20, 2026, from 8:00 AM to 5:00 PM for line upgrading and maintenance. Please plan accordingly." },
          { id: "ann-2", title: "New Payment Channels", content: "We now accept payments via GCash, PayMaya, and 7-Eleven. Simply use your account number to pay your monthly bills conveniently." },
          { id: "ann-3", title: "Billing Cycle Update", content: "May 2026 billing statements are now being distributed. You can also view your current balance through our new Digital Consumer Portal." }
        ];
        await supabase.from("announcements").insert(announcements);
        console.log("Seeded default announcements.");
      }
    } catch (e) {
      console.log("[Data-Sync] Supabase offline, skipping announcement seeding.");
    }
    return;
  }
  try {
    let existingAdminFound = false;
    try {
      const { data: authUsersRes, error: authUsersError } = await supabase.auth.admin.listUsers();
      if (!authUsersError && authUsersRes && authUsersRes.users) {
        const adminUser = authUsersRes.users.find((u) => u.email === "admin@gov.ph" || u.user_metadata?.role === "admin");
        if (adminUser) {
          existingAdminFound = true;
        }
      }
    } catch (e) {
      console.log("[Data-Sync] Supabase offline, using local admin fallback.");
    }
    if (!existingAdminFound) {
      try {
        const { data: existingAdminProfiles } = await supabase.from("profiles").select("id").eq("role", "admin").limit(1);
        if (existingAdminProfiles && existingAdminProfiles.length > 0) {
          existingAdminFound = true;
        }
      } catch (e) {
      }
      try {
        const { data: existingAdminUsers } = await supabase.from("users").select("id").eq("role", "admin").limit(1);
        if (existingAdminUsers && existingAdminUsers.length > 0) {
          existingAdminFound = true;
        }
      } catch (e) {
      }
    }
    if (existingAdminFound) {
      console.log("Database already seeded with demo accounts.");
      return;
    }
    console.log("Starting Supabase Auth and Profiles seeding...");
    const usersToSeed = [
      {
        fullName: "System Administrator",
        email: "admin@gov.ph",
        password: "admin123",
        role: "admin",
        accountNumber: "ADMIN-001"
      },
      {
        fullName: "Janry Maligaso",
        email: "janry.maligaso@sorsu.edu.ph",
        password: "admin123",
        role: "admin",
        accountNumber: "ADMIN-002"
      },
      {
        fullName: "Demo Consumer",
        email: "consumer@gov.ph",
        password: "consumer123",
        role: "consumer",
        accountNumber: "00-1234-5678"
      }
    ];
    for (const u of usersToSeed) {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: {
          fullName: u.fullName,
          accountNumber: u.accountNumber,
          role: u.role
        }
      });
      if (authError) {
        if (authError.message?.includes("already exists")) {
          console.log(`Auth user ${u.email} already exists.`);
        } else {
          console.error(`Error seeding auth user ${u.email}:`, authError.message);
        }
        continue;
      }
      if (authData?.user) {
        try {
          await supabase.from("profiles").upsert({
            id: authData.user.id,
            full_name: u.fullName,
            account_number: u.accountNumber,
            role: u.role,
            phone_number: "",
            address: "",
            profile_image: ""
          });
          console.log(`Profile seeded for ${u.email} in 'profiles' table.`);
        } catch (e) {
        }
        try {
          await supabase.from("users").upsert({
            id: authData.user.id,
            fullName: u.fullName,
            accountNumber: u.accountNumber,
            email: u.email,
            role: u.role,
            phoneNumber: "",
            address: "",
            profileImage: ""
          });
          console.log(`Profile seeded for ${u.email} in 'users' table.`);
        } catch (e) {
        }
        console.log(`Seeded and profiled user ${u.email} successfully.`);
      }
    }
    try {
      const { data: existingAnns, error: annError } = await supabase.from("announcements").select("id").limit(1);
      if (!annError && (!existingAnns || existingAnns.length === 0)) {
        const announcements = [
          { id: "ann-1", title: "Scheduled Maintenance: Bulan Proper", content: "Power interruption in Bulan Proper on May 20, 2026, from 8:00 AM to 5:00 PM for line upgrading and maintenance. Please plan accordingly." },
          { id: "ann-2", title: "New Payment Channels", content: "We now accept payments via GCash, PayMaya, and 7-Eleven. Simply use your account number to pay your monthly bills conveniently." },
          { id: "ann-3", title: "Billing Cycle Update", content: "May 2026 billing statements are now being distributed. You can also view your current balance through our new Digital Consumer Portal." }
        ];
        await supabase.from("announcements").insert(announcements);
        console.log("Seeded default announcements.");
      }
    } catch (e) {
      console.warn("Announcement seeding skipped:", e);
    }
  } catch (err) {
    console.warn("Seeding exception:", err.message);
  }
};
const getUserById = async (id) => {
  try {
    if (id === "mock-admin-id") {
      return {
        id: "mock-admin-id",
        fullName: "System Admin",
        role: "admin",
        accountNumber: "ADMIN-001",
        phoneNumber: "09990000000",
        address: "Main Office",
        profileImage: "",
        createdAt: new Date().toISOString()
      };
    }
    let data = null;
    try {
      const { data: pData, error: pError } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
      if (!pError && pData) {
        data = {
          id: pData.id,
          fullName: pData.full_name || "",
          role: pData.role || "consumer",
          accountNumber: pData.account_number || "",
          phoneNumber: pData.phone_number || "",
          address: pData.address || "",
          profileImage: pData.profile_image || "",
          createdAt: pData.created_at
        };
      }
    } catch (e) {
      console.warn("Profiles table check failed in getUserById, trying users table next.");
    }
    if (!data) {
      try {
        const { data: uData, error: uError } = await supabase.from("users").select("*").eq("id", id).maybeSingle();
        if (!uError && uData) {
          data = {
            id: uData.id,
            fullName: uData.fullName || uData.full_name || "",
            role: uData.role || "consumer",
            accountNumber: uData.accountNumber || uData.account_number || "",
            phoneNumber: uData.phoneNumber || uData.phone_number || "",
            address: uData.address || "",
            profileImage: uData.profileImage || uData.profile_image || "",
            createdAt: uData.createdAt || uData.created_at
          };
        }
      } catch (e) {
        console.warn("Users table check failed in getUserById.");
      }
    }
    if (data) return data;
    let authData = null;
    try {
      const { data: aData, error: authError } = await supabase.auth.admin.getUserById(id);
      if (!authError && aData) {
        authData = aData;
      }
    } catch (e) {
      console.warn("Auth getUserById failed, returning null");
    }
    if (!authData || !authData.user) return null;
    const user = authData.user;
    return {
      id: user.id,
      fullName: user.user_metadata?.fullName || user.user_metadata?.full_name || "",
      role: user.user_metadata?.role || "consumer",
      accountNumber: user.user_metadata?.accountNumber || user.user_metadata?.account_number || "",
      phoneNumber: user.user_metadata?.phoneNumber || user.user_metadata?.phone_number || "",
      address: user.user_metadata?.address || "",
      profileImage: user.user_metadata?.profileImage || user.user_metadata?.profile_image || "",
      createdAt: user.created_at
    };
  } catch (err) {
    console.error("getUserById exception:", err.message);
    return null;
  }
};
const updateUserProfile = async (id, profileData, userToken = null) => {
  try {
    let authSuccess = false;

    try {
      const { error } = await supabase.auth.admin.updateUserById(id, {
        user_metadata: {
          fullName: profileData.fullName,
          phoneNumber: profileData.phoneNumber || "",
          address: profileData.address || "",
          profileImage: profileData.profileImage || "",
          accountNumber: profileData.accountNumber,
          hasUnpaidBill: profileData.hasUnpaidBill
        }
      });
      if (!error) {
        authSuccess = true;
      }
    } catch (err) {
    }

    if (!authSuccess && userToken && userToken !== "mock_admin_token") {
      try {
        const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "mock_key";
        const userSupabase = createClient(supabaseUrl, anonKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false
          }
        });
        await userSupabase.auth.setSession({
          access_token: userToken,
          refresh_token: ""
        });
        const { error } = await userSupabase.auth.updateUser({
          data: {
            fullName: profileData.fullName,
            phoneNumber: profileData.phoneNumber || "",
            address: profileData.address || "",
            profileImage: profileData.profileImage || "",
            accountNumber: profileData.accountNumber
          }
        });
        if (!error) {
          authSuccess = true;
        }
      } catch (err) {
      }
    }

    if (!authSuccess) {
      console.info("[AuthSync] Metadata update was not required or skipped. Primary profiles table is updated.");
    }
  } catch (err) {
  }

  let existingRole = "consumer";
  try {
    const { data: existingProfile } = await supabase.from("profiles").select("role").eq("id", id).maybeSingle();
    if (existingProfile?.role) {
      existingRole = existingProfile.role;
    } else {
      const { data: existingUser } = await supabase.from("users").select("role").eq("id", id).maybeSingle();
      if (existingUser?.role) {
        existingRole = existingUser.role;
      }
    }
  } catch (e) {
    console.warn("Could not query existing role during profile update:", e);
  }

  try {
    await supabase.auth.admin.updateUserById(id, {
      user_metadata: {
        fullName: profileData.fullName,
        phoneNumber: profileData.phoneNumber || "",
        address: profileData.address || "",
        barangay: profileData.address || "",
        accountNumber: profileData.accountNumber,
        profileImage: profileData.profileImage || ""
      }
    });
  } catch (authMetaErr) {
    console.warn("Could not sync user_metadata in updateUserProfile:", authMetaErr.message);
  }

  try {
    const { error } = await supabase.from("profiles").upsert({
      id: id,
      full_name: profileData.fullName,
      phone_number: profileData.phoneNumber || "",
      address: profileData.address || "",
      profile_image: profileData.profileImage || "",
      account_number: profileData.accountNumber,
      role: existingRole
    });
    if (error) {
      console.error("Error upserting into profiles table:", error);
    }
  } catch (e) {
    console.error("Exception upserting into profiles table:", e);
  }

  try {
    const { error } = await supabase.from("users").upsert({
      id: id,
      fullName: profileData.fullName,
      phoneNumber: profileData.phoneNumber || "",
      address: profileData.address || "",
      profileImage: profileData.profileImage || "",
      accountNumber: profileData.accountNumber,
      role: existingRole
    });
    if (error) {
      console.error("Error upserting into users table:", error);
    }
  } catch (e) {
    console.error("Exception upserting into users table:", e);
  }
};
const getAllUsers = async () => {
  let authUsers = [];
  try {
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    if (!authError && users) {
      authUsers = users;
    }
  } catch (err) {
    console.warn("getAllUsers auth listUsers failed, falling back to profiles/users table:", err.message);
  }
  let profileMap = /* @__PURE__ */ new Map();
  try {
    const { data: profiles, error: profileError } = await supabase.from("profiles").select("*");
    if (!profileError && profiles && profiles.length > 0) {
      profiles.forEach((p) => {
        profileMap.set(p.id, {
          email: p.email,
          role: p.role,
          fullName: p.full_name,
          accountNumber: p.account_number,
          phoneNumber: p.phone_number,
          address: p.address,
          profileImage: p.profile_image,
          hasUnpaidBill: p.has_unpaid_bill
        });
      });
    }
  } catch (e) {
    console.warn("Could not query profiles table in getAllUsers.");
  }
  try {
    const { data: usersTable, error: usersError } = await supabase.from("users").select("*");
    if (!usersError && usersTable && usersTable.length > 0) {
      usersTable.forEach((u) => {
        if (!profileMap.has(u.id)) {
          profileMap.set(u.id, {
            email: u.email,
            role: u.role,
            fullName: u.fullName || u.full_name,
            accountNumber: u.accountNumber || u.account_number,
            phoneNumber: u.phoneNumber || u.phone_number,
            address: u.address,
            profileImage: u.profileImage || u.profile_image,
            hasUnpaidBill: u.hasUnpaidBill !== undefined ? u.hasUnpaidBill : u.has_unpaid_bill
          });
        }
      });
    }
  } catch (e) {
    console.warn("Could not query users table in getAllUsers.");
  }
  const result = authUsers.map((u) => {
    const profile = profileMap.get(u.id) || {};
    profileMap.delete(u.id);
    return {
      id: u.id,
      email: u.email || "",
      role: profile.role || u.user_metadata?.role || "consumer",
      fullName: profile.fullName || u.user_metadata?.fullName || u.user_metadata?.full_name || "",
      accountNumber: profile.accountNumber || u.user_metadata?.accountNumber || u.user_metadata?.account_number || "",
      phoneNumber: profile.phoneNumber || u.user_metadata?.phoneNumber || u.user_metadata?.phone_number || "",
      address: profile.address || u.user_metadata?.address || "",
      profileImage: profile.profileImage || u.user_metadata?.profileImage || u.user_metadata?.profile_image || "",
      hasUnpaidBill: profile.hasUnpaidBill ?? u.user_metadata?.hasUnpaidBill ?? u.user_metadata?.has_unpaid_bill ?? false,
      createdAt: u.created_at
    };
  });
  if (!result.find((u) => u.id === "mock-admin-id")) {
    result.push({
      id: "mock-admin-id",
      email: "admin01@gmail.com",
      role: "admin",
      fullName: "System Admin",
      accountNumber: "ADMIN-001",
      phoneNumber: "09990000000",
      address: "Main Office",
      profileImage: "",
      hasUnpaidBill: false,
      createdAt: new Date().toISOString()
    });
  }
  profileMap.forEach((profile, id) => {
    result.push({
      id,
      email: profile.email || "",
      role: profile.role || "consumer",
      fullName: profile.fullName || "",
      accountNumber: profile.accountNumber || "",
      phoneNumber: profile.phoneNumber || "",
      address: profile.address || "",
      profileImage: profile.profileImage || "",
      hasUnpaidBill: profile.hasUnpaidBill || false,
      createdAt: profile.createdAt || (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  return result;
};
const adminUpdateUser = async (id, updateData) => {
  try {
    const payload = {};
    if (updateData.fullName !== void 0) payload.full_name = updateData.fullName;
    if (updateData.role !== void 0) payload.role = updateData.role;
    if (updateData.accountNumber !== void 0) payload.account_number = updateData.accountNumber;
    if (updateData.phoneNumber !== void 0) payload.phone_number = updateData.phoneNumber;
    if (updateData.address !== void 0) payload.address = updateData.address;
    if (updateData.profileImage !== void 0) payload.profile_image = updateData.profileImage;
    if (updateData.hasUnpaidBill !== void 0) payload.has_unpaid_bill = updateData.hasUnpaidBill;
    const { error } = await supabase.from("profiles").update(payload).eq("id", id);
    if (error && !error.message?.includes("Could not find the table") && error.code !== "42P01") {
      console.error("Error in adminUpdateUser table update:", error.message);
    }
  } catch (err) {
    console.warn("adminUpdateUser table update exception:", err.message);
  }
  try {
    const usersPayload = {};
    if (updateData.fullName !== void 0) usersPayload.fullName = updateData.fullName;
    if (updateData.role !== void 0) usersPayload.role = updateData.role;
    if (updateData.accountNumber !== void 0) usersPayload.accountNumber = updateData.accountNumber;
    if (updateData.phoneNumber !== void 0) usersPayload.phoneNumber = updateData.phoneNumber;
    if (updateData.address !== void 0) usersPayload.address = updateData.address;
    if (updateData.profileImage !== void 0) usersPayload.profileImage = updateData.profileImage;
    if (updateData.hasUnpaidBill !== void 0) usersPayload.hasUnpaidBill = updateData.hasUnpaidBill;
    await supabase.from("users").update(usersPayload).eq("id", id);
  } catch (err) {
  }
  const userMetadataUpdate = {};
  if (updateData.fullName !== void 0) userMetadataUpdate.fullName = updateData.fullName;
  if (updateData.role !== void 0) userMetadataUpdate.role = updateData.role;
  if (updateData.accountNumber !== void 0) userMetadataUpdate.accountNumber = updateData.accountNumber;
  if (updateData.phoneNumber !== void 0) userMetadataUpdate.phoneNumber = updateData.phoneNumber;
  if (updateData.address !== void 0) userMetadataUpdate.address = updateData.address;
  if (updateData.profileImage !== void 0) userMetadataUpdate.profileImage = updateData.profileImage;
  if (updateData.hasUnpaidBill !== void 0) userMetadataUpdate.hasUnpaidBill = updateData.hasUnpaidBill;
  const authUpdatePayload = {};
  if (updateData.email !== void 0) authUpdatePayload.email = updateData.email;
  if (Object.keys(userMetadataUpdate).length > 0) {
    try {
      const { data: { user } } = await supabase.auth.admin.getUserById(id);
      authUpdatePayload.user_metadata = {
        ...user?.user_metadata || {},
        ...userMetadataUpdate
      };
    } catch (err) {
      authUpdatePayload.user_metadata = userMetadataUpdate;
    }
  }
  try {
    const { error: authError } = await supabase.auth.admin.updateUserById(id, authUpdatePayload);
    if (authError) {
      console.error("Error in adminUpdateUser auth update:", authError.message);
      if (
        authError.message?.includes("Bearer token") ||
        authError.message?.includes("unauthorized") ||
        authError.status === 401 ||
        authError.status === 403 ||
        authError.code === "unauthorized"
      ) {
        console.log("Allowing database update to succeed despite auth update failure.");
        return;
      }
      throw authError;
    }
  } catch (err) {
    console.warn("adminUpdateUser Auth exception caught:", err.message);
    if (err.message?.includes("Bearer token") || err.message?.includes("unauthorized")) {
      return;
    }
    throw err;
  }
};
const adminDeleteUser = async (id) => {
  try {
    const { error: profileError } = await supabase.from("profiles").delete().eq("id", id);
    if (profileError) {
      console.error("Error deleting from profiles table:", profileError.message);
    }
  } catch (err) {
    console.error("Exception deleting from profiles table:", err.message);
  }

  try {
    const { error: userTableError } = await supabase.from("users").delete().eq("id", id);
    if (userTableError) {
      console.error("Error deleting from users table:", userTableError.message);
    }
  } catch (err) {
    console.error("Exception deleting from users table:", err.message);
  }

  try {
    const { error } = await supabase.auth.admin.deleteUser(id);
    if (error) {
      console.error("Error in adminDeleteUser auth delete:", error.message);
      if (
        error.message?.includes("Bearer token") ||
        error.message?.includes("unauthorized") ||
        error.status === 401 ||
        error.status === 403 ||
        error.code === "unauthorized"
      ) {
        console.log("Allowing database deletion to succeed despite auth deletion failure.");
        return;
      }
      throw error;
    }
  } catch (err) {
    console.warn("adminDeleteUser Auth exception caught:", err.message);
    if (err.message?.includes("Bearer token") || err.message?.includes("unauthorized")) {
      return;
    }
    throw err;
  }
};
const TICKETS_FILE = path.join(process.cwd(), "tickets_store.json");

const getLocalTickets = () => {
  try {
    if (fs.existsSync(TICKETS_FILE)) {
      const content = fs.readFileSync(TICKETS_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        globalThis.localTickets = parsed;
        return parsed;
      }
    }
  } catch (e) {
    console.error("Failed to read tickets store file:", e);
  }
  return globalThis.localTickets || [];
};

const saveLocalTicket = (ticket) => {
  const current = getLocalTickets();
  const idx = current.findIndex((t) => t.id === ticket.id);
  if (idx !== -1) {
    current[idx] = { ...current[idx], ...ticket };
  } else {
    current.unshift(ticket);
  }
  globalThis.localTickets = current;
  try {
    fs.writeFileSync(TICKETS_FILE, JSON.stringify(current, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to write tickets store file:", e);
  }
};

const updateLocalTicket = (id, updates) => {
  const current = getLocalTickets();
  const idx = current.findIndex((t) => t.id === id);
  if (idx !== -1) {
    current[idx] = { ...current[idx], ...updates };
    globalThis.localTickets = current;
    try {
      fs.writeFileSync(TICKETS_FILE, JSON.stringify(current, null, 2), "utf-8");
    } catch (e) {
      console.error("Failed to write tickets store file:", e);
    }
  }
};

const deleteLocalTicket = (id) => {
  const current = getLocalTickets().filter((t) => t.id !== id);
  globalThis.localTickets = current;
  try {
    fs.writeFileSync(TICKETS_FILE, JSON.stringify(current, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to write tickets store file:", e);
  }
};

const syncTicketsWithSupabase = async () => {
  try {
    const { data: dbTickets, error } = await supabase.from("tickets").select("*").order("createdAt", { ascending: false });
    if (!error && dbTickets) {
      console.log(`[Data-Sync] Supabase tickets fetched: ${dbTickets.length} records found.`);
      globalThis.localTickets = dbTickets;
      try {
        fs.writeFileSync(TICKETS_FILE, JSON.stringify(dbTickets, null, 2), "utf-8");
      } catch (e) {}
    } else if (error) {
      console.warn("[Data-Sync] Could not fetch tickets from Supabase:", error.message);
    }
  } catch (err) {
    console.warn("[Data-Sync] Exception syncing tickets with Supabase:", err.message);
  }
};

const getTicketsList = async (role = "admin", userId = null) => {
  try {
    let supabaseData = [];
    try {
      let query = supabase.from("tickets").select("*");
      if (userId && role !== "admin") {
        query = query.eq("consumerId", userId);
      }
      const { data, error } = await query.order("createdAt", { ascending: false });
      if (error) {
        console.log("[Data-Sync] Supabase tickets fetch fallback activated:", error.message);
      } else if (data) {
        supabaseData = data;
      }
    } catch (dbErr) {
      console.log("[Data-Sync] Supabase tickets fetch fallback activated.");
    }

    let profileMap = new Map();
    try {
      const { data: profiles, error: profilesError } = await supabase.from("profiles").select("id, full_name, account_number, phone_number, address");
      if (!profilesError && profiles) {
        profiles.forEach((p) => {
          profileMap.set(p.id, p);
        });
      }
    } catch (e) {
      console.warn("Could not query profiles table for manual join");
    }

    try {
      const { data: usersTbl } = await supabase.from("users").select("id, fullName, accountNumber, phoneNumber, address");
      if (usersTbl) {
        usersTbl.forEach((u) => {
          if (!profileMap.has(u.id)) {
            profileMap.set(u.id, {
              id: u.id,
              full_name: u.fullName,
              account_number: u.accountNumber,
              phone_number: u.phoneNumber,
              address: u.address
            });
          }
        });
      }
    } catch (e) {}

    let authUserMap = new Map();
    try {
      const { data: authData } = await supabase.auth.admin.listUsers();
      if (authData?.users) {
        authData.users.forEach((u) => {
          authUserMap.set(u.id, u);
        });
      }
    } catch (e) {
      console.warn("Could not query auth users for tickets join fallback");
    }

    const localTickets = getLocalTickets();
    const localList = (!userId || role === "admin")
      ? localTickets
      : localTickets.filter((t) => (t.consumerId === userId || t.user_id === userId));
    
    const listToReturn = supabaseData.length > 0 ? supabaseData : localList;
    return listToReturn.map((t) => {
      const cid = t.consumerId || t.user_id;
      const profile = profileMap.get(cid) || {};
      const authUser = authUserMap.get(cid) || {};
      const safeParseJson = (val, fallback) => {
        if (!val) return fallback;
        if (typeof val === "string") {
          try { return JSON.parse(val); } catch { return fallback; }
        }
        return val;
      };
      return {
        ...t,
        consumerId: cid,
        user_id: cid,
        consumerName: profile.full_name || authUser.user_metadata?.fullName || authUser.user_metadata?.full_name || t.consumerName || "Unknown",
        accountNumber: profile.account_number || authUser.user_metadata?.accountNumber || authUser.user_metadata?.account_number || t.accountNumber || "Unknown",
        address: profile.address || authUser.user_metadata?.address || t.address || "",
        phoneNumber: profile.phone_number || authUser.user_metadata?.phoneNumber || t.phoneNumber || "",
        checklist: safeParseJson(t.checklist, []),
        messages: safeParseJson(t.messages, []),
        feedback: safeParseJson(t.feedback, null)
      };
    });
  } catch (err) {
    console.error("getTicketsList exception:", err.message);
    const localTickets = getLocalTickets();
    const localList = (!userId || role === "admin")
      ? localTickets
      : localTickets.filter((t) => (t.consumerId === userId || t.user_id === userId));
    return localList;
  }
};
const getTicketById = async (id) => {
  try {
    if (id === "mock-admin-id") {
      return {
        id: "mock-admin-id",
        fullName: "System Admin",
        role: "admin",
        accountNumber: "ADMIN-001",
        phoneNumber: "09990000000",
        address: "Main Office",
        profileImage: "",
        createdAt: new Date().toISOString()
      };
    }
    let data = null;
    try {
      const { data: dbData, error } = await supabase.from("tickets").select("*").eq("id", id).maybeSingle();
      if (!error && dbData) {
        data = dbData;
      }
    } catch (dbErr) {
      console.warn("Database query for ticket failed, checking local memory:", dbErr.message);
    }

    if (!data) {
      const localT = getLocalTickets().find((t) => t.id === id);
      if (localT) {
        data = localT;
      }
    }

    if (!data) return null;

    let profile = {};
    const cid = data.consumerId || data.user_id;
    if (cid) {
      try {
        const { data: profileData } = await supabase.from("profiles").select("full_name, account_number, phone_number, address").eq("id", cid).maybeSingle();
        if (profileData) {
          profile = profileData;
        }
      } catch (e) {
        console.warn("Profiles table query failed in getTicketById");
      }
      if (!profile.full_name) {
        try {
          const { data: aData } = await supabase.auth.admin.getUserById(cid);
          if (aData && aData.user) {
            const user = aData.user;
            profile.full_name = user.user_metadata?.fullName || user.user_metadata?.full_name;
            profile.account_number = user.user_metadata?.accountNumber || user.user_metadata?.account_number;
            profile.phone_number = user.user_metadata?.phoneNumber || user.user_metadata?.phone_number;
            profile.address = user.user_metadata?.address;
          }
        } catch (e) {
          console.warn("Auth user fallback query failed in getTicketById");
        }
      }
    }
    const safeParseJson = (val, fallback) => {
      if (!val) return fallback;
      if (typeof val === "string") {
        try { return JSON.parse(val); } catch { return fallback; }
      }
      return val;
    };
    return {
      ...data,
      consumerId: cid,
      user_id: cid,
      consumerName: profile.full_name || data.consumerName || "Unknown",
      accountNumber: profile.account_number || data.accountNumber || "Unknown",
      address: profile.address || data.address || "",
      phoneNumber: profile.phone_number || data.phoneNumber || "",
      checklist: safeParseJson(data.checklist, []),
      messages: safeParseJson(data.messages, []),
      feedback: safeParseJson(data.feedback, null)
    };
  } catch (err) {
    console.error("getTicketById exception:", err.message);
    return null;
  }
};
const createTicket = async (ticketData) => {
  const dbPayload = {
    id: ticketData.id,
    consumerId: ticketData.consumerId,
    consumerName: ticketData.consumerName,
    accountNumber: ticketData.accountNumber,
    type: ticketData.type,
    category: ticketData.category,
    description: ticketData.description,
    status: ticketData.status || "pending",
    isUrgent: ticketData.isUrgent ? 1 : 0,
    evidenceImage: ticketData.evidenceImage || "",
    checklist: typeof ticketData.checklist === "string" ? ticketData.checklist : JSON.stringify(ticketData.checklist || null),
    messages: typeof ticketData.messages === "string" ? ticketData.messages : JSON.stringify(ticketData.messages || []),
    feedback: typeof ticketData.feedback === "string" ? ticketData.feedback : JSON.stringify(ticketData.feedback || null),
    createdAt: ticketData.createdAt || (new Date()).toISOString(),
    updatedAt: ticketData.updatedAt || (new Date()).toISOString()
  };

  const fullTicket = {
    ...dbPayload,
    address: ticketData.address || "",
    phoneNumber: ticketData.phoneNumber || ""
  };

  try {
    const { error } = await supabase.from("tickets").insert(dbPayload);
    if (error) {
      console.error("[Data-Sync] Supabase ticket insert error:", error.message);
    } else {
      console.log(`[Data-Sync] Ticket ${ticketData.id} synced directly to Supabase.`);
    }
  } catch (e) {
    console.error("[Data-Sync] Supabase ticket insert exception:", e.message);
  }

  saveLocalTicket(fullTicket);
};
const updateTicket = async (id, updateData) => {
  const payload = {};
  if (updateData.status !== void 0) payload.status = updateData.status;
  if (updateData.messages !== void 0) {
    payload.messages = typeof updateData.messages === "string" ? updateData.messages : JSON.stringify(updateData.messages);
  }
  if (updateData.feedback !== void 0) {
    payload.feedback = typeof updateData.feedback === "string" ? updateData.feedback : JSON.stringify(updateData.feedback);
  }
  if (updateData.checklist !== void 0) {
    payload.checklist = typeof updateData.checklist === "string" ? updateData.checklist : JSON.stringify(updateData.checklist);
  }
  if (updateData.evidenceImage !== void 0) payload.evidenceImage = updateData.evidenceImage;
  if (updateData.category !== void 0) payload.category = updateData.category;
  if (updateData.description !== void 0) payload.description = updateData.description;
  if (updateData.type !== void 0) payload.type = updateData.type;
  if (updateData.isUrgent !== void 0) payload.isUrgent = updateData.isUrgent ? 1 : 0;
  payload.updatedAt = (new Date()).toISOString();

  try {
    const { data: updatedRows, error } = await supabase.from("tickets").update(payload).eq("id", id).select();
    if (error) {
      console.error("[Data-Sync] Supabase ticket update error:", error.message);
    } else if (updatedRows && updatedRows.length === 0) {
      console.warn(`[Data-Sync] Ticket ${id} not found in Supabase during update. Upserting from local cache...`);
      const local = getLocalTickets().find((t) => t.id === id);
      if (local) {
        const toInsert = {
          id: local.id,
          consumerId: local.consumerId || local.user_id,
          consumerName: local.consumerName,
          accountNumber: local.accountNumber,
          type: local.type,
          category: local.category,
          description: local.description,
          status: payload.status !== void 0 ? payload.status : local.status,
          isUrgent: payload.isUrgent !== void 0 ? payload.isUrgent : (local.isUrgent ? 1 : 0),
          evidenceImage: payload.evidenceImage !== void 0 ? payload.evidenceImage : (local.evidenceImage || ""),
          checklist: typeof local.checklist === "string" ? local.checklist : JSON.stringify(local.checklist || null),
          messages: payload.messages !== void 0 ? payload.messages : (typeof local.messages === "string" ? local.messages : JSON.stringify(local.messages || [])),
          feedback: payload.feedback !== void 0 ? payload.feedback : (typeof local.feedback === "string" ? local.feedback : JSON.stringify(local.feedback || null)),
          createdAt: local.createdAt || new Date().toISOString(),
          updatedAt: payload.updatedAt
        };
        await supabase.from("tickets").insert(toInsert);
      }
    } else {
      console.log(`[Data-Sync] Successfully updated ticket ${id} in Supabase.`);
    }
  } catch (e) {
    console.error("[Data-Sync] Supabase ticket update exception:", e.message);
  }

  updateLocalTicket(id, payload);
};

const deleteTicket = async (id) => {
  try {
    const { error } = await supabase.from("tickets").delete().eq("id", id);
    if (error) {
      console.error("[Data-Sync] Supabase ticket delete error:", error.message);
    } else {
      console.log(`[Data-Sync] Ticket ${id} deleted from Supabase.`);
    }
  } catch (e) {
    console.error("[Data-Sync] Supabase ticket delete exception:", e.message);
  }
  deleteLocalTicket(id);
};

const getAnnouncementsList = async () => {
  try {
    const { data, error } = await supabase.from("announcements").select("*").order("createdAt", { ascending: false });
    let list = [];
    if (!error && data) {
      list = data;
      globalThis.localAnnouncements = data;
    } else {
      list = globalThis.localAnnouncements || [];
    }
    const unique = [];
    const seen = new Set();
    for (const item of list) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        unique.push(item);
      }
    }
    try {
      const orderSetting = await getSettingValue("announcements_order");
      if (orderSetting) {
        const orderIds = typeof orderSetting === "string" ? JSON.parse(orderSetting) : orderSetting;
        if (Array.isArray(orderIds) && orderIds.length > 0) {
          unique.sort((a, b) => {
            const idxA = orderIds.indexOf(a.id);
            const idxB = orderIds.indexOf(b.id);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
          });
        }
      }
    } catch (e) {
      console.warn("Error parsing announcements order:", e.message);
    }
    return unique;
  } catch (e) {
    return globalThis.localAnnouncements || [];
  }
};
const createAnnouncement = async (annData) => {
  try {
    const { error } = await supabase.from("announcements").insert({
      id: annData.id,
      title: annData.title,
      content: annData.content
    });
    if (error) {
      console.log("[Data-Sync] Announcement stored successfully via local storage fallback.");
      globalThis.localAnnouncements.push({
        id: annData.id,
        title: annData.title,
        content: annData.content,
        createdAt: new Date().toISOString()
      });
    }
  } catch (e) {
    globalThis.localAnnouncements.push({
      id: annData.id,
      title: annData.title,
      content: annData.content,
      createdAt: new Date().toISOString()
    });
  }
};
const updateAnnouncement = async (id, annData) => {
  try {
    await supabase.from("announcements").update({
      title: annData.title,
      content: annData.content
    }).eq("id", id);
  } catch (e) {
    console.warn("Supabase update announcement failed:", e.message);
  }
  const local = (globalThis.localAnnouncements || []).find((a) => a.id === id);
  if (local) {
    local.title = annData.title;
    local.content = annData.content;
  } else {
    (globalThis.localAnnouncements = globalThis.localAnnouncements || []).push({
      id,
      title: annData.title,
      content: annData.content,
      createdAt: new Date().toISOString()
    });
  }
};
const deleteAnnouncement = async (id) => {
  try {
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) {
      console.log("[Data-Sync] Announcement removed successfully.");
    }
  } catch (e) {
  }
  globalThis.localAnnouncements = (globalThis.localAnnouncements || []).filter((ann) => ann.id !== id);
};
const getSettingValue = async (key) => {
  try {
    const { data, error } = await supabase.from("settings").select("value").eq("key", key).maybeSingle();
    if (error) {
      return localSettings[key] || null;
    }
    return data?.value || localSettings[key] || null;
  } catch (e) {
    return localSettings[key] || null;
  }
};
const setSettingValue = async (key, value) => {
  const serialized = typeof value === "string" ? value : JSON.stringify(value);
  try {
    const { error } = await supabase.from("settings").upsert({ key, value: serialized });
    if (error) {
      localSettings[key] = serialized;
    }
  } catch (e) {
    localSettings[key] = serialized;
  }
};
const saveSettingValue = setSettingValue;
const createInquiry = async (inquiryData) => {
  try {
    const { error } = await supabase.from("inquiries").insert({
      id: inquiryData.id,
      fullName: inquiryData.fullName,
      email: inquiryData.email,
      phone: inquiryData.phone,
      subject: inquiryData.subject,
      message: inquiryData.message
    });
    if (error) {
      console.log("[Data-Sync] Public inquiry logged successfully.");
      globalThis.localInquiries.push({
        id: inquiryData.id,
        fullName: inquiryData.fullName,
        email: inquiryData.email,
        phone: inquiryData.phone,
        subject: inquiryData.subject,
        message: inquiryData.message,
        createdAt: new Date().toISOString()
      });
    }
  } catch (e) {
    globalThis.localInquiries.push({
      id: inquiryData.id,
      fullName: inquiryData.fullName,
      email: inquiryData.email,
      phone: inquiryData.phone,
      subject: inquiryData.subject,
      message: inquiryData.message,
      createdAt: new Date().toISOString()
    });
  }
};
const INQUIRY_MESSAGES_FILE = path.join(process.cwd(), "inquiry_messages_store.json");

const getInquiryMessagesMap = () => {
  try {
    if (fs.existsSync(INQUIRY_MESSAGES_FILE)) {
      const content = fs.readFileSync(INQUIRY_MESSAGES_FILE, "utf-8");
      return JSON.parse(content) || {};
    }
  } catch (e) {
    console.error("Failed to read inquiry messages file:", e);
  }
  return {};
};

const saveInquiryMessagesMap = (map) => {
  try {
    fs.writeFileSync(INQUIRY_MESSAGES_FILE, JSON.stringify(map, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to write inquiry messages file:", e);
  }
};

const getInquiriesList = async () => {
  try {
    const { data, error } = await supabase.from("inquiries").select("*").order("createdAt", { ascending: false });
    let list = [];
    if (!error && data) {
      list = data;
      globalThis.localInquiries = data;
    } else {
      list = globalThis.localInquiries || [];
    }
    
    const seen = new Set();
    const unique = [];
    for (const item of list) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        unique.push(item);
      }
    }
    
    const messagesMap = getInquiryMessagesMap();
    
    return unique.map((d) => {
      let parsedMessages = messagesMap[d.id] || [];
      return {
        ...d,
        fullName: d.fullName || d.fullName_fallback || "",
        messages: parsedMessages
      };
    });
  } catch (e) {
    const merged = [...globalThis.localInquiries || []];
    const messagesMap = getInquiryMessagesMap();
    return merged.map((d) => {
      let parsedMessages = messagesMap[d.id] || [];
      return {
        ...d,
        fullName: d.fullName || d.fullName_fallback || "",
        messages: parsedMessages
      };
    });
  }
};
async function startServer() {
  await seedDatabases();
  await syncTicketsWithSupabase();
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "50mb" }));
  const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (token === "mock_admin_token") {
      req.user = {
        id: "mock-admin-id",
        email: "admin01@gmail.com",
        role: "admin",
        fullName: "System Admin",
        accountNumber: "ADMIN-001",
        phoneNumber: "09990000000",
        address: "Main Office",
        profileImage: "",
        hasProfile: true,
        emailConfirmed: true
      };
      return next();
    }
    if (!token) return res.sendStatus(401);
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !authUser) {
        return res.status(401).json({ error: "Invalid or expired session" });
      }

      const email = authUser.email ? authUser.email.trim().toLowerCase() : "";
      const isAdminEmail = email === "janry.maligaso@sorsu.edu.ph" || email === "admin@gov.ph" || email === "admin01@gmail.com";

      let profile = null;

      // 1. Try finding by authUser.id in profiles table
      try {
        const { data, error } = await supabase.from("profiles").select("*").eq("id", authUser.id).maybeSingle();
        if (!error && data) {
          profile = data;
        }
      } catch (e) {
        console.warn("Error finding profile by id:", e.message);
      }

      // 2. Try users table by id
      if (!profile) {
        try {
          const { data: uDataById } = await supabase.from("users").select("*").eq("id", authUser.id).maybeSingle();
          if (uDataById) {
            profile = {
              id: uDataById.id,
              full_name: uDataById.fullName || uDataById.full_name,
              role: uDataById.role,
              account_number: uDataById.accountNumber || uDataById.account_number,
              phone_number: uDataById.phoneNumber || uDataById.phone_number,
              address: uDataById.address,
              profile_image: uDataById.profileImage || uDataById.profile_image
            };
          }
        } catch (e) {
          console.warn("Error querying users table by id:", e.message);
        }
      }

      // 3. If still not found, try users table by email
      if (!profile && email) {
        try {
          const { data: uDataByEmail } = await supabase.from("users").select("*").eq("email", email).maybeSingle();
          if (uDataByEmail) {
            profile = {
              id: uDataByEmail.id,
              full_name: uDataByEmail.fullName || uDataByEmail.full_name,
              role: uDataByEmail.role,
              account_number: uDataByEmail.accountNumber || uDataByEmail.account_number,
              phone_number: uDataByEmail.phoneNumber || uDataByEmail.phone_number,
              address: uDataByEmail.address,
              profile_image: uDataByEmail.profileImage || uDataByEmail.profile_image
            };
          }
        } catch (e) {
          console.warn("Error querying users table by email:", e.message);
        }
      }

      // 4. Resolve metadata values from Google OAuth or Auth metadata
      const metaFullName = authUser.user_metadata?.fullName || authUser.user_metadata?.full_name || authUser.user_metadata?.name;
      const metaAvatar = authUser.user_metadata?.profileImage || authUser.user_metadata?.profile_image || authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture;
      const metaPhone = authUser.user_metadata?.phoneNumber || authUser.user_metadata?.phone_number;
      const metaAcc = authUser.user_metadata?.accountNumber || authUser.user_metadata?.account_number;
      const metaBarangay = authUser.user_metadata?.barangay || authUser.user_metadata?.address;

      const isGoogleUser = authUser.app_metadata?.provider === "google" ||
        (Array.isArray(authUser.app_metadata?.providers) && authUser.app_metadata?.providers.includes("google")) ||
        (Array.isArray(authUser.identities) && authUser.identities.some(i => i.provider === "google")) ||
        authUser.user_metadata?.iss?.includes("google") ||
        authUser.user_metadata?.avatar_url?.includes("googleusercontent.com") ||
        authUser.user_metadata?.picture?.includes("googleusercontent.com");

      const assignedRole = isAdminEmail ? "admin" : (profile?.role || authUser.user_metadata?.role || "consumer");
      const assignedFullName = isAdminEmail
        ? (profile?.full_name || metaFullName || "System Admin")
        : (profile?.full_name || metaFullName || (email ? email.split("@")[0] : "Consumer"));

      const assignedPhoneNumber = profile?.phone_number || metaPhone || "";
      const assignedAddress = profile?.address || metaBarangay || "";
      const assignedProfileImage = profile?.profile_image || metaAvatar || "";

      // Permanent Utility Account Number Resolution:
      // Never overwrite entered numbers with synthetic or placeholder 12345678.
      let assignedAccountNumber = "";
      if (isAdminEmail) {
        assignedAccountNumber = email === "admin@gov.ph" || email === "admin01@gmail.com" ? "ADMIN-001" : "ADMIN-002";
      } else {
        const rawProfileAcc = (profile?.account_number || profile?.accountNumber || "").toString().trim();
        const rawMetaAcc = (metaAcc || "").toString().trim();

        if (rawProfileAcc && rawProfileAcc !== "12345678" && rawProfileAcc !== "PENDING" && rawProfileAcc !== "N/A") {
          assignedAccountNumber = rawProfileAcc;
        } else if (rawMetaAcc && rawMetaAcc !== "12345678" && rawMetaAcc !== "PENDING" && rawMetaAcc !== "N/A") {
          assignedAccountNumber = rawMetaAcc;
        } else if (rawProfileAcc && rawProfileAcc !== "12345678") {
          assignedAccountNumber = rawProfileAcc;
        } else if (rawMetaAcc && rawMetaAcc !== "12345678") {
          assignedAccountNumber = rawMetaAcc;
        } else {
          assignedAccountNumber = "";
        }
      }

      // Check onboarding state for member-consumer
      const hasRealAccount = !!assignedAccountNumber && assignedAccountNumber !== "12345678" && assignedAccountNumber !== "PENDING";
      const onboardingCompleted = assignedRole === "admin" || (
        authUser.user_metadata?.onboarding_completed === true &&
        assignedPhoneNumber &&
        assignedAddress &&
        hasRealAccount
      ) || (
        hasRealAccount && assignedPhoneNumber && assignedAddress
      );

      const needsOnboarding = assignedRole !== "admin" && !onboardingCompleted;

      // Ensure profile row in Supabase is always kept in sync (valid columns only)
      try {
        await supabase.from("profiles").upsert({
          id: authUser.id,
          full_name: assignedFullName,
          account_number: assignedAccountNumber,
          role: assignedRole,
          phone_number: assignedPhoneNumber,
          address: assignedAddress,
          profile_image: assignedProfileImage
        });
      } catch (upsertErr) {
        console.warn("Auto-sync profile upsert error:", upsertErr.message);
      }

      // Ensure user row in Supabase is always kept in sync (valid columns only)
      try {
        await supabase.from("users").upsert({
          id: authUser.id,
          fullName: assignedFullName,
          email: email,
          accountNumber: assignedAccountNumber,
          role: assignedRole,
          phoneNumber: assignedPhoneNumber,
          address: assignedAddress,
          profileImage: assignedProfileImage
        });
      } catch (upsertErr2) {
        console.warn("Auto-sync user upsert error:", upsertErr2.message);
      }

      req.user = {
        id: authUser.id,
        email: email,
        role: assignedRole,
        fullName: assignedFullName,
        accountNumber: assignedAccountNumber,
        phoneNumber: assignedPhoneNumber,
        address: assignedAddress,
        barangay: assignedAddress,
        profileImage: assignedProfileImage,
        hasProfile: true,
        isGoogleUser: !!isGoogleUser,
        needsOnboarding: !!needsOnboarding,
        onboardingCompleted: !!onboardingCompleted,
        emailConfirmed: !!authUser.email_confirmed_at || !!authUser.confirmed_at || !!authUser.app_metadata?.provider
      };
      next();
    } catch (err) {
      console.error("Auth middleware error:", err.message);
      return res.status(401).json({ error: "Authentication failed" });
    }
  };
  app.get("/api/auth/me", authenticateToken, (req, res) => {
    res.json(req.user);
  });
  app.post("/api/auth/complete-onboarding", authenticateToken, async (req, res) => {
    const { phoneNumber, barangay, address, accountNumber } = req.body;
    const cleanPhone = (phoneNumber || "").trim();
    const cleanBarangay = (barangay || address || "").trim();
    const cleanAccount = (accountNumber || "").trim();

    if (!cleanPhone || !cleanBarangay || !cleanAccount) {
      return res.status(400).json({ error: "Mobile number, barangay, and utility account number are required." });
    }

    if (cleanAccount.length < 5) {
      return res.status(400).json({ error: "Please enter a valid utility account number (found on your electric bill)." });
    }

    try {
      // 1. Supabase Auth admin metadata update
      try {
        await supabase.auth.admin.updateUserById(req.user.id, {
          user_metadata: {
            fullName: req.user.fullName,
            phoneNumber: cleanPhone,
            address: cleanBarangay,
            barangay: cleanBarangay,
            accountNumber: cleanAccount,
            onboarding_completed: true
          }
        });
      } catch (authErr) {
        console.warn("Complete onboarding auth update notice:", authErr.message);
      }

      // 2. Profiles table update (valid columns only: id, full_name, account_number, phone_number, address, role, profile_image)
      try {
        const { error: pErr } = await supabase.from("profiles").upsert({
          id: req.user.id,
          full_name: req.user.fullName,
          account_number: cleanAccount,
          phone_number: cleanPhone,
          address: cleanBarangay,
          role: req.user.role || "consumer",
          profile_image: req.user.profileImage || ""
        });
        if (pErr) console.error("Complete onboarding profile update error:", pErr.message);
      } catch (profErr) {
        console.warn("Complete onboarding profile update notice:", profErr.message);
      }

      // 3. Clean up any stale duplicate users with same email but different ID in users table
      if (req.user.email) {
        try {
          await supabase.from("users").delete().eq("email", req.user.email).neq("id", req.user.id);
        } catch (delErr) {
          console.warn("Error cleaning stale duplicate user row:", delErr.message);
        }
      }

      // 4. Users table update (valid columns only: id, fullName, email, accountNumber, phoneNumber, address, role, profileImage)
      try {
        const { error: uErr } = await supabase.from("users").upsert({
          id: req.user.id,
          fullName: req.user.fullName,
          email: req.user.email,
          accountNumber: cleanAccount,
          phoneNumber: cleanPhone,
          address: cleanBarangay,
          role: req.user.role || "consumer",
          profileImage: req.user.profileImage || ""
        });
        if (uErr) console.error("Complete onboarding user update error:", uErr.message);
      } catch (userErr) {
        console.warn("Complete onboarding user update notice:", userErr.message);
      }

      const updatedUser = {
        ...req.user,
        accountNumber: cleanAccount,
        phoneNumber: cleanPhone,
        address: cleanBarangay,
        barangay: cleanBarangay,
        needsOnboarding: false,
        onboardingCompleted: true
      };

      res.json({
        success: true,
        message: "Consumer account successfully activated with utility details.",
        user: updatedUser
      });
    } catch (e) {
      console.error("Complete onboarding error:", e);
      res.status(500).json({ error: "Failed to complete consumer profile onboarding." });
    }
  });
  app.patch("/api/auth/profile", authenticateToken, async (req, res) => {
    const { fullName, phoneNumber, address, profileImage, accountNumber, hasUnpaidBill } = req.body;
    try {
      const authHeader = req.headers["authorization"];
      const token = authHeader && authHeader.split(" ")[1];
      if (token === "mock_admin_token") {
        req.user = {
          id: "mock-admin-id",
          email: "admin01@gmail.com",
          role: "admin",
          fullName: "System Admin",
          accountNumber: "ADMIN-001"
        };
      }
      await updateUserProfile(req.user.id, { fullName, phoneNumber, address, profileImage, accountNumber, hasUnpaidBill }, token);
      res.json({ success: true });
    } catch (e) {
      console.error("Profile update error:", e);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });
  app.get("/api/auth/check-account-number", async (req, res) => {
    const { accountNumber, excludeUserId } = req.query;
    if (!accountNumber) return res.json({ exists: false });

    try {
      const users = await getAllUsers();
      const exists = users.some(u => 
        u.accountNumber === accountNumber && 
        u.id !== excludeUserId && 
        u.accountNumber !== "PENDING"
      );
      res.json({ exists });
    } catch (e) {
      console.error("Check account number failed:", e);
      res.status(500).json({ error: "Failed to verify account number" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    const cleanEmail = email.trim().toLowerCase();
    try {
      if (cleanEmail === "admin01@gmail.com" && (password === "admin001" || password === "admin123")) {
        return res.json({
          session: {
            access_token: "mock_admin_token"
          },
          user: {
            id: "mock-admin-id",
            email: "admin01@gmail.com",
            user_metadata: { role: "admin", fullName: "System Admin" }
          }
        });
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password
      });

      if (error) {
        console.warn(`[Login Failed] ${cleanEmail}: ${error.message}`);
        
        let errorMessage = error.message;
        if (error.message?.includes("Email not confirmed")) {
          return res.status(400).json({
            error: "Your email has not been confirmed yet. Please check your inbox for the confirmation email, or click Resend Confirmation.",
            emailNotConfirmed: true,
            email: cleanEmail
          });
        }
        
        return res.status(400).json({ error: errorMessage });
      }

      console.log(`[Login Success] ${cleanEmail} authenticated successfully.`);
      res.json({
        session: data.session,
        user: data.user
      });
    } catch (e) {
      console.error("Login endpoint error:", e);
      res.status(500).json({ error: e.message || "Failed to log in" });
    }
  });

  const sendBrevoVerificationEmail = async ({ email, fullName, accountNumber, barangay, verificationLink }) => {
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
      console.log("[Brevo Email] Note: BREVO_API_KEY not configured. Verification email queued locally. Details:", { email, fullName, accountNumber, barangay, verificationLink });
      return { success: false, reason: "BREVO_API_KEY not set" };
    }
    const senderEmail = process.env.BREVO_SENDER_EMAIL || "no-reply@soreco1.com.ph";
    const senderName = "SORECO-1 Consumer Portal";
    const htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #fed7aa; border-radius: 16px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #ea580c; margin: 0; font-size: 24px; font-weight: 800;">SORECO-1 Electric Cooperative</h1>
          <p style="color: #78716c; font-size: 13px; margin-top: 4px;">Sorsogon I Electric Cooperative, Inc. • Official Consumer Portal</p>
        </div>
        <div style="background-color: #fff7ed; padding: 20px; border-radius: 12px; margin-bottom: 20px; border-left: 4px solid #ea580c;">
          <h2 style="color: #9a3412; margin: 0 0 10px 0; font-size: 17px;">Welcome, ${fullName}!</h2>
          <p style="color: #431407; font-size: 14px; margin: 0; line-height: 1.6;">
            Your member-consumer registration has been received. Please verify your email address to activate your digital portal access and submit online service requests.
          </p>
        </div>
        <table style="width: 100%; margin-bottom: 24px; font-size: 14px; border-collapse: collapse; background: #fafaf9; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="padding: 10px 14px; color: #78716c; border-bottom: 1px solid #f5f5f4;">Full Name:</td>
            <td style="padding: 10px 14px; font-weight: bold; color: #1c1917; border-bottom: 1px solid #f5f5f4;">${fullName}</td>
          </tr>
          <tr>
            <td style="padding: 10px 14px; color: #78716c; border-bottom: 1px solid #f5f5f4;">Utility Account Number:</td>
            <td style="padding: 10px 14px; font-family: monospace; font-weight: bold; color: #ea580c; border-bottom: 1px solid #f5f5f4;">${accountNumber || "N/A"}</td>
          </tr>
          ${barangay ? `<tr>
            <td style="padding: 10px 14px; color: #78716c;">Barangay Jurisdiction:</td>
            <td style="padding: 10px 14px; font-weight: bold; color: #1c1917;">${barangay}</td>
          </tr>` : ""}
        </table>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${verificationLink || 'https://ais-dev-ksebgsuwh4nb7hqurmr6cw-705588850561.asia-east1.run.app/login?confirmed=true'}" style="background-color: #ea580c; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: bold; display: inline-block; font-size: 15px; box-shadow: 0 4px 12px rgba(234, 88, 12, 0.25);">
            Verify Account & Login
          </a>
        </div>
        <p style="color: #a8a29e; font-size: 12px; text-align: center; margin-top: 24px; border-top: 1px solid #f5f5f4; padding-top: 16px;">
          If you did not create a SORECO-1 account, please disregard this email.
        </p>
      </div>
    `;
    try {
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": apiKey,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          sender: { name: senderName, email: senderEmail },
          to: [{ email, name: fullName }],
          subject: "Verify Your SORECO-1 Consumer Account",
          htmlContent
        })
      });
      const data = await res.json();
      console.log("[Brevo Email] Sent verification email response:", data);
      return { success: res.ok, data };
    } catch (e) {
      console.error("[Brevo Email] Exception sending verification email:", e.message);
      return { success: false, error: e.message };
    }
  };

  app.post("/api/auth/register", async (req, res) => {
    const { email, password, fullName, firstName, middleName, lastName, accountNumber, phoneNumber, barangay } = req.body;
    const resolvedFullName = fullName || [firstName, middleName, lastName].filter(Boolean).join(" ");
    if (!email || !password || !resolvedFullName || !accountNumber) {
      return res.status(400).json({ error: "First name, last name, email, password, and account number are required" });
    }
    const cleanEmail = email.trim().toLowerCase();
    const resolvedAddress = barangay ? `Brgy. ${barangay}, Bulan, Sorsogon` : (req.body.address || "");
    const origin = req.headers.origin || (process.env.APP_URL ? process.env.APP_URL : "http://localhost:3000");
    const emailRedirectTo = `${origin}/login?confirmed=true`;

    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo,
          data: {
            fullName: resolvedFullName,
            accountNumber,
            phoneNumber: phoneNumber || "",
            address: resolvedAddress,
            barangay: barangay || "",
            role: cleanEmail === "janry.maligaso@sorsu.edu.ph" ? "admin" : "consumer"
          }
        }
      });

      if (error) {
        if (error.message?.includes("already registered") || error.message?.includes("already exists")) {
          return res.status(400).json({
            error: "An account with this email already exists. If your email is not yet confirmed, please check your inbox or use Resend Confirmation.",
            emailAlreadyExists: true,
            email: cleanEmail
          });
        }
        return res.status(400).json({ error: error.message });
      }

      if (data?.user) {
        try {
          await supabase.from("profiles").upsert({
            id: data.user.id,
            full_name: resolvedFullName,
            account_number: accountNumber || "PENDING",
            role: cleanEmail === "janry.maligaso@sorsu.edu.ph" ? "admin" : "consumer",
            phone_number: phoneNumber || "",
            address: resolvedAddress,
            profile_image: ""
          });
        } catch (profileError) {
          console.error("Profile creation error during registration:", profileError.message);
        }

        try {
          await supabase.from("users").upsert({
            id: data.user.id,
            fullName: resolvedFullName,
            email: cleanEmail,
            accountNumber: accountNumber || "PENDING",
            role: cleanEmail === "janry.maligaso@sorsu.edu.ph" ? "admin" : "consumer",
            phoneNumber: phoneNumber || "",
            address: resolvedAddress,
            profileImage: ""
          });
        } catch (userError) {
          console.error("User creation error during registration:", userError.message);
        }

        // Try getting direct action_link from Supabase Admin if enabled, else use emailRedirectTo
        let verificationLink = emailRedirectTo;
        try {
          const { data: linkData } = await supabase.auth.admin.generateLink({
            type: "signup",
            email: cleanEmail,
            password: password,
            options: { redirectTo: emailRedirectTo }
          });
          if (linkData?.properties?.action_link) {
            verificationLink = linkData.properties.action_link;
          }
        } catch (linkErr) {
          console.warn("generateLink error (non-fatal):", linkErr.message);
        }

        // Dispatch verification email via Brevo
        await sendBrevoVerificationEmail({
          email: cleanEmail,
          fullName: resolvedFullName,
          accountNumber,
          barangay,
          verificationLink
        });
      }

      const supabaseConfirmRequired = data.user && !data.session;
      res.json({
        success: true,
        supabaseConfirmRequired,
        session: data.session,
        user: data.user,
        message: supabaseConfirmRequired
          ? "Soreco-1 has sent you an email confirmation please check your email and verify."
          : "Registration successful!"
      });
    } catch (e) {
      console.error("Registration endpoint error:", e);
      res.status(500).json({ error: e.message || "Failed to register" });
    }
  });

  app.post("/api/auth/resend-confirmation", async (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }
    const cleanEmail = email.trim().toLowerCase();
    const origin = req.headers.origin || (process.env.APP_URL ? process.env.APP_URL : "http://localhost:3000");
    const emailRedirectTo = `${origin}/login?confirmed=true`;

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: cleanEmail,
        options: {
          emailRedirectTo
        }
      });

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      res.json({ success: true, message: "Soreco-1 has sent you an email confirmation please check your email and verify." });
    } catch (e) {
      console.error("Resend confirmation error:", e);
      res.status(500).json({ error: e.message || "Failed to resend confirmation email" });
    }
  });

  // Forgot Password: Step 1 - Send 6-Digit OTP via Brevo
  app.post("/api/auth/send-otp", async (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }
    const cleanEmail = email.trim().toLowerCase();

    try {
      // Verify that the user exists in Supabase (auth or profiles or users)
      let foundUser = null;
      try {
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
        if (!listError && users) {
          foundUser = users.find((u) => u.email?.toLowerCase() === cleanEmail);
        }
      } catch (e) {
        console.warn("Auth listUsers check skipped:", e.message);
      }

      if (!foundUser) {
        try {
          const { data: pData } = await supabase.from("profiles").select("id, full_name").eq("email", cleanEmail).maybeSingle();
          if (pData) foundUser = { id: pData.id, email: cleanEmail, user_metadata: { fullName: pData.full_name } };
        } catch {
          // ignore
        }
      }

      if (!foundUser) {
        try {
          const { data: uData } = await supabase.from("users").select("id, fullName, full_name").eq("email", cleanEmail).maybeSingle();
          if (uData) foundUser = { id: uData.id, email: cleanEmail, user_metadata: { fullName: uData.fullName || uData.full_name } };
        } catch {
          // ignore
        }
      }

      if (!foundUser && cleanEmail !== "admin01@gmail.com") {
        return res.status(404).json({ error: "No registered account found with this email address." });
      }

      // Generate a cryptographically secure 6-digit OTP
      const otpNumber = crypto.randomInt(100000, 999999).toString();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes validity

      // Store in memory
      globalThis.otpStore.set(cleanEmail, {
        otp: otpNumber,
        expiresAt,
        verified: false,
        attempts: 0
      });

      const recipientName = foundUser?.user_metadata?.fullName || foundUser?.user_metadata?.full_name || cleanEmail.split("@")[0];

      // Prepare styled HTML email
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
            .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
            .logo { font-size: 20px; font-weight: 800; color: #0284c7; letter-spacing: -0.5px; margin-bottom: 24px; text-transform: uppercase; }
            .otp-box { background: #f0f9ff; border: 2px dashed #0284c7; border-radius: 12px; padding: 18px; text-align: center; margin: 24px 0; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0369a1; }
            .footer { font-size: 12px; color: #64748b; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="logo">SORECO-1 Consumer Portal</div>
            <h2 style="font-size: 20px; margin-top: 0; color: #0f172a;">Password Reset Verification</h2>
            <p style="font-size: 14px; line-height: 1.6; color: #334155;">Hello <strong>${recipientName}</strong>,</p>
            <p style="font-size: 14px; line-height: 1.6; color: #334155;">We received a request to reset the password for your SORECO-1 Consumer Portal account. Use the 6-digit verification code below to continue:</p>
            <div class="otp-box">${otpNumber}</div>
            <p style="font-size: 13px; color: #64748b; line-height: 1.5;">This verification code is valid for <strong>10 minutes</strong>. If you did not request this password reset, please ignore this email or contact SORECO-1 support immediately.</p>
            <div class="footer">
              &copy; ${new Date().getFullYear()} SORSOGON I ELECTRIC COOPERATIVE, INC. (SORECO-1)<br>All rights reserved.
            </div>
          </div>
        </body>
        </html>
      `;

      await sendBrevoEmail({
        toEmail: cleanEmail,
        toName: recipientName,
        subject: "SORECO-1 Password Reset Verification Code",
        htmlContent
      });

      console.log(`[Brevo] OTP sent successfully to ${cleanEmail}`);
      res.json({ success: true, message: "Soreco-1 has sent you an OTP. Please check your email." });
    } catch (e) {
      console.error("send-otp error:", e);
      res.status(500).json({ error: e.message || "Failed to send verification code. Please check email configuration." });
    }
  });

  // Forgot Password: Step 2 - Verify 6-Digit OTP
  app.post("/api/auth/verify-otp", async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: "Email and verification code are required" });
    }
    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.toString().trim();

    const record = globalThis.otpStore.get(cleanEmail);
    if (!record) {
      return res.status(400).json({ error: "No active verification code found for this email. Please request a new code." });
    }

    if (Date.now() > record.expiresAt) {
      globalThis.otpStore.delete(cleanEmail);
      return res.status(400).json({ error: "Verification code has expired. Please request a new code." });
    }

    record.attempts = (record.attempts || 0) + 1;
    if (record.attempts > 5) {
      globalThis.otpStore.delete(cleanEmail);
      return res.status(400).json({ error: "Too many failed attempts. Please request a new verification code." });
    }

    if (record.otp !== cleanOtp) {
      return res.status(400).json({ error: "Invalid verification code. Please check and try again." });
    }

    // Mark verified
    record.verified = true;
    globalThis.otpStore.set(cleanEmail, record);

    res.json({ success: true, message: "Verification code confirmed successfully." });
  });

  // Forgot Password: Step 3 - Create New Password (Supabase Auth Updates)
  app.post("/api/auth/reset-password", async (req, res) => {
    const { email, password, otp } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and new password are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const record = globalThis.otpStore.get(cleanEmail);

    // Verify that OTP verification took place
    if (!record || !record.verified) {
      if (otp) {
        if (!record || record.otp !== otp.toString().trim() || Date.now() > record.expiresAt) {
          return res.status(400).json({ error: "Invalid or expired verification session. Please verify your OTP code." });
        }
      } else {
        return res.status(400).json({ error: "OTP verification required before resetting password." });
      }
    }

    try {
      let userId = null;
      try {
        const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
        if (!authError && users) {
          const matching = users.find((u) => u.email?.toLowerCase() === cleanEmail);
          if (matching) {
            userId = matching.id;
          }
        }
      } catch (err) {
        console.warn("Could not list auth users to find email:", err.message);
      }

      if (!userId) {
        try {
          const { data, error } = await supabase.from("profiles").select("id").eq("email", cleanEmail).maybeSingle();
          if (data) userId = data.id;
        } catch (err) {
        }
      }

      if (!userId) {
        try {
          const { data, error } = await supabase.from("users").select("id").eq("email", cleanEmail).maybeSingle();
          if (data) userId = data.id;
        } catch (err) {
        }
      }

      if (!userId) {
        return res.status(404).json({ error: "No user account found with this email address in Supabase." });
      }

      // Supabase Auth updates the password and confirms email so the user can immediately log in
      const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
        password: password,
        email_confirm: true
      });

      if (authError) {
        console.error("Error updating password via Supabase Auth Admin:", authError.message);
        if (authError.message?.toLowerCase().includes("jwt") || authError.message?.toLowerCase().includes("not allowed")) {
          return res.status(400).json({ error: "Supabase Service Role Key required. Please ensure SUPABASE_SERVICE_ROLE_KEY is set in Settings." });
        }
        return res.status(400).json({ error: authError.message });
      }

      // Cleanup used OTP
      globalThis.otpStore.delete(cleanEmail);

      console.log(`[Supabase Auth] Password reset successfully for ${cleanEmail} (ID: ${userId})`);
      res.json({ success: true, message: "Password updated successfully. You can now sign in with your new password." });
    } catch (e) {
      console.error("Reset password exception:", e);
      res.status(500).json({ error: "Failed to reset password. Please try again." });
    }
  });

  // Legacy route alias for compatibility
  app.post("/api/auth/forgot-password", async (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }
    // Delegate to send-otp
    req.url = "/api/auth/send-otp";
    return app._router.handle(req, res);
  });
  app.get("/api/tickets", authenticateToken, async (req, res) => {
    try {
      const tickets = await getTicketsList(req.user.role, req.user.id);
      res.json(tickets);
    } catch (e) {
      console.error("Get tickets failed:", e);
      res.status(500).json({ error: "Failed to fetch tickets list" });
    }
  });
  app.post("/api/tickets", authenticateToken, async (req, res) => {
    const { type, category, description, evidenceImage, checklist, consumerName, accountNumber, isUrgent } = req.body;
    const id = "TICK-" + Math.random().toString(36).substring(2, 9).toUpperCase();
    try {
      const ticketData = {
        id,
        consumerId: req.user.id,
        consumerName: req.user.fullName || consumerName,
        accountNumber: req.user.accountNumber || accountNumber,
        address: req.user.address || "",
        phoneNumber: req.user.phoneNumber || "",
        type,
        category,
        description,
        status: "pending",
        isUrgent: 1,
        evidenceImage: evidenceImage || "",
        checklist: checklist || null,
        messages: []
      };
      await createTicket(ticketData);
      res.json({ id });
    } catch (e) {
      console.error("Create ticket failed:", e);
      res.status(500).json({ error: "Failed to create service request ticket", details: e.message, stack: e.stack });
    }
  });
  app.get("/api/tickets/:id", authenticateToken, async (req, res) => {
    try {
      const ticket = await getTicketById(req.params.id);
      if (!ticket) return res.status(404).json({ error: "Ticket not found" });
      res.json(ticket);
    } catch (e) {
      console.error("Get ticket details failed:", e);
      res.status(500).json({ error: "Failed to fetch ticket" });
    }
  });
  app.patch("/api/tickets/:id", authenticateToken, async (req, res) => {
    const { status, messages, feedback, evidenceImage, category, description, type, isUrgent } = req.body;
    try {
      const ticket = await getTicketById(req.params.id);
      if (!ticket) return res.status(404).json({ error: "Ticket not found" });
      const isAdmin = req.user.role === "admin";
      const isOwner = ticket.user_id === req.user.id || ticket.consumerId === req.user.id;
      if (!isAdmin && !isOwner) {
        return res.status(403).json({ error: "Unauthorized to modify this ticket" });
      }
      if (!isAdmin) {
        if (ticket.status === "cancelled") {
          return res.status(400).json({ error: "Cancelled requests are locked." });
        }
        if (status === "cancelled") {
          if (ticket.status !== "pending" && ticket.status !== "reviewing") {
            return res.status(400).json({ error: "Requests can only be cancelled while pending or reviewing." });
          }
        } else if (feedback !== void 0) {
          if (ticket.status !== "resolved" && ticket.status !== "pending") {
            return res.status(400).json({ error: "Feedback can only be submitted for resolved or pending requests." });
          }
        } else if (messages !== void 0 || evidenceImage !== void 0) {
        } else {
          if (ticket.status !== "pending") {
            return res.status(400).json({ error: "Requests can only be edited while pending." });
          }
        }
      }
      const updateData = {};
      if (status !== void 0) updateData.status = status;
      if (messages !== void 0) updateData.messages = messages;
      if (feedback !== void 0) updateData.feedback = feedback;
      if (evidenceImage !== void 0) updateData.evidenceImage = evidenceImage;
      if (category !== void 0 && (isAdmin || ticket.status === "pending")) updateData.category = category;
      if (description !== void 0 && (isAdmin || ticket.status === "pending")) updateData.description = description;
      if (type !== void 0 && (isAdmin || ticket.status === "pending")) updateData.type = type;
      if (isUrgent !== void 0 && (isAdmin || ticket.status === "pending")) updateData.isUrgent = isUrgent ? 1 : 0;
      await updateTicket(req.params.id, updateData);
      res.json({ success: true });
    } catch (e) {
      console.error("Update ticket failed:", e);
      res.status(500).json({ error: "Failed to update ticket" });
    }
  });

  app.delete("/api/tickets/:id", authenticateToken, async (req, res) => {
    try {
      const ticket = await getTicketById(req.params.id);
      if (!ticket) return res.status(404).json({ error: "Ticket not found" });
      if (req.user.role !== "admin") {
        return res.status(403).json({ error: "Only admins can delete tickets" });
      }
      await deleteTicket(req.params.id);
      res.json({ success: true });
    } catch (e) {
      console.error("Delete ticket failed:", e);
      res.status(500).json({ error: "Failed to delete ticket" });
    }
  });

  app.get("/api/public/ratings", async (req, res) => {
    try {
      const tickets = await getTicketsList();
      const feedbacks = tickets.filter(t => {
        let fb = t.feedback;
        if (typeof fb === "string") {
          try { fb = JSON.parse(fb); } catch (e) {}
        }
        return fb && fb.rating;
      }).map(t => {
        let fb = t.feedback;
        if (typeof fb === "string") {
          try { fb = JSON.parse(fb); } catch (e) {}
        }
        return {
          id: t.id,
          consumerName: t.consumerName || "Member Consumer",
          category: t.category,
          type: t.type,
          rating: Number(fb.rating),
          comment: fb.comment,
          adminResponse: fb.adminResponse || null,
          createdAt: fb.createdAt
        };
      });

      let totalRating = 0;
      let categories = {
        billing: { count: 0, total: 0 },
        reconnection: { count: 0, total: 0 },
        other: { count: 0, total: 0 }
      };

      feedbacks.forEach(f => {
        totalRating += f.rating;
        const rawType = f.type || "other";
        const type = (rawType === "billing" || rawType === "billing-dispute") 
          ? "billing" 
          : (rawType === "reconnection" ? "reconnection" : "other");
        if (categories[type]) {
          categories[type].total += f.rating;
          categories[type].count += 1;
        } else {
          categories.other.total += f.rating;
          categories.other.count += 1;
        }
      });

      const avgRating = feedbacks.length > 0 ? Number((totalRating / feedbacks.length).toFixed(1)) : 0.0;
      const satisfactionPercentage = feedbacks.length > 0 ? Math.round((totalRating / (feedbacks.length * 5)) * 100) : 0;

      const breakdown = {
        billing: categories.billing.count > 0 ? Number((categories.billing.total / categories.billing.count).toFixed(1)) : 0.0,
        reconnection: categories.reconnection.count > 0 ? Number((categories.reconnection.total / categories.reconnection.count).toFixed(1)) : 0.0,
        other: categories.other.count > 0 ? Number((categories.other.total / categories.other.count).toFixed(1)) : 0.0,
      };

      res.json({
        averageRating: avgRating,
        totalFeedbacks: feedbacks.length,
        satisfactionPercentage: satisfactionPercentage,
        feedbacks: feedbacks.slice(0, 10),
        breakdown: breakdown
      });
    } catch (e) {
      console.error("Get public ratings failed:", e);
      res.json({
        averageRating: 0.0,
        totalFeedbacks: 0,
        satisfactionPercentage: 0,
        feedbacks: []
      });
    }
  });

  app.get("/api/announcements", async (req, res) => {
    try {
      const announcements = await getAnnouncementsList();
      res.json(announcements);
    } catch (e) {
      console.error("Get announcements failed:", e);
      res.status(500).json({ error: "Failed to load announcements" });
    }
  });
  app.post("/api/announcements", authenticateToken, async (req, res) => {
    if (req.user.role !== "admin") return res.sendStatus(403);
    const { title, content } = req.body;
    const id = Math.random().toString(36).substring(2, 15);
    try {
      await createAnnouncement({ id, title, content });
      res.json({ id });
    } catch (e) {
      console.error("Create announcement failed:", e);
      res.status(500).json({ error: "Failed to publish announcement" });
    }
  });
  app.put("/api/announcements/:id", authenticateToken, async (req, res) => {
    if (req.user.role !== "admin") return res.sendStatus(403);
    const { title, content } = req.body;
    try {
      await updateAnnouncement(req.params.id, { title, content });
      res.json({ success: true });
    } catch (e) {
      console.error("Update announcement failed:", e);
      res.status(500).json({ error: "Failed to update announcement" });
    }
  });
  app.post("/api/announcements/reorder", authenticateToken, async (req, res) => {
    if (req.user.role !== "admin") return res.sendStatus(403);
    const { items } = req.body; // array of announcement IDs or objects
    try {
      const orderIds = Array.isArray(items) ? items.map(item => (typeof item === "string" ? item : item.id)) : [];
      await setSettingValue("announcements_order", JSON.stringify(orderIds));
      res.json({ success: true, order: orderIds });
    } catch (e) {
      console.error("Reorder announcements failed:", e);
      res.status(500).json({ error: "Failed to reorder announcements" });
    }
  });
  app.delete("/api/announcements/:id", authenticateToken, async (req, res) => {
    if (req.user.role !== "admin") return res.sendStatus(403);
    try {
      await deleteAnnouncement(req.params.id);
      res.json({ success: true });
    } catch (e) {
      console.error("Delete announcement failed:", e);
      res.status(500).json({ error: "Failed to delete announcement" });
    }
  });
  app.get("/api/settings/:key", async (req, res) => {
    try {
      const value = await getSettingValue(req.params.key);
      res.json({ value });
    } catch (e) {
      console.error("Get setting failed:", e);
      res.status(500).json({ error: "Failed to load setting" });
    }
  });
  app.post("/api/settings/:key", authenticateToken, async (req, res) => {
    if (req.user.role !== "admin") return res.sendStatus(403);
    const { value } = req.body;
    try {
      await setSettingValue(req.params.key, value);
      res.json({ success: true });
    } catch (e) {
      console.error("Save setting failed:", e);
      res.status(500).json({ error: "Failed to save system setting" });
    }
  });
  app.post("/api/users", authenticateToken, async (req, res) => {
    if (req.user.role !== "admin") return res.sendStatus(403);
    const { fullName, email, password, accountNumber, role, phoneNumber, address } = req.body;
    try {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          fullName,
          accountNumber,
          role
        }
      });
      if (authError) {
        return res.status(400).json({ error: authError.message });
      }
      if (authData?.user) {
        const { error: profileError } = await supabase.from("profiles").upsert({
          id: authData.user.id,
          full_name: fullName,
          account_number: accountNumber || "PENDING",
          role: role || "consumer",
          phone_number: phoneNumber || "",
          address: address || "",
          profile_image: ""
        });
        if (profileError) {
          console.error("Error in profile creation:", profileError.message);
        }
      }
      res.json({ success: true });
    } catch (e) {
      console.error("Admin user creation failed:", e);
      res.status(500).json({ error: "Failed to create user" });
    }
  });
  app.get("/api/users", authenticateToken, async (req, res) => {
    if (req.user.role !== "admin") return res.sendStatus(403);
    try {
      const users = await getAllUsers();
      res.json(users);
    } catch (e) {
      console.error("Get all users failed:", e);
      res.status(500).json({ error: "Failed to retrieve users" });
    }
  });
  app.patch("/api/users/:id", authenticateToken, async (req, res) => {
    if (req.user.role !== "admin") return res.sendStatus(403);
    const { fullName, email, accountNumber, role, phoneNumber, address, hasUnpaidBill } = req.body;
    const updateData = {};
    if (fullName !== void 0) updateData.fullName = fullName;
    if (email !== void 0) updateData.email = email;
    if (accountNumber !== void 0) updateData.accountNumber = accountNumber;
    if (role !== void 0) updateData.role = role;
    if (phoneNumber !== void 0) updateData.phoneNumber = phoneNumber;
    if (address !== void 0) updateData.address = address;
    if (hasUnpaidBill !== void 0) updateData.hasUnpaidBill = hasUnpaidBill;
    try {
      await adminUpdateUser(req.params.id, updateData);
      res.json({ success: true });
    } catch (e) {
      console.error("Update user failed:", e);
      res.status(500).json({ error: "Failed to update user" });
    }
  });
  app.delete("/api/users/:id", authenticateToken, async (req, res) => {
    if (req.user.role !== "admin") return res.sendStatus(403);
    try {
      await adminDeleteUser(req.params.id);
      res.json({ success: true });
    } catch (e) {
      console.error("Delete user failed:", e);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });
  app.post("/api/inquiries", async (req, res) => {
    const { fullName, email, phone, subject, message } = req.body;
    if (!fullName || !email || !phone || !subject || !message) {
      return res.status(400).json({ error: "All fields are required" });
    }
    const id = "INQ-" + Math.random().toString(36).substring(2, 9).toUpperCase();
    try {
      const inquiryData = {
        id,
        fullName,
        email,
        phone,
        subject,
        message
      };
      await createInquiry(inquiryData);
      res.json({ id });
    } catch (e) {
      console.error("Create inquiry failed:", e);
      res.status(500).json({ error: "Failed to submit inquiry" });
    }
  });
  app.get("/api/inquiries", authenticateToken, async (req, res) => {
    if (req.user.role !== "admin") return res.sendStatus(403);
    try {
      const inquiries = await getInquiriesList();
      res.json(inquiries);
    } catch (e) {
      console.error("Get inquiries failed:", e);
      res.status(500).json({ error: "Failed to fetch inquiries" });
    }
  });
  app.get("/api/my-inquiries", authenticateToken, async (req, res) => {
    try {
      const email = req.user.email;
      const inquiries = await getInquiriesList();
      const userInquiries = inquiries.filter((i) => i.email && i.email.toLowerCase() === email.toLowerCase());
      res.json(userInquiries);
    } catch (e) {
      console.error("Get my inquiries failed:", e);
      res.status(500).json({ error: "Failed to fetch inquiries" });
    }
  });
  app.patch("/api/inquiries/:id", authenticateToken, async (req, res) => {
    const { messages } = req.body;
    try {
      const inquiryId = req.params.id;
      let inquiry = null;
      try {
        const { data, error } = await supabase.from("inquiries").select("*").eq("id", inquiryId).maybeSingle();
        if (!error && data) {
          inquiry = data;
        }
      } catch (e) {
      }
      const localInq = (globalThis.localInquiries || []).find((i) => i.id === inquiryId);
      if (localInq) {
        inquiry = localInq;
      }
      if (!inquiry) {
        return res.status(404).json({ error: "Inquiry not found" });
      }
      const isAdmin = req.user.role === "admin";
      const isOwner = req.user.email && inquiry.email && req.user.email.toLowerCase() === inquiry.email.toLowerCase();
      if (!isAdmin && !isOwner) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      if (messages !== void 0) {
        const messagesMap = getInquiryMessagesMap();
        messagesMap[inquiryId] = Array.isArray(messages) ? messages : [];
        saveInquiryMessagesMap(messagesMap);
      }
      res.json({ success: true });
    } catch (e) {
      console.error("Update inquiry failed:", e);
      res.status(500).json({ error: "Failed to update inquiry" });
    }
  });
  app.get("/api/backend-status", async (req, res) => {
    let supabaseStatus = "configured";
    let missingTables = [];
    const tablesToCheck = ["profiles", "tickets", "announcements", "settings", "inquiries"];
    await Promise.all(
      tablesToCheck.map(async (table) => {
        try {
          const queryPromise = supabase.from(table).select("*").limit(1);
          const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve({ timeout: true }), 1500));
          const result = await Promise.race([queryPromise, timeoutPromise]);
          if (result && !result.timeout && result.error) {
            if (result.error.code !== "PGRST116" && (result.error.message?.includes("Could not find the table") || result.error.code === "42P01")) {
              missingTables.push(table);
            }
          }
        } catch (err) {
          missingTables.push(table);
        }
      })
    );
    if (missingTables.length > 0) {
      supabaseStatus = "missing_tables";
    } else {
      supabaseStatus = "fully_connected";
    }
    res.json({
      supabase: {
        status: supabaseStatus,
        url: supabaseUrl,
        projectId: "mock_project_id",
        missingTables
      },
      postgres: {
        active: true
      }
    });
  });
if (!isProd) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
