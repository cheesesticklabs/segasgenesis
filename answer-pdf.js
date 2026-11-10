// PDF export stays on the student's device; answers are not sent to another service.
window.LAB_PDF={
 create(work,receipt,pages,questions){
  const es=work.lang==='es', t=(en,sp)=>es?sp:en, text=v=>Array.isArray(v)?v[es?1:0]:v;
  const doc=new window.jspdf.jsPDF({unit:'pt',format:'letter'});
  const margin=46,width=520,bottom=742;let y=48;
  const clean=v=>String(v??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replace(/[\u2018\u2019]/g,"'").replace(/[\u201c\u201d]/g,'"').replace(/[\u2013\u2014]/g,'-');
  function write(value,{bold=false,size=11,gap=9}={}){
   doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(size);
   const lines=doc.splitTextToSize(clean(value),width);
   for(const line of lines){if(y+size*1.35>bottom){doc.addPage();y=48;}doc.text(line,margin,y);y+=size*1.35;}y+=gap;
  }
  write(t('Sega’s Genesis','El génesis de Sega'),{bold:true,size:19,gap:16});
  write(t('Name: ','Nombre: ')+work.name,{bold:true});
  write(t('Class / period: ','Clase / período: ')+work.period,{bold:true});
  write(t('Prepared for Google Classroom','Preparado para Google Classroom'),{size:10});
  write(t('Exported at: ','Exportado: ')+work.exportedAt,{size:9,gap:18});
  const responses=Object.fromEntries(work.responses.map(r=>[r.id,r.answer]));
  for(const [i,page] of pages.entries()){
   if(['submit','arcade'].includes(page.id))continue;
   if(y>650){doc.addPage();y=48;}
   const answered=page.questions.filter(id=>String(responses[id]||'').trim()).length;
   write(`${i+1}. ${text(page.title)||text(page.name)} (${answered}/${page.questions.length})`,{bold:true,size:13,gap:11});
   for(const id of page.questions){write(text(questions[id].label),{bold:true});write(responses[id]||t('[No response]','[Sin respuesta]'),{gap:17});}
   y+=8;
  }
  const count=doc.getNumberOfPages();for(let n=1;n<=count;n++){doc.setPage(n);doc.setFont('helvetica','normal');doc.setFontSize(9);doc.text(`${n} / ${count}`,566,770,{align:'right'});}
  return doc;
 },
 download(work,receipt,pages,questions){
  const name=String(work.name).trim().replace(/[^a-zA-Z0-9\u00c0-\u024f_-]+/g,'-');
  const period=String(work.period).trim().replace(/[^a-zA-Z0-9_-]+/g,'-');
  this.create(work,receipt,pages,questions).save(`Segas-Genesis-${name}-period-${period}.pdf`);
 }
};
