import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'
import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { ArrowRight, Star, Zap, BookOpen, Users, ShieldCheck, Clock } from 'lucide-react'
import PageLayout from '../components/layout/PageLayout'
import AnimatedSection from '../components/ui/AnimatedSection'

// ── Floating decorative shape ─────────────────────────────────────────────
function FloatShape({ className }) {
  return (
    <motion.div
      animate={{ y: [0, -12, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      className={className}
    />
  )
}

// ── Stat counter ──────────────────────────────────────────────────────────
function StatCard({ number, suffix = '', label, color }) {
  const [ref, inView] = useInView({ triggerOnce: true })
  return (
    <div ref={ref} className="card p-6 text-center sticker-1">
      <motion.div
        className={`font-black text-5xl ${color} mb-1`}
        initial={{ opacity: 0, y: 10 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.4 }}
      >
        {inView ? `${number.toLocaleString()}${suffix}` : '0'}
      </motion.div>
      <p className="font-black text-xs uppercase tracking-widest text-black/60">{label}</p>
    </div>
  )
}

// ── Feature card ──────────────────────────────────────────────────────────
function FeatureCard({ icon, title, desc, color, delay }) {
  return (
    <AnimatedSection delay={delay}>
      <motion.div
        whileHover={{ y: -4, boxShadow: '12px 12px 0px 0px #000' }}
        transition={{ duration: 0.15 }}
        className="card p-6 h-full"
        style={{ boxShadow: '8px 8px 0px 0px #000' }}
      >
        <div className={`inline-flex p-3 border-4 border-black mb-4 ${color}`}>
          {icon}
        </div>
        <h3 className="font-black text-lg uppercase mb-2">{title}</h3>
        <p className="font-bold text-sm text-black/70 leading-relaxed">{desc}</p>
      </motion.div>
    </AnimatedSection>
  )
}

// ── How it works step ─────────────────────────────────────────────────────
function Step({ num, title, desc, delay }) {
  return (
    <AnimatedSection delay={delay} direction="up">
      <div className="flex gap-4">
        <div className="flex-shrink-0 w-12 h-12 bg-neo-accent border-4 border-black shadow-neo-sm font-black text-white text-xl flex items-center justify-center">
          {num}
        </div>
        <div>
          <h3 className="font-black text-base uppercase mb-1">{title}</h3>
          <p className="font-bold text-sm text-black/70 leading-relaxed">{desc}</p>
        </div>
      </div>
    </AnimatedSection>
  )
}

const MARQUEE_TAGS = [
  'CSE221','EEE305','MAT101','PHY101','ENG201','BUS301','LAW201',
  'CSE340','ECO102','ARC201','BTE302','MIC401','CST304','MGT421',
]

export default function Landing() {
  const { userDoc } = useAuth()
  return (
    <PageLayout>
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative border-b-4 border-black overflow-hidden bg-neo-bg">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-dots opacity-[0.06] pointer-events-none" />

        {/* Floating shapes */}
        <FloatShape className="absolute top-12 right-[8%] w-20 h-20 bg-neo-secondary border-4 border-black rotate-12 hidden lg:block" />
        <FloatShape className="absolute bottom-16 right-[20%] w-14 h-14 bg-neo-muted border-4 border-black -rotate-6 hidden lg:block" />
        <FloatShape className="absolute top-1/2 right-[5%] w-10 h-10 bg-neo-accent border-4 border-black rotate-45 hidden xl:block" />

        <div className="page-container py-20 md:py-28 lg:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left — copy */}
            <div>
              {/* Pre-headline badge */}
              <motion.div
                initial={{ rotate: -3, scale: 0.9, opacity: 0 }}
                animate={{ rotate: -2, scale: 1, opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="inline-flex items-center gap-2 bg-neo-secondary border-4 border-black shadow-neo-sm px-4 py-2 mb-6 font-black text-xs uppercase tracking-widest"
              >
                <Zap className="h-3 w-3" strokeWidth={3} fill="currentColor" />
                100% Free · No Credit Card
              </motion.div>

              {/* Main headline */}
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="font-black text-5xl sm:text-6xl lg:text-7xl leading-[0.9] tracking-tighter mb-6"
              >
                Find Someone
                <br />
                <span className="inline-block bg-neo-accent text-white px-3 py-1 border-4 border-black shadow-neo-md mt-2 rotate-1">
                  Who Can Help.
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="font-bold text-lg text-black/70 mb-8 max-w-lg leading-relaxed"
              >
                Gotcha connects you with students and experts who offer <strong className="text-black">free consultations</strong> for your exact course. Book a session, get help, move forward.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
                className="flex flex-col sm:flex-row gap-3"
              >
                <Link to="/find" className="btn btn-primary btn-lg">
                  Find a Consultant <ArrowRight className="h-5 w-5" strokeWidth={3} />
                </Link>
                <Link to="/register" className="btn btn-outline btn-lg">
                  Offer Help Free
                </Link>
              </motion.div>
            </div>

            {/* Right — visual stack */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="relative hidden lg:block"
            >
              {/* Main card */}
              <div className="card p-6 shadow-neo-xl relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-neo-muted border-4 border-black font-black text-lg flex items-center justify-center">AK</div>
                  <div>
                    <p className="font-black text-base uppercase">Ariful Karim</p>
                    <span className="badge-green badge text-[10px]">● Available Now</span>
                  </div>
                  <div className="ml-auto badge-yellow badge">FREE</div>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {['CSE221', 'CSE340', 'MAT101'].map(c => (
                    <span key={c} className="badge badge-muted">{c}</span>
                  ))}
                </div>
                <p className="font-bold text-sm text-black/60 mb-4">
                  "I love helping juniors crack Data Structures. DM me anytime!"
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map(i => <Star key={i} className="h-4 w-4 fill-neo-secondary" strokeWidth={0} />)}
                    <span className="font-black text-sm ml-1">5.0</span>
                  </div>
                  <button className="btn btn-primary btn-sm">Book Now</button>
                </div>
              </div>
              {/* Stacked behind */}
              <div className="absolute top-4 left-4 w-full h-full bg-neo-secondary border-4 border-black -z-0" />
              <div className="absolute top-8 left-8 w-full h-full bg-neo-muted border-4 border-black -z-10" />

              {/* Floating "GOTCHA" badge */}
              <motion.div
                animate={{ rotate: [3, 6, 3] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -top-6 -right-6 bg-neo-accent text-white border-4 border-black shadow-neo-md px-4 py-2 font-black text-sm uppercase tracking-widest rotate-3 z-20"
              >
                ✦ Gotcha!
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Course ticker ─────────────────────────────────────────────── */}
      <div className="border-b-4 border-black bg-neo-muted py-3 overflow-hidden">
        <div className="flex animate-marquee whitespace-nowrap">
          {[...MARQUEE_TAGS, ...MARQUEE_TAGS, ...MARQUEE_TAGS].map((tag, i) => (
            <span key={i} className="mx-5 font-black text-xs uppercase tracking-widest inline-flex items-center gap-2 flex-shrink-0">
              <span className="w-2 h-2 bg-black rounded-full inline-block" /> {tag}
            </span>
          ))}
        </div>
      </div>

      {/* ── Stats ────────────────────────────────────────────────────── */}
      <section className="border-b-4 border-black bg-white">
        <div className="page-container py-16">
          <AnimatedSection className="text-center mb-10">
            <h2 className="font-black text-4xl uppercase tracking-tight">
              Built for <span className="bg-neo-secondary px-2 border-4 border-black">Students</span>
            </h2>
          </AnimatedSection>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard number={500}  suffix="+"  label="Course Codes"     color="text-neo-accent" />
            <StatCard number={100}  suffix="%"  label="Free Sessions"    color="text-black" />
            <StatCard number={0}    suffix=""   label="Platform Fees"    color="text-neo-accent" />
            <StatCard number={24}   suffix="/7" label="Find Help"        color="text-black" />
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────── */}
      <section className="border-b-4 border-black bg-neo-bg">
        <div className="page-container py-20">
          <AnimatedSection className="mb-12">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <h2 className="font-black text-5xl uppercase tracking-tighter leading-none">
                Why<br /><span className="text-neo-accent">Gotcha?</span>
              </h2>
              <p className="font-bold text-black/60 max-w-xs text-sm leading-relaxed">
                Everything you need to find help, schedule sessions, and connect with experts — right in your browser.
              </p>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard delay={0}    icon={<BookOpen className="h-7 w-7" strokeWidth={3} />} color="bg-neo-secondary" title="500+ Courses"  desc="Filter by exact course code. CSE221, EEE305, MAT101 — we have them all." />
            <FeatureCard delay={0.05} icon={<Zap      className="h-7 w-7" strokeWidth={3} />} color="bg-neo-accent text-white" title="Instant Booking" desc="Send a request in seconds. Choose your time, topic, and duration." />
            <FeatureCard delay={0.1}  icon={<Users    className="h-7 w-7" strokeWidth={3} />} color="bg-neo-muted" title="Peer-to-Peer"  desc="Real students and alumni helping each other. No corporate tutors." />
            <FeatureCard delay={0.15} icon={<ShieldCheck className="h-7 w-7" strokeWidth={3} />} color="bg-neo-green" title="Verified Users" desc="Email verification required for all bookings. Safe and accountable." />
            <FeatureCard delay={0.2}  icon={<Clock    className="h-7 w-7" strokeWidth={3} />} color="bg-neo-secondary" title="Your Schedule" desc="Consultants set their own availability. You see only open slots." />
            <FeatureCard delay={0.25} icon={<Star     className="h-7 w-7" strokeWidth={3} />} color="bg-neo-accent text-white" title="Rated & Reviewed" desc="Leave honest reviews after sessions. Find the best helpers fast." />
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section className="border-b-4 border-black bg-neo-secondary">
        <div className="page-container py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <AnimatedSection direction="right">
              <h2 className="font-black text-5xl uppercase tracking-tighter leading-none mb-4">
                How It<br />Works
              </h2>
              <p className="font-bold text-black/70 text-sm leading-relaxed mb-8 max-w-sm">
                From zero to booked in under 2 minutes. No credit card, no subscription, no hassle.
              </p>
              <Link to="/register" className="btn btn-black btn-lg">
                Start Now <ArrowRight className="h-5 w-5" strokeWidth={3} />
              </Link>
            </AnimatedSection>

            <div className="flex flex-col gap-6">
              <Step num="1" title="Create your account"     desc="Sign up free with your email. Verify it to unlock booking." delay={0} />
              <Step num="2" title="Find a consultant"       desc="Search by course code, filter by availability, rating, and price." delay={0.08} />
              <Step num="3" title="Book a session"          desc="Pick a time slot, describe your topic, and send the request." delay={0.16} />
              <Step num="4" title="Get help — for free"     desc="Accepted? You get the consultant's WhatsApp link. Connect and learn." delay={0.24} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Become a consultant CTA ───────────────────────────────────── */}
      <section className="border-b-4 border-black bg-black text-white">
        <div className="page-container py-20 text-center">
          <AnimatedSection>
            <motion.div
              animate={{ rotate: [0, 1, -1, 0] }}
              transition={{ duration: 6, repeat: Infinity }}
              className="inline-flex items-center gap-2 bg-neo-secondary text-black border-4 border-white shadow-neo-white px-5 py-2 font-black text-xs uppercase tracking-widest mb-6 -rotate-1"
            >
              <Star className="h-3 w-3 fill-black" strokeWidth={0} />
              Share Your Knowledge
            </motion.div>
            <h2 className="font-black text-5xl md:text-6xl uppercase tracking-tighter leading-none mb-4">
              Know Your Stuff?<br />
              <span className="text-neo-accent">Help Others.</span>
            </h2>
            <p className="font-bold text-white/70 text-lg max-w-xl mx-auto mb-8 leading-relaxed">
              Become a free consultant. Set your own availability, pick your courses, and help your peers succeed.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/become-consultant" className="btn bg-neo-secondary text-black border-4 border-white shadow-neo-white btn-lg hover:bg-yellow-300">
                {userDoc?.isConsultant ? 'Update Consultancy Profile' : 'Become a Consultant'}
              </Link>
              <Link to="/find" className="btn bg-transparent text-white border-4 border-white hover:bg-white hover:text-black btn-lg">
                Find Help Instead
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </PageLayout>
  )
}
