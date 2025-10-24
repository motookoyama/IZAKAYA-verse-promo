import { motion } from 'framer-motion'
import { ExternalLink } from 'lucide-react'

const Home = () => {
  const points = [
    {
      title: 'IZAKAYA 1000P',
      description: 'IZAKAYAverseの利用ポイント1000Pを購入します',
      price: '¥1,000',
      qrCode: '/assets/IZAKAYA POINT QR/IZAKAYA 1000P-qrcode.png',
      paypalLink: 'https://www.paypal.com/ncp/payment/SBPMPM8BFRQUW'
    },
    {
      title: 'IZAKAYA 5000P',
      description: 'IZAKAYAverseの利用ポイント5000Pを購入します',
      price: '¥5,000',
      qrCode: '/assets/IZAKAYA POINT QR/IZAKAYA 5000P-qrcode.png',
      paypalLink: 'https://www.paypal.com/ncp/payment/WWLCPFUX2K2VA'
    },
    {
      title: 'IZAKAYA 1000P (USD)',
      description: 'Purchase 1000 points for IZAKAYAverse',
      price: '$10 USD',
      qrCode: '/assets/IZAKAYA POINT QR/IZAKAYA 1000PE-qrcode.png',
      paypalLink: 'https://www.paypal.com/ncp/payment/HTHQFN7EADLPC'
    },
    {
      title: 'IZAKAYA 5000P (USD)',
      description: 'Purchase 5000 points for IZAKAYAverse',
      price: '$50 USD',
      qrCode: '/assets/IZAKAYA POINT QR/IZAKAYA 5000PE-qrcode.png',
      paypalLink: 'https://www.paypal.com/ncp/payment/PKBQ6WBAGHVUW'
    }
  ]

  return (
    <div className="max-w-6xl mx-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="glass-card p-8"
      >
        <h1 className="text-5xl font-bold text-center mb-8 text-shadow-lg">
          🍶 IZAKAYA verse
        </h1>
        
        <p className="text-center text-lg mb-8 italic bg-white bg-opacity-10 p-4 rounded-lg">
          🚀 試験運用中 - ポイント購入はこちらから
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {points.map((point, index) => (
            <motion.div
              key={point.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="glass-card p-6 text-center hover-lift"
            >
              <h3 className="text-xl font-bold mb-2">{point.title}</h3>
              <p className="text-sm mb-3 opacity-90">{point.description}</p>
              <div className="text-2xl font-bold mb-4 text-yellow-300">{point.price}</div>
              <img
                src={point.qrCode}
                alt={`${point.title} QR`}
                className="w-32 h-32 mx-auto mb-4 rounded-lg shadow-lg"
              />
              <a
                href={point.paypalLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full font-bold transition-colors"
              >
                PayPalで購入
                <ExternalLink size={16} className="ml-2" />
              </a>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="glass-card p-6 text-center mb-8"
        >
          <h3 className="text-2xl font-bold mb-4">IZAKAYA Support / Motoo Koyama</h3>
          <p className="mb-4">
            IZAKAYAverseやMotooKoyama関連コンテンツの活動を支援するためのカンパです（ポイント付与はありません）。
          </p>
          <div className="text-2xl font-bold mb-4 text-yellow-300">自由設定</div>
          <img
            src="/assets/IZAKAYA POINT QR/IZAKAYA Suppor-qrcode.png"
            alt="Support QR"
            className="w-32 h-32 mx-auto mb-4 rounded-lg shadow-lg"
          />
          <a
            href="https://www.paypal.com/ncp/payment/YP4SEMBEH3AHQ"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full font-bold transition-colors"
          >
            支援する
            <ExternalLink size={16} className="ml-2" />
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="text-center"
        >
          <p className="mb-2">📖 Amazon冊子や配布物からも購入可能</p>
          <p className="mb-2">
            🎮 バーチャルコミックマーケット:{' '}
            <a
              href="https://www.amazon.co.jp/dp/B0CQQ3YNPR"
              target="_blank"
              rel="noopener noreferrer"
              className="text-yellow-300 hover:underline"
            >
              https://www.amazon.co.jp/dp/B0CQQ3YNPR
            </a>
          </p>
          <p className="mb-4">
            🤖 電子妖精アバタモ⭐︎エクボ2.0:{' '}
            <a
              href="https://www.amazon.co.jp/dp/B0CW1NBPTB"
              target="_blank"
              rel="noopener noreferrer"
              className="text-yellow-300 hover:underline"
            >
              https://www.amazon.co.jp/dp/B0CW1NBPTB
            </a>
          </p>
          
          <a
            href="/roadmap.html"
            className="inline-flex items-center bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-800 px-6 py-3 rounded-full font-bold hover-lift"
          >
            📋 コンテンツロードマップを見る
          </a>
        </motion.div>
      </motion.div>
    </div>
  )
}

export default Home
