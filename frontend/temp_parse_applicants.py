import re
from pathlib import Path
text = Path('src/pages/recruiter/Applicants.jsx').read_text(encoding='utf-8', errors='replace')
start = text.index('return (')
end = text.index('\n  );\n}\n\nfunction FilterSelect')
block = text[start:end]
print('BLOCK_START', start, 'BLOCK_END', end)
tags = re.findall(r'<(/?)([A-Za-z][A-Za-z0-9_:-]*)([^>]*)>', block)
selfClosing = {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}
stack = []
for idx,(slash,tag,attrs) in enumerate(tags,1):
    if slash:
        if stack and stack[-1] == tag:
            stack.pop()
        else:
            print('BAD_CLOSE', idx, tag, 'TOP', stack[-1] if stack else None)
    else:
        if attrs.strip().endswith('/') or tag in selfClosing:
            continue
        stack.append(tag)
print('STACK_END', stack)
