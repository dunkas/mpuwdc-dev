"""Publish the user-supplied mini guide without importing instructions as commands."""
from pathlib import Path
from html import escape
import shutil,sys
from docx import Document
from docx.table import Table
from docx.text.paragraph import Paragraph
root=Path(__file__).resolve().parents[1]
source=Path(sys.argv[1]);out=root/'public/documents/election-day-mini-rules';out.mkdir(parents=True,exist_ok=True)
shutil.copyfile(source,out/'MPU_2026_Election_Day_Mini_Rules_and_Procedures.docx')
doc=Document(source);blocks=[]
for node in doc.element.body.iterchildren():
 if node.tag.endswith('}p'):
  p=Paragraph(node,doc);text=p.text.strip()
  if not text:continue
  tag='h1' if text=='MPU 2026 Election Day Mini Rules and Procedures' else 'h2' if p.style.name.startswith('Heading') or (text[:1].isdigit() and not '.' in text[:3]) else 'p'
  blocks.append(f'<{tag}>{escape(text)}</{tag}>')
 elif node.tag.endswith('}tbl'):
  table=Table(node,doc);blocks.append('<div class="table-wrap"><table>'+''.join('<tr>'+''.join(f'<{"th" if i==0 else "td"}>{escape(c.text).replace(chr(10),"<br>")}</{"th" if i==0 else "td"}>' for c in row.cells)+'</tr>' for i,row in enumerate(table.rows))+'</table></div>')
html='''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Election Day Mini Rules — MPU 2026</title><link rel="stylesheet" href="/assets/styles.css?v=build10"><style>main{max-width:1000px;background:white;padding:24px}p{line-height:1.5}table{border-collapse:collapse;width:100%}th,td{border:1px solid #bbc8d6;padding:8px;text-align:left;vertical-align:top}.table-wrap{overflow-x:auto}h2{margin-top:28px}tr{break-inside:avoid}@page{size:letter;margin:.65in}@media print{header,.downloads{display:none}main{max-width:none;padding:0}body{background:white}h1{font-size:21pt}h2{font-size:15pt}p,td,th{font-size:10pt}.table-wrap{overflow:visible}}</style></head><body><header class="top"><div class="wrap"><nav class="nav"><a href="/voter-education/">← Back to Voter Education</a></nav></div></header><main class="wrap"><div class="downloads"><p><a class="btn primary" href="/documents/election-day-mini-rules/MPU_2026_Election_Day_Mini_Rules_and_Procedures.docx" download>Download original Word document</a> <a class="btn ghost" href="/documents/election-day-mini-rules/MPU_2026_Election_Day_Mini_Rules_and_Procedures.pdf" download>Download printable PDF</a> <button class="btn ghost" onclick="window.print()">Print Mini Rules</button></p></div>'''+''.join(blocks)+'''</main><script defer src="/assets/section-navigation.js"></script></body></html>'''
(out/'index.html').write_text(html)
print('Published complete mini guide, in source paragraph/table order; original DOCX unchanged.')
