const audiogramTypes = {
  normal: {
    name: "正常聴力",
    summary: "各周波数が概ねよく聞こえる状態です。",
    description: "比較用の設定です。実際の聞こえ方は環境や音源によっても変わります。",
    points: [
      [125, 10], [250, 10], [500, 10], [1000, 10], [2000, 10], [4000, 10], [8000, 10]
    ],
    filter: { kind: "normal" }
  },
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

const els = {
  audioFile: document.getElementById("audioFile"),
  loadSampleBtn: document.getElementById("loadSampleBtn"),
  playOriginalBtn: document.getElementById("playOriginalBtn"),
  playProcessedBtn: document.getElementById("playProcessedBtn"),
  stopBtn: document.getElementById("stopBtn"),
  audiogramType: document.getElementById("audiogramType"),
  typeName: document.getElementById("typeName"),
  typeSummary: document.getElementById("typeSummary"),
  typeDescription: document.getElementById("typeDescription"),
  audiogramSvg: document.getElementById("audiogramSvg"),
  volume: document.getElementById("volume"),
  volumeValue: document.getElementById("volumeValue"),
  clarity: document.getElementById("clarity"),
  clarityValue: document.getElementById("clarityValue"),
  currentSettings: document.getElementById("currentSettings")
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

  els.volume.addEventListener("input", () => {
    updateSliderLabels();
    updateSettings();
  });

  els.clarity.addEventListener("input", () => {
    updateSliderLabels();
    updateSettings();
  });

  els.audioFile.addEventListener("change", handleFile);
  els.loadSampleBtn.addEventListener("click", loadSampleTone);
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

  enablePlayback();
}

async function loadSampleTone() {
  await ensureAudioContext();

  // Browser-only sample voice-like tone.
  // This is not speech, but lets the UI work before a user chooses a file.
  const duration = 4;
  const sampleRate = audioContext.sampleRate;
  const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
  const data = buffer.getChannelData(0);

  const syllableFreqs = [220, 330, 440, 660, 330, 550, 440, 280];
  for (let i = 0; i < data.length; i++) {
    const t = i / sampleRate;
    const idx = Math.floor((t / duration) * syllableFreqs.length);
    const base = syllableFreqs[Math.min(idx, syllableFreqs.length - 1)];
    const envelope = 0.5 + 0.5 * Math.sin(2 * Math.PI * 3 * t);
    data[i] =
      0.18 * envelope * Math.sin(2 * Math.PI * base * t) +
      0.08 * envelope * Math.sin(2 * Math.PI * base * 2.1 * t) +
      0.04 * envelope * Math.sin(2 * Math.PI * base * 3.7 * t);
  }

  audioBuffer = buffer;
  enablePlayback();
}

function enablePlayback() {
  els.playOriginalBtn.disabled = false;
  els.playProcessedBtn.disabled = false;
  els.stopBtn.disabled = false;
}

function updateSliderLabels() {
  els.volumeValue.textContent = els.volume.value;
  els.clarityValue.textContent = els.clarity.value;
}

function updateSettings() {
  const type = audiogramTypes[els.audiogramType.value];
  els.currentSettings.textContent =
    `オージオグラムタイプ：${type.name}\n` +
    `音量：${els.volume.value}%\n` +
    `ことばの明瞭度：${els.clarity.value}%\n\n` +
    `あなたが体験したのは、数ある聞こえ方のひとつです。\n同じ難聴者でも、聞こえ方は一人ひとり異なります。\nこの体験が、さまざまな聞こえ方を知るきっかけになれば幸いです。`;
}

function updateAudiogramInfo() {
  const type = audiogramTypes[els.audiogramType.value];
  els.typeName.textContent = type.name;
  els.typeSummary.textContent = type.summary;
  els.typeDescription.textContent = type.description;
  drawAudiogram(type);
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
  const dbMax = 100;

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
  for (const db of [-10, 0, 20, 40, 60, 80, 100]) {
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

  for (const [f, db] of type.points) {
    appendCircle(svg, xForFreq(f), yForDb(db), 6, "#355c7d");
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
    { text: "Truck", icon: "🚚", freq: 160, db: 82, group: "low" },
    { text: "Male voice", icon: "👨", freq: 280, db: 72, group: "low" },
    { text: "Piano", icon: "🎹", freq: 700, db: 86, group: "mid" },
    { text: "Telephone", icon: "☎", freq: 1600, db: 78, group: "mid" },
    { text: "Female voice", icon: "👩", freq: 2200, db: 68, group: "midHigh" },
    { text: "Child speech", icon: "👶", freq: 3600, db: 58, group: "high" },
    { text: "Birds", icon: "🐦", freq: 5200, db: 12, group: "high" },
    { text: "Electronic beep", icon: "🔔", freq: 6400, db: 8, group: "high" }
  ];

  const mutedGroups = getMutedSoundGroups(type.filter.kind);

  for (const item of labels) {
    const muted = mutedGroups.includes(item.group);
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

function getMutedSoundGroups(filterKind) {
  if (filterKind === "lowpass") return ["high", "midHigh"];
  if (filterKind === "highpass") return ["low"];
  if (filterKind === "notch") return ["mid", "midHigh"];
  return [];
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
  const volume = Number(els.volume.value) / 100;
  const clarity = Number(els.clarity.value);

  const audiogramFilter = createAudiogramFilter(audioContext, type.filter);
  const clarityFilter = createClarityFilter(audioContext, clarity);
  const compressor = createCompressor(audioContext);
  const gain = audioContext.createGain();
  gain.gain.value = volume;

  source
    .connect(audiogramFilter)
    .connect(clarityFilter)
    .connect(compressor)
    .connect(gain)
    .connect(audioContext.destination);

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

function createAudiogramFilter(context, config) {
  const filter = context.createBiquadFilter();

  if (config.kind === "normal") {
    filter.type = "allpass";
    return filter;
  }

  if (config.kind === "flat") {
    filter.type = "allpass";
    return filter;
  }

  filter.type = config.kind;
  filter.frequency.value = config.frequency;
  filter.Q.value = config.q ?? 0.8;
  return filter;
}

function createClarityFilter(context, clarity) {
  const normalized = clarity / 100;
  const filter = context.createBiquadFilter();

  // Lower clarity removes more high-frequency speech cues.
  filter.type = "lowpass";
  filter.frequency.value = 850 + (7600 * normalized);
  filter.Q.value = 0.8;

  return filter;
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
  gain.gain.value = ((100 - clarity) / 100) * 0.06;

  return { noise, gain };
}
