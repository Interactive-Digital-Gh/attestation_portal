// @ts-types is not needed at deploy time — Deno globals are available in the runtime.
// To fully resolve Deno types in your IDE, install the official "Deno" VS Code extension
// and create a .vscode/settings.json that scopes it to this folder (see below).



// deno-lint-ignore-file
/* eslint-disable @typescript-eslint/no-namespace */
declare namespace Deno {
  export interface Env {
    get(key: string): string | undefined;
  }
  export const env: Env;
  export function serve(
    handler: (req: Request) => Response | Promise<Response>,
  ): void;
}

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── 1. Verify the caller is an authenticated admin ──────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Decode the caller's JWT to get their user id
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user: caller },
      error: callerError,
    } = await adminClient.auth.getUser(token);

    if (callerError || !caller) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check caller's profile — must be admin
    const { data: callerProfile } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .single();

    if (!callerProfile || callerProfile.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Only admins can create staff users" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 2. Parse the request body ───────────────────────────────────
    const { email, fullName, role, department, temporaryPassword } =
      await req.json();

    if (!email || !fullName || !role || !temporaryPassword) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: email, fullName, role, temporaryPassword",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validRoles = ["officer", "director", "admin"];
    if (!validRoles.includes(role)) {
      return new Response(
        JSON.stringify({ error: `Invalid role. Must be one of: ${validRoles.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 3. Create the auth user ─────────────────────────────────────
    const { data: newUser, error: createError } =
      await adminClient.auth.admin.createUser({
        email,
        password: temporaryPassword,
        email_confirm: true, // Auto-confirm so they can log in immediately
        user_metadata: {
          full_name: fullName,
        },
      });

    if (createError) {
      // Handle "user already exists" gracefully
      if (
        createError.message?.includes("already been registered") ||
        createError.message?.includes("already exists")
      ) {
        // User exists in auth — update their profile instead
        const { data: existingUsers } =
          await adminClient.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(
          (u: { email?: string }) => u.email === email
        );

        if (existingUser) {
          const { error: upsertError } = await adminClient
            .from("profiles")
            .upsert(
              {
                id: existingUser.id,
                email,
                full_name: fullName,
                role,
                department: department || null,
                status: "Active",
                created_by: caller.id,
              },
              { onConflict: "id" }
            );

          if (upsertError) {
            return new Response(
              JSON.stringify({
                error: `User exists in auth but profile update failed: ${upsertError.message}`,
              }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          // Log audit
          await adminClient.from("audit_logs").insert({
            category: "User",
            action: `Staff role updated: ${fullName} → ${role}`,
            actor_id: caller.id,
            actor_name: callerProfile.role,
            reference_id: existingUser.id,
          });

          return new Response(
            JSON.stringify({
              success: true,
              userId: existingUser.id,
              message: `User already existed — profile updated to ${role}.`,
              isExisting: true,
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 4. Upsert the profiles row ──────────────────────────────────
    const { error: profileError } = await adminClient.from("profiles").upsert(
      {
        id: newUser.user.id,
        email,
        full_name: fullName,
        role,
        department: department || null,
        status: "Active",
        created_by: caller.id,
      },
      { onConflict: "id" }
    );

    if (profileError) {
      return new Response(
        JSON.stringify({
          error: `Auth user created but profile insert failed: ${profileError.message}`,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 5. Audit log ────────────────────────────────────────────────
    await adminClient.from("audit_logs").insert({
      category: "User",
      action: `Staff user created: ${fullName} as ${role}`,
      actor_id: caller.id,
      actor_name: callerProfile.role,
      reference_id: newUser.user.id,
    });

    // ── 6. Return success ───────────────────────────────────────────
    return new Response(
      JSON.stringify({
        success: true,
        userId: newUser.user.id,
        message: `${fullName} created as ${role} successfully.`,
        isExisting: false,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
