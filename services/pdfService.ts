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
    ],
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42] }
  });

  // @ts-ignore
  yPos = doc.lastAutoTable.finalY + 15;

  doc.setFontSize(14);
  doc.setTextColor(40);
  doc.text("Detailed Question Log", 14, yPos);

  const rows = report.turns.map((turn, index) => [
    `Q${index + 1}`,
    turn.question,
    turn.transcript.substring(0, 100) + "...",
    `${turn.analysis.technicalAccuracy}%`,
    turn.analysis.sentiment
  ]);

  autoTable(doc, {
    startY: yPos + 6,
    head: [['#', 'Question', 'Answer Snippet', 'Accuracy', 'Sentiment']],
    body: rows,
    theme: 'striped',
    styles: { fontSize: 8 },
    columnStyles: {
      1: { cellWidth: 60 },
      2: { cellWidth: 60 }
    }
  });

  doc.save(`Interview_Report_${context.candidateName.replace(' ', '_')}.pdf`);
};