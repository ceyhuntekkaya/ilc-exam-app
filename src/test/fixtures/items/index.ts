/**
 * F3-02: 14 madde tipi için en küçük geçerli `interaction` nesnesi — her biri `InteractionRenderer`'ın
 * ilgili görünümünü (ChoiceViews/TrueFalseView/.../ResponseViews) hiçbir alan eksik kalmadan render eder.
 * Yalnız `answerContract.test.ts` tüketir; alan adları backend `ObjectiveScorer.compare()` switch'i ile
 * birebir eşleşir (K-02/F3-02 doğrulaması: bkz. DURUM.md).
 */

export const multipleChoiceFixture = {
  options: [
    { id: "opt-paris", text: "Paris" },
    { id: "opt-lyon", text: "Lyon" },
  ],
};

export const multipleResponseFixture = {
  options: [
    { id: "opt-red", text: "Red" },
    { id: "opt-blue", text: "Blue" },
  ],
};

export const trueFalseFixture = {
  statements: [{ id: "s1", text: "The sky is blue" }],
};

export const fillInTheBlanksFixture = {
  supply: "PER_BLANK",
  text: "The capital is [[b1]].",
  blanks: [
    {
      blankId: "b1",
      choices: [
        { id: "c-paris", text: "Paris" },
        { id: "c-lyon", text: "Lyon" },
      ],
    },
  ],
};

export const shortAnswerFixture = {
  text: "The capital of France is [[b1]].",
  blanks: [{ blankId: "b1" }],
};

export const matchingFixture = {
  left: [{ id: "l1", text: "Capital of France" }],
  right: [
    { id: "r-paris", text: "Paris" },
    { id: "r-lyon", text: "Lyon" },
  ],
};

export const orderingFixture = {
  items: [
    { id: "i1", text: "First" },
    { id: "i2", text: "Second" },
  ],
};

export const groupingFixture = {
  items: [{ id: "m1", text: "Apple" }],
  groups: [
    { id: "g-fruit", label: "Fruit" },
    { id: "g-veg", label: "Veggie" },
  ],
};

export const hotspotSelectFixture = {
  mediaId: null,
  regions: [
    { id: "region-a", shape: { kind: "RECT", x: 0, y: 0, w: 0.2, h: 0.2 }, label: "A" },
    { id: "region-b", shape: { kind: "RECT", x: 0.5, y: 0.5, w: 0.2, h: 0.2 }, label: "B" },
  ],
};

export const hotspotPlaceFixture = {
  mediaId: null,
  draggables: [{ id: "d1", text: "Hat" }],
  zones: [{ id: "z-head", label: "Head", shape: { kind: "RECT", x: 0.1, y: 0.1, w: 0.2, h: 0.2 } }],
};

export const openEndedFixture = {
  minWords: null,
  maxWords: null,
};

export const audioResponseFixture = {
  maxAttempts: 1,
};

export const videoResponseFixture = {
  uploadAllowed: true,
  maxAttempts: 1,
};

export const imageResponseFixture = {
  maxFiles: 1,
};
