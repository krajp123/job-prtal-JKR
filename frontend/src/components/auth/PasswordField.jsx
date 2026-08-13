import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function PasswordField({
  value,
  onChange,
  show,
  onToggleShow,
  placeholder,
  error,
  className = '',
  ...props
}) {
  const [localShow, setLocalShow] = useState(false);
  const hasControlledShow = typeof show === 'boolean' && typeof onToggleShow === 'function';
  const visible = hasControlledShow ? show : localShow;
  const toggleVisibility = hasControlledShow ? onToggleShow : () => setLocalShow((current) => !current);

  return (
    <div className="relative mb-3">
      <input
        {...props}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`block w-full rounded-[12px] border border-[#EBC2AE] bg-[#FFF9F5] px-3.5 py-2.5 pr-10 text-[13.5px] text-[#1D181A] placeholder:text-[#A77D8D] outline-none transition-all duration-150 focus:border-[#C75560] focus:bg-white focus:shadow-[0_0_0_3px_rgba(199,85,96,0.14)] ${className} ${error ? 'border-[#F28B82]' : ''}`}
      />
      <button
        type="button"
        onClick={toggleVisibility}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A77D8D] transition-colors duration-150 hover:text-[#1D181A]"
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
      {error && (
        <p className="mt-1 text-[12px] font-medium text-[#B3261E]">{error}</p>
      )}
    </div>
  );
}
