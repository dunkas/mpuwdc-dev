"""Generate questions strictly from the reviewed uploaded Constitution and cited excerpts."""
from pathlib import Path
from html import escape
import json,hashlib
from docx import Document
from docx.shared import Inches,Pt
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'public/documents/constitutional-questions'
data=json.loads((OUT/'source-questions.json').read_text());source=OUT/data['sourceFile']
assert hashlib.sha256(source.read_bytes()).hexdigest()==data['sourceSHA256'],'Constitution source changed; review citations before regeneration.'
source_text='\n'.join(p.text.strip() for p in Document(source).paragraphs)
for q in data['questions']:
 for excerpt in q['excerpts']:assert excerpt in source_text,'Source excerpt missing: '+q['topic']
doc=Document();section=doc.sections[0];section.page_width=Inches(8.5);section.page_height=Inches(11);section.top_margin=section.bottom_margin=Inches(.65);section.left_margin=section.right_margin=Inches(.7);doc.styles['Normal'].font.name='Calibri';doc.styles['Normal'].font.size=Pt(11)
title='MPU 2026 — Constitutional Questions';doc.add_heading(title,0);intro='32 study questions checked against the user-supplied Constitution, September 27, 2026 corrections file. Every question below cites that file and reproduces the supporting wording.';doc.add_paragraph(intro)
sections=[]
for i,q in enumerate(data['questions'],1):
 doc.add_heading(f'{i}. {q["topic"]}',2);doc.add_paragraph(q['question']);doc.add_paragraph('Source: '+q['reference'])
 for excerpt in q['excerpts']:doc.add_paragraph(excerpt,style='Quote')
 sections.append('<section class="question"><h2>'+str(i)+'. '+escape(q['topic'])+'</h2><p>'+escape(q['question'])+'</p><p><strong>Source: '+escape(q['reference'])+'</strong></p>'+''.join('<blockquote>'+escape(excerpt)+'</blockquote>' for excerpt in q['excerpts'])+'</section>')
doc.add_heading('Source and review notes',1)
for note in data['notes']:doc.add_paragraph(note)
doc.save(OUT/'MPU-2026-Constitutional-Questions.docx')
html='''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MPU Constitutional Questions</title><style>body{font:11pt Arial,sans-serif;color:#18324e;margin:0;background:#edf2f8}header,main{max-width:950px;margin:auto;padding:20px}main{background:white}nav{display:flex;gap:12px;flex-wrap:wrap}nav a,button{padding:10px;background:#215e92;color:white;border:0;border-radius:5px;text-decoration:none;font:inherit;cursor:pointer}p,blockquote{line-height:1.45;overflow-wrap:anywhere}h2{font-size:14pt}blockquote{font-size:10pt;border-left:3px solid #ccd6e0;padding-left:12px;margin-left:10px}h2{break-after:avoid}@page{size:letter;margin:.65in}@media print{header{display:none}body{background:white;color:black}main{padding:0;max-width:none}h1{font-size:21pt}}</style></head><body><header><nav><a href="/voter-education/">← Back to Voter Education</a><a href="/admin/">EC Admin Center</a><a href="/documents/constitutional-questions/MPU-2026-Constitutional-Questions.docx" download>Download Questions Word</a><a href="/documents/constitutional-questions/MPU-2026-Constitutional-Questions.pdf" download>Download Questions PDF</a><a href="/documents/constitutional-questions/'''+escape(data['sourceFile'])+'''" download>Download Source Constitution</a><button onclick="window.print()">Print Questions</button></nav></header><main><h1>'''+escape(title)+'</h1><p>'+escape(intro)+'</p>'+''.join(sections)+'<h2>Source and review notes</h2>'+''.join('<p>'+escape(n)+'</p>' for n in data['notes'])+'</main><script defer src="/assets/section-navigation.js"></script></body></html>'
(OUT/'index.html').write_text(html);print('Generated',len(data['questions']),'questions with verified source excerpts; replaced former mixed-source question list.')
