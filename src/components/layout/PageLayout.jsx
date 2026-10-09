import Navbar from './Navbar'
import Footer from './Footer'
import { Toaster } from 'react-hot-toast'

export default function PageLayout({ children, noFooter = false }) {
  return (
    <div className="min-h-screen flex flex-col bg-neo-bg">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#fff',
            border: '4px solid #000',
            borderRadius: 0,
            boxShadow: '6px 6px 0px 0px #000',
            fontFamily: '"Space Grotesk", system-ui, sans-serif',
            fontWeight: 700,
            fontSize: '14px',
          },
          success: {
            iconTheme: { primary: '#6EE7B7', secondary: '#000' },
          },
          error: {
            iconTheme: { primary: '#FF6B6B', secondary: '#fff' },
          },
        }}
      />
      <Navbar />
      <main className="flex-1">
        {children}
      </main>
      {!noFooter && <Footer />}
    </div>
  )
}
