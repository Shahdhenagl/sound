import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, Search, Plus, AudioLines, Heart, Sun, Moon, Music, X, Mic2, Radio, Book, LogOut, KeyRound } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// بيانات الربط بـ Supabase
const supabaseUrl = 'https://gsuntpgcmthruapyhidd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzdW50cGdjbXRocnVhcHloaWRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4Mzc2ODQsImV4cCI6MjEwNzQxMzY4NH0.IK3kVIwVtsXjFGJtZPejD6gGj47RKN8-1E-c6ThIDHQ';
const supabase = createClient(supabaseUrl, supabaseKey);

// ==========================================
// 1. واجهة الدخول (بالكود فقط من الداتا بيز)
// ==========================================
function AuthScreen({ setSession }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!code) return setErrorMsg('يرجى إدخال كود الدخول');
    
    setLoading(true);
    setErrorMsg('');

    try {
      const { data, error } = await supabase
        .from('access_codes')
        .select('*')
        .eq('code', code)
        .single();

      if (error || !data) {
        throw new Error('الكود غير صحيح أو غير مسجل في النظام');
      }

      localStorage.setItem('nagham_access_code', data.code);
      setSession(data.code);

      // تحديث حالة الكود
      await supabase.from('access_codes').update({ is_used: true }).eq('code', code);

    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4 transition-colors">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl w-full max-w-md border border-gray-100 dark:border-gray-700">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
            <AudioLines className="w-10 h-10 text-white" />
          </div>
        </div>
        <h2 className="text-3xl font-extrabold text-center mb-8 dark:text-white bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">منصة نَغَم</h2>
        
        {errorMsg && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-200 text-center">{errorMsg}</div>}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-center">أدخل كود المرور الخاص بك</label>
            <div className="relative">
              <KeyRound className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
              <input required type="text" value={code} onChange={e => setCode(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl pr-12 pl-4 py-4 outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white text-xl text-center tracking-widest uppercase" dir="ltr" placeholder="NAGHAM-123" />
            </div>
          </div>
          <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition-all shadow-md disabled:opacity-50 text-lg">
            {loading ? 'جاري التحقق...' : 'دخول للمنصة'}
          </button>
        </form>
      </div>
    </div>
  );
}

// استخراج معرّف الفيديو من روابط YouTube العادية أو embed أو youtu.be
function getYouTubeVideoId(rawUrl) {
  if (!rawUrl) return null;
  try {
    const url = new URL(rawUrl, window.location.origin);
    const host = url.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') return url.pathname.split('/').filter(Boolean)[0] || null;
    if (host.endsWith('youtube.com') || host === 'youtube-nocookie.com') {
      if (url.searchParams.get('v')) return url.searchParams.get('v');
      const parts = url.pathname.split('/').filter(Boolean);
      const marker = parts.findIndex(part => ['embed', 'shorts', 'live', 'v'].includes(part));
      if (marker >= 0) return parts[marker + 1] || null;
    }
  } catch (error) {
    console.error('تعذر قراءة رابط YouTube:', error);
  }
  return null;
}

// ==========================================
// 2. التطبيق الأساسي (النسخة الخاصة بك)
// ==========================================
function MainApp({ setSession }) {
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const [songs, setSongs] = useState([]);
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(200);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [newSong, setNewSong] = useState({ title: '', artist: '', category: 'tarab', src: '' });

  const playerRef = useRef(null);
  const playerHostRef = useRef(null);
  const nextSongRef = useRef(null);
  const previousSongRef = useRef(null);
  const [youtubeApiReady, setYoutubeApiReady] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const pendingAutoplayRef = useRef(false);

  // تحميل YouTube IFrame Player API مرة واحدة
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      setYoutubeApiReady(true);
      return;
    }

    const existingScript = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
    const previousCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previousCallback === 'function') previousCallback();
      setYoutubeApiReady(true);
    };

    if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      document.head.appendChild(script);
    }

    return () => {
      // لا نحذف سكربت YouTube لأنه مورد مشترك في الصفحة
    };
  }, []);

  useEffect(() => {
    fetchSongs();
  }, []);

  // إنشاء مشغل YouTube مرة واحدة والتحكم فيه من خلال الـ API
  useEffect(() => {
    if (!youtubeApiReady || !playerHostRef.current || playerRef.current) return;

    playerRef.current = new window.YT.Player(playerHostRef.current, {
      width: '100%',
      height: '100%',
      playerVars: {
        autoplay: 0,
        controls: 1,
        playsinline: 1,
        rel: 0,
        origin: window.location.origin
      },
      events: {
        onReady: () => setPlayerReady(true),
        onStateChange: (event) => {
          const YT = window.YT;
          if (event.data === YT.PlayerState.PLAYING) setIsPlaying(true);
          if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.CUED) setIsPlaying(false);
          if (event.data === YT.PlayerState.ENDED) {
            setIsPlaying(false);
            if (nextSongRef.current) nextSongRef.current();
          }
        },
        onError: (event) => {
          console.error('YouTube Player error:', event.data);
          setIsPlaying(false);
        }
      }
    });
  }, [youtubeApiReady]);

  // تحميل الأغنية المختارة دون إعادة إنشاء الـ iframe
  useEffect(() => {
    if (!playerReady || !currentSong?.src || !playerRef.current) return;
    const videoId = getYouTubeVideoId(currentSong.src);
    if (!videoId) {
      console.error('رابط YouTube غير صالح:', currentSong.src);
      return;
    }
    // الأغنية التي اختارها المستخدم أو الأغنية التالية تُحمّل مع التشغيل مباشرة.
    // أول أغنية عند فتح الصفحة تُجهّز فقط حتى لا نحاول تشغيل الصوت تلقائيًا دون تفاعل.
    if (pendingAutoplayRef.current) {
      playerRef.current.loadVideoById({ videoId });
      pendingAutoplayRef.current = false;
    } else {
      playerRef.current.cueVideoById({ videoId });
    }
    setCurrentTime(0);
    setProgress(0);
  }, [currentSong?.src, playerReady]);

  // زر التشغيل والإيقاف يتحكمان في المشغل الفعلي
  useEffect(() => {
    if (!playerReady || !playerRef.current) return;
    if (isPlaying) playerRef.current.playVideo();
    else playerRef.current.pauseVideo();
  }, [isPlaying, playerReady]);

  // مزامنة الوقت والمدة مع YouTube بدل عداد الثواني الوهمي
  useEffect(() => {
    if (!isPlaying || !playerReady) return;
    const timer = setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      const actualDuration = player.getDuration?.() || 0;
      const actualTime = player.getCurrentTime?.() || 0;
      if (actualDuration > 0) {
        setDuration(actualDuration);
        setCurrentTime(actualTime);
        setProgress((actualTime / actualDuration) * 100);
      }
    }, 500);
    return () => clearInterval(timer);
  }, [isPlaying, playerReady]);

  const fetchSongs = async () => {
    const { data, error } = await supabase.from('songs').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      const formattedSongs = data.map(song => ({ ...song, src: song.embed_url }));
      setSongs(formattedSongs);
      if (formattedSongs.length > 0) setCurrentSong(formattedSongs[0]);
    }
  };

  const filteredSongs = songs.filter(song => {
    const matchesTab = activeTab === 'all' || song.category === activeTab;
    const matchesSearch = song.title.includes(searchQuery) || song.artist.includes(searchQuery);
    return matchesTab && matchesSearch;
  });

  const selectSong = (song) => {
    // تمييز التغيير على أنه اختيار مباشر؛ يسمح بتشغيل الأغنية الجديدة فورًا.
    pendingAutoplayRef.current = true;
    setCurrentSong(song);
    setIsPlaying(true);
    setCurrentTime(0);
    setProgress(0);
  };

  const togglePlay = () => {
    // مهم للموبايل: هذا الأمر يحدث مباشرة نتيجة ضغطة المستخدم
    const player = playerRef.current;
    if (!playerReady || !player) return;
    if (isPlaying) player.pauseVideo();
    else player.playVideo();
  };

  const playNext = () => {
    if (filteredSongs.length === 0) return;
    const currentIndex = filteredSongs.findIndex(s => s.id === currentSong?.id);
    const nextIndex = currentIndex === filteredSongs.length - 1 ? 0 : currentIndex + 1;
    selectSong(filteredSongs[nextIndex]);
  };

  const playPrevious = () => {
    if (filteredSongs.length === 0) return;
    const currentIndex = filteredSongs.findIndex(s => s.id === currentSong?.id);
    const prevIndex = currentIndex <= 0 ? filteredSongs.length - 1 : currentIndex - 1;
    selectSong(filteredSongs[prevIndex]);
  };

  useEffect(() => {
    nextSongRef.current = playNext;
    previousSongRef.current = playPrevious;
  });

  // بيانات وأوامر شاشة القفل: دعم إضافي حسب المتصفح، لكن YouTube قد لا يسمح باستمرار الصوت بالخلفية.
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentSong) return;

    try {
      if ('MediaMetadata' in window) {
        navigator.mediaSession.metadata = new window.MediaMetadata({
          title: currentSong.title || 'نَغَم',
          artist: currentSong.artist || 'غير معروف',
          album: 'منصة نَغَم'
        });
      }
      navigator.mediaSession.setActionHandler('play', () => playerRef.current?.playVideo?.());
      navigator.mediaSession.setActionHandler('pause', () => playerRef.current?.pauseVideo?.());
      navigator.mediaSession.setActionHandler('previoustrack', () => previousSongRef.current?.());
      navigator.mediaSession.setActionHandler('nexttrack', () => nextSongRef.current?.());
    } catch (error) {
      console.warn('Media Session غير مدعوم بالكامل في هذا المتصفح:', error);
    }

    return () => {
      try {
        ['play', 'pause', 'previoustrack', 'nexttrack'].forEach(action => {
          navigator.mediaSession.setActionHandler(action, null);
        });
      } catch {}
    };
  }, [currentSong?.id, playerReady]);

  const handleSeekClick = (e) => {
    const player = playerRef.current;
    const rect = e.currentTarget.getBoundingClientRect();
    if (!playerReady || !player || !duration || !rect.width) return;
    const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = fraction * duration;
    player.seekTo(newTime, true);
    setCurrentTime(newTime);
    setProgress(fraction * 100);
  };

  const formatTime = (time) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const handleAddSong = async (e) => {
    e.preventDefault();
    if (!newSong.title || !newSong.src) return alert('يرجى كتابة الاسم ووضع رابط يوتيوب');
    
    setIsUploading(true);
    let finalUrl = newSong.src;

    try {
      const videoId = getYouTubeVideoId(finalUrl);
      if (!videoId) throw new Error('رابط YouTube غير صالح');
      finalUrl = `https://www.youtube.com/embed/${videoId}`;

      const songData = {
        title: newSong.title,
        artist: newSong.artist || 'غير معروف',
        category: newSong.category,
        embed_url: finalUrl,
      };

      const { data: insertData, error: insertError } = await supabase.from('songs').insert([songData]).select();
      if (insertError) throw insertError;

      const addedSong = { ...insertData[0], src: finalUrl };
      setSongs([addedSong, ...songs]);
      setNewSong({ title: '', artist: '', category: 'tarab', src: '' });
      setShowAddModal(false);
      alert('تمت إضافة الأغنية بنجاح!');

    } catch (error) {
      alert('حدث خطأ أثناء الإضافة');
    } finally {
      setIsUploading(false);
    }
  };

  // دالة تسجيل الخروج الجديدة
  const handleLogout = () => {
    localStorage.removeItem('nagham_access_code');
    setSession(null);
  };

  return (
    <div dir="rtl" className={`min-h-screen pb-28 font-sans transition-colors duration-300 ${isDarkMode ? 'dark bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      
      <nav className="sticky top-0 z-50 backdrop-blur-lg bg-white/70 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setActiveTab('all')}>
              <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
                <AudioLines className="w-7 h-7 text-white" />
              </div>
              <span className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-l from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">نَغَم</span>
            </div>

            <div className="hidden md:flex items-center gap-6 font-medium">
              <button onClick={() => setActiveTab('all')} className={activeTab === 'all' ? 'text-indigo-600 font-bold' : 'hover:text-indigo-600'}>الرئيسية</button>
              <button onClick={() => setActiveTab('tarab')} className={activeTab === 'tarab' ? 'text-amber-600 font-bold' : 'hover:text-amber-600'}>طرب وبوب</button>
              <button onClick={() => setActiveTab('shaabi')} className={activeTab === 'shaabi' ? 'text-purple-600 font-bold' : 'hover:text-purple-600'}>شعبي ومهرجانات</button>
              <button onClick={() => setActiveTab('quran')} className={activeTab === 'quran' ? 'text-emerald-600 font-bold' : 'hover:text-emerald-600'}>إسلاميات وقرآن</button>
            </div>

            <div className="flex items-center gap-4">
              <button onClick={() => setShowAddModal(true)} className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-full text-sm font-bold shadow-md transition-all">
                <Plus className="w-4 h-4" /> إضافة أغنية
              </button>
              <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
                {isDarkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-slate-700" />}
              </button>
              <button onClick={handleLogout} className="p-2 rounded-full text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="تسجيل الخروج">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center bg-white dark:bg-gray-800 rounded-2xl px-4 py-4 shadow-sm border border-gray-200 dark:border-gray-700 w-full transition-colors">
            <Search className="w-6 h-6 text-gray-400" />
            <input type="text" placeholder="ابحث عن أغنية أو فنان..." className="bg-transparent border-none outline-none text-lg w-full mr-3 dark:text-white" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </div>

        {activeTab === 'all' && !searchQuery && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
            <div onClick={() => setActiveTab('tarab')} className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer hover:scale-105 transition-transform text-amber-700 dark:text-amber-400 shadow-sm">
              <Mic2 className="w-10 h-10 mb-3" /><h3 className="font-bold text-xl">طرب وبوب</h3>
            </div>
            <div onClick={() => setActiveTab('shaabi')} className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer hover:scale-105 transition-transform text-purple-700 dark:text-purple-400 shadow-sm">
              <Radio className="w-10 h-10 mb-3" /><h3 className="font-bold text-xl">شعبي ومهرجانات</h3>
            </div>
            <div onClick={() => setActiveTab('quran')} className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer hover:scale-105 transition-transform text-emerald-700 dark:text-emerald-400 shadow-sm">
              <Book className="w-10 h-10 mb-3" /><h3 className="font-bold text-xl">إسلاميات وقرآن</h3>
            </div>
          </div>
        )}

        <h2 className="text-2xl font-bold mb-4 dark:text-white">{searchQuery ? 'نتائج البحث' : 'قائمة التشغيل'}</h2>

        <div className="space-y-3">
          {filteredSongs.length > 0 ? filteredSongs.map((song) => {
            const isSelected = currentSong?.id === song.id;
            return (
            <div key={song.id} onClick={() => selectSong(song)} className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all border ${isSelected ? 'bg-indigo-50 border-indigo-500 dark:bg-indigo-900/30' : 'bg-white dark:bg-gray-800 border-transparent hover:border-gray-200 dark:hover:border-gray-700 shadow-sm'}`}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-white ${isSelected ? 'bg-indigo-600' : 'bg-gray-800 dark:bg-gray-700'}`}>
                  {isSelected && isPlaying ? <AudioLines className="animate-pulse" /> : <Play className="w-5 h-5 ml-1" />}
                </div>
                <div>
                  <h3 className={`font-bold text-lg ${isSelected ? 'text-indigo-700 dark:text-indigo-300' : 'dark:text-white'}`}>{song.title}</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">{song.artist}</p>
                </div>
              </div>
              <Heart className="text-gray-300 hover:text-rose-500 w-6 h-6 transition-colors" />
            </div>
          )}) : <div className="text-center py-10 text-gray-500 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">لا توجد نتائج.</div>}
        </div>
      </main>

      {/* مشغل YouTube ظاهر وقابل للتفاعل؛ الإخفاء الشديد قد يعطل التشغيل على الموبايل */}
      <div className="fixed bottom-24 left-4 z-40 w-[200px] h-[232px] rounded-xl overflow-hidden bg-black shadow-2xl border border-gray-700">
        <div className="bg-gray-900 text-white text-xs px-3 py-2 flex justify-between items-center">
          <span>مشغل نَغَم</span>
          <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-500' : 'bg-gray-500'}`}></span>
        </div>
        <div ref={playerHostRef} className="w-full h-[200px]" />
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-lg p-8 relative shadow-2xl">
            <button onClick={() => setShowAddModal(false)} className="absolute top-6 left-6 text-gray-400 hover:text-gray-800"><X className="w-6 h-6" /></button>
            <h2 className="text-2xl font-bold mb-6 dark:text-white">إضافة رابط يوتيوب</h2>

            <form onSubmit={handleAddSong} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسم الأغنية / التلاوة</label>
                <input required type="text" value={newSong.title} onChange={e => setNewSong({...newSong, title: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-800 border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسم الفنان / القارئ</label>
                <input required type="text" value={newSong.artist} onChange={e => setNewSong({...newSong, artist: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-800 border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">القسم</label>
                <select value={newSong.category} onChange={e => setNewSong({...newSong, category: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-800 border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white">
                  <option value="tarab">طرب وبوب</option><option value="shaabi">شعبي ومهرجانات</option><option value="quran">إسلاميات وقرآن</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">رابط يوتيوب</label>
                <input required type="url" value={newSong.src} onChange={e => setNewSong({...newSong, src: e.target.value})} className="w-full bg-gray-50 dark:bg-gray-800 border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white text-left" dir="ltr" placeholder="https://www.youtube.com/watch?v=..." />
              </div>

              <button type="submit" disabled={isUploading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl mt-4 transition-colors disabled:opacity-50">
                {isUploading ? 'جاري الإضافة...' : 'إضافة للمكتبة'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* شريط التشغيل السفلي الاحترافي */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-[0_-10px_30px_rgba(0,0,0,0.1)] px-4 py-3 z-50 transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-4 md:gap-8">
          
          <div className="flex-1 flex items-center gap-3 w-full">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-md flex items-center justify-center">
              <Music className="text-white w-7 h-7" />
            </div>
            <div>
              <h4 className="font-bold md:text-lg dark:text-white line-clamp-1">{currentSong?.title || 'اختر أغنية'}</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">{currentSong?.artist || '...'}</p>
            </div>
          </div>

          <div className="flex-[2] flex flex-col items-center w-full">
            <div className="flex items-center gap-6 mb-1 text-gray-800 dark:text-gray-200">
              <button onClick={playPrevious} className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"><SkipForward className="w-7 h-7" /></button>
              <button onClick={togglePlay} className="w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center hover:bg-indigo-700 transition-transform hover:scale-105 shadow-lg">
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
              </button>
              <button onClick={playNext} className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"><SkipBack className="w-7 h-7" /></button>
            </div>
            
            <div className="flex items-center w-full gap-3 text-xs text-gray-500 dark:text-gray-400 font-medium font-mono">
              <span>{formatTime(currentTime)}</span>
              <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full cursor-pointer relative overflow-hidden group" onClick={handleSeekClick} role="slider" aria-label="تقديم أو تأخير الأغنية" aria-valuemin={0} aria-valuemax={duration} aria-valuenow={currentTime}>
                <div className="absolute top-0 left-0 h-full bg-indigo-600 dark:bg-indigo-500 rounded-full group-hover:bg-indigo-400 transition-colors pointer-events-none" style={{ width: `${progress}%`, right: 0, left: 'auto' }}></div>
              </div>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="flex-1 hidden md:flex justify-end text-gray-400 dark:text-gray-500">
            <Volume2 className="w-6 h-6 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 3. المكون الرئيسي 
// ==========================================
export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // تسجيل Service Worker لتفعيل تجربة PWA والتثبيت على الشاشة الرئيسية.
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('/sw.js').catch(error => {
        console.warn('تعذر تسجيل Service Worker:', error);
      });
    }

    // جلب الكود من المتصفح لو مسجل من قبل
    const savedCode = localStorage.getItem('nagham_access_code');
    if (savedCode) {
      setSession(savedCode);
    }
    setLoading(false);
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>;

  return session ? <MainApp setSession={setSession} /> : <AuthScreen setSession={setSession} />;
}