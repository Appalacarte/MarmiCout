# Réduit la tête de classification du modèle de reconnaissance PP-OCRv5 multilingue
# aux seuls caractères latins (français, chiffres, ponctuation) → plus petit et plus rapide.
import onnx, numpy as np, sys
# Usage : python prune_rec_latin.py <dossier contenant PP-OCRv5_mobile_rec_infer.onnx et ppocrv5_dict.txt> <dossier de sortie>
# (sources : paquet npm pdfmarkdown-ppocrv5-models, Apache-2.0)
from onnx import numpy_helper
SRC=sys.argv[1].rstrip('/')+'/'
OUT=sys.argv[2].rstrip('/')+'/'
m=onnx.load(SRC+'PP-OCRv5_mobile_rec_infer.onnx')
d=open(SRC+'ppocrv5_dict.txt',encoding='utf8').read().split('\n')
while len(d)>18385 and d[-1]=='': d.pop()
assert len(d)==18385
allowed=set(chr(c) for c in range(33,127))
allowed|=set('ÀÂÄÆÇÈÉÊËÎÏÔÖŒÙÛÜŸàâäæçèéêëîïôöœùûüÿ€°£§µ²³·«»×÷±½¼¾–—’‘“”…•%')
keep=[0]+[i for i in range(1,18385) if d[i] in allowed]+[18384]
keep=sorted(set(keep))
chars=[d[i] for i in keep]
print('classes kept',len(keep),'missing',sorted(allowed-set(chars)))
g=m.graph
inits={i.name:i for i in g.initializer}
W=numpy_helper.to_array(inits['linear_8.w_0'])[:,keep].astype(np.float32)
B=numpy_helper.to_array(inits['linear_8.b_0'])[keep].astype(np.float32)
inits['linear_8.w_0'].CopyFrom(numpy_helper.from_array(W,'linear_8.w_0'))
inits['linear_8.b_0'].CopyFrom(numpy_helper.from_array(B,'linear_8.b_0'))
out=g.output[0]
out.type.tensor_type.shape.dim[2].ClearField('dim_param'); out.type.tensor_type.shape.dim[2].dim_value=len(keep)
del g.value_info[:]
onnx.checker.check_model(m)
onnx.save(m,OUT+'PP-OCRv5_mobile_rec_latin.onnx')
lines=['<blank>']+chars[1:]
assert chars[-1]==' '
open(OUT+'rec_latin_dict.txt','w',encoding='utf8').write('\n'.join(lines)+'\n')
print('ok', len(lines))
