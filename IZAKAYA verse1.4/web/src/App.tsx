import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import { motion } from 'framer-motion'
import Home from './components/Home'
import Play from './components/Play'
import Library from './components/Library'
import Tickets from './components/Tickets'
import Redeem from './components/Redeem'
import Navigation from './components/Navigation'

function App() {
  return (
    <Router>
      <div className="min-h-screen izakaya-gradient text-white">
        <Navigation />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/play" element={<Play />} />
            <Route path="/library" element={<Library />} />
            <Route path="/tickets" element={<Tickets />} />
            <Route path="/redeem" element={<Redeem />} />
          </Routes>
        </motion.div>
      </div>
    </Router>
  )
}

export default App
