import re
core=open('template_core.html',encoding='utf-8').read()
calc=re.sub(r'^export ','',open('calc.js',encoding='utf-8').read(),flags=re.M)
main=open('main.js',encoding='utf-8').read()
core=core.replace('/*CALC*/',calc).replace('/*MAIN*/',main)
# 아티팩트용: 조각 그대로 (title + style + body 내용)
open('artifact.html','w',encoding='utf-8').write(core)
# 단독 파일용: 문서 골격 추가
i=core.index('</style>')+len('</style>')
head,body=core[:i],core[i:]
std='<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'+head+'\n</head>\n<body>'+body+'</body>\n</html>\n'
open('deep-space-telescope-sim.html','w',encoding='utf-8').write(std)
open('_module_check.mjs','w',encoding='utf-8').write(calc+'\n'+main)
print(len(core.encode()),len(std.encode()))
