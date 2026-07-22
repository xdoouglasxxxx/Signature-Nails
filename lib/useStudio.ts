"use client"

import { useCallback, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"

// Carrega o studio da profissional logada.
// Se ela ainda não criou o studio, manda para o onboarding.
export function useStudio() {
  const [studio, setStudio] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const refresh = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace("/login"); return }
    const { data } = await supabase
      .from("studios").select("*").eq("owner_id", user.id).maybeSingle()
    if (!data) { router.replace("/onboarding"); return }
    setStudio(data)
    setLoading(false)
  }, [router])

  useEffect(() => { refresh() }, [refresh])

  return { studio, loading, refresh }
}
