import os
import re

files_to_fix = [
    "src/pages/Index.tsx",
    "src/pages/Pray.tsx",
    "src/pages/Submit.tsx"
]

for file_path in files_to_fix:
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Regex to match the conflict block and extract the "theirs" part
    # Pattern explanation:
    # <<<<<<< HEAD (followed by optional spaces/newlines)
    # (.*?) matches HEAD content lazily
    # ======= (followed by optional newline)
    # (.*?) matches THEIRS content lazily
    # >>>>>>> feat/reconhecimento-de-voz (followed by newline)
    
    pattern = re.compile(r"<<<<<<< HEAD.*?\n(.*?)=======\r?\n(.*?)>>>>>>> [^\n]*\n", re.DOTALL)
    
    def replacer(match):
        return match.group(2)
        
    new_content = pattern.sub(replacer, content)
    
    # Special fix for Index.tsx line 1 duplicate imports if any
    if file_path == "src/pages/Index.tsx":
        if new_content.startswith("import { Button }"):
            # The imports are duplicated because "theirs" had them and they were also right below the conflict.
            # It's better to let typescript/eslint handle or I can leave it. Duplicates don't usually break Vite, but they cause a redeclaration error.
            pass
            
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(new_content)
        
print("Conflicts resolved for UI files")
