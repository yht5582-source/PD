'use strict';
// 教學分頁：示範病例、考題、心智圖。病例結果由 engine.js 即時計算；expect 與考題答案由 tests.cjs 對照 engine 檢查。
const PDTeach = (() => {
  const E = typeof PD !== 'undefined' ? PD : require('./engine.js');
  const CAT = typeof CATALOG !== 'undefined' ? CATALOG : require('./catalog.js');

  const SOURCES = {
    ispd2020: {tag: 'ISPD 2020', kind: 'intl', read: '全文', title: 'Brown EA, et al. Prescribing high-quality goal-directed peritoneal dialysis. Perit Dial Int 2020;40(3)', href: 'https://doi.org/10.1177/0896860819895364'},
    rkf: {tag: 'ISPD RKF 2020', kind: 'intl', read: '摘要', title: 'Chen CH, et al. The role of preserving residual kidney function. Perit Dial Int 2020;40(3):274–281', href: 'https://doi.org/10.1177/0896860819893821'},
    ispd2021: {tag: 'ISPD 2021', kind: 'intl', read: '關鍵建議', title: 'ISPD recommendations for the evaluation of peritoneal membrane dysfunction in adults. Perit Dial Int 2021', href: 'https://doi.org/10.1177/0896860820982218'},
    ispd2022: {tag: 'ISPD 2022', kind: 'intl', read: '全文', title: 'Li PKT, et al. ISPD peritonitis guideline recommendations: 2022 update. Perit Dial Int 2022', href: 'https://doi.org/10.1177/08968608221080586'},
    ico: {tag: 'Icodextrin SmPC', kind: 'label', read: '全文（英國版）', title: 'Extraneal SmPC（英國 emc；台灣仿單未核對）', href: 'https://www.medicines.org.uk/emc/product/1819/smpc'},
    aa: {tag: 'Nutrineal SmPC', kind: 'label', read: '全文（英國版）', title: 'Nutrineal PD4 SmPC（英國 emc；台灣仿單未核對）', href: 'https://www.medicines.org.uk/emc/product/1843/smpc'},
    tool: {tag: '工作站規則', kind: 'tool', read: '本站', title: '本工作站的透明規則與院內品項，非經驗證的預測模型', href: ''},
    calc: {tag: '公式計算', kind: 'tool', read: '本站', title: '教學用手算，工作站本身不計算此數值', href: ''}
  };

  // 所有 input 的鍵即表單欄位 id；symptoms 另外處理。machine 為 APD 機器時間的示範值，實際須依機器紀錄。
  const MACHINE = {fillDrain: 25, initialDrain: 15, lastFillTime: 10, prime: 500};
  const CASES = [
    {id: 'c1', title: '上班族要開始 PD，還沒做過 PET', stage: 'initial',
      story: '46 歲男性，第一次開始 PD。白天全職上班，希望夜間用機器。導管已癒合，無尿毒症症狀，容量穩定，每日尿量 900 mL。',
      question: '沒有 PET，可以開處方嗎？該選哪一種方式？',
      input: {patient: 'DEMO-C1', age: 46, sex: 'male', height: 172, weight: 70, urine: 900, volume: 'euvolemic', access: 'healed', preference: 'APD', apdReady: 'yes', capdReady: 'yes', sleep: 9, potassium: 4.4, bicarb: 23, serumCr: 8.2, egfr: 7, bun: 62, fill: 2000, calcium: 'standard'},
      symptoms: ['none'], machine: MACHINE,
      expect: {mode: 'APD', rx: 'APD 8h × 4 循環 × 2000mL 1.5%', total: 10000},
      steps: [
        {t: '初始處方不需要 PET。工作站寫明「尚無有效 PET」，不假設運輸型態，由偏好與可行性排序。', s: 'tool'},
        {t: '偏好 APD（+4）使 APD 4 分、CAPD 0 分。分數只是透明的排序，不是預後分數。', s: 'tool'},
        {t: '處方要納入本人的生活與家庭照護考量，以共同決策訂定目標。', s: 'ispd2020'},
        {t: '第一次 PET 排在開始 PD 後 6–12 週。', s: 'ispd2021'},
        {t: '可用 9 小時，模板上限仍是 8 小時。留置與引流時間是示範值，要改成實機紀錄。', s: 'tool'}
      ],
      variants: [
        {label: '沒有偏好', patch: {preference: 'either'}, expect: 'CAPD', note: '同分時以 CAPD 為起點。白天工作要靠「偏好」欄表達，本版沒有另外計分。'},
        {label: '家中無法配合機器（APD 不可行）', patch: {apdReady: 'no'}, expect: 'CAPD', note: '可行性優先於偏好。'}
      ]},
    {id: 'c2', title: '尿量還不錯，想從低劑量開始', stage: 'initial',
      story: '68 歲女性，156 cm、54 kg，每日尿量 1200 mL，容量穩定，無症狀。已做完整 24 小時尿液收集：UUN 320、尿 Cr 52.7 mg/dL；血 BUN 58、Cr 6.1 mg/dL。她希望治療負擔少一點，醫師考慮增量式 PD。',
      question: '尿量夠多就能用增量式嗎？工作站需要什麼才會產生低劑量模板？',
      input: {patient: 'DEMO-C2', age: 68, sex: 'female', height: 156, weight: 54, urine: 1200, volume: 'euvolemic', access: 'healed', preference: 'CAPD', apdReady: 'yes', capdReady: 'yes', sleep: 8, potassium: 4.3, bicarb: 24, serumCr: 6.1, egfr: 7, bun: 58, ccr: 7.2, kru: 4.6, renalKtv: 1.66, collection: 'valid', fill: 1500, calcium: 'standard', dose: 'incremental', incrementalSafe: true},
      symptoms: ['none'],
      expect: {mode: 'CAPD', rx: 'CAPD 3 次／日：1500mL 1.5% 6h', total: 4500},
      steps: [
        {t: '有殘餘腎功能時可從低劑量開始，之後隨腎功能下降或臨床需要加量，以減少治療負擔。', s: 'ispd2020'},
        {t: '工作站不看尿量本身，要有完整定時尿實測的 Kru 或腎臟 Kt/V、腎功能穩定及醫師確認。', s: 'tool'},
        {t: '殘餘腎功能以 24 小時尿的肌酐與尿素清除率平均值評估，理想上每季一次。本例（7.2＋4.6）/2＝5.9 mL/min。', s: 'rkf'},
        {t: '手算：Watson V 27.9 L；腎臟 weekly Kt/V＝320/58 × 1.2 L × 7 / 27.9＝1.66。', s: 'calc'},
        {t: '模板為 CAPD 3 次，每次 6 小時，其餘 6 小時乾腹。之後要追蹤殘餘清除、症狀與容量，適時加量。', s: 'tool'}
      ],
      variants: [
        {label: '只有尿量，沒有完整收集', patch: {collection: 'unknown', ccr: '', kru: '', renalKtv: ''}, expect: '待補', note: '尿量或 eGFR 不能單獨證明低劑量足夠。'},
        {label: 'K 5.8 mmol/L', patch: {potassium: 5.8}, expect: '增量式', note: 'K >5.5 不符合條件，改用一般模板。'},
        {label: '合併水腫', patch: {volume: 'overload'}, expect: '增量式', note: '請改用一般草案模板，穩定後再評估。'}
      ]},
    {id: 'c3', title: 'CAPD 一直水腫，超濾量不夠', stage: 'follow',
      story: '63 歲女性，糖尿病使用胰島素。CAPD 2 L × 4 次、2.5% 葡萄糖液，夜間也是葡萄糖液。完全照處方做，下肢水腫，每日淨超濾 350 mL，尿量 300 mL。估計攝取 1500 mL、腎外流失 500 mL，醫師確認多餘水分 3 kg，預定 10 天矯正。',
      question: '先改什麼？改之前要先確認什麼？',
      input: {patient: 'DEMO-C3', age: 63, sex: 'female', height: 158, weight: 66, target: 63, urine: 300, volume: 'overload', access: 'healed', preference: 'either', apdReady: 'yes', capdReady: 'yes', sleep: 8, potassium: 4.1, bicarb: 25, serumCr: 9, bun: 60, intake: 1500, otherLoss: 500, excessFluid: 3, correctionDays: 10, fluidGoalSafe: true, fill: 2000, calcium: 'standard', icoSafe: true, currentMode: 'CAPD', uf: 350, currentFill: 2000, currentCycles: 4, currentConcentration: '2.5', currentLast: 'glucose', adherence: 'good'},
      symptoms: ['none'],
      expect: {mode: 'CAPD', rx: '2000mL Icodextrin 8h', note: '低於本次目標 650', ufGoal: 1000, glucose: 150},
      steps: [
        {t: '先算目標：1500 − 300 − 500 ＋ 3000/10 ＝ 1000 mL/day，實測 350，差 650。這是工作站的收支估計，不是預測模型。', s: 'tool'},
        {t: '長留置有超濾困難時，每日一次 icodextrin 可作為高濃度葡萄糖液的替代。', s: 'ispd2020'},
        {t: 'Icodextrin 限每 24 小時一次，CAPD 留置 6–12 小時。工作站排 8 小時，另外 3 次平分 16 小時（5.3 小時）。', s: 'ico'},
        {t: '她用胰島素：GDH-PQQ、GDO 血糖機會因 maltose 假性偏高，可能多打胰島素造成低血糖；停藥後最長 2 週仍可能受影響。部分 GDH-FAD 機型也會。', s: 'ico'},
        {t: '還有尿量時，loop 利尿劑也可協助維持水分平衡；但要避免容量不足，以免加速殘餘腎功能下降。', s: 'rkf'},
        {t: '草案重新依目前資料產生，不是比較現行處方後只改一項。採用前請對照現行處方，再實測評估。', s: 'tool'}
      ],
      variants: [
        {label: '尚未勾選 icodextrin 適用性', patch: {icoSafe: false}, expect: '請確認', note: '草案有紅字，要勾選後才能輸出。'},
        {label: '其實常漏做', patch: {adherence: 'missed'}, pick: '漏做', expect: '漏做', note: '草案仍會列出，但要先處理實際執行量，不要直接採用。'},
        {label: '長留置指定用葡萄糖液', patch: {longSolution: 'glucose'}, expect: '2.5% 6h', note: '灌入葡萄糖由 150 g 增加到 200 g，且長留置有再吸收的疑慮。'}
      ]},
    {id: 'c4', title: '胃口變差、很累，Kt/V 1.55', stage: 'follow',
      story: '58 歲男性，CAPD 2 L × 4 次、1.5%，照處方做，容量穩定，尿量降到 400 mL。近兩個月食慾下降、疲倦，影響日常生活。醫師評估可能與尿毒症相關，確認可耐受 2.5 L。完整收集：腎臟 Kt/V 0.25、腹膜 Kt/V 1.30。',
      question: 'Kt/V 低於 1.7 就是答案嗎？怎麼加量？',
      input: {patient: 'DEMO-C4', age: 58, sex: 'male', height: 170, weight: 72, urine: 400, volume: 'euvolemic', access: 'healed', preference: 'either', apdReady: 'yes', capdReady: 'yes', sleep: 8, potassium: 4.6, bicarb: 24, serumCr: 11, bun: 70, ccr: 1.4, kru: 0.98, renalKtv: 0.25, pdKtv: 1.3, collection: 'valid', dialysateCollection: 'valid', fill: 2500, calcium: 'standard', currentMode: 'CAPD', uf: 900, currentFill: 2000, currentCycles: 4, currentConcentration: '1.5', currentLast: 'glucose', adherence: 'good'},
      symptoms: ['appetite', 'fatigue'], severity: 'moderate', attribution: 'likely',
      expect: {mode: 'CAPD', rx: 'CAPD 4 次／日：2500mL 1.5% 6h', warning: '<1.7', ktv: 1.55},
      steps: [
        {t: '總 Kt/V＝0.25＋1.30＝1.55。沒有任何清除值能保證透析足夠，V 的估計本身也有誤差。', s: 'ispd2020'},
        {t: '要加量時，建議不只一項證據。本例有食慾差、疲倦，又有殘餘腎功能下降，才支持加量。', s: 'ispd2020'},
        {t: '單一症狀可能有其他原因，要一併考慮透析與非透析因素。', s: 'ispd2020'},
        {t: '草案的灌注量取自醫師確認的可耐受量（本例 2.5 L），其餘是模板的 4 次、每次 6 小時。工作站不按 Kt/V 比例放大，也不自動加第 5 次；要加次數由醫師在處方區修改。', s: 'tool'},
        {t: '加量後要看症狀是否改善，並重測清除，不只看數字。', s: 'tool'}
      ],
      variants: [
        {label: '可耐受量只有 2 L', patch: {fill: 2000}, expect: 'CAPD 4 次／日：2000mL', note: '草案與現行相同。要加量請在處方區把交換次數改成 5，留置時間會重新分配。'},
        {label: '症狀原因尚未確定', patch: {attribution: 'uncertain'}, pick: '貧血', expect: '貧血', note: '先鑑別其他原因，不直接視為清除不足。'},
        {label: '完全沒有症狀，容量與營養都好', patch: {symptoms: ['none'], severity: '', attribution: ''}, pick: '<1.7', expect: '不以此單一數字', note: 'ISPD 2020 認為此時不必只為達到清除目標而改處方。草案灌注量仍取自可耐受量欄，不打算加量時要填回現行 2 L。'}
      ]},
    {id: 'c5', title: 'PET：高運輸且超濾不足', stage: 'pet',
      story: '55 歲男性，CAPD 第 6 年，2 L × 4 次、2.5%，反覆水腫。淨超濾 200 mL/day，尿量 200 mL。4.25% 標準 2 L PET：引流 2300 mL，D/P Cr 0.88；1 小時透析液 Na 132→129。導管引流正常，可用夜間 9 小時。',
      question: '怎麼解讀這份 PET？處方怎麼改？下一步要和他談什麼？',
      input: {patient: 'DEMO-C5', age: 55, sex: 'male', height: 175, weight: 78, urine: 200, volume: 'overload', access: 'healed', preference: 'either', apdReady: 'yes', capdReady: 'yes', sleep: 9, potassium: 3.9, bicarb: 25, serumCr: 10, bun: 55, intake: 1200, otherLoss: 400, excessFluid: 2, correctionDays: 14, fluidGoalSafe: true, fill: 2000, calcium: 'standard', icoSafe: true, currentMode: 'CAPD', uf: 200, currentFill: 2000, currentCycles: 4, currentConcentration: '2.5', currentLast: 'glucose', adherence: 'good', petDate: '2026-09-15', petConcentration: '4.25', petIn: 2000, petOut: 2300, dp: 0.88, crCorrection: 'yes', petClass: 'auto', petIssue: 'no', g0: 3800, g4: 900, na0: 132, na1: 129},
      symptoms: ['none'], machine: MACHINE,
      expect: {mode: 'APD', rx: 'APD 8h × 5 循環 × 2000mL 2.5%；日間 Icodextrin 2000mL', petUf: 300, dip: 3, cycleDwell: 66},
      steps: [
        {t: 'D/P Cr 0.88 屬快速（高）運輸。快速運輸與較低存活相關，部分原因是超濾減少、再吸收增加。', s: 'ispd2021'},
        {t: '4.25% PET 淨超濾 300 mL，低於 400 mL，懷疑超濾不足。也要排除機械問題與漏液，不能直接當作膜衰竭。', s: 'ispd2021'},
        {t: 'Sodium dip 3 mmol/L（≤5）指向超濾不足，與低滲透導水能力相符。', s: 'ispd2021'},
        {t: '對策是縮短葡萄糖留置、用 icodextrin 或提高濃度。APD 加 icodextrin 可能減輕快速運輸的死亡風險（practice point）。', s: 'ispd2021'},
        {t: '工作站排序：快速運輸 APD +3、現行 CAPD +1。草案每循環留置約 66 分鐘，日間 icodextrin 16 小時，在 14–16 小時範圍內。改方式要重新訓練。', s: 'tool'},
        {t: '幾乎無尿又有膜功能問題，可能需要高濃度液或轉 HD。PD 時間長者要討論包囊性腹膜硬化風險。', s: 'ispd2021'}
      ],
      variants: [
        {label: '夜間只能 6 小時', patch: {sleep: 6}, expect: '優先 CAPD', note: '可用時間 <8 小時 CAPD +2，同分時以 CAPD 為起點，改以 8 小時 icodextrin 處理。'},
        {label: '夜間只能 6 小時，但堅持 APD', patch: {sleep: 6, preference: 'APD'}, expect: '日間 2.5%', note: '日間留置 18 小時超出範圍，不自動用 icodextrin。'},
        {label: 'D/P Cr 0.45（低運輸）', patch: {dp: 0.45}, expect: 'CAPD', note: '較慢運輸優先保留長留置。'},
        {label: 'Cr 葡萄糖干擾未確認', patch: {crCorrection: 'unknown'}, expect: '校正', note: '先核對或重測 PET。'}
      ]},
    {id: 'c6', title: '透析液變混濁，還要調處方嗎？', stage: 'follow',
      story: '71 歲女性，CAPD 1.5 L × 4 次。原本回診想討論處方，但主訴昨天起腹痛、透析液混濁。K 3.2 mmol/L，近來食慾較差。',
      question: '今天的處方要怎麼調？該先做什麼？',
      input: {patient: 'DEMO-C6', age: 71, sex: 'female', height: 152, weight: 50, urine: 100, volume: 'euvolemic', access: 'healed', preference: 'either', apdReady: 'yes', capdReady: 'yes', sleep: 8, potassium: 3.2, bicarb: 24, serumCr: 8, bun: 50, fill: 1500, calcium: 'standard', currentMode: 'CAPD', uf: 600, currentFill: 1500, currentCycles: 4, currentConcentration: '1.5', currentLast: 'glucose', adherence: 'good', infection: true},
      symptoms: ['appetite'], severity: 'mild', attribution: 'uncertain',
      expect: {block: '疑似腹膜炎'},
      steps: [
        {t: '工作站停止產生草案：感染評估優先，今天不做例行處方最佳化。', s: 'tool'},
        {t: '診斷符合以下至少兩項：腹痛和／或混濁透析液；留置 ≥2 小時後 WBC >100/µL 且 PMN >50%；培養陽性。', s: 'ispd2022'},
        {t: '先引流並檢查透析液，送細胞計數與分類、Gram 染色及培養，培養建議用血瓶。', s: 'ispd2022'},
        {t: '採檢後盡快開始經驗性抗生素，腹腔或全身途徑皆可。依各中心資料選藥，同時涵蓋革蘭氏陽性與陰性菌。', s: 'ispd2022'},
        {t: '有效抗生素 5 天後透析液仍未清澈，即為難治性腹膜炎，建議拔管。', s: 'ispd2022'},
        {t: 'K 3.2 也要處理：避免並治療低血鉀可能降低腹膜炎風險（2C）。', s: 'ispd2022'},
        {t: '若正在使用 icodextrin，還要鑑別無菌性腹膜炎；但要先排除感染，才考慮是藥物造成。', s: 'ico'}
      ],
      variants: [
        {label: '沒有感染，但引流慢、會痛', patch: {infection: false, adherence: 'drain'}, expect: '引流', note: '先處理導管，不用提高濃度來代替評估。'},
        {label: '沒有感染，但 K 6.8 mmol/L', patch: {infection: false, potassium: 6.8}, expect: '急性', note: '先評估急性處置。'},
        {label: '沒有感染，但疑似尿毒性心包膜炎', patch: {infection: false, symptoms: ['pericarditis'], severity: 'severe', attribution: 'likely'}, expect: '心包膜炎', note: '需即時評估與適當透析支持。'}
      ]},
    {id: 'c7', title: 'PET：低運輸，但想繼續用夜間機器', stage: 'pet',
      story: '52 歲女性，白天上班，APD 8 小時 × 4 循環第 2 年，想繼續用機器，夜間最多可用 10 小時。容量穩定，無症狀，尿量 300 mL。2.5% 標準 2 L PET：引流 2250 mL，D/P Cr 0.48。完整收集：腎臟 Kt/V 0.30、腹膜 Kt/V 1.55。',
      question: '低運輸就一定要改 CAPD 嗎？APD 模板要怎麼變？',
      input: {patient: 'DEMO-C7', age: 52, sex: 'female', height: 160, weight: 60, urine: 300, volume: 'euvolemic', access: 'healed', preference: 'APD', apdReady: 'yes', capdReady: 'yes', sleep: 10, potassium: 4.4, bicarb: 25, serumCr: 10.5, bun: 58, renalKtv: 0.3, pdKtv: 1.55, collection: 'valid', dialysateCollection: 'valid', fill: 2000, calcium: 'standard', currentMode: 'APD', uf: 700, currentFill: 2000, currentCycles: 4, currentHours: 8, currentConcentration: '1.5', currentLast: 'dry', adherence: 'good', petDate: '2026-09-20', petConcentration: '2.5', petIn: 2000, petOut: 2250, dp: 0.48, crCorrection: 'yes', petClass: 'auto', petIssue: 'no'},
      symptoms: ['none'], machine: MACHINE,
      expect: {mode: 'APD', rx: 'APD 10h × 3 循環 × 2000mL 1.5%；日間 1.5% 2000mL', petUf: 250, total: 8000, cycleDwell: 167, warning: '較慢運輸', ktv: 1.85},
      steps: [
        {t: 'D/P Cr 0.48 <0.50，工作站分為低運輸。分組是傳統 Twardowski 平均值的連續化呈現，分類不是唯一的處方依據。', s: 'tool'},
        {t: '2.5% PET 淨超濾 250 mL，高於 100 mL 的閾值，沒有超濾不足的訊號。', s: 'ispd2021'},
        {t: '排序：較慢運輸 CAPD +3；偏好 APD +4、現行 APD +1。APD 5 分仍高於 CAPD 3 分，PET 不單獨決定方式。', s: 'tool'},
        {t: '方式依本人偏好選擇；目前沒有明確證據顯示哪一種方式較能保護殘餘腎功能。', s: 'rkf'},
        {t: '模板改成 3 循環、最多 10 小時（不超過可用時間），每循環留置約 167 分鐘，讓溶質有時間平衡。避免以增加短循環來加量。', s: 'tool'},
        {t: '總 Kt/V＝0.30＋1.55＝1.85。數字過關不等於足夠，仍要看症狀、容量與營養。', s: 'ispd2020'}
      ],
      variants: [
        {label: '夜間只能 8 小時', patch: {sleep: 8}, expect: 'APD 8h × 3', note: '循環數相同，時數不超過可用時間，每循環留置縮短。'},
        {label: '沒有偏好', patch: {preference: 'either'}, expect: '優先 CAPD', note: '少了偏好的 4 分，排序翻轉（CAPD 3、APD 1）。'},
        {label: 'D/P Cr 0.75（較高運輸）', patch: {dp: 0.75, icoSafe: true}, expect: 'APD 8h × 5', note: '同一人換到較快分組，模板變成短留置加日間 icodextrin，所以 PET 要先確認正確。'}
      ]},
    {id: 'c8', title: '超濾很多，卻頭暈、尿量變少', stage: 'follow',
      story: '74 歲男性，CAPD 2 L × 4 次、2.5%，每日淨超濾 1400 mL，體重已低於目標 2 kg。近一週頭暈，血壓 96/58 mmHg，血流動力尚穩定，尿量由 800 mL 降到 300 mL。估計攝取 1200 mL、腎外流失 400 mL。',
      question: '超濾量好就算達標嗎？處方要往哪個方向調？',
      input: {patient: 'DEMO-C8', age: 74, sex: 'male', height: 168, weight: 62, target: 64, urine: 300, volume: 'depleted', access: 'healed', preference: 'either', apdReady: 'yes', capdReady: 'yes', sleep: 8, potassium: 3.9, bicarb: 25, serumCr: 8.5, bun: 52, bp: '96/58 mmHg', intake: 1200, otherLoss: 400, excessFluid: 0, fill: 2000, calcium: 'standard', currentMode: 'CAPD', uf: 1400, currentFill: 2000, currentCycles: 4, currentConcentration: '2.5', currentLast: 'glucose', adherence: 'good'},
      symptoms: ['none'],
      expect: {mode: 'CAPD', rx: 'CAPD 4 次／日：2000mL 1.5% 6h', ufGoal: null, glucose: 120, warning: '疑似容量不足', goalError: '暫不提供自動脫水目標'},
      steps: [
        {t: '要先看人，不是看超濾數字。頭暈、低血壓、體重低於目標，加上尿量下降，方向是容量不足。', s: 'tool'},
        {t: '容量不足時，工作站不提供脫水目標，葡萄糖液以 1.5% 為草案起點。', s: 'tool'},
        {t: '手算：現行 8 L × 2.5%＝200 g，草案 8 L × 1.5%＝120 g。灌入葡萄糖不等於吸收量。', s: 'calc'},
        {t: '容量不足可能加速殘餘腎功能下降，要小心避免。', s: 'rkf'},
        {t: '尿量已掉，穩定後重新收 24 小時尿，評估殘餘腎功能與總清除。', s: 'rkf'},
        {t: '同時重新評估攝取、目標體重與用藥。改處方後早期複評體重、血壓與尿量。', s: 'tool'}
      ],
      variants: [
        {label: '血壓 78/40，血流動力不穩', patch: {acute: true}, expect: '急性', note: '勾選急性後暫停草案，先處理急性狀況。'},
        {label: '仍填多餘水分 1 kg（矯正 7 天）', patch: {excessFluid: 1, correctionDays: 7}, pick: '不一致', expect: '不一致', note: '容量不足與「需要脫水」互相矛盾，工作站要求重新核對。'},
        {label: '其實容量穩定', patch: {volume: 'euvolemic'}, expect: '1.5% 6h', note: '收支估計目標 500 mL/day（1200−300−400），實測 1400 明顯偏高，仍要重新核對攝取與目標體重。'}
      ]}
  ];

  // level: basic / adv。a 為正確選項索引，選項順序固定，A–D 各 5 題。
  const QUIZ = [
    {id: 'b1', level: 'basic', q: '新病人第一次開 PD 處方，工作站對 PET 的要求是？', o: ['不需要，以偏好與可行性排序，不假設運輸型態', '一定要先做 4 小時 PET', '可用 eGFR 推算運輸型態', '可由尿量推定運輸型態'], a: 0, why: '初始處方不要求 PET；工作站明確寫「尚無有效 PET」。', s: ['tool']},
    {id: 'b2', level: 'basic', q: 'ISPD 2021 建議第一次 PET 排在何時？', o: ['開始 PD 後 1–2 週', '開始 PD 後 6–12 週', '開始 PD 後 6–12 個月', '只有出現超濾不足時才做'], a: 1, why: 'PSTR 應在治療早期（6–12 週）測定（GRADE 1A），之後依臨床需要。', s: ['ispd2021']},
    {id: 'b3', level: 'basic', q: '4 小時 D/P Cr 0.86，工作站分類為？', o: ['低運輸', '較低運輸', '高運輸', '較高運輸'], a: 2, why: '界值：<0.50 低；0.50–<0.65 較低；0.65–<0.82 較高；≥0.82 高。', s: ['tool']},
    {id: 'b4', level: 'basic', q: '4.25% 葡萄糖 4 小時 PET，淨超濾低於多少應懷疑超濾不足？', o: ['100 mL', '200 mL', '600 mL', '400 mL'], a: 3, why: '4.25%／3.86% <400 mL；2.5%／2.27% <100 mL（GRADE 1B）。', s: ['ispd2021']},
    {id: 'b5', level: 'basic', q: 'D/P Cr 0.48 的病人選 APD，可用夜間 10 小時。工作站的模板是？', o: ['3 循環、最多 10 小時，保留較長留置', '5 循環、最多 8 小時', '8 循環，用短循環提高清除', '4 循環，並自動加日間 icodextrin'], a: 0, why: '慢運輸 3 循環、最多 10 小時；快速運輸才是 5 循環。避免過多短循環。', s: ['tool']},
    {id: 'b6', level: 'basic', q: 'ISPD 2020 對 weekly Kt/V 1.7 的立場是？', o: ['未達 1.7 必須轉 HD', '沒有任何清除目標能保證個人透析足夠', '達 1.7 即可判定透析足夠', '目標應改為 2.0'], a: 1, why: 'Kt/V 仍要測量以量化劑量，但不是單一的足夠標準。', s: ['ispd2020']},
    {id: 'b7', level: 'basic', q: 'PD 病人的殘餘腎功能建議如何測量？', o: ['以 eGFR 為準，每年一次', '只看每日尿量', '24 小時尿的肌酐與尿素清除率平均值，理想上每季', '只看 24 小時尿的肌酐清除率'], a: 2, why: '依 ISPD RKF 論文摘要。單獨 CCr 可能因小管分泌而高估。', s: ['rkf', 'tool']},
    {id: 'b8', level: 'basic', q: 'Icodextrin 的使用方式，何者正確？', o: ['每天可多次', 'CAPD 留置 2–4 小時', 'APD 留置 6–8 小時', '每 24 小時一次；CAPD 6–12 小時、APD 14–16 小時'], a: 3, why: '依 SmPC，用於最長的留置。', s: ['ico']},
    {id: 'b9', level: 'basic', q: '腹膜炎的透析液細胞數標準（留置 ≥2 小時）為？', o: ['WBC >100/µL 且 PMN >50%', 'WBC >50/µL 且 PMN >25%', 'WBC >500/µL 且 PMN >80%', 'WBC >100/µL，不需看 PMN'], a: 0, why: '腹痛／混濁、細胞數、培養三項中至少符合兩項即診斷（1C）。', s: ['ispd2022']},
    {id: 'b10', level: 'basic', q: '使用 icodextrin 的胰島素病人，GDH-PQQ 血糖機可能造成？', o: ['血糖假性偏低，胰島素用量不足', '血糖讀值不受影響', '血糖假性偏高，多打胰島素造成低血糖', '血酮假性升高'], a: 2, why: 'Maltose 干擾造成假性高血糖；停藥後最長 2 週仍可能受影響。', s: ['ico']},

    {id: 'a1', level: 'adv', q: '尿量 1200 mL、eGFR 9，沒有定時尿收集，症狀與容量都穩定，醫師選增量式 PD。工作站會？', o: ['直接產生 CAPD 3 次模板', '因 eGFR <10 拒絕增量式', '改建議 APD', '要求補實測 Kru 或腎臟 Kt/V，並確認完整收集與穩定腎功能'], a: 3, why: '尿量與 eGFR 都不能單獨證明低劑量足夠。', s: ['tool']},
    {id: 'a2', level: 'adv', q: 'CAPD 2 L × 4、2.5%，淨超濾 1400 mL/day。頭暈、血壓 96/58 mmHg，體重低於目標，尿量由 800 降到 300 mL。工作站如何處理？', o: ['草案回到 1.5%，不提供脫水目標，並重評攝取、目標體重與用藥', '超濾達標，維持現行處方', '改 4.25% 以維持超濾', '加開 icodextrin 增加脫水'], a: 0, why: '容量不足不自動提高濃度，也不提供脫水目標。容量不足可能加速殘餘腎功能下降。', s: ['tool', 'rkf']},
    {id: 'a3', level: 'adv', q: '總 Kt/V 1.55（完整收集），有食慾差與疲倦，歸因可能與尿毒症相關，目前 2 L × 4，可耐受 2.5 L。最合適的做法？', o: ['只因 Kt/V 未達標就轉 HD', '鑑別其他原因，提高到可耐受灌注量後，看症狀並重測清除', '按 Kt/V 比例把總劑量放大 10%', '維持不變，因為 Kt/V 與症狀無關'], a: 1, why: 'ISPD 建議加量時有多於一項證據，並鑑別其他原因；工作站不按 Kt/V 比例直接放大。', s: ['ispd2020', 'tool']},
    {id: 'a4', level: 'adv', q: '總 Kt/V 1.55，但無症狀，容量、營養與生化皆佳。依 ISPD 2020？', o: ['一定要加量到 >1.7', '必須立刻轉 HD', '不必只為了達到清除目標而改處方，持續追蹤', '減少劑量'], a: 2, why: '3.4d（practice point）。工作站也只提示，不以單一數字決定加量（病例 4 第三個對照）。', s: ['ispd2020', 'tool']},
    {id: 'a5', level: 'adv', q: '女性 156 cm、54 kg（Watson V 約 27.9 L），BUN 58、UUN 320 mg/dL、尿量 1.2 L/day。腎臟 weekly Kt/V 約為？', o: ['0.24', '0.83', '3.32', '1.66'], a: 3, why: '320/58 × 1.2 × 7 / 27.9 ≈ 1.66。', s: ['calc']},
    {id: 'a6', level: 'adv', q: '攝取 1500、尿量 300、腎外流失 500 mL/day，多餘水分 3 kg 預定 10 天。工作站估計的淨 UF 目標是？', o: ['1000 mL/day', '700 mL/day', '1300 mL/day', '3700 mL/day'], a: 0, why: '1500 − 300 − 500 ＋ 3000/10 ＝ 1000。此為簡化估計，不是經驗證的預測模型。', s: ['tool']},
    {id: 'a7', level: 'adv', q: '4.25% PET：淨超濾 300 mL，1 小時 sodium dip 3 mmol/L，D/P Cr 0.88。哪個敘述最恰當？', o: ['純高運輸，dip 正常', '符合超濾不足，先排除機械問題與漏液，再評估膜功能與對策', '一定要立刻轉 HD', '超濾正常，只需調飲食'], a: 1, why: '<400 mL 及 dip ≤5 mmol/L 指向超濾不足；機械問題與漏液也會造成低超濾。', s: ['ispd2021']},
    {id: 'a8', level: 'adv', q: '高運輸、偏好 APD，夜間只能 6 小時（日間 18 小時），長留置設為「依情況提出選項」。工作站會？', o: ['自動帶入 icodextrin 18 小時', '不帶入 icodextrin，因 18 小時超出 14–16 小時範圍', '自動延長夜間到 8 小時', '自動改為 CAPD'], a: 1, why: '超出範圍要另設日間交換或人工處方。夜間時數也不能超過病人可用時間。', s: ['ico', 'tool']},
    {id: 'a9', level: 'adv', q: '快速循環 APD，混濁透析液，WBC 60/µL、PMN 80%。如何解讀？', o: ['WBC <100/µL，可排除腹膜炎', '要等培養才考慮治療', 'WBC 依留置時間而定，PMN >50% 是腹膜炎的強力證據', '只有 CAPD 才適用 PMN 標準'], a: 2, why: '快速循環時應看 PMN 比例，而非絕對 WBC。', s: ['ispd2022']},
    {id: 'a10', level: 'adv', q: 'CAPD 選用 Nutrineal，BUN 110 mg/dL、HCO₃⁻ 20 mmol/L。工作站如何處理？', o: ['允許，因 BUN 不影響使用', '允許，但改每天兩袋', '自動改為 icodextrin', '不接受此草案：BUN 超過上限（106.4 mg/dL＝尿素 38 mmol/L）且有酸中毒'], a: 3, why: 'SmPC 禁忌包含血清尿素 >38 mmol/L、代謝性酸中毒、尿毒症症狀、嚴重低血鉀、肝功能不全。', s: ['aa', 'tool']}
  ];

  // 葉節點重述上方規則，內容改動時要手動同步；tests.cjs 檢查關鍵數字。
  const MAP = {
    left: {title: '評估', branches: [
      {t: '先排除不能開草案的情況', s: '工作站會暫停處方', l: [
        {k: '急性', x: '肺水腫、需急處理高血鉀（K ≥6.5）、HCO₃⁻ <10、血流動力不穩'},
        {k: '尿毒症急症', x: '疑似腦病或心包膜炎：即時評估與適當透析支持'},
        {k: '感染', x: '治療中出現腹痛、混濁透析液：先處理腹膜炎'},
        {k: '導管', x: '漏液、疝氣、引流異常：不用提高濃度代替評估'},
        {k: '新置管', x: '未滿 2 週或急起始：另用專屬流程'}]},
      {t: '選擇 CAPD 或 APD', s: '共同決策，可行性優先', l: [
        {k: '可行性', x: '不可行的方式直接排除，兩者皆不可行要建立支持'},
        {k: '偏好', x: '權重 4'},
        {k: 'PET', x: '較快運輸 APD +3；較慢運輸 CAPD +3'},
        {k: '現況', x: '既有方式 +1；可用夜間 <8 小時 CAPD +2'},
        {k: '同分', x: '以 CAPD 為起點。排序不是預後分數'}]},
      {t: '殘餘腎功能', s: '要知道，也要盡量保護', l: [
        {k: '測量', x: '24 小時尿 CCr 與 Kru 平均，理想上每季'},
        {k: '不可混用', x: 'Cr、eGFR、CCr、Kru、Kt/V 不是同一數值'},
        {k: '公式', x: 'Kru＝UUN×尿量／(BUN×1440)；weekly Kt/V＝每日清除（L）×7／V'},
        {k: '保護', x: '避免容量不足；能用就用 ACEI／ARB'}]},
      {t: 'PET 與腹膜功能', s: '6–12 週內做第一次', l: [
        {k: 'D/P Cr', x: '<0.50 低；0.50–<0.65 較低；0.65–<0.82 較高；≥0.82 高'},
        {k: '超濾', x: '2 L PET：4.25% <400 mL、2.5% <100 mL 懷疑不足'},
        {k: 'Sodium dip', x: '4.25% 1 小時 ≤5 mmol/L 指向超濾不足'},
        {k: '先排除', x: '機械問題、漏液；Cr 葡萄糖干擾要校正'}]},
      {t: '容量與目標', s: '目標不等於預測', l: [
        {k: '收支', x: '攝取−尿量−腎外流失＋多餘水分×1000／矯正天數'},
        {k: '不是目標', x: 'Kt/V 1.7 僅為檢核參考，不單獨決定加量'},
        {k: '一起看', x: '症狀、容量、營養、K、HCO₃⁻、生活品質'},
        {k: '容量不足', x: '不提供自動脫水目標'}]}
    ]},
    right: {title: '處方與調整', branches: [
      {t: '草案模板', s: '三個階段共用，須實測調整', l: [
        {k: 'CAPD', x: '4 次交換（快速運輸草案 5 次）'},
        {k: 'APD', x: '4 循環、最多 8 小時（快速 5 循環；慢 3 循環、最多 10 小時）'},
        {k: '濃度', x: '容量過多 2.5%，其餘 1.5%'},
        {k: '灌注量', x: '由醫師確認可耐受量，500–2500 mL'}]},
      {t: '增量式 PD', s: '保留殘餘功能者', l: [
        {k: '條件', x: '完整定時尿的 Kru 或腎臟 Kt/V、腎功能穩定、醫師確認'},
        {k: '不適用', x: '水腫、容量不足、尿毒症相關症狀、K >5.5、HCO₃⁻ <22'},
        {k: '模板', x: 'CAPD 3 次，每次 6 小時；APD 3 循環'},
        {k: '追蹤', x: '殘餘功能下降或症狀出現就加量'}]},
      {t: '容量問題', s: '先看人，再看數字', l: [
        {k: '先確認', x: '有沒有漏做；漏做先改善，再決定是否加量'},
        {k: '容量過多', x: '濃度 2.5%，長留置帶入 Icodextrin（要先勾選適用性）'},
        {k: '快速運輸', x: '同樣帶入 Icodextrin；APD 僅限日間 14–16 小時內'},
        {k: '容量不足', x: '回到 1.5%，重評攝取、目標體重與用藥'}]},
      {t: '清除問題', s: '不只因一個數字', l: [
        {k: '證據', x: '建議多於一項：症狀、生化、營養、殘餘功能、Kt/V'},
        {k: '不自動', x: '不按 Kt/V 比例放大，也不自動加交換次數'},
        {k: '灌注量', x: '草案取自可耐受量欄；不打算加量時填回現行值'},
        {k: '手動', x: '交換次數、循環、時數在處方區由醫師修改，之後重測'}]},
      {t: '用液限制', s: '院內品項與仿單', l: [
        {k: 'Icodextrin', x: '每 24 小時一次；CAPD 6–12 h、APD 14–16 h；院內僅 2 L 袋'},
        {k: '血糖機', x: '避免 GDH-PQQ、GDO；部分 GDH-FAD 也受影響；停藥後最長 2 週'},
        {k: 'Nutrineal', x: '僅 CAPD 手動選用，每日一次；BUN ≤106.4 mg/dL；酸中毒、尿毒症症狀不用'},
        {k: 'Low Ca', x: '2.5 mEq/L；不自動套用到 icodextrin、Nutrineal'}]},
      {t: '腹膜炎', s: '不調處方，先治療', l: [
        {k: '診斷', x: '三項至少兩項：腹痛／混濁、WBC >100/µL 且 PMN >50%（留置 ≥2 h）、培養陽性'},
        {k: '快速 APD', x: '看 PMN >50%，不看絕對 WBC'},
        {k: '檢體', x: '細胞計數與分類、Gram 染色、血瓶培養'},
        {k: '治療', x: '採檢後盡快給經驗性抗生素，涵蓋陽性與陰性菌'},
        {k: '難治', x: '有效抗生素 5 天仍未清澈：建議拔管'}]}
    ]}
  };

  const DEFAULTS = {stage: 'initial', patient: '', age: '', sex: '', height: '', weight: '', target: '', start: '', urine: '', volume: '', access: '', preference: 'either', apdReady: '', capdReady: '', sleep: '', symptomSeverity: '', symptomAttribution: '', acute: false, infection: false, serumCr: '', egfr: '', ccr: '', kru: '', collection: 'unknown', renalStability: 'stable', potassium: '', bicarb: '', bun: '', albumin: '', ca: '', phos: '', renalKtv: '', pdKtv: '', labDate: '', bp: '', currentMode: '', uf: '', currentFill: '', currentCycles: '', currentHours: '', currentLast: 'dry', currentConcentration: '1.5', adherence: '', intake: '', otherLoss: '', excessFluid: '', correctionDays: '', manualUfGoal: '', ktvGoal: '1.7', dialysateCollection: 'unknown', fluidGoalSafe: false, petDate: '', petConcentration: '', petIn: '', petOut: '', dp: '', crCorrection: '', dCr: '', pCr: '', g0: '', g4: '', na0: '', na1: '', petIssue: 'no', petClass: 'auto', fill: '', calcium: '', dose: 'standard', longSolution: 'auto', icoSafe: false, incrementalSafe: false};

  function rxText(rx) {
    if (rx.mode === 'CAPD') return `CAPD ${rx.rows.length} 次／日：` + rx.rows.map(r => `${r.volume}mL ${r.kind === 'ico' ? 'Icodextrin' : r.concentration + '%'} ${Number(r.dwell.toFixed(1))}h`).join('、');
    return `APD ${rx.hours}h × ${rx.cycles} 循環 × ${rx.fill}mL ${rx.nightConcentration}%；日間${rx.lastKind === 'dry' ? '乾腹' : rx.lastKind === 'ico' ? ` Icodextrin ${rx.lastVolume}mL` : ` ${rx.lastConcentration}% ${rx.lastVolume}mL`}`;
  }
  function caseData(c, patch = {}) {
    const m = {...c.input, ...patch};
    const syms = patch.symptoms || c.symptoms || [];
    const present = syms.some(x => x !== 'none');
    const sev = 'severity' in patch ? patch.severity : c.severity, att = 'attribution' in patch ? patch.attribution : c.attribution;
    const d = {...DEFAULTS, ...m, stage: c.stage, symptoms: syms, symptom: present ? 'yes' : syms.length ? 'none' : '', symptomSeverity: present ? sev || '' : '', symptomAttribution: present ? att || '' : ''};
    if (c.stage === 'initial') d.infection = false;
    return d;
  }
  function run(c, patch) {
    const d = caseData(c, patch), a = E.assess(d);
    if (a.missing.length || a.blocks.length) return {d, a, blocked: true};
    const rx = E.initialRx(d, a);
    if (rx.mode === 'APD' && c.machine) Object.assign(rx, c.machine);
    const v = E.validateRx(rx, d, a, CAT), g = E.goals(d, a, rx, v.total);
    return {d, a, rx, v, g, text: rxText(rx), blocked: false};
  }
  function variantText(c, x) {
    const r = run(c, x.patch);
    if (r.a.blocks.length) return '暫停：' + r.a.blocks[0];
    if (r.a.missing.length) return '待補：' + r.a.missing.join('、');
    const extra = [...r.v.errors, ...r.g.errors];
    if (x.pick) extra.push(...[...r.a.warnings, ...r.a.adjustments, ...r.g.notes].filter(t => t.includes(x.pick)));
    return `優先 ${r.a.mode}；${r.text}。` + [...new Set(extra)].join('');
  }
  return {SOURCES, CASES, QUIZ, MAP, caseData, run, variantText};
})();
if (typeof module !== 'undefined') module.exports = PDTeach;

// ===== 畫面 =====
if (typeof document !== 'undefined') (() => {
  const T = PDTeach, LET = 'ABCD', VIEWS = ['tool', 'cases', 'quiz', 'map'];
  const tag = id => {const s = T.SOURCES[id]; return `<span class="src-tag ${s.kind}">${esc(s.tag)}</span>`;};

  function caseCard(c, i) {
    const r = T.run(c);
    let res;
    if (r.blocked) res = (r.a.blocks.map(x => `<div class="callout danger">${esc(x)}</div>`).join('')) || `<div class="callout warning">待補：${esc(r.a.missing.join('、'))}</div>`;
    else {
      const notes = [...r.a.warnings, ...r.a.adjustments, ...r.g.notes.slice(1)];
      res = `<div class="case-reco">優先 ${esc(r.a.mode)}</div><p class="case-rx">${esc(r.text)}</p>`;
      if (r.v.errors.length) res += r.v.errors.map(x => `<div class="callout danger">${esc(x)}</div>`).join('');
      if (r.g.errors.length) res += r.g.errors.map(x => `<div class="callout warning">${esc(x)}</div>`).join('');
      res += `<div class="metrics"><div class="metric">每日灌入<b>${(r.v.total / 1000).toFixed(1)} L</b></div><div class="metric">灌入葡萄糖<b>${r.v.glucose.toFixed(0)} g</b></div><div class="metric">淨 UF 目標<b>${r.g.ufGoal === null ? '—' : Math.round(r.g.ufGoal) + ' mL'}</b></div></div>`;
      if (notes.length) res += `<details><summary>工作站提示（${notes.length}）</summary>${notes.map(x => `<div class="callout warning">${esc(x)}</div>`).join('')}</details>`;
    }
    const steps = c.steps.map(x => `<li>${esc(x.t)} ${tag(x.s)}</li>`).join('');
    const vars = c.variants.map(x => `<tr><td>${esc(x.label)}</td><td>${esc(T.variantText(c, x))}</td><td>${esc(x.note)}</td></tr>`).join('');
    return `<details class="panel case" id="${c.id}" ${i === 0 ? 'open' : ''}><summary><span class="case-no">病例 ${i + 1}</span><span class="case-title">${esc(c.title)}</span><span class="tag">${esc({initial: '初始處方', follow: '治療中調整', pet: 'PET 後'}[c.stage])}</span></summary>
      <p>${esc(c.story)}</p><p class="case-q">${esc(c.question)}</p>
      <h3>工作站結果</h3>${res}<h3>思考步驟</h3><ol class="case-steps">${steps}</ol>
      <h3>如果情況不同</h3><div class="table-wrap"><table class="case-var"><thead><tr><th>改變</th><th>工作站結果</th><th>說明</th></tr></thead><tbody>${vars}</tbody></table></div>
      <button type="button" class="primary" data-load="${i}">帶入工作站操作</button></details>`;
  }
  $('caseList').innerHTML = T.CASES.map(caseCard).join('');
  $('caseList').addEventListener('click', e => {
    const b = e.target.closest('[data-load]'); if (!b) return;
    location.hash = 'tool'; setView('tool');
    const c = T.CASES[Number(b.dataset.load)];
    PDApp.loadCase({input: c.input, stage: c.stage, symptoms: c.symptoms, severity: c.severity, attribution: c.attribution, machine: c.machine});
    scrollTo(0, 0);
  });

  const answers = new Map(); let filter = 'all';
  function renderQuiz() {
    const items = T.QUIZ.filter(q => filter === 'all' || q.level === filter);
    const done = items.filter(q => answers.has(q.id)), right = done.filter(q => answers.get(q.id) === q.a).length;
    $('quizScore').textContent = `已答 ${done.length}／${items.length}，答對 ${right}`;
    $('quizList').innerHTML = items.map(q => {
      const n = T.QUIZ.indexOf(q) + 1, got = answers.has(q.id), pick = answers.get(q.id);
      const opts = q.o.map((t, i) => `<button type="button" class="quiz-opt ${got && i === q.a ? 'right' : ''} ${got && i === pick && i !== q.a ? 'wrong' : ''}" data-q="${q.id}" data-i="${i}" ${got ? 'disabled' : ''}><b>${LET[i]}</b><span>${esc(t)}</span></button>`).join('');
      const fb = got ? `<div class="callout ${pick === q.a ? '' : 'warning'}"><b>${pick === q.a ? '答對' : '答案是 ' + LET[q.a]}。</b>${esc(q.why)} ${q.s.map(tag).join(' ')}</div>` : '';
      return `<div class="panel quiz-q"><div class="quiz-head"><b>第 ${n} 題</b><span class="tag ${q.level === 'adv' ? 'amber' : ''}">${q.level === 'adv' ? '高階' : '基礎'}</span></div><p class="quiz-stem">${esc(q.q)}</p><div class="quiz-opts">${opts}</div>${fb}</div>`;
    }).join('');
  }
  $('quizList').addEventListener('click', e => {const b = e.target.closest('[data-q]'); if (!b) return; answers.set(b.dataset.q, Number(b.dataset.i)); const y = scrollY; renderQuiz(); scrollTo(0, y);});
  $('quizFilter').addEventListener('click', e => {const b = e.target.closest('[data-level]'); if (!b) return; filter = b.dataset.level; document.querySelectorAll('#quizFilter button').forEach(x => x.setAttribute('aria-pressed', x === b)); renderQuiz();});
  $('quizReset').addEventListener('click', () => {answers.clear(); renderQuiz();});
  renderQuiz();

  const branch = (b, side, i) => `<div class="mm-branch ${side}"><button type="button" class="mm-head" aria-expanded="false" aria-controls="mm-${side}${i}"><span class="mm-t">${i + 1}. ${esc(b.t)}</span><span class="mm-s">${esc(b.s)}</span></button><ul class="mm-leaves" id="mm-${side}${i}" hidden>${b.l.map(x => `<li><b>${esc(x.k)}</b>　${esc(x.x)}</li>`).join('')}</ul></div>`;
  $('mmLeft').innerHTML = `<h3 class="mm-col left">${esc(T.MAP.left.title)}</h3>` + T.MAP.left.branches.map((b, i) => branch(b, 'left', i)).join('');
  $('mmRight').innerHTML = `<h3 class="mm-col right">${esc(T.MAP.right.title)}</h3>` + T.MAP.right.branches.map((b, i) => branch(b, 'right', i)).join('');
  function drawLinks() {
    const w = $('mmWrap'), svg = $('mmLinks');
    if (getComputedStyle(svg).display === 'none' || !w.offsetParent) return;
    const W = w.getBoundingClientRect(), C = $('mmCenter').getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${W.width} ${W.height}`);
    svg.innerHTML = [...w.querySelectorAll('.mm-branch')].map(b => {
      const left = b.classList.contains('left'), r = b.querySelector('.mm-head').getBoundingClientRect();
      const x1 = (left ? C.left : C.right) - W.left, y1 = C.top + C.height / 2 - W.top, x2 = (left ? r.right : r.left) - W.left, y2 = r.top + r.height / 2 - W.top, mx = (x1 + x2) / 2;
      return `<path class="${left ? 'left' : 'right'}" d="M${x1} ${y1} C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}"/>`;
    }).join('');
  }
  const heads = () => document.querySelectorAll('#mmWrap .mm-head');
  const setBranch = (h, open) => {h.setAttribute('aria-expanded', open); $(h.getAttribute('aria-controls')).hidden = !open;};
  $('mmWrap').addEventListener('click', e => {const h = e.target.closest('.mm-head'); if (h) {setBranch(h, h.getAttribute('aria-expanded') !== 'true'); drawLinks();}});
  $('mmOpen').addEventListener('click', () => {heads().forEach(h => setBranch(h, true)); drawLinks();});
  $('mmClose').addEventListener('click', () => {heads().forEach(h => setBranch(h, false)); drawLinks();});
  if (window.ResizeObserver) new ResizeObserver(drawLinks).observe($('mmWrap')); else addEventListener('resize', drawLinks);

  $('teachSources').innerHTML = Object.values(T.SOURCES).filter(s => s.href).map(s => `<li><a href="${esc(s.href)}" target="_blank" rel="noopener">${esc(s.title)}</a> <small>（查證範圍：${esc(s.read)}）</small></li>`).join('');

  function setView(v) {
    if (!VIEWS.includes(v)) v = 'tool';
    VIEWS.forEach(x => {$('view-' + x).hidden = x !== v;});
    document.querySelectorAll('.view-tabs a').forEach(a => {if (a.dataset.view === v) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');});
    $('teachFoot').hidden = v === 'tool';
    if (v === 'map') drawLinks();
  }
  addEventListener('hashchange', () => setView(location.hash.slice(1)));
  setView(location.hash.slice(1));
})();
