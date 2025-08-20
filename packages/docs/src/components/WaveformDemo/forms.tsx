export const ColorInput = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | undefined;
  onChange: (value: string) => void;
}) => {
  return (
    <div>
      <label className="block text-gray-700 dark:text-gray-300 font-medium mb-2">{label}</label>
      <input
        type="color"
        value={value}
        onChange={e => onChange(e.currentTarget.value)}
        className="w-full h-12 border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-transparent cursor-pointer"
      />
    </div>
  );
};

export const RangeInput = ({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number | undefined;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) => {
  return (
    <div>
      <label className="block text-gray-700 dark:text-gray-300 font-medium mb-2">
        {label}: <span className="text-lime-600 dark:text-lime-400">{value}</span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.currentTarget.value))}
        className="w-full h-2 bg-gray-300 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
      />
    </div>
  );
};

export const SelectInput = ({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string | undefined;
  onChange: (value: string) => void;
}) => {
  return (
    <div>
      <label className="block text-gray-700 dark:text-gray-300 font-medium mb-2">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.currentTarget.value)}
        className="w-full h-12 border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-transparent cursor-pointer"
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export const CheckboxInput = ({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) => {
  return (
    <div className="flex items-center space-x-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.currentTarget.checked)}
        className="w-5 h-5 text-lime-600 dark:text-lime-400 border-gray-300 dark:border-gray-600 rounded focus:ring-lime-500 dark:focus:ring-lime-400 focus:ring-2 cursor-pointer"
      />
      <label className="text-gray-700 dark:text-gray-300 font-medium">{label}</label>
    </div>
  );
};

export const RadioInput = ({
  label,
  name,
  options,
  value,
  onChange,
}: {
  label: string;
  name: string;
  options: { value: string; label: string; description?: string }[];
  value: string;
  onChange: (value: string) => void;
}) => {
  return (
    <div className="space-y-3">
      <span className="block text-gray-700 dark:text-gray-300 font-medium">{label}</span>

      <div className="space-y-2">
        {options.map(option => (
          <label
            key={option.value}
            className="flex items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="w-4 h-4 text-lime-600 dark:text-lime-400 border-gray-300 dark:border-gray-600 focus:ring-lime-500 dark:focus:ring-lime-400 focus:ring-2"
            />
            <div className="ml-3">
              <span className="text-gray-800 dark:text-gray-200 font-medium">{option.label}</span>
              {option.description && <p className="text-gray-600 dark:text-gray-400 text-sm">{option.description}</p>}
            </div>
          </label>
        ))}
      </div>
    </div>
  );
};
