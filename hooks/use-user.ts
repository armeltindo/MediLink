"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { UserProfile } from "@/types";

export function useUser() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser || !mounted) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("users_profiles")
        .select("*")
        .eq("id", authUser.id)
        .single();

      if (mounted) {
        setUser(profile);
        setLoading(false);
      }
    }

    loadUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") setUser(null);
      if (event === "SIGNED_IN") loadUser();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}
