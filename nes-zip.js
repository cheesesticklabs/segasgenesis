/* Small ZIP reader using the browser's native DEFLATE decoder. No remote dependency.
   The central directory handles ZIPs with data descriptors; no filename guessing. */
window.LAB_ROM = (() => {
  const MAX_ROM=8*1024*1024, MAX_ARCHIVE=24*1024*1024;
  const isNES=b=>b.length>=16&&b[0]===0x4e&&b[1]===0x45&&b[2]===0x53&&b[3]===0x1a;
  const crcTable=Uint32Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
  function crc32(data){let crc=0xffffffff;for(const byte of data)crc=crcTable[(crc^byte)&255]^(crc>>>8);return (crc^0xffffffff)>>>0;}
  async function bounded(stream,limit){const reader=stream.getReader(),parts=[];let length=0;try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>limit)throw new Error('Game file is larger than the player supports.');parts.push(value);}}catch(error){await reader.cancel().catch(()=>{});throw error;}const out=new Uint8Array(length);let at=0;for(const part of parts){out.set(part,at);at+=part.byteLength;}return out;}
  async function extract(bytes,filename=''){
    if(bytes.byteLength>MAX_ARCHIVE)throw new Error('The ZIP is too large. Link to one game per ZIP.');
    if(isNES(bytes)){if(bytes.length>MAX_ROM)throw new Error('NES file is too large.');return bytes;}
    const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),u16=i=>view.getUint16(i,true),u32=i=>view.getUint32(i,true);
    let end=-1;
    for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(u32(i)===0x06054b50&&i+22+u16(i+20)===bytes.length){end=i;break;}
    if(end<0)throw new Error('This is not an NES ROM or a supported ZIP archive.');
    if(u16(end+4)||u16(end+6)||u16(end+8)!==u16(end+10))throw new Error('Split ZIP archives are not supported.');
    const total=u16(end+10),directorySize=u32(end+12),directoryStart=u32(end+16),files=[];let pos=directoryStart;
    if(total===65535||directoryStart===0xffffffff||directoryStart+directorySize>end)throw new Error('Invalid or unsupported ZIP directory.');
    for(let i=0;i<total;i++){
      if(pos+46>bytes.length||u32(pos)!==0x02014b50)throw new Error('Invalid ZIP directory.');
      const nameLength=u16(pos+28),extra=u16(pos+30),comment=u16(pos+32);
      if(pos+46+nameLength+extra+comment>bytes.length)throw new Error('Invalid ZIP entry.');
      const name=new TextDecoder().decode(bytes.subarray(pos+46,pos+46+nameLength));
      if(/\.nes$/i.test(name)&&!name.startsWith('__MACOSX/')&&!name.split('/').pop().startsWith('._'))files.push({name,flags:u16(pos+8),method:u16(pos+10),crc:u32(pos+16),compressed:u32(pos+20),size:u32(pos+24),offset:u32(pos+42)});
      pos+=46+nameLength+extra+comment;
    }
    const matches=filename?files.filter(f=>f.name===filename):files;
    if(!matches.length)throw new Error(filename?'The configured .nes filename was not found in this ZIP.':'This ZIP contains no .nes game.');
    if(matches.length>1)throw new Error('This ZIP contains several games. Ask your teacher to set the exact .nes filename.');
    const f=matches[0];
    if(f.flags&1)throw new Error('Password-protected ZIPs are not supported.');
    if(f.size>MAX_ROM||f.compressed>MAX_ARCHIVE||f.offset+30>bytes.length)throw new Error('Invalid or oversized game in ZIP.');
    if(u32(f.offset)!==0x04034b50)throw new Error('Invalid ZIP file header.');
    const start=f.offset+30+u16(f.offset+26)+u16(f.offset+28),stop=start+f.compressed;
    if(stop>bytes.length)throw new Error('The ZIP download is incomplete.');
    const packed=bytes.subarray(start,stop);let result;
    if(f.method===0)result=packed;
    else if(f.method===8){if(typeof DecompressionStream==='undefined')throw new Error('Use an updated Chrome or Edge browser for ZIP game links.');result=await bounded(new Blob([packed]).stream().pipeThrough(new DecompressionStream('deflate-raw')),MAX_ROM);}
    else throw new Error('Use a standard ZIP (stored or DEFLATE compression).');
    if(result.length!==f.size||crc32(result)!==f.crc)throw new Error('The ZIP game failed its integrity check. Try downloading again.');
    if(!isNES(result))throw new Error('The extracted file is not a valid iNES game.');
    return result;
  }
  return {extract,isNES,bounded,MAX_ARCHIVE};
})();
