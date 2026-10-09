import { Link } from 'react-router-dom'
import { Star } from 'lucide-react'

const footerLinks = [
  { label: 'Find Consultants', to: '/find' },
  { label: 'Become a Consultant', to: '/become-consultant' },
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Profile', to: '/profile' },
]

const marqueeItems = [
  'FREE CONSULTATIONS', 'FIND YOUR EXPERT', 'HELP EACH OTHER',
  'GOTCHA', 'BOOK IN SECONDS', 'NO CREDIT CARD',
]

export default function Footer() {
  return (
    <footer className="border-t-4 border-black mt-auto">
      {/* Marquee strip */}
      <div className="bg-neo-secondary border-b-4 border-black py-3 overflow-hidden">
        <div className="flex animate-marquee whitespace-nowrap">
          {[...marqueeItems, ...marqueeItems, ...marqueeItems].map((item, i) => (
            <span key={i} className="mx-6 font-black text-sm uppercase tracking-widest inline-flex items-center gap-2 flex-shrink-0">
              <Star className="h-3 w-3 fill-black" strokeWidth={0} />
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* Main footer */}
      <div className="bg-black text-white">
        <div className="page-container py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Brand */}
            <div>
              <div className="inline-flex items-center justify-center w-16 h-16 bg-neo-accent border-4 border-white shadow-[6px_6px_0px_0px_#FF6B6B] font-black text-white text-3xl mb-4">
                G.
              </div>
              <p className="font-bold text-white/80 text-sm leading-relaxed max-w-xs">
                A free peer-to-peer consultation marketplace. Find help, share knowledge, get things done — no fees, ever.
              </p>
            </div>

            {/* Links */}
            <div>
              <h3 className="font-black text-xs uppercase tracking-widest text-neo-secondary border-b-2 border-white/20 pb-2 mb-4">
                Navigate
              </h3>
              <ul className="space-y-2">
                {footerLinks.map(({ label, to }) => (
                  <li key={to}>
                    <Link
                      to={to}
                      className="font-bold text-sm text-white/70 hover:text-neo-secondary transition-colors duration-100 uppercase tracking-wide"
                    >
                      → {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA */}
            <div>
              <h3 className="font-black text-xs uppercase tracking-widest text-neo-secondary border-b-2 border-white/20 pb-2 mb-4">
                Get Started
              </h3>
              <p className="font-bold text-white/70 text-sm mb-4">
                Join thousands of students helping each other succeed.
              </p>
              <Link
                to="/register"
                className="btn bg-neo-secondary text-black border-4 border-white shadow-[4px_4px_0px_0px_#fff] hover:bg-yellow-300 btn-sm"
              >
                Sign Up Free →
              </Link>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t-2 border-white/20 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="font-bold text-white/50 text-xs uppercase tracking-widest">
              © {new Date().getFullYear()} Gotcha. All rights reserved.
            </p>
            <p className="font-bold text-white/50 text-xs uppercase tracking-widest">
              Free forever. No cloud functions. No paid APIs.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
