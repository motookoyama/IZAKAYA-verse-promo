import { motion } from 'framer-motion'
import { Ticket } from 'lucide-react'

const Tickets = () => {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="glass-card p-8 text-center"
      >
        <Ticket size={64} className="mx-auto mb-4 text-yellow-300" />
        <h1 className="text-4xl font-bold mb-4">🎫 1000Pチケット生成</h1>
        <p className="text-lg mb-8">
          ポイント購入後に自動生成されるPDFチケット。
          <br />
          QRコード付きで簡単にアクセス可能。
        </p>
        
        <div className="bg-white bg-opacity-10 p-6 rounded-lg">
          <h2 className="text-2xl font-bold mb-4">🚧 開発中</h2>
          <p className="text-lg">
            この機能は現在開発中です。
            <br />
            もうしばらくお待ちください。
          </p>
        </div>
      </motion.div>
    </div>
  )
}

export default Tickets
