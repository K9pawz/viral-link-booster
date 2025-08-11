import React, { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { createClient } from "@supabase/supabase-js";
import {
  Share2,
  Copy,
  Check,
  Instagram,
  Heart,
  Users,
  Gift,
  Link as LinkIcon,
  Sparkles,
  Trophy,
  ShieldQuestion,
  Loader2,
  PencilLine,
  Timer as TimerIcon,
} from "lucide-react";

// ==== CONFIG ====
const INSTAGRAM_REEL_URL = "https://www.instagram.com/reel/DNKzp-rz11G/?igsh=a2ZjbDZ1anB0OXh2";
const BRAND = "K9PAWz";
const BRAND_TAG = "#k9pawz";
const UTM_SOURCE = "viral-microsite";
const PRIMARY_HEX = "#111827"; // slate-900
const ACCENT_HEX = "#0ea5e9"; // sky-500
const COUNTDOWN_TARGET = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 7, 20, 0, 0);

// Giveaway prizes rotation
const GIVEAWAY_PRIZES = ["brush", "leash", "accessory"];

// ==== SUPABASE ====
const SUPABASE_URL = "https://dgvejptfwhyxaoiuklul.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRndmVqcHRmd2h5eGFvaXVrbHVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MTgzMTAsImV4cCI6MjA3MDQ5NDMxMH0.NRONPh2YlyCU-8j3yvuuG3yz40hSwysnbhdQkkMUIMY";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

export default function ViralLinkBooster() {
  const [copied, setCopied] = useState(false);
  const [referrals, setReferrals] = useState(0);
  const [adminData, setAdminData] = useState([]);
  const [loadingAdmin, setLoadingAdmin] = useState(false);
  const [adminMode, setAdminMode] = useState(false);

  // Countdown state
  const [countdown, setCountdown] = useState(getCountdownParts(COUNTDOWN_TARGET));

  // Giveaway prize rotation state
  const [currentPrize, setCurrentPrize] = useState(GIVEAWAY_PRIZES[0]);
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPrize(prev => {
        const currentIndex = GIVEAWAY_PRIZES.indexOf(prev);
        const nextIndex = (currentIndex + 1) % GIVEAWAY_PRIZES.length;
        return GIVEAWAY_PRIZES[nextIndex];
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Referral code + session id
  const myRef = useMemo(() => ensureCode("vlb_my_ref"), []);
  const sessionId = useMemo(() => ensureCode("vlb_session_id"), []);

  // Log referral if ?ref present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const referredBy = params.get("ref");
    const isAdmin = params.get("admin") === "1";
    setAdminMode(isAdmin);

    if (referredBy) {
      const dedupeKey = `vlb_logged_${referredBy}_${sessionId}`;
      if (!localStorage.getItem(dedupeKey)) {
        localStorage.setItem(dedupeKey, "1");
        logReferral({ ref_code: referredBy, session_id: sessionId });
      }
    }
    refreshMyReferrals();
  }, [sessionId, myRef]);

  // Countdown tick
  useEffect(() => {
    const t = setInterval(() => setCountdown(getCountdownParts(COUNTDOWN_TARGET)), 1000);
    return () => clearInterval(t);
  }, []);

  // URLs
  const myPageUrl = useMemo(() => withParam(window.location.href, "ref", myRef), [myRef]);
  const trackedReelUrl = useMemo(() => buildTrackedReel(INSTAGRAM_REEL_URL, UTM_SOURCE, myRef), [myRef]);

  // Share messages
  const shareText = `${BRAND} reel you must see → ${trackedReelUrl} \n\nFollow for more & drop your thoughts! ${BRAND_TAG}`;
  const messageVariants = useMemo(() => buildMessageVariants({ brand: BRAND, brandTag: BRAND_TAG, trackedReelUrl, myPageUrl }), [trackedReelUrl, myPageUrl]);

  async function logReferral({ ref_code, session_id }) {
    try {
      await supabase.from("referrals").insert({ ref_code, page_url: window.location.href, user_agent: navigator.userAgent, session_id });
    } catch (e) {
      console.error("Supabase insert failed", e);
    }
  }

  async function refreshMyReferrals() {
    try {
      const { data, error } = await supabase.from("referrals").select("id").eq("ref_code", myRef);
      if (!error && Array.isArray(data)) setReferrals(data.length);
    } catch {}
  }

  async function loadAdmin() {
    setLoadingAdmin(true);
    try {
      const { data, error } = await supabase.from("referrals").select("ref_code");
      if (error) throw error;
      const counts = {};
      (data || []).forEach(r => {
        counts[r.ref_code] = (counts[r.ref_code] || 0) + 1;
      });
      const rows = Object.entries(counts)
        .map(([code, clicks]) => ({ code, clicks }))
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 50);
      setAdminData(rows);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAdmin(false);
    }
  }

  const copyPromo = async (txt) => {
    try {
      await navigator.clipboard.writeText(txt || shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      console.error(e);
    }
  };

  const doWebShare = async () => {
    const payload = { title: `${BRAND} Reel`, text: shareText, url: myPageUrl };
    if (navigator.share) {
      try { await navigator.share(payload); } catch {}
    } else { copyPromo(); }
  };

  const waHref = `https://wa.me/?text=${encodeURIComponent(shareText + "\n" + myPageUrl)}`;
  const xHref = `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(myPageUrl)}`;
  const tgHref = `https://t.me/share/url?url=${encodeURIComponent(myPageUrl)}&text=${encodeURIComponent(shareText)}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 text-slate-900">
      <div className="max-w-3xl mx-auto p-5 sm:p-8">
        {/* Header */}
        <motion.header initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="flex items-center gap-3">
          <Sparkles className="w-6 h-6" style={{ color: ACCENT_HEX }} />
          <h1 className="text-2xl sm:text-3xl font-semibold">K9PAWz Viral Loop 🚀</h1>
        </motion.header>

        {/* Countdown */}
        <div className="mt-4 bg-sky-50 border border-sky-200 rounded-2xl p-4 flex items-center gap-3">
          <TimerIcon className="w-5 h-5" />
          <div>
            <p className="text-sm font-medium">Next drop in</p>
            <p className="font-semibold text-lg tabular-nums">{fmtCountdown(countdown)}</p>
          </div>
        </div>

        {/* Hero Card */}
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }} className="mt-6">
          <div className="bg-white rounded-2xl shadow-lg p-5 sm:p-6 border border-slate-100">
            <div className="flex flex-col sm:flex-row gap-5">
              {/* Reel Preview */}
              <div className="sm:w-1/2 w-full">
                <div className="aspect-[9/16] bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center">
                  <div className="text-center p-4">
                    <Instagram className="w-10 h-10 mx-auto mb-3" style={{ color: PRIMARY_HEX }} />
                    <p className="font-medium">Watch the Reel on Instagram</p>
                    <a href={trackedReelUrl} target="_blank" rel="noreferrer" className="inline-block mt-3 px-4 py-2 rounded-xl text-white" style={{ backgroundColor: PRIMARY_HEX }}>Open Reel</a>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <div className="sm:w-1/2 w-full flex flex-col justify-between">
                <div>
                  <h2 className="text-xl font-semibold">1) Follow · 2) Comment · 3) Share</h2>
                  <p className="mt-2 text-slate-600">Invite pet parents. Your unique code links friends back here:</p>

                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-sm font-mono bg-slate-100 px-2 py-1 rounded">{myRef}</span>
                    <a href={trackedReelUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-slate-700 hover:text-slate-900">
                      <LinkIcon className="w-4 h-4" /> Reel Link
                    </a>
                  </div>

                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                    <Gift className="w-5 h-5 mt-0.5" />
                    <div>
                      <p className="font-medium">Giveaway</p>
                      <p className="text-sm text-amber-800">
                        Win a free {currentPrize}! Share this page to enter. More referrals = more chances.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-5">
                  <button onClick={doWebShare} className="px-3 py-2 rounded-2xl text-white flex items-center justify-center gap-2" style={{ backgroundColor: PRIMARY_HEX }}>
                    <Share2 className="w-4 h-4" /> Share
                  </button>
                  <a href={waHref} target="_blank" rel="noreferrer" className="px-3 py-2 rounded-2xl text-white flex items-center justify-center gap-2" style={{ backgroundColor: "#22c55e" }}>
                    <Share2 className="w-4 h-4" /> WhatsApp
                  </a>
                  <a href={xHref} target="_blank" rel="noreferrer" className="px-3 py-2 rounded-2xl text-white flex items-center justify-center gap-2" style={{ backgroundColor: "#000" }}>
                    <Share2 className="w-4 h-4" /> X
                  </a>
                  <a href={tgHref} target="_blank" rel="noreferrer" className="px-3 py-2 rounded-2xl text-white flex items-center justify-center gap-2" style={{ backgroundColor: "#2563eb" }}>
                    <Share2 className="w-4 h-4" /> Telegram
                  </a>
                </div>

                <div className="mt-3">
                  <button onClick={() => copyPromo()} className="px-3 py-2 rounded-2xl bg-white border flex items-center gap-2">
                    {copied ? <Check className="w-4 h-4 text-emerald-600"/> : <Copy className="w-4 h-4"/>}
                    {copied ? "Copied! Share it anywhere" : "Copy promo text"}
                  </button>
                  <p className="text-xs text-slate-500 mt-2">Paste in WhatsApp/Telegram groups, Stories, YouTube descriptions, LinkedIn posts, etc.</p>
                </div>
              </div>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
}

// ---- helpers ----
function ensureCode(key) {
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const code = Math.random().toString(36).slice(2, 8).toUpperCase();
  localStorage.setItem(key, code);
  return code;
}

function withParam(urlStr, k, v) {
  const url = new URL(urlStr);
  url.searchParams.set(k, v);
  return url.toString();
}

function buildTrackedReel(base, source, ref) {
  const url = new URL(base);
  url.searchParams.set("utm_source", source);
  url.searchParams.set("utm_medium", "share");
  url.searchParams.set("utm_campaign", "viral-loop");
  url.searchParams.set("ref", ref);
  return url.toString();
}

function getCountdownParts(target) {
  const now = new Date().getTime();
  const t = target.getTime() - now;
  const clamp = Math.max(0, t);
  const days = Math.floor(clamp / (1000 * 60 * 60 * 24));
  const hours = Math.floor((clamp % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((clamp % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((clamp % (1000 * 60)) / 1000);
  return { days, hours, minutes, seconds };
}

function fmtCountdown({ days, hours, minutes, seconds }) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
}

function buildMessageVariants({ brand, brandTag, trackedReelUrl, myPageUrl }) {
  return [
    `Stop scrolling → this reel! ${trackedReelUrl}\n\nFollow ${brand} for more. ${brandTag}`,
    `This changed how I see pets 🐶🐱 Watch: ${trackedReelUrl}\n\nShare + tag a friend. ${brandTag}`,
    `Quick 10s tip for pet parents → ${trackedReelUrl}\n\nDrop a ❤️ if helpful! ${brandTag}`,
    `POV: your pet’s next outfit picks itself. Reel: ${trackedReelUrl} ${brandTag}`,
    `If you love pets, watch till the end → ${trackedReelUrl}\n\nSave this & follow ${brand}! ${brandTag}`,
    `Help me test this: open, like, comment one word → ${trackedReelUrl}\n\nRef link: ${myPageUrl}`,
    `Need your opinion! Is this a hit or meh? ${trackedReelUrl} ${brandTag}`,
    `60-sec hack every pet parent should know → ${trackedReelUrl}\n\nShare to your group. ${brandTag}`,
    `We’re picking 5 winners this week 🎁 Watch & share → ${trackedReelUrl}\n\nEnter here: ${myPageUrl}`,
    `Honest review in one reel. Watch now: ${trackedReelUrl}\n\nFollow for more no-fluff tips. ${brandTag}`,
  ];
}

