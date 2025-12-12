import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as T from './types';
import { storage } from './services/storage';
import { generateStudentRemark } from './services/gemini';
import { ReportCard, DEFAULT_THEMES } from './components/ReportCard';
import { 
  Users, Settings, LogOut, BookOpen, GraduationCap, 
  Printer, Upload, Plus, Trash2, Edit, X, Image as ImageIcon, 
  Menu, CalendarCheck, Sparkles, MessageSquare, Cloud, RefreshCw, Link, Database, AlertCircle, Laptop, Phone, User, Home, CheckSquare, Square, FileText, Calendar, List, Layout, ToggleLeft, School, Check, Wand2, Eye, Save, Lock, FileSpreadsheet, ArrowLeft, Search, Download, Key, Palette, Type,
  Trophy, Medal, Star, BarChart3, ChevronRight, LogIn
} from 'lucide-react';

// --- CONSTANTS ---
const AVAILABLE_CLASSES = [
  "Play Group", "Nursery", "LKG", "UKG",
  "Class 1", "Class 2", "Class 3", "Class 4", "Class 5",
  "Class 6", "Class 7", "Class 8", "Class 9", "Class 10",
  "Class 11 Arts", "Class 11 Comm", "Class 11 Sci",
  "Class 12 Arts", "Class 12 Comm", "Class 12 Sci"
];

// --- DUMMY DATA FOR ADMIN PREVIEW ---
const DUMMY_STUDENT: T.Student = {
    id: 'demo', srNo: '001', rollNo: '101', name: 'Rohan Sharma', fatherName: 'Rajesh Sharma', motherName: 'Sunita Sharma',
    className: 'Class 10', mobile: '9999999999', dob: '2008-01-01', address: '123, School Road, City',
    attendance: { totalDays: 200, presentDays: 185 }, remarks: 'Excellent performance! Keep shining.'
};
const DUMMY_SUBJECTS: T.Subject[] = [
    { id: '1', name: 'Mathematics', className: 'Class 10', maxMarksTheory: 80, maxMarksAssessment: 20 },
    { id: '2', name: 'Science', className: 'Class 10', maxMarksTheory: 80, maxMarksAssessment: 20 },
    { id: '3', name: 'English', className: 'Class 10', maxMarksTheory: 80, maxMarksAssessment: 20 },
];
const DUMMY_MARKS: T.MarkRecord[] = [
    { studentId: 'demo', subjectId: '1', examType: 'HalfYearly', theory: 70, assessment: 18 },
    { studentId: 'demo', subjectId: '1', examType: 'Annual', theory: 75, assessment: 19 },
    { studentId: 'demo', subjectId: '2', examType: 'HalfYearly', theory: 65, assessment: 15 },
    { studentId: 'demo', subjectId: '2', examType: 'Annual', theory: 72, assessment: 18 },
    { studentId: 'demo', subjectId: '3', examType: 'HalfYearly', theory: 60, assessment: 18 },
    { studentId: 'demo', subjectId: '3', examType: 'Annual', theory: 68, assessment: 19 },
];

// --- COMPONENTS ---

// 0. SAVE INDICATOR
const SaveIndicator: React.FC<{ status: 'IDLE' | 'SAVING' | 'SUCCESS' | 'ERROR' }> = ({ status }) => {
  if (status === 'IDLE') return null;
  return (
    <div className={`fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg text-white font-bold text-sm flex items-center gap-2 transition-all transform translate-y-0 z-50 ${
        status === 'SAVING' ? 'bg-blue-600' : 
        status === 'SUCCESS' ? 'bg-green-600' : 'bg-red-600'
    }`}>
        {status === 'SAVING' && <RefreshCw className="animate-spin size-4" />}
        {status === 'SUCCESS' && <Check className="size-4" />}
        {status === 'ERROR' && <AlertCircle className="size-4" />}
        {status === 'SAVING' ? 'Saving...' : status === 'SUCCESS' ? 'Saved' : 'Save Failed'}
    </div>
  );
};

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
             <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md border border-gray-100 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-green-500"></div>
                <div className="text-center mb-6">
                    <div className="bg-green-100 p-3 rounded-full inline-block mb-2"><BookOpen className="size-8 text-green-600"/></div>
                    <h2 className="text-2xl font-bold text-gray-900">Teacher Login</h2>
                    <p className="text-gray-500">Access your dashboard</p>
                </div>
                
                {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm flex items-center"><AlertCircle className="size-4 mr-2"/>{error}</div>}
                
                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Select Your Name</label>
                        <select 
                            className="w-full border p-3 rounded-lg bg-gray-50 focus:ring-2 focus:ring-green-500 outline-none transition"
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
                            className="w-full border p-3 rounded-lg bg-gray-50 focus:ring-2 focus:ring-green-500 outline-none transition" 
                            value={password} 
                            onChange={e => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            required 
                        />
                    </div>
                    <button type="submit" className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition shadow-md flex justify-center items-center">
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
  onSaveConfig: (c: T.SchoolConfig) => void;
  onLogout: () => void;
  onRefresh: () => void;
}> = ({ teacher, students, subjects, marks, config, onSaveStudents, onSaveSubjects, onSaveMarks, onSaveConfig, onLogout, onRefresh }) => {
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
  const [batchTotalDays, setBatchTotalDays] = useState('');
  
  // Printing State
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [templateId, setTemplateId] = useState<number>(config.activeTemplate || 1);
  const [printOrientation, setPrintOrientation] = useState<'portrait' | 'landscape'>('portrait');

  // Subject Management State (for Teachers)
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [newSubject, setNewSubject] = useState<Partial<T.Subject>>({});

  const classStudents = students.filter(s => s.className === selectedClass);
  const classSubjects = subjects.filter(s => s.className === selectedClass);
  const selectedSubjectObj = subjects.find(s => s.id === selectedSubjectId);

  useEffect(() => {
      setSelectedStudentIds(new Set());
  }, [selectedClass, activeTab]);

  const handleMarkChange = (studentId: string, field: 'theory' | 'assessment', value: string) => {
    if (!selectedSubjectId) return;
    
    // FIX: Handle 0 properly so it doesn't disappear
    const numValue = value === '' ? 0 : parseFloat(value); 
    
    let newMarks = [...marks];
    // FIX: Robust Comparison (String conversion) to ensure ID match
    const existingIndex = newMarks.findIndex(m => String(m.studentId) === String(studentId) && String(m.subjectId) === String(selectedSubjectId) && m.examType === examType);
    
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
                      totalDays: field === 'totalDays' ? numValue : (s.attendance?.totalDays || 0),
                      presentDays: field === 'presentDays' ? numValue : (s.attendance?.presentDays || 0),
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
          // FIX: Robust Comparison here too
          const idx = newMarks.findIndex(m => String(m.studentId) === String(sid) && String(m.subjectId) === String(selectedSubjectId) && m.examType === examType);
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
  };

  // Teacher Subject Functions
  const saveTeacherSubject = () => {
      if (!newSubject.name || !newSubject.className) return alert("Fill required fields");
      const subject: T.Subject = {
          ...newSubject as T.Subject,
          id: newSubject.id || Date.now().toString(),
          maxMarksTheory: Number(newSubject.maxMarksTheory) || 0, // Ensure numeric
          maxMarksAssessment: Number(newSubject.maxMarksAssessment) || 0 // Ensure numeric, can be 0
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
      // Filter students based on selection (if any selected, otherwise all)
      const studentsToPrint = selectedStudentIds.size > 0 
          ? classStudents.filter(s => selectedStudentIds.has(s.id))
          : classStudents;

      return (
          <div className="bg-gray-100 min-h-screen">
               <div className="no-print p-4 bg-gray-900 text-white flex justify-between items-center sticky top-0 z-50 shadow-lg flex-wrap gap-4">
                   <div className="flex items-center flex-wrap gap-4">
                       <h2 className="font-bold text-lg mr-2 flex items-center"><Printer className="mr-2"/> Print Preview: {selectedClass}</h2>
                       <div className="flex items-center space-x-2 bg-gray-800 p-1.5 rounded-lg border border-gray-700">
                          <span className="text-xs text-gray-400 font-bold px-2 uppercase">Template:</span>
                          {[1,2,3,4,5,6].map(id => (
                              <button key={id} onClick={()=>setTemplateId(id)} className={`px-3 py-1.5 rounded-md text-sm transition ${templateId===id ? 'bg-indigo-600 text-white font-bold shadow' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}>{id}</button>
                          ))}
                       </div>
                       <div className="flex items-center space-x-2 bg-gray-800 p-1.5 rounded-lg border border-gray-700">
                          <span className="text-xs text-gray-400 font-bold px-2 uppercase">Orientation:</span>
                          <button onClick={()=>setPrintOrientation('portrait')} className={`px-3 py-1.5 rounded-md text-sm transition ${printOrientation==='portrait' ? 'bg-indigo-600 text-white font-bold shadow' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}>Portrait</button>
                          <button onClick={()=>setPrintOrientation('landscape')} className={`px-3 py-1.5 rounded-md text-sm transition ${printOrientation==='landscape' ? 'bg-indigo-600 text-white font-bold shadow' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}>Landscape</button>
                       </div>
                   </div>
                   <div className="flex gap-3">
                       <button onClick={() => window.print()} className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded font-bold flex items-center shadow transition"><Printer className="mr-2 size-4"/> Print Now</button>
                       <button onClick={() => setShowPrintPreview(false)} className="bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded font-bold flex items-center shadow transition"><X className="mr-2 size-4"/> Close</button>
                   </div>
               </div>
               <div className={`p-8 mx-auto transition-all duration-300 ${printOrientation === 'landscape' ? 'max-w-[297mm]' : 'max-w-[210mm]'}`}>
                   <style>{`@media print { @page { size: ${printOrientation}; } }`}</style>
                   {studentsToPrint.map(student => (
                       <ReportCard key={student.id} student={student} subjects={classSubjects} marks={marks} config={config} template={templateId} orientation={printOrientation} />
                   ))}
                   {studentsToPrint.length === 0 && <div className="text-center p-10 text-gray-500">No students selected for printing.</div>}
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
       <main className="flex-grow flex flex-col p-2 md:p-6 w-full overflow-hidden">
         {!assignedClasses || assignedClasses.length === 0 ? (
            <div className="bg-red-50 border border-red-200 p-8 rounded-xl text-center m-auto">
                <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4"/>
                <h3 className="text-lg font-bold text-red-800">No Classes Assigned</h3>
                <p className="text-red-600 mt-2">Please ask the Admin to assign classes to your account.</p>
            </div>
         ) : (
             <>
                {/* Global Filters */}
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
                            <table className="w-full min-w-[800px] md:min-w-full border-collapse">
                                <thead className="bg-gray-100 text-left sticky top-0 z-30 shadow-sm">
                                <tr>
                                    <th className="p-3 w-10 text-center bg-gray-100 sticky left-0 z-40 border-b border-gray-200"><input type="checkbox" className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 size-5 cursor-pointer" onChange={handleSelectAll} checked={classStudents.length > 0 && selectedStudentIds.size === classStudents.length} /></th>
                                    <th className="p-3 w-16 border-b border-gray-200">Roll</th>
                                    <th className="p-3 min-w-[150px] border-b border-gray-200">Name</th>
                                    <th className="p-3 w-24 border-b border-gray-200">Theory</th>
                                    <th className="p-3 w-24 border-b border-gray-200">IA</th>
                                    <th className="p-3 min-w-[200px] border-b border-gray-200">Remarks</th>
                                    <th className="p-3 w-16 text-center border-b border-gray-200">AI</th>
                                </tr>
                                </thead>
                                <tbody>
                                {classStudents.map(s => {
                                    // FIX: Robust ID Comparison (String vs String)
                                    const mark = marks.find(m => String(m.studentId) === String(s.id) && String(m.subjectId) === String(selectedSubjectId) && m.examType === examType);
                                    const isSelected = selectedStudentIds.has(s.id);
                                    const isIADisabled = selectedSubjectObj && Number(selectedSubjectObj.maxMarksAssessment) === 0;

                                    return (
                                    <tr key={s.id} className={`border-b transition-colors ${isSelected ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}>
                                        <td className="p-2 text-center sticky left-0 z-20 bg-inherit border-r md:border-none"><input type="checkbox" className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 size-5 cursor-pointer" checked={isSelected} onChange={() => handleSelectStudent(s.id)} /></td>
                                        <td className="p-2 font-mono text-gray-500 text-sm">{s.rollNo}</td>
                                        <td className="p-2 font-medium whitespace-nowrap text-sm">{s.name}</td>
                                        {/* FIX: Ensure 0 is displayed correctly and not as empty string */}
                                        <td className="p-2"><input type="number" className="w-full border border-gray-300 p-2 rounded text-center bg-white focus:ring-2 focus:ring-indigo-500 outline-none" value={mark?.theory !== undefined ? mark.theory : ''} placeholder="0" onChange={e => handleMarkChange(s.id, 'theory', e.target.value)}/></td>
                                        <td className="p-2"><input type="number" disabled={isIADisabled} className={`w-full border border-gray-300 p-2 rounded text-center focus:ring-2 focus:ring-indigo-500 outline-none ${isIADisabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white'}`} value={isIADisabled ? '' : (mark?.assessment !== undefined ? mark.assessment : '')} placeholder={isIADisabled ? '-' : '0'} onChange={e => handleMarkChange(s.id, 'assessment', e.target.value)}/></td>
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

                {/* (ATTENDANCE, RESULTS, SUBJECTS TABS logic remains same) */}
                {activeTab === 'ATTENDANCE' && (
                    selectedClass ? (
                        <div className="bg-white rounded shadow flex flex-col flex-grow overflow-hidden border border-gray-200">
                            {/* ... Attendance content ... */}
                            <div className="p-4 border-b bg-indigo-50 flex flex-wrap items-center gap-6 shrink-0">
                                <div className="flex items-center gap-2">
                                    <CalendarCheck className="text-indigo-600 size-6" />
                                    <span className="font-bold text-indigo-900 text-lg hidden md:inline">Attendance Manager</span>
                                </div>
                                <div className="flex items-center gap-3 flex-grow bg-white p-2 rounded border shadow-sm">
                                    <span className="text-xs font-bold text-gray-500 uppercase">Set Total Days For All:</span>
                                    <input type="number" placeholder="e.g. 220" className="border p-2 rounded text-sm w-24 md:w-32 focus:ring-2 focus:ring-indigo-500 outline-none font-bold" value={batchTotalDays} onChange={(e) => setBatchTotalDays(e.target.value)} />
                                    <button onClick={() => {
                                            const days = parseInt(batchTotalDays);
                                            if (!isNaN(days) && days > 0) {
                                                if(confirm(`Update TOTAL WORKING DAYS to ${days} for all ${classStudents.length} students in ${selectedClass}?`)) {
                                                    const updatedStudents = students.map(s => {
                                                        if (s.className === selectedClass) {
                                                            return { ...s, attendance: { ...s.attendance, totalDays: days } };
                                                        }
                                                        return s;
                                                    });
                                                    onSaveStudents(updatedStudents);
                                                }
                                            } else {
                                                alert("Please enter a valid number of days.");
                                            }
                                        }} className="bg-indigo-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-indigo-700 shadow-sm whitespace-nowrap flex items-center">
                                        <CheckSquare className="mr-2 size-4" /> Apply All
                                    </button>
                                </div>
                            </div>
                            <div className="flex-grow overflow-auto">
                                <table className="w-full min-w-[600px] border-collapse text-sm text-left">
                                    <thead className="bg-gray-100 text-gray-700 sticky top-0 z-10 shadow-sm">
                                        <tr><th className="p-3 border-b w-20">Roll</th><th className="p-3 border-b">Name</th><th className="p-3 border-b w-32 text-center">Total Days</th><th className="p-3 border-b w-32 text-center">Present Days</th><th className="p-3 border-b w-24 text-center">%</th></tr>
                                    </thead>
                                    <tbody>
                                        {classStudents.map(s => {
                                            const total = s.attendance?.totalDays || 0;
                                            const present = s.attendance?.presentDays || 0;
                                            const percent = total > 0 ? ((present / total) * 100).toFixed(1) : '0.0';
                                            const isLow = parseFloat(percent) < 75;
                                            return (
                                                <tr key={s.id} className="border-b hover:bg-gray-50 transition">
                                                    <td className="p-3 font-mono text-gray-500">{s.rollNo}</td>
                                                    <td className="p-3 font-medium">{s.name}</td>
                                                    <td className="p-3"><input type="number" className="w-full border p-2 rounded text-center focus:ring-2 focus:ring-indigo-500 outline-none" value={total || ''} onChange={(e) => handleAttendanceChange(s.id, 'totalDays', e.target.value)} placeholder="0"/></td>
                                                    <td className="p-3"><input type="number" className="w-full border p-2 rounded text-center focus:ring-2 focus:ring-indigo-500 outline-none" value={present || ''} onChange={(e) => handleAttendanceChange(s.id, 'presentDays', e.target.value)} placeholder="0"/></td>
                                                    <td className="p-3 text-center"><span className={`px-2 py-1 rounded text-xs font-bold inline-block w-16 ${isLow ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{percent}%</span></td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-white rounded border border-dashed border-gray-300">
                            <CalendarCheck className="mx-auto h-12 w-12 text-gray-300 mb-4"/>
                            <p className="text-gray-500">Select a Class to manage attendance.</p>
                        </div>
                    )
                )}

                {activeTab === 'RESULTS' && (
                    <div className="bg-white rounded shadow flex flex-col flex-grow overflow-hidden border border-gray-200">
                        {selectedClass ? (
                            <>
                                <div className="p-4 border-b bg-indigo-50 flex flex-wrap items-center justify-between gap-4 shrink-0">
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <label className="text-sm font-bold text-gray-700">Report Template:</label>
                                            <select className="border border-indigo-300 p-2 rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-medium" value={templateId} onChange={e => setTemplateId(Number(e.target.value))}>
                                                <option value={1}>1. Classic</option>
                                                <option value={2}>2. Modern</option>
                                                <option value={3}>3. Professional</option>
                                                <option value={4}>4. Elegant</option>
                                                <option value={5}>5. Corporate</option>
                                                <option value={6}>6. Custom Builder</option>
                                            </select>
                                            <button onClick={() => { onSaveConfig({...config, activeTemplate: templateId}); }} className="bg-gray-200 text-gray-700 px-3 py-2 rounded text-xs font-bold hover:bg-gray-300 ml-2" title="Set this template as default for all students">Set Default</button>
                                        </div>
                                        <div className="text-sm text-gray-600 font-medium hidden md:block">| {selectedStudentIds.size} Students Selected</div>
                                    </div>
                                    <button onClick={() => setShowPrintPreview(true)} className="bg-indigo-600 text-white px-6 py-2 rounded font-bold shadow hover:bg-indigo-700 flex items-center transition"><Printer className="mr-2 size-4"/> {selectedStudentIds.size > 0 ? `Print Selected (${selectedStudentIds.size})` : 'Print All'}</button>
                                </div>
                                <div className="flex-grow overflow-auto">
                                    <table className="w-full text-sm text-left border-collapse">
                                        <thead className="bg-gray-100 text-gray-700 font-bold sticky top-0 z-10 shadow-sm">
                                            <tr>
                                                <th className="p-3 w-10 text-center border-b"><input type="checkbox" className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 size-5 cursor-pointer" onChange={handleSelectAll} checked={classStudents.length > 0 && selectedStudentIds.size === classStudents.length}/></th>
                                                <th className="p-3 border-b w-24">Roll No</th><th className="p-3 border-b">Student Name</th><th className="p-3 border-b">Father's Name</th><th className="p-3 border-b text-center w-32">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {classStudents.map(s => {
                                                const hasMarks = marks.some(m => m.studentId === s.id);
                                                return (
                                                    <tr key={s.id} className={`border-b hover:bg-gray-50 transition cursor-pointer ${selectedStudentIds.has(s.id) ? 'bg-indigo-50' : ''}`} onClick={() => handleSelectStudent(s.id)}>
                                                        <td className="p-3 text-center"><input type="checkbox" className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 size-5 cursor-pointer" checked={selectedStudentIds.has(s.id)} onChange={() => handleSelectStudent(s.id)} onClick={(e) => e.stopPropagation()}/></td>
                                                        <td className="p-3 font-mono text-gray-600">{s.rollNo}</td>
                                                        <td className="p-3 font-bold text-gray-800">{s.name}</td>
                                                        <td className="p-3 text-gray-500">{s.fatherName}</td>
                                                        <td className="p-3 text-center">
                                                            {hasMarks ? (
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><Check className="mr-1 size-3"/> Ready</span>
                                                            ) : (
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pending</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {classStudents.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-gray-500">No students found in this class.</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-20 bg-white rounded border border-dashed border-gray-300"><Printer className="mx-auto h-12 w-12 text-gray-300 mb-4"/><p className="text-gray-500">Select a Class to manage results and printing.</p></div>
                        )
                    }
                    </div>
                )}

                {activeTab === 'SUBJECTS' && (
                    <div className="flex-col flex-grow overflow-y-auto">
                         <div className="flex justify-between items-center mb-6">
                            <h1 className="text-lg md:text-2xl font-bold text-gray-800">Manage Your Subjects</h1>
                            <button onClick={()=>{setNewSubject({}); setIsSubjectModalOpen(true)}} className="bg-indigo-600 text-white px-4 py-2 rounded flex items-center hover:bg-indigo-700 text-sm shadow transition"><Plus className="mr-2 size-4"/> Add Subject</button>
                        </div>
                        <div className="bg-white rounded-lg shadow overflow-hidden overflow-x-auto border border-gray-200">
                            <table className="w-full text-sm text-left min-w-[600px]">
                                <thead className="bg-gray-100 font-bold text-gray-700">
                                    <tr><th className="p-3 border-b">Subject Name</th><th className="p-3 border-b">Class</th><th className="p-3 border-b">Max Theory</th><th className="p-3 border-b">Max IA</th><th className="p-3 border-b text-right">Actions</th></tr>
                                </thead>
                                <tbody>
                                    {subjects.filter(s => assignedClasses.includes(s.className)).map(s => (
                                        <tr key={s.id} className="border-b hover:bg-gray-50 transition">
                                            <td className="p-3 font-medium text-gray-900">{s.name}</td>
                                            <td className="p-3"><span className="bg-gray-100 px-2 py-1 rounded text-xs border font-bold text-gray-600">{s.className}</span></td>
                                            <td className="p-3 text-gray-500">{s.maxMarksTheory}</td>
                                            <td className="p-3 text-gray-500">{s.maxMarksAssessment}</td>
                                            <td className="p-3 text-right flex justify-end gap-2">
                                                <button onClick={()=>{setNewSubject(s); setIsSubjectModalOpen(true)}} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition"><Edit className="size-4"/></button>
                                                <button onClick={()=>{if(confirm('Delete this subject?')) onSaveSubjects(subjects.filter(x=>x.id!==s.id))}} className="p-1.5 text-red-600 hover:bg-red-100 rounded transition"><Trash2 className="size-4"/></button>
                                            </td>
                                        </tr>
                                    ))}
                                    {subjects.filter(s => assignedClasses.includes(s.className)).length === 0 && <tr><td colSpan={5} className="p-6 text-center text-gray-500">No subjects found for your classes. Add one to get started.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
             </>
         )}
       </main>
    </div>
  );
};

// 4. ADMIN DASHBOARD (Keeping component code same, just ensuring exports)
const AdminDashboard: React.FC<{
  config: T.SchoolConfig;
  students: T.Student[];
  teachers: T.Teacher[];
  subjects: T.Subject[];
  marks: T.MarkRecord[];
  onSaveConfig: (c: T.SchoolConfig) => void;
  onSaveStudents: (s: T.Student[]) => void;
  onSaveTeachers: (t: T.Teacher[]) => void;
  onSaveSubjects: (s: T.Subject[]) => void;
  onLogout: () => void;
}> = ({ config, students, teachers, subjects, marks, onSaveConfig, onSaveStudents, onSaveTeachers, onSaveSubjects, onLogout }) => {
  const [activeTab, setActiveTab] = useState('STUDENTS');
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [newStudent, setNewStudent] = useState<Partial<T.Student>>({});
  const [showTemplatePreview, setShowTemplatePreview] = useState(false); // Admin Preview State
  const [showMeritPrint, setShowMeritPrint] = useState(false); // Print Merit List
  
  // Subject Modal State
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [newSubject, setNewSubject] = useState<Partial<T.Subject>>({});
  
  // Teacher Modal State
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [currentTeacher, setCurrentTeacher] = useState<Partial<T.Teacher>>({ assignedClasses: [] });

  // Filter state for students
  const [studentFilterClass, setStudentFilterClass] = useState('');
  const [studentSearch, setStudentSearch] = useState('');

  // --- ANALYTICS CALCULATIONS ---
  const { classStats, overallTopper, overallAttendance } = useMemo(() => {
      const stats = students.map(s => {
          const sMarks = marks.filter(m => m.studentId === s.id);
          const classSubjects = subjects.filter(sub => sub.className === s.className);
          
          if (sMarks.length === 0) return { ...s, percentage: 0, totalMarks: 0, attendancePct: 0 };

          let totalObtained = 0;
          let totalMax = 0;

          classSubjects.forEach(sub => {
              const half = sMarks.find(m => m.subjectId === sub.id && m.examType === 'HalfYearly');
              const annual = sMarks.find(m => m.subjectId === sub.id && m.examType === 'Annual');
              
              if (half) totalObtained += (half.theory + half.assessment);
              if (annual) totalObtained += (annual.theory + annual.assessment);
              
              totalMax += (sub.maxMarksTheory + sub.maxMarksAssessment) * 2;
          });

          const percentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
          const attendancePct = s.attendance.totalDays > 0 ? (s.attendance.presentDays / s.attendance.totalDays) * 100 : 0;

          return { ...s, percentage, totalMarks: totalObtained, attendancePct };
      });

      const grouped = AVAILABLE_CLASSES.reduce((acc, cls) => {
          const inClass = stats.filter(s => s.className === cls);
          if (inClass.length === 0) return acc;
          const top3 = [...inClass].sort((a, b) => b.percentage - a.percentage).slice(0, 3);
          const bestAtt = [...inClass].sort((a, b) => b.attendancePct - a.attendancePct)[0];
          acc[cls] = { top3, bestAtt };
          return acc;
      }, {} as Record<string, { top3: typeof stats, bestAtt: typeof stats[0] }>);

      const validStats = stats.filter(s => s.percentage > 0);
      const overallTopper = validStats.length > 0 ? validStats.sort((a, b) => b.percentage - a.percentage)[0] : null;
      const overallAttendance = validStats.length > 0 ? validStats.sort((a, b) => b.attendancePct - a.attendancePct)[0] : null;

      return { classStats: grouped, overallTopper, overallAttendance };
  }, [students, marks, subjects]);


  const filteredStudents = students.filter(s => 
      (studentFilterClass ? s.className === studentFilterClass : true) &&
      (studentSearch ? (s.name.toLowerCase().includes(studentSearch.toLowerCase()) || String(s.rollNo).includes(studentSearch)) : true)
  );

  const handleAddStudent = () => {
      if (!newStudent.name || !newStudent.className || !newStudent.rollNo) {
          alert("Please fill Name, Class, and Roll No.");
          return;
      }
      const exists = students.some(s => s.className === newStudent.className && String(s.rollNo) === String(newStudent.rollNo) && s.id !== newStudent.id);
      if (exists) {
          alert(`Roll No ${newStudent.rollNo} already exists in ${newStudent.className}`);
          return;
      }

      const studentData: T.Student = {
          ...newStudent as T.Student,
          id: newStudent.id || Date.now().toString(),
          attendance: newStudent.attendance || { totalDays: 0, presentDays: 0 },
          remarks: newStudent.remarks || ''
      };

      if (newStudent.id) {
          onSaveStudents(students.map(s => s.id === studentData.id ? studentData : s));
      } else {
          onSaveStudents([...students, studentData]);
      }
      setIsAddStudentOpen(false);
      setNewStudent({});
  };

  const deleteStudent = (id: string) => {
      if (confirm('Are you sure you want to delete this student? All marks will be lost.')) {
          onSaveStudents(students.filter(s => s.id !== id));
      }
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
          const text = evt.target?.result as string;
          const rows = text.split('\n').slice(1);
          const newStudents: T.Student[] = [];
          
          rows.forEach(row => {
              const cols = row.split(',').map(c => c.trim());
              if (cols.length < 3) return; 
              newStudents.push({
                  id: Date.now().toString() + Math.random(),
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
              });
          });
          
          if (newStudents.length > 0) {
              if (confirm(`Upload ${newStudents.length} students?`)) {
                  onSaveStudents([...students, ...newStudents]);
              }
          } else {
              alert("No valid data found in CSV.");
          }
      };
      reader.readAsText(file);
  };

  const downloadSampleCSV = () => {
      const headers = "SR No,Roll No,Name,Father Name,Mother Name,Class,Mobile,DOB,Address";
      const sampleRow = "2024001,101,Rohan Sharma,Amit Sharma,Priya Sharma,Class 10,9876543210,2008-05-20,Sector 4 Delhi";
      const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + sampleRow;
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "student_upload_sample.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };
  
  const handleSaveSubject = () => {
      if (!newSubject.name || !newSubject.className) return alert("Please fill Name and Class");
      const subject: T.Subject = {
          ...newSubject as T.Subject,
          id: newSubject.id || Date.now().toString(),
          maxMarksTheory: Number(newSubject.maxMarksTheory) || 0, // Ensure numeric
          maxMarksAssessment: Number(newSubject.maxMarksAssessment) || 0 // Ensure numeric, can be 0
      };
      const existsIdx = subjects.findIndex(s => s.id === subject.id);
      if (existsIdx >= 0) {
          const updated = [...subjects];
          updated[existsIdx] = subject;
          onSaveSubjects(updated);
      } else {
          onSaveSubjects([...subjects, subject]);
      }
      setIsSubjectModalOpen(false);
      setNewSubject({});
  };
  
  const saveTeacher = () => {
      if (!currentTeacher.name) return alert("Please enter a teacher name");
      
      const teacherToSave: T.Teacher = {
          id: currentTeacher.id || Date.now().toString(),
          name: currentTeacher.name,
          password: currentTeacher.password || 'password123',
          assignedClasses: currentTeacher.assignedClasses || []
      };

      if (currentTeacher.id) {
          onSaveTeachers(teachers.map(t => t.id === teacherToSave.id ? teacherToSave : t));
      } else {
          onSaveTeachers([...teachers, teacherToSave]);
      }
      setIsTeacherModalOpen(false);
      setCurrentTeacher({ assignedClasses: [] });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
              const canvas = document.createElement('canvas');
              let width = img.width;
              let height = img.height;
              const MAX_SIZE = 150; 

              if (width > height) {
                  if (width > MAX_SIZE) {
                      height *= MAX_SIZE / width;
                      width = MAX_SIZE;
                  }
              } else {
                  if (height > MAX_SIZE) {
                      width *= MAX_SIZE / height;
                      height = MAX_SIZE;
                  }
              }

              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                  ctx.drawImage(img, 0, 0, width, height);
                  const dataUrl = canvas.toDataURL('image/png');
                  if (dataUrl.length > 50000) {
                      const jpgUrl = canvas.toDataURL('image/jpeg', 0.8);
                      if (jpgUrl.length > 50000) {
                          alert("Logo is too complex to store. Please use a simpler image.");
                      } else {
                          onSaveConfig({...config, logoUrl: jpgUrl});
                      }
                  } else {
                      onSaveConfig({...config, logoUrl: dataUrl});
                  }
              }
          };
          img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
  };
  
  const handleTemplateEdit = (field: string, value: any) => {
     const currentId = config.activeTemplate || 1;
     const currentPrefs = config.templatePreferences?.[currentId] || DEFAULT_THEMES[currentId] || DEFAULT_THEMES[1];
     const newPrefs = { ...currentPrefs, [field]: value };
     
     onSaveConfig({
         ...config,
         templatePreferences: {
             ...config.templatePreferences,
             [currentId]: newPrefs
         }
     });
  };
  
  const currentTemplateId = config.activeTemplate || 1;
  const activeTheme = { ...DEFAULT_THEMES[currentTemplateId], ...(config.templatePreferences?.[currentTemplateId] || {}) };

  return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
           {showTemplatePreview && (
               <div className="fixed inset-0 z-[60] bg-black bg-opacity-80 flex items-center justify-center p-4 overflow-auto">
                   <div className="bg-white rounded-lg w-full max-w-4xl h-[90vh] flex flex-col relative">
                       <div className="p-4 border-b flex justify-between items-center bg-gray-100 sticky top-0 z-10">
                           <h2 className="font-bold text-lg">Previewing Template {currentTemplateId}</h2>
                           <button onClick={() => setShowTemplatePreview(false)} className="text-red-500 hover:bg-red-50 p-2 rounded"><X className="size-6"/></button>
                       </div>
                       <div className="overflow-auto p-4 flex-grow bg-gray-200">
                           <div className="mx-auto max-w-[210mm] shadow-lg origin-top scale-90 sm:scale-100">
                               <ReportCard student={DUMMY_STUDENT} subjects={DUMMY_SUBJECTS} marks={DUMMY_MARKS} config={config} template={currentTemplateId} />
                           </div>
                       </div>
                   </div>
               </div>
           )}

           {showMeritPrint && (
               <div className="fixed inset-0 z-[70] bg-white overflow-auto">
                   <div className="no-print p-4 bg-gray-800 text-white flex justify-between sticky top-0">
                       <h2 className="font-bold">Merit List Preview</h2>
                       <div className="flex gap-2">
                           <button onClick={() => window.print()} className="bg-green-600 px-4 py-1 rounded">Print</button>
                           <button onClick={() => setShowMeritPrint(false)} className="bg-red-600 px-4 py-1 rounded">Close</button>
                       </div>
                   </div>
                   <div className="p-8 max-w-4xl mx-auto print:p-0">
                       <div className="text-center mb-8">
                           <h1 className="text-2xl font-bold uppercase">{config.name}</h1>
                           <p>{config.address}</p>
                           <h2 className="text-xl font-bold mt-4 border-b-2 inline-block border-black">ANNUAL MERIT LIST {config.sessionYear}</h2>
                       </div>
                       {Object.keys(classStats).map(cls => (
                           <div key={cls} className="mb-8 break-inside-avoid">
                               <h3 className="font-bold text-lg bg-gray-100 p-2 border-b border-gray-300">{cls}</h3>
                               <table className="w-full text-sm border-collapse border border-gray-300">
                                   <thead>
                                       <tr className="bg-gray-50"><th className="border p-2 w-16">Rank</th><th className="border p-2 text-left">Student Name</th><th className="border p-2 w-24">Roll No</th><th className="border p-2 w-24 text-right">Percentage</th><th className="border p-2 w-24 text-right">Attendance</th></tr>
                                   </thead>
                                   <tbody>
                                       {classStats[cls].top3.map((s, idx) => (
                                           <tr key={s.id}><td className="border p-2 text-center font-bold">{idx + 1}</td><td className="border p-2">{s.name}</td><td className="border p-2 text-center">{s.rollNo}</td><td className="border p-2 text-right font-bold">{s.percentage.toFixed(2)}%</td><td className="border p-2 text-right">{s.attendancePct.toFixed(1)}%</td></tr>
                                       ))}
                                   </tbody>
                               </table>
                           </div>
                       ))}
                   </div>
               </div>
           )}

           {isAddStudentOpen && (
              <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                  <div className="bg-white p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                      <h2 className="text-xl font-bold mb-4">{newStudent.id ? 'Edit Student' : 'Add New Student'}</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div><label className="text-xs font-bold text-gray-500">Name *</label><input className="w-full border p-2 rounded" value={newStudent.name || ''} onChange={e => setNewStudent({...newStudent, name: e.target.value})} /></div>
                          <div><label className="text-xs font-bold text-gray-500">Roll No *</label><input className="w-full border p-2 rounded" value={newStudent.rollNo || ''} onChange={e => setNewStudent({...newStudent, rollNo: e.target.value})} /></div>
                          <div><label className="text-xs font-bold text-gray-500">Class *</label>
                              <select className="w-full border p-2 rounded" value={newStudent.className || ''} onChange={e => setNewStudent({...newStudent, className: e.target.value})}>
                                  <option value="">-- Select --</option>
                                  {AVAILABLE_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                          </div>
                          <div><label className="text-xs font-bold text-gray-500">Address</label><input className="w-full border p-2 rounded" value={newStudent.address || ''} onChange={e => setNewStudent({...newStudent, address: e.target.value})} /></div>
                          <div><label className="text-xs font-bold text-gray-500">Father's Name</label><input className="w-full border p-2 rounded" value={newStudent.fatherName || ''} onChange={e => setNewStudent({...newStudent, fatherName: e.target.value})} /></div>
                          <div><label className="text-xs font-bold text-gray-500">Mother's Name</label><input className="w-full border p-2 rounded" value={newStudent.motherName || ''} onChange={e => setNewStudent({...newStudent, motherName: e.target.value})} /></div>
                          <div><label className="text-xs font-bold text-gray-500">Mobile</label><input className="w-full border p-2 rounded" value={newStudent.mobile || ''} onChange={e => setNewStudent({...newStudent, mobile: e.target.value})} /></div>
                          <div><label className="text-xs font-bold text-gray-500">DOB</label><input type="date" className="w-full border p-2 rounded" value={newStudent.dob || ''} onChange={e => setNewStudent({...newStudent, dob: e.target.value})} /></div>
                      </div>
                      <div className="flex gap-2 mt-6 justify-end">
                          <button onClick={() => setIsAddStudentOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                          <button onClick={handleAddStudent} className="px-4 py-2 bg-indigo-600 text-white rounded font-bold hover:bg-indigo-700">Save Student</button>
                      </div>
                  </div>
              </div>
           )}

           {isTeacherModalOpen && (
              <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                  <div className="bg-white p-6 rounded-lg w-full max-w-md">
                      <h2 className="text-xl font-bold mb-4">{currentTeacher.id ? 'Edit Teacher' : 'Add Teacher'}</h2>
                      <div className="space-y-4">
                          <div><label className="block text-xs font-bold text-gray-500 mb-1">Name</label><input className="w-full border p-2 rounded" value={currentTeacher.name || ''} onChange={e => setCurrentTeacher({...currentTeacher, name: e.target.value})} /></div>
                          <div><label className="block text-xs font-bold text-gray-500 mb-1">Password</label><input className="w-full border p-2 rounded" value={currentTeacher.password || ''} onChange={e => setCurrentTeacher({...currentTeacher, password: e.target.value})} /></div>
                          <div>
                              <label className="block text-xs font-bold text-gray-500 mb-1">Assigned Classes (Hold Ctrl/Cmd to select multiple)</label>
                              <select multiple className="w-full border p-2 rounded h-40" value={currentTeacher.assignedClasses || []} onChange={e => {
                                  const selected = Array.from(e.target.selectedOptions, (option: any) => option.value);
                                  setCurrentTeacher({...currentTeacher, assignedClasses: selected});
                              }}>
                                  {AVAILABLE_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                          </div>
                      </div>
                      <div className="flex gap-2 mt-6 justify-end">
                          <button onClick={() => setIsTeacherModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                          <button onClick={saveTeacher} className="px-4 py-2 bg-indigo-600 text-white rounded font-bold hover:bg-indigo-700">Save Teacher</button>
                      </div>
                  </div>
              </div>
           )}

           {isSubjectModalOpen && (
               <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
                <div className="bg-white p-6 rounded-lg w-full max-w-lg">
                    <h2 className="text-xl font-bold mb-4">Add/Edit Subject</h2>
                    <div className="space-y-3">
                        <input className="w-full border p-2 rounded" placeholder="Subject Name" value={newSubject.name || ''} onChange={e=>setNewSubject({...newSubject, name: e.target.value})} />
                        <select className="w-full border p-2 rounded" value={newSubject.className || ''} onChange={e=>setNewSubject({...newSubject, className: e.target.value})}>
                            <option value="">-- Select Class --</option>
                            {AVAILABLE_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <div className="grid grid-cols-2 gap-2">
                            <div><label className="text-xs">Max Theory</label><input type="number" className="w-full border p-2 rounded" value={newSubject.maxMarksTheory || ''} onChange={e=>setNewSubject({...newSubject, maxMarksTheory: Number(e.target.value)})} /></div>
                            <div><label className="text-xs">Max IA</label><input type="number" className="w-full border p-2 rounded" value={newSubject.maxMarksAssessment || ''} onChange={e=>setNewSubject({...newSubject, maxMarksAssessment: Number(e.target.value)})} /></div>
                        </div>
                    </div>
                    <div className="flex gap-2 mt-4 justify-end">
                        <button onClick={()=>setIsSubjectModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                        <button onClick={handleSaveSubject} className="px-4 py-2 bg-indigo-600 text-white rounded font-bold hover:bg-indigo-700">Save</button>
                    </div>
                </div>
            </div>
           )}

           <header className="bg-white shadow p-4 flex justify-between items-center z-10 shrink-0">
               <div><h2 className="text-xl font-bold text-gray-800">Admin Dashboard</h2><p className="text-xs text-gray-500">Manage school data</p></div>
               <div className="flex gap-2">
                   <button onClick={() => setActiveTab('STUDENTS')} className={`px-4 py-2 rounded font-bold text-sm ${activeTab==='STUDENTS' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}>Students</button>
                   <button onClick={() => setActiveTab('TEACHERS')} className={`px-4 py-2 rounded font-bold text-sm ${activeTab==='TEACHERS' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}>Teachers</button>
                   <button onClick={() => setActiveTab('SUBJECTS')} className={`px-4 py-2 rounded font-bold text-sm ${activeTab==='SUBJECTS' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}>Subjects</button>
                   <button onClick={() => setActiveTab('SETTINGS')} className={`px-4 py-2 rounded font-bold text-sm ${activeTab==='SETTINGS' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}>Settings</button>
                   <button onClick={onLogout} className="text-red-600 border border-red-200 px-4 py-2 rounded hover:bg-red-50 text-sm font-bold ml-2">Logout</button>
               </div>
           </header>
           
           <div className="flex-grow p-6 overflow-hidden flex flex-col">
               {activeTab === 'STUDENTS' && (
                   <div className="flex flex-col h-full">
                       <div className="flex justify-between items-center mb-4 gap-4 flex-wrap">
                           <div className="flex gap-2 items-center flex-grow">
                               <input type="text" placeholder="Search by Name or Roll..." className="border p-2 rounded w-full max-w-sm" value={studentSearch} onChange={e => setStudentSearch(e.target.value)} />
                               <select className="border p-2 rounded" value={studentFilterClass} onChange={e => setStudentFilterClass(e.target.value)}>
                                   <option value="">All Classes</option>
                                   {AVAILABLE_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                               </select>
                           </div>
                           <div className="flex gap-2">
                               <button onClick={() => setShowMeritPrint(true)} className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded shadow flex items-center"><Trophy className="mr-2 size-4"/> Merit List</button>
                               <button onClick={() => document.getElementById('csvInput')?.click()} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow flex items-center"><Upload className="mr-2 size-4"/> Upload CSV</button>
                               <input type="file" id="csvInput" accept=".csv" className="hidden" onChange={handleCSVUpload} />
                               <button onClick={downloadSampleCSV} className="text-xs text-blue-600 underline px-2">Sample CSV</button>
                               <button onClick={() => {setNewStudent({}); setIsAddStudentOpen(true)}} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded shadow flex items-center"><Plus className="mr-2 size-4"/> Add Student</button>
                           </div>
                       </div>
                       
                       {overallTopper && (
                           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                               <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 p-4 rounded-lg text-white shadow">
                                   <div className="flex items-center gap-4">
                                       <div className="bg-white/20 p-3 rounded-full"><Trophy className="size-8"/></div>
                                       <div>
                                           <div className="text-xs uppercase font-bold opacity-75">School Topper</div>
                                           <div className="text-xl font-bold">{overallTopper.name}</div>
                                           <div className="text-sm">{overallTopper.className} | {overallTopper.percentage.toFixed(2)}%</div>
                                       </div>
                                   </div>
                               </div>
                               <div className="bg-gradient-to-r from-blue-400 to-blue-500 p-4 rounded-lg text-white shadow">
                                   <div className="flex items-center gap-4">
                                       <div className="bg-white/20 p-3 rounded-full"><Users className="size-8"/></div>
                                       <div>
                                           <div className="text-xs uppercase font-bold opacity-75">Total Students</div>
                                           <div className="text-xl font-bold">{students.length}</div>
                                           <div className="text-sm">Across {Object.keys(classStats).length} Classes</div>
                                       </div>
                                   </div>
                               </div>
                               <div className="bg-gradient-to-r from-green-400 to-green-500 p-4 rounded-lg text-white shadow">
                                   <div className="flex items-center gap-4">
                                       <div className="bg-white/20 p-3 rounded-full"><CalendarCheck className="size-8"/></div>
                                       <div>
                                           <div className="text-xs uppercase font-bold opacity-75">Best Attendance</div>
                                           {overallAttendance ? (
                                               <>
                                                  <div className="text-xl font-bold">{overallAttendance.name}</div>
                                                  <div className="text-sm">{overallAttendance.className} | {overallAttendance.attendancePct.toFixed(1)}%</div>
                                               </>
                                           ) : <div className="text-sm">No data</div>}
                                       </div>
                                   </div>
                               </div>
                           </div>
                       )}

                       <div className="bg-white rounded-lg shadow overflow-hidden flex-grow overflow-y-auto border border-gray-200">
                           <table className="w-full text-sm text-left">
                               <thead className="bg-gray-100 font-bold text-gray-700 sticky top-0">
                                   <tr>
                                       <th className="p-3 border-b">Roll No</th>
                                       <th className="p-3 border-b">Name</th>
                                       <th className="p-3 border-b">Class</th>
                                       <th className="p-3 border-b">Contact</th>
                                       <th className="p-3 border-b text-right">Actions</th>
                                   </tr>
                               </thead>
                               <tbody>
                                   {filteredStudents.map(s => (
                                       <tr key={s.id} className="border-b hover:bg-gray-50">
                                           <td className="p-3 font-mono text-gray-500">{s.rollNo}</td>
                                           <td className="p-3 font-bold text-gray-800">{s.name}</td>
                                           <td className="p-3"><span className="bg-gray-100 border px-2 py-1 rounded text-xs font-bold text-gray-600">{s.className}</span></td>
                                           <td className="p-3 text-gray-600">{s.mobile}</td>
                                           <td className="p-3 text-right flex justify-end gap-2">
                                               <button onClick={() => {setNewStudent(s); setIsAddStudentOpen(true)}} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition"><Edit className="size-4"/></button>
                                               <button onClick={() => deleteStudent(s.id)} className="p-1.5 text-red-600 hover:bg-red-100 rounded transition"><Trash2 className="size-4"/></button>
                                           </td>
                                       </tr>
                                   ))}
                                   {filteredStudents.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-500">No students found.</td></tr>}
                               </tbody>
                           </table>
                       </div>
                   </div>
               )}

               {activeTab === 'TEACHERS' && (
                   <div className="flex-col h-full flex">
                       <div className="flex justify-between items-center mb-4">
                           <h3 className="font-bold text-lg">Staff Management</h3>
                           <button onClick={() => {setCurrentTeacher({}); setIsTeacherModalOpen(true)}} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded shadow flex items-center"><Plus className="mr-2 size-4"/> Add Teacher</button>
                       </div>
                       <div className="bg-white rounded-lg shadow overflow-hidden overflow-y-auto border border-gray-200">
                           <table className="w-full text-sm text-left">
                               <thead className="bg-gray-100 font-bold text-gray-700 sticky top-0">
                                   <tr>
                                       <th className="p-3 border-b">Name</th>
                                       <th className="p-3 border-b">Password</th>
                                       <th className="p-3 border-b">Assigned Classes</th>
                                       <th className="p-3 border-b text-right">Actions</th>
                                   </tr>
                               </thead>
                               <tbody>
                                   {teachers.map(t => (
                                       <tr key={t.id} className="border-b hover:bg-gray-50">
                                           <td className="p-3 font-bold">{t.name}</td>
                                           <td className="p-3 font-mono text-gray-500">••••••</td>
                                           <td className="p-3">
                                               <div className="flex flex-wrap gap-1">
                                                   {t.assignedClasses.map(c => <span key={c} className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-xs border border-indigo-100">{c}</span>)}
                                               </div>
                                           </td>
                                           <td className="p-3 text-right flex justify-end gap-2">
                                               <button onClick={() => {setCurrentTeacher(t); setIsTeacherModalOpen(true)}} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition"><Edit className="size-4"/></button>
                                               <button onClick={() => {if(confirm('Delete teacher?')) onSaveTeachers(teachers.filter(x => x.id !== t.id))}} className="p-1.5 text-red-600 hover:bg-red-100 rounded transition"><Trash2 className="size-4"/></button>
                                           </td>
                                       </tr>
                                   ))}
                               </tbody>
                           </table>
                       </div>
                   </div>
               )}

               {activeTab === 'SUBJECTS' && (
                   <div className="flex-col flex h-full">
                       <div className="flex justify-between items-center mb-4">
                           <h3 className="font-bold text-lg">Subject Database</h3>
                           <button onClick={() => {setNewSubject({}); setIsSubjectModalOpen(true)}} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded shadow flex items-center"><Plus className="mr-2 size-4"/> Add Subject</button>
                       </div>
                       <div className="bg-white rounded-lg shadow overflow-hidden overflow-y-auto border border-gray-200">
                           <table className="w-full text-sm text-left">
                               <thead className="bg-gray-100 font-bold text-gray-700 sticky top-0">
                                   <tr>
                                       <th className="p-3 border-b">Subject</th>
                                       <th className="p-3 border-b">Class</th>
                                       <th className="p-3 border-b">Max Theory</th>
                                       <th className="p-3 border-b">Max IA</th>
                                       <th className="p-3 border-b text-right">Actions</th>
                                   </tr>
                               </thead>
                               <tbody>
                                   {subjects.map(s => (
                                       <tr key={s.id} className="border-b hover:bg-gray-50">
                                           <td className="p-3 font-bold">{s.name}</td>
                                           <td className="p-3"><span className="bg-gray-100 border px-2 py-1 rounded text-xs font-bold text-gray-600">{s.className}</span></td>
                                           <td className="p-3 text-gray-500">{s.maxMarksTheory}</td>
                                           <td className="p-3 text-gray-500">{s.maxMarksAssessment}</td>
                                           <td className="p-3 text-right flex justify-end gap-2">
                                               <button onClick={() => {setNewSubject(s); setIsSubjectModalOpen(true)}} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition"><Edit className="size-4"/></button>
                                               <button onClick={() => {if(confirm('Delete subject?')) onSaveSubjects(subjects.filter(x => x.id !== s.id))}} className="p-1.5 text-red-600 hover:bg-red-100 rounded transition"><Trash2 className="size-4"/></button>
                                           </td>
                                       </tr>
                                   ))}
                               </tbody>
                           </table>
                       </div>
                   </div>
               )}

               {activeTab === 'SETTINGS' && (
                   <div className="overflow-y-auto">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                               <h3 className="font-bold text-lg mb-4 flex items-center"><Settings className="mr-2 size-5"/> General Configuration</h3>
                               <div className="space-y-4">
                                   <div><label className="text-xs font-bold text-gray-500">School Name</label><input className="w-full border p-2 rounded" value={config.name} onChange={e => onSaveConfig({...config, name: e.target.value})} /></div>
                                   <div><label className="text-xs font-bold text-gray-500">Address</label><input className="w-full border p-2 rounded" value={config.address} onChange={e => onSaveConfig({...config, address: e.target.value})} /></div>
                                   <div><label className="text-xs font-bold text-gray-500">Session Year</label><input className="w-full border p-2 rounded" value={config.sessionYear || ''} onChange={e => onSaveConfig({...config, sessionYear: e.target.value})} /></div>
                                   
                                   <div>
                                       <label className="text-xs font-bold text-gray-500">School Logo</label>
                                       <div className="flex items-center gap-4 mt-2 p-2 border border-dashed border-gray-300 rounded bg-gray-50">
                                           {config.logoUrl ? (
                                               <div className="relative group shrink-0">
                                                   <img src={config.logoUrl} alt="Logo" className="h-16 w-16 object-contain bg-white rounded shadow-sm border" />
                                                   <button onClick={() => onSaveConfig({...config, logoUrl: ''})} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow hover:bg-red-600" title="Remove"><X className="size-3"/></button>
                                               </div>
                                           ) : (
                                               <div className="h-16 w-16 bg-gray-200 rounded flex items-center justify-center text-gray-400 shrink-0"><ImageIcon className="size-8"/></div>
                                           )}
                                           <div className="flex-grow">
                                                <div className="flex gap-2 mb-2">
                                                    <label className="cursor-pointer bg-indigo-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-indigo-700 flex items-center shadow-sm">
                                                        <Upload className="mr-2 size-3"/> Upload Image
                                                        <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                                                    </label>
                                                </div>
                                                <p className="text-[10px] text-gray-500 mb-1">Max 150x150px (Auto-resized). Stored internally.</p>
                                                <input className="w-full border p-1 rounded text-[10px]" value={config.logoUrl} onChange={e => onSaveConfig({...config, logoUrl: e.target.value})} placeholder="Or paste URL here..." />
                                           </div>
                                       </div>
                                   </div>

                                   <div className="flex items-center gap-2 pt-2">
                                       <input type="checkbox" className="size-5 text-indigo-600 rounded" checked={config.isResultsPublished} onChange={e => onSaveConfig({...config, isResultsPublished: e.target.checked})} />
                                       <label className="text-sm font-bold text-gray-700">Publish Results (Students can view)</label>
                                   </div>
                               </div>
                           </div>

                           <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                               <h3 className="font-bold text-lg mb-4 flex items-center"><Palette className="mr-2 size-5"/> Template Customization</h3>
                               <div className="space-y-4">
                                   <div>
                                       <label className="text-xs font-bold text-gray-500">Active Template</label>
                                       <div className="flex items-center gap-2 mt-1">
                                           <select className="w-full border p-2 rounded" value={config.activeTemplate || 1} onChange={e => onSaveConfig({...config, activeTemplate: Number(e.target.value)})}>
                                               {[1,2,3,4,5,6].map(i => <option key={i} value={i}>Template {i}</option>)}
                                           </select>
                                           <button onClick={() => setShowTemplatePreview(true)} className="bg-gray-200 p-2 rounded hover:bg-gray-300" title="Preview"><Eye className="size-5"/></button>
                                       </div>
                                   </div>
                                   <div className="grid grid-cols-2 gap-4">
                                       <div><label className="text-xs font-bold text-gray-500">Primary Color</label><input type="color" className="w-full h-10 rounded cursor-pointer" value={activeTheme.primaryColor} onChange={e => handleTemplateEdit('primaryColor', e.target.value)} /></div>
                                       <div><label className="text-xs font-bold text-gray-500">Secondary Color</label><input type="color" className="w-full h-10 rounded cursor-pointer" value={activeTheme.secondaryColor} onChange={e => handleTemplateEdit('secondaryColor', e.target.value)} /></div>
                                   </div>
                                   <div>
                                        <label className="text-xs font-bold text-gray-500">Font Family</label>
                                        <select className="w-full border p-2 rounded" value={activeTheme.fontFamily} onChange={e => handleTemplateEdit('fontFamily', e.target.value)}>
                                            <option value="sans">Sans-Serif</option>
                                            <option value="serif">Serif</option>
                                            <option value="mono">Monospace</option>
                                        </select>
                                   </div>
                                   
                                   <div className="pt-2 border-t mt-2">
                                        <div className="flex items-center">
                                            <input type="checkbox" id="wm" className="size-4 text-indigo-600 focus:ring-indigo-500" checked={activeTheme.showWatermark || false} onChange={e => handleTemplateEdit('showWatermark', e.target.checked)} />
                                            <label htmlFor="wm" className="ml-2 text-sm font-bold text-gray-700">Show Background Watermark</label>
                                        </div>
                                   </div>

                                   {config.activeTemplate === 6 && (
                                       <>
                                        <div className="pt-2 mt-2 border-t">
                                            <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Custom Builder Options</h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-xs font-bold text-gray-500">Header Style</label>
                                                    <select className="w-full border p-2 rounded" value={activeTheme.headerStyle || 'standard'} onChange={e => handleTemplateEdit('headerStyle', e.target.value)}>
                                                        <option value="standard">Standard</option>
                                                        <option value="modern">Modern</option>
                                                        <option value="minimal">Minimal</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-gray-500">Table Style</label>
                                                    <select className="w-full border p-2 rounded" value={activeTheme.tableStyle || 'grid'} onChange={e => handleTemplateEdit('tableStyle', e.target.value)}>
                                                        <option value="grid">Grid</option>
                                                        <option value="striped">Striped</option>
                                                        <option value="clean">Clean</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                       </>
                                   )}
                               </div>
                           </div>
                       </div>
                   </div>
               )}
           </div>
      </div>
  );
};


// 5. MAIN APP COMPONENT (ROUTER & STATE MANAGER)
const App: React.FC = () => {
  const [view, setView] = useState<T.ViewState>('HOME');
  const [data, setData] = useState<{students: T.Student[], teachers: T.Teacher[], subjects: T.Subject[], marks: T.MarkRecord[], config: T.SchoolConfig} | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState<T.Teacher | 'ADMIN' | null>(null);
  
  // Home Search State
  const [searchRoll, setSearchRoll] = useState('');
  const [searchClass, setSearchClass] = useState('');
  const [searchResult, setSearchResult] = useState<T.Student | null>(null);
  const [searchError, setSearchError] = useState('');
  
  // Save queue status
  const [saveStatus, setSaveStatus] = useState<'IDLE' | 'SAVING' | 'SUCCESS' | 'ERROR'>('IDLE');

  // Admin Login State
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [loginError, setLoginError] = useState('');

  const fetchData = async () => {
      setLoading(true);
      try {
          const db = await storage.fetchAllData();
          setData(db);
          setError('');
      } catch (e: any) {
          setError(e.message || "Failed to load data");
      } finally {
          setLoading(false);
      }
  };

  // --- CHANGED HERE ---
  // Removed the explicit setTimeout safeguard as requested. 
  // We rely on the storage service's internal timeout or successful response.
  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async (collection: string, newData: any[]) => {
      if (!data) return;
      setSaveStatus('SAVING');
      
      // Optimistic Update
      setData(prev => {
          if (!prev) return null;
          if (collection === 'Students') return { ...prev, students: newData };
          if (collection === 'Teachers') return { ...prev, teachers: newData };
          if (collection === 'Subjects') return { ...prev, subjects: newData };
          if (collection === 'Marks') return { ...prev, marks: newData };
          if (collection === 'Config') return { ...prev, config: newData[0] };
          return prev;
      });

      try {
          await storage.updateCollection(collection, newData);
          setSaveStatus('SUCCESS');
          setTimeout(() => setSaveStatus('IDLE'), 2000);
      } catch (e) {
          console.error("Save failed:", e);
          setSaveStatus('ERROR');
      }
  };

  // Login Handlers
  const handleTeacherLogin = async (name: string, pass: string) => {
      const teacher = data?.teachers.find(t => t.name === name);
      
      // FIX: Robust password check handling Numbers vs Strings and whitespace
      if (teacher) {
          const storedPass = String(teacher.password).trim();
          const inputPass = String(pass).trim();
          
          if (storedPass === inputPass) {
              setCurrentUser(teacher);
              setView('TEACHER_DASHBOARD');
              return true;
          }
      }
      return false;
  };

  const handleAdminLogin = async (user: string, pass: string) => {
      if (data?.config) {
          const storedUser = String(data.config.adminUsername || 'admin').trim();
          const storedPass = String(data.config.adminPassword || 'password').trim();
          const inputUser = String(user).trim();
          const inputPass = String(pass).trim();
          
          if (inputUser === storedUser && inputPass === storedPass) {
              setCurrentUser('ADMIN');
              setView('ADMIN_DASHBOARD');
              return true;
          }
      }
      return false;
  };

  const handleStudentSearch = (e: React.FormEvent) => {
      e.preventDefault();
      if(!data) return;
      
      const rollInput = searchRoll.trim().toLowerCase();
      const classInput = searchClass;
      
      const found = data.students.find(s => 
          String(s.rollNo).trim().toLowerCase() === rollInput && 
          s.className === classInput
      );

      if (found) {
          setSearchResult(found);
          setSearchError('');
      } else {
          setSearchResult(null);
          setSearchError('Student not found. Please check Class and Roll No.');
      }
  };

  if (loading) return <div className="h-screen flex flex-col justify-center items-center bg-gray-50"><div className="loader-text font-bold text-xl text-indigo-600 mb-2">Connecting to School Server...</div><p className="text-sm text-gray-500">Please wait</p></div>;
  if (error) return <div className="h-screen flex flex-col justify-center items-center text-red-600 p-4 text-center"><AlertCircle className="size-12 mb-4"/><p className="font-bold">{error}</p><button onClick={() => window.location.reload()} className="mt-4 bg-gray-800 text-white px-6 py-2 rounded">Retry</button></div>;
  if (!data) return null;

  return (
      <>
          <SaveIndicator status={saveStatus} />
          
          {view === 'HOME' && (
              <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col relative overflow-hidden">
                  {/* Background Blobs */}
                  <div className="blob blob-1"></div>
                  <div className="blob blob-2"></div>
                  
                  {/* Navbar */}
                  <nav className="relative z-20 flex justify-between items-center p-6 px-8 bg-white/40 backdrop-blur-sm border-b border-white/20">
                      <div className="flex items-center gap-3">
                          {data.config.logoUrl ? <img src={data.config.logoUrl} alt="Logo" className="h-10 w-10 object-contain rounded-full bg-white p-1 shadow-sm" crossOrigin="anonymous"/> : <School className="size-8 text-indigo-600" />}
                          <span className="font-bold text-indigo-900 hidden sm:block">{data.config.name}</span>
                      </div>
                      <div className="flex gap-4 items-center">
                          <button onClick={() => setView('TEACHER_LOGIN')} className="text-sm font-semibold text-gray-600 hover:text-indigo-600 transition flex items-center"><BookOpen className="size-4 mr-1.5"/> Teacher Panel</button>
                          <div className="h-4 w-px bg-gray-300"></div>
                          <button onClick={() => setView('ADMIN_LOGIN')} className="text-sm font-semibold text-gray-600 hover:text-indigo-600 transition flex items-center"><Settings className="size-4 mr-1.5"/> Admin</button>
                      </div>
                  </nav>

                  {/* Main Content */}
                  <div className="flex-grow flex items-center justify-center p-4 relative z-10">
                      {searchResult ? (
                          <div className="w-full max-w-4xl animate-fade-in-up">
                              <button onClick={() => setSearchResult(null)} className="mb-4 bg-white text-gray-700 px-4 py-2 rounded-full shadow hover:bg-gray-50 flex items-center font-bold text-sm transition"><ArrowLeft className="mr-2 size-4"/> Back to Search</button>
                              <ReportCard student={searchResult} subjects={data.subjects.filter(s => s.className === searchResult.className)} marks={data.marks} config={data.config} template={data.config.activeTemplate || 1} />
                          </div>
                      ) : (
                          <div className="w-full max-w-md">
                              <div className="bg-white/90 backdrop-blur-md p-8 rounded-2xl shadow-2xl border border-white/50 text-center relative overflow-hidden group">
                                  <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
                                  
                                  <div className="mb-6 inline-flex p-4 rounded-full bg-indigo-50 text-indigo-600 shadow-inner">
                                      <GraduationCap className="size-10" />
                                  </div>
                                  
                                  <h1 className="text-3xl font-extrabold text-gray-800 mb-2">Check Result</h1>
                                  <p className="text-gray-500 mb-8 text-sm">Enter your class and roll number to view your report card.</p>

                                  {searchError && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4 flex items-center text-left border border-red-100"><AlertCircle className="size-4 mr-2 flex-shrink-0"/>{searchError}</div>}

                                  <form onSubmit={handleStudentSearch} className="space-y-4 text-left">
                                      <div>
                                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Select Class</label>
                                          <div className="relative">
                                              <select className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent block p-3 appearance-none outline-none transition font-medium shadow-sm" value={searchClass} onChange={e => setSearchClass(e.target.value)} required>
                                                  <option value="">-- Choose Class --</option>
                                                  {AVAILABLE_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                                              </select>
                                              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500"><ChevronRight className="size-4 rotate-90"/></div>
                                          </div>
                                      </div>
                                      
                                      <div>
                                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Roll Number</label>
                                          <input type="text" className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent block p-3 outline-none transition font-medium shadow-sm placeholder:font-normal" placeholder="e.g. 101" value={searchRoll} onChange={e => setSearchRoll(e.target.value)} required />
                                      </div>

                                      <button type="submit" className="w-full text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-300 font-bold rounded-lg text-sm px-5 py-3.5 text-center flex items-center justify-center transition shadow-lg shadow-indigo-200 mt-2">
                                          <Search className="mr-2 size-5" /> View Report Card
                                      </button>
                                  </form>
                              </div>
                              <div className="mt-8 text-center text-gray-400 text-xs font-medium">
                                  System Powered by {data.config.developerName} &copy; {new Date().getFullYear()}
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          )}

          {view === 'ADMIN_LOGIN' && (
             <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
                 <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md border border-gray-100 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
                    <div className="text-center mb-6">
                        <div className="bg-red-100 p-3 rounded-full inline-block mb-2"><Settings className="size-8 text-red-600"/></div>
                        <h2 className="text-2xl font-bold text-gray-900">Admin Access</h2>
                        <p className="text-gray-500">Authorized personnel only</p>
                    </div>
                    
                    {loginError && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm flex items-center"><AlertCircle className="size-4 mr-2"/>{loginError}</div>}
                    
                    <form onSubmit={async (e) => {
                        e.preventDefault();
                        const success = await handleAdminLogin(adminUser, adminPass);
                        if(!success) setLoginError('Invalid credentials');
                    }} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Username</label>
                            <input 
                                type="text" 
                                className="w-full border p-3 rounded-lg bg-gray-50 focus:ring-2 focus:ring-red-500 outline-none transition" 
                                value={adminUser} 
                                onChange={e => setAdminUser(e.target.value)}
                                placeholder="Enter username"
                                required 
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Password</label>
                            <input 
                                type="password" 
                                className="w-full border p-3 rounded-lg bg-gray-50 focus:ring-2 focus:ring-red-500 outline-none transition" 
                                value={adminPass} 
                                onChange={e => setAdminPass(e.target.value)}
                                placeholder="Enter password"
                                required 
                            />
                        </div>
                        <button type="submit" className="w-full bg-gray-900 text-white py-3 rounded-lg font-bold hover:bg-black transition shadow-md flex justify-center items-center">
                            <Lock className="size-4 mr-2" /> Secure Login
                        </button>
                        <button type="button" onClick={() => setView('HOME')} className="w-full text-gray-400 text-sm hover:text-gray-600 mt-2">Back to Home</button>
                    </form>
                </div>
             </div>
          )}

          {view === 'TEACHER_LOGIN' && (
              <TeacherLoginView teachers={data.teachers} onLogin={handleTeacherLogin} onBack={() => setView('HOME')} />
          )}

          {view === 'ADMIN_DASHBOARD' && currentUser === 'ADMIN' && (
              <AdminDashboard 
                 config={data.config} 
                 students={data.students} 
                 teachers={data.teachers} 
                 subjects={data.subjects} 
                 marks={data.marks}
                 onSaveConfig={(c) => handleSave('Config', [c])}
                 onSaveStudents={(s) => handleSave('Students', s)}
                 onSaveTeachers={(t) => handleSave('Teachers', t)}
                 onSaveSubjects={(s) => handleSave('Subjects', s)}
                 onLogout={() => { setCurrentUser(null); setView('HOME'); }}
              />
          )}

          {view === 'TEACHER_DASHBOARD' && currentUser !== 'ADMIN' && currentUser && (
              <TeacherDashboard 
                  teacher={currentUser}
                  students={data.students}
                  subjects={data.subjects}
                  marks={data.marks}
                  config={data.config}
                  onSaveStudents={(s) => handleSave('Students', s)}
                  onSaveSubjects={(s) => handleSave('Subjects', s)}
                  onSaveMarks={(m) => handleSave('Marks', m)}
                  onSaveConfig={(c) => handleSave('Config', [c])}
                  onLogout={() => { setCurrentUser(null); setView('HOME'); }}
                  onRefresh={() => fetchData()}
              />
          )}
      </>
  );
};

export default App;