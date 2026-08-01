import React, { useRef, useState } from "react";
import Layout from "../components/Layout";
import { Play, Pause, Volume2, VolumeX, Maximize, Clock, SlidersHorizontal, Flower2, HandMetal, ArrowRight, ChevronDown } from "lucide-react";
import { Link } from "wouter";

const VIDEO_URL = "https://files.manuscdn.com/user_upload_by_module/session_file/110672315/ZHSykHMfIopyWRax.mp4";
const KEYFRAME_URL = "https://files.manuscdn.com/user_upload_by_module/session_file/110672315/TYClGWXeyiOPsleQ.png";

const SCRIPT_SECTIONS = [
  {
    time: "0–1.5s",
    title: "The Invitation",
    color: "#00D4AA",
    text: "The 'See It In Action' section is an irresistible invitation. The teal glowing halo and the bioluminescent keyframe signal premium quality. When the cursor hovers over the play button, the user isn't just clicking to watch a video — they are choosing to step into the resonance."
  },
  {
    time: "1.5–3s",
    title: "The Journey Begins",
    color: "#00D4AA",
    text: "As the video auto-plays, we immediately establish the brand's core promise: 'Begin your day in resonance.' The pulsing teal rings and graceful jellyfish create calm and flow. The user feels the soothing effect before hearing a single frequency."
  },
  {
    time: "3–5s",
    title: "The Healing Alarm",
    color: "#8B5CF6",
    text: "The glowing analog clock at 07:00 AM grounds the experience in a daily ritual. Showing '528Hz' and the 'Deep Sleep Wake' sequence communicates advanced functionality instantly. The intensifying teal rings mirror the gentle escalation of our wake-up process."
  },
  {
    time: "5–6.5s",
    title: "Studio & Meditation",
    color: "#F59E0B",
    text: "The large '528 Hz' display and sine wave highlight our precision DDS engine. Then the warm amber glow of the golden lotus shifts the mood from technical precision to deep relaxation — showing the app caters to both the analytical mind and the seeking spirit."
  },
  {
    time: "6.5–8s",
    title: "The Reiki Session",
    color: "#8B5CF6",
    text: "The human silhouette with seven glowing chakra points instantly communicates holistic energy alignment. The 5-phase timeline demonstrates structured, guided healing. As the border shifts to deep purple, we signal the transition into deeper spiritual work."
  },
  {
    time: "8–10s",
    title: "The Mental Map Complete",
    color: "#00D4AA",
    text: "All four feature pills glow simultaneously, leaving the user with a clear visual mental map of the entire app. The final tagline, 'Begin your healing journey today,' paired with the gently pulsing logo, serves as the perfect, low-pressure call to action."
  }
];

const FEATURE_PILLS = [
  { icon: Clock, label: "Healing Alarm", spec: "432Hz · 528Hz · δ→θ→α", color: "#00D4AA" },
  { icon: SlidersHorizontal, label: "Frequency Studio", spec: "1–22,000 Hz · DDS engine", color: "#8B5CF6" },
  { icon: Flower2, label: "Meditation Player", spec: "9 TrueHz tracks · 60 min", color: "#F59E0B" },
  { icon: HandMetal, label: "Reiki Sessions", spec: "5-phase · Crystal & Tibetan", color: "#00D4AA" },
];

export default function SeeItInAction() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [activeSection, setActiveSection] = useState<number | null>(null);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) { videoRef.current.pause(); setPlaying(false); }
    else { videoRef.current.play(); setPlaying(true); }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !muted;
    setMuted(!muted);
  };

  const openFullscreen = () => {
    if (videoRef.current?.requestFullscreen) videoRef.current.requestFullscreen();
  };

  return (
    <Layout>
      <div className="min-h-screen bg-[#0A0B14] text-[#E8EDF5] font-sans overflow-hidden">
        
        {/* Ambient Background */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-radial from-[#00D4AA]/8 to-transparent blur-3xl"></div>
          <div className="absolute bottom-1/4 right-0 w-[600px] h-[600px] bg-radial from-[#8B5CF6]/8 to-transparent blur-3xl"></div>
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-6 py-20">

          {/* Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-[#00D4AA]/10 border border-[#00D4AA]/30 text-[#00D4AA] font-mono text-sm font-bold tracking-widest uppercase mb-8 shadow-[0_0_20px_rgba(0,212,170,0.2)]">
              <div className="w-2 h-2 rounded-full bg-[#00D4AA] shadow-[0_0_10px_#00D4AA]"></div>
              Homepage Feature
            </div>
            <h1 className="font-serif text-5xl md:text-6xl font-bold text-white leading-tight mb-6 drop-shadow-[0_0_40px_rgba(0,212,170,0.3)]">
              See It In Action
            </h1>
            <p className="text-xl text-[#8FA3BF] max-w-2xl mx-auto">
              A 10-second cinematic walkthrough of the complete Rise In Harmony healing practice — from the morning alarm to the Reiki session.
            </p>
          </div>

          {/* Video Player */}
          <div className="relative w-full aspect-video mb-6 group">
            {/* Glow Halo */}
            <div className="absolute -inset-6 bg-gradient-to-br from-[#00D4AA]/30 via-[#8B5CF6]/20 to-[#F59E0B]/15 blur-3xl opacity-60 -z-10 transition-opacity duration-700 group-hover:opacity-90"></div>

            <div className="w-full h-full bg-black border border-[#00D4AA]/40 rounded-xl relative shadow-[0_0_100px_rgba(0,212,170,0.2),0_40px_80px_rgba(0,0,0,0.8)] overflow-hidden">
              {/* Corner Accents */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[#00D4AA] rounded-tl-xl z-20"></div>
              <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-[#00D4AA] rounded-tr-xl z-20"></div>
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-[#00D4AA] rounded-bl-xl z-20"></div>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[#00D4AA] rounded-br-xl z-20"></div>

              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                loop
                muted={muted}
                playsInline
                poster={KEYFRAME_URL}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
              >
                <source src={VIDEO_URL} type="video/mp4" />
              </video>

              {/* Play Overlay */}
              {!playing && (
                <div
                  className="absolute inset-0 flex items-center justify-center z-10 cursor-pointer bg-black/20"
                  onClick={togglePlay}
                >
                  <div className="w-20 h-20 rounded-full bg-[#00D4AA]/20 border-2 border-[#00D4AA]/80 flex items-center justify-center shadow-[0_0_60px_rgba(0,212,170,0.5)] backdrop-blur-sm">
                    <Play className="w-8 h-8 text-[#00D4AA] ml-1" fill="#00D4AA" />
                  </div>
                </div>
              )}

              {/* Controls Bar */}
              <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/80 to-transparent flex items-end px-6 pb-4 gap-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <button onClick={togglePlay} className="text-white hover:text-[#00D4AA] transition-colors">
                  {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>
                <button onClick={toggleMute} className="text-white hover:text-[#00D4AA] transition-colors">
                  {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <div className="flex-1"></div>
                <button onClick={openFullscreen} className="text-white hover:text-[#00D4AA] transition-colors">
                  <Maximize className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Feature Pills */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-20">
            {FEATURE_PILLS.map((pill, i) => (
              <div
                key={i}
                className="bg-white/[0.03] border-t-2 p-5 text-center"
                style={{ borderTopColor: pill.color }}
              >
                <pill.icon className="w-7 h-7 mx-auto mb-3" style={{ color: pill.color }} />
                <div className="text-base font-bold text-white mb-2">{pill.label}</div>
                <div className="font-mono text-xs text-[#8FA3BF] bg-black/40 py-1 px-2 inline-block">{pill.spec}</div>
              </div>
            ))}
          </div>

          {/* Presentation Script */}
          <div className="mb-20">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-10 h-0.5 bg-[#00D4AA]"></div>
              <span className="font-mono text-sm font-bold tracking-widest uppercase text-[#00D4AA]">The Science Behind Each Shot</span>
              <div className="flex-1 h-0.5 bg-white/10"></div>
            </div>

            <div className="space-y-4">
              {SCRIPT_SECTIONS.map((section, i) => (
                <div
                  key={i}
                  className="border border-white/[0.06] bg-white/[0.02] overflow-hidden cursor-pointer hover:border-white/10 transition-colors duration-200"
                  onClick={() => setActiveSection(activeSection === i ? null : i)}
                >
                  <div className="flex items-center gap-5 px-6 py-4">
                    <div
                      className="font-mono text-xs font-bold px-2 py-1 border flex-shrink-0"
                      style={{ color: section.color, borderColor: `${section.color}50`, background: `${section.color}10` }}
                    >
                      {section.time}
                    </div>
                    <div className="text-base font-semibold text-white flex-1">{section.title}</div>
                    <ChevronDown
                      className="w-4 h-4 text-[#8FA3BF] transition-transform duration-200 flex-shrink-0"
                      style={{ transform: activeSection === i ? 'rotate(180deg)' : 'rotate(0deg)' }}
                    />
                  </div>
                  {activeSection === i && (
                    <div className="px-6 pb-5 border-t border-white/[0.06]">
                      <p className="text-[#8FA3BF] leading-relaxed pt-4 font-serif italic text-lg">{section.text}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="text-center border-t border-white/10 pt-16">
            <h2 className="font-serif text-4xl font-bold text-white mb-4">
              Ready to begin your healing journey?
            </h2>
            <p className="text-[#8FA3BF] text-lg mb-10">Start free. Three healing frequencies unlocked immediately.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
              <Link href="/">
                <button className="px-8 py-4 bg-[#00D4AA] hover:bg-[#00B894] text-black font-bold rounded-full transition-all duration-300 shadow-[0_0_30px_rgba(0,212,170,0.4)] hover:shadow-[0_0_50px_rgba(0,212,170,0.6)] flex items-center gap-2">
                  Start Free — No Sign-Up <ArrowRight className="w-5 h-5" />
                </button>
              </Link>
              <Link href="/alarm-features">
                <button className="px-8 py-4 border border-white/20 hover:border-[#00D4AA]/50 text-white font-semibold rounded-full transition-all duration-300 hover:text-[#00D4AA]">
                  All Features →
                </button>
              </Link>
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
}
