import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ReportData, InterviewContextData } from '../types';

export const generatePDF = (report: ReportData, context: InterviewContextData) => {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(22);
  doc.setTextColor(40, 40, 40);
  doc.text("ProbeLensAI - Interview Report", 14, 20);
  
  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text(`Candidate: ${context.candidateName}`, 14, 30);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 36);
  
  // Overall Score Badge
  const isHigh = report.recommendation === 'STRONG_HIRE' || report.recommendation === 'HIRE';
  doc.setFillColor(isHigh ? 34 : 220, isHigh ? 197 : 38, 94);
  doc.rect(140, 15, 50, 20, 'F');
  doc.setTextColor(255);
  doc.setFontSize(14);
  doc.text(report.recommendation.replace('_', ' '), 165, 27, { align: 'center' });
  
  doc.setTextColor(40);
  doc.setFontSize(12);
  
  // Summary
  doc.text("Executive Summary", 14, 50);
  doc.setFontSize(10);
  doc.setTextColor(80);
  const splitSummary = doc.splitTextToSize(report.summary, 180);
  doc.text(splitSummary, 14, 56);
  
  let yPos = 56 + (splitSummary.length * 5) + 10;

  // Psychological Profile
  doc.setFontSize(14);
  doc.setTextColor(40);
  doc.text("Psychological Profile", 14, yPos);
  doc.setFontSize(10);
  doc.setTextColor(80);
  const splitProfile = doc.splitTextToSize(report.psychologicalProfile, 180);
  doc.text(splitProfile, 14, yPos + 6);
  yPos = yPos + 6 + (splitProfile.length * 5) + 5;

  // Integrity Score
  doc.setFontSize(12);
  doc.setTextColor(40);
  doc.text(`Integrity Score: ${report.integrityScore}%`, 14, yPos);
  yPos = yPos + 10;

  // Category Scores Table
  autoTable(doc, {
    startY: yPos,
    head: [['Category', 'Score (0-100)']],
    body: [
      ['Technical', report.categoryScores.technical],
      ['Subject Knowledge', report.categoryScores.subjectKnowledge],
      ['Behavioral', report.categoryScores.behavioral],
      ['Functional Skills', report.categoryScores.functional],
      ['Non-Functional Skills', report.categoryScores.nonFunctional],
      ['Communication', report.categoryScores.communication],
      ['Coding', report.categoryScores.coding],
    ],
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42] }
  });

  // @ts-ignore
  yPos = doc.lastAutoTable.finalY + 15;

  // Skill Depth Breakdown
  doc.setFontSize(14);
  doc.setTextColor(40);
  doc.text("Skill Depth Analysis", 14, yPos);
  
  autoTable(doc, {
    startY: yPos + 6,
    head: [['Skill Level', 'Count']],
    body: [
      ['Basic', report.skillDepthBreakdown.basic],
      ['Intermediate', report.skillDepthBreakdown.intermediate],
      ['Expert', report.skillDepthBreakdown.expert],
    ],
    theme: 'striped'
  });

  // @ts-ignore
  yPos = doc.lastAutoTable.finalY + 15;

  doc.setFontSize(14);
  doc.setTextColor(40);
  doc.text("Detailed Question Log", 14, yPos);

  const rows = report.turns.map((turn, index) => [
    `Q${index + 1}`,
    turn.question,
    turn.questionComplexity,
    turn.transcript.substring(0, 100) + "...",
    turn.analysis.correctAnswer ? turn.analysis.correctAnswer.substring(0, 100) + "..." : "N/A",
    `${turn.analysis.technicalAccuracy}%`,
    turn.analysis.answerQuality,
    turn.analysis.sentiment
  ]);

  autoTable(doc, {
    startY: yPos + 6,
    head: [['#', 'Question', 'Level', 'Candidate Answer', 'Correct Answer', 'Accuracy', 'Quality', 'Sentiment']],
    body: rows,
    theme: 'striped',
    styles: { fontSize: 6 },
    columnStyles: {
      1: { cellWidth: 30 },
      2: { cellWidth: 25 },
      3: { cellWidth: 40 },
      4: { cellWidth: 40 },
      5: { cellWidth: 15 },
      6: { cellWidth: 15 },
      7: { cellWidth: 15 }
    }
  });

  doc.save(`Interview_Report_${context.candidateName.replace(' ', '_')}.pdf`);
};