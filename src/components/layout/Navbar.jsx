import { useState, useEffect } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Bell, LogOut, User, LayoutDashboard, Shield, BookOpen, Search } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import Avatar from '../ui/Avatar'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../../lib/firebase'

export default function Navbar() {
  const { firebaseUser, userDoc, isAdmin, logout, isLoggedIn } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const navigate = useNavigate()

  // Listen to unread notifications (owner-only, tiny subcollection — safe)
  useEffect(() => {
    if (!firebaseUser) { setUnreadCount(0); return }
    const q = query(
      collection(db, 'notifications', firebaseUser.uid, 'items'),
      where('read', '==', false)
    )
    const unsub = onSnapshot(q, snap => setUnreadCount(snap.size))
    return unsub
  }, [firebaseUser])

  const handleLogout = async () => {
    setMenuOpen(false)
    setUserMenuOpen(false)
    await logout()
    navigate('/')
  }

  const navLinks = isLoggedIn
    ? [
        { to: '/find', label: 'Find Help', icon: <Search className="h-4 w-4" strokeWidth={3} /> },
        { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" strokeWidth={3} /> },
        { to: '/my-consultations', label: 'Sessions', icon: <BookOpen className="h-4 w-4" strokeWidth={3} /> },
      ]
    : [
        { to: '/find', label: 'Find Help', icon: <Search className="h-4 w-4" strokeWidth={3} /> },
      ]

  return (
    <header className="sticky top-0 z-40 bg-neo-bg border-b-4 border-black">
      <div className="page-container">
        <div className="flex items-center justify-between h-16 gap-4">

          {/* Logo */}
          <Link
            to="/"
            className="flex-shrink-0 inline-flex items-center justify-center w-12 h-12 bg-neo-accent border-4 border-black shadow-neo-sm font-black text-white text-2xl hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all duration-100 select-none"
            aria-label="Gotcha home"
          >
            G.
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ to, label, icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-2 border-3 font-black text-sm uppercase tracking-wide transition-all duration-100
                  ${isActive
                    ? 'border-black bg-neo-secondary shadow-neo-sm'
                    : 'border-transparent hover:border-black hover:bg-neo-secondary hover:shadow-[2px_2px_0px_0px_#000]'
                  }`
                }
              >
                {icon}{label}
              </NavLink>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {isLoggedIn ? (
              <>
                {/* Notifications bell */}
                <Link
                  to="/notifications"
                  className="relative p-2 border-3 border-transparent hover:border-black hover:shadow-neo-sm transition-all duration-100"
                  aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
                >
                  <Bell className="h-5 w-5" strokeWidth={3} />
                  {unreadCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-neo-accent border-2 border-black text-white text-[10px] font-black flex items-center justify-center rounded-full"
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </motion.span>
                  )}
                </Link>

                {/* User avatar menu */}
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(o => !o)}
                    className="flex items-center gap-2 border-3 border-transparent hover:border-black hover:shadow-neo-sm transition-all duration-100 p-1 pr-3"
                    aria-expanded={userMenuOpen}
                    aria-haspopup="true"
                  >
                    <Avatar src={userDoc?.photoURL} name={userDoc?.name || 'U'} size="sm" />
                    <span className="hidden sm:block font-black text-sm uppercase max-w-[100px] truncate">
                      {userDoc?.name?.split(' ')[0] || 'Me'}
                    </span>
                  </button>

                  <AnimatePresence>
                    {userMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.12 }}
                        className="absolute right-0 top-full mt-2 w-52 bg-white border-4 border-black shadow-neo-md z-50"
                      >
                        <div className="border-b-4 border-black px-4 py-3 bg-neo-secondary">
                          <p className="font-black text-sm uppercase truncate">{userDoc?.name}</p>
                          <p className="text-xs text-black/60 truncate">{firebaseUser?.email}</p>
                        </div>
                        {[
                          { to: '/profile', label: 'My Profile', icon: <User className="h-4 w-4" strokeWidth={3} /> },
                          { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" strokeWidth={3} /> },
                          ...(isAdmin ? [{ to: '/admin', label: 'Admin Panel', icon: <Shield className="h-4 w-4" strokeWidth={3} /> }] : []),
                        ].map(({ to, label, icon }) => (
                          <Link
                            key={to}
                            to={to}
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 font-bold text-sm uppercase hover:bg-neo-muted border-b-2 border-black/10 transition-colors duration-100"
                          >
                            {icon}{label}
                          </Link>
                        ))}
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-3 w-full px-4 py-3 font-bold text-sm uppercase hover:bg-neo-accent hover:text-white transition-colors duration-100 text-left"
                        >
                          <LogOut className="h-4 w-4" strokeWidth={3} />
                          Log Out
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link to="/login" className="btn btn-outline btn-sm">Log In</Link>
                <Link to="/register" className="btn btn-primary btn-sm">Sign Up</Link>
              </div>
            )}

            {/* Hamburger */}
            <button
              className="md:hidden p-2 border-4 border-black bg-white shadow-neo-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-100"
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X className="h-5 w-5" strokeWidth={3} /> : <Menu className="h-5 w-5" strokeWidth={3} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="md:hidden border-t-4 border-black bg-neo-bg overflow-hidden"
          >
            <div className="page-container py-4 flex flex-col gap-2">
              {navLinks.map(({ to, label, icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 border-4 font-black text-sm uppercase
                    ${isActive ? 'border-black bg-neo-secondary shadow-neo-sm' : 'border-black bg-white shadow-[4px_4px_0px_0px_#000]'}`
                  }
                >
                  {icon}{label}
                </NavLink>
              ))}
              {!isLoggedIn && (
                <>
                  <Link to="/login"    onClick={() => setMenuOpen(false)} className="btn btn-outline btn-full">Log In</Link>
                  <Link to="/register" onClick={() => setMenuOpen(false)} className="btn btn-primary btn-full">Sign Up Free</Link>
                </>
              )}
              {isLoggedIn && (
                <button onClick={handleLogout} className="btn btn-outline btn-full flex items-center gap-2 justify-center">
                  <LogOut className="h-4 w-4" strokeWidth={3} /> Log Out
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
