import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, doc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { 
  ArrowRight, Plus, Loader2, X, Palette, LayoutDashboard, Trash2, Settings, Lock, Check, MoveHorizontal, Download 
} from 'lucide-react';

// --- Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyDLYv9I5teKj4a_0O0-YFqCtpGcLLjduPg",
  authDomain: "morning-program-f3704.firebaseapp.com",
  projectId: "morning-program-f3704",
  storageBucket: "morning-program-f3704.firebasestorage.app",
  messagingSenderId: "182910675825",
  appId: "1:182910675825:web:a3c69fa1b75987652264d0"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'morning-program-f3704';
const apiKey = "AIzaSyDsgxCymmAd51K_0gVg4f0ynDUlsihXcNI";

const CITIES = ["הרצליה", "תל אביב", "רמת גן", "גבעתיים", "רעננה", "כפר סבא", "הוד השרון", "רמת השרון", "ראשון לציון", "סביון", "בת ים", "חולון", "נס ציונה", "רחובות", "נתניה", "מודיעין / מכבים-רעות", "פתח תקוה", "קרית אונו", "ירושלים", "חיפה"];

// --- Gemini AI Helper (GUARANTEED ENDPOINT) ---
async function callGemini(morningStyle) {
  // THE FIX: Switched to v1beta and added "-latest" to guarantee it resolves
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
  
  const payload = {
    contents: [{
      parts: [{ text: `אתה קופירייטר שנון במגזין יוקרתי. כתוב טיפ קצר (עד 25 מילים) להורה שהבוקר שלו הוא: "${morningStyle}". הטיפ חייב לכלול עצה פרקטית וקריצה אלגנטית לשירות 'מהפכת הבוקר'. ענה בעברית בלבד ללא מרכאות.` }]
    }]
  };

  try {
    const response = await fetch(url, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(payload) 
    });
    
    if (!response.ok) {
      console.error(`HTTP Error: ${response.status} - ${response.statusText}`);
      return null;
    }
    
    const result = await response.json();
    return result.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (err) { 
    console.error("Gemini Error:", err);
    return null; 
  }
}

const INITIAL_DESIGN = {
  boxLeft: 3, boxRight: 3, dividerPos: 40,
  bgColors: ['#00A896', '#E85D75', '#F9A620'],
  elements: {
    engTitle: { text: "THE\nMORNING.", size: 2.8, color: '#18181b', visible: true },
    engSub: { text: "Reclaiming the first hour of the day.", size: 1.1, color: '#27272a', visible: true },
    heTag: { text: "Featured_Feature", size: 0.7, color: '#a1a1aa', visible: true },
    heTitle: { text: "מהפכת\nהבוקר.", size: 6.0, color: '#18181b', visible: true },
    heSub: { text: "גלו את פרופיל הבוקר שלכם", size: 3.5, color: '#E85D75', visible: true },
    beginBtn: { text: "BEGIN_NOW", size: 1.0, color: '#18181b', visible: true },
  }
};

const QUESTIONS = [
  { id: 1, text: "איך נראה הבוקר שלכם בדרך כלל?", options: [{ id: 'A', text: "🎯 מתוקתק בשליטה" }, { id: 'B', text: "🏃‍♂️ ריצת אמוק" }, { id: 'C', text: "🤝 משא ומתן תמידי" }, { id: 'D', text: "🧘‍♂️ בוקר של זן" }] },
  { id: 2, text: "מי אחראי על הפיזורים?", options: [{ id: 'mom', text: "👩 אמא" }, { id: 'dad', text: "👨 אבא" }, { id: 'grand', text: "👵 סבא/סבתא" }, { id: 'nanny', text: "🧑‍🍼 בייביסיטר" }, { id: 'alone', text: "🚶‍♂️ הולכים לבד" }] },
  { id: 3, text: "תדירות שליחת הילד עם כסף לאוכל?", options: [{ id: '0', text: "🚫 אף פעם" }, { id: '1', text: "📅 פעם בשבוע" }, { id: 'often', text: "🔄 לעיתים קרובות" }] },
  { id: 4, text: "מה הסטנדרט הנוכחי בקופסה שיוצאת מהבית?", options: [{ id: 'survival', text: "🥪 נטו הישרדות" }, { id: 'basic', text: "🍎 בייסיק פלוס" }, { id: 'extra', text: "🍱 אקסטרה פנק" }, { id: 'bento', text: "🧑‍🍳 מאסטר-שף" }] },
  { id: 5, text: "מהו ״כריך ההצלה״ שלך?", options: [{ id: 'spread', text: "🍫 ממרח וברח" }, { id: 'classic', text: "🍳 הקלאסיקות" }, { id: 'toast', text: "🔥 טוסט" }, { id: 'gourmet', text: "🥑 מושקע" }] },
  { id: 6, text: "תוספת החלומות לארוחה?", options: [{ id: 'veg', text: "🥗 ירקות חתוכים" }, { id: 'protein', text: "🥚 חלבון איכותי" }, { id: 'fruit', text: "🍎 סלט פירות" }, { id: 'snack', text: "🥨 נשנוש בריא" }] },
  { id: 7, text: "הסוד לקופסה שחוזרת ריקה?", options: [{ id: 'texture', text: "✨ מרקם טרי" }, { id: 'surprise', text: "🎁 גיוון יומי" }, { id: 'classic', text: "❤️ המוכר והאהוב" }, { id: 'pack', text: "🍱 אריזה מגרה" }] },
  { id: 8, text: "דרישות תזונתית?", options: [{ id: 'none', text: "✅ אין" }, { id: 'veg', text: "🌱 צמחוני" }, { id: 'allergy', text: "⚠️ אלרגיה" }, { id: 'gf', text: "🌾 ללא גלוטן" }] },
  { id: 9, text: "חשיבות כשרות?", options: [{ id: 'critical', text: "🕍 קריטי" }, { id: 'preferred', text: "👍 חשוב" }, { id: 'not', text: "🤷‍♂️ לא משפיע" }] },
  { id: 10, text: "מעבר ליד בית קפה בבוקר?", options: [{ id: 'daily', text: "☕ כל יום" }, { id: 'most', text: "🌤️ רוב הימים" }, { id: 'rarely', text: "🚶‍♂️ לעיתים רחוקות" }] },
  { id: 11, text: "ארוחה ב-30 שניות בדרך לבי״ס?", options: [{ id: '1-3', text: "🙂 נחמד" }, { id: '4-7', text: "🙏 יעזור מאוד" }, { id: '8-10', text: "🤯 משנה חיים!" }] },
  { id: 12, text: "סיבה עיקרית להגיד 'כן'?", options: [{ id: 'sanity', text: "🧘‍♀️ שפיות" }, { id: 'nutrition', text: "💪 תזונה" }, { id: 'ritual', text: "🔄 הריטואל" }, { id: 'quality', text: "⭐ איכות" }] },
  { id: 13, text: "סיבה עיקרית להגיד 'לא'?", options: [{ id: 'trust', text: "🕵️‍♂️ אמון" }, { id: 'logistics', text: "🛑 העצירה בדרך" }, { id: 'picky', text: "😒 בררנות הילד" }, { id: 'price', text: "💰 עלות" }] },
  { id: 14, text: "מחיר הוגן לארוחה מלאה?", options: [{ id: 'low', text: "🪙 22-26 ש\"ח" }, { id: 'mid', text: "💵 27-30 ש\"ח" }, { id: 'high', text: "💎 31 ש\"ח ומעלה" }] }
];

const TOTAL_QS = QUESTIONS.length;

// --- Sub-Components ---
const ColorBlocks = ({ design, setDesign, editMode }) => {
  const absDivPos = design.boxLeft + ((100 - design.boxLeft - design.boxRight) * (design.dividerPos / 100));
  return (
    <div className="fixed inset-0 z-0 flex overflow-hidden pointer-events-none">
      <div style={{ width: `${absDivPos}vw`, backgroundColor: design.bgColors[0] }} className="h-full relative pointer-events-auto transition-none">
        {editMode && <label className="absolute top-6 left-6 cursor-pointer p-3 bg-white/20 rounded-full flex shadow-lg backdrop-blur-sm transition-all"><Palette size={18} className="text-white"/><input type="color" className="sr-only" value={design.bgColors[0]} onChange={e => setDesign(d => ({...d, bgColors: [e.target.value, d.bgColors[1], d.bgColors[2]]}))}/></label>}
      </div>
      <div style={{ width: '30%', backgroundColor: design.bgColors[1] }} className="h-full relative pointer-events-auto transition-none">
        {editMode && <label className="absolute top-6 left-6 cursor-pointer p-3 bg-white/20 rounded-full flex shadow-lg backdrop-blur-sm transition-all"><Palette size={18} className="text-white"/><input type="color" className="sr-only" value={design.bgColors[1]} onChange={e => setDesign(d => ({...d, bgColors: [d.bgColors[0], e.target.value, d.bgColors[2]]}))}/></label>}
      </div>
      <div className="flex-1 h-full relative pointer-events-auto transition-none" style={{ backgroundColor: design.bgColors[2] }}>
        {editMode && <label className="absolute top-6 left-6 cursor-pointer p-3 bg-white/20 rounded-full flex shadow-lg backdrop-blur-sm transition-all"><Palette size={18} className="text-white"/><input type="color" className="sr-only" value={design.bgColors[2]} onChange={e => setDesign(d => ({...d, bgColors: [d.bgColors[0], d.bgColors[1], e.target.value]}))}/></label>}
      </div>
    </div>
  );
};

const AdminDashboard = ({ submissions, onClose, onDelete }) => {
  const exportCSV = () => {
    let csv = "\uFEFFתאריך,שם,טלפון,אימייל,עיר,ילדים,תשובות\n";
    submissions.forEach(s => {
      const cStr = s.household?.children?.map(c => `${c.age}(${c.school})`).join(' | ') || '';
      csv += `${new Date(s.timestamp).toLocaleString()},${s.lead?.name || 'אנונימי'},${s.lead?.phone || ''},${s.lead?.email || ''},${s.household?.city || ''},"${cStr}","${JSON.stringify(s.answers)}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "morning_results.csv";
    link.click();
  };

  return (
    <div className="fixed inset-0 z-[200] bg-white p-8 md:p-16 text-right overflow-y-auto" dir="rtl">
      <div className="flex justify-between items-center mb-12 border-b-8 border-zinc-900 pb-8">
        <h1 className="text-6xl font-black italic uppercase">Results.</h1>
        <div className="flex gap-4">
          <button onClick={exportCSV} className="bg-[#00A896] text-white px-6 py-3 font-bold flex items-center gap-2"><Download size={20}/> EXPORT</button>
          <button onClick={onClose} className="bg-zinc-900 text-white p-4"><X size={32}/></button>
        </div>
      </div>
      <table className="w-full text-right border-collapse">
        <thead className="bg-zinc-900 text-white"><tr className="font-black uppercase tracking-widest text-xs"><th className="p-4 text-right">שם</th><th className="p-4 text-right">טלפון</th><th className="p-4 text-right">עיר</th><th className="p-4 text-right"></th></tr></thead>
        <tbody>
          {submissions.map(s => (
            <tr key={s.id} className="border-b hover:bg-zinc-50 transition-colors">
              <td className="p-4 font-bold">{s.isGuest ? 'אנונימי' : s.lead?.name}</td>
              <td className="p-4">{s.lead?.phone || '-'}</td>
              <td className="p-4">{s.household?.city}</td>
              <td className="p-4"><button onClick={() => onDelete(s.id)} className="text-red-500 hover:scale-110 transition-transform"><Trash2 size={18}/></button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const EditableText = ({ id, className, design, setDesign, editMode, editingId, setEditingId, isRem = false }) => {
  const el = design.elements[id];
  if (!el || !el.visible) return null;
  const unit = isRem ? 'rem' : 'vw';
  const isSelected = editingId === id;
  return (
    <div className="relative inline-block w-full">
      <div onClick={(e) => { if (editMode) { e.stopPropagation(); setEditingId(id); } }} style={{ fontSize: `${el.size}${unit}`, color: el.color }} className={`${className} ${editMode ? 'cursor-pointer hover:bg-black/5' : ''}`}>
        {el.text}
      </div>
      {isSelected && editMode && (
        <div className="absolute top-full left-0 mt-3 bg-zinc-950 text-white p-3 rounded-xl z-[200] flex gap-4 items-center animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
          <textarea value={el.text} onChange={e => setDesign(d => ({...d, elements: {...d.elements, [id]: {...el, text: e.target.value}}}))} className="bg-white/10 p-2 rounded w-40 h-10 resize-none text-xs" />
          <input type="number" step="0.1" value={el.size} onChange={e => setDesign(d => ({...d, elements: {...d.elements, [id]: {...el, size: parseFloat(e.target.value)}}}))} className="w-14 bg-white/10 p-1 rounded text-xs text-black" />
          <input type="color" value={el.color} onChange={e => setDesign(d => ({...d, elements: {...d.elements, [id]: {...el, color: e.target.value}}}))} className="w-8 h-8 rounded" />
          <button onClick={() => setEditingId(null)} className="p-2 hover:bg-white/10 rounded-lg"><Check size={18}/></button>
        </div>
      )}
    </div>
  );
};

// --- Main App ---
export default function App() {
  const [user, setUser] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [household, setHousehold] = useState({ city: '', children: [{ id: Date.now(), age: '', school: '' }] });
  const [leadInfo, setLeadInfo] = useState({ name: '', phone: '', email: '' });
  const [submissions, setSubmissions] = useState([]);
  const [showAdmin, setShowAdmin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiTip, setAiTip] = useState("");
  const [isGeneratingTip, setIsGeneratingTip] = useState(false);
  const [design, setDesign] = useState(INITIAL_DESIGN);
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [dragState, setDragState] = useState(null);
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [secretClicks, setSecretClicks] = useState(0);
  const [showPinPrompt, setShowPinPrompt] = useState(false);
  const [pinInput, setPinInput] = useState("");

  useEffect(() => {
    onAuthStateChanged(auth, setUser);
    signInAnonymously(auth);
  }, []);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'survey_results'), (snap) => {
      setSubmissions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error("Firestore error:", err));
  }, [user]);

  const save = async (data) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'survey_results'), {
        ...data, household, timestamp: new Date().toISOString(), userId: user.uid
      });
      setStep(TOTAL_QS + 3);
    } catch (err) { console.error(err); }
    finally { setIsSubmitting(false); }
  };

  const generateTip = async () => {
    setIsGeneratingTip(true);
    const q1ID = QUESTIONS[0].id;
    const styleText = QUESTIONS[0].options.find(o => o.id === answers[q1ID])?.text || "רגיל";
    const result = await callGemini(styleText);
    setAiTip(result || "נראה שה-AI קצת עמוס כרגע. נסו שוב!");
    setIsGeneratingTip(false);
  };

  useEffect(() => {
    const handleMove = (e) => {
      if (!dragState) return;
      const pxToVw = (e.clientX / window.innerWidth) * 100;
      if (dragState === 'boxLeft') setDesign(d => ({ ...d, boxLeft: Math.max(0, Math.min(pxToVw, 80)) }));
      else if (dragState === 'boxRight') setDesign(d => ({ ...d, boxRight: Math.max(0, Math.min(100 - pxToVw, 80)) }));
      else if (dragState === 'divider') {
        const boxW = 100 - design.boxLeft - design.boxRight;
        setDesign(d => ({ ...d, dividerPos: Math.max(10, Math.min(((pxToVw - design.boxLeft) / boxW) * 100, 90)) }));
      }
    };
    const handleUp = () => setDragState(null);
    if (dragState) { window.addEventListener('pointermove', handleMove); window.addEventListener('pointerup', handleUp); }
    return () => { window.removeEventListener('pointermove', handleMove); window.removeEventListener('pointerup', handleUp); };
  }, [dragState, design]);

  return (
    <div onClick={() => setEditingId(null)} className="min-h-screen bg-transparent flex items-center justify-center font-sans overflow-hidden relative">
      <ColorBlocks design={design} setDesign={setDesign} editMode={editMode} />
      <div onClick={() => setSecretClicks(s => s + 1 >= 5 ? (setShowPinPrompt(true), 0) : s + 1)} className="fixed bottom-0 left-0 w-12 h-12 z-[9999] cursor-default" />

      {showPinPrompt && (
        <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center" dir="rtl">
          <div className="bg-white p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 text-right">
            <h3 className="text-2xl font-black mb-4 italic uppercase tracking-tighter">Admin_Access.</h3>
            <form onSubmit={e => { e.preventDefault(); if (pinInput === '2002') { setIsAdminUnlocked(true); setShowPinPrompt(false); } }}>
              <input type="password" autoFocus className="w-full p-4 bg-zinc-50 border-b-4 mb-4 text-center text-3xl outline-none" value={pinInput} onChange={e => setPinInput(e.target.value)} />
              <button type="submit" className="w-full py-4 bg-zinc-900 text-white font-black uppercase tracking-widest transition-colors hover:bg-[#00A896]">Unlock</button>
            </form>
            <button onClick={() => setShowPinPrompt(false)} className="mt-4 w-full text-[10px] uppercase font-bold text-zinc-400">Cancel</button>
          </div>
        </div>
      )}

      {editMode && (
        <>
          <div onPointerDown={(e) => {e.stopPropagation(); setDragState('boxLeft');}} className="absolute top-0 bottom-0 z-[150] cursor-ew-resize w-6 -ml-3" style={{ left: `${design.boxLeft}vw` }}><div className="h-full w-2 bg-black/10 transition-colors hover:bg-black/30" /></div>
          <div onPointerDown={(e) => {e.stopPropagation(); setDragState('boxRight');}} className="absolute top-0 bottom-0 z-[150] cursor-ew-resize w-6 -mr-3" style={{ right: `${design.boxRight}vw` }}><div className="h-full w-2 bg-black/10 transition-colors hover:bg-black/30" /></div>
        </>
      )}

      <div className="fixed inset-0 m-auto h-[100vh] md:h-[88vh] z-10 flex flex-col md:flex-row overflow-hidden shadow-2xl bg-white transition-all duration-300" style={{ left: `${design.boxLeft}vw`, right: `${design.boxRight}vw` }}>
        
        <div style={{ width: `${design.dividerPos}%` }} className="bg-zinc-50 flex flex-col p-6 md:p-10 relative overflow-hidden h-1/3 md:h-full flex-shrink-0" dir="ltr">
           <div className="absolute inset-0 bg-cover bg-center opacity-25 grayscale pointer-events-none" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1542310503-68f76378e9f5?q=80&w=2000')" }} />
           <div className="mt-auto relative z-10 w-full">
              <EditableText id="engTitle" className="font-black tracking-tighter leading-[0.75] mb-6 italic uppercase whitespace-pre-wrap" design={design} setDesign={setDesign} editMode={editMode} editingId={editingId} setEditingId={setEditingId} />
              <div className="space-y-4 border-t-[6px] border-zinc-900 pt-4 max-w-[90%]"><EditableText id="engSub" className="font-black leading-tight uppercase tracking-tighter" isRem={true} design={design} setDesign={setDesign} editMode={editMode} editingId={editingId} setEditingId={setEditingId} /></div>
           </div>
        </div>

        {editMode && <div onPointerDown={(e) => {e.stopPropagation(); setDragState('divider');}} className="absolute top-0 bottom-0 z-[150] cursor-col-resize hidden md:flex justify-center items-center w-8 -ml-4" style={{ left: `${design.dividerPos}%` }}><div className="h-full w-1 bg-black/20" /></div>}

        <div className="flex-1 p-6 md:p-12 flex flex-col justify-center text-right border-r border-zinc-100 relative overflow-y-auto min-w-0" dir="rtl">
          
          {step === 0 && (
            <div className="animate-in fade-in slide-in-from-right-12 duration-1000">
               <div className="flex items-center gap-4 mb-6"><div className="h-0.5 w-12 bg-zinc-900" /><EditableText id="heTag" className="font-black uppercase tracking-widest italic text-zinc-400" isRem={true} design={design} setDesign={setDesign} editMode={editMode} editingId={editingId} setEditingId={setEditingId} /></div>
               <div className="mb-6"><EditableText id="heTitle" className="font-black leading-[0.85] tracking-tighter uppercase italic whitespace-pre-wrap" design={design} setDesign={setDesign} editMode={editMode} editingId={editingId} setEditingId={setEditingId} /></div>
               <div className="mb-10"><EditableText id="heSub" className="font-black leading-tight tracking-tight italic uppercase" design={design} setDesign={setDesign} editMode={editMode} editingId={editingId} setEditingId={setEditingId} /></div>
               <button onClick={() => setStep(1)} className="flex items-center gap-4 p-1 border-b-4 border-transparent hover:border-zinc-900 transition-all w-fit group">
                  <EditableText id="beginBtn" className="font-black italic tracking-tighter uppercase group-hover:opacity-70" isRem={true} design={design} setDesign={setDesign} editMode={editMode} editingId={editingId} setEditingId={setEditingId} />
                  <div className="w-10 h-10 bg-zinc-900 text-white flex items-center justify-center group-hover:translate-x-[-6px] transition-transform"><ArrowRight size={20} className="rotate-180" /></div>
               </button>
            </div>
          )}

          {step === 1 && (
            <div className="w-full max-w-3xl mx-auto">
               <h2 className="text-4xl md:text-5xl font-black italic mb-3 uppercase tracking-tighter">THE_CREW.</h2>
               <form onSubmit={e => { e.preventDefault(); setStep(2); }} className="space-y-4">
                  <div className="bg-zinc-50 border-r-4 border-[#00A896] p-4 text-right">
                    <label className="block text-xs font-black uppercase tracking-widest text-[#00A896] mb-1">עיר מגורים</label>
                    <select required className="bg-transparent border-b-2 border-zinc-200 outline-none font-bold w-full py-1 text-lg text-black" value={household.city} onChange={e => setHousehold({...household, city: e.target.value})}>
                      <option value="">בחר עיר...</option>
                      {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-3">
                    {household.children.map(child => (
                      <div key={child.id} className="flex gap-3 bg-zinc-50 border-r-4 border-zinc-100 p-3">
                        <input required type="number" min="6" max="18" placeholder="גיל" className="bg-transparent border-b border-zinc-200 w-32 font-bold text-right text-black" value={child.age} onChange={e => setHousehold(h => ({...h, children: h.children.map(c => c.id === child.id ? {...c, age: e.target.value} : c)}))} />
                        <input required placeholder="שם בית ספר" className="bg-transparent border-b border-zinc-200 w-full font-bold text-right text-black" value={child.school} onChange={e => setHousehold(h => ({...h, children: h.children.map(c => c.id === child.id ? {...c, school: e.target.value} : c)}))} />
                        {household.children.length > 1 && (<button type="button" onClick={() => setHousehold(h => ({...h, children: h.children.filter(c => c.id !== child.id)}))}><Trash2 size={16}/></button>)}
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={() => setHousehold(h => ({...h, children: [...h.children, {id: Date.now(), age: '', school: ''}]}))} className="text-[#E85D75] font-bold text-xs uppercase tracking-widest hover:text-zinc-900 transition-colors">+ ADD_CHILD</button>
                  <button type="submit" className="w-full py-4 bg-zinc-900 text-white font-black text-xl flex items-center justify-center gap-3 shadow-lg hover:bg-[#00A896] transition-colors">CONTINUE <ArrowRight size={20} /></button>
               </form>
               <button onClick={() => setStep(0)} className="mt-4 text-zinc-300 text-[10px] uppercase font-black hover:text-zinc-900 transition-colors">[ BACK ]</button>
            </div>
          )}

          {step >= 2 && step <= TOTAL_QS + 1 && (
            <div className="w-full max-w-3xl mx-auto text-right">
               <div className="w-full flex gap-1 mb-6">{QUESTIONS.map((_, i) => (<div key={i} className={`h-1.5 flex-1 ${i < (step - 1) ? 'bg-zinc-900' : 'bg-zinc-100'}`} />))}</div>
               <div className="mb-6"><span className="font-black text-[#E85D75] text-xl block mb-2 tracking-widest">{step - 1}_</span><h3 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-tighter text-zinc-900 leading-tight uppercase">{QUESTIONS[step-2].text}</h3></div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{QUESTIONS[step-2].options.map(opt => (
                 <button key={opt.id} onClick={() => {setAnswers({...answers, [QUESTIONS[step-2].id]: opt.id}); setTimeout(() => setStep(step + 1), 200);}} className="p-4 md:p-5 text-right border-r-[8px] bg-zinc-50 border-zinc-100 hover:border-zinc-900 hover:bg-zinc-900 hover:text-white transition-all font-black text-lg">{opt.text}</button>
               ))}</div>
               <button onClick={() => setStep(step - 1)} className="mt-8 text-zinc-300 text-[10px] uppercase font-black hover:text-zinc-900 transition-colors">[ BACK ]</button>
            </div>
          )}

          {step === TOTAL_QS + 2 && (
            <div className="w-full max-w-3xl mx-auto text-right">
               <h2 className="text-5xl font-black italic mb-3 uppercase tracking-tighter">THE_JOIN.</h2>
               <form onSubmit={e => { e.preventDefault(); save({ answers, lead: leadInfo, isGuest: false }); }} className="space-y-4">
                  <input required placeholder="שם מלא (פרטי ומשפחה)" pattern="^\s*\S+\s+\S+.*$" className="p-4 bg-zinc-50 border-r-[6px] w-full font-black text-lg italic text-right outline-none text-black" value={leadInfo.name} onChange={e => setLeadInfo({...leadInfo, name: e.target.value})} />
                  <input required type="tel" pattern="^05\d-?\d{7}$" placeholder="טלפון (05X-XXXXXXX)" className="p-4 bg-zinc-50 border-r-[6px] w-full font-black text-lg italic text-right outline-none text-black" value={leadInfo.phone} onChange={e => setLeadInfo({...leadInfo, phone: e.target.value})} />
                  <input required type="email" placeholder="אימייל" className="p-4 bg-zinc-50 border-r-[6px] w-full font-black text-lg italic text-right outline-none text-black" value={leadInfo.email} onChange={e => setLeadInfo({...leadInfo, email: e.target.value})} />
                  <button className="w-full py-5 bg-zinc-900 text-white font-black text-2xl italic hover:bg-[#E85D75] shadow-xl uppercase transition-all">JOIN_ALPHA_PILOT</button>
               </form>
               <button onClick={() => save({ answers, isGuest: true })} className="mt-6 text-zinc-300 text-[10px] font-black uppercase underline block hover:text-zinc-900 transition-colors">Continue anonymously</button>
               <button onClick={() => setStep(TOTAL_QS + 1)} className="mt-4 text-zinc-300 text-[10px] uppercase font-black hover:text-zinc-900 transition-colors">[ BACK ]</button>
            </div>
          )}

          {step === TOTAL_QS + 3 && (
            <div className="h-full flex flex-col justify-center text-right">
               <h2 className="text-[6vw] md:text-[5vw] font-black italic text-[#00A896] uppercase tracking-tighter leading-none mb-4 tracking-tighter">PROFILE_READY_</h2>
               <div className="flex flex-col gap-6 pt-2">
                  <div><p className="text-4xl font-black mb-2 uppercase italic text-right text-zinc-900">{answers[1] === 'A' || answers[1] === 'D' ? 'ZEN_MODEL' : 'PULSE_MODEL'}</p></div>
                  <div className="w-full bg-zinc-900 text-white p-6 rounded-xl shadow-xl min-h-[140px] flex flex-col justify-center relative overflow-hidden">
                     {!aiTip ? (
                       <button onClick={generateTip} disabled={isGeneratingTip} className="w-full py-4 bg-[#F9A620]/10 text-[#F9A620] font-black uppercase border border-[#F9A620]/30 rounded-lg hover:bg-[#F9A620] hover:text-black transition-all">
                          {isGeneratingTip ? <Loader2 size={24} className="animate-spin m-auto" /> : <>✨ קבלו ניתוח AI לשגרת הבוקר שלכם</>}
                       </button>
                     ) : (
                       <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2"><span className="text-[10px] font-black text-[#F9A620] uppercase tracking-widest text-right">AI_Lifestyle_Hack</span><p className="text-base italic border-r-4 border-[#F9A620]/50 pr-4 text-zinc-300 text-right">"{aiTip}"</p></div>
                     )}
                  </div>
               </div>
            </div>
          )}
        </div>
      </div>

      {isAdminUnlocked && (
        <div className="fixed bottom-6 right-6 z-[300] flex flex-col items-end gap-3 animate-in slide-in-from-bottom">
          <button onClick={() => { setEditMode(!editMode); setEditingId(null); }} className={`p-4 rounded-full shadow-2xl transition-all ${editMode ? 'bg-[#E85D75] text-white scale-110' : 'bg-white text-zinc-900 hover:bg-zinc-100'}`}><Settings size={24} /></button>
          <button onClick={() => setShowAdmin(true)} className="p-4 rounded-full bg-white shadow-2xl text-zinc-900 hover:bg-zinc-100 transition-all"><LayoutDashboard size={24} /></button>
        </div>
      )}
      {showAdmin && <AdminDashboard submissions={submissions} onClose={() => setShowAdmin(false)} onDelete={id => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'survey_results', id))} />}
    </div>
  );
}