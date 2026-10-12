import React, { useState, useEffect } from 'react';
import { Play, Search, Menu, Music, AudioLines, Sun, Moon, Heart, Plus, X } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// بيانات الربط بقاعدة بيانات Supabase الخاصة بيك
const supabaseUrl = 'https://gsuntpgcmthruapyhidd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzdW50cGdjbXRocnVhcHloaWRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4Mzc2ODQsImV4cCI6MjEwNzQxMzY4NH0.IK3kVIwVtsXjFGJtZPejD6gGj47RKN8-1E-c6ThIDHQ';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function NaghamApp() {
  const [activeTab, setActiveTab] = useState('all');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [songs, setSongs] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [newSong, setNewSong] = useState({ title: '', artist: '', category: 'tarab', embed_url: '' });

  // جلب الأغاني من الداتا بيز أول ما الموقع يفتح
  useEffect(() => {
    fetchSongs();
    const savedFavs = localStorage.getItem('naghamFavorites');
    if (savedFavs) setFavorites(JSON.parse(savedFavs));
  }, []);

  const fetchSongs = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('songs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching songs:', error);
    } else {
      // لو الداتا بيز فاضية، هنعرض دول كبداية
      if (data.length === 0) {
        setSongs([
          { id: 1, title: "موسيقى لوفي هادئة", artist: "Lofi Girl", category: "tarab", embed_url: "https://www.youtube.com/embed/jfKfPfyJRdk" },
          { id: 2, title: "تلاوة مريحة للأعصاب", artist: "تلاوات هادئة", category: "quran", embed_url: "https://www.youtube.com/embed/7V2GnbbH_sM" }
        ]);
      } else {
        setSongs(data);
      }
    }
    setIsLoading(false);
  };

  const handleAddSong = async (e) => {
    e.preventDefault();
    if (!newSong.title || !newSong.embed_url) return;

    let finalEmbedUrl = newSong.embed_url;
    if (finalEmbedUrl.includes('watch?v=')) {
      finalEmbedUrl = finalEmbedUrl.replace('watch?v=', 'embed/');
      finalEmbedUrl = finalEmbedUrl.split('&')[0];
    } else if (finalEmbedUrl.includes('youtu.be/')) {
      finalEmbedUrl = finalEmbedUrl.replace('youtu.be/', 'www.youtube.com/embed/');
      finalEmbedUrl = finalEmbedUrl.split('?')[0];
    }

    const songData = {
      title: newSong.title,
      artist: newSong.artist || 'غير معروف',
      category: newSong.category,
      embed_url: finalEmbedUrl,
    };

    const { data, error } = await supabase.from('songs').insert([songData]).select();

    if (error) {
      alert('حصلت مشكلة أثناء الإضافة');
    } else {
      setSongs([data[0], ...songs]);
      setNewSong({ title: '', artist: '', category: 'tarab', embed_url: '' });
      setShowAddModal(false);
      alert('تمت إضافة الأغنية بنجاح!');
    }
  };

  const toggleFavorite = (song) => {
    let updatedFavs;
    if (favorites.some(f => f.id === song.id)) {
      updatedFavs = favorites.filter(f => f.id !== song.id);
    } else {
      updatedFavs = [...favorites, song];
    }
    setFavorites(updatedFavs);
    localStorage.setItem('naghamFavorites', JSON.stringify(updatedFavs));
  };

  const displayedSongs = activeTab === 'favorites' ? favorites : songs;
  const filteredSongs = displayedSongs.filter(song => {
    const matchesTab = activeTab === 'all' || activeTab === 'favorites' || song.category === activeTab;
    const matchesSearch = song.title.includes(searchQuery) || (song.artist && song.artist.includes(searchQuery));
    return matchesTab && matchesSearch;
  });

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
              <button onClick={() => setActiveTab('tarab')} className={activeTab === 'tarab' ? 'text-amber-600' : 'hover:text-amber-600'}>طرب وبوب</button>
              <button onClick={() => setActiveTab('shaabi')} className={activeTab === 'shaabi' ? 'text-purple-600' : 'hover:text-purple-600'}>شعبي ومهرجانات</button>
              <button onClick={() => setActiveTab('quran')} className={activeTab === 'quran' ? 'text-emerald-600' : 'hover:text-emerald-600'}>إسلاميات</button>
              <button onClick={() => setActiveTab('favorites')} className={activeTab === 'favorites' ? 'text-rose-600' : 'hover:text-rose-600'}>مفضلتي 🤍</button>
            </div>

            <div className="flex items-center gap-4">
              <button onClick={() => setShowAddModal(true)} className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-full text-sm font-bold">
                <Plus className="w-4 h-4" /> إضافة نغم
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
          <div>
            <h1 className="text-4xl font-bold mb-2 dark:text-white">أحدث الإضافات</h1>
            <p className="text-gray-500 dark:text-gray-400">أي أغنية بتضيفها بتظهر هنا فوراً لكل الناس!</p>
          </div>
          
          <div className="flex items-center bg-white dark:bg-gray-800 rounded-full px-4 py-3 shadow-sm border border-gray-200 dark:border-gray-700">
            <Search className="w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="ابحث في الأغاني..." 
              className="bg-transparent border-none outline-none text-md w-full md:w-64 mr-3 dark:text-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-20 text-gray-500">جاري تحميل الأغاني من قاعدة البيانات... ⏳</div>
        ) : (
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
                  <h3 className="text-xl font-bold mb-1 dark:text-white">{song.title}</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">{song.artist}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-lg p-8 relative">
            <button onClick={() => setShowAddModal(false)} className="absolute top-6 left-6 text-gray-400"><X /></button>
            <h2 className="text-2xl font-bold mb-6 dark:text-white">إضافة نغم جديد</h2>
            <form onSubmit={handleAddSong} className="space-y-4">
              <div>
                <label className="block text-sm mb-1 dark:text-white">اسم الأغنية</label>
                <input required type="text" value={newSong.title} onChange={e => setNewSong({...newSong, title: e.target.value})} className="w-full border rounded-xl px-4 py-3 outline-none dark:bg-gray-800 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm mb-1 dark:text-white">اسم الفنان</label>
                <input required type="text" value={newSong.artist} onChange={e => setNewSong({...newSong, artist: e.target.value})} className="w-full border rounded-xl px-4 py-3 outline-none dark:bg-gray-800 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm mb-1 dark:text-white">رابط يوتيوب</label>
                <input required type="url" value={newSong.embed_url} onChange={e => setNewSong({...newSong, embed_url: e.target.value})} className="w-full border rounded-xl px-4 py-3 outline-none text-left dark:bg-gray-800 dark:text-white" dir="ltr" />
              </div>
              <div>
                <label className="block text-sm mb-1 dark:text-white">التصنيف</label>
                <select value={newSong.category} onChange={e => setNewSong({...newSong, category: e.target.value})} className="w-full border rounded-xl px-4 py-3 outline-none dark:bg-gray-800 dark:text-white">
                  <option value="tarab">طرب وبوب</option>
                  <option value="shaabi">شعبي ومهرجانات</option>
                  <option value="quran">إسلاميات وقرآن</option>
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