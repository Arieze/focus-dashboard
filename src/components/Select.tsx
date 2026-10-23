import {
  Children,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";
interface Props {
  value: string | number;
  onChange: (e: { target: { value: string } }) => void;
  children: ReactNode;
  disabled?: boolean;
  "aria-label"?: string;
}
export default function Select(props: Props) {
  const options = Children.toArray(props.children)
    .filter(isValidElement)
    .map((option) => {
      const p = option.props as {
        value?: string | number;
        children: ReactNode;
        disabled?: boolean;
      };
      return {
        value: String(p.value ?? p.children),
        label: p.children,
        disabled: p.disabled,
      };
    });
  const [open, setOpen] = useState(false),
    [active, setActive] = useState(0),
    [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const button = useRef<HTMLButtonElement>(null),
    menu = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === String(props.value));
  const choose = (index: number) => {
    const option = options[index];
    if (!option || option.disabled) return;
    props.onChange({ target: { value: option.value } });
    setOpen(false);
    button.current?.focus();
  };
  useEffect(() => {
    if (!open) return;
    const rect = button.current!.getBoundingClientRect();
    const height = Math.min(options.length * 37 + 8, 240);
    setPosition({
      left: Math.max(
        8,
        Math.min(rect.left, window.innerWidth - rect.width - 8),
      ),
      top:
        rect.bottom + height > window.innerHeight
          ? Math.max(8, rect.top - height - 4)
          : rect.bottom + 4,
      width: Math.max(rect.width, 160),
    });
    setActive(
      Math.max(
        0,
        options.findIndex((o) => o.value === String(props.value)),
      ),
    );
    const outside = (e: MouseEvent) => {
      if (
        !menu.current?.contains(e.target as Node) &&
        !button.current?.contains(e.target as Node)
      )
        setOpen(false);
    };
    const close = (event: Event) => {
      if (event.target instanceof Node && menu.current?.contains(event.target))
        return;
      setOpen(false);
    };
    document.addEventListener("mousedown", outside);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("mousedown", outside);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [open]);
  return (
    <>
      <button
        type="button"
        className="custom-select"
        ref={button}
        disabled={props.disabled}
        role="combobox"
        aria-label={props["aria-label"]}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            if (open) e.stopPropagation();
            setOpen(false);
            return;
          }
          if (["ArrowDown", "ArrowUp"].includes(e.key)) {
            e.preventDefault();
            if (!open) setOpen(true);
            else
              setActive(
                (i) =>
                  (i + (e.key === "ArrowDown" ? 1 : -1) + options.length) %
                  options.length,
              );
          }
          if (open && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            choose(active);
          }
          if (e.key === "Tab") setOpen(false);
        }}
      >
        <span>{selected?.label}</span>
        <ChevronDown size={14} />
      </button>
      {open &&
        createPortal(
          <div
            ref={menu}
            className="select-popup"
            role="listbox"
            aria-label={props["aria-label"]}
            style={{ ...position, position: "fixed" }}
          >
            {options.map((option, index) => (
              <button
                type="button"
                role="option"
                aria-selected={option.value === String(props.value)}
                disabled={option.disabled}
                key={option.value}
                className={index === active ? "option-active" : ""}
                onMouseEnter={() => setActive(index)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(index)}
              >
                <span>{option.label}</span>
                {option.value === String(props.value) && <Check size={13} />}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
