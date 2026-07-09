import { motion as m } from 'framer-motion'

export function AboutPage() {
  return (
    <m.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-lg mx-auto"
    >
      <h1 className="text-lg font-serif tracking-widest text-gray-700 mb-8">
        關於夢貘
      </h1>

      <section className="mb-10">
        <h2 className="text-xs tracking-widest text-gray-400 mb-3">關於</h2>
        <p className="text-sm text-gray-500 leading-relaxed">
          夢貘是一個夢境日記應用程式。你可以記錄夢境、為夢境分類、
          生成 AI 影片，並選擇公開或私有。
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xs tracking-widest text-gray-400 mb-3">啟發</h2>
        <p className="text-sm text-gray-500 leading-relaxed">
          這個應用程式的誕生，源於影視颶風對於創意工具與內容創作的熱情。
          他們不斷探索科技與敘事的交界，啟發了我們用新的方式記錄與分享夢境。
          感謝影視颶風為這個世界帶來的靈感與動力。
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-xs tracking-widest text-gray-400 mb-3">聯絡</h2>
        <p className="text-sm text-gray-500 leading-relaxed">
          如有任何建議或問題，歡迎來信：
        </p>
        <a
          href="mailto:ch.chang.software@gmail.com"
          className="text-sm text-gray-600 hover:text-gray-800 transition-colors underline underline-offset-4"
        >
          ch.chang.software@gmail.com
        </a>
      </section>

      <p className="text-[10px] text-gray-300 tracking-wider">
        v0.1.0
      </p>
    </m.div>
  )
}
