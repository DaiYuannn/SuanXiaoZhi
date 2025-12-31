import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { classifyAccounting, classifyTextQuick, classifyText } from '../../api/endpoints';
import { auditUI, auditError } from '../../analytics/audit';

interface LocalImage {
  id: string;
  file: File;
  url: string;
  rotation: number; // 0,90,180,270
  crop?: { x: number; y: number; w: number; h: number }; // 基于原图尺寸
  cropPct?: { x: number; y: number; w: number; h: number }; // 基于容器百分比 [0-1]
  processing?: boolean;
  result?: any; // 分类结果（后续细化类型）
  error?: string;
  pixelatedCount?: number; // 已像素化的敏感区域数量
  manualMasks?: { x: number; y: number; w: number; h: number }[]; // 手动脱敏区域（百分比）
}

const PageBillUpload: React.FC = () => {
  const navigate = useNavigate();
  const [images, setImages] = useState<LocalImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [desensitize, setDesensitize] = useState(false); // 脱敏开关
  const inputRef = useRef<HTMLInputElement>(null);

  const pickFiles = () => inputRef.current?.click();

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    const next: LocalImage[] = [];
    Array.from(files).forEach(f => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      next.push({ id, file: f, url: URL.createObjectURL(f), rotation: 0 });
    });
    setImages(prev => [...prev, ...next]);
    auditUI('bill_upload_select', { count: next.length });
  };

  function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        try { if (typeof src === 'string' && src.startsWith('blob:')) URL.revokeObjectURL(src); } catch {}
        resolve(image);
      };
      image.onerror = reject;
      image.src = src;
    });
  }

  const rotate = (id: string) => {
    setImages(list => list.map(img => img.id === id ? { ...img, rotation: (img.rotation + 90) % 360 } : img));
    auditUI('bill_upload_rotate', { id });
  };

  const remove = (id: string) => {
    setImages(list => list.filter(i => i.id !== id));
    auditUI('bill_upload_remove', { id });
  };

  const [cropSelecting, setCropSelecting] = useState<string | null>(null);
  const cropStartRef = useRef<{x:number;y:number}|null>(null);
  const [maskSelecting, setMaskSelecting] = useState<string | null>(null);
  const maskStartRef = useRef<{x:number;y:number}|null>(null);

  const startCrop = (id: string) => {
    setCropSelecting(id);
    cropStartRef.current = null;
    auditUI('bill_upload_crop_mode', { id });
  };

  const startMask = (id: string) => {
    setMaskSelecting(id);
    maskStartRef.current = null;
    auditUI('bill_upload_mask_mode', { id });
  };

  const classifyAll = async () => {
    if (!images.length) return;
    setUploading(true);
    auditUI('bill_upload_classify_start', { count: images.length });
    try {
      // 预处理（旋转/裁剪/脱敏占位）
      const processed = await Promise.all(images.map(async (img) => {
        try {
          const blob = await processImage(img.file, img.rotation, img.cropPct, desensitize, img.manualMasks);
          return new File([blob], img.file.name || 'image.jpg', { type: blob.type || 'image/jpeg' });
        } catch {
          return img.file;
        }
      }));
      const res = await classifyAccounting({ images: processed });
      // 多图返回：当前后端类型为单对象，若后端后续改为数组需调整；这里复用同一结果到每张图（模拟多图）
      let nextImages = images.map(img => ({ ...img, result: res.data, processing: false }));
      // 高级脱敏：基于 OCR 坐标像素化敏感文本区域（仅在启用脱敏时）
      if (desensitize && res.data?.ocr?.length) {
        auditUI('bill_upload_desensitize_refine_start', { ocrCount: res.data.ocr.length });
        nextImages = await Promise.all(nextImages.map(async (img) => {
          try {
            const refine = await processImageWithOcr(img.file, img.rotation, img.cropPct, res.data.ocr);
            const newFile = new File([refine.blob], img.file.name, { type: refine.blob.type });
            const oldUrl = img.url;
            const newUrl = URL.createObjectURL(refine.blob);
            if (oldUrl && oldUrl.startsWith('blob:')) {
              try { URL.revokeObjectURL(oldUrl); } catch {}
            }
            return { ...img, file: newFile, url: newUrl, pixelatedCount: refine.pixelated, result: res.data };
          } catch (e) {
            auditError('bill_upload_desensitize_refine_fail', e);
            return img;
          }
        }));
        const totalPixelated = nextImages.reduce((sum, it) => sum + (it.pixelatedCount || 0), 0);
        auditUI('bill_upload_desensitize_refine_done', { totalPixelated });
      }
      setImages(nextImages);
      auditUI('bill_upload_classify_success', { count: images.length });
    } catch (e: any) {
      const msg = e?.message || '请求失败';
      setImages(list => list.map(img => ({ ...img, error: msg, processing: false })));
      auditError('bill_upload_classify_fail', msg);
    } finally {
      setUploading(false);
    }
  };

  function mapCategoryToCode(label?: string): string {
    const map: Record<string, string> = {
      '餐饮': 'food',
      '购物': 'shopping',
      '交通': 'transport',
      '娱乐': 'entertainment',
      '医疗': 'medical',
      '教育': 'education',
      '住房': 'housing',
      '水电煤': 'utilities',
      '工资': 'salary',
      '奖金': 'bonus',
      '投资': 'investment',
      '其他': 'other',
    };
    if (!label) return '';
    return map[label] || 'other';
  }

  function gotoAddTransactionFromResult(res: any) {
    const topLabel = Array.isArray(res?.categories) && res.categories.length ? res.categories[0]?.label : undefined;
    const category = mapCategoryToCode(topLabel);
    const dateIso = res?.ts || new Date().toISOString();
    const date = String(dateIso).slice(0,10);
    const amountStr = (res?.amount != null ? Number(res.amount).toFixed(2) : '');
    const params = new URLSearchParams({
      date,
      type: 'expense',
      amount: amountStr,
      account: '',
      category,
      description: res?.merchant || '消费',
      note: topLabel ? `分类:${topLabel}` : ''
    });
    navigate(`/add-transaction?${params.toString()}`);
  }

  const onImageClick = (e: React.MouseEvent, img: LocalImage) => {
    const container = e.currentTarget as HTMLDivElement;
    const rect = container.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    if (cropSelecting === img.id) {
      if (!cropStartRef.current) {
        cropStartRef.current = { x: px, y: py };
      } else {
        const sx = Math.min(cropStartRef.current.x, px);
        const sy = Math.min(cropStartRef.current.y, py);
        const ex = Math.max(cropStartRef.current.x, px);
        const ey = Math.max(cropStartRef.current.y, py);
        const cropPct = { x: sx, y: sy, w: ex - sx, h: ey - sy };
        setImages(list => list.map(it => it.id === img.id ? { ...it, cropPct } : it));
        setCropSelecting(null);
        cropStartRef.current = null;
        auditUI('bill_upload_crop_mark', { id: img.id, cropPct });
      }
      return;
    }
    if (maskSelecting === img.id) {
      if (!maskStartRef.current) {
        maskStartRef.current = { x: px, y: py };
      } else {
        const sx = Math.min(maskStartRef.current.x, px);
        const sy = Math.min(maskStartRef.current.y, py);
        const ex = Math.max(maskStartRef.current.x, px);
        const ey = Math.max(maskStartRef.current.y, py);
        const mask = { x: sx, y: sy, w: ex - sx, h: ey - sy };
        setImages(list => list.map(it => it.id === img.id ? { ...it, manualMasks: [...(it.manualMasks||[]), mask] } : it));
        setMaskSelecting(null);
        maskStartRef.current = null;
        auditUI('bill_upload_mask_mark', { id: img.id, mask });
      }
      return;
    }
  };

  async function processImage(file: File, rotation: number, cropPct: LocalImage['cropPct'], pixelate: boolean, manualMasks?: LocalImage['manualMasks']): Promise<Blob> {
    const img = await loadImage(URL.createObjectURL(file));
    const angle = rotation % 360;
    const rad = angle * Math.PI / 180;
    const sin = Math.abs(Math.sin(rad));
    const cos = Math.abs(Math.cos(rad));
    const w = img.width;
    const h = img.height;
    const cw = Math.round(w * cos + h * sin);
    const ch = Math.round(w * sin + h * cos);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = cw; canvas.height = ch;
    ctx.translate(cw/2, ch/2);
    ctx.rotate(rad);
    ctx.drawImage(img, -w/2, -h/2);
    // 裁剪
    let outCanvas = canvas;
    if (cropPct && cropPct.w > 0.01 && cropPct.h > 0.01) {
      const cx = Math.round(cw * cropPct.x);
      const cy = Math.round(ch * cropPct.y);
      const cW = Math.round(cw * cropPct.w);
      const cH = Math.round(ch * cropPct.h);
      const c2 = document.createElement('canvas');
      c2.width = Math.max(1, cW); c2.height = Math.max(1, cH);
      c2.getContext('2d')!.drawImage(canvas, cx, cy, cW, cH, 0, 0, cW, cH);
      outCanvas = c2;
    }
    if (pixelate) {
      const ctx2 = outCanvas.getContext('2d')!;
      const ph = Math.round(outCanvas.height * 0.08);
      const tmp = document.createElement('canvas');
      const pw = outCanvas.width;
      tmp.width = Math.max(1, Math.round(pw/40));
      tmp.height = Math.max(1, Math.round(ph/40));
      const tctx = tmp.getContext('2d')!;
      tctx.imageSmoothingEnabled = false;
      tctx.drawImage(outCanvas, 0, 0, pw, ph, 0, 0, tmp.width, tmp.height);
      ctx2.imageSmoothingEnabled = false;
      ctx2.drawImage(tmp, 0, 0, tmp.width, tmp.height, 0, 0, pw, ph);
      manualMasks?.forEach(m => {
        if (m.w < 0.005 || m.h < 0.005) return;
        const mx = Math.round(outCanvas.width * m.x);
        const my = Math.round(outCanvas.height * m.y);
        const mW = Math.round(outCanvas.width * m.w);
        const mH = Math.round(outCanvas.height * m.h);
        const region = ctx2.getImageData(mx, my, mW, mH);
        const scale = Math.max(4, Math.floor(Math.min(mW, mH)/12));
        const tmp2 = document.createElement('canvas');
        tmp2.width = Math.max(1, Math.round(mW/scale));
        tmp2.height = Math.max(1, Math.round(mH/scale));
        const t2 = tmp2.getContext('2d')!;
        t2.imageSmoothingEnabled = false;
        const rc = document.createElement('canvas'); rc.width = mW; rc.height = mH;
        rc.getContext('2d')!.putImageData(region,0,0);
        t2.drawImage(rc,0,0,mW,mH,0,0,tmp2.width,tmp2.height);
        ctx2.drawImage(tmp2,0,0,tmp2.width,tmp2.height,mx,my,mW,mH);
      });
    }
    return await new Promise<Blob>(resolve => outCanvas.toBlob(b=>resolve(b||new Blob()),'image/jpeg',0.92));
  }

  async function processImageWithOcr(file: File, rotation: number, cropPct: LocalImage['cropPct'], ocrBlocks: Array<{ text: string; bbox?: [number, number, number, number] }>, manualMasks?: LocalImage['manualMasks']): Promise<{ blob: Blob; pixelated: number }> {
    const img = await loadImage(URL.createObjectURL(file));
    const angle = rotation % 360;
    const rad = angle * Math.PI / 180;
    const sin = Math.abs(Math.sin(rad));
    const cos = Math.abs(Math.cos(rad));
    const w = img.width; const h = img.height;
    const cw = Math.round(w * cos + h * sin);
    const ch = Math.round(w * sin + h * cos);
    const base = document.createElement('canvas');
    base.width = cw; base.height = ch;
    const bctx = base.getContext('2d')!;
    bctx.translate(cw/2, ch/2); bctx.rotate(rad); bctx.drawImage(img,-w/2,-h/2);
    let work = base;
    if (cropPct && cropPct.w > 0.01 && cropPct.h > 0.01) {
      const cx = Math.round(cw * cropPct.x);
      const cy = Math.round(ch * cropPct.y);
      const cW = Math.round(cw * cropPct.w);
      const cH = Math.round(ch * cropPct.h);
      const c2 = document.createElement('canvas'); c2.width = Math.max(1,cW); c2.height = Math.max(1,cH);
      c2.getContext('2d')!.drawImage(base, cx, cy, cW, cH, 0,0,cW,cH); work = c2;
    }
    const ctx = work.getContext('2d')!;
    const sensitiveCard = /\b\d{12,19}\b/g; const sensitiveId = /\b\d{17}[\dXx]\b/g; const largeAmount = /\b\d{4,}\b/g;
    let pixelated = 0; const W = work.width, H = work.height;
    const createTmp = (w:number,h:number) => { try { const Off: any = (window as any).OffscreenCanvas; if (Off) return new Off(w,h) as any; } catch{} const c=document.createElement('canvas'); c.width=w; c.height=h; return c; };
    const pxFn = (x:number,y:number,w:number,h:number,text:string) => {
      if (!(sensitiveCard.test(text)||sensitiveId.test(text)||(largeAmount.test(text)&&parseInt(text.replace(/[^\d]/g,'')||'0')>5000))) return;
      const region = ctx.getImageData(x,y,w,h);
      const scale = Math.max(4, Math.floor(Math.min(w,h)/12));
      const tmp = createTmp(Math.max(1,Math.round(w/scale)), Math.max(1,Math.round(h/scale)));
      const tctx = (tmp as any).getContext('2d'); if(!tctx) return; (tctx as any).imageSmoothingEnabled=false;
      const rc = document.createElement('canvas'); rc.width=w; rc.height=h; rc.getContext('2d')!.putImageData(region,0,0);
      tctx.drawImage(rc as any,0,0,w,h,0,0,(tmp as any).width,(tmp as any).height);
      ctx.imageSmoothingEnabled=false;
      ctx.drawImage(tmp as any,0,0,(tmp as any).width,(tmp as any).height,x,y,w,h);
      pixelated++;
    };
    ocrBlocks.forEach(b=>{ if(!b.bbox) return; let [x,y,w,h]=b.bbox.map(Math.round) as [number,number,number,number]; x=Math.max(0,Math.min(x,W-1)); y=Math.max(0,Math.min(y,H-1)); w=Math.max(1,Math.min(w,W-x)); h=Math.max(1,Math.min(h,H-y)); pxFn(x,y,w,h,b.text); });
    manualMasks?.forEach(m=>{ if(m.w<0.005||m.h<0.005) return; const mx=Math.round(W*m.x); const my=Math.round(H*m.y); const mW=Math.round(W*m.w); const mH=Math.round(H*m.h); pxFn(mx,my,mW,mH,'MANUAL'); });
    const blob = await new Promise<Blob>(resolve=> work.toBlob(b=>resolve(b||new Blob()), 'image/jpeg',0.92));
    return { blob, pixelated };
  }
  

  const onDrop = useCallback((ev: React.DragEvent) => {
    ev.preventDefault();
    if (ev.dataTransfer.files?.length) onFiles(ev.dataTransfer.files);
  }, []);

  useEffect(() => {
    const prevent = (e: DragEvent) => e.preventDefault();
    window.addEventListener('dragover', prevent);
    window.addEventListener('drop', prevent);
    return () => {
      window.removeEventListener('dragover', prevent);
      window.removeEventListener('drop', prevent);
    };
  }, []);

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-semibold">票据上传识别</h1>
      <p className="text-sm text-gray-600">支持多图片拖拽/选择，基础旋转与简易裁剪（占位），调用分类与OCR接口。</p>
      {/* 文本快速分类 */}
      <section className="bg-white border rounded p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-medium">文本快速分类</h2>
          <span className="text-xs text-gray-500">粘贴短信/聊天/票据文本，快速解析</span>
        </div>
        <TextQuickClassify onParsed={(res)=>{
          setImages([{ id: `${Date.now()}`, file: new File([], 'text.txt'), url: '', rotation: 0, result: res }]);
        }} onGoto={(res)=> gotoAddTransactionFromResult(res)} />
      </section>
      <div
        onDragEnter={e => e.preventDefault()}
        onDragOver={e => e.preventDefault()}
        onDrop={onDrop}
        className="border-2 border-dashed rounded p-6 text-center cursor-pointer hover:border-primary"
        onClick={pickFiles}
      >
        <input ref={inputRef} type="file" multiple accept="image/*" className="hidden" onChange={e => onFiles(e.target.files)} />
        <span className="text-gray-500">拖拽图片到此或点击选择</span>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={desensitize} onChange={e => setDesensitize(e.target.checked)} />
          <span>启用上传前脱敏（占位）</span>
        </label>
        <span className="text-xs text-gray-500">将对疑似敏感区域进行像素化（示例占位，后续接入实际算法）</span>
      </div>
      {images.length > 0 && (
        <div className="grid md:grid-cols-3 sm:grid-cols-2 gap-4">
          {images.map(img => (
            <div key={img.id} className="border rounded p-2 space-y-2 bg-white shadow-sm">
              <div className="relative w-full aspect-[4/3] overflow-hidden bg-gray-50" onClick={(e) => onImageClick(e, img)}>
                <img
                  src={img.url}
                  style={{ transform: `rotate(${img.rotation}deg)` }}
                  className="absolute inset-0 w-full h-full object-contain select-none"
                  alt="bill"
                />
                {img.cropPct && (
                  <div
                    className="absolute border-2 border-primary/70 bg-primary/10"
                    style={{ left: `${img.cropPct.x*100}%`, top: `${img.cropPct.y*100}%`, width: `${img.cropPct.w*100}%`, height: `${img.cropPct.h*100}%` }}
                  />
                )}
                {cropSelecting === img.id && (
                  <div className="absolute inset-0 bg-primary/5 pointer-events-none">
                    <div className="absolute left-2 top-2 text-xs bg-white/80 px-2 py-1 rounded">点击两次选择裁剪区域</div>
                  </div>
                )}
              </div>
              <div className="flex gap-2 text-xs">
                <button onClick={() => rotate(img.id)} className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300">旋转</button>
                <button onClick={() => startCrop(img.id)} className={`px-2 py-1 rounded ${cropSelecting===img.id?'bg-primary text-white':'bg-gray-200 hover:bg-gray-300'}`}>{cropSelecting===img.id?'选择中…':'裁剪标记'}</button>
                <button onClick={() => startMask(img.id)} className={`px-2 py-1 rounded ${maskSelecting===img.id?'bg-primary text-white':'bg-gray-200 hover:bg-gray-300'}`}>{maskSelecting===img.id?'脱敏选择中…':'脱敏标记'}</button>
                <button onClick={() => remove(img.id)} className="px-2 py-1 rounded bg-red-100 text-red-600 hover:bg-red-200 ml-auto">删除</button>
              </div>
              {img.result && (
                <div className="text-xs space-y-1">
                  <div className="font-medium">分类结果</div>
                  <pre className="max-h-40 overflow-auto bg-gray-100 p-2 rounded text-[10px] leading-tight">{JSON.stringify(img.result, null, 2)}</pre>
                  <div className="pt-1">
                    <button
                      onClick={() => gotoAddTransactionFromResult(img.result)}
                      className="px-2 py-1 rounded bg-primary text-white"
                    >去新增交易</button>
                  </div>
                </div>
              )}
              {img.error && <div className="text-xs text-red-600">{img.error}</div>}
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-4">
        <button disabled={!images.length || uploading} onClick={classifyAll} className="px-4 py-2 rounded bg-primary text-white disabled:opacity-50">{uploading ? '识别中...' : '批量识别'}</button>
        <button disabled={!images.length} onClick={() => setImages([])} className="px-4 py-2 rounded bg-gray-200">清空</button>
      </div>
    </div>
  );
};

export default PageBillUpload;

// 子组件：文本快速分类
const TextQuickClassify: React.FC<{ onParsed: (res:any)=>void; onGoto:(res:any)=>void }>= ({ onParsed, onGoto }) => {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [result, setResult] = useState<any>(null);
  const handleParse = async () => {
    if (!text.trim()) return;
    setLoading(true); setError(null);
    try {
      let res: any;
      try {
        const r = await classifyText(text.trim());
        res = r.data;
      } catch {
        // 回退到聊天网关解析
        res = await classifyTextQuick(text.trim());
      }
      setResult(res); onParsed(res);
      auditUI('bill_text_quick_classify_success', {});
    } catch (e:any) {
      setError(e?.message || '解析失败');
      auditError('bill_text_quick_classify_fail', e);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="space-y-2">
      <textarea className="w-full border rounded p-2 text-sm min-h-[84px]" placeholder="示例：微信支付 超市Walmart 24.50元 2024-06-12 18:30 餐饮" value={text} onChange={e=>setText(e.target.value)} />
      <div className="flex gap-2 items-center">
        <button onClick={handleParse} disabled={loading||!text.trim()} className="px-3 py-1.5 rounded bg-primary text-white disabled:opacity-50">{loading?'解析中…':'快速解析'}</button>
        {error && <span className="text-xs text-red-600">{error}</span>}
        {!!result && <button onClick={()=> onGoto(result)} className="text-xs text-primary underline">去新增交易</button>}
      </div>
      {!!result && <pre className="bg-gray-50 border rounded p-2 max-h-40 overflow-auto text-[11px] leading-tight">{JSON.stringify(result, null, 2)}</pre>}
      <p className="text-[11px] text-gray-500">提示：仅输出结构化结果，AI 解析仅供参考，不构成建议；请避免粘贴含敏感信息的原文。</p>
    </div>
  );
};
