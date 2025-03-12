'use client';

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function TextInput({ value, onChange, placeholder }: TextInputProps) {
  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || 'Enter your text here...'}
        className="w-full min-h-[200px] p-4 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-y"
      />
      {value && (
        <div className="absolute bottom-2 right-2 text-xs text-gray-500">
          {value.length} characters
        </div>
      )}
    </div>
  );
}