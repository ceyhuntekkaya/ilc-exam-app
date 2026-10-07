"use client";

import { BlockHtmlField } from "@/src/features/authoring/blocks/BlockHtmlField";
import { InlineHtmlField } from "@/src/features/authoring/blocks/InlineHtmlField";
import { MediaPicker } from "@/src/features/authoring/blocks/MediaPicker";
import { OptionListEditor, type OptionFormat, type OptionItem } from "@/src/features/authoring/blocks/OptionListEditor";
import { newId, nextSequentialId } from "@/src/features/authoring/blocks/ids";
import { extractBlankIds } from "@/src/features/exam-player/html";
import {
  Button,
  Checkbox,
  Field,
  Input,
  Select,
  Textarea,
  IconX,
} from "@/src/ui";
import { useState, type ChangeEvent } from "react";
import { SettingToggle as SharedSettingToggle } from "@/src/features/authoring/shared/FormGroup";

type AnyRec = Record<string, unknown>;

function asObj(v: unknown): AnyRec {
  return v && typeof v === "object" ? (v as AnyRec) : {};
}

function htmlOf(v: unknown): string {
  if (v && typeof v === "object" && "html" in (v as AnyRec)) return String((v as AnyRec).html ?? "");
  return "";
}

function linesFromText(raw: string): string[] {
  return raw.split("\n").map((s) => s.trim()).filter(Boolean);
}

/** Satır başına bir değer. Taslak metin odaktayken tutulur; aksi halde sondaki boş satır hemen silinir ve Enter işlemez. */
function LinesField({
  label,
  hint,
  lines,
  disabled,
  rows = 4,
  onChange,
}: {
  label: string;
  hint?: string;
  lines: string[];
  disabled?: boolean;
  rows?: number;
  onChange: (lines: string[]) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <Field label={label} hint={hint}>
      <Textarea
        rows={rows}
        disabled={disabled}
        value={draft ?? lines.join("\n")}
        onChange={(e) => {
          const raw = e.target.value;
          setDraft(raw);
          onChange(linesFromText(raw));
        }}
        onBlur={() => setDraft(null)}
      />
    </Field>
  );
}

function duplicateBlankIds(html: string): string[] {
  const ids = extractBlankIds(html);
  const seen = new Set<string>();
  const dups = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) dups.add(id);
    else seen.add(id);
  }
  return [...dups];
}

function syncBlanksFromText(
  textHtml: string,
  prevBlanks: AnyRec[],
  blankFactory: (blankId: string, prev?: AnyRec) => AnyRec,
): AnyRec[] {
  const orderedUnique: string[] = [];
  const seen = new Set<string>();
  for (const id of extractBlankIds(textHtml)) {
    if (seen.has(id)) continue;
    seen.add(id);
    orderedUnique.push(id);
  }
  const prevById = new Map(prevBlanks.map((b) => [String(b.blankId), b]));
  return orderedUnique.map((id) => blankFactory(id, prevById.get(id)));
}

/* ───────── Interaction form ───────── */

/** Ayar anahtarlarının öğrenciye etkisi — yazar ne seçtiğini bilsin. */
const SETTING_HELP: Record<string, string> = {
  "Seçenekleri karıştır":
    "Her öğrenci seçenekleri farklı sırada görür; kopya riskini azaltır. Cevap anahtarı etkilenmez. “Hepsi”, “Hiçbiri” ya da “A ve B” gibi sıraya bağlı seçenekler varsa kapalı tutun.",
  "İfadeleri karıştır":
    "İfadeler her öğrencide farklı sırada gösterilir. İfadeler bir hikâye ya da metin akışını izliyorsa kapalı tutun.",
  "“Verilmemiş” seçeneğini göster":
    "Doğru / Yanlış'a ek olarak üçüncü şık çıkar (metinde bilgi yok). IELTS tipi okuma soruları için açın.",
  "Sürüklenebilirleri karıştır":
    "Sürüklenecek öğeler her öğrencide farklı sırada gelir; doğru eşleşme sıradan tahmin edilemez.",
  "Sağdaki seçenekler birden çok kez eşleşebilir":
    "Açıksa aynı sağ seçenek birden fazla sol öğeye eşlenebilir; kapalıysa her biri en fazla bir kez kullanılır.",
  "Bölgeleri göster":
    "Açıksa tıklanabilir alanlar öğrenciye çerçeveyle gösterilir; kapalıysa öğrenci görselin neresine tıklayacağını kendisi bulur.",
  "Yazım denetimi açık":
    "Tarayıcının yazım denetimi (kırmızı alt çizgi) çalışır. Yazım becerisi ölçülüyorsa kapalı tutun.",
  "Metin yapıştırmaya izin ver":
    "Kapalıysa öğrenci cevap alanına dışarıdan kopyaladığı metni yapıştıramaz.",
  "Dosya yüklemeye izin ver":
    "Öğrenci kayıt yerine hazır bir video dosyası da yükleyebilir.",
};

function SettingToggle(props: { label: string; checked: boolean; disabled?: boolean; onChange: (event: ChangeEvent<HTMLInputElement>) => void }) {
  return <SharedSettingToggle {...props} description={SETTING_HELP[props.label]} />;
}

export function InteractionForm({
  type,
  value,
  onChange,
  answerKey,
  onAnswerKeyChange,
  disabled,
}: {
  type: string;
  value: unknown;
  onChange: (next: unknown) => void;
  answerKey?: unknown;
  onAnswerKeyChange?: (next: unknown) => void;
  disabled?: boolean;
}) {
  const v = asObj(value);
  const key = asObj(answerKey);
  const set = (patch: AnyRec) => onChange({ ...v, type, ...patch });
  const setKey = (patch: AnyRec) => onAnswerKeyChange?.({ ...key, ...patch });

  switch (type) {
    case "MULTIPLE_CHOICE":
      return (
        <div className="space-y-3">
          <OptionListEditor
            format={(v.format as OptionFormat) || "TEXT"}
            onFormatChange={(format) => set({ format })}
            options={(v.options as OptionItem[]) || []}
            onChange={(options) => set({ options })}
            disabled={disabled}
            correctMode="single"
            correctIds={key.correctOptionId ? [String(key.correctOptionId)] : []}
            onCorrectIdsChange={(ids) =>
              setKey({ type: "MULTIPLE_CHOICE", correctOptionId: ids[0] ?? "" })
            }
          />
          <SettingToggle label="Seçenekleri karıştır" checked={!!v.shuffle} disabled={disabled} onChange={(e) => set({ shuffle: e.target.checked })} />
        </div>
      );
    case "MULTIPLE_RESPONSE":
      return (
        <div className="space-y-3">
          <OptionListEditor
            format={(v.format as OptionFormat) || "TEXT"}
            onFormatChange={(format) => set({ format })}
            options={(v.options as OptionItem[]) || []}
            onChange={(options) => set({ options })}
            disabled={disabled}
            correctMode="multi"
            correctIds={(key.correctOptionIds as string[]) || []}
            onCorrectIdsChange={(ids) => {
              const raw = key.elementPoints;
              const hasPoints =
                raw != null &&
                typeof raw === "object" &&
                !Array.isArray(raw) &&
                Object.keys(raw as Record<string, unknown>).length > 0;
              setKey({
                type: "MULTIPLE_RESPONSE",
                correctOptionIds: ids,
                elementPoints: hasPoints ? raw : null,
              });
            }}
          />
          <div className="grid items-end gap-3 sm:grid-cols-2">
            <Field label="En az seçim" hint="Boş = sınırsız">
              <Input type="number" disabled={disabled} value={String(v.minSelections ?? "")} onChange={(e) => set({ minSelections: e.target.value === "" ? null : Number(e.target.value) })} />
            </Field>
            <Field label="En fazla seçim" hint="Boş = sınırsız">
              <Input type="number" disabled={disabled} value={String(v.maxSelections ?? "")} onChange={(e) => set({ maxSelections: e.target.value === "" ? null : Number(e.target.value) })} />
            </Field>
          </div>
          <SettingToggle label="Seçenekleri karıştır" checked={!!v.shuffle} disabled={disabled} onChange={(e) => set({ shuffle: e.target.checked })} />
        </div>
      );
    case "TRUE_FALSE": {
      const labels = asObj(v.labels);
      const statements = (v.statements as AnyRec[]) || [];
      const answers = asObj(key.answers);
      return (
        <div className="space-y-3">
          <div className="grid items-end gap-3 sm:grid-cols-3">
            <InlineHtmlField label="“Doğru” etiketi" placeholder="Doğru" value={labels.trueLabel as { html: string }} onChange={(trueLabel) => set({ labels: { ...labels, trueLabel } })} disabled={disabled} />
            <InlineHtmlField label="“Yanlış” etiketi" placeholder="Yanlış" value={labels.falseLabel as { html: string }} onChange={(falseLabel) => set({ labels: { ...labels, falseLabel } })} disabled={disabled} />
            <InlineHtmlField label="“Verilmemiş” etiketi" placeholder="Verilmemiş" value={labels.notGivenLabel as { html: string }} onChange={(notGivenLabel) => set({ labels: { ...labels, notGivenLabel } })} disabled={disabled} />
          </div>
          <SettingToggle label="“Verilmemiş” seçeneğini göster" checked={!!v.notGivenEnabled} disabled={disabled} onChange={(e) => set({ notGivenEnabled: e.target.checked })} />
          <SettingToggle label="İfadeleri karıştır" checked={!!v.shuffle} disabled={disabled} onChange={(e) => set({ shuffle: e.target.checked })} />
          <div className="space-y-2">
            <div className="flex justify-between">
              <p className="text-[13px] font-semibold text-fg">İfadeler</p>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={disabled}
                onClick={() => {
                  const id = nextSequentialId(
                    "s",
                    statements.map((x) => String(x.id ?? "")),
                  );
                  set({
                    statements: [...statements, { id, text: { html: "" } }],
                  });
                  setKey({
                    type: "TRUE_FALSE",
                    answers: { ...answers, [id]: "TRUE" },
                  });
                }}
              >
                İfade ekle
              </Button>
            </div>
            {statements.map((s, i) => (
              <div key={`stmt-${i}-${String(s.id)}`} className="space-y-2 rounded border border-border p-2">
                <div className="flex gap-2">
                  <div className="min-w-0 flex-1">
                    <InlineHtmlField
                      value={s.text as { html: string }}
                      onChange={(text) => {
                        const next = [...statements];
                        next[i] = { ...s, text };
                        set({ statements: next });
                      }}
                      disabled={disabled}
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={disabled}
                    onClick={() => {
                      const id = String(s.id);
                      set({ statements: statements.filter((_, x) => x !== i) });
                      const nextAnswers = { ...answers };
                      delete nextAnswers[id];
                      setKey({ type: "TRUE_FALSE", answers: nextAnswers });
                    }}
                  >
                    Sil
                  </Button>
                </div>
                <Field label="Doğru cevap">
                  <Select
                    value={String(answers[String(s.id)] ?? "TRUE")}
                    disabled={disabled}
                    onChange={(e) =>
                      setKey({
                        type: "TRUE_FALSE",
                        answers: { ...answers, [String(s.id)]: e.target.value },
                      })
                    }
                  >
                    <option value="TRUE">Doğru</option>
                    <option value="FALSE">Yanlış</option>
                    {v.notGivenEnabled ? <option value="NOT_GIVEN">Verilmemiş</option> : null}
                  </Select>
                </Field>
              </div>
            ))}
          </div>
        </div>
      );
    }
    case "FILL_IN_THE_BLANKS": {
      const blanks = (v.blanks as AnyRec[]) || [];
      const wordBank = (v.wordBank as AnyRec[]) || [];
      const textHtml = htmlOf(v.text);
      const dups = duplicateBlankIds(textHtml);
      const correctChoiceIds = asObj(key.correctChoiceIds);
      const supply = String(v.supply || "PER_BLANK");

      function onTextChange(text: { html: string }) {
        const nextBlanks = syncBlanksFromText(htmlOf(text), blanks, (blankId, prev) =>
          prev ?? { blankId, choices: [] },
        );
        set({ text, blanks: nextBlanks });
        const nextCorrect = { ...correctChoiceIds };
        const keep = new Set(nextBlanks.map((b) => String(b.blankId)));
        for (const id of Object.keys(nextCorrect)) {
          if (!keep.has(id)) delete nextCorrect[id];
        }
        setKey({ type: "FILL_IN_THE_BLANKS", correctChoiceIds: nextCorrect });
      }

      return (
        <div className="space-y-3">
          <BlockHtmlField
            label="Metin"
            hint="Boşluk için [[b1]] gibi etiket kullanın. Metindeki etiket sayısı kadar boşluk otomatik oluşur."
            value={v.text as { html: string }}
            onChange={onTextChange}
            disabled={disabled}
            rows={5}
          />
          {dups.length > 0 ? (
            <p className="text-sm text-danger" role="alert">
              Aynı boşluk adı birden fazla kullanılamaz: {dups.join(", ")}
            </p>
          ) : null}
          <Field label="Seçenek kaynağı">
            <Select value={supply} disabled={disabled} onChange={(e) => set({ supply: e.target.value })}>
              <option value="PER_BLANK">Boşluk başına</option>
              <option value="WORD_BANK">Kelime bankası</option>
            </Select>
          </Field>
          <SettingToggle label="Seçenekleri karıştır" checked={!!v.shuffleChoices} disabled={disabled} onChange={(e) => set({ shuffleChoices: e.target.checked })} />
          {supply === "WORD_BANK" ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[13px] font-semibold text-fg">Kelime bankası</p>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={disabled}
                  onClick={() => set({ wordBank: [...wordBank, { id: newId("w"), text: { html: "" } }] })}
                >
                  Kelime ekle
                </Button>
              </div>
              {wordBank.map((w, i) => (
                <div key={String(w.id)} className="flex gap-2 rounded border border-border p-2">
                  <div className="min-w-0 flex-1">
                    <InlineHtmlField
                      value={w.text as { html: string }}
                      onChange={(text) => {
                        const next = [...wordBank];
                        next[i] = { ...w, text };
                        set({ wordBank: next });
                      }}
                      disabled={disabled}
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={disabled}
                    onClick={() => {
                      const removed = String(w.id);
                      set({ wordBank: wordBank.filter((_, x) => x !== i) });
                      const nextCorrect = { ...correctChoiceIds };
                      for (const [blankId, choiceId] of Object.entries(nextCorrect)) {
                        if (String(choiceId) === removed) delete nextCorrect[blankId];
                      }
                      setKey({ type: "FILL_IN_THE_BLANKS", correctChoiceIds: nextCorrect });
                    }}
                  >
                    Sil
                  </Button>
                </div>
              ))}
              {blanks.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-[13px] font-semibold text-fg">Boşluk cevapları</p>
                  {blanks.map((b) => (
                    <Field key={String(b.blankId)} label={`[[${b.blankId}]] doğru kelime`}>
                      <Select
                        value={String(correctChoiceIds[String(b.blankId)] ?? "")}
                        disabled={disabled}
                        onChange={(e) =>
                          setKey({
                            type: "FILL_IN_THE_BLANKS",
                            correctChoiceIds: {
                              ...correctChoiceIds,
                              [String(b.blankId)]: e.target.value,
                            },
                          })
                        }
                      >
                        <option value="">Seçin</option>
                        {wordBank.map((w) => (
                          <option key={String(w.id)} value={String(w.id)}>
                            {htmlOf(w.text) || String(w.id)}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-fg-muted">Metne [[b1]] ekleyince boşluklar burada listelenir.</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {blanks.length === 0 ? (
                <p className="text-xs text-fg-muted">Metne [[b1]] ekleyince boşluk panelleri otomatik oluşur.</p>
              ) : null}
              {blanks.map((b, i) => {
                const choices = (b.choices as AnyRec[]) || [];
                return (
                  <div key={String(b.blankId)} className="space-y-2 rounded border border-border p-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[13px] font-semibold text-fg">Boşluk [[{String(b.blankId)}]]</p>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={disabled}
                        onClick={() => {
                          const next = [...blanks];
                          next[i] = { ...b, choices: [...choices, { id: newId("c"), text: { html: "" } }] };
                          set({ blanks: next });
                        }}
                      >
                        Seçenek ekle
                      </Button>
                    </div>
                    {choices.map((c, j) => (
                      <div key={String(c.id)} className="flex flex-wrap items-start gap-2 rounded bg-bg/50 p-2">
                        <div className="min-w-0 flex-1">
                          <InlineHtmlField
                            value={c.text as { html: string }}
                            onChange={(text) => {
                              const nextChoices = [...choices];
                              nextChoices[j] = { ...c, text };
                              const next = [...blanks];
                              next[i] = { ...b, choices: nextChoices };
                              set({ blanks: next });
                            }}
                            disabled={disabled}
                          />
                        </div>
                        <Checkbox
                          label="Doğru"
                          checked={String(correctChoiceIds[String(b.blankId)] ?? "") === String(c.id)}
                          disabled={disabled}
                          onChange={(e) => {
                            const next = { ...correctChoiceIds };
                            if (e.target.checked) next[String(b.blankId)] = String(c.id);
                            else if (String(next[String(b.blankId)]) === String(c.id)) delete next[String(b.blankId)];
                            setKey({ type: "FILL_IN_THE_BLANKS", correctChoiceIds: next });
                          }}
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={disabled}
                          onClick={() => {
                            const removed = String(c.id);
                            const nextChoices = choices.filter((_, x) => x !== j);
                            const next = [...blanks];
                            next[i] = { ...b, choices: nextChoices };
                            set({ blanks: next });
                            if (String(correctChoiceIds[String(b.blankId)]) === removed) {
                              const nextCorrect = { ...correctChoiceIds };
                              delete nextCorrect[String(b.blankId)];
                              setKey({ type: "FILL_IN_THE_BLANKS", correctChoiceIds: nextCorrect });
                            }
                          }}
                        >
                          Sil
                        </Button>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }
    case "SHORT_ANSWER": {
      const blanks = (v.blanks as AnyRec[]) || [];
      const accepted = asObj(key.acceptedAnswers);
      const policy = asObj(key.matchPolicy);
      const dups = duplicateBlankIds(htmlOf(v.text));

      function onTextChange(text: { html: string }) {
        const nextBlanks = syncBlanksFromText(htmlOf(text), blanks, (blankId, prev) =>
          prev ?? { blankId, minWords: 1, maxWords: 5, maxChars: null },
        );
        set({ text, blanks: nextBlanks });
        const nextAccepted = { ...accepted };
        const keep = new Set(nextBlanks.map((b) => String(b.blankId)));
        for (const id of Object.keys(nextAccepted)) {
          if (!keep.has(id)) delete nextAccepted[id];
        }
        setKey({ type: "SHORT_ANSWER", acceptedAnswers: nextAccepted, matchPolicy: policy });
      }

      return (
        <div className="space-y-3">
          <BlockHtmlField
            label="Metin"
            hint="Boşluk için [[b1]] kullanın. Etiketler otomatik boşluk oluşturur."
            value={v.text as { html: string }}
            onChange={onTextChange}
            disabled={disabled}
          />
          {dups.length > 0 ? (
            <p className="text-sm text-danger" role="alert">
              Aynı boşluk adı birden fazla kullanılamaz: {dups.join(", ")}
            </p>
          ) : null}
          <Field label="Sınır aşılırsa">
            <Select value={String(v.limitMode || "HARD")} disabled={disabled} onChange={(e) => set({ limitMode: e.target.value })}>
              <option value="HARD">Engelle</option>
              <option value="SOFT">Uyar, izin ver</option>
            </Select>
          </Field>
          {blanks.length === 0 ? (
            <p className="text-xs text-fg-muted">Metne [[b1]] ekleyince cevap alanları burada açılır.</p>
          ) : null}
          {blanks.map((b, i) => (
            <div key={String(b.blankId)} className="space-y-2 rounded border border-border p-2">
              <p className="text-[13px] font-semibold text-fg">Boşluk [[{String(b.blankId)}]]</p>
              <div className="grid items-end gap-3 sm:grid-cols-3">
                <Field label="En az kelime">
                  <Input
                    type="number"
                    value={String(b.minWords ?? "")}
                    disabled={disabled}
                    onChange={(e) => {
                      const next = [...blanks];
                      next[i] = { ...b, minWords: e.target.value === "" ? null : Number(e.target.value) };
                      set({ blanks: next });
                    }}
                  />
                </Field>
                <Field label="En fazla kelime">
                  <Input
                    type="number"
                    value={String(b.maxWords ?? "")}
                    disabled={disabled}
                    onChange={(e) => {
                      const next = [...blanks];
                      next[i] = { ...b, maxWords: e.target.value === "" ? null : Number(e.target.value) };
                      set({ blanks: next });
                    }}
                  />
                </Field>
                <Field label="En fazla karakter">
                  <Input
                    type="number"
                    value={String(b.maxChars ?? "")}
                    disabled={disabled}
                    onChange={(e) => {
                      const next = [...blanks];
                      next[i] = { ...b, maxChars: e.target.value === "" ? null : Number(e.target.value) };
                      set({ blanks: next });
                    }}
                  />
                </Field>
              </div>
              <LinesField
                label="Kabul edilen cevaplar (satır başına)"
                hint="Her satır eşit derecede doğru cevaptır. Öğrenci bunlardan herhangi birini yazarsa puan alır."
                lines={
                  Array.isArray(accepted[String(b.blankId)])
                    ? (accepted[String(b.blankId)] as string[])
                    : []
                }
                disabled={disabled}
                onChange={(lines) =>
                  setKey({
                    type: "SHORT_ANSWER",
                    acceptedAnswers: {
                      ...accepted,
                      [String(b.blankId)]: lines,
                    },
                    matchPolicy: policy,
                  })
                }
              />
            </div>
          ))}
          <Checkbox
            label="Büyük/küçük harf duyarlı"
            checked={!!policy.caseSensitive}
            disabled={disabled}
            onChange={(e) =>
              setKey({
                type: "SHORT_ANSWER",
                acceptedAnswers: accepted,
                matchPolicy: { ...policy, caseSensitive: e.target.checked },
              })
            }
          />
          <Checkbox
            label="Baştaki/sondaki noktalamayı yoksay"
            checked={policy.ignoreEdgePunctuation !== false}
            disabled={disabled}
            onChange={(e) =>
              setKey({
                type: "SHORT_ANSWER",
                acceptedAnswers: accepted,
                matchPolicy: { ...policy, ignoreEdgePunctuation: e.target.checked },
              })
            }
          />
        </div>
      );
    }
    case "MATCHING": {
      const left = (v.left as OptionItem[]) || [];
      const right = (v.right as OptionItem[]) || [];
      const pairs = asObj(key.pairs);
      return (
        <div className="space-y-3">
          <OptionListEditor
            title="Sol"
            idPrefix="l"
            format={(v.leftFormat as OptionFormat) || "TEXT"}
            onFormatChange={(leftFormat) => set({ leftFormat })}
            options={left}
            onChange={(nextLeft) => {
              set({ left: nextLeft });
              const keep = new Set(nextLeft.map((l) => l.id));
              const nextPairs = { ...pairs };
              for (const id of Object.keys(nextPairs)) {
                if (!keep.has(id)) delete nextPairs[id];
              }
              setKey({ type: "MATCHING", pairs: nextPairs });
            }}
            disabled={disabled}
            renderRowExtra={(item) => (
              <Field label="Eşleşen sağ seçenek">
                <Select
                  value={String(pairs[item.id] ?? "")}
                  disabled={disabled}
                  onChange={(e) =>
                    setKey({ type: "MATCHING", pairs: { ...pairs, [item.id]: e.target.value } })
                  }
                >
                  <option value="">Seçin</option>
                  {right.map((r) => (
                    <option key={r.id} value={r.id}>
                      {htmlOf(r.text).slice(0, 60) || r.id}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
          />
          <OptionListEditor
            title="Sağ"
            idPrefix="r"
            hideIds={false}
            format={(v.rightFormat as OptionFormat) || "TEXT"}
            onFormatChange={(rightFormat) => set({ rightFormat })}
            options={right}
            onChange={(nextRight) => {
              set({ right: nextRight });
              const keep = new Set(nextRight.map((r) => r.id));
              const nextPairs = { ...pairs };
              for (const [leftId, rightId] of Object.entries(nextPairs)) {
                if (!keep.has(String(rightId))) delete nextPairs[leftId];
              }
              setKey({ type: "MATCHING", pairs: nextPairs });
            }}
            disabled={disabled}
          />
          <SettingToggle label="Sürüklenebilirleri karıştır" checked={!!v.shuffle} disabled={disabled} onChange={(e) => set({ shuffle: e.target.checked })} />
          <SettingToggle label="Sağdaki seçenekler birden çok kez eşleşebilir" checked={!!v.rightReusable} disabled={disabled} onChange={(e) => set({ rightReusable: e.target.checked })} />
        </div>
      );
    }
    case "ORDERING":
      return (
        <div className="space-y-3">
          <OptionListEditor
            format={(v.format as OptionFormat) || "TEXT"}
            onFormatChange={(format) => set({ format })}
            options={(v.items as OptionItem[]) || []}
            onChange={(items) => {
              set({ items });
              setKey({ type: "ORDERING", correctOrder: items.map((it) => it.id) });
            }}
            disabled={disabled}
            idPrefix="i"
            title="Öğeler (doğru sırada girin)"
          />
          <Field label="Yönelim">
            <Select value={String(v.orientation || "VERTICAL")} disabled={disabled} onChange={(e) => set({ orientation: e.target.value })}>
              <option value="VERTICAL">Dikey</option>
              <option value="HORIZONTAL">Yatay</option>
            </Select>
          </Field>
        </div>
      );
    case "GROUPING": {
      const groups = (v.groups as AnyRec[]) || [];
      const items = (v.items as OptionItem[]) || [];
      const groupOf = asObj(key.groupOf);
      return (
        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex justify-between">
              <p className="text-[13px] font-semibold text-fg">Gruplar</p>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={disabled}
                onClick={() =>
                  set({
                    groups: [
                      ...groups,
                      {
                        id: nextSequentialId(
                          "g",
                          groups.map((g) => String(g.id ?? "")),
                        ),
                        label: { html: "" },
                      },
                    ],
                  })
                }
              >
                Grup ekle
              </Button>
            </div>
            {groups.map((g, i) => (
              <div key={String(g.id)} className="flex gap-2">
                <div className="min-w-0 flex-1">
                  <InlineHtmlField
                    value={g.label as { html: string }}
                    onChange={(label) => {
                      const next = [...groups];
                      next[i] = { ...g, label };
                      set({ groups: next });
                    }}
                    disabled={disabled}
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={disabled}
                  onClick={() => {
                    const removed = String(g.id);
                    set({ groups: groups.filter((_, x) => x !== i) });
                    const nextGroupOf = { ...groupOf };
                    for (const [itemId, gid] of Object.entries(nextGroupOf)) {
                      if (String(gid) === removed) delete nextGroupOf[itemId];
                    }
                    setKey({ type: "GROUPING", groupOf: nextGroupOf, distractors: key.distractors ?? [] });
                  }}
                >
                  Sil
                </Button>
              </div>
            ))}
          </div>
          <OptionListEditor
            format={(v.itemFormat as OptionFormat) || "TEXT"}
            onFormatChange={(itemFormat) => set({ itemFormat })}
            options={items}
            onChange={(nextItems) => {
              set({ items: nextItems });
              const keep = new Set(nextItems.map((it) => it.id));
              const nextGroupOf = { ...groupOf };
              for (const id of Object.keys(nextGroupOf)) {
                if (!keep.has(id)) delete nextGroupOf[id];
              }
              setKey({ type: "GROUPING", groupOf: nextGroupOf, distractors: key.distractors ?? [] });
            }}
            disabled={disabled}
            title="Öğeler"
            renderRowExtra={(item) => (
              <Field label="Grup">
                <Select
                  value={String(groupOf[item.id] ?? "")}
                  disabled={disabled}
                  onChange={(e) =>
                    setKey({
                      type: "GROUPING",
                      groupOf: { ...groupOf, [item.id]: e.target.value },
                      distractors: key.distractors ?? [],
                    })
                  }
                >
                  <option value="">—</option>
                  {groups.map((g) => (
                    <option key={String(g.id)} value={String(g.id)}>
                      {htmlOf(g.label) || String(g.id)}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
          />
          <SettingToggle label="Sürüklenebilirleri karıştır" checked={!!v.shuffle} disabled={disabled} onChange={(e) => set({ shuffle: e.target.checked })} />
        </div>
      );
    }
    case "HOTSPOT_SELECT":
    case "HOTSPOT_PLACE": {
      const regions = ((type === "HOTSPOT_SELECT" ? v.regions : v.zones) as AnyRec[]) || [];
      const regionKey = type === "HOTSPOT_SELECT" ? "regions" : "zones";
      return (
        <div className="space-y-3">
          <MediaPicker kind="IMAGE" value={v.mediaId as string | null} onChange={(mediaId) => set({ mediaId })} disabled={disabled} label="Görsel" />
          {type === "HOTSPOT_SELECT" ? (
            <div className="grid items-end gap-3 sm:grid-cols-3">
              <Field label="En az seçim"><Input type="number" value={String(v.minSelections ?? "")} disabled={disabled} onChange={(e) => set({ minSelections: e.target.value === "" ? null : Number(e.target.value) })} /></Field>
              <Field label="En fazla seçim"><Input type="number" value={String(v.maxSelections ?? "")} disabled={disabled} onChange={(e) => set({ maxSelections: e.target.value === "" ? null : Number(e.target.value) })} /></Field>
              <SettingToggle label="Bölgeleri göster" checked={!!v.showRegions} disabled={disabled} onChange={(e) => set({ showRegions: e.target.checked })} />
            </div>
          ) : (
            <>
              <OptionListEditor format={(v.draggableFormat as OptionFormat) || "TEXT"} onFormatChange={(draggableFormat) => set({ draggableFormat })} options={(v.draggables as OptionItem[]) || []} onChange={(draggables) => set({ draggables })} disabled={disabled} title="Sürüklenebilirler" idPrefix="d" />
              <Field label="Bölge kapasitesi"><Input type="number" value={String(v.zoneCapacity ?? "")} disabled={disabled} onChange={(e) => set({ zoneCapacity: e.target.value === "" ? null : Number(e.target.value) })} /></Field>
              <SettingToggle label="Sürüklenebilirleri karıştır" checked={!!v.shuffle} disabled={disabled} onChange={(e) => set({ shuffle: e.target.checked })} />
            </>
          )}
          <div className="space-y-2">
            <div className="flex justify-between">
              <div>
                <p className="text-[13px] font-semibold text-fg">{type === "HOTSPOT_SELECT" ? "Tıklanabilir bölgeler" : "Bırakma bölgeleri"} ({regions.length})</p>
                <p className="text-xs text-fg-subtle">Konum ve boyut görsele oranla 0–1 arası (0,5 = ortası).</p>
              </div>
              <Button type="button" size="sm" variant="secondary" disabled={disabled} onClick={() => set({
                [regionKey]: [...regions, { id: newId(type === "HOTSPOT_SELECT" ? "r" : "z"), shape: { kind: "RECT", x: 0.1, y: 0.1, w: 0.3, h: 0.3 }, label: "Bölge" }],
              })}>+ Dikdörtgen bölge</Button>
            </div>
            {regions.map((r, i) => {
              const shape = asObj(r.shape);
              return (
                <div key={String(r.id)} className="grid items-end gap-2 rounded-lg border border-border p-2.5 sm:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))_auto]">
                  <Field label={`Bölge ${i + 1} adı`}>
                    <Input value={String(r.label ?? "")} disabled={disabled} onChange={(e) => {
                      const next = [...regions]; next[i] = { ...r, label: e.target.value }; set({ [regionKey]: next });
                    }} />
                  </Field>
                  {([["x", "Sol (x)"], ["y", "Üst (y)"], ["w", "Genişlik"], ["h", "Yükseklik"]] as const).map(([k, label]) => (
                    <Field key={k} label={label}>
                      <Input type="number" step="0.01" min={0} max={1} value={String(shape[k] ?? "")} disabled={disabled} onChange={(e) => {
                        const next = [...regions];
                        next[i] = { ...r, shape: { ...shape, kind: "RECT", [k]: Number(e.target.value) } };
                        set({ [regionKey]: next });
                      }} />
                    </Field>
                  ))}
                  <Button type="button" size="sm" variant="ghost" disabled={disabled} aria-label={`Bölge ${i + 1} sil`} title="Sil" onClick={() => set({ [regionKey]: regions.filter((_, x) => x !== i) })}>
                    <IconX className="size-3.5" aria-hidden />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    case "OPEN_ENDED":
      return (
        <div className="grid items-end gap-3 sm:grid-cols-2">
          <Field label="En az kelime"><Input type="number" value={String(v.minWords ?? "")} disabled={disabled} onChange={(e) => set({ minWords: e.target.value === "" ? null : Number(e.target.value) })} /></Field>
          <Field label="En fazla kelime"><Input type="number" value={String(v.maxWords ?? "")} disabled={disabled} onChange={(e) => set({ maxWords: e.target.value === "" ? null : Number(e.target.value) })} /></Field>
          <Field label="Sınır aşılırsa"><Select value={String(v.limitMode || "SOFT")} disabled={disabled} onChange={(e) => set({ limitMode: e.target.value })}><option value="SOFT">Uyar, izin ver</option><option value="HARD">Engelle</option></Select></Field>
          <SettingToggle label="Yazım denetimi açık" checked={!!v.spellcheckAllowed} disabled={disabled} onChange={(e) => set({ spellcheckAllowed: e.target.checked })} />
          <SettingToggle label="Metin yapıştırmaya izin ver" checked={!!v.pasteAllowed} disabled={disabled} onChange={(e) => set({ pasteAllowed: e.target.checked })} />
        </div>
      );
    case "AUDIO_RESPONSE":
      return (
        <div className="grid items-end gap-3 sm:grid-cols-2">
          <Field label="En kısa süre"><Input suffix="sn" type="number" value={String(v.minDurationSec ?? "")} disabled={disabled} onChange={(e) => set({ minDurationSec: e.target.value === "" ? null : Number(e.target.value) })} /></Field>
          <Field label="En uzun süre"><Input suffix="sn" type="number" value={String(v.maxDurationSec ?? "")} disabled={disabled} onChange={(e) => set({ maxDurationSec: Number(e.target.value || 0) })} /></Field>
          <Field label="Hazırlık süresi"><Input suffix="sn" type="number" value={String(v.prepTimeSec ?? "")} disabled={disabled} onChange={(e) => set({ prepTimeSec: e.target.value === "" ? null : Number(e.target.value) })} /></Field>
          <Field label="Deneme hakkı"><Input type="number" value={String(v.maxAttempts ?? "")} disabled={disabled} onChange={(e) => set({ maxAttempts: Number(e.target.value || 1) })} /></Field>
        </div>
      );
    case "VIDEO_RESPONSE":
      return (
        <div className="grid items-end gap-3 sm:grid-cols-2">
          <Field label="En kısa süre"><Input suffix="sn" type="number" value={String(v.minDurationSec ?? "")} disabled={disabled} onChange={(e) => set({ minDurationSec: e.target.value === "" ? null : Number(e.target.value) })} /></Field>
          <Field label="En uzun süre"><Input suffix="sn" type="number" value={String(v.maxDurationSec ?? "")} disabled={disabled} onChange={(e) => set({ maxDurationSec: Number(e.target.value || 0) })} /></Field>
          <Field label="Hazırlık süresi"><Input suffix="sn" type="number" value={String(v.prepTimeSec ?? "")} disabled={disabled} onChange={(e) => set({ prepTimeSec: e.target.value === "" ? null : Number(e.target.value) })} /></Field>
          <Field label="Deneme hakkı"><Input type="number" value={String(v.maxAttempts ?? "")} disabled={disabled} onChange={(e) => set({ maxAttempts: Number(e.target.value || 1) })} /></Field>
          <SettingToggle label="Dosya yüklemeye izin ver" checked={!!v.uploadAllowed} disabled={disabled} onChange={(e) => set({ uploadAllowed: e.target.checked })} />
          <Field label="En büyük dosya"><Input suffix="MB" type="number" value={String(v.maxFileSizeMb ?? "")} disabled={disabled} onChange={(e) => set({ maxFileSizeMb: e.target.value === "" ? null : Number(e.target.value) })} /></Field>
        </div>
      );
    case "IMAGE_RESPONSE":
      return (
        <div className="grid items-end gap-3 sm:grid-cols-2">
          <Field label="En fazla dosya"><Input type="number" value={String(v.maxFiles ?? "")} disabled={disabled} onChange={(e) => set({ maxFiles: Number(e.target.value || 1) })} /></Field>
          <Field label="En büyük dosya"><Input suffix="MB" type="number" value={String(v.maxFileSizeMb ?? "")} disabled={disabled} onChange={(e) => set({ maxFileSizeMb: Number(e.target.value || 1) })} /></Field>
          <Field label="En az genişlik"><Input suffix="px" type="number" value={String(v.minWidthPx ?? "")} disabled={disabled} onChange={(e) => set({ minWidthPx: e.target.value === "" ? null : Number(e.target.value) })} /></Field>
          <Field label="En az yükseklik"><Input suffix="px" type="number" value={String(v.minHeightPx ?? "")} disabled={disabled} onChange={(e) => set({ minHeightPx: e.target.value === "" ? null : Number(e.target.value) })} /></Field>
          <Field label="İzin verilen dosya türleri" hint="Virgülle ayırın, ör. image/png, image/jpeg">
            <Input
              placeholder="image/png, image/jpeg"
              value={Array.isArray(v.allowedMimeTypes) ? (v.allowedMimeTypes as string[]).join(",") : ""}
              disabled={disabled}
              onChange={(e) => set({ allowedMimeTypes: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
            />
          </Field>
        </div>
      );
    default:
      return <p className="text-sm text-fg-muted">Bilinmeyen şablon: {type}</p>;
  }
}

const INLINE_ANSWER_TYPES = new Set([
  "MULTIPLE_CHOICE",
  "MULTIPLE_RESPONSE",
  "TRUE_FALSE",
  "FILL_IN_THE_BLANKS",
  "SHORT_ANSWER",
  "MATCHING",
  "ORDERING",
  "GROUPING",
]);

/* ───────── Answer key form ───────── */

export function AnswerKeyForm({
  type,
  interaction,
  value,
  onChange,
  disabled,
}: {
  type: string;
  interaction: unknown;
  value: unknown;
  onChange: (next: unknown) => void;
  disabled?: boolean;
}) {
  const key = asObj(value);
  const inter = asObj(interaction);
  const set = (patch: AnyRec) => onChange({ ...key, ...patch });

  const manualTypes = new Set(["OPEN_ENDED", "AUDIO_RESPONSE", "VIDEO_RESPONSE", "IMAGE_RESPONSE"]);
  if (manualTypes.has(type)) {
    const rawSamples = (key.sampleAnswers as AnyRec[]) || [];
    return (
      <div className="space-y-2">
        <LinesField
          label="Örnek cevaplar (satır başına)"
          lines={rawSamples.map((s) => htmlOf(s) || String(s ?? "")).filter(Boolean)}
          disabled={disabled}
          onChange={(lines) =>
            set({
              type: "MANUAL",
              sampleAnswers: lines.map((html) => ({ html })),
              raterNotes: key.raterNotes ?? null,
            })
          }
        />
        <Field label="Değerlendirici notları">
          <Textarea
            rows={3}
            disabled={disabled}
            value={String(key.raterNotes ?? "")}
            onChange={(e) => set({ type: "MANUAL", sampleAnswers: rawSamples, raterNotes: e.target.value || null })}
          />
        </Field>
      </div>
    );
  }

  if (INLINE_ANSWER_TYPES.has(type)) {
    return (
      <p className="rounded-lg border border-dashed border-border bg-bg/40 px-3 py-2 text-sm text-fg-muted">
        Doğru cevaplar <strong className="font-medium text-fg">İçerik</strong> panelinde seçeneklerle birlikte belirlenir.
      </p>
    );
  }

  switch (type) {
    case "HOTSPOT_SELECT": {
      const regions = (inter.regions as AnyRec[]) || [];
      const selected = new Set((key.correctRegionIds as string[]) || []);
      return (
        <div className="space-y-2">
          {regions.map((r) => (
            <Checkbox
              key={String(r.id)}
              label={`${r.id} — ${r.label ?? ""}`}
              checked={selected.has(String(r.id))}
              disabled={disabled}
              onChange={(e) => {
                const next = new Set(selected);
                if (e.target.checked) next.add(String(r.id)); else next.delete(String(r.id));
                set({ type: "HOTSPOT_SELECT", correctRegionIds: [...next] });
              }}
            />
          ))}
        </div>
      );
    }
    case "HOTSPOT_PLACE": {
      const draggables = (inter.draggables as OptionItem[]) || [];
      const zones = (inter.zones as AnyRec[]) || [];
      const zoneOf = asObj(key.zoneOf);
      return (
        <div className="space-y-2">
          {draggables.map((d) => (
            <Field key={d.id} label={d.id}>
              <Select value={String(zoneOf[d.id] ?? "")} disabled={disabled} onChange={(e) => set({ type: "HOTSPOT_PLACE", zoneOf: { ...zoneOf, [d.id]: e.target.value }, distractors: key.distractors ?? [] })}>
                <option value="">—</option>
                {zones.map((z) => (
                  <option key={String(z.id)} value={String(z.id)}>{String(z.id)} — {String(z.label ?? "")}</option>
                ))}
              </Select>
            </Field>
          ))}
        </div>
      );
    }
    default:
      return <p className="text-sm text-fg-muted">Cevap anahtarı formu yok: {type}</p>;
  }
}
