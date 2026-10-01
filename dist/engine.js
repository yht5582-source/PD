'use strict';
const PD = (() => {
  const types={low:'低運輸',lowAvg:'較低運輸',highAvg:'較高運輸',high:'高運輸'};
  const num=x=>x===''||x==null?null:Number(x);
  function pet(d){
    const ratio=num(d.dp), input=num(d.petIn), output=num(d.petOut);
    const transport=ratio===null?null:ratio<0.5?'low':ratio<0.65?'lowAvg':ratio<0.82?'highAvg':'high';
    const chosen=d.petClass&&d.petClass!=='auto'?d.petClass:transport;
    const uf=input!==null&&output!==null?output-input:null;
    const standard=input===2000;
    const threshold=d.petConcentration==='4.25'?400:d.petConcentration==='2.5'?100:null;
    const g0=num(d.g0),g4=num(d.g4),na0=num(d.na0),na1=num(d.na1);
    const dip=d.petConcentration==='4.25'&&na0!==null&&na1!==null?na0-na1:null;
    return {ratio,transport:chosen,label:types[chosen]||'未判讀',uf,threshold,standard,lowUf:standard&&uf!==null&&threshold!==null&&uf<threshold,glucose:g0>0&&g4!==null?g4/g0:null,dip,lowDip:dip!==null&&dip<=5,outside:ratio!==null&&(ratio<0.34||ratio>1.03)};
  }
  function assess(d){
    let missing=[],blocks=[],warnings=[],reasons=[],adjustments=[];
    const required={age:'年齡',height:'身高',weight:'體重',urine:'每日尿量',volume:'容量狀態',symptom:'尿毒症症狀',access:'導管／起始狀態',apdReady:'APD 可行性',capdReady:'CAPD 可行性',potassium:'K',bicarb:'HCO₃⁻',fill:'醫師確認可耐受灌注量',calcium:'葡萄糖液鈣配方'};
    if(d.stage!=='initial')Object.assign(required,{currentMode:'目前方式',uf:'每日 PD 淨超濾',currentFill:'目前灌注量',currentCycles:'目前交換／循環次數',adherence:'執行狀態'});
    if(d.stage==='pet')Object.assign(required,{petDate:'PET 日期',petConcentration:'PET 濃度',petIn:'PET 灌入量',petOut:'PET 引流量',dp:'4 小時 D/P Cr',crCorrection:'Cr 校正確認'});
    for(const [key,label] of Object.entries(required))if(d[key]===''||d[key]==null)missing.push(label);
    if(missing.length)return {missing,blocks,warnings,reasons,adjustments};
    const age=num(d.age),fill=num(d.fill),k=num(d.potassium),hco=num(d.bicarb);
    if(age<18||age>120)blocks.push('本版僅適用成人慢性 PD，年齡須介於 18–120 歲。');
    if(fill<500||fill>2500)blocks.push('灌注量超出本版可用範圍 500–2500 mL，需人工處方。');
    if(d.acute||k>=6.5||hco<10)blocks.push('需即時評估的急性狀況：暫停例行慢性 PD 草案，評估急性處置與適當透析支持。');
    if(d.infection)blocks.push('疑似腹膜炎：先評估透析液、感染與治療，暫停例行處方最佳化。');
    if(d.access==='urgent')blocks.push('新置管／急起始 PD 需專屬低灌注量、仰臥與漏液監測流程；本版不自動套用常規維持處方。');
    if(d.access==='problem'||d.adherence==='drain')blocks.push('先處理導管、引流、漏液或疝氣問題，不能以增加濃度／劑量直接取代評估。');
    if(d.apdReady==='no'&&d.capdReady==='no')blocks.push('兩種模式目前皆無法執行，需建立輔助 PD／照護支持或討論其他方式。');
    if(d.stage==='pet'&&(d.crCorrection!=='yes'||d.petIssue==='yes'))blocks.push('PET 校正或試驗條件尚未確認，請先核對／重測，或切換治療中調整流程。');
    const p=d.stage==='pet'?pet(d):null;
    if(p&&(p.ratio<=0||p.ratio>1.2))blocks.push('D/P Cr 超出有效輸入範圍。');
    if(d.dose==='incremental'){
      if(!d.incrementalSafe||num(d.renalKtv)===null)missing.push('增量式 PD：殘餘腎臟 Kt/V 與醫師評估確認');
      if(d.volume!=='euvolemic'||d.symptom==='yes'||k>5.5||hco<22)blocks.push('存在容量／清除或生化控制問題，暫不產生增量式低劑量模板。');
    }
    if(blocks.length||missing.length)return {missing,blocks,warnings,reasons,adjustments,pet:p};
    let apd=0,capd=0;
    if(p){
      if(['high','highAvg'].includes(p.transport)){apd+=3;reasons.push('PET 運輸較快：APD 較短留置可降低葡萄糖長留置後的水分再吸收風險。');}
      else {capd+=3;reasons.push('PET 運輸較慢：優先保留較長留置以利溶質平衡；CAPD 較容易提供長留置。');}
      if(p.lowUf)warnings.push('標準 PET 淨超濾低於濃度對應閾值。先檢查機械原因、漏液、容量與膜功能；不等同必須轉 HD。');
      if(!p.standard)warnings.push('PET 灌入量非 2 L，本版不套用標準淨超濾閾值。');
      if(p.lowDip)warnings.push('4.25% PET 的 1 小時 sodium dip ≤5 mmol/L：需進一步評估低葡萄糖滲透導水能力，不能單憑此結果確診。');
      if(p.outside)warnings.push('D/P Cr 超出原始參考族群範圍，請核對檢驗與試驗流程。');
    }else reasons.push('尚無有效 PET：模式先依治療負擔、可行性、病人偏好與實測反應決定，不假設運輸型態。');
    if(d.preference==='APD'){apd+=4;reasons.push('病人偏好夜間 APD，以保留白天活動時間。');}
    if(d.preference==='CAPD'){capd+=4;reasons.push('病人偏好手動交換，將其納入方式選擇。');}
    if(d.currentMode==='APD')apd+=1;
    if(d.currentMode==='CAPD')capd+=1;
    const hours=num(d.sleep),fast=p&&['high','highAvg'].includes(p.transport),slow=p&&['low','lowAvg'].includes(p.transport);
    if(d.apdReady==='no')apd=-100;
    if(d.capdReady==='no')capd=-100;
    if(hours!==null&&hours<8){capd+=2;warnings.push('夜間可用時間少於 8 小時：APD 留置與清除需個別設計，勿以增加循環次數取代評估。');}
    let mode=apd>capd?'APD':'CAPD';
    if(d.apdReady==='no')mode='CAPD';if(d.capdReady==='no')mode='APD';
    if(mode==='APD'&&(hours===null||hours<4||hours>14))missing.push('APD 可用夜間時間（4–14 小時）');
    if(d.adherence==='missed')adjustments.push('先改善漏做／中斷原因與實際完成量，再決定是否增加處方。');
    if(d.volume==='overload')adjustments.push('容量過多：核對鹽水攝取、目標體重、尿量與每日淨超濾；評估短留置／長留置用液，避免只靠長期提高葡萄糖濃度。');
    if(d.volume==='depleted'){warnings.push('疑似容量不足：先重新評估目標體重、攝取及用藥，不自動提高滲透濃度。');adjustments.push('液體濃度以 1.5% 起點，醫師核對是否須減少超濾。');}
    if(d.symptom==='yes'||k>5.5||hco<22)adjustments.push('清除／生化控制需改善：核對執行、收集、營養與用藥，評估增加交換量或時間。');
    const r=num(d.renalKtv),q=num(d.pdKtv),ktv=r!==null&&q!==null?r+q:null;
    if(ktv!==null&&ktv<1.7)warnings.push('實測總 weekly Kt/V <1.7：需再評估清除及收集品質；不以此單一數字決定加量。');
    if(d.dose==='standard'&&num(d.urine)>=500&&d.volume==='euvolemic'&&d.symptom==='none')warnings.push('仍有尿量且臨床穩定，可評估增量式 PD；需先取得殘餘清除率，尿量本身不夠。');
    if(d.calcium==='low')warnings.push('Low Ca 已設定 2.5 mEq/L；須整合 Ca、P、PTH、鈣劑與維生素 D，低鈣血症時重新評估配方。');
    const alternate=mode==='APD'?'CAPD':'APD', altReady=d[alternate==='APD'?'apdReady':'capdReady']==='yes';
    reasons.push(mode==='APD'?'APD 可行，依 PET 與偏好排列為優先方式；具體劑量需以實測療效調整。':'CAPD 可行，依較長留置、偏好或既有模式排列為優先方式。');
    if(mode==='APD'&&slow)warnings.push('較慢運輸者採 APD：避免過多短循環，保留足夠夜間留置並評估日間交換。');
    if(mode==='CAPD'&&fast)warnings.push('较快運輸者採 CAPD：避免葡萄糖液過長留置，考慮縮短交換或以 icodextrin 作長留置。');
    return {missing,blocks,warnings,reasons,adjustments,pet:p,mode,alternate:altReady?alternate:null,ktv,bsa:Math.sqrt(num(d.height)*num(d.weight)/3600),fast,slow};
  }
  function initialRx(d,a){
    const incremental=d.dose==='incremental',fill=num(d.fill),hours=num(d.sleep)||8;
    const concentration=d.volume==='overload'?2.5:1.5;
    const long=d.longSolution==='auto'?((a.fast||d.volume==='overload')?'ico':'glucose'):d.longSolution;
    const rx={mode:a.mode,fill,calcium:d.calcium,hours:Math.min(hours,a.slow?10:8),cycles:incremental?3:a.fast?5:a.slow?3:4,lastVolume:incremental&&long!=='ico'?0:fill,lastKind:incremental&&long!=='ico'?'dry':long,lastConcentration:concentration,nightConcentration:concentration,prime:null,rows:[]};
    if(a.mode==='CAPD'){
      const n=incremental?3:a.fast?5:4;
      const useIco=long==='ico';
      for(let i=0;i<n;i++)rx.rows.push({volume:fill,dwell:useIco?(i===n-1?8:16/(n-1)):incremental?6:24/n,kind:i===n-1&&useIco?'ico':'glucose',concentration,lowCa:d.calcium==='low'});
    } else if(long==='dry'){rx.lastVolume=0;rx.lastKind='dry';}
    return rx;
  }
  function chooseProduct(catalog,mode,row){
    const selected=catalog.find(x=>x.code===row.productCode&&x.mode===mode&&x.kind===row.kind&&x.bag>=row.volume&&(row.kind!=='glucose'||(x.concentration===Number(row.concentration)&&x.lowCa===row.lowCa)));
    if(selected)return selected;
    return catalog.filter(x=>x.mode===mode&&x.kind===row.kind&&(row.kind!=='glucose'||(x.concentration===Number(row.concentration)&&x.lowCa===row.lowCa))&&x.bag>=row.volume).sort((a,b)=>a.bag-b.bag)[0];
  }
  function validateRx(rx,d,a,catalog){
    const errors=[],warnings=[],bags=new Map(); let total=0,glucose=0,aa=0,dwell=0,icoCount=0;
    function add(product,count,used){if(!product){errors.push('處方中有院內沒有的配方／容量組合。');return;}const prev=bags.get(product.code)||{product,count:0,used:0};prev.count+=count;prev.used+=used;bags.set(product.code,prev);}
    const limit=Number(d.fill);
    function volume(v){if(!Number.isFinite(v)||v<500||v>limit)errors.push('每次灌注量須為 500 mL 以上，且不得超過醫師確認可耐受量。');}
    function solution(kind,vol,conc){if(kind==='glucose')glucose+=vol*conc/100;if(kind==='aa')aa+=vol*0.011;}
    if(rx.mode==='CAPD'){
      if(rx.rows.length<1||rx.rows.length>6)errors.push('CAPD 交換次數超出本版範圍。');
      for(const row of rx.rows){volume(row.volume);if(!Number.isFinite(row.dwell)||row.dwell<=0)errors.push('留置時間須大於 0。');dwell+=row.dwell;total+=row.volume;solution(row.kind,row.volume,row.concentration);const product=chooseProduct(catalog,'CAPD',row);add(product,1,row.volume);if(row.kind==='ico'){icoCount++;if(row.dwell<6||row.dwell>12)errors.push('CAPD icodextrin 長留置請設定 6–12 小時。');}if(row.kind==='aa'&&(Number(d.bicarb)<22||Number(d.potassium)<3||d.symptom==='yes'||num(d.bun)===null||Number(d.bun)>106.4))errors.push('Nutrineal 須核對 BUN、代謝性酸中毒、尿毒症症狀及低血鉀；目前資料不適合產生此草案。');if(row.kind==='aa')warnings.push('Nutrineal：2 L 內含 22 g 胺基酸，非等同全數吸收。確認營養需求、餐食熱量、肝功能、過敏及胺基酸代謝禁忌；本版不自動加入。');}
      if(dwell>24.01)errors.push('CAPD 各次留置時間合計超過 24 小時。');
      if(dwell<23.99&&d.dose!=='incremental')errors.push('常規 CAPD 留置合計須為 24 小時；有計畫乾腹時請採增量式並完成確認。');
      if(rx.rows.filter(x=>x.kind==='aa').length>1)errors.push('本版 Nutrineal 僅允許每日一次，額外使用需人工評估。');
    }else{
      volume(rx.fill);if(!Number.isInteger(rx.cycles)||rx.cycles<1||rx.cycles>12)errors.push('APD 循環次數須為 1–12 的整數。');
      if(!Number.isFinite(rx.hours)||rx.hours<4||rx.hours>Number(d.sleep))errors.push('APD 時數須介於 4 小時與病人可用夜間時間之間。');
      if(!Number.isFinite(rx.prime)||rx.prime<0||rx.prime>2000)errors.push('請填入管路預充／額外準備量（mL），依實際機器耗材確認。');
      if(!Number.isFinite(rx.fillDrain)||rx.fillDrain<=0||rx.fillDrain>90)errors.push('請填入每循環灌入＋引流時間（分鐘）。');
      if(!Number.isFinite(rx.initialDrain)||rx.initialDrain<0||rx.initialDrain>90||!Number.isFinite(rx.lastFillTime)||rx.lastFillTime<0||rx.lastFillTime>90)errors.push('請填入初始引流與最後灌注時間（分钟）；無最後灌注時填 0。');
      const netMinutes=rx.hours*60-rx.cycles*rx.fillDrain-rx.initialDrain-rx.lastFillTime;
      if(netMinutes<=0)errors.push('灌入／引流與初始／最後灌注占滿治療時間，無有效留置。');
      else if(netMinutes/rx.cycles<60)warnings.push('估算每循環留置少於 60 分鐘，需核對溶質清除、鈉移除與實際機器紀錄。');
      const night=rx.fill*rx.cycles; total=night;solution('glucose',night,rx.nightConcentration);
      const sharedLast=rx.lastKind==='glucose'&&Number(rx.lastConcentration)===Number(rx.nightConcentration);
      const planned=night+(sharedLast?rx.lastVolume:0);
      const products=catalog.filter(x=>x.mode==='APD'&&x.kind==='glucose'&&x.concentration===Number(rx.nightConcentration)&&x.lowCa===(d.calcium==='low')).sort((a,b)=>b.bag-a.bag);
      if(products.length){const needed=planned+(Number.isFinite(rx.prime)?rx.prime:0);let best=null;const small=products.find(x=>x.bag===2500),big=products.find(x=>x.bag===5000);for(let b=0;b<=Math.ceil(needed/5000)+1;b++)for(let s=0;s<=(small?Math.ceil(needed/2500)+1:0);s++){const supply=(big?b*5000:0)+(small?s*2500:0);if(supply>=needed&&(!best||supply<best.supply||(supply===best.supply&&b+s<best.b+best.s)))best={b,s,supply};}if(best){if(best.b)add(big,best.b,Math.min(planned,best.b*5000));if(best.s)add(small,best.s,Math.max(0,planned-best.b*5000));}else errors.push('無可用 APD 夜間袋裝組合。');}else errors.push('院內沒有選定 APD 夜間濃度／鈣配方。');
      if(rx.lastKind!=='dry'){
        volume(rx.lastVolume);total+=rx.lastVolume;solution(rx.lastKind,rx.lastVolume,rx.lastConcentration);
        if(!sharedLast){const product=chooseProduct(catalog,'APD',{kind:rx.lastKind,volume:rx.lastVolume,concentration:rx.lastConcentration,lowCa:d.calcium==='low'});add(product,1,rx.lastVolume);}
        else warnings.push('最後灌注與夜間液相同：袋數按合併供應量估算，實機須確認最後灌注可使用該來源。');
        if(rx.lastKind==='ico'){icoCount++;if(24-rx.hours<14||24-rx.hours>16)errors.push('本版 APD icodextrin 日間長留置以 14–16 小時安排；超出時需另設日間交換／人工處方。');}
        if(rx.lastKind==='glucose'&&a.fast)warnings.push('較快運輸者日間長留置葡萄糖液可能造成再吸收，需評估 icodextrin 或日間交換。');
      }
    }
    if(icoCount>1)errors.push('Icodextrin 本版限每 24 小時一次長留置。');
    if(icoCount&&!d.icoSafe)errors.push('請確認 icodextrin 適用性與血糖機相容性後再完成處方。');
    if(icoCount)warnings.push('Icodextrin：使用葡萄糖專一且相容的血糖檢測方法；避免 maltose 干擾造成假性高血糖與錯誤胰島素治療。');
    if(a.fast&&rx.mode==='CAPD'&&rx.rows.some(x=>x.kind==='glucose'&&x.dwell>6))warnings.push('較快運輸者有 >6 小時葡萄糖留置，需以實測超濾評估再吸收。');
    if(d.volume==='depleted'&&((rx.mode==='APD'&&rx.nightConcentration>1.5)||rx.rows.some(x=>x.kind==='glucose'&&x.concentration>1.5)))warnings.push('容量不足狀態仍使用較高葡萄糖濃度，需重新評估。');
    return {errors:[...new Set(errors)],warnings:[...new Set(warnings)],bags:[...bags.values()],total,glucose,aa,dwell,icoCount};
  }
  return {num,pet,assess,initialRx,validateRx,chooseProduct,types};
})();
if(typeof module!=='undefined')module.exports=PD;
