import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { 
  ChevronRight, 
  LayoutDashboard, 
  ArrowRight,
  Plus,
  Sparkles,
  Loader2,
  Quote,
  X,
  Palette,
  MoveHorizontal,
  Check,
  Settings,
  Trash2,
  Download,
  Lock
} from 'lucide-react';

// --- Firebase & Gemini Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyDLYv9I5teKj4a_0O0-YFqCtpGcLLjduPg",
  authDomain: "morning-program-f3704.firebaseapp.com",
  projectId: "morning-program-f3704",
  storageBucket: "morning-program-f3704.firebasestorage.app",
  messagingSenderId: "182910675825",
  appId: "1:182910675825:web:a3c69fa1b75987652264d0",
  measurementId: "G-RJG9HBML14"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'morning-program-f3704';
const apiKey = "AIzaSyAXtc277vqC2dP8wOR3tHu1m8LUUe1mBJI"; // Your Gemini key from earlier

// --- Gemini API Helper ---
async function callGemini(prompt, systemInstruction = "") {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] }
  };
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    return result.candidates?.[0]?.content?.parts?.[0]?.text || "";
  } catch (err) { return ""; }
}

// --- Default Design Values ---
const INITIAL_DESIGN = {
  boxLeft: 3,    
  boxRight: 3,   
  dividerPos: 40, 
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

// --- Survey Data ---
const QUESTIONS = [
  { id: 1, text: "איך נראה הבוקר שלכם בדרך כלל?", options: [{ id: 'A', text: "🎯 מתוקתק בשליטה" }, { id: 'B', text: "🏃‍♂️ ריצת אמוק" }, { id: 'C', text: "🤝 משא ומתן תמידי" }, { id: 'D', text: "🧘‍♂️ בוקר של זן" }] },
  { id: 2, text: "מי אחראי על הפיזורים?", options: [{ id: 'mom', text: "👩 אמא" }, { id: 'dad', text: "👨 אבא" }, { id: 'grand', text: "👵 סבא/סבתא" }, { id: 'nanny', text: "🧑‍🍼 בייביסיטר" }, { id: 'alone', text: "🚶‍♂️ הולכים לבד" }] },
  { id: 3, text: "תדירות שליחת הילד עם כסף לאוכל?", options: [{ id: '0', text: "🚫 אף פעם" }, { id: '1', text: "📅 פעם בשבוע" }, { id: 'often', text: "🔄 לעיתים קרובות" }] },
  { id: 4, text: "מה הסטנדרט הנוכחי בקופסה שיוצאת מהבית?", options: [{ id: 'survival', text: "🥪 נטו הישרדות (כריך וזהו)" }, { id: 'basic', text: "🍎 בייסיק פלוס (כריך + פרי/ירק)" }, { id: 'extra', text: "🍱 אקסטרה פנק (כריך, נשנוש וירקות)" }, { id: 'bento', text: "🧑‍🍳 מאסטר-שף (בנטו מעוצבת)" }] },
  { id: 5, text: "מהו ״כריך ההצלה״ שחוזר על עצמו הכי הרבה?", options: [{ id: 'spread', text: "🍫 ממרח וברח (שוקולד/חלקה)" }, { id: 'classic', text: "🍳 הקלאסיקות (חביתה/צהובה)" }, { id: 'toast', text: "🔥 טוסט (הנשק הסודי של הבוקר)" }, { id: 'gourmet', text: "🥑 מושקע (אבוקדו/טונה/פסטרמה)" }] },
  { id: 6, text: "תוספת החלומות לארוחה?", options: [{ id: 'veg', text: "🥗 ירקות חתוכים" }, { id: 'protein', text: "🥚 חלבון איכותי" }, { id: 'fruit', text: "🍎 סלט פירות" }, { id: 'snack', text: "🥨 נשנוש בריא" }] },
  { id: 7, text: "הסוד לקופסה שחוזרת ריקה?", options: [{ id: 'texture', text: "✨ מרקם טרי" }, { id: 'surprise', text: "🎁 גיוון יומי" }, { id: 'classic', text: "❤️ המוכר והאהוב" }, { id: 'pack', text: "🍱 אריזה מגרה" }] },
  { id: 8, text: "דרישות תזונתית?", options: [{ id: 'none', text: "✅ אין" }, { id: 'veg', text: "🌱 צמחוני" }, { id: 'allergy', text: "⚠️ אלרגיה" }, { id: 'gf', text: "🌾 ללא גלוטן" }] },
  { id: 9, text: "חשיבות כשרות?", options: [{ id: 'critical', text: "🕍 קריטי" }, { id: 'preferred', text: "👍 חשוב" }, { id: 'not', text: "🤷‍♂️ לא משפיע" }] },
  { id: 10, text: "מעבר ליד בית קפה בבוקר?", options: [{ id: 'daily', text: "☕ כל יום" }, { id: 'most', text: "🌤️ רוב הימים" }, { id: 'rarely', text: "🚶‍♂️ לעיתים רחוקות" }] },
  { id: 11, text: "ארוחה ב-30 שניות בדרך לבי״ס?", options: [{ id: '1-3', text: "🙂 נחמד" }, { id: '4-7', text: "🙏 יעזור מאוד" }, { id: '8-10', text: "🤯 משנה חיים!" }] },
  { id: 12, text: "סיבה עיקרית להגיד 'כן'?", options: [{ id: 'sanity', text: "🧘‍♀️ שפיות" }, { id: 'nutrition', text: "💪 תזונה" }, { id: 'ritual', text: "🔄 הריטואל" }, { id: 'quality', text: "⭐ איכות" }] },
  { id: 13, text: "סיבה עיקרית להגיד 'לא'?", options: [{ id: 'trust', text: "🕵️‍♂️ אמון בייצור" }, { id: 'logistics', text: "🛑 העצירה בדרך" }, { id: 'picky', text: "😒 בררנות הילד" }, { id: 'price', text: "💰 עלות" }] },
  { id: 14, text: "קפה ומאפה עולה בערך 26 ש״ח. מהו מחיר הוגן לארוחה מלאה?", options: [{ id: 'low', text: "🪙 22 - 26 ש\"ח" }, { id: 'mid', text: "💵 27 - 30 ש\"ח" }, { id: 'high', text: "💎 31 ש\"ח ומעלה" }] }
];

const TOTAL_QS = QUESTIONS.length;

// --- Background Component ---
const ColorBlocks = ({ design, setDesign, editMode }) => {
  const absDivPos = design.boxLeft + ((100 - design.boxLeft - design.boxRight) * (design.dividerPos / 100));

  return (
    <div className="fixed inset-0 z-0 pointer-events-none flex overflow-hidden">
      <div style={{ width: `${absDivPos}vw`, backgroundColor: design.bgColors[0] }} className="h-full relative pointer-events-auto transition-none">
         {editMode && (
           <label className="absolute top-6 left-6 cursor-pointer p-3 bg-white/20 hover:bg-white/40 rounded-full flex shadow-lg backdrop-blur-sm transition-all">
             <Palette size={18} className="text-white" />
             <input type="color" className="sr-only" value={design.bgColors[0]} onChange={e => { const newC = [...design.bgColors]; newC[0] = e.target.value; setDesign({...design, bgColors: newC}); }} />
           </label>
         )}
      </div>
      <div style={{ width: '30%', backgroundColor: design.bgColors[1] }} className="h-full relative pointer-events-auto transition-none">
         {editMode && (
           <label className="absolute top-6 left-6 cursor-pointer p-3 bg-white/20 hover:bg-white/40 rounded-full flex shadow-lg backdrop-blur-sm transition-all">
             <Palette size={18} className="text-white" />
             <input type="color" className="sr-only" value={design.bgColors[1]} onChange={e => { const newC = [...design.bgColors]; newC[1] = e.target.value; setDesign({...design, bgColors: newC}); }} />
           </label>
         )}
      </div>
      <div className="flex-1 h-full relative pointer-events-auto transition-none" style={{ backgroundColor: design.bgColors[2] }}>
         {editMode && (
           <label className="absolute top-6 left-6 cursor-pointer p-3 bg-white/20 hover:bg-white/40 rounded-full flex shadow-lg backdrop-blur-sm transition-all">
             <Palette size={18} className="text-white" />
             <input type="color" className="sr-only" value={design.bgColors[2]} onChange={e => { const newC = [...design.bgColors]; newC[2] = e.target.value; setDesign({...design, bgColors: newC}); }} />
           </label>
         )}
      </div>
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[60vw] h-[60vw] border-[100px] border-white/5 rounded-full opacity-30" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[40vw] h-[40vw] bg-black/5 rounded-full" />
    </div>
  );
};

// --- Admin Dashboard ---
const AdminDashboard = ({ submissions, onClose, onDelete }) => {
  const stats = useMemo(() => {
    const total = submissions.length;
    if (total === 0) return null;
    return {
      total,
      daily: (submissions.filter(s => s.answers && s.answers[10] === 'daily').length / total * 100).toFixed(0),
      stressed: (submissions.filter(s => s.answers && ['B', 'C'].includes(s.answers[1])).length / total * 100).toFixed(0)
    };
  }, [submissions]);

  const exportToCSV = () => {
    let csvContent = "\uFEFF";
    csvContent += "תאריך,שם מלא,טלפון,עיר,פרטי ילדים,תשובות שאלון (JSON)\n";

    submissions.forEach(sub => {
      const date = new Date(sub.timestamp).toLocaleString('he-IL');
      const name = sub.lead?.name || 'אנונימי';
      const phone = sub.lead?.phone || '-';
      const city = sub.household?.city || '-';
      const childrenStr = sub.household?.children?.map(c => `גיל: ${c.age} (בי"ס: ${c.school})`).join(' | ') || '-';
      const answersStr = JSON.stringify(sub.answers || {}).replace(/"/g, '""');

      csvContent += `"${date}","${name}","${phone}","${city}","${childrenStr}","${answersStr}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "morning_revolution_data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-white p-16 text-right font-sans text-zinc-900 overflow-y-auto" dir="rtl">
      <header className="mb-24 flex justify-between items-end border-b-[30px] border-zinc-900 pb-10">
        <div>
           <h1 className="text-[12vw] font-black tracking-tighter leading-none italic uppercase">Archive.</h1>
           <button onClick={exportToCSV} className="mt-8 flex items-center gap-3 bg-[#00A896] text-white px-6 py-3 font-bold uppercase tracking-widest hover:bg-[#008f7f] transition-colors shadow-lg">
             <Download size={20} />
             ייצוא נתונים לאקסל (CSV)
           </button>
        </div>
        <button onClick={onClose} className="bg-zinc-900 text-white p-6 hover:bg-black transition-colors"><X size={40} /></button>
      </header>
      
      {stats ? (
        <div className="grid grid-cols-1 md:grid-cols-3 border-r-[20px] border-zinc-900 mb-20">
          {[{ label: 'Submissions', val: stats.total }, { label: 'Stressed %', val: `${stats.stressed}%` }, { label: 'Node Fit', val: `${stats.daily}%` }].map((card, i) => (
            <div key={i} className="p-12 border-l border-zinc-100">
              <div className="text-xs font-black uppercase tracking-widest mb-6 opacity-40">{card.label}</div>
              <div className="text-[8vw] font-black tracking-tighter leading-none">{card.val}</div>
            </div>
          ))}
        </div>
      ) : <p className="text-2xl font-black italic text-zinc-400">No data found...</p>}
      
      <table className="w-full text-right border-collapse">
          <thead className="bg-zinc-900 text-white text-xs uppercase tracking-widest">
              <tr>
                 <th className="p-6">Name</th>
                 <th className="p-6">Contact</th>
                 <th className="p-6">City</th>
                 <th className="p-6">Children</th>
                 <th className="p-6 w-16"></th>
              </tr>
          </thead>
          <tbody>
              {submissions.map((s, i) => (
                  <tr key={s.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                      <td className="p-6 font-bold">{s.isGuest ? 'GUEST_USER' : s.lead?.name}</td>
                      <td className="p-6 font-mono text-sm">{s.isGuest ? '---' : s.lead?.phone}</td>
                      <td className="p-6">{s.household?.city || '---'}</td>
                      <td className="p-6 text-sm text-zinc-500">
                         {s.household?.children?.map(c => `גיל ${c.age}`).join(', ') || '---'}
                      </td>
                      <td className="p-6 text-left">
                          <button onClick={() => onDelete(s.id)} className="p-2 text-zinc-300 hover:text-red-500 transition-colors rounded-full hover:bg-red-50" title="מחק רשומה">
                              <Trash2 size={18} />
                          </button>
                      </td>
                  </tr>
              ))}
          </tbody>
      </table>
    </div>
  );
};

// --- Main App ---
export default function App() {
  const [user, setUser] = useState(null);
  const [step, setStep] = useState(0); 
  const [answers, setAnswers] = useState({});
  const [household, setHousehold] = useState({ city: '', children: [{ id: Date.now(), age: '', school: '' }] });
  const [leadInfo, setLeadInfo] = useState({ name: '', phone: '' });
  const [submissions, setSubmissions] = useState([]);
  const [showAdmin, setShowAdmin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiTip, setAiTip] = useState("");
  const [isGeneratingTip, setIsGeneratingTip] = useState(false);
  
  // Design Studio & Admin State
  const [design, setDesign] = useState(INITIAL_DESIGN);
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [dragState, setDragState] = useState(null);
  
  // Secret Unlock Mechanism
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [secretClicks, setSecretClicks] = useState(0);
  const [showPinPrompt, setShowPinPrompt] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);

  const handleSecretClick = () => {
    setSecretClicks(prev => {
      const newCount = prev + 1;
      if (newCount >= 5) {
        if (!isAdminUnlocked) {
          setShowPinPrompt(true);
        }
        return 0;
      }
      return newCount;
    });
  };

  useEffect(() => {
    if (secretClicks > 0) {
      const timer = setTimeout(() => setSecretClicks(0), 1000);
      return () => clearTimeout(timer);
    }
  }, [secretClicks]);

  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (pinInput === '2002') {
      setIsAdminUnlocked(true);
      setShowPinPrompt(false);
      setPinInput("");
      setPinError(false);
    } else {
      setPinError(true);
      setPinInput("");
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) { console.error("Auth error:", err); }
    };
    initAuth();
    onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'survey_results'), (snap) => {
      setSubmissions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [user]);

  const handleDeleteSubmission = async (id) => {
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'survey_results', id));
    } catch (err) {
      console.error("Error deleting entry:", err);
    }
  };

  const handleOptionSelect = (qId, optId) => {
    setAnswers(prev => ({ ...prev, [qId]: optId }));
    setTimeout(() => setStep(prev => prev + 1), 250);
  };

  const handleAddChild = () => {
    setHousehold(prev => ({
      ...prev,
      children: [...prev.children, { id: Date.now(), age: '', school: '' }]
    }));
  };

  const handleRemoveChild = (id) => {
    setHousehold(prev => ({
      ...prev,
      children: prev.children.filter(c => c.id !== id)
    }));
  };

  const handleChildChange = (id, field, value) => {
    setHousehold(prev => ({
      ...prev,
      children: prev.children.map(c => c.id === id ? { ...c, [field]: value } : c)
    }));
  };

  const save = async (data) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'survey_results'), {
        ...data, 
        household,
        timestamp: new Date().toISOString(), 
        userId: user.uid
      });
      setStep(TOTAL_QS + 3); // Move to the final profile ready step
    } catch (err) { console.error(err); }
    finally { setIsSubmitting(false); }
  };

  const getAnswerText = (qId, aId) => {
    const q = QUESTIONS.find(q => q.id === qId);
    const opt = q?.options.find(o => o.id === aId);
    return opt ? opt.text : '';
  };

  const generateTip = async () => {
    setIsGeneratingTip(true);
    const morningStyle = getAnswerText(1, answers[1]) || "רגיל";
    const prompt = `כתוב טיפ פרקטי, קצר ושנון (עד 25 מילים) להורה שהבוקר שלו מתואר כ-"${morningStyle}". הטיפ חייב לכלול עצה קטנה ושימושית אמיתית להתארגנות בוקר (כמו פלייליסט, הכנת בגדים מראש וכו'), ובסוף קריצה אלגנטית לכך שאת ארוחת העשר לבית הספר פשוט אוספים בדרך עם 'מהפכת הבוקר'.`;
    try {
      setAiTip(await callGemini(prompt, "אתה קופירייטר שנון במגזין יוקרתי. ענה בעברית בלבד, ללא מרכאות. הטיפ חייב להיות קודם כל שימושי ופרקטי."));
    } catch (err) { setAiTip("רגע של שקט מה-AI. נסו שוב."); }
    finally { setIsGeneratingTip(false); }
  };

  // --- Global Dragging Handlers ---
  const handlePointerDown = (e, type) => {
    if (!editMode) return;
    e.stopPropagation();
    setDragState(type);
  };

  useEffect(() => {
    const handlePointerMove = (e) => {
      if (!dragState) return;
      e.preventDefault();
      
      const pxToVw = (e.clientX / window.innerWidth) * 100;

      if (dragState === 'boxLeft') {
        let newPos = pxToVw;
        newPos = Math.max(0, Math.min(newPos, 90 - design.boxRight)); 
        setDesign(prev => ({ ...prev, boxLeft: newPos }));
      } 
      else if (dragState === 'boxRight') {
        let newPos = 100 - pxToVw;
        newPos = Math.max(0, Math.min(newPos, 90 - design.boxLeft));
        setDesign(prev => ({ ...prev, boxRight: newPos }));
      } 
      else if (dragState === 'divider') {
        const boxWidthVw = 100 - design.boxLeft - design.boxRight;
        let newPos = ((pxToVw - design.boxLeft) / boxWidthVw) * 100;
        newPos = Math.max(10, Math.min(newPos, 90));
        setDesign(prev => ({ ...prev, dividerPos: newPos }));
      }
    };

    const handlePointerUp = () => setDragState(null);

    if (dragState) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragState, design]);

  // --- Editable Text Component ---
  const EditableText = ({ id, className, isRem = false }) => {
    const el = design.elements[id];
    if (!el || !el.visible) return null;
    const isSelected = editingId === id;
    const unit = isRem ? 'rem' : 'vw';

    return (
      <div className="relative inline-block w-full">
        <div 
          onClick={(e) => { if (editMode) { e.stopPropagation(); setEditingId(id); } }}
          style={{ fontSize: `${el.size}${unit}`, color: el.color }}
          className={`${className} ${editMode ? 'cursor-pointer hover:outline hover:outline-2 hover:outline-dashed hover:outline-black/20 transition-all' : ''} ${isSelected ? 'outline outline-2 outline-[#E85D75] bg-black/5' : ''}`}
        >
          {el.text}
        </div>
        
        {/* Floating Tooltip */}
        {isSelected && editMode && (
          <div className="absolute top-full left-0 mt-3 bg-zinc-950 text-white p-3 rounded-xl shadow-2xl z-[200] flex gap-4 items-center min-w-max animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <textarea 
              value={el.text} 
              onChange={e => setDesign(d => ({...d, elements: {...d.elements, [id]: {...el, text: e.target.value}}}))}
              className="bg-white/10 text-sm p-2 rounded outline-none border border-white/20 w-40 h-10 resize-none font-bold"
            />
            <div className="flex flex-col items-center">
              <span className="text-[9px] uppercase tracking-widest opacity-50 mb-1">Size</span>
              <input 
                type="number" step="0.1" value={el.size} 
                onChange={e => setDesign(d => ({...d, elements: {...d.elements, [id]: {...el, size: parseFloat(e.target.value)}}}))}
                className="w-14 bg-white/10 p-1 text-xs rounded outline-none text-center"
              />
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[9px] uppercase tracking-widest opacity-50 mb-1">Color</span>
              <input 
                type="color" value={el.color} 
                onChange={e => setDesign(d => ({...d, elements: {...d.elements, [id]: {...el, color: e.target.value}}}))}
                className="w-8 h-8 p-0 border-2 border-white/20 rounded cursor-pointer"
              />
            </div>
            <button onClick={() => setEditingId(null)} className="p-2 ml-2 hover:bg-white/20 rounded-lg text-white transition-colors"><Check size={18}/></button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div 
      onClick={() => { if(editMode) setEditingId(null); }}
      className={`min-h-screen bg-transparent flex items-center justify-center font-sans selection:bg-zinc-900 selection:text-white overflow-hidden relative ${dragState ? 'select-none cursor-ew-resize' : ''}`}
    >
      
      <ColorBlocks design={design} setDesign={setDesign} editMode={editMode} />

      {/* Secret Unlock Trigger */}
      <div onClick={handleSecretClick} className="fixed bottom-0 left-0 w-[50px] h-[50px] z-[9999] cursor-default" title="" />

      {/* PIN PROMPT MODAL */}
      {showPinPrompt && (
        <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center" dir="rtl">
          <div className="bg-white border-t-[8px] border-zinc-900 shadow-2xl max-w-sm w-full p-8 relative animate-in zoom-in-95">
            <button onClick={() => { setShowPinPrompt(false); setPinInput(""); setPinError(false); }} className="absolute top-4 left-4 text-zinc-400 hover:text-zinc-900 transition-colors">
              <X size={20} />
            </button>
            <div className="flex items-center gap-3 mb-4 text-[#00A896]">
              <Lock size={24} />
              <h3 className="text-2xl font-black italic uppercase tracking-tighter">Admin_Access.</h3>
            </div>
            <p className="text-sm font-bold text-zinc-500 mb-6">הזן קוד גישה מורשה כדי להמשיך למצב ניהול ועיצוב.</p>
            <form onSubmit={handlePinSubmit}>
              <input
                type="password"
                autoFocus
                className={`w-full p-4 bg-zinc-50 border-b-4 outline-none text-center text-3xl tracking-widest font-mono mb-4 transition-colors ${pinError ? 'border-red-500 text-red-500' : 'border-zinc-200 focus:border-zinc-900'}`}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="••••"
              />
              {pinError && <p className="text-red-500 text-xs font-bold text-center mb-4 uppercase tracking-widest">קוד שגוי</p>}
              <button type="submit" className="w-full py-4 bg-zinc-900 text-white font-black uppercase tracking-[0.2em] hover:bg-[#00A896] transition-colors">
                Unlock
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DRAG HANDLE: Box Left Border */}
      {editMode && (
        <div 
          onPointerDown={(e) => handlePointerDown(e, 'boxLeft')}
          className="absolute top-0 bottom-0 z-[150] cursor-ew-resize flex justify-center items-center group w-6 -ml-3"
          style={{ left: `${design.boxLeft}vw` }}
        >
          <div className="h-full w-2 bg-black/10 group-hover:bg-black/40 transition-colors backdrop-blur-sm" />
        </div>
      )}

      {/* DRAG HANDLE: Box Right Border */}
      {editMode && (
        <div 
          onPointerDown={(e) => handlePointerDown(e, 'boxRight')}
          className="absolute top-0 bottom-0 z-[150] cursor-ew-resize flex justify-center items-center group w-6 -mr-3"
          style={{ right: `${design.boxRight}vw` }}
        >
          <div className="h-full w-2 bg-black/10 group-hover:bg-black/40 transition-colors backdrop-blur-sm" />
        </div>
      )}

      {/* Main Container */}
      <div 
        className="absolute h-full md:h-[88vh] z-10 flex flex-col md:flex-row overflow-hidden shadow-2xl bg-white"
        style={{
          left: `${design.boxLeft}vw`,
          right: `${design.boxRight}vw`,
          width: `calc(100vw - ${design.boxLeft + design.boxRight}vw)`
        }}
      >
        
        {/* Left Side (LTR) - Logo & Slogan */}
        <div 
          style={{ width: window.innerWidth > 768 ? `${design.dividerPos}%` : '100%' }} 
          className="bg-zinc-50 flex flex-col p-6 md:p-10 relative overflow-hidden text-left h-1/3 md:h-full flex-shrink-0" 
          dir="ltr"
        >
           <div className="absolute inset-0 bg-cover bg-center mix-blend-multiply opacity-25 grayscale pointer-events-none" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1542310503-68f76378e9f5?q=80&w=2000')" }} />
           
           <div className="mt-auto relative z-10 w-full">
              <EditableText id="engTitle" className="font-black tracking-tighter leading-[0.75] mb-4 md:mb-6 italic uppercase whitespace-pre-wrap break-words" />
              <div className="space-y-4 border-t-[4px] md:border-t-[6px] border-zinc-900 pt-4 max-w-[90%]">
                 <EditableText id="engSub" className="font-black leading-tight uppercase tracking-tighter break-words" isRem={true} />
              </div>
           </div>
        </div>

        {/* DRAG HANDLE: Internal Divider (Hidden on mobile) */}
        {editMode && (
          <div 
            onPointerDown={(e) => handlePointerDown(e, 'divider')}
            className="hidden md:flex absolute top-0 bottom-0 z-[150] cursor-col-resize justify-center items-center group w-8 -ml-4"
            style={{ left: `${design.dividerPos}%` }}
          >
            <div className="h-full w-1 bg-black/10 group-hover:bg-black/50 transition-colors shadow-sm" />
            <div className="absolute w-8 h-16 bg-zinc-900 text-white rounded-full flex items-center justify-center shadow-xl border-2 border-white/20 scale-0 group-hover:scale-100 transition-transform">
              <MoveHorizontal size={14} />
            </div>
          </div>
        )}

        {/* Right Side (RTL) - Survey Content */}
        <div className="flex-1 p-6 md:p-10 flex flex-col justify-center text-right border-r-[1px] border-zinc-100 relative overflow-y-auto overflow-x-hidden min-w-0" dir="rtl">
          {/* Survey content remains the same inside here */}
          
          {/* STEP 0: Welcome Screen */}
          {step === 0 && (
            <div className="animate-in fade-in slide-in-from-right-12 duration-1000">
               <div className="flex items-center gap-4 mb-6">
                  <div className="h-0.5 w-12 bg-zinc-900" />
                  <EditableText id="heTag" className="font-black uppercase tracking-widest italic text-zinc-400 break-words" isRem={true} />
               </div>
               
               <div className="mb-6">
                  <EditableText id="heTitle" className="font-black leading-[0.85] tracking-tighter uppercase italic whitespace-pre-wrap break-words" />
               </div>

               <div className="mb-10">
                  <EditableText id="heSub" className="font-black leading-tight tracking-tight italic uppercase break-words" />
               </div>

               <div className="flex items-center gap-4 p-1 border-b-4 border-transparent hover:border-zinc-900 transition-all w-fit cursor-pointer group" onClick={() => !editMode && setStep(1)}>
                  <EditableText id="beginBtn" className="font-black italic tracking-tighter uppercase group-hover:opacity-70 transition-opacity break-words" isRem={true} />
                  <div className="w-10 h-10 bg-zinc-900 text-white flex items-center justify-center transition-transform group-hover:translate-x-[-6px] flex-shrink-0">
                     <ArrowRight size={20} className="rotate-180" />
                  </div>
               </div>
            </div>
          )}

          {/* STEP 1: Household Details (Moved to beginning) */}
          {step === 1 && (
            <div className="animate-in fade-in duration-700 w-full max-w-3xl mx-auto text-right">
               <h2 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter leading-none mb-3 break-words">THE_CREW.</h2>
               <p className="text-base md:text-lg font-black italic tracking-tighter leading-tight mb-6 text-zinc-900 break-words">כדי שנוכל לנתח את פרופיל הבוקר שלכם במדויק, ספרו לנו מי בצוות.</p>
               
               <form onSubmit={(e) => { e.preventDefault(); setStep(2); }} className="space-y-4 md:space-y-5">
                  <div className="bg-zinc-50 border-r-[4px] border-[#00A896] p-3 md:p-4">
                     <label className="block text-[10px] md:text-xs font-black uppercase tracking-widest text-[#00A896] mb-1">עיר מגורים</label>
                     <input 
                        required 
                        placeholder="למשל: רמת גן, תל אביב" 
                        className="bg-transparent border-b-2 border-zinc-200 focus:border-zinc-900 outline-none font-bold text-base w-full py-1 transition-colors" 
                        value={household.city} 
                        onChange={e => setHousehold({...household, city: e.target.value})} 
                     />
                  </div>

                  <div>
                     <div className="flex justify-between items-end mb-2">
                        <label className="block text-[10px] md:text-xs font-black uppercase tracking-widest text-zinc-400">ילדים במערכת ({household.children.length})</label>
                     </div>
                     
                     <div className="space-y-2 md:space-y-3">
                        {household.children.map((child, index) => (
                           <div key={child.id} className="flex gap-3 items-center bg-zinc-50 border-r-[4px] border-zinc-100 p-2 md:p-3 relative group transition-all hover:border-zinc-300">
                              <div className="w-24 md:w-32 flex-shrink-0">
                                 <input 
                                    required
                                    placeholder="גיל (למשל: 8)" 
                                    className="bg-transparent border-b border-zinc-200 focus:border-zinc-900 outline-none font-bold w-full py-1 text-sm transition-colors" 
                                    value={child.age} 
                                    onChange={e => handleChildChange(child.id, 'age', e.target.value)} 
                                 />
                              </div>
                              <div className="w-full flex-1">
                                 <input 
                                    required
                                    placeholder="שם בית ספר / גן" 
                                    className="bg-transparent border-b border-zinc-200 focus:border-zinc-900 outline-none font-bold w-full py-1 text-sm transition-colors" 
                                    value={child.school} 
                                    onChange={e => handleChildChange(child.id, 'school', e.target.value)} 
                                 />
                              </div>
                              {household.children.length > 1 && (
                                 <button type="button" onClick={() => handleRemoveChild(child.id)} className="text-zinc-300 hover:text-red-500 transition-colors p-1" title="הסר ילד">
                                    <Trash2 size={16} />
                                 </button>
                              )}
                           </div>
                        ))}
                     </div>
                     
                     <button type="button" onClick={handleAddChild} className="mt-3 flex items-center gap-2 text-[#E85D75] hover:text-zinc-900 font-bold text-xs transition-colors px-1 py-1">
                        <Plus size={16} /> הוספת ילד נוסף
                     </button>
                  </div>

                  <button type="submit" className="w-full py-4 bg-zinc-900 text-white font-black text-xl italic tracking-tighter hover:bg-[#00A896] transition-all mt-2 shadow-xl flex items-center justify-center gap-3">
                     לשאלון <ArrowRight size={20} />
                  </button>
               </form>
               <button onClick={() => setStep(0)} className="mt-6 text-zinc-300 font-black text-[10px] uppercase tracking-[0.3em] hover:text-zinc-900 transition-all pb-1 inline-block">
                 [ PREV_PAGE ]
               </button>
            </div>
          )}

          {/* STEPS 2 to (TOTAL_QS + 1): Survey Questions */}
          {step >= 2 && step <= TOTAL_QS + 1 && (
            <div className="animate-in slide-in-from-right-6 duration-500 w-full max-w-3xl mx-auto">
               
               <div className="w-full flex gap-1 mb-6">
                  {QUESTIONS.map((_, i) => (<div key={i} className={`h-1.5 flex-1 ${i < (step - 1) ? 'bg-zinc-900' : 'bg-zinc-100'}`} />))}
               </div>
               
               <div className="mb-6">
                  <span className="font-black text-[#E85D75] text-xl md:text-2xl block mb-2 tracking-tighter">
                    {step - 1 < 10 ? `0${step - 1}` : step - 1}_
                  </span>
                  <h3 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-tighter text-zinc-900 leading-tight uppercase break-words hyphens-auto">
                    {QUESTIONS[step-2].text}
                  </h3>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {QUESTIONS[step-2].options.map((opt) => (
                    <button key={opt.id} onClick={() => handleOptionSelect(QUESTIONS[step-2].id, opt.id)} className="p-4 md:p-5 text-right transition-all group relative border-r-[8px] bg-zinc-50 border-zinc-100 hover:border-zinc-900 text-zinc-900 hover:bg-zinc-900 hover:text-white flex items-center">
                      <span className="text-lg md:text-xl font-black uppercase tracking-tighter break-words">{opt.text}</span>
                    </button>
                  ))}
               </div>
               
               <button onClick={() => setStep(prev => prev - 1)} className="mt-6 text-zinc-300 font-black text-[10px] uppercase tracking-[0.3em] hover:text-zinc-900 transition-all pb-1 inline-block">
                 [ PREV_PAGE ]
               </button>
            </div>
          )}

          {/* STEP: The Join */}
          {step === TOTAL_QS + 2 && (
            <div className="animate-in fade-in duration-700 w-full max-w-3xl mx-auto text-right">
               <h2 className="text-5xl md:text-6xl font-black italic uppercase tracking-tighter leading-none mb-3 break-words">THE_JOIN.</h2>
               <p className="text-lg md:text-xl font-black italic tracking-tighter leading-tight mb-2 text-zinc-900 break-words">השאירו פרטים להצטרפות לפיילוט ה"אלפא".</p>
               <p className="text-sm font-bold leading-tight mb-8 text-zinc-500 break-words">במסגרת הפיילוט, נבחר 50 משפחות באזורי הפעילות שייהנו מקופסת אוכל ממותגת במתנה ויתנסו ראשונים בשירות.</p>
               
               <form onSubmit={(e) => { e.preventDefault(); save({ answers, lead: leadInfo, isGuest: false }); }} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                     <input required placeholder="שם מלא" className="p-4 bg-zinc-50 border-r-[6px] border-zinc-100 focus:border-zinc-900 outline-none font-black uppercase text-lg italic w-full" value={leadInfo.name} onChange={e => setLeadInfo({...leadInfo, name: e.target.value})} />
                     <input required placeholder="טלפון / וואטסאפ" className="p-4 bg-zinc-50 border-r-[6px] border-zinc-100 focus:border-zinc-900 outline-none font-black uppercase text-lg italic w-full" value={leadInfo.phone} onChange={e => setLeadInfo({...leadInfo, phone: e.target.value})} />
                  </div>
                  <button className="w-full py-5 bg-zinc-900 text-white font-black text-2xl italic tracking-tighter hover:bg-[#E85D75] transition-all mt-4 shadow-xl break-words">RESERVE_MY_SPOT_</button>
               </form>
               <button onClick={() => save({ answers, isGuest: true })} className="mt-6 text-zinc-300 hover:text-zinc-900 text-[10px] font-black uppercase tracking-widest block underline break-words">Continue anonymously</button>
            </div>
          )}

          {/* STEP: Profile Ready */}
          {step === TOTAL_QS + 3 && (
            <div className="animate-in zoom-in duration-700 w-full h-full flex flex-col justify-center text-right">
               <h2 className="text-[6vw] md:text-[5vw] font-black tracking-tighter mb-4 italic uppercase leading-none text-[#00A896] break-words">PROFILE_READY_</h2>
               
               <div className="flex flex-col gap-6 border-t-[8px] border-zinc-900 pt-6">
                  
                  {/* Top Profile Summary */}
                  <div>
                     <p className="text-4xl md:text-5xl font-black leading-tight tracking-tighter mb-2 uppercase italic break-words">
                        {answers[1] === 'A' || answers[1] === 'D' ? 'ZEN_MODEL' : 'PULSE_MODEL'}
                     </p>
                     <p className="text-base md:text-lg font-bold leading-tight break-words text-zinc-800 mb-1">
                        {answers[1] === 'A' || answers[1] === 'D' 
                          ? 'אתם גורמים לזה להיראות קל מדי. משרד החינוך שוקל לשלוח אליכם הורים להשתלמות בוקר. הגיע הזמן שמישהו יפנק גם אתכם.' 
                          : 'בוקר אצלכם הוא ספורט אתגרי בדרגת קושי גבוהה. הגיע הזמן להפסיק למרוח שוקולד על חולצות תוך כדי ריצה ולתת לנו להציל לכם את הבוקר.'}
                     </p>
                  </div>
                  
                  {/* Horizontal, Wide AI Tip Box */}
                  <div className="w-full bg-zinc-900 text-white p-6 relative overflow-hidden flex flex-col justify-center min-h-[140px] shadow-xl rounded-xl">
                     <div className="relative z-10 w-full">
                        {!aiTip ? (
                          <button 
                            onClick={generateTip} 
                            disabled={isGeneratingTip} 
                            className="w-full py-4 bg-[#F9A620]/10 hover:bg-[#F9A620] text-[#F9A620] hover:text-black font-black text-lg md:text-xl uppercase tracking-widest flex items-center justify-center gap-3 transition-all border border-[#F9A620]/30 rounded-lg group animate-pulse hover:animate-none break-words"
                          >
                             {isGeneratingTip ? <Loader2 size={24} className="animate-spin text-[#F9A620]" /> : <>✨ לחצו כאן לניתוח שגרת הבוקר שלכם ע״י AI</>}
                          </button>
                        ) : (
                          <div className="flex flex-col gap-2 w-full">
                             <span className="text-[10px] font-black uppercase tracking-[0.5em] text-[#F9A620]">AI_Lifestyle_Hack</span>
                             <p className="text-base md:text-lg font-normal italic tracking-wide leading-relaxed border-r-4 border-[#F9A620]/50 pr-4 text-zinc-300 break-words">"{aiTip}"</p>
                          </div>
                        )}
                     </div>
                     <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.05),transparent)] pointer-events-none" />
                  </div>

               </div>
            </div>
          )}
        </div>
      </div>

      {/* Settings Toggle - ONLY VISIBLE IF UNLOCKED */}
      {isAdminUnlocked && (
        <div className="fixed bottom-6 right-6 z-[300] flex flex-col items-end gap-3 animate-in slide-in-from-bottom">
          {editMode && <div className="bg-[#E85D75] text-white px-3 py-1 rounded text-[10px] font-black uppercase shadow-lg animate-pulse">Design Studio Active</div>}
          <div className="flex gap-2">
            <button 
              onClick={() => { setEditMode(!editMode); setEditingId(null); }}
              className={`p-4 rounded-full shadow-2xl transition-all ${editMode ? 'bg-[#E85D75] text-white scale-110' : 'bg-white text-zinc-900 hover:bg-zinc-100'}`}
              title="Design Studio"
            >
              <Settings size={24} />
            </button>
            <button 
              onClick={() => setShowAdmin(true)}
              className="p-4 rounded-full shadow-2xl bg-white text-zinc-900 hover:bg-zinc-100 transition-colors"
              title="Dashboard & Export"
            >
              <LayoutDashboard size={24} />
            </button>
          </div>
        </div>
      )}

      {showAdmin && <AdminDashboard submissions={submissions} onClose={() => setShowAdmin(false)} onDelete={handleDeleteSubmission} />}
    </div>
  );
}