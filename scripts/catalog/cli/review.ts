/**
 * The curation gate, as a screen.
 *
 *   npm run catalog:review -- --source=pexels
 *   npm run catalog:review -- --source=pexels --subject=still-life --proposals
 *
 * With --proposals, the queue is the proposed approvals still undecided,
 * each with every field already filled in, read from
 * catalog/proposals/<source>.json (or --proposals=<file>). Agreeing is one
 * press; changing anything is the same form as always. Proposed set-asides
 * are not shown: `npm run catalog:proposals -- --apply-set-asides` records
 * them. See proposals.ts.
 *
 * PRODUCT.md:68 left "how the curated catalogue is administered (who curates,
 * through what interface)" as an open decision. This is the answer for now: a
 * local-only page, no account, no deployment, writing straight to
 * catalog/approved/<source>.json.
 *
 * It exists because the two things that decide whether a reference belongs
 * cannot be fetched. Whether a composition can be held together in the stated
 * time is a judgement, and alt text that describes a subject usefully to
 * someone deciding whether to paint it has to be written by someone who
 * looked at it. The heuristics only choose what you see first.
 *
 * Binds to localhost. It writes to the working tree and has no authentication,
 * so it must never be exposed.
 */

import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { analyseImage, readColours } from "../imageAnalysis.ts";
import { ImageUnavailableError, fetchDisplayImage } from "../imageProxy.ts";
import { downscale } from "../imageResize.ts";
import {
  EMPTY_VOCABULARY,
  decisionText,
  record,
  type LearnedVocabulary,
} from "../learned.ts";
import { remoteImageUrl } from "../../../src/lib/sources/registry.ts";
import {
  agreement,
  candidateKey,
  checkProposals,
  decidedKeys,
  proposalQueue,
  type Proposal,
  type ProposalSet,
  type ProposedVerdict,
} from "../proposals.ts";
import { shortlist, type ShortlistVerdict } from "../shortlist.ts";
import { suggestFields } from "../suggest.ts";
import type { ApprovedEntry, Candidate } from "../types.ts";
import type { Subject } from "../../../src/lib/types.ts";
import { deriveAndStore, isDerived, isLocalSource, readManifest } from "../derive.ts";
import { trackUnsplashDownload } from "../providers/unsplash.ts";
import { args, loadEnv } from "./env.ts";

// For the Unsplash key, which the download report needs. Never overrides
// anything already exported in the shell.
loadEnv();

const source = args().source;
const port = Number(args().port ?? 4321);

if (!source) {
  console.error("Usage: --source=<pexels|unsplash|met> [--port=4321]");
  process.exit(1);
}

const SHORTLIST = `catalog/shortlist/${source}.json`;
const APPROVED = `catalog/approved/${source}.json`;

if (!existsSync(SHORTLIST)) {
  console.error(`No ${SHORTLIST}. Run catalog:harvest then catalog:shortlist first.`);
  process.exit(1);
}

const VOCABULARY = "catalog/curation-vocabulary.json";

function readVocabulary(): LearnedVocabulary {
  if (!existsSync(VOCABULARY)) return EMPTY_VOCABULARY;
  return JSON.parse(readFileSync(VOCABULARY, "utf-8")) as LearnedVocabulary;
}

function writeVocabulary(vocabulary: LearnedVocabulary): void {
  writeFileSync(VOCABULARY, `${JSON.stringify(vocabulary, null, 2)}
`, "utf-8");
}

/*
  Re-scored against what the curator has taught so far, rather than replaying
  whatever ordering the shortlist file was written with. Reopening the tool
  after a run of rejections should reflect them.
*/
const stored = JSON.parse(readFileSync(SHORTLIST, "utf-8")) as ShortlistVerdict[];
const subjectFilter = args().subject;

const allVerdicts = shortlist(
  stored.map((v) => v.candidate),
  readVocabulary(),
);

/*
  A broad harvest is several hundred candidates, which is not a queue anyone
  works through in one sitting. Curating one subject at a time against its
  target is tractable, and it is also how the catalogue reaches coverage
  rather than just growing.
*/
const subjectVerdicts = subjectFilter
  ? allVerdicts.filter((v) => v.candidate.plannedSubject === subjectFilter)
  : allVerdicts;

/*
  Proposals change the queue to the proposed approvals still undecided. A
  file that fails its checks stops the tool rather than half-loading, because
  a proposal quietly missing its alt text would surface as a build failure
  much later. It is checked against the whole source, since one file holds
  every subject's proposals.
*/
const proposalsArg = args().proposals;
const PROPOSALS = proposalsArg === "true" ? `catalog/proposals/${source}.json` : proposalsArg;
let proposalSet: ProposalSet | null = null;

if (PROPOSALS) {
  if (!existsSync(PROPOSALS)) {
    console.error(`No ${PROPOSALS}. Write proposals first, or drop --proposals.`);
    process.exit(1);
  }
  const { set, problems } = checkProposals(
    JSON.parse(readFileSync(PROPOSALS, "utf-8")),
    new Map(allVerdicts.map((v) => [candidateKey(v.candidate), v.candidate])),
    new Date().toISOString().slice(0, 10),
  );
  if (problems.length) {
    console.error(`${PROPOSALS} has ${problems.length} problem(s):`);
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }
  proposalSet = set;
}

const decidedAtStart = decidedKeys(readApproved(), readVocabulary());
const verdicts: ProposedVerdict[] = proposalSet
  ? proposalQueue(subjectVerdicts, proposalSet.proposals, decidedAtStart)
  : subjectVerdicts;

/** Proposed set-asides nobody has recorded, which this queue will not show. */
const unappliedSetAsides = proposalSet
  ? proposalSet.proposals.filter((p) => {
      if (p.decision !== "set-aside" || decidedAtStart.has(p.candidateId)) return false;
      return subjectVerdicts.some((v) => candidateKey(v.candidate) === p.candidateId);
    }).length
  : 0;

/** What was proposed for a candidate, so its decision can record it. */
const proposalFor = new Map<string, Proposal>(
  (proposalSet?.proposals ?? []).map((p) => [p.candidateId, p]),
);

if (subjectFilter && verdicts.length === 0) {
  console.error(
    `No ${subjectFilter} candidates. Harvest some: npm run catalog:harvest -- --plan --subject=${subjectFilter}`,
  );
  process.exit(1);
}

/*
  The plate is served by id rather than by URL. It keeps the exact original to
  fall back to when the provider's resize fails, and it means this process
  cannot be talked into fetching anything that is not already in the queue -
  which matters for a tool with no authentication.
*/
const byExternalId = new Map(verdicts.map((v) => [v.candidate.externalId, v.candidate]));

/** The width the plate is served at. The page never shows more than this. */
const DISPLAY_WIDTH = 1400;


function readApproved(): ApprovedEntry[] {
  return existsSync(APPROVED)
    ? (JSON.parse(readFileSync(APPROVED, "utf-8")) as ApprovedEntry[])
    : [];
}

function writeApproved(entries: ApprovedEntry[]): void {
  mkdirSync("catalog/approved", { recursive: true });
  writeFileSync(APPROVED, `${JSON.stringify(entries, null, 2)}\n`, "utf-8");
}

const PAGE = `<!doctype html>
<html lang="en-NZ">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Curate - little wash</title>
<style>
  :root { --ink:#2b2b28; --soft:#5c5a52; --faint:#827f74; --line:#ddd8cc;
          --paper:#f7f4ee; --raised:#fffdf8; --mat:#f2f1ee; --teal:#2e6b6b; }
  * { box-sizing:border-box; }
  body { margin:0; font:15px/1.5 ui-sans-serif,system-ui,sans-serif; color:var(--ink); background:var(--paper); }
  header { padding:14px 20px; border-bottom:1px solid var(--line); display:flex; flex-wrap:wrap; gap:4px 16px; align-items:baseline; }
  h1 { font-size:17px; margin:0; font-weight:600; }
  .count { color:var(--faint); font-size:13px; }
  main { display:grid; grid-template-columns:minmax(0,1fr) minmax(360px,460px); gap:24px; padding:20px; align-items:start; }
  @media (max-width:900px){ main { grid-template-columns:1fr; } }
  .plate { background:var(--mat); border:1px solid var(--line); border-radius:8px; padding:12px; position:sticky; top:20px; }
  .plate img { display:block; width:100%; height:auto; max-height:70vh; object-fit:contain; }
  /* The display:block above outranks the user agent's [hidden] rule, which
     would otherwise leave a broken-image icon above the failure message. */
  .plate img[hidden] { display:none; }
  .plate-fail { padding:42px 16px; text-align:center; color:var(--soft); font-size:13.5px; }
  .plate-fail p { margin:0 0 12px; }
  .meta { margin-top:10px; font-size:13px; color:var(--soft); }
  .meta a { color:var(--teal); }
  .why { margin:12px 0; padding:10px 12px; border-radius:6px; background:var(--raised); border:1px solid var(--line); font-size:13px; }
  .why ul { margin:4px 0 0; padding-left:18px; }
  .good { color:#3f6b3f; } .bad { color:#8a4b32; }
  form { background:var(--raised); border:1px solid var(--line); border-radius:8px; padding:16px; }
  label { display:block; margin-bottom:12px; font-size:13px; font-weight:600; color:var(--soft); }
  input,select,textarea { width:100%; margin-top:4px; padding:8px 10px; font:inherit; font-weight:400; color:var(--ink);
    border:1px solid var(--line); border-radius:6px; background:#fff; }
  textarea { min-height:68px; resize:vertical; }
  .row { display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; }
  .hint { font-weight:400; color:var(--faint); font-size:12px; }
  .warn { color:#8a4b32; font-weight:400; font-size:12px; min-height:16px; display:block; margin-top:3px; }
  .actions { display:flex; gap:10px; margin-top:6px; }
  button { min-height:44px; padding:0 18px; font:inherit; font-weight:600; border-radius:22px; cursor:pointer; border:1px solid var(--line); }
  .approve { background:var(--teal); color:#fff; border-color:var(--teal); }
  .skip { background:transparent; color:var(--soft); }
  .done { padding:40px 20px; text-align:center; color:var(--soft); }
  .sugg { margin-top:4px; display:flex; flex-direction:column; gap:5px; }
  .sugg button { min-height:0; padding:7px 10px; text-align:left; font-weight:400; font-size:13px;
    line-height:1.4; border-radius:6px; background:var(--paper); color:var(--soft); border:1px dashed var(--line); width:100%; }
  .sugg button:hover { border-style:solid; color:var(--ink); background:#fff; }
  .swatches { display:flex; flex-wrap:wrap; gap:6px; align-items:center; margin-top:6px; }
  .sw { display:inline-flex; align-items:center; gap:6px; padding:4px 9px 4px 4px; border:1px solid var(--line);
    border-radius:20px; font-size:12px; background:#fff; }
  .dot { width:15px; height:15px; border-radius:50%; border:1px solid rgba(0,0,0,.14); }
  .reading { font-size:12.5px; line-height:1.5; }
  .reading li { margin-bottom:2px; }
  .pending { color:var(--faint); font-size:12.5px; font-style:italic; }
  .proposal { margin:0 0 14px; padding:10px 12px; border-radius:6px; border:1px solid var(--line); font-size:13.5px; }
  .proposal p { margin:4px 0 0; }
  /* Not .approve: that is the button class, and its white text would carry over. */
  .proposal-approve { background:#eef3ea; border-color:#c9d8c0; }
  .proposal .unsure { font-size:12px; font-weight:600; color:#8a4b32; margin-left:6px; }
  /* --soft, not --faint: faint drops to 3.6:1 on the tinted banner. */
  .proposal .by { color:var(--soft); font-size:12px; }
  dialog { border:1px solid var(--line); border-radius:10px; padding:18px; max-width:420px; width:90vw; }
  dialog h2 { margin:0 0 4px; font-size:15px; }
  dialog::backdrop { background:rgba(20,28,34,.45); }
</style>
</head>
<body>
<header>
  <h1>Curate: <span id="src"></span></h1>
  <span class="count" id="count"></span>
  <span class="count" id="saved"></span>
  <span class="count" id="agree"></span>
</header>
<div id="app"></div>

<script type="module">
const state = await (await fetch("/api/state")).json();
document.getElementById("src").textContent = state.subject
  ? state.source + " / " + state.subject
  : state.source;
let approved = state.approvedCount || 0;
function showProgress() {
  document.getElementById("saved").textContent = state.target
    ? approved + " of " + state.target + " approved for " + state.subject
    : approved + " approved";
}
showProgress();

/*
  How often decisions have matched the proposals, counted by the server from
  what was actually recorded. Only shown once there is something to count.
*/
const tally = state.agreement ? { ...state.agreement } : null;
function showAgreement() {
  if (!tally || !tally.decided) return;
  document.getElementById("agree").textContent =
    "agreed with " + state.proposedBy + " on " + tally.agreed + " of " + tally.decided;
}
showAgreement();

function esc(s){ return String(s ?? "").replace(/[&<>"']/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[ch]); }

const SUBJECTS = ["fruit","botanical","still-life","creatures","landscape","objects"];
const DIFFICULTIES = [["gentle","Gentle - loose shapes"],["steady","Steady - a clear subject"],["stretch","A stretch - more to hold together"]];

let i = 0;
const app = document.getElementById("app");

function slug(s){ return s.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,48); }

/*
  Both the plate and the canvas that reads its colours ask for this exact URL,
  so the second one is a cache hit rather than a second download. \`attempt\`
  busts that cache when the curator presses "Try again".
*/
function plateSrc(c, attempt){
  return "/api/image?id=" + encodeURIComponent(c.externalId) + (attempt ? "&attempt=" + attempt : "");
}

function render(){
  const queue = state.verdicts;
  if (i >= queue.length) {
    app.innerHTML = '<p class="done">Nothing left in the queue. Run <code>npm run catalog:build</code> to build the catalogue.</p>';
    return;
  }
  const v = queue[i];
  const c = v.candidate;
  const p = v.proposal || null;
  document.getElementById("count").textContent = (i+1) + " of " + queue.length + (v.shortlisted ? "" : " (set aside by the heuristics)");

  app.innerHTML = \`
    <main>
      <div>
        <div class="plate">
          <img id="plate" src="\${plateSrc(c, 0)}" alt="\${(c.providerAlt||"").replace(/"/g,"&quot;")}">
          <div class="plate-fail" id="platefail" hidden>
            <p>This image would not load from \${c.sourceId}, so there is nothing to judge.
               Try again, open it on \${c.sourceId}, or set it aside.</p>
            <button type="button" class="skip" id="replate">Try again</button>
          </div>
        </div>
        <p class="meta">
          \${c.creator ? c.creator + " &middot; " : ""}<a href="\${c.objectUrl}" target="_blank" rel="noopener">View on \${c.sourceId}</a>
          \${c.intrinsicWidth ? " &middot; " + c.intrinsicWidth + "x" + c.intrinsicHeight : ""}
          \${c.dateDisplay ? " &middot; " + c.dateDisplay : ""}
        </p>
        <div class="why">
          <strong>Why it is here (score \${v.score})</strong>
          <ul class="reading">\${v.reasons.map(r=>'<li class="good">'+r+'</li>').join("")}\${v.concerns.map(r=>'<li class="bad">'+r+'</li>').join("")}</ul>
        </div>
        <div class="why">
          <strong>What the pixels say</strong>
          <div id="reading"><p class="pending">Reading the image...</p></div>
        </div>
      </div>
      <form id="f">
        \${p ? \`<div class="proposal proposal-\${p.decision}" id="proposal">
          <strong>\${esc(state.proposedBy)} suggests: approve</strong>\${p.confidence === "low" ? '<span class="unsure">unsure</span>' : ""}
          <p>\${esc(p.reason)}</p>
          \${(p.notes || []).length ? '<ul class="reading">' + p.notes.map(n => '<li>' + esc(n) + '</li>').join("") + '</ul>' : ""}
          \${p.fields ? '<p class="by">Every field below is filled in as proposed. Change anything before you decide.</p>' : ""}
        </div>\` : ""}
        <label>Title<input name="title" required value="\${(c.providerTitle||"").slice(0,60).replace(/"/g,"&quot;")}"></label>
        <div class="row">
          <label>Subject<select name="subject">\${SUBJECTS.map(s=>'<option'+(s===(c.plannedSubject||"")?' selected':'')+'>'+s+'</option>').join("")}</select></label>
          <label>Difficulty<select name="difficulty">\${DIFFICULTIES.map(([v,l])=>'<option value="'+v+'">'+l.split(" - ")[0]+'</option>').join("")}</select></label>
          <label>Minutes<input name="minutes" type="number" min="1" value="10" required></label>
        </div>
        <label>Prompt <span class="hint">optional; one line inviting someone to paint it</span>
          <input name="prompt" placeholder="One pear, one wash. Let the colours meet while the paper is wet.">
          <span class="sugg" id="s-prompt"></span></label>
        <label>Alt text <span class="hint">describe the subject for someone deciding whether to paint it - not a caption</span>
          <textarea name="alt" required></textarea>
          <span class="warn" id="altwarn"></span>
          <span class="sugg" id="s-alt"></span></label>
        <label>Tip <span class="hint">optional; one concrete brushwork note</span><input name="tip">
          <span class="sugg" id="s-tip"></span></label>
        <label>Palette <span class="hint">read from the image and matched to pigments</span>
          <input name="palette" placeholder="Lemon Yellow:#dcd77e, Sap Green:#8ea24a">
          <span class="swatches" id="s-palette"></span></label>
        <label>Why it passes the gate <span class="hint">optional; teaches the shortlist</span><input name="note"></label>
        <div class="actions">
          <button type="submit" class="approve">Approve</button>
          <button type="button" class="skip" id="skip">\${p ? "Set aside instead" : "Set aside"}</button>
        </div>
      </form>
    </main>\`;

  /*
    Decode the image in a canvas and hand the raw pixels to the server, which
    runs the tested analysis. Sampling at 64x64 is plenty: dominant colours,
    border uniformity and value range all survive the downscale, and it keeps
    the payload at 16KB. The proxy makes the image same-origin, so getImageData
    is not blocked however the provider sets its CORS headers.
  */
  let sampled = null;
  let attempt = 0;

  async function analyse() {
    const canvas = document.createElement("canvas");
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const img = new Image();
    img.src = plateSrc(c, attempt);
    try {
      await img.decode();
    } catch {
      document.getElementById("reading").innerHTML =
        '<p class="bad">Could not load the image to read its colours. The palette will need doing by hand.</p>';
      return;
    }
    // Cover the square so the edges sampled are the image's real edges.
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    ctx.drawImage(img, (img.naturalWidth-side)/2, (img.naturalHeight-side)/2, side, side, 0, 0, 64, 64);
    sampled = Array.from(ctx.getImageData(0, 0, 64, 64).data);
    await suggest();
  }

  async function suggest() {
    if (!sampled) return;
    const res = await fetch("/api/suggest", {
      method: "POST", headers: { "content-type": "application/json" },
      // The id seeds which of the eligible suggestions are offered, so two
      // images that measure the same are not handed the same two sentences.
      body: JSON.stringify({
        data: sampled, width: 64, height: 64,
        subject: form.subject.value, seed: c.externalId,
      }),
    });
    if (!res.ok) return;
    const s = await res.json();

    document.getElementById("reading").innerHTML =
      '<ul class="reading">' +
      s.observations.map(o => '<li class="good">' + o + '</li>').join("") +
      s.concerns.map(o => '<li class="bad">' + o + '</li>').join("") +
      '</ul>';

    fill("s-prompt", s.prompts, v => { form.prompt.value = v; });
    fill("s-alt", s.altScaffolds, v => { form.alt.value = v; form.alt.focus(); checkAlt(); });
    fill("s-tip", s.tips, v => { form.tip.value = v; });

    const pal = document.getElementById("s-palette");
    pal.innerHTML = "";
    if (s.palette.length) {
      for (const p of s.palette) {
        const chip = document.createElement("span");
        chip.className = "sw";
        chip.innerHTML = '<span class="dot" style="background:' + p.hex + '"></span>' + p.name;
        pal.appendChild(chip);
      }
      const use = document.createElement("button");
      use.type = "button"; use.className = "skip";
      use.style.cssText = "min-height:0;padding:4px 10px;font-size:12px;border-radius:20px";
      use.textContent = "Use these";
      use.onclick = () => { form.palette.value = s.palette.map(p => p.name + ":" + p.hex).join(", "); };
      pal.appendChild(use);
    }

    // Only pre-set these while the curator has not touched them.
    if (!touched.has("difficulty")) form.difficulty.value = s.suggestedDifficulty;
    if (!touched.has("minutes")) form.minutes.value = s.suggestedMinutes;
  }

  function fill(id, options, apply) {
    const box = document.getElementById(id);
    box.innerHTML = "";
    for (const option of options) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = option;
      b.onclick = () => apply(option);
      box.appendChild(b);
    }
  }

  /*
    A plate that will not load is a decision the curator cannot make, so it
    says so and offers the way back rather than showing a broken image.
  */
  const plate = document.getElementById("plate");
  const plateFail = document.getElementById("platefail");
  plate.addEventListener("error", () => { plate.hidden = true; plateFail.hidden = false; });
  document.getElementById("replate").onclick = () => {
    attempt += 1;
    plateFail.hidden = true;
    plate.hidden = false;
    plate.src = plateSrc(c, attempt);
    document.getElementById("reading").innerHTML = '<p class="pending">Reading the image...</p>';
    void analyse();
  };

  const touched = new Set();
  const form = document.getElementById("f");
  for (const name of ["difficulty", "minutes"]) {
    form[name].addEventListener("change", () => touched.add(name));
  }
  form.subject.addEventListener("change", suggest);
  const alt = form.alt, warn = document.getElementById("altwarn");
  const providerAlt = (c.providerAlt||"").trim();

  // The same rules the build enforces, shown while typing rather than as a
  // failure twenty entries later.
  function checkAlt(){
    const v = alt.value.trim();
    if (!v) warn.textContent = "";
    else if (v.length < 40) warn.textContent = "Too short: " + v.length + " of 40 characters.";
    else if (v.toLowerCase() === form.title.value.trim().toLowerCase()) warn.textContent = "This is just the title again.";
    else if (providerAlt && v === providerAlt) warn.textContent = "This is the provider's own caption.";
    else warn.textContent = "";
    return warn.textContent === "" && alt.value.trim().length >= 40;
  }
  alt.addEventListener("input", checkAlt);
  form.title.addEventListener("input", checkAlt);

  /*
    A proposal fills the form in. Difficulty and minutes count as touched, so
    the pixel suggestions arriving a moment later do not overwrite them; the
    suggestion buttons still appear under each field as alternatives.
  */
  if (p && p.fields) {
    const f = p.fields;
    form.title.value = f.title;
    form.subject.value = f.subject;
    form.difficulty.value = f.difficulty;
    form.minutes.value = f.minutes;
    form.prompt.value = f.prompt || "";
    form.alt.value = f.alt;
    form.tip.value = f.tip || "";
    form.palette.value = (f.palette || []).map(s => s.name + ":" + s.hex).join(", ");
    touched.add("difficulty"); touched.add("minutes");
    checkAlt();
  }
  if (p) form.note.value = p.reason;

  function counted(decision) {
    if (!p || !tally) return;
    tally.decided += 1;
    if (decision === "approved") tally.agreed += 1;
    showAgreement();
  }

  document.getElementById("skip").onclick = async () => {
    const reason = prompt(
      "Why set this one aside? This teaches the shortlist what to stop showing you. Leave blank to skip without a reason.",
      "",
    );
    // Cancel means "I did not mean to", so nothing is recorded and nothing moves.
    if (reason === null) return;
    await fetch("/api/reject", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ candidate: c, reason }),
    });
    counted("rejected");
    i++; render();
  };

  void analyse();

  form.onsubmit = async (e) => {
    e.preventDefault();
    if (!checkAlt()) { alt.focus(); return; }
    const fd = new FormData(form);
    const palette = (fd.get("palette")||"").split(",").map(s=>s.trim()).filter(Boolean).map(pair=>{
      const [name,hex] = pair.split(":").map(x=>x.trim());
      return { name, hex };
    }).filter(p=>p.name && /^#[0-9a-fA-F]{6}$/.test(p.hex||""));

    const entry = {
      id: slug(fd.get("title")) + "-" + c.externalId.slice(-4),
      candidate: c,
      title: fd.get("title").trim(),
      subject: fd.get("subject"),
      difficulty: fd.get("difficulty"),
      minutes: Number(fd.get("minutes")),
      alt: fd.get("alt").trim(),
      palette,
      kind: c.sourceId === "met" ? "artwork" : "photograph",
      approvedAt: new Date().toISOString().slice(0,10),
      // Omitted rather than stored empty: some references say everything they
      // need to say by being the image, and a blank line is not a prompt.
      ...(fd.get("prompt").trim() ? { prompt: fd.get("prompt").trim() } : {}),
      ...(fd.get("tip").trim() ? { tip: fd.get("tip").trim() } : {}),
      ...(fd.get("note").trim() ? { curationNote: fd.get("note").trim() } : {}),
    };

    const res = await fetch("/api/approve", {
      method:"POST", headers:{"content-type":"application/json"}, body: JSON.stringify(entry),
    });
    const body = await res.json();
    if (!res.ok) { alert(body.error || "Could not save"); return; }
    approved += 1;
    showProgress();
    counted("approved");
    i++; render();
  };
}
render();
</script>
</body>
</html>`;

const server = createServer(async (req, res) => {
  const json = (code: number, body: unknown) => {
    res.writeHead(code, { "content-type": "application/json" });
    res.end(JSON.stringify(body));
  };

  if (req.url === "/api/state") {
    const approvedCount = readApproved().filter(
      (e) => !subjectFilter || e.subject === subjectFilter,
    ).length;
    return json(200, {
      source,
      verdicts,
      subject: subjectFilter ?? null,
      approvedCount,
      target: subjectFilter ? 12 : null,
      proposedBy: proposalSet?.proposedBy ?? null,
      agreement: proposalSet ? agreement(readVocabulary()) : null,
    });
  }

  /*
    The plate, and the pixels behind it.

    Everything goes through here rather than hotlinking, for two reasons.
    <canvas>.getImageData() is blocked on a cross-origin image unless the host
    sends CORS headers, and the Met sends none at all; serving the bytes from
    this same origin sidesteps that for every provider at once. And the
    provider's resize service is not reliable - see imageProxy.ts - so the
    fallback to the original has to happen somewhere the page cannot see.

    Cached briefly and deliberately: the page requests the same URL twice, once
    for the plate and once for the canvas that reads its colours, and the
    second should not be a second download.
  */
  if (req.url?.startsWith("/api/image")) {
    const candidate = byExternalId.get(
      new URL(req.url, "http://localhost").searchParams.get("id") ?? "",
    );
    if (!candidate) {
      return json(404, { error: "no candidate with that id is in this queue" });
    }
    try {
      const image = await fetchDisplayImage(
        {
          displayUrl: remoteImageUrl(candidate.sourceId, candidate.imageUrl, DISPLAY_WIDTH),
          originalUrl: candidate.imageUrl,
          width: DISPLAY_WIDTH,
        },
        { fetch, resize: downscale },
      );
      if (image.servedFrom === "original") {
        console.log(
          `${candidate.externalId}: ${candidate.sourceId} would not resize it, served the original` +
            (image.resizedLocally ? ` downscaled to ${DISPLAY_WIDTH}px` : " at full size"),
        );
      }
      res.writeHead(200, {
        "content-type": image.contentType,
        "cache-control": "private, max-age=600",
      });
      res.end(Buffer.from(image.bytes));
      return;
    } catch (error) {
      if (error instanceof ImageUnavailableError) {
        console.warn(`${candidate.externalId}: ${error.message}`);
      }
      res.writeHead(502, { "content-type": "application/json", "cache-control": "no-store" });
      res.end(JSON.stringify({ error: String(error) }));
      return;
    }
  }

  /*
    Suggestions from the pixels the page sampled.
    The page decodes the image with a canvas and posts the raw RGBA, which
    keeps an image-decoding dependency out of the project entirely. Everything
    downstream of here is the pure, tested analysis.
  */
  if (req.url === "/api/suggest" && req.method === "POST") {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    try {
      const body = JSON.parse(Buffer.concat(chunks).toString("utf-8")) as {
        data: number[];
        width: number;
        height: number;
        subject: Subject;
        seed?: string;
      };
      const analysis = analyseImage({
        data: body.data,
        width: body.width,
        height: body.height,
      });
      const reading = readColours(analysis);
      return json(200, suggestFields(analysis, reading, body.subject, body.seed));
    } catch (error) {
      return json(400, { error: String(error) });
    }
  }

  /*
    A rejection is as informative as an approval, and until now it was thrown
    away. Recording it is what lets the shortlist learn the curator's taste
    rather than staying stuck with my guesses about what "sketchable" means.
  */
  if (req.url === "/api/reject" && req.method === "POST") {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    try {
      const body = JSON.parse(Buffer.concat(chunks).toString("utf-8")) as {
        candidate: Candidate;
        reason: string;
      };
      const next = record(
        readVocabulary(),
        "rejected",
        `${body.candidate.sourceId}:${body.candidate.externalId}`,
        decisionText(body.candidate),
        body.reason ?? "",
        new Date().toISOString().slice(0, 10),
        body.candidate.plannedSubject,
        { proposed: proposalFor.get(candidateKey(body.candidate))?.decision },
      );
      writeVocabulary(next);
      console.log(`set aside ${body.candidate.externalId}: ${body.reason || "(no reason)"}`);
      return json(200, { notes: next.notes.length });
    } catch (error) {
      return json(400, { error: String(error) });
    }
  }

  if (req.url === "/api/approve" && req.method === "POST") {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    try {
      const entry = JSON.parse(Buffer.concat(chunks).toString("utf-8")) as ApprovedEntry;
      const entries = readApproved();
      const firstApproval = !entries.some(
        (e) => candidateKey(e.candidate) === candidateKey(entry.candidate),
      );
      // Re-approving replaces rather than duplicates, so a correction is just
      // another pass through the same candidate.
      const next = [...entries.filter((e) => e.id !== entry.id), entry];
      writeApproved(next);

      /*
        Unsplash counts a photo as used when its download link is called. Once
        per photo, on its first approval, so correcting an entry later does
        not count it twice. The approval is already saved; a miss is reported
        in the terminal rather than undoing it.
      */
      /*
        A museum piece is shipped as our own files, so it is derived now,
        while this process is online, and catalog:build can stay offline.
        A failure leaves the approval saved; catalog:derive retries it.
      */
      if (isLocalSource(entry.candidate.sourceId) && !isDerived(entry.id, readManifest())) {
        const outcome = await deriveAndStore(entry);
        if (outcome.derived) {
          console.log(`  derived ${entry.id} at ${outcome.widths.join(", ")}px, ${(outcome.bytes / 1024).toFixed(0)} KB`);
        } else {
          console.warn(`  could not derive ${entry.id}: ${outcome.reason}. Run npm run catalog:derive later.`);
        }
      }

      if (firstApproval && entry.candidate.sourceId === "unsplash") {
        const tracking = await trackUnsplashDownload(entry.candidate, { fetch, env: process.env });
        if (tracking.tracked) console.log(`  told Unsplash ${entry.candidate.externalId} was used`);
        else console.warn(`  could not tell Unsplash ${entry.candidate.externalId} was used: ${tracking.reason}`);
      }

      writeVocabulary(
        record(
          readVocabulary(),
          "approved",
          `${entry.candidate.sourceId}:${entry.candidate.externalId}`,
          decisionText(entry.candidate),
          entry.curationNote ?? "",
          entry.approvedAt,
          // What the curator actually filed it under, which is what a future
          // shortlist for that subject should learn from.
          entry.subject,
          { proposed: proposalFor.get(candidateKey(entry.candidate))?.decision },
        ),
      );

      console.log(`approved ${entry.id} (${next.length} total)`);
      return json(200, { total: next.length });
    } catch (error) {
      return json(400, { error: String(error) });
    }
  }

  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(PAGE);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Review ${verdicts.length} ${source} candidate(s): http://localhost:${port}`);
  if (proposalSet) {
    console.log(`Proposed approvals by ${proposalSet.proposedBy} from ${PROPOSALS}, undecided ones only.`);
    if (unappliedSetAsides) {
      console.log(
        `${unappliedSetAsides} proposed set-aside(s) are not recorded yet and will not be shown. ` +
          `Record them: npm run catalog:proposals -- --source=${source} --apply-set-asides`,
      );
    }
  }
  console.log(`Approvals are written to ${APPROVED}. Ctrl-C when you are done.`);
});
