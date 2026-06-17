const audiogramTypes = {
  highSlope: {
    name: "高音漸傾型",
    summary: "高い音になるほど徐々に聞こえにくくなるタイプです。",
    description: "加齢性難聴などでも見られます。子音や電子音、女性や子どもの声が聞き取りにくくなることがあります。",
    points: [
      [125, 10], [250, 15], [500, 25], [1000, 35], [2000, 50], [4000, 65], [8000, 75]
    ],
    filter: { kind: "lowpass", frequency: 3000, q: 0.8 }
  },
  highDrop: {
    name: "高音急墜型",
    summary: "低い音は比較的聞こえ、高い音が急に聞こえにくくなるタイプです。",
    description: "サ行・タ行などの子音、鳥の声、電子音などが分かりにくくなることがあります。音は聞こえても、ことばの輪郭が崩れやすくなります。",
    points: [
      [125, 10], [250, 10], [500, 15], [1000, 20], [2000, 55], [4000, 85], [8000, 95]
    ],
    filter: { kind: "lowpass", frequency: 1700, q: 1.0 }
  },
  lowLoss: {
    name: "低音障害型",
    summary: "低い音が聞こえにくいタイプです。",
    description: "男性の低い声や低周波の環境音の聞こえ方に影響することがあります。高い音は比較的残る場合があります。",
    points: [
      [125, 75], [250, 65], [500, 55], [1000, 35], [2000, 20], [4000, 15], [8000, 15]
    ],
    filter: { kind: "highpass", frequency: 700, q: 0.8 }
  },
  flat: {
    name: "平坦型",
    summary: "全体の周波数で同程度に聞こえにくいタイプです。",
    description: "音量不足として感じられやすい一方で、明瞭度が低い場合は音量を上げても聞き取りが改善しにくいことがあります。",
    points: [
      [125, 55], [250, 55], [500, 55], [1000, 55], [2000, 55], [4000, 55], [8000, 55]
    ],
    filter: { kind: "flat" }
  },
  dip: {
    name: "谷型 / dip型",
    summary: "特定の周波数帯だけ聞こえにくいタイプです。",
    description: "特定の音だけ抜け落ちるように感じる場合があります。騒音性難聴などで一部周波数の低下が見られることがあります。",
    points: [
      [125, 15], [250, 15], [500, 15], [1000, 25], [2000, 65], [4000, 45], [8000, 20]
    ],
    filter: { kind: "notch", frequency: 2200, q: 1.7 }
  }
};

const hearingLevels = {
  normal: { label: "健聴", targetAverage: 20 },
  mild: { label: "軽度難聴", targetAverage: 35 },
  moderate: { label: "中度難聴", targetAverage: 55 },
  severe: { label: "高度難聴", targetAverage: 80 },
  profound: { label: "重度難聴", targetAverage: 110 }
};

const sampleVoices = {
  female: {
    label: "女性の声",
    url: "../samples/female.mp3"
  },
  male: {
    label: "男性の声",
    url: "../samples/male.mp3"
  }
};

const els = {
  audioFile: document.getElementById("audioFile"),
  loadFemaleSampleBtn: document.getElementById("loadFemaleSampleBtn"),
  loadMaleSampleBtn: document.getElementById("loadMaleSampleBtn"),
  playOriginalBtn: document.getElementById("playOriginalBtn"),
  playProcessedBtn: document.getElementById("playProcessedBtn"),
  stopBtn: document.getElementById("stopBtn"),
  audiogramType: document.getElementById("audiogramType"),
  typeName: document.getElementById("typeName"),
  typeSummary: document.getElementById("typeSummary"),
  typeDescription: document.getElementById("typeDescription"),
  audiogramSvg: document.getElementById("audiogramSvg"),
  clarity: document.getElementById("clarity"),
  clarityValue: document.getElementById("clarityValue"),
  currentSettings: document.getElementById("currentSettings"),
  sourceStatus: document.getElementById("sourceStatus")
};

let audioContext = null;
let audioBuffer = null;
let activeNodes = [];

init();

function init() {
  for (const [key, value] of Object.entries(audiogramTypes)) {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = value.name;
    els.audiogramType.appendChild(option);
  }

  els.audiogramType.value = "highDrop";
  updateAudiogramInfo();
  updateSliderLabels();
  updateSettings();

  els.audiogramType.addEventListener("change", () => {
    updateAudiogramInfo();
    updateSettings();
  });

  document.querySelectorAll('input[name="hearingLevel"]').forEach((input) => {
    input.addEventListener("change", () => {
      updateAudiogramInfo();
      updateSettings();
    });
  });

  els.clarity.addEventListener("input", () => {
    updateSliderLabels();
    updateSettings();
  });

  els.audioFile.addEventListener("change", handleFile);
  els.loadFemaleSampleBtn.addEventListener("click", () => loadSampleVoice("female"));
  els.loadMaleSampleBtn.addEventListener("click", () => loadSampleVoice("male"));
  els.playOriginalBtn.addEventListener("click", () => playAudio({ processed: false }));
  els.playProcessedBtn.addEventListener("click", () => playAudio({ processed: true }));
  els.stopBtn.addEventListener("click", stopAll);
}

async function ensureAudioContext() {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }
}

async function handleFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  await ensureAudioContext();

  const arrayBuffer = await file.arrayBuffer();
  audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  enablePlayback(`音声ファイル「${file.name}」を読み込みました。`);
}

async function loadSampleVoice(key) {
  const sample = sampleVoices[key];
  if (!sample) return;

  await ensureAudioContext();

  try {
    const response = await fetch(sample.url);
    if (!response.ok) {
      throw new Error(`${sample.url} を読み込めませんでした。`);
    }

    const arrayBuffer = await response.arrayBuffer();
    audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    enablePlayback(`${sample.label}を読み込みました。`);
  } catch (error) {
    console.error(error);
    alert(`サンプル音声を読み込めませんでした。\n${sample.url} がGitHub上にあるか確認してください。`);
  }
}

function enablePlayback(label = "音源の準備ができました。") {
  els.playOriginalBtn.disabled = false;
  els.playProcessedBtn.disabled = false;
  els.stopBtn.disabled = false;

  if (els.sourceStatus) {
    els.sourceStatus.textContent = label + " 「元の音を聞く」または「設定した聞こえ方で聞く」を押してください。";
    els.sourceStatus.classList.add("ready");
  }
}

function updateSliderLabels() {
  els.clarityValue.textContent = els.clarity.value;
}

function updateSettings() {
  const type = audiogramTypes[els.audiogramType.value];
  const level = getSelectedHearingLevel();
  const adjustedPoints = getAdjustedAudiogramPoints(type.points, level.targetAverage);
  const average = getFourFrequencyAverage(adjustedPoints);

  els.currentSettings.textContent =
    `オージオグラムタイプ：${type.name}\n` +
    `聴力レベル：${level.label}（四分法平均 約${average.toFixed(1)}dB）\n` +
    `ことばの明瞭度：${els.clarity.value}%\n` +
    `音声処理：オージオグラム型 × 聴力レベルから動的EQを生成\n\n` +
    `あなたが体験したのは、数ある聞こえ方のひとつです。\n同じ難聴者でも、聞こえ方は一人ひとり異なります。\nこの体験が、さまざまな聞こえ方を知るきっかけになれば幸いです。`;
}

function updateAudiogramInfo() {
  const type = audiogramTypes[els.audiogramType.value];
  const level = getSelectedHearingLevel();
  const adjustedPoints = getAdjustedAudiogramPoints(type.points, level.targetAverage);
  const average = getFourFrequencyAverage(adjustedPoints);

  els.typeName.textContent = `${type.name} / ${level.label}`;
  els.typeSummary.textContent = `${type.summary} 四分法平均は約${average.toFixed(1)}dBです。`;
  els.typeDescription.textContent = type.description;
  drawAudiogram({ ...type, points: adjustedPoints });
}

function getSelectedHearingLevel() {
  const selected = document.querySelector('input[name="hearingLevel"]:checked')?.value || "moderate";
  return hearingLevels[selected];
}

function getDb(points, frequency) {
  const point = points.find(([freq]) => freq === frequency);
  if (!point) {
    throw new Error(`Audiogram point ${frequency}Hz is missing.`);
  }
  return point[1];
}

function getFourFrequencyAverage(points) {
  const db500 = getDb(points, 500);
  const db1000 = getDb(points, 1000);
  const db2000 = getDb(points, 2000);
  return (db500 + db1000 * 2 + db2000) / 4;
}

function getAdjustedAudiogramPoints(basePoints, targetAverage) {
  const currentAverage = getFourFrequencyAverage(basePoints);
  const shift = targetAverage - currentAverage;

  return basePoints.map(([freq, db]) => {
    const rawDb = db + shift;
    return [freq, clampDb(rawDb), rawDb];
  });
}

function clampDb(db) {
  return Math.min(120, Math.max(-10, db));
}

function hearingDbToEqGain(db, rawDb = db) {
  // Converts audiogram threshold values into practical EQ attenuation.
  // This is intentionally not a 1:1 physical conversion.
  // 120dB+ scale-out bands are treated as nearly absent for this demo.
  const effectiveDb = Number.isFinite(rawDb) ? rawDb : db;

  if (effectiveDb >= 120) return -90;
  if (effectiveDb <= 20) return 0;

  if (effectiveDb <= 80) {
    return -(effectiveDb - 20) * 0.75;
  }

  if (effectiveDb <= 110) {
    return -45 - (effectiveDb - 80) * 1.1;
  }

  return -85;
}

function createAudiogramEQ(context, adjustedPoints) {
  return adjustedPoints.map(([freq, db, rawDb]) => {
    const filter = context.createBiquadFilter();

    if (freq <= 125) {
      filter.type = "lowshelf";
    } else if (freq >= 8000) {
      filter.type = "highshelf";
    } else {
      filter.type = "peaking";
      filter.Q.value = 1.05;
    }

    filter.frequency.value = freq;
    filter.gain.value = hearingDbToEqGain(db, rawDb);
    return filter;
  });
}

function connectSeries(source, nodes, destination) {
  let current = source;
  for (const node of nodes) {
    current.connect(node);
    current = node;
  }
  current.connect(destination);
}

function drawAudiogram(type) {
  const svg = els.audiogramSvg;
  svg.innerHTML = "";

  const ns = "http://www.w3.org/2000/svg";
  const width = 640;
  const height = 360;
  const margin = { left: 64, right: 28, top: 32, bottom: 58 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;

  const freqs = [125, 250, 500, 1000, 2000, 4000, 8000];
  const dbMin = -10;
  const dbMax = 120;

  const xForFreq = (freq) => {
    // Audiograms use octave-like frequency spacing.
    // This maps intermediate frequencies such as 650Hz or 5200Hz
    // onto the chart instead of requiring exact tick values.
    const logMin = Math.log2(freqs[0]);
    const logMax = Math.log2(freqs[freqs.length - 1]);
    const clamped = Math.min(Math.max(freq, freqs[0]), freqs[freqs.length - 1]);
    const ratio = (Math.log2(clamped) - logMin) / (logMax - logMin);
    return margin.left + plotW * ratio;
  };
  const yForDb = (db) => margin.top + ((db - dbMin) / (dbMax - dbMin)) * plotH;

  appendRect(svg, 0, 0, width, height, "#fff");

  // Grid
  for (const db of [-10, 0, 20, 40, 60, 80, 100, 120]) {
    const y = yForDb(db);
    appendLine(svg, margin.left, y, width - margin.right, y, "#e5e7eb", 1);
    appendText(svg, margin.left - 12, y + 4, String(db), "end", "svg-label");
  }

  for (const f of freqs) {
    const x = xForFreq(f);
    appendLine(svg, x, margin.top, x, height - margin.bottom, "#eef0f2", 1);
    appendText(svg, x, height - margin.bottom + 24, String(f), "middle", "svg-label");
  }

  appendLine(svg, margin.left, margin.top, margin.left, height - margin.bottom, "#4b5563", 1.5);
  appendLine(svg, margin.left, height - margin.bottom, width - margin.right, height - margin.bottom, "#4b5563", 1.5);

  appendText(svg, margin.left, 18, "小さい音", "start", "svg-small");
  appendText(svg, margin.left, height - 14, "大きくしないと聞こえない", "start", "svg-small");
  appendText(svg, width / 2, height - 10, "周波数 Hz", "middle", "svg-small");
  appendText(svg, 18, height / 2, "dB HL", "middle", "svg-small", "rotate(-90 18 180)");

  // Band labels
  appendText(svg, xForFreq(500), margin.top + 18, "低音", "middle", "svg-small");
  appendText(svg, xForFreq(2000), margin.top + 18, "中音", "middle", "svg-small");
  appendText(svg, xForFreq(8000), margin.top + 18, "高音", "middle", "svg-small");

  // Polyline
  const pointString = type.points.map(([f, db]) => `${xForFreq(f)},${yForDb(db)}`).join(" ");
  const polyline = document.createElementNS(ns, "polyline");
  polyline.setAttribute("points", pointString);
  polyline.setAttribute("fill", "none");
  polyline.setAttribute("stroke", "#355c7d");
  polyline.setAttribute("stroke-width", "4");
  polyline.setAttribute("stroke-linecap", "round");
  polyline.setAttribute("stroke-linejoin", "round");
  svg.appendChild(polyline);

  // Speech banana overlay: simplified English-based concept labels.
  drawSpeechBananaOverlay(svg, xForFreq, yForDb);
  drawEverydaySoundOverlay(svg, xForFreq, yForDb, type);

  for (const point of type.points) {
    const [f, db, rawDb] = point;
    const isScaleOut = Number.isFinite(rawDb) && rawDb > 120;
    appendCircle(svg, xForFreq(f), yForDb(db), 6, isScaleOut ? "#9b2c2c" : "#355c7d");
    if (isScaleOut) {
      appendText(svg, xForFreq(f), yForDb(120) - 10, "120+", "middle", "scaleout-label");
    }
  }
}

function drawSpeechBananaOverlay(svg, xForFreq, yForDb) {
  // This is intentionally simplified. It is an educational overlay, not a clinical map.
  const ns = "http://www.w3.org/2000/svg";

  const region = document.createElementNS(ns, "path");
  const d = [
    `M ${xForFreq(220)} ${yForDb(36)}`,
    `C ${xForFreq(400)} ${yForDb(25)}, ${xForFreq(900)} ${yForDb(37)}, ${xForFreq(1500)} ${yForDb(38)}`,
    `C ${xForFreq(2600)} ${yForDb(38)}, ${xForFreq(4200)} ${yForDb(28)}, ${xForFreq(5700)} ${yForDb(22)}`,
    `C ${xForFreq(6100)} ${yForDb(35)}, ${xForFreq(4300)} ${yForDb(48)}, ${xForFreq(2300)} ${yForDb(60)}`,
    `C ${xForFreq(1200)} ${yForDb(66)}, ${xForFreq(450)} ${yForDb(58)}, ${xForFreq(220)} ${yForDb(50)}`,
    `C ${xForFreq(160)} ${yForDb(44)}, ${xForFreq(180)} ${yForDb(39)}, ${xForFreq(220)} ${yForDb(36)}`,
    "Z"
  ].join(" ");
  region.setAttribute("d", d);
  region.setAttribute("class", "speech-region");
  svg.appendChild(region);

  const labels = [
    // Approximate placement based on common English speech banana charts.
    // Frequency and dB values are educational approximations.
    { text: "ng", freq: 250, db: 34, cls: "speech-label" },
    { text: "m", freq: 300, db: 40, cls: "speech-label" },
    { text: "n", freq: 430, db: 36, cls: "speech-label" },

    { text: "v", freq: 500, db: 42, cls: "speech-label" },
    { text: "b", freq: 650, db: 46, cls: "speech-label" },
    { text: "d", freq: 850, db: 48, cls: "speech-label" },
    { text: "l", freq: 900, db: 55, cls: "speech-label" },
    { text: "r", freq: 1050, db: 58, cls: "speech-label" },

    { text: "a", freq: 900, db: 52, cls: "speech-label" },
    { text: "o", freq: 1250, db: 50, cls: "speech-label" },
    { text: "u", freq: 1700, db: 48, cls: "speech-label" },

    { text: "p", freq: 1600, db: 45, cls: "speech-label" },
    { text: "ch", freq: 2200, db: 48, cls: "speech-label" },
    { text: "k", freq: 2700, db: 50, cls: "speech-label" },
    { text: "sh", freq: 2500, db: 58, cls: "speech-label" },
    { text: "h", freq: 3000, db: 62, cls: "speech-label" },

    { text: "f", freq: 4000, db: 36, cls: "speech-label" },
    { text: "th", freq: 5000, db: 34, cls: "speech-label" },
    { text: "s", freq: 6100, db: 40, cls: "speech-label" },

    { text: "vowels", freq: 850, db: 64, cls: "speech-label-soft" },
    { text: "consonants", freq: 3500, db: 24, cls: "speech-label-soft" }
  ];

  for (const label of labels) {
    appendText(svg, xForFreq(label.freq), yForDb(label.db), label.text, "middle", label.cls);
  }
}

function drawEverydaySoundOverlay(svg, xForFreq, yForDb, type) {
  const labels = [
    { text: "Truck", icon: "🚚", freq: 160, db: 82 },
    { text: "Male voice", icon: "👨", freq: 280, db: 72 },
    { text: "Piano", icon: "🎹", freq: 700, db: 86 },
    { text: "Telephone", icon: "☎", freq: 1600, db: 78 },
    { text: "Female voice", icon: "👩", freq: 2200, db: 68 },
    { text: "Child speech", icon: "👶", freq: 3600, db: 58 },
    { text: "Birds", icon: "🐦", freq: 5200, db: 12 },
    { text: "Electronic beep", icon: "🔔", freq: 6400, db: 8 }
  ];

  for (const item of labels) {
    const threshold = getInterpolatedDb(type.points, item.freq);
    const muted = threshold >= item.db + 8;
    const label = `${item.icon} ${item.text}`;
    appendText(
      svg,
      xForFreq(item.freq),
      yForDb(item.db),
      label,
      "middle",
      muted ? "everyday-label muted-sound" : "everyday-label"
    );
  }
}

function getInterpolatedDb(points, frequency) {
  const sorted = [...points].sort((a, b) => a[0] - b[0]);
  if (frequency <= sorted[0][0]) return sorted[0][1];
  if (frequency >= sorted[sorted.length - 1][0]) return sorted[sorted.length - 1][1];

  for (let i = 0; i < sorted.length - 1; i++) {
    const [f1, db1] = sorted[i];
    const [f2, db2] = sorted[i + 1];
    if (frequency >= f1 && frequency <= f2) {
      const ratio = (Math.log2(frequency) - Math.log2(f1)) / (Math.log2(f2) - Math.log2(f1));
      return db1 + (db2 - db1) * ratio;
    }
  }

  return sorted[sorted.length - 1][1];
}

function appendRect(svg, x, y, w, h, fill) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  el.setAttribute("x", x);
  el.setAttribute("y", y);
  el.setAttribute("width", w);
  el.setAttribute("height", h);
  el.setAttribute("fill", fill);
  svg.appendChild(el);
}

function appendLine(svg, x1, y1, x2, y2, stroke, strokeWidth) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", "line");
  el.setAttribute("x1", x1);
  el.setAttribute("y1", y1);
  el.setAttribute("x2", x2);
  el.setAttribute("y2", y2);
  el.setAttribute("stroke", stroke);
  el.setAttribute("stroke-width", strokeWidth);
  svg.appendChild(el);
}

function appendText(svg, x, y, content, anchor, className, transform = null) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", "text");
  el.setAttribute("x", x);
  el.setAttribute("y", y);
  el.setAttribute("text-anchor", anchor);
  el.setAttribute("class", className);
  if (transform) el.setAttribute("transform", transform);
  el.textContent = content;
  svg.appendChild(el);
}

function appendCircle(svg, cx, cy, r, fill) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  el.setAttribute("cx", cx);
  el.setAttribute("cy", cy);
  el.setAttribute("r", r);
  el.setAttribute("fill", fill);
  svg.appendChild(el);
}

async function playAudio({ processed }) {
  if (!audioBuffer) {
    alert("音声ファイルを選択するか、サンプル音声を読み込んでください。");
    return;
  }

  await ensureAudioContext();
  stopAll();

  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  activeNodes.push(source);

  if (!processed) {
    const gain = audioContext.createGain();
    gain.gain.value = 1.0;
    source.connect(gain).connect(audioContext.destination);
    source.start();
    return;
  }

  const type = audiogramTypes[els.audiogramType.value];
  const level = getSelectedHearingLevel();
  const clarity = Number(els.clarity.value);
  const adjustedPoints = getAdjustedAudiogramPoints(type.points, level.targetAverage);

  const audiogramEQ = createAudiogramEQ(audioContext, adjustedPoints);
  const clarityFilter = createClarityFilter(audioContext, clarity);
  const consonantReduction = createConsonantReductionFilter(audioContext, clarity);
  const compressor = createCompressor(audioContext);
  const outputGain = audioContext.createGain();
  outputGain.gain.value = 0.95;

  const smear = createTimeSmearDelay(audioContext, clarity);

  connectSeries(
    source,
    [...audiogramEQ, clarityFilter, consonantReduction, compressor, outputGain],
    audioContext.destination
  );

  // A delayed copy makes fast consonant edges less distinct.
  compressor.connect(smear.delay).connect(smear.gain).connect(outputGain);

  const noiseBundle = createNoise(audioContext, clarity);
  noiseBundle.noise.connect(noiseBundle.gain).connect(audioContext.destination);
  activeNodes.push(noiseBundle.noise);

  source.start();
  noiseBundle.noise.start();
}

function stopAll() {
  for (const node of activeNodes) {
    try {
      node.stop();
    } catch (_) {
      // already stopped
    }
  }
  activeNodes = [];
}

function createClarityFilter(context, clarity) {
  const normalized = clarity / 100;
  const filter = context.createBiquadFilter();

  // Stronger clarity simulation:
  // Lower clarity removes more high-frequency speech cues that carry consonants.
  // This is not a reproduction of any specific person's hearing.
  filter.type = "lowpass";
  filter.frequency.value = 500 + (7200 * Math.pow(normalized, 2.2));
  filter.Q.value = 0.45 + normalized * 0.35;

  return filter;
}

function createConsonantReductionFilter(context, clarity) {
  const normalized = clarity / 100;
  const filter = context.createBiquadFilter();

  // Reduces a broad consonant-heavy band around 3kHz.
  // Lower clarity = deeper cut.
  filter.type = "peaking";
  filter.frequency.value = 3200;
  filter.Q.value = 0.9;
  filter.gain.value = -2 - (1 - normalized) * 32;

  return filter;
}

function createTimeSmearDelay(context, clarity) {
  const normalized = clarity / 100;
  const delay = context.createDelay(0.08);
  const gain = context.createGain();

  // Adds a small delayed copy to blur fast speech edges.
  delay.delayTime.value = 0.008 + (1 - normalized) * 0.045;
  gain.gain.value = (1 - normalized) * 0.23;

  return { delay, gain };
}

function createCompressor(context) {
  const compressor = context.createDynamicsCompressor();
  compressor.threshold.value = -34;
  compressor.knee.value = 18;
  compressor.ratio.value = 7;
  compressor.attack.value = 0.005;
  compressor.release.value = 0.25;
  return compressor;
}

function createNoise(context, clarity) {
  const seconds = Math.max(2, audioBuffer.duration);
  const length = Math.ceil(context.sampleRate * seconds);
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = context.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;

  const gain = context.createGain();
  gain.gain.value = Math.pow((100 - clarity) / 100, 1.2) * 0.18;

  return { noise, gain };
}
