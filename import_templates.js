import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = 'https://zfoqhyxbrupuuhtsxuxl.supabase.co';
const supabase = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY || '');

const dirPath = path.resolve(process.cwd(), 'نماذج_إدارة_المدرسة_الرسمية');

function cleanText(text) {
  let lines = text.split('\n');
  
  // Find the start line (often starts with "الموضوع:" or "سعادة")
  let startIdx = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('السلام عليكم ورحمة الله وبركاته') || lines[i].includes('الموضوع:')) {
      startIdx = Math.max(0, i - 1); // keep the line before (like سعادة)
      break;
    }
  }

  // Find the end line (often starts with "اسم المعلم" or "التوقيع" at the bottom)
  let endIdx = lines.length;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].includes('إقرار بالاطلاع') || lines[i].includes('وتقبلوا خالص التحية') || lines[i].includes('والله الموفق') || lines[i].match(/اسم المعلم\s*التوقيع/)) {
      endIdx = i;
      break;
    }
  }

  let cleanedLines = lines.slice(startIdx, endIdx);
  
  let result = cleanedLines.join('\n');
  
  // Replace long dotted lines after "سعادة" with {{employeeName}}
  result = result.replace(/سعادة\/ الأستاذ: \.* المحترم/g, 'سعادة/ الأستاذ: {{employeeName}} المحترم');
  result = result.replace(/المكرم\/ \.* المحترم/g, 'المكرم/ {{employeeName}} المحترم');
  result = result.replace(/الأستاذ: \.*/g, 'الأستاذ: {{employeeName}}');

  // Replace other long dotted lines with underscores or short dots
  result = result.replace(/\.{10,}/g, '___________');

  return result.trim();
}

async function run() {
  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.docx') && !f.startsWith('00_'));

  for (const file of files) {
    console.log(`Processing ${file}...`);
    const filePath = path.join(dirPath, file);
    
    // Extract text using textutil (macOS native)
    let rawText = '';
    try {
      rawText = execSync(`textutil -convert txt "${filePath}" -stdout`).toString('utf8');
    } catch (e) {
      console.error(`Error reading ${file}:`, e.message);
      continue;
    }

    const templateContent = cleanText(rawText);
    const templateName = file.replace('.docx', '').replace(/^\d+_/, '').replace(/_/g, ' ');

    console.log(`Generating SQL for: ${templateName}`);
    
    // Escape single quotes for SQL
    const safeName = templateName.replace(/'/g, "''");
    const safeContent = templateContent.replace(/'/g, "''");
    
    sql += `INSERT INTO public.hr_templates (id, name, type, content, created_at) VALUES ('${uuidv4()}', '${safeName}', 'text', '${safeContent}', NOW());\n`;
  }
  
  fs.writeFileSync('seed_templates.sql', sql);
  console.log('✅ Generated seed_templates.sql successfully!');
}

let sql = `-- Seed HR Templates\n`;
run().catch(console.error);
