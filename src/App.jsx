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
  BarChart3
} from 'lucide-react';

const App = () => {
  const [subscriptions, setSubscriptions] = useState([
    { id: 1, name: 'Netflix', price: 390, cycle: 'Monthly', category: '娛樂', color: 'bg-red-500' },
    { id: 2, name: 'Spotify', price: 149, cycle: 'Monthly', category: '音樂', color: 'bg-green-500' },
    { id: 3, name: 'iCloud+', price: 90, cycle: 'Monthly', category: '雲端', color: 'bg-blue-500' }
  ]);

  const [isAdding, setIsAdding] = useState(false);
  const [newSub, setNewSub] = useState({ name: '', price: '', cycle: 'Monthly', category: '其他' });
  
  // 深淺色模式與圖表狀態
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [historyMonths, setHistoryMonths] = useState(6);

  // 監聽深色模式切換，將 dark class 應用到全域 html 標籤
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

  const addSubscription = () => {
    if (!newSub.name || !newSub.price) return;
    const colors = ['bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-cyan-500'];
    setSubscriptions([
      ...subscriptions,
      { ...newSub, id: Date.now(), color: colors[Math.floor(Math.random() * colors.length)] }
    ]);
    setNewSub({ name: '', price: '', cycle: 'Monthly', category: '其他' });
    setIsAdding(false);
  };

  const removeSub = (id) => {
    setSubscriptions(subscriptions.filter(s => s.id !== id));
  };

  // 生成歷史支出模擬數據 (基於當前總額推算過去 N 個月的趨勢)
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
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-