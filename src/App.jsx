import React, { useState, useMemo, useEffect } from 'react';
import { 
  CreditCard, 
  Plus, 
  Trash2, 
  TrendingUp, 
  Calendar, 
  Sun,
  Moon,
  Home,
  BarChart3,
  Loader2
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';

// Firebase 初始化設定 (支援雲端儲存)
const firebaseConfigStr = typeof __firebase_config !== 'undefined' ? __firebase_config : null;
const firebaseConfig = firebaseConfigStr ? JSON.parse(firebaseConfigStr) : {
    apiKey: "", // 部署到本地或 Vercel 時，請替換回 import.meta.env.VITE_FIREBASE_API_KEY
    authDomain: "", // 部署到本地或 Vercel 時，請替換回 import.meta.env.VITE_FIREBASE_AUTH_DOMAIN
    projectId: "" // 部署到本地或 Vercel 時，請替換回 import.meta.env.VITE_FIREBASE_PROJECT_ID
};

let app, auth, db;
if (firebaseConfig && firebaseConfig.apiKey) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}
const appId = typeof __app_id !== 'undefined' ? __app_id : 'subtrack-app';

const App = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [isAdding, setIsAdding] = useState(false);
  const [newSub, setNewSub] = useState({ name: '', price: '', cycle: 'Monthly', category: '其他' });
  
  // 顯示相關狀態
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [historyMonths, setHistoryMonths] = useState(6);

  // (1) 初始化 Firebase 身分驗證 (匿名登入)
  useEffect(() => {
    if (!auth) {
      setIsLoading(false);
      return;
    }
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (e) {
        console.error("Auth error", e);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // (2) 監聽雲端資料庫的訂閱項目
  useEffect(() => {
    if (!user || !db) {
      setIsLoading(false);
      return;
    }
    const subsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'subscriptions');
    const unsubscribe = onSnapshot(subsRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // 根據建立時間排序確保順序一致
      data.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      setSubscriptions(data);
      setIsLoading(false);
    }, (error) => {
      console.error("Firestore error:", error);
      setIsLoading(false);
    });
    
    return () => unsubscribe();
  }, [user]);

  // 監聽深色模式切換
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // 計算邏輯
  const monthlyTotal = useMemo(() => {
    return subscriptions.reduce((acc, sub) => {
      const price = parseFloat(sub.price) || 0;
      return acc + (sub.cycle === 'Yearly' ? price / 12 : price);
    }, 0);
  }, [subscriptions]);

  const yearlyTotal = monthlyTotal * 12;

  const addSubscription = async () => {
    if (!newSub.name || !newSub.price) return;
    const colors = ['bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-cyan-500'];
    
    const newEntry = { 
      ...newSub, 
      color: colors[Math.floor(Math.random() * colors.length)],
      createdAt: Date.now()
    };

    if (user && db) {
      // 儲存至 Firebase 雲端
      const docId = Date.now().toString();
      const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'subscriptions', docId);
      await setDoc(docRef, newEntry);
    } else {
      // 無 Firebase 設定時的本地暫存
      setSubscriptions([...subscriptions, { ...newEntry, id: Date.now() }]);
    }
    
    setNewSub({ name: '', price: '', cycle: 'Monthly', category: '其他' });
    setIsAdding(false);
  };

  const removeSub = async (id) => {
    if (user && db) {
      // 刪除雲端資料
      const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'subscriptions', id.toString());
      await deleteDoc(docRef);
    } else {
      setSubscriptions(subscriptions.filter(s => s.id !== id));
    }
  };

  // 生成歷史支出模擬數據
  const historyData = useMemo(() => {
    const data = [];
    const currentMonth = new Date().getMonth();
    let baseTotal = monthlyTotal * 0.7; 
    const increment = (monthlyTotal * 0.3) / 12; 
    
    for(let i = historyMonths - 1; i >= 0; i--) {
       const d = new Date();
       d.setMonth(currentMonth - i);
       const monthLabel = `${d.getMonth() + 1}月`;
       const amount = i === 0 ? monthlyTotal : baseTotal + (12 - i) * increment;
       data.push({ month: monthLabel, amount: Math.round(amount) });
    }
    return data;
  }, [historyMonths, monthlyTotal]);

  const maxHistoryAmount = Math.max(...historyData.map(d => d.amount), 1);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans p-4 md:p-8 transition-colors duration-300 relative">
      <div className="max-w-4xl mx-auto pb-20">
        {/* Header */}
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                訂閱管家 SubTrack
              </h1>
              <p className="text-slate-500 dark:text-slate-400 italic">個人數位財務助手</p>
            </div>
            <div className="flex gap-2 items-center">
              {isLoading && <Loader2 className="animate-spin text-indigo-500 mr-2" size={20} />}
              <button 
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2 mr-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm"
                title="切換深/淺色模式"
              >
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>

              <button 
                onClick={() => setIsAdding(true)}
                className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
              >
                <Plus size={20} />
                手動新增
              </button>
            </div>
          </header>

          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4 transition-colors">
              <div className="p-4 bg-indigo-50 dark:bg-indigo-900/50 rounded-2xl text-indigo-600 dark:text-indigo-400">
                <TrendingUp size={24} />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">每月預計支出</p>
                <h2 className="text-2xl font-bold font-mono">NT$ {monthlyTotal.toLocaleString(undefined, {maximumFractionDigits: 0})}</h2>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4 transition-colors">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/50 rounded-2xl text-emerald-600 dark:text-emerald-400">
                <Calendar size={24} />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">每年預計支出</p>
                <h2 className="text-2xl font-bold font-mono">NT$ {yearlyTotal.toLocaleString(undefined, {maximumFractionDigits: 0})}</h2>
              </div>
            </div>
          </div>

          {/* 歷史支出趨勢 */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 mb-8 transition-colors duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <BarChart3 size={20} className="text-indigo-500 dark:text-indigo-400" />
                過去支出分析
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500 dark:text-slate-400">顯示區間:</span>
                <select 
                  value={historyMonths}
                  onChange={(e) => setHistoryMonths(Number(e.target.value))}
                  className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-slate-200"
                >
                  {[3, 6, 9, 12].map(m => (
                    <option key={m} value={m}>近 {m} 個月</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="h-48 flex items-end justify-between gap-2 pt-4">
              {historyData.map((data, index) => {
                const heightPercent = (data.amount / maxHistoryAmount) * 100;
                const isCurrent = index === historyData.length - 1;
                return (
                  <div key={index} className="flex flex-col items-center flex-1 group">
                    <div className="w-full flex justify-center relative">
                      <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-slate-800 dark:bg-slate-600 text-white text-xs py-1 px-2 rounded whitespace-nowrap transition-opacity pointer-events-none z-10">
                        NT$ {data.amount.toLocaleString()}
                      </div>
                      <div 
                        className={`w-full max-w-[40px] rounded-t-md transition-all duration-500 ${isCurrent ? 'bg-indigo-500' : 'bg-indigo-100 dark:bg-indigo-900/50 hover:bg-indigo-200 dark:hover:bg-indigo-700/80'}`}
                        style={{ height: `${heightPercent}%`, minHeight: '4px' }}
                      ></div>
                    </div>
                    <div className={`mt-2 text-xs font-medium ${isCurrent ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}>
                      {data.month}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Subscription List */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden transition-colors">
            <div className="p-6 border-b border-slate-50 dark:border-slate-700/50 flex justify-between items-center">
              <h3 className="font-bold text-lg">活躍中的訂閱項目</h3>
              <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1 rounded-full text-xs font-medium">
                共 {subscriptions.length} 個項目
              </span>
            </div>
            <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {subscriptions.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  目前沒有訂閱項目，點擊上方按鈕開始新增。
                </div>
              ) : (
                subscriptions.map((sub) => (
                  <div key={sub.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 ${sub.color} rounded-2xl flex items-center justify-center text-white shadow-inner`}>
                        <CreditCard size={24} />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 dark:text-slate-100">{sub.name}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{sub.category} • {sub.cycle === 'Monthly' ? '每月' : '每年'}付款</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="font-bold font-mono text-slate-900 dark:text-slate-100">NT$ {parseFloat(sub.price).toLocaleString()}</p>
                        <p className="text-[10px] text-slate-400 uppercase tracking-tighter">付款週期: {sub.cycle}</p>
                      </div>
                      <button 
                        onClick={() => removeSub(sub.id)}
                        className="text-slate-300 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors p-2"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Add Modal Overlay */}
          {isAdding && (
            <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md p-8 shadow-2xl animate-in fade-in zoom-in duration-200 border border-slate-100 dark:border-slate-700">
                <h3 className="text-xl font-bold mb-6 text-slate-900 dark:text-white">新增訂閱服務</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">服務名稱</label>
                    <input 
                      type="text" 
                      value={newSub.name}
                      onChange={(e) => setNewSub({...newSub, name: e.target.value})}
                      placeholder="例如: Netflix"
                      className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all dark:text-white placeholder:text-slate-400"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">金額 (TWD)</label>
                      <input 
                        type="number" 
                        value={newSub.price}
                        onChange={(e) => setNewSub({...newSub, price: e.target.value})}
                        placeholder="0"
                        className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">週期</label>
                      <select 
                        value={newSub.cycle}
                        onChange={(e) => setNewSub({...newSub, cycle: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all dark:text-white"
                      >
                        <option value="Monthly">每月</option>
                        <option value="Yearly">每年</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">類別</label>
                    <select 
                      value={newSub.category}
                      onChange={(e) => setNewSub({...newSub, category: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all dark:text-white"
                    >
                      <option value="娛樂">娛樂</option>
                      <option value="工作">工作</option>
                      <option value="音樂">音樂</option>
                      <option value="雲端">雲端</option>
                      <option value="AI 工具">AI 工具</option>
                      <option value="其他">其他</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 mt-8">
                  <button 
                    onClick={() => setIsAdding(false)}
                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-slate-700 dark:text-slate-300"
                  >
                    取消
                  </button>
                  <button 
                    onClick={addSubscription}
                    className="flex-1 px-4 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 dark:shadow-none"
                  >
                    確認新增
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 回首頁懸浮按鈕 */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 p-4 rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900/50 hover:bg-indigo-700 hover:-translate-y-1 transition-all z-40"
          title="回到頂部"
        >
          <Home size={24} />
        </button>
      </div>
  );
};

export default App;