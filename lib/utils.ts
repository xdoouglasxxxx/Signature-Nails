import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const brl = (v: any) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

export const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number)
  return h * 60 + m
}

export const minToHHMM = (t: number) =>
  `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`

export const toISO = (d: Date) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export const slugify = (s: string) =>
  s.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim().replace(/\s+/g, "-").replace(/-+/g, "-")
    .slice(0, 40)

export const DEFAULT_WH: any = {
  "0": null,
  "1": { start: "09:00", end: "19:00" },
  "2": { start: "09:00", end: "19:00" },
  "3": { start: "09:00", end: "19:00" },
  "4": { start: "09:00", end: "19:00" },
  "5": { start: "09:00", end: "19:00" },
  "6": { start: "09:00", end: "17:00" },
}
