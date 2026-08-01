import React from "react";
import Layout from "../components/Layout";
import { Play, Clock, SlidersHorizontal, Flower2, HandMetal, ArrowRight } from "lucide-react";
import { Link } from "wouter";

export default function HomepageShowcase() {
  const VIDEO_URL = "https://files.manuscdn.com/user_upload_by_module/session_file/110672315/mCaWrgZfYdOOQVKS.mp4"; // Homepage user journey video
  const KEYFRAME_URL = "https://files.manuscdn.com/user_upload_by_module/session_file/110672315/ogogFVfpAWOFjhwM.png"; // Using the walkthrough keyframe

  return (
    <Layout>
      <div className="min-h-screen bg-[#0A0B14] text-[#E8EDF5] font-sans selection:bg-[#00D4AA]/30 selection:text-[#00D4AA] overflow-hidden">
        
        {/* Ambient Background */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-radial from-[#00D4AA]/10 to-transparent opacity-50 blur-3xl mix-blend-screen"></div>
          <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-radial from-[#8B5CF6]/10 to-transparent opacity-40 blur-3xl mix-blend-screen"></div>
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-24">
          
          {/* Header */}
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-[#00D4AA]/10 border border-[#00D4AA]/30 text-[#00D4AA] font-mono text-sm font-bold tracking-widest uppercase mb-8 shadow-[0_0_20px_rgba(0,212,170,0.2)]">
              <div className="w-2 h-2 rounded-full bg-[#00D4AA] animate-[pulse_2s_ease-in-out_infinite] shadow-[0_0_10px_#00D4AA]"></div>
              Homepage Redesign
            </div>
            <h1 className="font-serif text-5xl md:text-7xl font-bold text-white leading-tight mb-6 drop-shadow-[0_0_40px_rgba(0,212,170,0.3)]">
              The Homepage That Shows<br />
              <span className="text-[#00D4AA] italic font-light">Before It Tells</span>
            </h1>
            <p className="text-xl text-[#8FA3BF] max-w-2xl mx-auto font-medium tracking-wide">
              A deep dive into the new "See It In Action" section — designed to convert on emotion and visual proof before asking for trust.
            </p>
          </div>

          {/* See It In Action Section Showcase */}
          <div className="mb-32">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-3 font-mono text-sm font-bold tracking-widest uppercase text-[#00D4AA] mb-4">
                <div className="w-10 h-0.5 bg-[#00D4AA]"></div>
                See It In Action
                <div className="w-10 h-0.5 bg-[#00D4AA]"></div>
              </div>
              <h2 className="font-serif text-4xl font-bold text-white">Your complete healing practice, <span className="italic font-light">in one app.</span></h2>
            </div>

            {/* Video Player */}
            <div className="relative w-full max-w-4xl mx-auto aspect-video mb-16 group">
              {/* Glow Halo */}
              <div className="absolute -inset-4 bg-gradient-to-br from-[#00D4AA]/40 via-[#8B5CF6]/30 to-[#F59E0B]/20 blur-2xl opacity-60 rounded-2xl -z-10 transition-opacity duration-700 group-hover:opacity-80"></div>
              
              <div className="w-full h-full bg-black border border-[#00D4AA]/30 rounded-lg relative shadow-[0_0_80px_rgba(0,212,170,0.15),0_40px_80px_rgba(0,0,0,0.6)] overflow-hidden">
                {/* Corner Accents */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#00D4AA] rounded-tl-lg z-20"></div>
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-[#00D4AA] rounded-tr-lg z-20"></div>
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-[#00D4AA] rounded-bl-lg z-20"></div>
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#00D4AA] rounded-br-lg z-20"></div>
                
                <video 
                  className="w-full h-full object-cover relative z-10"
                  autoPlay 
                  loop 
                  muted 
                  playsInline
                  controls
                  poster={KEYFRAME_URL}
                >
                  <source src={VIDEO_URL} type="video/mp4" />
                </video>
              </div>
            </div>

            {/* Feature Pills */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {/* Pill 1 */}
              <div className="bg-white/5 border-t-2 border-[#00D4AA] p-6 text-center hover:bg-white/10 transition-colors duration-300">
                <Clock className="w-8 h-8 text-[#00D4AA] mx-auto mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">Healing Alarm</h3>
                <div className="font-mono text-xs text-[#8FA3BF] bg-black/40 py-1 px-3 inline-block">432Hz · 528Hz · δ→θ→α</div>
              </div>
              
              {/* Pill 2 */}
              <div className="bg-white/5 border-t-2 border-[#8B5CF6] p-6 text-center hover:bg-white/10 transition-colors duration-300">
                <SlidersHorizontal className="w-8 h-8 text-[#8B5CF6] mx-auto mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">Frequency Studio</h3>
                <div className="font-mono text-xs text-[#8FA3BF] bg-black/40 py-1 px-3 inline-block">1–22,000 Hz · DDS engine</div>
              </div>
              
              {/* Pill 3 */}
              <div className="bg-white/5 border-t-2 border-[#F59E0B] p-6 text-center hover:bg-white/10 transition-colors duration-300">
                <Flower2 className="w-8 h-8 text-[#F59E0B] mx-auto mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">Meditation Player</h3>
                <div className="font-mono text-xs text-[#8FA3BF] bg-black/40 py-1 px-3 inline-block">9 TrueHz tracks · 60 min</div>
              </div>
              
              {/* Pill 4 */}
              <div className="bg-white/5 border-t-2 border-[#00D4AA] p-6 text-center hover:bg-white/10 transition-colors duration-300">
                <HandMetal className="w-8 h-8 text-[#00D4AA] mx-auto mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">Reiki Sessions</h3>
                <div className="font-mono text-xs text-[#8FA3BF] bg-black/40 py-1 px-3 inline-block">5-phase · Crystal & Tibetan</div>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center border-t border-white/10 pt-16 mt-16">
            <h2 className="font-serif text-4xl font-bold text-white mb-8">Experience the journey.</h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Link href="/">
                <button className="px-8 py-4 bg-[#00D4AA] hover:bg-[#00B894] text-black font-bold rounded-full transition-all duration-300 shadow-[0_0_30px_rgba(0,212,170,0.4)] hover:shadow-[0_0_50px_rgba(0,212,170,0.6)] hover:-translate-y-1 flex items-center gap-2">
                  View Live Homepage <ArrowRight className="w-5 h-5" />
                </button>
              </Link>
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
}
