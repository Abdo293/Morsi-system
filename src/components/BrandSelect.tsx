import * as Select from "@radix-ui/react-select";
import "./BrandSelect.css";

export type SelectOption = { value: string; label: string };

type BrandSelectProps = {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder: string;
  required?: boolean;
  emptyOptionLabel?: string;
};

const EMPTY_OPTION = "__none__";

export function BrandSelect({
  label,
  value,
  onValueChange,
  options,
  placeholder,
  required = false,
  emptyOptionLabel,
}: BrandSelectProps) {
  const emptyToken = "__empty_val__";
  const selectedValue = emptyOptionLabel && !value ? EMPTY_OPTION : (value === "" ? emptyToken : value);

  return (
    <Select.Root
      dir="rtl"
      value={selectedValue}
      onValueChange={(nextValue) => onValueChange(nextValue === EMPTY_OPTION || nextValue === emptyToken ? "" : nextValue)}
      required={required}
    >
      <Select.Trigger className="brand-select-trigger" aria-label={label}>
        <Select.Value placeholder={placeholder} />
        <Select.Icon className="brand-select-chevron" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className="brand-select-content" position="popper" sideOffset={6} align="start">
          <Select.Viewport className="brand-select-viewport">
            {emptyOptionLabel && (
              <Select.Item className="brand-select-item" value={EMPTY_OPTION}>
                <Select.ItemText>{emptyOptionLabel}</Select.ItemText>
                <Select.ItemIndicator className="brand-select-check" aria-hidden="true">✓</Select.ItemIndicator>
              </Select.Item>
            )}
            {options.map((option) => {
              const itemVal = option.value === "" ? emptyToken : option.value;
              return (
                <Select.Item className="brand-select-item" key={itemVal} value={itemVal}>
                  <Select.ItemText>{option.label}</Select.ItemText>
                  <Select.ItemIndicator className="brand-select-check" aria-hidden="true">✓</Select.ItemIndicator>
                </Select.Item>
              );
            })}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
