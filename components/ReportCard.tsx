import React, { useRef, useState } from 'react';
import { Student, MarkRecord, Subject, SchoolConfig, TemplateOptions } from '../types';
import { Quote, GraduationCap, Download, Loader } from 'lucide-react';
import html2canvas from 'html2canvas';

interface ReportCardProps {
  student: Student;
  subjects: Subject[];
  marks: MarkRecord[];
  config: SchoolConfig;
  template: number;
  orientation?: 'portrait' | 'landscape';
}

export const DEFAULT_THEMES: Record<number, TemplateOptions> = {
  1: { primaryColor: '#1f2937', secondaryColor: '#4b5563', fontFamily: 'serif', showWatermark: false }, // Classic
  2: { primaryColor: '#4338ca', secondaryColor: '#3730a3', fontFamily: 'sans', showWatermark: false }, // Modern
  3: { primaryColor: '#111827', secondaryColor: '#d1d5db', fontFamily: 'sans', showWatermark: false }, // Professional
  4: { primaryColor: '#7c2d12', secondaryColor: '#fed7aa', fontFamily: 'serif', showWatermark: false }, // Elegant
  5: { primaryColor: '#1e3a8a', secondaryColor: '#2563eb', fontFamily: 'sans', showWatermark: false }, // Corporate
  6: { 
    primaryColor: '#000000', 
    secondaryColor: '#666666', 
    fontFamily: 'sans',
    headerStyle: 'standard',
    tableStyle: 'grid',
    borderStyle: 'classic',
    showWatermark: false
  }, // Custom Builder
};

const formatDOB = (dob?: string) => {
  if (!dob) return '';
  const datePart = dob.split('T')[0];
  const parts = datePart.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return datePart;
};

export const ReportCard: React.FC<ReportCardProps> = ({ student, subjects, marks, config, template, orientation = 'portrait' }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const studentMarks = marks.filter(m => m.studentId === student.id);
  
  const baseTheme = DEFAULT_THEMES[template] || DEFAULT_THEMES[1];
  const userPrefs = config.templatePreferences?.[template] || {};
  const theme = { ...baseTheme, ...userPrefs };

  const processedSubjects = subjects.map(sub => {
    const half = studentMarks.find(m => m.subjectId === sub.id && m.examType === 'HalfYearly');
    const annual = studentMarks.find(m => m.subjectId === sub.id && m.examType === 'Annual');
    
    const halfTheory = half?.theory || 0;
    const halfAssess = half?.assessment || 0;
    const halfTotal = halfTheory + halfAssess;

    const annualTheory = annual?.theory || 0;
    const annualAssess = annual?.assessment || 0;
    const annualTotal = annualTheory + annualAssess;

    const grandTotal = halfTotal + annualTotal;
    const maxTotal = (sub.maxMarksTheory + sub.maxMarksAssessment) * 2; 

    return {
      name: sub.name,
      half: { theory: halfTheory, assessment: halfAssess, total: halfTotal },
      annual: { theory: annualTheory, assessment: annualAssess, total: annualTotal },
      grandTotal,
      maxTotal,
      grade: calculateGrade((grandTotal / maxTotal) * 100),
      percentage: maxTotal > 0 ? (grandTotal / maxTotal) * 100 : 0
    };
  });

  const totalObtained = processedSubjects.reduce((acc, curr) => acc + curr.grandTotal, 0);
  const totalMax = processedSubjects.reduce((acc, curr) => acc + curr.maxTotal, 0);
  const percentage = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(2) : "0";
  const overallGrade = calculateGrade(parseFloat(percentage));
  const remarks = student.remarks || "Promoted to next class.";
  
  const currentYear = new Date().getFullYear();
  const session = config.sessionYear || `${currentYear}-${currentYear + 1}`;
  
  const attendancePercentage = student.attendance?.totalDays > 0 
    ? ((student.attendance.presentDays / student.attendance.totalDays) * 100).toFixed(0) 
    : 'N/A';

  const fontClass = theme.fontFamily === 'serif' ? 'font-serif' : theme.fontFamily === 'mono' ? 'font-mono' : 'font-sans';
  const minHeightClass = orientation === 'landscape' ? 'min-h-[210mm]' : 'min-h-[29.7cm]';
  const activeTemplate = DEFAULT_THEMES[template] ? template : 1;

  const handleDownloadJpg = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      await document.fonts.ready;
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      
      const image = canvas.toDataURL("image/jpeg", 0.9);
      const link = document.createElement('a');
      link.href = image;
      link.download = `${student.name}_Result.jpg`;
      link.click();
    } catch (err) {
      console.error("Download failed:", err);
      alert("Failed to download image.");
    } finally {
      setDownloading(false);
    }
  };

  const DownloadButton = () => (
    <button 
      onClick={handleDownloadJpg} 
      disabled={downloading}
      className="no-print absolute top-2 right-2 z-50 bg-gray-800 text-white p-2 rounded-full shadow-lg hover:bg-gray-700 transition title-download opacity-50 hover:opacity-100"
      title="Download as JPG"
    >
      {downloading ? <Loader className="animate-spin size-5" /> : <Download className="size-5" />}
    </button>
  );

  const Watermark = () => (
    theme.showWatermark && config.logoUrl ? (
      <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none overflow-hidden">
         <img src={config.logoUrl} className="w-[500px] h-[500px] object-contain opacity-[0.04] grayscale" crossOrigin="anonymous" />
      </div>
    ) : null
  );

  const Wrapper: React.FC<{children: React.ReactNode, className: string}> = ({children, className}) => (
    <div className={`relative group ${className}`} ref={cardRef}>
       <DownloadButton />
       <Watermark />
       <div className="relative z-10 h-full flex flex-col">{children}</div>
    </div>
  );

  // --- TEMPLATE 1: CLASSIC ---
  if (activeTemplate === 1) {
    return (
      <Wrapper className={`w-full bg-white p-8 md:p-12 mb-8 page-break text-gray-900 shadow-xl print:shadow-none ${minHeightClass} ${fontClass}`}>
        <div className="border-4 border-double h-full p-6 relative flex flex-col" style={{ borderColor: theme.primaryColor }}>
          <div className="flex flex-col md:flex-row items-center justify-between border-b-2 pb-6 mb-6 gap-6" style={{ borderColor: theme.primaryColor }}>
             {config.logoUrl && <img src={config.logoUrl} alt="Logo" className="h-24 w-24 object-contain" crossOrigin="anonymous" />}
             <div className="text-center flex-1">
                <h1 className="text-3xl md:text-4xl font-bold uppercase tracking-wider mb-2" style={{ color: theme.primaryColor }}>{config.name}</h1>
                <p className="text-sm md:text-base font-medium text-gray-600 mb-2">{config.address}</p>
                <div className="inline-block text-white px-8 py-1 text-sm font-bold uppercase tracking-[0.2em] mt-2" style={{ backgroundColor: theme.primaryColor }}>Annual Progress Report</div>
             </div>
             <div className="hidden md:block h-24 w-24 text-right pt-4">
                 <div className="text-xs text-gray-500">Session: {session}</div>
             </div>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-6 text-sm font-medium border-b border-gray-300 pb-6">
             <div className="flex"><span className="w-32 font-bold" style={{ color: theme.primaryColor }}>Student Name:</span> <span className="uppercase font-bold">{student.name}</span></div>
             <div className="flex"><span className="w-32 font-bold" style={{ color: theme.primaryColor }}>Roll Number:</span> {student.rollNo}</div>
             <div className="flex"><span className="w-32 font-bold" style={{ color: theme.primaryColor }}>Father's Name:</span> {student.fatherName}</div>
             <div className="flex"><span className="w-32 font-bold" style={{ color: theme.primaryColor }}>Class:</span> {student.className}</div>
             <div className="flex"><span className="w-32 font-bold" style={{ color: theme.primaryColor }}>Mother's Name:</span> {student.motherName}</div>
             <div className="flex"><span className="w-32 font-bold" style={{ color: theme.primaryColor }}>D.O.B:</span> {formatDOB(student.dob)}</div>
             <div className="flex"><span className="w-32 font-bold" style={{ color: theme.primaryColor }}>SR No:</span> {student.srNo}</div>
             <div className="flex"><span className="w-32 font-bold" style={{ color: theme.primaryColor }}>Attendance:</span> {student.attendance.presentDays}/{student.attendance.totalDays} ({attendancePercentage}%)</div>
          </div>
          <MarksTable subjects={processedSubjects} totalObtained={totalObtained} totalMax={totalMax} overallGrade={overallGrade} style="classic" theme={theme} />
          <FooterSection remarks={remarks} percentage={percentage} style="classic" theme={theme} />
        </div>
      </Wrapper>
    );
  }

  // --- TEMPLATE 2: MODERN ---
  if (activeTemplate === 2) {
    return (
      <Wrapper className={`w-full bg-white mb-8 page-break shadow-xl print:shadow-none overflow-hidden ${minHeightClass} ${fontClass}`}>
         <div className="text-white p-6 relative" style={{ backgroundColor: theme.primaryColor }}>
            <div className="absolute top-0 right-0 p-4 opacity-10"><GraduationCap size={150} /></div>
            <div className="flex items-center gap-6 relative z-10">
                {config.logoUrl && <img src={config.logoUrl} alt="Logo" className="h-20 w-20 bg-white rounded-full p-2 object-contain" crossOrigin="anonymous" />}
                <div>
                    <h1 className="text-2xl font-bold mb-1">{config.name}</h1>
                    <p className="opacity-80 text-sm">{config.address}</p>
                    <div className="mt-3 inline-block px-3 py-1 rounded text-xs uppercase tracking-wider font-semibold" style={{ backgroundColor: theme.secondaryColor }}>Report Card {session}</div>
                </div>
            </div>
         </div>
         <div className="p-6 flex-grow flex flex-col">
            <div className="grid grid-cols-4 gap-4 mb-6 bg-gray-50 p-4 rounded-lg border border-gray-100 text-sm">
                <div><p className="text-[10px] text-gray-500 uppercase font-bold">Name</p><p className="font-bold truncate" style={{ color: theme.primaryColor }}>{student.name}</p></div>
                <div><p className="text-[10px] text-gray-500 uppercase font-bold">Class</p><p className="font-bold text-gray-800">{student.className}</p></div>
                <div><p className="text-[10px] text-gray-500 uppercase font-bold">Roll No</p><p className="font-bold text-gray-800">{student.rollNo}</p></div>
                <div><p className="text-[10px] text-gray-500 uppercase font-bold">Attendance</p><p className="font-semibold text-gray-800">{attendancePercentage}%</p></div>
                
                <div><p className="text-[10px] text-gray-500 uppercase font-bold">Father</p><p className="font-medium text-gray-800 truncate">{student.fatherName}</p></div>
                <div><p className="text-[10px] text-gray-500 uppercase font-bold">Mother</p><p className="font-medium text-gray-800 truncate">{student.motherName}</p></div>
                <div><p className="text-[10px] text-gray-500 uppercase font-bold">D.O.B</p><p className="font-medium text-gray-800">{formatDOB(student.dob)}</p></div>
                <div><p className="text-[10px] text-gray-500 uppercase font-bold">SR No</p><p className="font-medium text-gray-800">{student.srNo}</p></div>
            </div>
            <MarksTable subjects={processedSubjects} totalObtained={totalObtained} totalMax={totalMax} overallGrade={overallGrade} style="modern" theme={theme} />
            <FooterSection remarks={remarks} percentage={percentage} style="modern" theme={theme} />
         </div>
         <div className="h-2 w-full absolute bottom-0" style={{ backgroundColor: theme.primaryColor }}></div>
      </Wrapper>
    );
  }

  // --- TEMPLATE 3: PROFESSIONAL ---
  if (activeTemplate === 3) {
      return (
          <Wrapper className={`w-full bg-white p-8 mb-8 page-break shadow-xl print:shadow-none ${minHeightClass} ${fontClass}`}>
              <div className="flex justify-between items-start border-b-4 pb-4 mb-6" style={{ borderColor: theme.primaryColor }}>
                  <div className="flex items-center">
                    {config.logoUrl && <img src={config.logoUrl} alt="Logo" className="h-20 w-20 object-contain mr-4" crossOrigin="anonymous" />}
                    <div>
                        <h1 className="text-2xl font-black tracking-tight uppercase" style={{ color: theme.primaryColor }}>{config.name}</h1>
                        <p className="text-gray-500 text-sm">{config.address}</p>
                    </div>
                  </div>
                  <div className="text-right">
                      <div className="text-3xl font-light text-gray-400">REPORT CARD</div>
                      <div className="font-bold text-gray-800">SESSION: {session}</div>
                  </div>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 mb-8">
                  <div className="grid grid-cols-4 gap-4 text-sm">
                      <div className="col-span-1">
                          <label className="block text-xs font-bold text-gray-400 uppercase">Student Name</label>
                          <div className="font-bold text-lg" style={{ color: theme.primaryColor }}>{student.name}</div>
                      </div>
                      <div className="col-span-1">
                          <label className="block text-xs font-bold text-gray-400 uppercase">Class & Section</label>
                          <div className="font-bold text-lg" style={{ color: theme.primaryColor }}>{student.className}</div>
                      </div>
                      <div className="col-span-1">
                          <label className="block text-xs font-bold text-gray-400 uppercase">Roll No</label>
                          <div className="font-bold text-lg" style={{ color: theme.primaryColor }}>{student.rollNo}</div>
                      </div>
                      <div className="col-span-1">
                          <label className="block text-xs font-bold text-gray-400 uppercase">SR Number</label>
                          <div className="font-bold text-lg" style={{ color: theme.primaryColor }}>{student.srNo}</div>
                      </div>
                      <div className="col-span-1">
                          <label className="block text-xs font-bold text-gray-400 uppercase">Father's Name</label>
                          <div className="font-medium text-gray-700">{student.fatherName}</div>
                      </div>
                      <div className="col-span-1">
                          <label className="block text-xs font-bold text-gray-400 uppercase">Mother's Name</label>
                          <div className="font-medium text-gray-700">{student.motherName}</div>
                      </div>
                      <div className="col-span-1">
                          <label className="block text-xs font-bold text-gray-400 uppercase">Date of Birth</label>
                          <div className="font-medium text-gray-700">{formatDOB(student.dob)}</div>
                      </div>
                      <div className="col-span-1">
                          <label className="block text-xs font-bold text-gray-400 uppercase">Attendance</label>
                          <div className="font-medium text-gray-700">{attendancePercentage}% ({student.attendance.presentDays}/{student.attendance.totalDays})</div>
                      </div>
                  </div>
              </div>

              <MarksTable subjects={processedSubjects} totalObtained={totalObtained} totalMax={totalMax} overallGrade={overallGrade} style="professional" theme={theme} />
              <FooterSection remarks={remarks} percentage={percentage} style="professional" theme={theme} />
          </Wrapper>
      );
  }

  // --- TEMPLATE 4: ELEGANT ---
  if (activeTemplate === 4) {
      return (
          <Wrapper className={`w-full bg-gray-50 p-8 mb-8 page-break shadow-xl print:shadow-none ${minHeightClass} ${fontClass}`}>
              <div className="border bg-white p-6 shadow-inner h-full rounded-xl flex flex-col" style={{ borderColor: theme.secondaryColor }}>
                  <div className="text-center mb-8 border-b pb-4" style={{ borderColor: theme.secondaryColor }}>
                      {config.logoUrl && <img src={config.logoUrl} className="h-16 mx-auto mb-2" crossOrigin="anonymous" />}
                      <h1 className="text-3xl font-bold" style={{ color: theme.primaryColor }}>{config.name}</h1>
                      <p className="text-sm italic" style={{ color: theme.secondaryColor }}>{config.address}</p>
                      <div className="mt-4 inline-block border-t border-b py-1 px-6 tracking-widest text-sm uppercase" style={{ color: theme.primaryColor, borderColor: theme.secondaryColor }}>Student Performance Report</div>
                  </div>

                  <div className="flex justify-center mb-8">
                      <div className="border p-6 rounded text-center w-full max-w-3xl" style={{ borderColor: theme.secondaryColor, backgroundColor: 'rgba(255,255,255,0.5)' }}>
                          <h2 className="text-2xl mb-1" style={{ color: theme.primaryColor }}>{student.name}</h2>
                          <p className="text-sm mb-4" style={{ color: theme.primaryColor }}>Class: {student.className} | Roll No: {student.rollNo}</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs border-t pt-3" style={{ borderColor: theme.secondaryColor, color: theme.primaryColor }}>
                              <span><strong>Father:</strong> {student.fatherName}</span>
                              <span><strong>Mother:</strong> {student.motherName}</span>
                              <span><strong>DOB:</strong> {formatDOB(student.dob)}</span>
                              <span><strong>Session:</strong> {session}</span>
                              <span><strong>SR No:</strong> {student.srNo}</span>
                              <span><strong>Attendance:</strong> {attendancePercentage}%</span>
                          </div>
                      </div>
                  </div>

                  <MarksTable subjects={processedSubjects} totalObtained={totalObtained} totalMax={totalMax} overallGrade={overallGrade} style="elegant" theme={theme} />
                  <FooterSection remarks={remarks} percentage={percentage} style="elegant" theme={theme} />
              </div>
          </Wrapper>
      );
  }

  // --- TEMPLATE 5: CORPORATE ---
  if (activeTemplate === 5) {
      return (
        <Wrapper className={`w-full bg-white mb-8 page-break shadow-xl print:shadow-none ${minHeightClass} ${fontClass}`}>
            <div className="text-white p-8" style={{ backgroundColor: theme.primaryColor }}>
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{config.name}</h1>
                        <p className="text-sm opacity-80">{config.address}</p>
                    </div>
                    {config.logoUrl && <img src={config.logoUrl} className="h-16 bg-white p-1 rounded" crossOrigin="anonymous" />}
                </div>
            </div>
            
            <div className="p-8 flex-grow flex flex-col">
                <div className="flex gap-4 items-stretch mb-8">
                    <div className="w-3/4 p-4 rounded-l border-l-4" style={{ backgroundColor: '#f9fafb', borderColor: theme.secondaryColor }}>
                        <h3 className="font-bold uppercase text-xs mb-3" style={{ color: theme.primaryColor }}>Student Details</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div><span className="text-gray-500 block text-[10px]">Name</span><span className="font-bold">{student.name}</span></div>
                            <div><span className="text-gray-500 block text-[10px]">Class</span><span className="font-bold">{student.className}</span></div>
                            <div><span className="text-gray-500 block text-[10px]">Roll No</span><span className="font-bold">{student.rollNo}</span></div>
                            <div><span className="text-gray-500 block text-[10px]">Attendance</span><span className="font-bold">{attendancePercentage}%</span></div>
                            <div><span className="text-gray-500 block text-[10px]">Father</span><span className="font-bold">{student.fatherName}</span></div>
                            <div><span className="text-gray-500 block text-[10px]">Mother</span><span className="font-bold">{student.motherName}</span></div>
                            <div><span className="text-gray-500 block text-[10px]">D.O.B</span><span className="font-bold">{formatDOB(student.dob)}</span></div>
                            <div><span className="text-gray-500 block text-[10px]">SR No</span><span className="font-bold">{student.srNo}</span></div>
                        </div>
                    </div>
                    <div className="bg-gray-100 w-1/4 p-4 rounded-r text-center flex flex-col justify-center">
                        <span className="text-gray-500 text-xs uppercase">Academic Session</span>
                        <span className="text-xl font-bold text-gray-800">{session}</span>
                    </div>
                </div>

                <MarksTable subjects={processedSubjects} totalObtained={totalObtained} totalMax={totalMax} overallGrade={overallGrade} style="corporate" theme={theme} />
                <FooterSection remarks={remarks} percentage={percentage} style="corporate" theme={theme} />
            </div>
            <div className="text-center p-2 text-xs absolute bottom-0 w-full text-white" style={{ backgroundColor: theme.primaryColor }}>
                Generate by {config.developerName}
            </div>
        </Wrapper>
      );
  }

  // --- TEMPLATE 6: CUSTOM BUILDER ---
  if (activeTemplate === 6) {
    const { headerStyle = 'standard', borderStyle = 'classic', tableStyle = 'grid' } = theme;

    const borderClass = borderStyle === 'classic' ? `border-4 border-double p-6` 
                      : borderStyle === 'rounded' ? `border-2 rounded-2xl p-6` 
                      : `p-4`;
    
    return (
      <Wrapper className={`w-full bg-white p-8 mb-8 page-break shadow-xl print:shadow-none relative overflow-hidden ${minHeightClass} ${fontClass}`}>
        <div className={`h-full relative z-10 ${borderClass} flex flex-col`} style={{ borderColor: theme.primaryColor }}>
          
          {/* HEADER */}
          <div className={`mb-8 ${headerStyle === 'modern' ? 'bg-gray-50 -mx-6 -mt-6 p-6 border-b' : 'border-b pb-4'}`} style={{ borderColor: theme.secondaryColor }}>
             <div className={`flex items-center gap-6 ${headerStyle === 'standard' ? 'flex-col md:flex-row text-center md:text-left justify-center md:justify-between' : 'flex-row'}`}>
                {config.logoUrl && <img src={config.logoUrl} alt="Logo" className="h-20 w-20 object-contain" crossOrigin="anonymous" />}
                <div className={`${headerStyle === 'standard' ? 'text-center flex-1' : 'flex-1'}`}>
                   <h1 className="text-3xl font-bold uppercase tracking-tight" style={{ color: theme.primaryColor }}>{config.name}</h1>
                   <p className="text-sm font-medium text-gray-600">{config.address}</p>
                   {headerStyle !== 'minimal' && (
                     <div className="mt-2 inline-block px-4 py-1 text-xs font-bold uppercase tracking-widest text-white rounded" style={{ backgroundColor: theme.primaryColor }}>
                       Result Sheet {session}
                     </div>
                   )}
                </div>
                {headerStyle === 'minimal' && (
                   <div className="text-right">
                      <div className="text-sm font-bold text-gray-400">SESSION</div>
                      <div className="text-xl font-bold" style={{ color: theme.secondaryColor }}>{session}</div>
                   </div>
                )}
             </div>
          </div>

          {/* STUDENT DETAILS */}
          <div className="mb-8 p-4 bg-gray-50/50 rounded-lg border border-gray-100">
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div><label className="text-[10px] font-bold uppercase text-gray-400 block">Name</label><span className="font-bold text-lg" style={{ color: theme.primaryColor }}>{student.name}</span></div>
                <div><label className="text-[10px] font-bold uppercase text-gray-400 block">Class</label><span className="font-medium text-gray-800">{student.className}</span></div>
                <div><label className="text-[10px] font-bold uppercase text-gray-400 block">Roll No</label><span className="font-medium text-gray-800">{student.rollNo}</span></div>
                <div><label className="text-[10px] font-bold uppercase text-gray-400 block">D.O.B</label><span className="font-medium text-gray-800">{formatDOB(student.dob)}</span></div>
                <div><label className="text-[10px] font-bold uppercase text-gray-400 block">Father</label><span className="font-medium text-gray-800">{student.fatherName}</span></div>
                <div><label className="text-[10px] font-bold uppercase text-gray-400 block">Mother</label><span className="font-medium text-gray-800">{student.motherName}</span></div>
                <div><label className="text-[10px] font-bold uppercase text-gray-400 block">SR No</label><span className="font-medium text-gray-800">{student.srNo}</span></div>
                <div><label className="text-[10px] font-bold uppercase text-gray-400 block">Attendance</label><span className="font-medium text-gray-800">{attendancePercentage}%</span></div>
             </div>
          </div>

          <MarksTable subjects={processedSubjects} totalObtained={totalObtained} totalMax={totalMax} overallGrade={overallGrade} style={tableStyle === 'striped' ? 'modern' : tableStyle === 'clean' ? 'professional' : 'classic'} theme={theme} />
          
          <FooterSection remarks={remarks} percentage={percentage} style={headerStyle === 'modern' ? 'corporate' : 'classic'} theme={theme} />
        </div>
      </Wrapper>
    );
  }

  return null;
};

// --- SUB-COMPONENTS ---
const MarksTable: React.FC<{
    subjects: any[], totalObtained: number, totalMax: number, overallGrade: string, style: 'classic'|'modern'|'professional'|'elegant'|'corporate', theme: TemplateOptions
}> = ({ subjects, totalObtained, totalMax, overallGrade, style, theme }) => {
    
    let headerStyle: React.CSSProperties = {};
    let cellStyle: React.CSSProperties = { borderColor: '#e5e7eb' };
    let footerStyle: React.CSSProperties = {};

    if (style === 'classic') {
        headerStyle = { backgroundColor: '#f3f4f6', color: theme.primaryColor, border: `1px solid ${theme.primaryColor}` };
        cellStyle = { border: `1px solid ${theme.primaryColor}` };
        footerStyle = { backgroundColor: theme.primaryColor, color: '#ffffff' };
    } else if (style === 'modern') {
        headerStyle = { backgroundColor: '#e0e7ff', color: theme.primaryColor }; 
        cellStyle = { borderBottom: '1px solid #f3f4f6' };
    } else if (style === 'professional') {
        headerStyle = { backgroundColor: theme.primaryColor, color: '#ffffff' };
        cellStyle = { borderBottom: '1px solid #e5e7eb' };
    } else if (style === 'elegant') {
        headerStyle = { backgroundColor: '#fff7ed', color: theme.primaryColor, borderBottom: `1px solid ${theme.secondaryColor}` };
        cellStyle = { borderBottom: `1px solid ${theme.secondaryColor}`, color: theme.primaryColor };
    } else if (style === 'corporate') {
        headerStyle = { backgroundColor: theme.secondaryColor, color: '#ffffff' };
        cellStyle = { borderBottom: '1px solid #e5e7eb' };
    }

    const headerClass = "uppercase tracking-wider font-bold text-center p-2 text-xs";
    const cellClass = "p-2 text-sm";

    return (
        <table className={`w-full mb-6 ${style === 'classic' ? 'border-collapse border-2 text-xs' : 'text-sm'}`} style={style === 'classic' ? { borderColor: theme.primaryColor } : {}}>
            <thead>
              <tr style={headerStyle}>
                <th rowSpan={2} className={`${headerClass} text-left`}>Subject</th>
                <th colSpan={3} className={`${headerClass} border-l border-r border-opacity-25 border-white`}>Half Yearly</th>
                <th colSpan={3} className={`${headerClass} border-l border-r border-opacity-25 border-white`}>Annual</th>
                <th rowSpan={2} className={headerClass}>Total</th>
                <th rowSpan={2} className={headerClass}>Grade</th>
              </tr>
              <tr style={{ ...headerStyle, opacity: 0.9, fontSize: '10px' }}>
                  <th className="p-1 border-t border-opacity-20 border-black">Th</th>
                  <th className="p-1 border-t border-opacity-20 border-black">IA</th>
                  <th className="p-1 border-t border-opacity-20 border-black">Tot</th>
                  <th className="p-1 border-t border-opacity-20 border-black">Th</th>
                  <th className="p-1 border-t border-opacity-20 border-black">IA</th>
                  <th className="p-1 border-t border-opacity-20 border-black">Tot</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((sub, idx) => (
                <tr key={idx} className={`text-center ${idx%2===0 && style!=='classic' ? 'bg-gray-50' : ''}`}>
                  <td className={`${cellClass} text-left font-bold`} style={cellStyle}>{sub.name}</td>
                  <td className={`${cellClass} text-gray-500`} style={cellStyle}>{sub.half.theory}</td>
                  <td className={`${cellClass} text-gray-500`} style={cellStyle}>{sub.half.assessment}</td>
                  <td className={`${cellClass} font-semibold`} style={cellStyle}>{sub.half.total}</td>
                  <td className={`${cellClass} text-gray-500`} style={cellStyle}>{sub.annual.theory}</td>
                  <td className={`${cellClass} text-gray-500`} style={cellStyle}>{sub.annual.assessment}</td>
                  <td className={`${cellClass} font-semibold`} style={cellStyle}>{sub.annual.total}</td>
                  <td className={`${cellClass} font-bold`} style={cellStyle}>{sub.grandTotal}</td>
                  <td className={`${cellClass} font-bold`} style={cellStyle}>{sub.grade}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
               <tr style={footerStyle} className={`${style!=='classic' ? 'bg-gray-100' : ''} font-bold`}>
                   <td className="p-3 text-right" style={cellStyle}>Grand Total</td>
                   <td colSpan={6} style={cellStyle}></td>
                   <td className="p-3 text-center" style={cellStyle}>{totalObtained} / {totalMax}</td>
                   <td className="p-3 text-center" style={cellStyle}>{overallGrade}</td>
               </tr>
            </tfoot>
        </table>
    );
};

const FooterSection: React.FC<{ remarks: string, percentage: string, style: string, theme: TemplateOptions }> = ({ remarks, percentage, style, theme }) => {
    
    let percentageBoxStyle: React.CSSProperties = { backgroundColor: '#e5e7eb' };
    if (style === 'classic') percentageBoxStyle = { backgroundColor: theme.primaryColor, color: '#ffffff' };
    if (style === 'corporate') percentageBoxStyle = { backgroundColor: theme.secondaryColor, color: '#ffffff' };

    return (
        <div className="mt-auto">
            <div className={`flex gap-4 mb-12 ${style === 'corporate' ? 'flex-row-reverse' : ''}`}>
                 <div className="flex-grow p-4 bg-gray-50 border rounded relative" style={{ borderColor: style === 'elegant' ? theme.secondaryColor : '#e5e7eb' }}>
                     <p className="text-xs font-bold uppercase text-gray-400 mb-2">Teacher's Remarks</p>
                     <p className="italic text-gray-800">"{remarks}"</p>
                     {style === 'modern' && <Quote className="absolute right-2 bottom-2 opacity-10" style={{ color: theme.primaryColor }} />}
                 </div>
                 <div className="w-32 p-4 text-center flex flex-col justify-center rounded" style={percentageBoxStyle}>
                     <span className="text-xs uppercase opacity-75">Percentage</span>
                     <span className="text-2xl font-bold">{percentage}%</span>
                 </div>
            </div>

            <div className="flex justify-between items-end px-8 text-center mt-12 pb-4">
                <div>
                    <div className="h-px w-32 bg-gray-400 mb-2"></div>
                    <p className="text-[10px] uppercase font-bold text-gray-500">Class Teacher</p>
                </div>
                <div>
                    <div className="h-px w-32 bg-gray-400 mb-2"></div>
                    <p className="text-[10px] uppercase font-bold text-gray-500">Parent/Guardian</p>
                </div>
                <div>
                    <div className="h-px w-32 bg-gray-400 mb-2"></div>
                    <p className="text-[10px] uppercase font-bold text-gray-500">Principal</p>
                </div>
            </div>
        </div>
    );
};

function calculateGrade(percentage: number): string {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C';
  if (percentage >= 33) return 'D';
  return 'F';
}
