import React, { useState, useEffect } from 'react';
import { Play, Search, Menu, Music, AudioLines, Sun, Moon, Heart, Plus, X, Lock } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// 🔴 حط بيانات Supabase بتاعتك هنا 🔴
const supabaseUrl = 'https://gsuntpgcmthruapyhidd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzdW50cGdjbXRocnVhcHloaWRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4Mzc2ODQsImV4cCI6MjEwNzQxMzY4NH0.IK3kVIwVtsXjFGJtZPejD6gGj47RKN8-1E-c6ThIDHQ';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function NaghamApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginCode, setLoginCode] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isCheckingCode, setIsCheckingCode] = useState(false);

  const [activeTab, setActiveTab] = useState('all');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [songs, setSongs] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [newSong, setNewSong] = useState({ title: '', artist: '', category: 'tarab', embed_url: '' });

  // التحقق من وجود كود محفوظ مسبقاً في الجهاز
  useEffect(() => {
    const savedCode = localStorage.getItem('nagham_access_code');
    if (savedCode) {
      handleLogin(savedCode, true);
    }
  }, []);

  // دالة تسجيل الدخول وربط الجهاز
  const handleLogin = async (codeToUse, isAutoLogin = false) => {
    setIsCheckingCode(true);
    setLoginError('');
    
    // إنشاء أو استدعاء رقم تعريفي فريد لهذا الجهاز
    let localDeviceId = localStorage.getItem('nagham_device_id');
    if (!localDeviceId) {
      localDeviceId = Math.random().toString(36).substring(2, 15);
      localStorage.setItem('nagham_device_id', localDeviceId);
    }

    const { data: codeData, error } = await supabase
      .from('access_codes')
      .select('*')
      .eq('code', codeToUse)
      .single();

    if (error || !codeData) {
      if (!isAutoLogin) setLoginError('الكود غير صحيح، تأكد من كتابته بشكل سليم.');
      localStorage.removeItem('nagham_access_code');
      setIsCheckingCode(false);
      return;
    }

    if (!codeData.is_used) {
      // أول مرة يستخدم: نربط الكود بهذا الجهاز
      await supabase.from('access_codes').update({ is_used: true, device_id: localDeviceId }).eq('code', codeToUse);
      loginSuccess(codeToUse);
    } else {
      // مستخدم من قبل: نتأكد إن ده نفس الجهاز
      if (codeData.device_id === localDeviceId) {
        loginSuccess(codeToUse);
      } else {
        if (!isAutoLogin) setLoginError('عفواً! هذا الكود مستخدم بالفعل على جهاز آخر.');
        localStorage.removeItem('nagham_access_code');
      }
    }
    setIsCheckingCode(false);
  };

  const loginSuccess = (code) => {
    localStorage.setItem('nagham_access_code', code);
    setIsAuthenticated(true);
    fetchSongs();
    const savedFavs = localStorage.getItem('naghamFavorites');
    if (savedFavs) setFavorites(JSON.parse(savedFavs));
  };

  const fetchSongs = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('songs').select('*').order('created_at', { ascending: false });
    if (!error && data) setSongs(data);
    setIsLoading(false);
  };

  // ... (نفس دوال إضافة أغنية والمفضلة اللي عملناها قبل كده) ...
  const handleAddSong = async (e) => {
    e.preventDefault();
    if (!newSong.title || !newSong.embed_url) return;
    let finalEmbedUrl = newSong.embed_url;
    if (finalEmbedUrl.includes('watch?v=')) finalEmbedUrl = finalEmbedUrl.replace('watch?v=', 'embed/').split('&')[0];
    else if (finalEmbedUrl.includes('youtu.be/')) finalEmbedUrl = finalEmbedUrl.replace('youtu.be/', 'www.youtube.com/embed/').split('?')[0];

    const { data, error } = await supabase.from('songs').insert([{ title: newSong.title, artist: newSong.artist || 'غير معروف', category: newSong.category, embed_url: finalEmbedUrl }]).select();
    if (!error) {
      setSongs([data[0], ...songs]);
      setNewSong({ title: '', artist: '', category: 'tarab', embed_url: '' });
      setShowAddModal(false);
      alert('تم الإضافة بنجاح!');
    }
  };

  const toggleFavorite = (song) => {
    let updatedFavs = favorites.some(f => f.id === song.id) ? favorites.filter(f => f.id !== song.id) : [...favorites, song];
    setFavorites(updatedFavs);
    localStorage.setItem('naghamFavorites', JSON.stringify(updatedFavs));
  };

  // --------------------------------------------------------
  // شاشة تسجيل الدخول (تظهر لو المستخدم مش معاه كود شغال)
  // --------------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div dir="rtl" className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl w-full max-w-md text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <AudioLines className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold mb-2 dark:text-white">منصة نَغَم</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8">أدخل كود المرور الخاص بك للدخول إلى المكتبة.</p>
          
          <div className="space-y-4">
            <div>
              <input 
                type="text" 
                placeholder="أدخل الكود هنا..." 
                className="w-full bg-gray-100 dark:bg-gray-900 border-2 border-transparent focus:border-indigo-500 rounded-xl px-4 py-3 text-center font-bold text-lg dark:text-white outline-none uppercase"
                value={loginCode}
                onChange={(e) => setLoginCode(e.target.value.toUpperCase())}
              />
            </div>
            {loginError && <p className="text-rose-500 text-sm font-bold">{loginError}</p>}
            <button 
              onClick={() => handleLogin(loginCode)}
              disabled={isCheckingCode || !loginCode}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
            >
              {isCheckingCode ? 'جاري التحقق...' : <><Lock className="w-5 h-5"/> تسجيل الدخول</>}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------
  // واجهة الموقع الأصلية (بعد تسجيل الدخول بنجاح)
  // --------------------------------------------------------
  const displayedSongs = activeTab === 'favorites' ? favorites : songs;
  const filteredSongs = displayedSongs.filter(s => (activeTab === 'all' || activeTab === 'favorites' || s.category === activeTab) && (s.title.includes(searchQuery) || (s.artist && s.artist.includes(searchQuery))));

  return (
    <div dir="rtl" className={`min-h-screen font-sans transition-colors duration-300 ${isDarkMode ? 'dark bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <nav className="sticky top-0 z-50 backdrop-blur-lg bg-white/70 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-2 group cursor-pointer">
              <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
                <AudioLines className="w-7 h-7 text-white" />
              </div>
              <span className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-l from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">نَغَم</span>
            </div>

            <div className="hidden md:flex items-center gap-6 font-medium">
              <button onClick={() => setActiveTab('all')} className={activeTab === 'all' ? 'text-indigo-600' : 'hover:text-indigo-600'}>الرئيسية</button>
              <button onClick={() => setActiveTab('tarab')} className={activeTab === 'tarab' ? 'text-amber-600' : 'hover:text-amber-600'}>طرب</button>
              <button onClick={() => setActiveTab('shaabi')} className={activeTab === 'shaabi' ? 'text-purple-600' : 'hover:text-purple-600'}>شعبي</button>
              <button onClick={() => setActiveTab('quran')} className={activeTab === 'quran' ? 'text-emerald-600' : 'hover:text-emerald-600'}>إسلاميات</button>
              <button onClick={() => setActiveTab('favorites')} className={activeTab === 'favorites' ? 'text-rose-600' : 'hover:text-rose-600'}>مفضلتي</button>
            </div>

            <div className="flex items-center gap-4">
              <button onClick={() => setShowAddModal(true)} className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-full text-sm font-bold">
                <Plus className="w-4 h-4" /> إضافة
              </button>
              <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800">
                {isDarkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-slate-700" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
          <div><h1 className="text-4xl font-bold mb-2">أحدث الإضافات</h1></div>
          <div className="flex items-center bg-white dark:bg-gray-800 rounded-full px-4 py-3 shadow-sm border border-gray-200 dark:border-gray-700">
            <Search className="w-5 h-5 text-gray-400" />
            <input type="text" placeholder="ابحث..." className="bg-transparent border-none outline-none w-full md:w-64 mr-3" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </div>

        {isLoading ? <div className="text-center py-20 text-gray-500">جاري التحميل... ⏳</div> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredSongs.map((song) => (
              <div key={song.id} className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all relative flex flex-col">
                <button onClick={() => toggleFavorite(song)} className="absolute top-4 left-4 z-10 bg-white/80 dark:bg-black/50 p-2 rounded-full hover:scale-110 transition-transform">
                  <Heart className={`w-5 h-5 ${favorites.some(f => f.id === song.id) ? 'fill-rose-500 text-rose-500' : 'text-gray-700 dark:text-white'}`} />
                </button>
                <div className="aspect-video w-full bg-gray-900 relative">
                  <iframe className="absolute inset-0 w-full h-full" src={song.embed_url} title={song.title} frameBorder="0" allowFullScreen></iframe>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-1">{song.title}</h3>
                  <p className="text-gray-500 text-sm">{song.artist}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* مودال الإضافة */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-lg p-8 relative">
            <button onClick={() => setShowAddModal(false)} className="absolute top-6 left-6 text-gray-400"><X /></button>
            <h2 className="text-2xl font-bold mb-6">إضافة نغم جديد</h2>
            <form onSubmit={handleAddSong} className="space-y-4">
              <div><input required type="text" placeholder="اسم الأغنية" value={newSong.title} onChange={e => setNewSong({...newSong, title: e.target.value})} className="w-full border rounded-xl px-4 py-3 dark:bg-gray-800 outline-none" /></div>
              <div><input required type="text" placeholder="اسم الفنان" value={newSong.artist} onChange={e => setNewSong({...newSong, artist: e.target.value})} className="w-full border rounded-xl px-4 py-3 dark:bg-gray-800 outline-none" /></div>
              <div><input required type="url" placeholder="رابط يوتيوب" value={newSong.embed_url} onChange={e => setNewSong({...newSong, embed_url: e.target.value})} className="w-full border rounded-xl px-4 py-3 dark:bg-gray-800 outline-none" dir="ltr" /></div>
              <div>
                <select value={newSong.category} onChange={e => setNewSong({...newSong, category: e.target.value})} className="w-full border rounded-xl px-4 py-3 dark:bg-gray-800 outline-none">
                  <option value="tarab">طرب وبوب</option><option value="shaabi">شعبي ومهرجانات</option><option value="quran">إسلاميات وقرآن</option>
                </select>
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl mt-4">نشر الأغنية</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}