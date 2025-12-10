import React, { useState, useEffect, useRef } from 'react';
import * as T from './types';
import { storage } from './services/storage';
import { generateStudentRemark } from './services/gemini';
import { ReportCard, DEFAULT_THEMES } from './components/ReportCard';
import { 
  Users, Settings, LogOut, BookOpen, GraduationCap, 
  Printer, Upload, Plus, Trash2, Edit, X, Image as ImageIcon, 
  Menu, CalendarCheck, Sparkles, MessageSquare, Cloud, RefreshCw, Link, Database, AlertCircle, Laptop, Phone, User, Home, CheckSquare, Square, FileText, Calendar, List, Layout, ToggleLeft, School, Check, Wand2, Eye, Save, Lock, FileSpreadsheet, ArrowLeft
} from 'lucide-react';

// --- CONSTANTS ---
const AVAILABLE_CLASSES = [
  "Play Group", "Nursery", "LKG", "UKG",
  "Class 1", "Class 2", "Class 3", "Class 4", "Class 5",
  "Class 6", "Class 7", "Class 8", "Class 9", "Class 10",
  "Class 11 Arts", "Class 11 Comm", "Class 11 Sci",
  "Class 12 Arts", "Class 12 Comm", "Class 12 Sci"
];

// --- COMPONENTS ---

// 1. TEACHER LOGIN VIEW (Select Name + Password)
const TeacherLoginView: React.FC<{
    teachers: T.Teacher[];
    onLogin: (u: string, p: string) => Promise<boolean>;
    onBack: () => void;
}> = ({ teachers, onLogin, onBack }) => {
    const [selectedTeacher, setSelectedTeacher] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTeacher) { setError('Please select your name'); return; }
        const success = await onLogin(selectedTeacher, password);
        if (!success) setError('Invalid password');
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
             <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
                <div className="text-center mb-6">
                    <div className="bg-indigo-100 p-3 rounded-full inline-block mb-2"><Users className="size-8 text-indigo-600"/></div>
                    <h2 className="text-2xl font-bold text-gray-900">Teacher Login</h2>
                    <p className="text-gray-500">Select your profile to continue</p>
                </div>
                
                {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm flex items-center"><AlertCircle className="size-4 mr-2"/>{error}</div>}
                
                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Select Your Name</label>
                        <select 
                            className="w-full border p-3 rounded-lg bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                            value={selectedTeacher}
                            onChange={e => setSelectedTeacher(e.target.value)}
                            required
                        >
                            <option value="">-- Choose Name --</option>
                            {teachers.map(t => (
                                <option key={t.id} value={t.name}>{t.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Password</label>
                        <input 
                            type="password" 
                            className="w-full border p-3 rounded-lg bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none transition" 
                            value={password} 
                            onChange={e => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            required 
                        />
                    </div>
                    <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 transition shadow-md flex justify-center items-center">
                        <Lock className="size-4 mr-2" /> Login Access
                    </button>
                    <button type="button" onClick={onBack} className="w-full text-gray-400 text-sm hover:text-gray-600 mt-2">Back to Home</button>
                </form>
            </div>
        </div>
    );
};

// 2. TEACHER DASHBOARD
const TeacherDashboard: React.FC<{
  teacher: T.Teacher;
  students: T.Student[];
  subjects: T.Subject[];
  marks: T.MarkRecord[];
  config: T.SchoolConfig;
  onSaveStudents: (s: T.Student[]) => void;
  onSaveSubjects: (s: T.Subject[]) => void;
  onSaveMarks: (m: T.MarkRecord[]) => void;
  onLogout: () => void;
  onRefresh: () => void;
}> = ({ teacher, students, subjects, marks, config, onSaveStudents, onSaveSubjects, onSaveMarks, onLogout, onRefresh }) => {
  // Safety check: ensure assignedClasses is an array
  const assignedClasses = Array.isArray(teacher.assignedClasses) ? teacher.assignedClasses : [];

  const [activeTab, setActiveTab] = useState<'MARKS' | 'ATTENDANCE' | 'RESULTS' | 'SUBJECTS'>('MARKS');
  const [selectedClass, setSelectedClass] = useState(assignedClasses[0] || '');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [examType, setExamType] = useState<'HalfYearly' | 'Annual'>('HalfYearly');
  const [loadingAI, setLoadingAI] = useState<Set<string>>(new Set());
  
  // Selection State
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [batchTheory, setBatchTheory] = useState('');
  const [batchAssessment, setBatchAssessment] = useState('');
  
  // Printing State
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [templateId, setTemplateId] = useState<number>(config.activeTemplate || 1);

  // Subject Management State (for Teachers)
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [newSubject, setNewSubject] = useState<Partial<T.Subject>>({});

  const classStudents = students.filter(s => s.className === selectedClass);
  const classSubjects = subjects.filter(s => s.className === selectedClass);

  useEffect(() => {
      setSelectedStudentIds(new Set());
  }, [selectedClass, activeTab]);

  const handleMarkChange = (studentId: string, field: 'theory' | 'assessment', value: string) => {
    if (!selectedSubjectId) return;
    const numValue = parseFloat(value) || 0;
    let newMarks = [...marks];
    const existingIndex = newMarks.findIndex(m => m.studentId === studentId && m.subjectId === selectedSubjectId && m.examType === examType);
    
    if (existingIndex >= 0) {
      newMarks[existingIndex] = { ...newMarks[existingIndex], [field]: numValue };
    } else {
      newMarks.push({ studentId, subjectId: selectedSubjectId, examType, theory: field === 'theory' ? numValue : 0, assessment: field === 'assessment' ? numValue : 0 });
    }
    
    onSaveMarks(newMarks);
  };
  
  const handleAttendanceChange = (studentId: string, field: 'totalDays' | 'presentDays', value: string) => {
      const numValue = parseInt(value) || 0;
      const updatedStudents = students.map(s => {
          if (s.id === studentId) {
              return { 
                  ...s, 
                  attendance: { 
                      ...s.attendance,
                      totalDays: s.attendance?.totalDays || 0,
                      presentDays: s.attendance?.presentDays || 0,
                      [field]: numValue 
                  } 
              };
          }
          return s;
      });
      onSaveStudents(updatedStudents);
  };
  
  const handleRemarkChange = (studentId: string, text: string) => {
      const updatedStudents = students.map(s => s.id === studentId ? { ...s, remarks: text } : s);
      onSaveStudents(updatedStudents);
  };

  const handleRemarkGen = async (student: T.Student) => {
    setLoadingAI(prev => new Set(prev).add(student.id));
    const studentMarks = marks.filter(m => m.studentId === student.id);
    let summary = `Student ${student.name} marks: `;
    studentMarks.forEach(m => {
        const sub = subjects.find(s => s.id === m.subjectId);
        if(sub) summary += `${sub.name} (${m.examType}): ${m.theory + m.assessment}. `;
    });
    
    try {
        const remark = await generateStudentRemark(student.name, student.className, summary);
        handleRemarkChange(student.id, remark);
    } catch (e) {
        console.error(e);
    } finally {
        setLoadingAI(prev => {
            const next = new Set(prev);
            next.delete(student.id);
            return next;
        });
    }
  };

  const handleBulkAiGeneration = async () => {
    const targets = selectedStudentIds.size > 0 
        ? classStudents.filter(s => selectedStudentIds.has(s.id)) 
        : classStudents;
    
    if (targets.length === 0) return;
    if (!confirm(`Generate AI remarks for ${targets.length} students?`)) return;

    setLoadingAI(prev => {
        const next = new Set(prev);
        targets.forEach(s => next.add(s.id));
        return next;
    });
    
    const updates: {id: string, remark: string}[] = [];

    for (const student of targets) {
        const studentMarks = marks.filter(m => m.studentId === student.id);
        let summary = `Student ${student.name} marks: `;
        studentMarks.forEach(m => {
            const sub = subjects.find(s => s.id === m.subjectId);
            if(sub) summary += `${sub.name} (${m.examType}): ${m.theory + m.assessment}. `;
        });
        
        try {
            const remark = await generateStudentRemark(student.name, student.className, summary);
            updates.push({ id: student.id, remark });
        } catch(e) {
            console.error(e);
        }
        
        setLoadingAI(prev => {
            const next = new Set(prev);
            next.delete(student.id);
            return next;
        });
    }

    if (updates.length > 0) {
        const updatedStudents = students.map(s => {
            const u = updates.find(up => up.id === s.id);
            return u ? { ...s, remarks: u.remark } : s;
        });
        onSaveStudents(updatedStudents);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.checked) {
          setSelectedStudentIds(new Set(classStudents.map(s => s.id)));
      } else {
          setSelectedStudentIds(new Set());
      }
  };

  const handleSelectStudent = (id: string) => {
      const newSet = new Set(selectedStudentIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedStudentIds(newSet);
  };

  const applyBatch = () => {
      if (!batchTheory && !batchAssessment) return;
      if (selectedStudentIds.size === 0) return;

      let newMarks = [...marks];
      const tVal = batchTheory ? parseFloat(batchTheory) : null;
      const aVal = batchAssessment ? parseFloat(batchAssessment) : null;

      selectedStudentIds.forEach(sid => {
          const idx = newMarks.findIndex(m => m.studentId === sid && m.subjectId === selectedSubjectId && m.examType === examType);
          if (idx >= 0) {
              if (tVal !== null) newMarks[idx].theory = tVal;
              if (aVal !== null) newMarks[idx].assessment = aVal;
          } else {
              newMarks.push({
                  studentId: sid,
                  subjectId: selectedSubjectId,
                  examType,
                  theory: tVal || 0,
                  assessment: aVal || 0
              });
          }
      });
      
      onSaveMarks(newMarks);
      alert(`Updated marks for ${selectedStudentIds.size} students.`);
  };

  // Teacher Subject Functions
  const saveTeacherSubject = () => {
      if (!newSubject.name || !newSubject.className) return alert("Fill required fields");
      const subject: T.Subject = {
          ...newSubject as T.Subject,
          id: newSubject.id || Date.now().toString(),
          maxMarksTheory: Number(newSubject.maxMarksTheory) || 80,
          maxMarksAssessment: Number(newSubject.maxMarksAssessment) || 20
      };
      const exists = subjects.findIndex(s => s.id === subject.id);
      if (exists >= 0) {
          const updated = [...subjects];
          updated[exists] = subject;
          onSaveSubjects(updated);
      } else {
          onSaveSubjects([...subjects, subject]);
      }
      setIsSubjectModalOpen(false);
      setNewSubject({});
  };

  const deleteTeacherSubject = (id: string) => {
      if(confirm('Delete subject?')) onSaveSubjects(subjects.filter(s => s.id !== id));
  };


  if (showPrintPreview && selectedClass) {
      return (
          <div className="bg-gray-100 min-h-screen">
               <div className="no-print p-4 bg-gray-900 text-white flex justify-between items-center sticky top-0 z-50 shadow-lg">
                   <div className="flex items-center">
                       <h2 className="font-bold text-lg mr-6 flex items-center"><Printer className="mr-2"/> Print Preview: {selectedClass}</h2>
                       <div className="flex items-center space-x-2 bg-gray-800 p-1.5 rounded-lg border border-gray-700">
                          <span className="text-xs text-gray-400 font-bold px-2 uppercase">Template:</span>
                          {[1,2,3,4,5].map(id => (
                              <button key={id} onClick={()=>setTemplateId(id)} className={`px-3 py-1.5 rounded-md text-sm transition ${templateId===id ? 'bg-indigo-600 text-white font-bold shadow' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}>{id}</button>
                          ))}
                       </div>
                   </div>
                   <div className="flex gap-3">
                       <button onClick={() => window.print()} className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded font-bold flex items-center shadow transition"><Printer className="mr-2 size-4"/> Print Now</button>
                       <button onClick={() => setShowPrintPreview(false)} className="bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded font-bold flex items-center shadow transition"><X className="mr-2 size-4"/> Close</button>
                   </div>
               </div>
               <div className="p-8 mx-auto max-w-[210mm]">
                   {classStudents.map(student => (
                       <ReportCard key={student.id} student={student} subjects={classSubjects} marks={marks} config={config} template={templateId} />
                   ))}
               </div>
          </div>
      )
  }

  return (
    <div className="h-[100dvh] bg-gray-50 flex flex-col overflow-hidden">
        {/* --- TEACHER SUBJECT MODAL --- */}
        {isSubjectModalOpen && (
            <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
                <div className="bg-white p-6 rounded-lg w-full max-w-lg">
                    <h2 className="text-xl font-bold mb-4">Add/Edit Subject</h2>
                    <div className="space-y-3">
                        <input className="w-full border p-2 rounded" placeholder="Subject Name" value={newSubject.name || ''} onChange={e=>setNewSubject({...newSubject, name: e.target.value})} />
                        <select className="w-full border p-2 rounded" value={newSubject.className || ''} onChange={e=>setNewSubject({...newSubject, className: e.target.value})}>
                            <option value="">-- Select Class --</option>
                            {assignedClasses.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <div className="grid grid-cols-2 gap-2">
                            <div><label className="text-xs">Max Theory</label><input type="number" className="w-full border p-2 rounded" value={newSubject.maxMarksTheory || ''} onChange={e=>setNewSubject({...newSubject, maxMarksTheory: Number(e.target.value)})} /></div>
                            <div><label className="text-xs">Max IA</label><input type="number" className="w-full border p-2 rounded" value={newSubject.maxMarksAssessment || ''} onChange={e=>setNewSubject({...newSubject, maxMarksAssessment: Number(e.target.value)})} /></div>
                        </div>
                    </div>
                    <div className="flex gap-2 mt-4 justify-end">
                        <button onClick={()=>setIsSubjectModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                        <button onClick={saveTeacherSubject} className="px-4 py-2 bg-indigo-600 text-white rounded font-bold hover:bg-indigo-700">Save</button>
                    </div>
                </div>
            </div>
        )}

       <header className="bg-white border-b p-2 md:p-4 flex flex-wrap justify-between items-center shrink-0 z-10 shadow-sm gap-2">
          <div><h2 className="text-lg md:text-xl font-bold text-indigo-900 leading-none">Teacher Dashboard</h2><p className="text-xs md:text-sm text-gray-500 text-green-600 flex items-center mt-1"><Cloud className="size-3 mr-1"/> Live Mode</p></div>
          <div className="flex gap-2 overflow-x-auto pb-1 max-w-full no-scrollbar">
              <button onClick={() => setActiveTab('MARKS')} className={`px-3 py-1.5 md:px-4 md:py-2 rounded font-bold text-sm whitespace-nowrap ${activeTab === 'MARKS' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}>Marks</button>
              <button onClick={() => setActiveTab('ATTENDANCE')} className={`px-3 py-1.5 md:px-4 md:py-2 rounded font-bold text-sm whitespace-nowrap ${activeTab === 'ATTENDANCE' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}>Attendance</button>
              <button onClick={() => setActiveTab('SUBJECTS')} className={`px-3 py-1.5 md:px-4 md:py-2 rounded font-bold text-sm whitespace-nowrap ${activeTab === 'SUBJECTS' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}>Subjects</button>
              <button onClick={() => setActiveTab('RESULTS')} className={`px-3 py-1.5 md:px-4 md:py-2 rounded font-bold text-sm flex items-center whitespace-nowrap ${activeTab === 'RESULTS' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
                  <Printer className="size-4 mr-2" /> <span className="hidden sm:inline">Bulk </span>Print
              </button>
              <button onClick={onLogout} className="text-sm text-red-500 border border-red-200 px-3 py-1.5 rounded hover:bg-red-50 ml-2 whitespace-nowrap">Logout</button>
          </div>
       </header>
       <main className="flex-grow flex flex-col p-2 md:p-4 max-w-7xl mx-auto w-full overflow-hidden">
         {!assignedClasses || assignedClasses.length === 0 ? (
            <div className="bg-red-50 border border-red-200 p-8 rounded-xl text-center m-auto">
                <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4"/>
                <h3 className="text-lg font-bold text-red-800">No Classes Assigned</h3>
                <p className="text-red-600 mt-2">Please ask the Admin to assign classes to your account.</p>
            </div>
         ) : (
             <>
                {/* Global Filters (Only show for MARKS and ATTENDANCE) */}
                {activeTab !== 'SUBJECTS' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 mb-4 shrink-0">
                    <div>
                        <label className="block text-xs md:text-sm font-medium mb-1 text-gray-700">Select Class</label>
                        <select className="w-full border p-2 rounded h-10 bg-white text-sm" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                            <option value="">-- Select Class --</option>
                            {assignedClasses.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    {activeTab === 'MARKS' && (
                        <>
                        <div>
                            <label className="block text-xs md:text-sm font-medium mb-1 text-gray-700">Select Subject</label>
                            <select className="w-full border p-2 rounded h-10 bg-white text-sm" value={selectedSubjectId} onChange={e => setSelectedSubjectId(e.target.value)}>
                                <option value="">-- Select Subject --</option>
                                {classSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                            {classSubjects.length === 0 && selectedClass && <p className="text-xs text-red-500 mt-1">No subjects found for this class.</p>}
                        </div>
                        <div className="flex gap-2 items-end">
                            <div className="flex-grow">
                                <label className="block text-xs md:text-sm font-medium mb-1 text-gray-700">Exam Term</label>
                                <select className="w-full border p-2 rounded h-10 bg-white text-sm" value={examType} onChange={e => setExamType(e.target.value as any)}>
                                    <option value="HalfYearly">Half Yearly</option>
                                    <option value="Annual">Annual</option>
                                </select>
                            </div>
                            <button onClick={handleBulkAiGeneration} disabled={selectedStudentIds.size === 0 && classStudents.length === 0} className={`px-3 rounded text-xs md:text-sm font-bold shadow transition flex items-center justify-center h-10 ${selectedStudentIds.size > 0 ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`} title={selectedStudentIds.size > 0 ? "Generate for selected" : "Generate for all students in class"}>
                                <Wand2 className="size-4 md:mr-2" />
                                <span className="hidden md:inline">{selectedStudentIds.size > 0 ? 'Gen Selected' : 'Gen All'}</span>
                            </button>
                        </div>
                        </>
                    )}
                </div>
                )}

                {activeTab === 'MARKS' && (
                    selectedClass && selectedSubjectId ? (
                        <div className="bg-white rounded shadow flex flex-col flex-grow overflow-hidden border border-gray-200">
                        {selectedStudentIds.size > 0 && (
                            <div className="bg-indigo-50 p-2 md:p-4 border-b border-indigo-200 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0 animate-fade-in z-20">
                                <div className="flex items-center gap-2">
                                    <CheckSquare className="text-indigo-600 size-5" />
                                    <span className="font-bold text-indigo-900 text-sm">{selectedStudentIds.size} Selected</span>
                                </div>
                                <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
                                    <input type="number" placeholder="Theory" className="w-16 md:w-20 p-2 border border-indigo-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={batchTheory} onChange={e => setBatchTheory(e.target.value)} />
                                    <input type="number" placeholder="IA" className="w-16 md:w-20 p-2 border border-indigo-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={batchAssessment} onChange={e => setBatchAssessment(e.target.value)} />
                                    <button onClick={applyBatch} className="bg-indigo-600 text-white px-3 py-2 rounded text-sm font-bold hover:bg-indigo-700 shadow-sm whitespace-nowrap">Apply</button>
                                </div>
                            </div>
                        )}
                        <div className="flex-grow overflow-auto w-full relative">
                            <table className="w-full min-w-[800px] md:min-w-[900px] border-collapse">
                                <thead className="bg-gray-100 text-left sticky top-0 z-30 shadow-sm">
                                <tr>
                                    <th className="p-3 w-10 text-center bg-gray-100 sticky left-0 z-40 border-b border-gray-200"><input type="checkbox" className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 size-5 cursor-pointer" onChange={handleSelectAll} checked={classStudents.length > 0 && selectedStudentIds.size === classStudents.length} /></th>
                                    <th className="p-3 w-16 border-b border-gray-200">Roll</th>
                                    <th className="p-3 w-48 border-b border-gray-200">Name</th>
                                    <th className="p-3 w-24 border-b border-gray-200">Theory</th>
                                    <th className="p-3 w-24 border-b border-gray-200">IA</th>
                                    <th className="p-3 min-w-[200px] border-b border-gray-200">Remarks</th>
                                    <th className="p-3 w-16 text-center border-b border-gray-200">AI</th>
                                </tr>
                                </thead>
                                <tbody>
                                {classStudents.map(s => {
                                    const mark = marks.find(m => m.studentId === s.id && m.subjectId === selectedSubjectId && m.examType === examType);
                                    const isSelected = selectedStudentIds.has(s.id);
                                    return (
                                    <tr key={s.id} className={`border-b transition-colors ${isSelected ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}>
                                        <td className="p-2 text-center sticky left-0 z-20 bg-inherit border-r md:border-none"><input type="checkbox" className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 size-5 cursor-pointer" checked={isSelected} onChange={() => handleSelectStudent(s.id)} /></td>
                                        <td className="p-2 font-mono text-gray-500 text-sm">{s.rollNo}</td>
                                        <td className="p-2 font-medium whitespace-nowrap text-sm">{s.name}</td>
                                        <td className="p-2"><input type="number" className="w-full border border-gray-300 p-2 rounded text-center bg-white focus:ring-2 focus:ring-indigo-500 outline-none" value={mark?.theory || ''} placeholder="0" onChange={e => handleMarkChange(s.id, 'theory', e.target.value)}/></td>
                                        <td className="p-2"><input type="number" className="w-full border border-gray-300 p-2 rounded text-center bg-white focus:ring-2 focus:ring-indigo-500 outline-none" value={mark?.assessment || ''} placeholder="0" onChange={e => handleMarkChange(s.id, 'assessment', e.target.value)}/></td>
                                        <td className="p-2"><input type="text" className="w-full border border-gray-300 p-2 rounded px-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Remark..." value={s.remarks || ''} onChange={e => handleRemarkChange(s.id, e.target.value)} /></td>
                                        <td className="p-2 text-center">
                                        <button onClick={() => handleRemarkGen(s)} disabled={loadingAI.has(s.id)} className="text-xs bg-purple-100 text-purple-700 p-2 rounded transition hover:bg-purple-200" title="Auto-generate Remark">
                                            {loadingAI.has(s.id) ? <RefreshCw className="animate-spin size-4"/> : <Sparkles className="size-4"/>}
                                        </button>
                                        </td>
                                    </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                        </div>
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-white rounded border border-dashed border-gray-300"><BookOpen className="mx-auto h-12 w-12 text-gray-300 mb-4"/><p className="text-gray-500">Select Class & Subject to enter marks.</p></div>
                    )
                )}

                {activeTab === 'SUBJECTS' && (
                    <div>
                         <div className="flex justify-between items-center mb-6">
                            <h1 className="text-lg md:text-2xl font-bold text-gray-800">Manage Your Subjects</h1>
                            <button onClick={()=>{setNewSubject({}); setIsSubjectModalOpen(true)}} className="bg-indigo-600 text-white px-4 py-2 rounded flex items-center hover:bg-indigo-700 text-sm md:text-base"><Plus className="mr-2 size-4"/> Add Subject</button>
                        </div>
                        <div className="bg-white rounded-lg shadow overflow-hidden overflow-x-auto border border-gray-200">
                            <table className="w-full text-sm text-left min-w-[600px]">
                                <thead className="bg-gray-100 font-bold text-gray-700"><tr><th className="p-3">Name</th><th className="p-3">Class</th><th className="p-3">Max Theory</th><th className="p-3">Max IA</th><th className="p-3 text-right">Actions</th></tr></thead>
                                <tbody>
                                    {subjects.filter(s => assignedClasses.includes(s.className)).map(s => (
                                        <tr key={s.id} className="border-b hover:bg-gray-50">
                                            <td className="p-3 font-medium">{s.name}</td>
                                            <td className="p-3"><span className="bg-gray-100 px-2 py-1 rounded text-xs border">{s.className}</span></td>
                                            <td className="p-3 text-gray-500">{s.maxMarksTheory}</td>
                                            <td className="p-3 text-gray-500">{s.maxMarksAssessment}</td>
                                            <td className="p-3 text-right flex justify-end gap-2">
                                                <button onClick={()=>{setNewSubject(s); setIsSubjectModalOpen(true)}} className="text-blue-600 hover:bg-blue-50 p-1 rounded"><Edit className="size-4"/></button>
                                                <button onClick={()=>deleteTeacherSubject(s.id)} className="text-red-600 hover:bg-red-50 p-1 rounded"><Trash2 className="size-4"/></button>
                                            </td>
                                        </tr>
                                    ))}
                                    {subjects.filter(s => assignedClasses.includes(s.className)).length === 0 && <tr><td colSpan={5} className="p-6 text-center text-gray-500">No subjects found for your classes. Add one to get started.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'ATTENDANCE' && (
                    selectedClass ? (
                         <div className="bg-white rounded shadow flex flex-col flex-grow overflow-hidden border border-gray-200">
                             <div className="p-3 bg-indigo-50 text-indigo-800 text-xs md:text-sm border-b shrink-0"><CalendarCheck className="inline mr-2 size-4"/> Enter total working days and present days for each student.</div>
                             <div className="flex-grow overflow-auto w-full relative">
                                 <table className="w-full min-w-[600px] border-collapse">
                                    <thead className="bg-gray-100 text-left sticky top-0 z-30 shadow-sm">
                                    <tr><th className="p-3 w-16 bg-gray-100 border-b border-gray-200">Roll</th><th className="p-3 border-b border-gray-200">Name</th><th className="p-3 w-32 border-b border-gray-200">Total Days</th><th className="p-3 w-32 border-b border-gray-200">Present Days</th><th className="p-3 border-b border-gray-200">Percentage</th></tr>
                                    </thead>
                                    <tbody>
                                    {classStudents.map(s => {
                                        const percentage = s.attendance?.totalDays > 0 ? ((s.attendance.presentDays / s.attendance.totalDays) * 100).toFixed(1) + '%' : '0%';
                                        return (
                                        <tr key={s.id} className="border-b hover:bg-gray-50">
                                            <td className="p-3 font-mono text-gray-500 text-sm">{s.rollNo}</td>
                                            <td className="p-3 font-medium whitespace-nowrap text-sm">{s.name}</td>
                                            <td className="p-3"><input type="number" className="w-full border border-gray-300 p-2 rounded text-center bg-gray-50" value={s.attendance?.totalDays || 0} onChange={e => handleAttendanceChange(s.id, 'totalDays', e.target.value)}/></td>
                                            <td className="p-3"><input type="number" className="w-full border border-gray-300 p-2 rounded text-center" value={s.attendance?.presentDays || 0} onChange={e => handleAttendanceChange(s.id, 'presentDays', e.target.value)}/></td>
                                            <td className="p-3 font-bold text-gray-600 text-sm">{percentage}</td>
                                        </tr>
                                        );
                                    })}
                                    </tbody>
                                 </table>
                             </div>
                         </div>
                    ) : (
                        <div className="text-center py-20 bg-white rounded border border-dashed border-gray-300"><Calendar className="mx-auto h-12 w-12 text-gray-300 mb-4"/><p className="text-gray-500">Select Class to manage attendance.</p></div>
                    )
                )}
                {activeTab === 'RESULTS' && (
                    selectedClass ? (
                        <div className="flex flex-col flex-grow overflow-hidden">
                            <div className="bg-white p-4 md:p-6 rounded-xl shadow border border-indigo-100 text-center mb-4 shrink-0">
                                <GraduationCap className="mx-auto h-12 w-12 md:h-16 md:w-16 text-indigo-600 mb-2 md:mb-4"/>
                                <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">Bulk Print Report Cards</h2>
                                <p className="text-sm md:text-base text-gray-500 mb-4 md:mb-6">Generate and print report cards for all <span className="font-bold text-indigo-900">{classStudents.length}</span> students in <span className="font-bold text-indigo-900">{selectedClass}</span>.</p>
                                <div className="flex justify-center gap-4">
                                     <button onClick={() => setShowPrintPreview(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 md:px-8 md:py-3 rounded-full font-bold shadow-lg transition flex items-center transform hover:scale-105"><Printer className="mr-2 size-5"/> Generate Report Cards</button>
                                </div>
                            </div>
                            <div className="bg-white rounded shadow flex flex-col flex-grow overflow-hidden border border-gray-200">
                                <div className="p-3 bg-gray-50 border-b font-bold text-gray-700 shrink-0">Class List Preview</div>
                                <div className="flex-grow overflow-auto">
                                    <table className="w-full text-sm min-w-[500px]">
                                        <thead className="bg-gray-100 text-left sticky top-0 z-10">
                                            <tr><th className="p-3 border-b">Roll</th><th className="p-3 border-b">Name</th><th className="p-3 border-b">Father Name</th><th className="p-3 text-right border-b">Status</th></tr>
                                        </thead>
                                        <tbody>
                                            {classStudents.map(s => (
                                                <tr key={s.id} className="border-b">
                                                    <td className="p-3 font-mono">{s.rollNo}</td>
                                                    <td className="p-3 font-medium whitespace-nowrap">{s.name}</td>
                                                    <td className="p-3 text-gray-500">{s.fatherName}</td>
                                                    <td className="p-3 text-right text-green-600 font-medium">Ready</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-white rounded border border-dashed border-gray-300"><Printer className="mx-auto h-12 w-12 text-gray-300 mb-4"/><h3 className="text-lg font-bold text-gray-600">Select a Class</h3><p className="text-gray-500">Please select a class from the dropdown above to generate report cards.</p></div>
                    )
                )}
             </>
         )}
       </main>
    </div>
  );
};

// 3. ADMIN DASHBOARD
const AdminDashboard: React.FC<{
  config: T.SchoolConfig;
  students: T.Student[];
  teachers: T.Teacher[];
  subjects: T.Subject[];
  onSaveConfig: (c: T.SchoolConfig) => void;
  onSaveStudents: (s: T.Student[]) => void;
  onSaveTeachers: (t: T.Teacher[]) => void;
  onSaveSubjects: (s: T.Subject[]) => void;
  onLogout: () => void;
}> = ({ config, students, teachers, subjects, onSaveConfig, onSaveStudents, onSaveTeachers, onSaveSubjects, onLogout }) => {
    const [tab, setTab] = useState('DASHBOARD');
    const [localConfig, setLocalConfig] = useState(config);
    const [previewTemplateId, setPreviewTemplateId] = useState<number | null>(null);
    const [editTemplateId, setEditTemplateId] = useState(localConfig.activeTemplate || 1);
    
    // Manage States
    const [isAddOpen, setIsAddOpen] = useState(false);
    // Student Form
    const [newStudent, setNewStudent] = useState<Partial<T.Student>>({});
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Teacher Form
    const [newTeacher, setNewTeacher] = useState<any>({});
    // Subject Form
    const [newSubject, setNewSubject] = useState<Partial<T.Subject>>({});
    // Mobile Sidebar
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleConfigSave = () => {
        onSaveConfig(localConfig);
        alert('Configuration saved!');
    };
    
    // CRUD Handlers
    const deleteStudent = (id: string) => {
        if(confirm('Are you sure you want to delete this student?')) {
            onSaveStudents(students.filter(s => s.id !== id));
        }
    };
    
    const saveStudent = () => {
        if (!newStudent.name || !newStudent.rollNo || !newStudent.className) return alert("Fill required fields");
        const student: T.Student = {
            ...newStudent as T.Student,
            id: newStudent.id || Date.now().toString(),
            attendance: newStudent.attendance || { totalDays: 0, presentDays: 0 }
        };
        const exists = students.findIndex(s => s.id === student.id);
        if (exists >= 0) {
            const updated = [...students];
            updated[exists] = student;
            onSaveStudents(updated);
        } else {
            onSaveStudents([...students, student]);
        }
        setIsAddOpen(false);
        setNewStudent({});
    };

    // CSV IMPORT LOGIC
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            if (!text) return;

            // Simple CSV Parser: Assumes headers match exactly or uses default order if no header
            // Order: srNo, rollNo, name, fatherName, motherName, className, mobile, dob, address
            const lines = text.split('\n').filter(line => line.trim() !== '');
            const newStudents: T.Student[] = [];
            
            // Skip header if present (simple check if first line contains "name")
            const startIndex = lines[0].toLowerCase().includes('name') ? 1 : 0;

            for (let i = startIndex; i < lines.length; i++) {
                // Handle comma splitting (basic, doesn't handle commas in quotes)
                const cols = lines[i].split(',').map(c => c.trim());
                if (cols.length < 5) continue; // Skip invalid lines

                // Mapping based on assumed index or simple heuristic
                const s: T.Student = {
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                    srNo: cols[0] || '',
                    rollNo: cols[1] || '',
                    name: cols[2] || '',
                    fatherName: cols[3] || '',
                    motherName: cols[4] || '',
                    className: cols[5] || '',
                    mobile: cols[6] || '',
                    dob: cols[7] || '',
                    address: cols[8] || '',
                    attendance: { totalDays: 0, presentDays: 0 }
                };
                newStudents.push(s);
            }

            if (newStudents.length > 0) {
                if(confirm(`Found ${newStudents.length} students. Import them?`)) {
                    onSaveStudents([...students, ...newStudents]);
                }
            } else {
                alert("No valid student data found in CSV.");
            }
        };
        reader.readAsText(file);
        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const deleteTeacher = (id: string) => {
         if(confirm('Delete teacher?')) onSaveTeachers(teachers.filter(t => t.id !== id));
    };

    const saveTeacher = () => {
        if (!newTeacher.name || !newTeacher.password) return alert("Fill required fields");
        // assignedClasses is already an array from the checkbox logic
        const classes = Array.isArray(newTeacher.assignedClasses) ? newTeacher.assignedClasses : [];

        const teacher: T.Teacher = {
            ...newTeacher as T.Teacher,
            id: newTeacher.id || Date.now().toString(),
            assignedClasses: classes
        };
         const exists = teachers.findIndex(t => t.id === teacher.id);
        if (exists >= 0) {
            const updated = [...teachers];
            updated[exists] = teacher;
            onSaveTeachers(updated);
        } else {
            onSaveTeachers([...teachers, teacher]);
        }
        setIsAddOpen(false);
        setNewTeacher({});
    };

    const toggleTeacherClass = (cls: string) => {
        const current = Array.isArray(newTeacher.assignedClasses) ? [...newTeacher.assignedClasses] : [];
        if (current.includes(cls)) {
            setNewTeacher({ ...newTeacher, assignedClasses: current.filter((c: string) => c !== cls) });
        } else {
            setNewTeacher({ ...newTeacher, assignedClasses: [...current, cls] });
        }
    };

    const deleteSubject = (id: string) => {
        if(confirm('Delete subject?')) onSaveSubjects(subjects.filter(s => s.id !== id));
    };

    const saveSubject = () => {
        if (!newSubject.name || !newSubject.className) return alert("Fill required fields");
        const subject: T.Subject = {
            ...newSubject as T.Subject,
            id: newSubject.id || Date.now().toString(),
            maxMarksTheory: Number(newSubject.maxMarksTheory) || 80,
            maxMarksAssessment: Number(newSubject.maxMarksAssessment) || 20
        };
        const exists = subjects.findIndex(s => s.id === subject.id);
        if (exists >= 0) {
            const updated = [...subjects];
            updated[exists] = subject;
            onSaveSubjects(updated);
        } else {
            onSaveSubjects([...subjects, subject]);
        }
        setIsAddOpen(false);
        setNewSubject({});
    };

    const updateTemplatePref = (id: number, field: keyof T.TemplateOptions, value: string) => {
        const currentPrefs = localConfig.templatePreferences || {};
        const existing = currentPrefs[id] || DEFAULT_THEMES[id];
        setLocalConfig({
            ...localConfig,
            templatePreferences: {
                ...currentPrefs,
                [id]: { ...existing, [field]: value }
            }
        });
    };
    const activePrefs = (localConfig.templatePreferences?.[editTemplateId] || DEFAULT_THEMES[editTemplateId]);
    
    // ... DUMMY DATA FOR PREVIEW ... (same as before)
    const dummyStudent: T.Student = { id: 'dummy', name: 'John Doe', fatherName: 'Robert Doe', motherName: 'Jane Doe', className: 'Class 10', rollNo: '101', srNo: '2023001', dob: '2008-01-01', mobile: '9876543210', address: '123 School Lane, City', attendance: { totalDays: 200, presentDays: 185 }, remarks: 'Excellent performance!' };
    const dummySubjects: T.Subject[] = [ { id: '1', name: 'Mathematics', className: 'Class 10', maxMarksTheory: 80, maxMarksAssessment: 20 }, { id: '2', name: 'Science', className: 'Class 10', maxMarksTheory: 80, maxMarksAssessment: 20 }, { id: '3', name: 'English', className: 'Class 10', maxMarksTheory: 80, maxMarksAssessment: 20 } ];
    const dummyMarks: T.MarkRecord[] = [ { studentId: 'dummy', subjectId: '1', examType: 'HalfYearly', theory: 70, assessment: 18 }, { studentId: 'dummy', subjectId: '1', examType: 'Annual', theory: 75, assessment: 19 }, { studentId: 'dummy', subjectId: '2', examType: 'HalfYearly', theory: 65, assessment: 15 }, { studentId: 'dummy', subjectId: '2', examType: 'Annual', theory: 68, assessment: 17 }, { studentId: 'dummy', subjectId: '3', examType: 'HalfYearly', theory: 72, assessment: 19 }, { studentId: 'dummy', subjectId: '3', examType: 'Annual', theory: 76, assessment: 19 } ];

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row">
            {previewTemplateId && (
                <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-4xl h-[90vh] overflow-y-auto rounded-lg relative">
                         <div className="sticky top-0 bg-gray-900 text-white p-3 flex justify-between items-center z-10">
                             <span className="font-bold flex items-center"><Eye className="mr-2"/> Live Preview (Template {previewTemplateId})</span>
                             <button onClick={() => setPreviewTemplateId(null)} className="bg-red-600 hover:bg-red-500 px-3 py-1 rounded text-sm">Close</button>
                         </div>
                         <div className="p-8 bg-gray-100">
                             <ReportCard student={dummyStudent} subjects={dummySubjects} marks={dummyMarks} config={localConfig} template={previewTemplateId} />
                         </div>
                    </div>
                </div>
            )}
            
            {/* --- ADD MODAL --- */}
            {isAddOpen && (
                <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white p-6 rounded-lg w-full max-w-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
                        <h2 className="text-xl font-bold mb-4">{tab === 'STUDENTS' ? 'Add/Edit Student' : tab === 'TEACHERS' ? 'Add/Edit Teacher' : 'Add/Edit Subject'}</h2>
                        <div className="space-y-3">
                            {tab === 'STUDENTS' && (
                                <>
                                    <input className="w-full border p-2 rounded" placeholder="Full Name" value={newStudent.name || ''} onChange={e=>setNewStudent({...newStudent, name: e.target.value})} />
                                    <div className="grid grid-cols-2 gap-2">
                                        <input className="border p-2 rounded" placeholder="Roll No" value={newStudent.rollNo || ''} onChange={e=>setNewStudent({...newStudent, rollNo: e.target.value})} />
                                        <input className="border p-2 rounded" placeholder="SR No" value={newStudent.srNo || ''} onChange={e=>setNewStudent({...newStudent, srNo: e.target.value})} />
                                    </div>
                                    <select className="w-full border p-2 rounded" value={newStudent.className || ''} onChange={e=>setNewStudent({...newStudent, className: e.target.value})}>
                                        <option value="">-- Select Class --</option>
                                        {AVAILABLE_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input className="border p-2 rounded" placeholder="Father's Name" value={newStudent.fatherName || ''} onChange={e=>setNewStudent({...newStudent, fatherName: e.target.value})} />
                                        <input className="border p-2 rounded" placeholder="Mother's Name" value={newStudent.motherName || ''} onChange={e=>setNewStudent({...newStudent, motherName: e.target.value})} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input className="border p-2 rounded" type="date" placeholder="DOB" value={newStudent.dob || ''} onChange={e=>setNewStudent({...newStudent, dob: e.target.value})} />
                                        <input className="border p-2 rounded" placeholder="Mobile" value={newStudent.mobile || ''} onChange={e=>setNewStudent({...newStudent, mobile: e.target.value})} />
                                    </div>
                                    <input className="w-full border p-2 rounded" placeholder="Address" value={newStudent.address || ''} onChange={e=>setNewStudent({...newStudent, address: e.target.value})} />
                                </>
                            )}
                            {tab === 'TEACHERS' && (
                                <>
                                    <input className="w-full border p-2 rounded" placeholder="Teacher Name" value={newTeacher.name || ''} onChange={e=>setNewTeacher({...newTeacher, name: e.target.value})} />
                                    <input className="w-full border p-2 rounded" placeholder="Password" value={newTeacher.password || ''} onChange={e=>setNewTeacher({...newTeacher, password: e.target.value})} />
                                    
                                    <div className="border p-3 rounded bg-gray-50">
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Assign Classes</label>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                                            {AVAILABLE_CLASSES.map(cls => (
                                                <label key={cls} className="flex items-center space-x-2 text-sm cursor-pointer hover:bg-gray-100 p-1 rounded">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={(newTeacher.assignedClasses || []).includes(cls)}
                                                        onChange={() => toggleTeacherClass(cls)}
                                                        className="rounded text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                    <span>{cls}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                            {tab === 'SUBJECTS' && (
                                <>
                                    <input className="w-full border p-2 rounded" placeholder="Subject Name" value={newSubject.name || ''} onChange={e=>setNewSubject({...newSubject, name: e.target.value})} />
                                    <select className="w-full border p-2 rounded" value={newSubject.className || ''} onChange={e=>setNewSubject({...newSubject, className: e.target.value})}>
                                        <option value="">-- Select Class --</option>
                                        {AVAILABLE_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div><label className="text-xs">Max Theory</label><input type="number" className="w-full border p-2 rounded" value={newSubject.maxMarksTheory || ''} onChange={e=>setNewSubject({...newSubject, maxMarksTheory: Number(e.target.value)})} /></div>
                                        <div><label className="text-xs">Max IA</label><input type="number" className="w-full border p-2 rounded" value={newSubject.maxMarksAssessment || ''} onChange={e=>setNewSubject({...newSubject, maxMarksAssessment: Number(e.target.value)})} /></div>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="flex gap-2 mt-4 justify-end">
                            <button onClick={()=>setIsAddOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                            <button onClick={tab === 'STUDENTS' ? saveStudent : tab === 'TEACHERS' ? saveTeacher : saveSubject} className="px-4 py-2 bg-indigo-600 text-white rounded font-bold hover:bg-indigo-700">Save</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Mobile Sidebar Toggle */}
            <div className="md:hidden bg-gray-900 text-white p-4 flex justify-between items-center">
                <h2 className="font-bold flex items-center gap-2"><Layout className="size-5"/> Admin Portal</h2>
                <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-1 border rounded"><Menu/></button>
            </div>

            <aside className={`${isMobileMenuOpen ? 'block' : 'hidden'} md:block w-full md:w-64 bg-gray-900 text-white flex-col shrink-0 overflow-y-auto`}>
                <div className="p-6 border-b border-gray-800 hidden md:block">
                    <h2 className="text-xl font-bold flex items-center gap-2"><Layout className="size-6"/> Admin Portal</h2>
                </div>
                <nav className="p-4 space-y-2">
                    <button onClick={()=>{setTab('DASHBOARD'); setIsMobileMenuOpen(false)}} className={`w-full flex items-center p-3 rounded ${tab==='DASHBOARD'?'bg-indigo-600':'hover:bg-gray-800'}`}><Home className="mr-3 size-5"/> Dashboard</button>
                    <button onClick={()=>{setTab('STUDENTS'); setIsMobileMenuOpen(false)}} className={`w-full flex items-center p-3 rounded ${tab==='STUDENTS'?'bg-indigo-600':'hover:bg-gray-800'}`}><GraduationCap className="mr-3 size-5"/> Students</button>
                    <button onClick={()=>{setTab('TEACHERS'); setIsMobileMenuOpen(false)}} className={`w-full flex items-center p-3 rounded ${tab==='TEACHERS'?'bg-indigo-600':'hover:bg-gray-800'}`}><Users className="mr-3 size-5"/> Teachers</button>
                    <button onClick={()=>{setTab('SUBJECTS'); setIsMobileMenuOpen(false)}} className={`w-full flex items-center p-3 rounded ${tab==='SUBJECTS'?'bg-indigo-600':'hover:bg-gray-800'}`}><BookOpen className="mr-3 size-5"/> Subjects</button>
                    <button onClick={()=>{setTab('SETTINGS'); setIsMobileMenuOpen(false)}} className={`w-full flex items-center p-3 rounded ${tab==='SETTINGS'?'bg-indigo-600':'hover:bg-gray-800'}`}><Settings className="mr-3 size-5"/> Settings</button>
                </nav>
                <div className="p-4 border-t border-gray-800 mt-auto">
                    <button onClick={onLogout} className="w-full flex items-center p-3 rounded text-red-400 hover:bg-gray-800"><LogOut className="mr-3 size-5"/> Logout</button>
                </div>
            </aside>
            <main className="flex-grow p-4 md:p-8 overflow-y-auto h-[calc(100vh-64px)] md:h-screen">
                {tab === 'DASHBOARD' && (
                    <div>
                        <h1 className="text-2xl font-bold mb-6 text-gray-800">Overview</h1>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                                <div className="text-gray-500 text-sm uppercase font-bold mb-2">Total Students</div>
                                <div className="text-3xl font-bold text-gray-900">{students.length}</div>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                                <div className="text-gray-500 text-sm uppercase font-bold mb-2">Teachers</div>
                                <div className="text-3xl font-bold text-gray-900">{teachers.length}</div>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                                <div className="text-gray-500 text-sm uppercase font-bold mb-2">Subjects</div>
                                <div className="text-3xl font-bold text-gray-900">{subjects.length}</div>
                            </div>
                        </div>
                    </div>
                )}
                
                {tab === 'STUDENTS' && (
                    <div>
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                            <h1 className="text-2xl font-bold text-gray-800">Manage Students</h1>
                            <div className="flex gap-2">
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    accept=".csv" 
                                    onChange={handleFileUpload} 
                                />
                                <button onClick={() => fileInputRef.current?.click()} className="bg-green-600 text-white px-4 py-2 rounded flex items-center hover:bg-green-700 shadow">
                                    <FileSpreadsheet className="mr-2 size-4"/> Bulk Upload (CSV)
                                </button>
                                <button onClick={()=>{setNewStudent({}); setIsAddOpen(true)}} className="bg-indigo-600 text-white px-4 py-2 rounded flex items-center hover:bg-indigo-700 shadow">
                                    <Plus className="mr-2 size-4"/> Add Student
                                </button>
                            </div>
                        </div>
                        <div className="bg-white rounded-lg shadow overflow-hidden overflow-x-auto">
                            <table className="w-full text-sm text-left min-w-[600px]">
                                <thead className="bg-gray-100 font-bold text-gray-700"><tr><th className="p-3">Roll</th><th className="p-3">Name</th><th className="p-3">Class</th><th className="p-3">Father</th><th className="p-3 text-right">Actions</th></tr></thead>
                                <tbody>
                                    {students.map(s => (
                                        <tr key={s.id} className="border-b hover:bg-gray-50">
                                            <td className="p-3 font-mono">{s.rollNo}</td>
                                            <td className="p-3 font-medium">{s.name}</td>
                                            <td className="p-3">{s.className}</td>
                                            <td className="p-3 text-gray-500">{s.fatherName}</td>
                                            <td className="p-3 text-right flex justify-end gap-2">
                                                <button onClick={()=>{setNewStudent(s); setIsAddOpen(true)}} className="text-blue-600 hover:bg-blue-50 p-1 rounded"><Edit className="size-4"/></button>
                                                <button onClick={()=>deleteStudent(s.id)} className="text-red-600 hover:bg-red-50 p-1 rounded"><Trash2 className="size-4"/></button>
                                            </td>
                                        </tr>
                                    ))}
                                    {students.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-gray-500">No students added yet.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {tab === 'TEACHERS' && (
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <h1 className="text-2xl font-bold text-gray-800">Manage Teachers</h1>
                            <button onClick={()=>{setNewTeacher({}); setIsAddOpen(true)}} className="bg-indigo-600 text-white px-4 py-2 rounded flex items-center hover:bg-indigo-700"><Plus className="mr-2 size-4"/> Add Teacher</button>
                        </div>
                        <div className="bg-white rounded-lg shadow overflow-hidden overflow-x-auto">
                            <table className="w-full text-sm text-left min-w-[600px]">
                                <thead className="bg-gray-100 font-bold text-gray-700"><tr><th className="p-3">Name</th><th className="p-3">Assigned Classes</th><th className="p-3 text-right">Actions</th></tr></thead>
                                <tbody>
                                    {teachers.map(t => (
                                        <tr key={t.id} className="border-b hover:bg-gray-50">
                                            <td className="p-3 font-medium">{t.name}</td>
                                            <td className="p-3">
                                                {t.assignedClasses.map(c => <span key={c} className="bg-gray-100 px-2 py-1 rounded text-xs mr-1 border">{c}</span>)}
                                            </td>
                                            <td className="p-3 text-right flex justify-end gap-2">
                                                <button onClick={()=>{setNewTeacher(t); setIsAddOpen(true)}} className="text-blue-600 hover:bg-blue-50 p-1 rounded"><Edit className="size-4"/></button>
                                                <button onClick={()=>deleteTeacher(t.id)} className="text-red-600 hover:bg-red-50 p-1 rounded"><Trash2 className="size-4"/></button>
                                            </td>
                                        </tr>
                                    ))}
                                    {teachers.length === 0 && <tr><td colSpan={3} className="p-6 text-center text-gray-500">No teachers added yet.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {tab === 'SUBJECTS' && (
                    <div>
                         <div className="flex justify-between items-center mb-6">
                            <h1 className="text-2xl font-bold text-gray-800">Manage Subjects</h1>
                            <button onClick={()=>{setNewSubject({}); setIsAddOpen(true)}} className="bg-indigo-600 text-white px-4 py-2 rounded flex items-center hover:bg-indigo-700"><Plus className="mr-2 size-4"/> Add Subject</button>
                        </div>
                        <div className="bg-white rounded-lg shadow overflow-hidden overflow-x-auto">
                            <table className="w-full text-sm text-left min-w-[600px]">
                                <thead className="bg-gray-100 font-bold text-gray-700"><tr><th className="p-3">Name</th><th className="p-3">Class</th><th className="p-3">Max Theory</th><th className="p-3">Max IA</th><th className="p-3 text-right">Actions</th></tr></thead>
                                <tbody>
                                    {subjects.map(s => (
                                        <tr key={s.id} className="border-b hover:bg-gray-50">
                                            <td className="p-3 font-medium">{s.name}</td>
                                            <td className="p-3"><span className="bg-gray-100 px-2 py-1 rounded text-xs border">{s.className}</span></td>
                                            <td className="p-3 text-gray-500">{s.maxMarksTheory}</td>
                                            <td className="p-3 text-gray-500">{s.maxMarksAssessment}</td>
                                            <td className="p-3 text-right flex justify-end gap-2">
                                                <button onClick={()=>{setNewSubject(s); setIsAddOpen(true)}} className="text-blue-600 hover:bg-blue-50 p-1 rounded"><Edit className="size-4"/></button>
                                                <button onClick={()=>deleteSubject(s.id)} className="text-red-600 hover:bg-red-50 p-1 rounded"><Trash2 className="size-4"/></button>
                                            </td>
                                        </tr>
                                    ))}
                                    {subjects.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-gray-500">No subjects added yet.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {tab === 'SETTINGS' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
                            <h2 className="text-xl font-bold mb-6">School Configuration</h2>
                            <div className="space-y-4">
                                <div><label className="block text-sm font-bold text-gray-700 mb-1">School Name</label><input className="w-full border p-2 rounded" value={localConfig.name} onChange={e=>setLocalConfig({...localConfig, name: e.target.value})} /></div>
                                <div><label className="block text-sm font-bold text-gray-700 mb-1">Address</label><input className="w-full border p-2 rounded" value={localConfig.address} onChange={e=>setLocalConfig({...localConfig, address: e.target.value})} /></div>
                                <div><label className="block text-sm font-bold text-gray-700 mb-1">Session Year</label><input className="w-full border p-2 rounded" value={localConfig.sessionYear || ''} onChange={e=>setLocalConfig({...localConfig, sessionYear: e.target.value})} /></div>
                                <div><label className="block text-sm font-bold text-gray-700 mb-1">Upload New Logo (Max 30KB)</label><input type="file" className="w-full border p-1 rounded" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if(f) { const r = new FileReader(); r.onloadend=()=>setLocalConfig({...localConfig, logoUrl: r.result as string}); r.readAsDataURL(f); } }} /></div>
                                <button onClick={handleConfigSave} className="bg-green-600 text-white px-6 py-2 rounded font-bold hover:bg-green-700 mt-4 shadow">Save School Details</button>
                            </div>
                        </div>

                        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
                            <h2 className="text-xl font-bold mb-6 flex items-center justify-between">
                                <span>Template Customization</span>
                                <button onClick={() => setPreviewTemplateId(editTemplateId)} className="text-sm bg-indigo-50 text-indigo-600 px-3 py-1 rounded border border-indigo-100 hover:bg-indigo-100 flex items-center"><Eye className="size-4 mr-1"/> Preview</button>
                            </h2>
                            <div className="mb-6">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Select Template to Edit</label>
                                <div className="flex gap-2">
                                    {[1,2,3,4,5].map(i => (
                                        <button key={i} onClick={()=>setEditTemplateId(i)} className={`h-10 w-12 rounded font-bold border transition ${editTemplateId === i ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>
                                            {i}
                                        </button>
                                    ))}
                                </div>
                                <div className="mt-2 text-xs text-gray-400 italic">Editing Template {editTemplateId}</div>
                            </div>
                            <div className="space-y-4 bg-gray-50 p-4 rounded border border-gray-100">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Primary Color</label>
                                    <div className="flex gap-2 items-center">
                                        <input type="color" className="h-10 w-14 border p-1 rounded cursor-pointer" value={activePrefs.primaryColor} onChange={e => updateTemplatePref(editTemplateId, 'primaryColor', e.target.value)} />
                                        <input type="text" className="border p-2 rounded text-sm font-mono w-28 uppercase" value={activePrefs.primaryColor} onChange={e => updateTemplatePref(editTemplateId, 'primaryColor', e.target.value)} />
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">Used for headers, borders, and main accents.</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Secondary Color</label>
                                    <div className="flex gap-2 items-center">
                                        <input type="color" className="h-10 w-14 border p-1 rounded cursor-pointer" value={activePrefs.secondaryColor} onChange={e => updateTemplatePref(editTemplateId, 'secondaryColor', e.target.value)} />
                                        <input type="text" className="border p-2 rounded text-sm font-mono w-28 uppercase" value={activePrefs.secondaryColor} onChange={e => updateTemplatePref(editTemplateId, 'secondaryColor', e.target.value)} />
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">Used for backgrounds, subtle accents, and secondary elements.</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Font Family</label>
                                    <select className="w-full border p-2 rounded" value={activePrefs.fontFamily} onChange={e => updateTemplatePref(editTemplateId, 'fontFamily', e.target.value as any)}>
                                        <option value="sans">Sans Serif (Clean, Modern)</option>
                                        <option value="serif">Serif (Traditional, Elegant)</option>
                                        <option value="mono">Monospace (Technical)</option>
                                    </select>
                                </div>
                            </div>
                            <div className="mt-6 pt-4 border-t">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Default Active Template</label>
                                <div className="flex gap-2 items-center">
                                    <button 
                                        onClick={()=>setLocalConfig({...localConfig, activeTemplate: editTemplateId})} 
                                        className={`px-4 py-2 rounded text-sm font-bold border transition ${localConfig.activeTemplate === editTemplateId ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                                    >
                                        {localConfig.activeTemplate === editTemplateId ? 'Currently Active' : 'Set as Active Template'}
                                    </button>
                                </div>
                                <p className="text-xs text-gray-400 mt-2">This template will be used by default for all students.</p>
                            </div>
                            <button onClick={handleConfigSave} className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-indigo-700 mt-6 shadow-md">Save Template Changes</button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

// --- STUDENT RESULT VIEW ---
const StudentResultView: React.FC<{
  students: T.Student[];
  subjects: T.Subject[];
  marks: T.MarkRecord[];
  config: T.SchoolConfig;
  onBack: () => void;
}> = ({ students, subjects, marks, config, onBack }) => {
  const [searchRoll, setSearchRoll] = useState('');
  const [searchClass, setSearchClass] = useState('');
  const [resultStudent, setResultStudent] = useState<T.Student | null>(null);
  const [error, setError] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const found = students.find(s => 
      s.rollNo === searchRoll && 
      s.className === searchClass
    );
    
    if (found) {
      setResultStudent(found);
      setError('');
    } else {
      setResultStudent(null);
      setError('Student not found. Please check Class and Roll No.');
    }
  };

  if (resultStudent) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="no-print bg-white shadow p-4 flex justify-between items-center sticky top-0 z-50">
             <button onClick={() => setResultStudent(null)} className="flex items-center text-gray-600 hover:text-indigo-600 font-bold">
                 <ArrowLeft className="size-5 mr-2" /> Back to Search
             </button>
             <button onClick={() => window.print()} className="bg-indigo-600 text-white px-4 py-2 rounded font-bold shadow hover:bg-indigo-700 flex items-center">
                 <Printer className="size-4 mr-2" /> Print Result
             </button>
        </div>
        
        <div className="p-4 md:p-8 max-w-[210mm] mx-auto">
             <ReportCard 
                student={resultStudent} 
                subjects={subjects.filter(s => s.className === resultStudent.className)} 
                marks={marks} 
                config={config} 
                template={config.activeTemplate || 1} 
             />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-indigo-50 flex flex-col items-center justify-center p-6 font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-indigo-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-indigo-50 rounded-full blur-2xl opacity-50"></div>
        
        <div className="text-center mb-8 relative z-10">
            <div className="bg-indigo-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                <GraduationCap className="size-10 text-indigo-600"/>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">View Result</h2>
            <p className="text-gray-500 mt-2 font-medium">Enter your details to view your report card</p>
        </div>

        {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm flex items-center border border-red-100 animate-fade-in shadow-sm">
                <AlertCircle className="size-5 mr-3 shrink-0"/> {error}
            </div>
        )}

        <form onSubmit={handleSearch} className="space-y-6 relative z-10">
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide text-xs">Select Class</label>
                <div className="relative">
                    <select 
                        className="w-full border border-gray-200 p-4 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition bg-gray-50 hover:bg-white appearance-none font-medium text-gray-700"
                        value={searchClass}
                        onChange={e => setSearchClass(e.target.value)}
                        required
                    >
                        <option value="">-- Select Class --</option>
                        {AVAILABLE_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                    </div>
                </div>
            </div>
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide text-xs">Roll Number</label>
                <input 
                    type="text" 
                    className="w-full border border-gray-200 p-4 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition bg-gray-50 hover:bg-white font-medium text-gray-700 placeholder-gray-400" 
                    placeholder="Ex. 101" 
                    value={searchRoll} 
                    onChange={e => setSearchRoll(e.target.value)}
                    required 
                />
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 shadow-xl hover:shadow-indigo-200 transition-all transform hover:-translate-y-1 flex justify-center items-center group">
                Show Result <Check className="ml-2 size-5 group-hover:scale-110 transition-transform"/>
            </button>
            <button type="button" onClick={onBack} className="w-full text-gray-400 text-sm hover:text-gray-600 py-2 font-medium transition-colors">
                Back to Home
            </button>
        </form>
      </div>
      <div className="mt-8 text-center text-gray-400 text-xs font-medium">
          Protected by {config.developerName} Portal System
      </div>
    </div>
  );
};

const App: React.FC = () => {
    const [view, setView] = useState<T.ViewState>('HOME');
    const [loading, setLoading] = useState(true);
    const [config, setConfig] = useState<T.SchoolConfig>({} as any);
    const [students, setStudents] = useState<T.Student[]>([]);
    const [teachers, setTeachers] = useState<T.Teacher[]>([]);
    const [subjects, setSubjects] = useState<T.Subject[]>([]);
    const [marks, setMarks] = useState<T.MarkRecord[]>([]);
    
    const [currentUser, setCurrentUser] = useState<T.Teacher | null>(null);

    // Admin login
    const [adminUser, setAdminUser] = useState('');
    const [adminPass, setAdminPass] = useState('');

    useEffect(() => {
        const init = async () => {
            try {
                const data = await storage.fetchAllData();
                setConfig(data.config);
                setStudents(data.students);
                setTeachers(data.teachers);
                setSubjects(data.subjects);
                setMarks(data.marks);
            } catch (error) {
                console.error("Data load failed", error);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, []);

    const handleTeacherLogin = async (name: string, pass: string) => {
        const t = teachers.find(tea => tea.name === name && tea.password === pass);
        if (t) {
            setCurrentUser(t);
            setView('TEACHER_DASHBOARD');
            return true;
        }
        return false;
    };

    const handleAdminLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (adminUser === config.adminUsername && adminPass === config.adminPassword) {
            setView('ADMIN_DASHBOARD');
        } else {
            alert("Invalid Credentials");
        }
    };

    const saveData = async (key: string, data: any) => {
        if (key === 'students') { setStudents(data); await storage.saveStudents(data); }
        if (key === 'teachers') { setTeachers(data); await storage.saveTeachers(data); }
        if (key === 'subjects') { setSubjects(data); await storage.saveSubjects(data); }
        if (key === 'marks') { setMarks(data); await storage.saveMarks(data); }
        if (key === 'config') { setConfig(data); await storage.saveConfig(data); }
    };

    if (loading) return <div className="h-screen flex items-center justify-center font-bold text-gray-500">Loading Portal...</div>;

    if (view === 'HOME') {
        return (
            <div className="min-h-screen bg-white flex flex-col font-sans">
                {/* Navbar */}
                <nav className="w-full max-w-7xl mx-auto p-4 md:p-6 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        {config.logoUrl ? (
                            <img src={config.logoUrl} className="h-10 w-10 md:h-12 md:w-12 object-contain" alt="Logo" />
                        ) : (
                            <div className="h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                                <School className="size-6" />
                            </div>
                        )}
                        <h1 className="font-bold text-lg md:text-xl text-gray-900 tracking-tight leading-tight max-w-[200px] md:max-w-none">
                            {config.name || "School Portal"}
                        </h1>
                    </div>
                    <div className="hidden md:flex gap-3">
                        <button 
                            onClick={() => setView('TEACHER_LOGIN')} 
                            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors"
                        >
                            Teacher Login
                        </button>
                        <button 
                            onClick={() => setView('ADMIN_LOGIN')} 
                            className="px-5 py-2 text-sm font-bold text-white bg-gray-900 rounded-full hover:bg-gray-800 transition-shadow shadow-lg hover:shadow-xl"
                        >
                            Admin Portal
                        </button>
                    </div>
                    {/* Mobile Menu Icon (Simplified) */}
                    <div className="md:hidden flex gap-2">
                         <button onClick={() => setView('TEACHER_LOGIN')} className="p-2 text-gray-600 border rounded-lg bg-gray-50"><Users className="size-5"/></button>
                         <button onClick={() => setView('ADMIN_LOGIN')} className="p-2 text-white bg-gray-900 border border-gray-900 rounded-lg"><Settings className="size-5"/></button>
                    </div>
                </nav>

                {/* Hero Section */}
                <main className="flex-grow flex items-center justify-center p-6 relative overflow-hidden">
                    {/* Background decorations */}
                    <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                        <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-indigo-50 rounded-full blur-3xl opacity-50"></div>
                        <div className="absolute bottom-[-10%] left-[-10%] w-72 h-72 bg-purple-50 rounded-full blur-3xl opacity-50"></div>
                    </div>

                    <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                        <div className="space-y-8 text-center md:text-left">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-bold uppercase tracking-wider">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                                </span>
                                Results Live for {config.sessionYear || '2024-25'}
                            </div>
                            
                            <h2 className="text-5xl md:text-7xl font-black text-gray-900 tracking-tight leading-[1.1]">
                                Check Your <br/>
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Results</span> Here.
                            </h2>
                            
                            <p className="text-lg text-gray-500 font-medium leading-relaxed max-w-md mx-auto md:mx-0">
                                Students and parents can now view marks, download report cards, and check attendance records online instantly.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start pt-2">
                                <button 
                                    onClick={() => setView('STUDENT_RESULT')} 
                                    className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-indigo-200 hover:shadow-2xl hover:bg-indigo-700 hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2 group"
                                >
                                    View Result
                                    <Check className="size-5 group-hover:scale-110 transition-transform"/>
                                </button>
                            </div>
                        </div>

                        <div className="relative flex justify-center perspective-1000">
                            <div className="relative z-10 bg-white p-8 rounded-3xl shadow-2xl border border-gray-100 transform rotate-[-2deg] hover:rotate-0 transition-transform duration-500">
                                <div className="bg-indigo-50 rounded-2xl p-8 mb-4 flex justify-center">
                                    <GraduationCap className="size-32 text-indigo-600" />
                                </div>
                                <div className="space-y-3 w-64">
                                    <div className="h-4 bg-gray-100 rounded w-3/4"></div>
                                    <div className="h-4 bg-gray-100 rounded w-1/2"></div>
                                    <div className="h-4 bg-gray-100 rounded w-full"></div>
                                </div>
                                <div className="mt-6 flex gap-3 items-center">
                                    <div className="h-10 w-10 rounded-full bg-gray-100"></div>
                                    <div className="flex-1 space-y-2 py-1">
                                        <div className="h-2 bg-gray-100 rounded w-1/2"></div>
                                        <div className="h-2 bg-gray-100 rounded w-1/4"></div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Decor elements */}
                            <div className="absolute top-10 right-10 bg-yellow-400 h-16 w-16 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
                            <div className="absolute -bottom-8 -left-8 bg-purple-400 h-16 w-16 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
                        </div>
                    </div>
                </main>

                <footer className="py-6 text-center text-gray-400 text-sm font-medium border-t border-gray-50">
                    © {new Date().getFullYear()} {config.name}. All rights reserved.
                </footer>
            </div>
        );
    }

    if (view === 'TEACHER_LOGIN') return <TeacherLoginView teachers={teachers} onLogin={handleTeacherLogin} onBack={()=>setView('HOME')} />;
    
    if (view === 'TEACHER_DASHBOARD' && currentUser) return <TeacherDashboard 
        teacher={currentUser} 
        students={students} 
        subjects={subjects} 
        marks={marks} 
        config={config} 
        onSaveStudents={(d)=>saveData('students', d)} 
        onSaveSubjects={(d)=>saveData('subjects', d)} 
        onSaveMarks={(d)=>saveData('marks', d)} 
        onLogout={()=>{setCurrentUser(null); setView('HOME')}} 
        onRefresh={()=>{/* reload handled via state updates */}} 
    />;

    if (view === 'STUDENT_RESULT') return (
        <StudentResultView 
          students={students} 
          subjects={subjects} 
          marks={marks} 
          config={config} 
          onBack={() => setView('HOME')} 
        />
    );

    if (view === 'ADMIN_LOGIN') {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm">
                    <div className="text-center mb-6">
                        <div className="bg-red-100 p-3 rounded-full inline-block mb-3"><Settings className="size-6 text-red-600"/></div>
                        <h2 className="text-xl font-bold">Admin Access</h2>
                    </div>
                    <form onSubmit={handleAdminLogin} className="space-y-4">
                        <input className="w-full border p-3 rounded bg-gray-50" placeholder="Username" value={adminUser} onChange={e=>setAdminUser(e.target.value)} />
                        <input className="w-full border p-3 rounded bg-gray-50" type="password" placeholder="Password" value={adminPass} onChange={e=>setAdminPass(e.target.value)} />
                        <button className="w-full bg-gray-900 text-white py-3 rounded font-bold hover:bg-gray-800">Login</button>
                        <button type="button" onClick={()=>setView('HOME')} className="w-full text-center text-sm text-gray-400 mt-2">Cancel</button>
                    </form>
                </div>
            </div>
        );
    }

    if (view === 'ADMIN_DASHBOARD') return <AdminDashboard 
        config={config} 
        students={students} 
        teachers={teachers} 
        subjects={subjects} 
        onSaveConfig={(d)=>saveData('config', d)} 
        onSaveStudents={(d)=>saveData('students', d)} 
        onSaveTeachers={(d)=>saveData('teachers', d)} 
        onSaveSubjects={(d)=>saveData('subjects', d)} 
        onLogout={()=>setView('HOME')} 
    />;

    return null;
};

export default App;