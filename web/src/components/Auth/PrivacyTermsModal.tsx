import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  open: boolean
  userEmail: string
  userName: string
  onAccept: () => void
  onCancel: () => void
}

export function PrivacyTermsModal({ open, userEmail, userName, onAccept, onCancel }: Props) {
  const [agreed, setAgreed] = useState(false)

  if (!open) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="bg-white max-w-lg w-full rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-gray-100"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-100 bg-[#fcfcf9]">
            <h2 className="text-base font-serif tracking-wider text-gray-800">
              個人資料保護聲明與隱私權條款
            </h2>
            <p className="text-xs text-gray-400 mt-1 tracking-wider">
              歡迎 {userName} ({userEmail})，請於初次註冊前詳閱並同意本條款
            </p>
          </div>

          {/* Terms Content Body (Scrollable) */}
          <div className="flex-1 p-6 overflow-y-auto text-xs text-gray-600 space-y-4 leading-relaxed tracking-wider font-light select-text">
            <p className="font-normal text-gray-700">
              親愛的使用者您好，歡迎使用「夢貘 (Dreamer)」（以下簡稱本服務）。為保障您的權利並依據中華民國《個人資料保護法》（以下簡稱個資法）第八條規定，請於註冊使用前詳閱以下告知事項：
            </p>

            <div>
              <h3 className="font-medium text-gray-800 mb-1">一、 個人資料之蒐集目的</h3>
              <p>
                本服務基於「040 行銷」、「090 消費者客戶管理與服務」、「135 資通訊服務與資料庫管理」及提供個人夢境紀錄、AI 多媒體故事生成（Gemini / Veo / Imagen）、個人化體驗等特定目的，進行個人資料之蒐集、處理與利用。
              </p>
            </div>

            <div>
              <h3 className="font-medium text-gray-800 mb-1">二、 蒐集之個人資料類別</h3>
              <p>
                本服務透過 Google OAuth 授權僅蒐集識別個人者之基本資料（個資法 C001 類別）：包含您的 Google 帳號電子郵件地址 (Email)、姓名 (Name) 及大頭貼照片網址 (Avatar URL)。
              </p>
            </div>

            <div>
              <h3 className="font-medium text-gray-800 mb-1">三、 個人資料利用之期間、地區、對象及方式</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-500">
                <li><strong className="text-gray-700">期間：</strong>自您同意本條款完成註冊起，至您請求刪除帳號或本服務終止服務之日止。</li>
                <li><strong className="text-gray-700">地區：</strong>中華民國（台灣）境內及本服務所使用之 Google Cloud 雲端基礎設施所在地。</li>
                <li><strong className="text-gray-700">對象：</strong>本服務系統運作與代理 call 存取驗證，非經您同意或依法律規定，絕不提供給無關之第三方。</li>
                <li><strong className="text-gray-700">方式：</strong>以自動化機器或非自動化之符合個資法保護規範方式進行處理與傳輸。</li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium text-gray-800 mb-1">四、 當事人依個資法第三條所得行使之權利</h3>
              <p>
                您得隨時向本服務就您提供之個人資料行使以下權利：(1) 查詢或請求閱覽。(2) 請求製給複製本。(3) 補充或更正。(4) 請求停止蒐集、處理或利用。(5) 請求刪除帳號與個人資料。
              </p>
            </div>

            <div>
              <h3 className="font-medium text-gray-800 mb-1">五、 不提供個人資料對權益之影響</h3>
              <p>
                您得自由選擇是否提供個人資料，惟若拒絕提供登入所必須之 Email 與 basic profile，本服務將無法為您建立帳號並提供夢境服務。
              </p>
            </div>
          </div>

          {/* Footer & Consent Controls */}
          <div className="px-6 py-4 border-t border-gray-100 bg-[#fcfcf9] space-y-3">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="w-4 h-4 text-gray-800 border-gray-300 rounded focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <span className="text-xs text-gray-700 font-medium tracking-wider">
                我已詳細閱讀並同意《個人資料保護聲明與隱私權條款》
              </span>
            </label>

            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={onCancel}
                className="px-5 py-2 text-xs tracking-wider text-gray-400 hover:text-gray-600 transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                disabled={!agreed}
                onClick={onAccept}
                className="px-6 py-2.5 bg-gray-800 text-white text-xs tracking-[0.15em] font-medium
                           hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all rounded-none"
              >
                同意條款並完成註冊
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
