import subprocess
import os

with open('tmp_git.txt', 'w') as f:
    out = subprocess.check_output(['git', 'status'], cwd=os.getcwd()).decode('utf-8')
    f.write(out + '\n')
    out2 = subprocess.check_output(['git', 'log', '-n', '5', '--oneline'], cwd=os.getcwd()).decode('utf-8')
    f.write(out2 + '\n')
    
    out3 = subprocess.check_output(['git', 'branch', '--show-current'], cwd=os.getcwd()).decode('utf-8')
    f.write(out3 + '\n')
