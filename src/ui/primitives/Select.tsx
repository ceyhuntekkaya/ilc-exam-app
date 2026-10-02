"use client";

import { useField } from "@/src/ui/primitives/Field";
import { useUiVariant, type UiVariant } from "@/src/ui/primitives/UiVariant";
import { cn } from "@/src/lib/utils/cn";
import { IconCheck, IconSearch } from "@/src/ui/icons";
import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  invalid?: boolean;
  /** Normalde verilmez: Field'dan veya UiVariantProvider'dan gelir. */
  variant?: UiVariant;
  /** Yalnız admin: etiket kontrolün içinde solda gösterilir (Field'sız kullanım, ör. filtre şeridi). */
  inlineLabel?: string;
  /**
   * Uzun listeler (kategori, marka) için açılır listenin başında arama kutusu. Ad ve `<option title>` (açıklama) içinde
   * Türkçe duyarlı arar; ok tuşları/Enter/Esc aranmış listede çalışır. Yalnız admin ve storefront görünümünde.
   */
  searchable?: boolean;
  /** Arama kutusunun yer tutucusu. */
  searchPlaceholder?: string;
};

// default: panel görünümü (native select, değişmedi). storefront: Input storefront ile aynı kenar/odak/hata görünümü.
// admin: storefront ile aynı liste kutusu davranışı; Input admin ile aynı ölçü/odak, panel tokenlarıyla.
const variants = {
  default: {
    base: "h-11 w-full rounded-md border bg-surface px-3 text-base text-fg",
    valid: "border-border-strong",
    invalid: "border-danger",
  },
  admin: {
    base: "h-8 w-full cursor-pointer rounded-md border bg-bg px-2.5 text-[13px] text-fg outline-none transition-[border-color,box-shadow,background-color] focus:bg-surface focus:ring-3 disabled:cursor-not-allowed disabled:opacity-60",
    valid: "border-border hover:border-border-strong focus:border-primary-500 focus:ring-primary-500/15",
    invalid: "border-danger focus:border-danger focus:ring-danger-500/15",
  },
  storefront: {
    base: "h-10 w-full cursor-pointer rounded-lg border px-3 text-sm outline-none transition-shadow focus:ring-2 disabled:pointer-events-none disabled:opacity-50",
    valid:
      "border-neutral-300 bg-white text-neutral-900 hover:border-neutral-400 focus:border-primary-500 focus:ring-primary-500/15 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:border-neutral-600 dark:focus:ring-primary-400/20",
    invalid:
      "border-danger-600 bg-danger-50/40 text-danger-700 focus:border-danger-600 focus:ring-danger-500/20 dark:border-danger-500 dark:bg-danger-950/20 dark:text-danger-300",
  },
};

export function Select({ className, invalid, id, children, variant: variantProp, inlineLabel, searchable, searchPlaceholder, ...props }: Props) {
  const field = useField();
  const uiVariant = useUiVariant();
  const variant = variantProp ?? field?.variant ?? uiVariant;
  const s = variants[variant];
  const isInvalid = invalid ?? field?.invalid ?? false;
  if (variant !== "default") {
    return (
      <ListboxSelect
        {...props}
        theme={variant}
        inlineLabel={variant === "admin" ? inlineLabel : undefined}
        searchable={searchable}
        searchPlaceholder={searchPlaceholder}
        id={id ?? field?.id}
        describedBy={field?.describedBy}
        invalid={isInvalid}
        className={className}
      >
        {children}
      </ListboxSelect>
    );
  }
  return (
    <select
      {...props}
      id={id ?? field?.id}
      aria-invalid={isInvalid || undefined}
      aria-describedby={field?.describedBy}
      className={cn(s.base, isInvalid ? s.invalid : s.valid, className)}
    >
      {children}
    </select>
  );
}

type ListboxTheme = "storefront" | "admin";

const listbox: Record<ListboxTheme, { placeholder: string; chevron: string; list: string; option: string; empty: string; selected: string; active: string; check: string }> = {
  storefront: {
    placeholder: "text-neutral-400 dark:text-neutral-500",
    chevron: "text-neutral-400",
    list: "rounded-xl border border-neutral-200 bg-white p-1 shadow-lg ring-1 ring-black/5 dark:border-neutral-700 dark:bg-neutral-900 dark:ring-white/10",
    option: "rounded-lg px-3 py-2 text-neutral-700 dark:text-neutral-200",
    empty: "text-neutral-400 dark:text-neutral-500",
    selected: "font-medium text-primary-700 dark:text-primary-400",
    active: "bg-primary-50 dark:bg-primary-950/40",
    check: "text-primary-600 dark:text-primary-400",
  },
  admin: {
    placeholder: "text-fg-subtle",
    chevron: "text-fg-subtle",
    list: "rounded-lg border border-border bg-surface p-1 shadow-[0_8px_24px_rgb(26_26_24/0.12)]",
    option: "rounded-md px-2.5 py-1.5 text-fg",
    empty: "text-fg-subtle",
    selected: "font-semibold text-primary",
    active: "bg-bg",
    check: "text-primary",
  },
};

type Option = { value: string; label: ReactNode; text: string; disabled: boolean; depth: number; description?: string };

// Ağaç etiketi: "— — Ad" → girinti 2, ad "Ad". Listede girinti olarak çizilir; butonda ve aramada tire görünmez.
const TREE_PREFIX = /^((?:— )+)/;

/** `<option>` çocuklarını (dizi/fragment içindekiler dahil) düz listeye çevirir. `title` açıklama (ör. kategori yolu) olur. */
function readOptions(children: ReactNode): Option[] {
  const out: Option[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const element = child as ReactElement<{ value?: string | number; children?: ReactNode; disabled?: boolean; title?: string }>;
    if (element.type !== "option") {
      out.push(...readOptions(element.props.children));
      return;
    }
    let label = element.props.children;
    let text = Children.toArray(label).join("");
    let depth = 0;
    const prefix = typeof label === "string" ? TREE_PREFIX.exec(label) : null;
    if (prefix) {
      depth = prefix[1].length / 2;
      text = text.slice(prefix[1].length);
      label = text;
    }
    out.push({
      value: String(element.props.value ?? text),
      label,
      text,
      disabled: Boolean(element.props.disabled),
      depth,
      description: element.props.title || undefined,
    });
  });
  return out;
}

/**
 * Vitrin/admin select'i (../dis-sepetim FormSelect): native açılır menü CSS ile stillenemediği için buton + liste kutusu.
 * Formla uyum için gizli bir native <select> tutulur: `name`, FormData, `required` ve `onChange` aynen çalışır;
 * kullanan kod native select'teki gibi yazılır (`<Select name value/defaultValue onChange><option/></Select>`).
 * Klavye: ↑/↓, Home/End, Enter/Boşluk, Esc, harfle atlama. Aşağıda yer yoksa liste yukarı açılır.
 * `searchable`: liste açılınca odak arama kutusuna geçer; yazılanla süzülen listede ↑/↓/Enter/Esc çalışır.
 * Ağaç seçenekleri ("— — Ad") girintili çizilir; aramada girinti kalkar, açıklama (yol) satırın altında görünür.
 */
function ListboxSelect({
  id,
  describedBy,
  invalid,
  className,
  children,
  value,
  defaultValue,
  onChange,
  disabled,
  name,
  required,
  form,
  autoComplete,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  theme,
  inlineLabel,
  searchable = false,
  searchPlaceholder = "Listede ara",
}: Omit<Props, "invalid" | "variant"> & { describedBy?: string; invalid: boolean; theme: ListboxTheme }) {
  const t = listbox[theme];
  const v = variants[theme];
  const options = readOptions(children);
  const controlled = value !== undefined;
  const [inner, setInner] = useState(() => String(defaultValue ?? options.find((option) => !option.disabled)?.value ?? ""));
  const selectedValue = controlled ? String(value ?? "") : inner;
  const selected = options.find((option) => option.value === selectedValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [upward, setUpward] = useState(false);
  const [query, setQuery] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const native = useRef<HTMLSelectElement>(null);
  const typed = useRef({ text: "", at: 0 });
  const autoId = useId();
  const buttonId = id ?? `select-${autoId}`;
  const listId = `${buttonId}-list`;
  // Boş değerli ilk seçenek ("İl seçin" gibi) seçiliyken yer tutucu tonunda gösterilir.
  const placeholder = !selected || selected.value === "";

  // Aramada görünen seçeneklerin (options içindeki) sıra numaraları; arama yoksa hepsi.
  const term = searchable ? query.trim().toLocaleLowerCase("tr-TR") : "";
  const visible = options
    .map((option, index) => ({ option, index }))
    .filter(({ option }) => !term || `${option.text} ${option.description ?? ""}`.toLocaleLowerCase("tr-TR").includes(term))
    .map(({ index }) => index);

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  useEffect(() => {
    if (!open) return;
    const outside = (event: MouseEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) close();
    };
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, [open]);

  // Aranabilir listede açılınca odak arama kutusuna geçer.
  useEffect(() => {
    if (open && searchable) search.current?.focus();
  }, [open, searchable]);

  // Native select gibi: form sıfırlanınca (reset) kontrolsüz seçim başlangıç değerine döner.
  const initial = useRef(inner);
  useEffect(() => {
    const owner = native.current?.form;
    if (!owner || controlled) return;
    const reset = () => setInner(initial.current);
    owner.addEventListener("reset", reset);
    return () => owner.removeEventListener("reset", reset);
  }, [controlled]);

  useEffect(() => {
    if (!open || active < 0) return;
    list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const enabled = (index: number) => index >= 0 && index < options.length && !options[index].disabled;
  // Görünen (süzülmüş) listede bir sonraki/önceki seçilebilir seçenek.
  const step = (from: number, delta: number) => {
    let position = visible.indexOf(from);
    if (position < 0) position = delta > 0 ? -1 : visible.length;
    for (let i = 0; i < visible.length; i += 1) {
      position += delta;
      if (position < 0 || position >= visible.length) break;
      if (enabled(visible[position])) return visible[position];
    }
    return from;
  };

  const show = () => {
    const rect = button.current?.getBoundingClientRect();
    const needed = searchable ? 330 : 280;
    setUpward(Boolean(rect && window.innerHeight - rect.bottom < needed && rect.top > window.innerHeight - rect.bottom));
    setActive(Math.max(0, options.findIndex((option) => option.value === selectedValue)));
    setOpen(true);
  };

  const choose = (index: number) => {
    if (!enabled(index)) return;
    const next = options[index].value;
    close();
    button.current?.focus();
    if (next === selectedValue) return;
    if (!controlled) setInner(next);
    const element = native.current;
    if (element) {
      element.value = next;
      onChange?.({ target: element, currentTarget: element } as ChangeEvent<HTMLSelectElement>);
      // Form düzeyinde dinleyenler için (ör. filtre şeridi seçimde otomatik uygular): gerçek change olayı.
      element.dispatchEvent(new Event("change", { bubbles: true }));
    }
  };

  // Açık listede gezinme (buton ve arama kutusu ortak): true dönerse tuş işlendi.
  const navigate = (key: string): boolean => {
    if (key === "ArrowDown") setActive((index) => step(index, 1));
    else if (key === "ArrowUp") setActive((index) => step(index, -1));
    else if (key === "Home") setActive(step(-1, 1));
    else if (key === "End") setActive(step(options.length, -1));
    else if (key === "Enter") choose(visible.includes(active) ? active : (visible.find(enabled) ?? -1));
    else if (key === "Escape") {
      close();
      button.current?.focus();
    } else return false;
    return true;
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!searchable && event.key.length === 1 && /\S/.test(event.key)) {
      // Harfle atlama: kısa sürede yazılan harfler birleşir ("is" → İstanbul).
      const now = event.timeStamp;
      typed.current = { text: (now - typed.current.at < 700 ? typed.current.text : "") + event.key.toLocaleLowerCase("tr-TR"), at: now };
      const match = options.findIndex((option, index) => enabled(index) && option.text.toLocaleLowerCase("tr-TR").startsWith(typed.current.text));
      if (match >= 0) {
        if (open) setActive(match);
        else choose(match);
      }
      return;
    }
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key) || (searchable && event.key.length === 1 && /\S/.test(event.key))) {
        event.preventDefault();
        show();
        // Aranabilir listede kapalıyken yazılan ilk harf aramaya aktarılır.
        if (searchable && event.key.length === 1 && event.key !== " ") setQuery(event.key);
      }
      return;
    }
    if (event.key === "Tab") {
      close();
      return;
    }
    if (event.key === " ") {
      event.preventDefault();
      choose(active);
      return;
    }
    if (navigate(event.key)) event.preventDefault();
  };

  const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Tab") {
      close();
      return;
    }
    if (navigate(event.key)) event.preventDefault();
  };

  const flat = Boolean(term);
  // Ağaç listesi (en az bir girintili seçenek): kök başlıklar tutarlı vurgulu, gruplar ayraçla ayrılır, alt seviyede
  // bağlantı işareti; aramada düz liste (yol altta). Ayraçlar yalnız görsel (role="presentation"), klavye atlamaz.
  const tree = !flat && options.some((option) => option.depth > 0);
  // Kökün altındaki seçenek sayısı (bir sonraki köke kadar): başlığın sağında soluk sayaç.
  const descendants = (index: number) => {
    let count = 0;
    for (let next = index + 1; next < options.length && options[next].depth > 0; next += 1) count += 1;
    return count;
  };
  const optionItems = visible.flatMap((index, position) => {
    const option = options[index];
    const isSelected = option.value === selectedValue;
    const isRoot = tree && option.depth === 0 && option.value !== "";
    const previous = position > 0 ? options[visible[position - 1]] : undefined;
    // Ayraç: "Tümü" gibi boş değerli seçeneğin altında ve her kök grubun (ilki hariç) üstünde.
    const separated = tree && Boolean(previous) && (isRoot || previous?.value === "");
    const childCount = isRoot ? descendants(index) : 0;
    const row = (
      <li
        key={option.value}
        id={`${listId}-${index}`}
        data-index={index}
        role="option"
        aria-selected={isSelected}
        aria-disabled={option.disabled || undefined}
        onMouseDown={(event) => {
          event.preventDefault();
          choose(index);
        }}
        onMouseEnter={() => enabled(index) && setActive(index)}
        className={cn(
          "flex items-center justify-between gap-3",
          t.option,
          option.disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
          option.value === "" && !isSelected && t.empty,
          // Kök başlık tutarlı biçimde koyu ve kalın; ikinci seviye normal; üçüncü seviye bir ton soluk.
          isRoot && "font-semibold",
          isRoot && !isSelected && "text-fg",
          tree && option.depth >= 2 && !isSelected && "text-fg-muted",
          isSelected && t.selected,
          index === active && t.active,
        )}
        style={tree && option.depth ? { paddingLeft: `${0.5 + option.depth * 0.875}rem` } : undefined}
      >
        <span className="flex min-w-0 items-center">
          {tree && option.depth > 0 ? (
            // "└" bağlantı işareti: hangi başlığa bağlı olduğu girintiyle birlikte okunur.
            <span aria-hidden className="mr-1.5 mb-1 size-2 shrink-0 rounded-bl-[3px] border-b border-l border-border-strong" />
          ) : null}
          <span className="grid min-w-0">
            <span className="truncate">{option.label}</span>
            {flat && option.description && option.description !== option.text ? (
              <span className="truncate text-xs font-normal text-fg-subtle">{option.description}</span>
            ) : null}
          </span>
        </span>
        {isSelected ? (
          <IconCheck className={cn("size-3.5 shrink-0", t.check)} aria-hidden />
        ) : childCount ? (
          <span className="numeric shrink-0 text-[11px] font-normal text-fg-subtle" aria-label={`${childCount} alt seçenek`}>
            {childCount}
          </span>
        ) : null}
      </li>
    );
    return separated ? [<li key={`${option.value}-sep`} role="presentation" aria-hidden className="mx-1 my-1 h-px bg-border" />, row] : [row];
  });

  return (
    <div ref={root} className="relative w-full">
      {/* Form gönderimi ve doğrulama için; görünmez, odak almaz. */}
      <select
        ref={native}
        name={name}
        form={form}
        required={required}
        disabled={disabled}
        autoComplete={autoComplete}
        value={selectedValue}
        onChange={() => undefined}
        tabIndex={-1}
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.text}
          </option>
        ))}
      </select>
      <button
        ref={button}
        id={buttonId}
        type="button"
        role="combobox"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        title={selected?.description}
        onClick={() => (open ? close() : show())}
        onKeyDown={onKeyDown}
        className={cn(
          v.base,
          invalid ? v.invalid : v.valid,
          "relative flex items-center justify-between gap-2 text-left",
          placeholder && !invalid && !inlineLabel ? t.placeholder : null,
          className,
        )}
      >
        {inlineLabel ? (
          // Filtre şeridi: "Durum  Tümü" — etiket soluk, seçili değer vurgulu.
          <span className="flex min-w-0 items-baseline gap-1.5">
            <span className="shrink-0 text-fg-subtle">{inlineLabel}</span>
            <span className="truncate font-medium">{selected?.label ?? ""}</span>
          </span>
        ) : (
          <span className="truncate">{selected?.label ?? ""}</span>
        )}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
          className={cn("shrink-0 transition-transform", theme === "admin" ? "size-3.5" : "size-4", t.chevron, open && "rotate-180", invalid && "text-danger-600 dark:text-danger-400")}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open ? (
        // z-20: sayfa içi açılır katman (globals.css ölçeği); modal içinde modalın katmanında kalır.
        <div
          className={cn(
            "absolute z-20 flex w-full min-w-max flex-col text-sm animate-fade-in",
            searchable && "min-w-64",
            t.list,
            upward ? "bottom-full mb-1.5" : "top-full mt-1.5",
          )}
        >
          {searchable ? (
            <div className="relative mb-1 shrink-0">
              <IconSearch aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-fg-subtle" />
              <input
                ref={search}
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActive(-1);
                }}
                onKeyDown={onSearchKeyDown}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                aria-controls={listId}
                aria-activedescendant={active >= 0 && visible.includes(active) ? `${listId}-${active}` : undefined}
                autoComplete="off"
                className="h-8 w-full rounded-md border border-border bg-bg pr-2 pl-8 text-[13px] text-fg outline-none placeholder:text-fg-subtle focus:border-primary-500 focus:bg-surface focus:ring-3 focus:ring-primary-500/15"
              />
            </div>
          ) : null}
          <ul ref={list} id={listId} role="listbox" aria-labelledby={buttonId} className="max-h-64 overflow-auto overscroll-contain">
            {optionItems.length ? (
              optionItems
            ) : (
              <li className={cn("px-2.5 py-4 text-center text-[13px]", t.empty)}>Aramanızla eşleşen seçenek bulunmamaktadır.</li>
            )}
          </ul>
          {searchable && term ? (
            <p className="shrink-0 border-t border-border px-2.5 pt-1.5 pb-0.5 text-[11px] text-fg-subtle" aria-live="polite">
              {visible.length.toLocaleString("tr-TR")} sonuç
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
