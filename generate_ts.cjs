const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { v4: uuidv4 } = require('uuid');

const dirPath = path.resolve(process.cwd(), 'نماذج_إدارة_المدرسة_الرسمية');

function cleanText(text) {
  let lines = text.split('\n');
  let startIdx = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('السلام عليكم ورحمة الله وبركاته') || lines[i].includes('الموضوع:')) {
      startIdx = Math.max(0, i - 1);
      break;
    }
  }

  let endIdx = lines.length;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].includes('إقرار بالاطلاع') || lines[i].includes('وتقبلوا خالص التحية') || lines[i].includes('والله الموفق') || lines[i].match(/اسم المعلم\s*التوقيع/)) {
      endIdx = i;
      break;
    }
  }

  let cleanedLines = lines.slice(startIdx, endIdx);
  let result = cleanedLines.join('\n');
  result = result.replace(/سعادة\/ الأستاذ: \.* المحترم/g, 'سعادة/ الأستاذ: {{employeeName}} المحترم');
  result = result.replace(/المكرم\/ \.* المحترم/g, 'المكرم/ {{employeeName}} المحترم');
  result = result.replace(/الأستاذ: \.*/g, 'الأستاذ: {{employeeName}}');
  result = result.replace(/\{\{employeeName\}\}\{\{employeeName\}\}/g, '{{employeeName}}');
  result = result.replace(/\.{10,}/g, '___________');

  return result.trim();
}

const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.docx') && !f.startsWith('00_'));
const templates = [];

for (const file of files) {
  const filePath = path.join(dirPath, file);
  const rawText = execSync(`textutil -convert txt "${filePath}" -stdout`).toString('utf8');
  const templateContent = cleanText(rawText);
  const templateName = file.replace('.docx', '').replace(/^\d+_/, '').replace(/_/g, ' ');
  templates.push({
    name: templateName,
    type: 'text',
    content: templateContent,
  });
}

const tsContent = `export const officialTemplates = ${JSON.stringify(templates, null, 2)};\n`;
fs.writeFileSync('src/utils/officialTemplates.ts', tsContent);
console.log('✅ Generated src/utils/officialTemplates.ts');
