import { describe, it, expect } from "vitest";
import { EMPTY_VOCABULARY, record, type LearnedVocabulary } from "./learned.ts";
import {
  agreement,
  applySetAsides,
  candidateKey,
  checkProposals,
  decidedKeys,
  proposalQueue,
  toEntry,
  type Proposal,
  type ProposedFields,
} from "./proposals.ts";
import type { ShortlistVerdict } from "./shortlist.ts";
import type { ApprovedEntry, Candidate } from "./types.ts";

const TODAY = "2026-09-28";

function candidate(externalId: string, over: Partial<Candidate> = {}): Candidate {
  return {
    sourceId: "pexels",
    externalId,
    providerTitle: `Candidate ${externalId}`,
    providerAlt: `A provider caption for ${externalId}, written for search.`,
    objectUrl: `https://www.pexels.com/photo/${externalId}/`,
    creator: "Jane Doe",
    creatorUrl: "https://www.pexels.com/@janedoe",
    dateDisplay: null,
    medium: "Photograph",
    classification: null,
    intrinsicWidth: 3000,
    intrinsicHeight: 4000,
    dominantColour: "#e8e4dc",
    imageUrl: `https://images.pexels.com/photos/${externalId}/pexels-photo-${externalId}.jpeg`,
    licenceId: "pexels",
    retrievedAt: "2026-09-20",
    plannedSubject: "still-life",
    ...over,
  };
}

function fields(over: Partial<ProposedFields> = {}): ProposedFields {
  return {
    title: "White Tulip",
    subject: "still-life",
    difficulty: "steady",
    minutes: 20,
    alt: "One white tulip leaning out of a round frosted vase, on a pale grey ground.",
    palette: [{ name: "Cool Grey", hex: "#8e9699" }],
    ...over,
  };
}

function proposal(id: string, over: Partial<Proposal> = {}): Proposal {
  return {
    candidateId: `pexels:${id}`,
    decision: "approve",
    confidence: "high",
    reason: "One clear subject on a plain ground",
    fields: fields(),
    ...over,
  };
}

function verdict(c: Candidate, score = 5): ShortlistVerdict {
  return { candidate: c, score, reasons: [], concerns: [], shortlisted: true };
}

const queue = new Map(["1", "2", "3", "4"].map((id) => [`pexels:${id}`, candidate(id)]));

describe("checking a proposal set", () => {
  it("accepts a well-formed set", () => {
    const { set, problems } = checkProposals(
      {
        proposedBy: "Claude",
        proposedAt: TODAY,
        proposals: [
          proposal("1"),
          proposal("2", { decision: "set-aside", reason: "Too busy", fields: undefined }),
        ],
      },
      queue,
      TODAY,
    );
    expect(problems).toEqual([]);
    expect(set.proposals).toHaveLength(2);
    expect(set.proposedBy).toBe("Claude");
  });

  it("insists on knowing who made the proposals", () => {
    const { problems } = checkProposals({ proposals: [] }, queue, TODAY);
    expect(problems).toContain("no proposedBy: say who made these");
  });

  it("refuses a file with no proposals list", () => {
    const { set, problems } = checkProposals({ proposedBy: "Claude" }, queue, TODAY);
    expect(problems).toContain("no proposals list");
    expect(set.proposals).toEqual([]);
  });

  it("refuses a candidate that is not in the queue being reviewed", () => {
    const { problems } = checkProposals(
      { proposedBy: "Claude", proposals: [proposal("999")] },
      queue,
      TODAY,
    );
    expect(problems).toEqual(["pexels:999: not in this queue"]);
  });

  it("refuses the same candidate proposed twice", () => {
    const { problems } = checkProposals(
      { proposedBy: "Claude", proposals: [proposal("1"), proposal("1")] },
      queue,
      TODAY,
    );
    expect(problems).toContain("pexels:1: proposed twice");
  });

  it("refuses an unknown decision, an unknown confidence and a missing reason", () => {
    const { problems } = checkProposals(
      {
        proposedBy: "Claude",
        proposals: [
          proposal("1", {
            decision: "maybe" as never,
            confidence: "medium" as never,
            reason: "  ",
          }),
        ],
      },
      queue,
      TODAY,
    );
    expect(problems).toEqual([
      'pexels:1: decision must be "approve" or "set-aside"',
      'pexels:1: confidence must be "high" or "low"',
      "pexels:1: no reason",
    ]);
  });

  it("accepts notes for the curator, but not empty ones", () => {
    const ok = checkProposals(
      { proposedBy: "Claude", proposals: [proposal("1", { notes: ["Palette chosen by eye."] })] },
      queue,
      TODAY,
    );
    expect(ok.problems).toEqual([]);
    const bad = checkProposals(
      {
        proposedBy: "Claude",
        proposals: [proposal("1", { notes: [" "] }), proposal("2", { notes: "one line" as never })],
      },
      queue,
      TODAY,
    );
    expect(bad.problems).toEqual([
      "pexels:1: notes must be a list of non-empty lines",
      "pexels:2: notes must be a list of non-empty lines",
    ]);
  });

  it("requires an approval to come with its fields filled in", () => {
    const { problems } = checkProposals(
      { proposedBy: "Claude", proposals: [proposal("1", { fields: undefined })] },
      queue,
      TODAY,
    );
    expect(problems).toEqual(["pexels:1: an approval needs its fields filled in"]);
  });

  it("does not ask a set-aside for fields nobody will use unless it is overruled", () => {
    const { problems } = checkProposals(
      {
        proposedBy: "Claude",
        proposals: [proposal("1", { decision: "set-aside", fields: undefined })],
      },
      queue,
      TODAY,
    );
    expect(problems).toEqual([]);
  });

  it("runs an approval through the build's own gate", () => {
    // Proposing something catalog:build would then refuse would only move the
    // failure twenty entries later.
    const provider = queue.get("pexels:2")!.providerAlt!;
    const { problems } = checkProposals(
      {
        proposedBy: "Claude",
        proposals: [
          proposal("1", { fields: fields({ alt: "A tulip." }) }),
          proposal("2", { fields: fields({ alt: provider }) }),
        ],
      },
      queue,
      TODAY,
    );
    expect(problems).toHaveLength(2);
    expect(problems[0]).toMatch(/^pexels:1: alt only 8 characters/);
    expect(problems[1]).toMatch(/^pexels:2: alt is the provider's own caption/);
  });

  it("checks the shape of every field it would put in the form", () => {
    const { problems } = checkProposals(
      {
        proposedBy: "Claude",
        proposals: [
          proposal("1", {
            decision: "set-aside",
            fields: fields({
              title: " ",
              subject: "pottery" as never,
              difficulty: "easy" as never,
              palette: [{ name: "Cool Grey", hex: "grey" }],
              prompt: "",
              tip: " ",
            }),
          }),
          proposal("2", {
            decision: "set-aside",
            fields: fields({ palette: "Cool Grey" as never }),
          }),
        ],
      },
      queue,
      TODAY,
    );
    expect(problems).toEqual([
      "pexels:1: no title",
      'pexels:1: unknown subject "pottery"',
      'pexels:1: unknown difficulty "easy"',
      'pexels:1: palette entry {"name":"Cool Grey","hex":"grey"} needs a name and a #rrggbb hex',
      "pexels:1: prompt is empty; leave it out instead",
      "pexels:1: tip is empty; leave it out instead",
      "pexels:2: palette must be a list",
    ]);
  });
});

describe("the entry an accepted approval writes", () => {
  it("carries every proposed field and leaves out the optional ones it lacks", () => {
    const e = toEntry(candidate("1"), fields(), TODAY);
    expect(e).toMatchObject({
      title: "White Tulip",
      subject: "still-life",
      difficulty: "steady",
      minutes: 20,
      kind: "photograph",
      approvedAt: TODAY,
    });
    expect(e).not.toHaveProperty("prompt");
    expect(e).not.toHaveProperty("tip");
  });

  it("keeps a prompt and tip when there are some, and calls museum pieces artworks", () => {
    const e = toEntry(
      candidate("1", { sourceId: "met" }),
      fields({ prompt: "Leave the petals as paper.", tip: "Glaze the shadow once." }),
      TODAY,
    );
    expect(e.prompt).toBe("Leave the petals as paper.");
    expect(e.tip).toBe("Glaze the shadow once.");
    expect(e.kind).toBe("artwork");
  });
});

describe("which candidates are already decided", () => {
  it("counts approvals and recorded decisions either way", () => {
    const approved = [{ candidate: candidate("1") } as ApprovedEntry];
    let v: LearnedVocabulary = EMPTY_VOCABULARY;
    v = record(v, "rejected", "pexels:2", "busy", "Too busy", TODAY, "still-life");
    expect([...decidedKeys(approved, v)].sort()).toEqual(["pexels:1", "pexels:2"]);
  });
});

describe("the queue a proposal set produces", () => {
  const cs = ["1", "2", "3", "4", "5", "6"].map((id) => candidate(id));
  const verdicts = cs.map((c) => verdict(c));
  const proposals = [
    proposal("1", { decision: "set-aside", confidence: "high" }),
    proposal("2", { decision: "set-aside", confidence: "low" }),
    proposal("3", { decision: "approve", confidence: "low" }),
    proposal("4", { decision: "approve", confidence: "high" }),
    proposal("6", { decision: "approve", confidence: "high" }),
  ];
  const ids = (q: ReturnType<typeof proposalQueue>) => q.map((v) => v.candidate.externalId);

  it("shows only the proposed approvals, confident ones first", () => {
    // Set-asides (1, 2) are applied without review; 5 has no proposal.
    expect(ids(proposalQueue(verdicts, proposals, new Set()))).toEqual(["4", "6", "3"]);
  });

  it("keeps the shortlist's order inside each group", () => {
    const reversed = [...verdicts].reverse();
    expect(ids(proposalQueue(reversed, proposals, new Set()))).toEqual(["6", "4", "3"]);
  });

  it("leaves out whatever the curator has already decided", () => {
    const q = proposalQueue(verdicts, proposals, new Set(["pexels:4", "pexels:5"]));
    expect(ids(q)).toEqual(["6", "3"]);
  });

  it("attaches each proposal to its own candidate", () => {
    const q = proposalQueue(verdicts, proposals, new Set());
    expect(q.find((v) => v.candidate.externalId === "3")?.proposal?.confidence).toBe("low");
    expect(q.every((v) => v.proposal?.candidateId === candidateKey(v.candidate))).toBe(true);
  });

  it("uses the same key the vocabulary records decisions under", () => {
    expect(candidateKey(cs[0]!)).toBe("pexels:1");
  });
});

describe("recording set-asides without review", () => {
  const candidates = new Map(
    ["1", "2", "3"].map((id) => [`pexels:${id}`, candidate(id, { providerTitle: `Busy flat lay ${id}` })]),
  );
  const set = {
    proposedBy: "Claude",
    proposedAt: TODAY,
    proposals: [
      proposal("1", { decision: "set-aside", reason: "A hand in the picture" }),
      proposal("2", { decision: "approve" }),
      proposal("3", { decision: "set-aside", reason: "Too busy" }),
    ],
  };

  it("records each set-aside with its reason and who decided it", () => {
    const { vocabulary, applied } = applySetAsides(EMPTY_VOCABULARY, set, candidates, new Set(), TODAY);
    expect(applied).toEqual(["pexels:1", "pexels:3"]);
    expect(vocabulary.notes).toEqual([
      {
        decision: "rejected",
        reason: "A hand in the picture",
        candidateId: "pexels:1",
        at: TODAY,
        subject: "still-life",
        proposed: "set-aside",
        decidedBy: "Claude",
      },
      {
        decision: "rejected",
        reason: "Too busy",
        candidateId: "pexels:3",
        at: TODAY,
        subject: "still-life",
        proposed: "set-aside",
        decidedBy: "Claude",
      },
    ]);
  });

  it("never touches an approval, which is the curator's to make", () => {
    const { vocabulary } = applySetAsides(EMPTY_VOCABULARY, set, candidates, new Set(), TODAY);
    expect(vocabulary.notes.some((n) => n.candidateId === "pexels:2")).toBe(false);
  });

  it("teaches the vocabulary from the provider's words, like a reviewed decision", () => {
    const { vocabulary } = applySetAsides(EMPTY_VOCABULARY, set, candidates, new Set(), TODAY);
    const flatLay = vocabulary.phrases.find((p) => p.phrase === "flat lay" && p.subject === "still-life");
    expect(flatLay).toEqual({ phrase: "flat lay", subject: "still-life", approved: 0, rejected: 2 });
  });

  it("skips anything already decided, so running it twice changes nothing", () => {
    const once = applySetAsides(EMPTY_VOCABULARY, set, candidates, new Set(), TODAY);
    const again = applySetAsides(
      once.vocabulary,
      set,
      candidates,
      decidedKeys([], once.vocabulary),
      TODAY,
    );
    expect(again.applied).toEqual([]);
    expect(again.vocabulary).toEqual(once.vocabulary);
  });

  it("skips a proposal for a candidate it cannot find", () => {
    const { applied } = applySetAsides(EMPTY_VOCABULARY, set, new Map(), new Set(), TODAY);
    expect(applied).toEqual([]);
  });
});

describe("measuring agreement with proposals", () => {
  it("counts matches and each way of being overruled", () => {
    let v: LearnedVocabulary = EMPTY_VOCABULARY;
    v = record(v, "approved", "pexels:1", "tulip", "", TODAY, "still-life", { proposed: "approve" });
    v = record(v, "rejected", "pexels:2", "busy", "Too busy", TODAY, "still-life", { proposed: "set-aside" });
    v = record(v, "rejected", "pexels:3", "bottle", "Soft focus", TODAY, "still-life", { proposed: "approve" });
    v = record(v, "approved", "pexels:4", "shell", "", TODAY, "still-life", { proposed: "set-aside" });
    // Decided without a proposal, so it says nothing about proposals.
    v = record(v, "rejected", "pexels:5", "hand", "A hand", TODAY, "still-life");

    expect(agreement(v)).toEqual({
      decided: 4,
      agreed: 2,
      overruledApprovals: 1,
      overruledSetAsides: 1,
    });
  });

  it("does not count a set-aside nobody reviewed as agreement", () => {
    let v: LearnedVocabulary = EMPTY_VOCABULARY;
    v = record(v, "approved", "pexels:1", "tulip", "", TODAY, "still-life", { proposed: "approve" });
    v = record(v, "rejected", "pexels:2", "busy", "Too busy", TODAY, "still-life", {
      proposed: "set-aside",
      decidedBy: "Claude",
    });
    expect(agreement(v)).toEqual({ decided: 1, agreed: 1, overruledApprovals: 0, overruledSetAsides: 0 });
  });

  it("counts a curator's later decision on a candidate first set aside without review", () => {
    let v: LearnedVocabulary = EMPTY_VOCABULARY;
    v = record(v, "rejected", "pexels:1", "busy", "Too busy", TODAY, "still-life", {
      proposed: "set-aside",
      decidedBy: "Claude",
    });
    v = record(v, "approved", "pexels:1", "busy", "Actually fine", TODAY, "still-life", { proposed: "set-aside" });
    expect(agreement(v)).toEqual({ decided: 1, agreed: 0, overruledApprovals: 0, overruledSetAsides: 1 });
  });

  it("keeps a decision on a proposal even when no reason was given", () => {
    const v = record(EMPTY_VOCABULARY, "approved", "pexels:1", "tulip", "", TODAY, "still-life", {
      proposed: "approve",
    });
    expect(v.notes).toEqual([
      {
        decision: "approved",
        reason: "",
        candidateId: "pexels:1",
        at: TODAY,
        subject: "still-life",
        proposed: "approve",
      },
    ]);
  });

  it("still drops a reasonless decision that had no proposal, as before", () => {
    const v = record(EMPTY_VOCABULARY, "approved", "pexels:1", "tulip", "", TODAY, "still-life");
    expect(v.notes).toEqual([]);
  });

  it("uses the latest decision when a candidate was decided twice", () => {
    let v: LearnedVocabulary = EMPTY_VOCABULARY;
    v = record(v, "rejected", "pexels:1", "tulip", "Hmm", TODAY, "still-life", { proposed: "approve" });
    v = record(v, "approved", "pexels:1", "tulip", "", TODAY, "still-life", { proposed: "approve" });
    expect(agreement(v)).toEqual({ decided: 1, agreed: 1, overruledApprovals: 0, overruledSetAsides: 0 });
  });
});
