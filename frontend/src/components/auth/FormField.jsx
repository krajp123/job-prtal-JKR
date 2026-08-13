// Small shared input wrapper so every auth form follows the home page's
// light ivory surface with coral focus styling.
export default function FormField({ as = 'input', ...props }) {
    const Tag = as; // 'input' | 'textarea'
    return (
        <Tag
            className="mb-3 block w-full rounded-[12px] border border-[#EBC2AE] bg-[#FFF9F5] px-3.5 py-2.5 text-[13.5px] text-[#1D181A] placeholder:text-[#A77D8D] outline-none transition-all duration-150 focus:border-[#C75560] focus:bg-white focus:shadow-[0_0_0_3px_rgba(199,85,96,0.14)]"
            {...props}
        />
    );
}