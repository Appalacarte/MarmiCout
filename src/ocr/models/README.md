# Modèles OCR (PaddleOCR PP-OCRv5 mobile)

| Fichier | Rôle | Taille |
| --- | --- | --- |
| `PP-OCRv5_mobile_det.ort` | Détection des zones de texte (format ORT) | 4,9 Mo |
| `PP-OCRv5_mobile_rec_latin.onnx` | Reconnaissance, réduite aux caractères latins | 7,6 Mo |
| `rec_latin_dict.txt` | Table classe → caractère (ligne 1 = blank CTC, dernière = espace) | — |

Modèles PaddleOCR (Apache-2.0, voir `LICENSE-PaddleOCR.txt`), exports ONNX repris du paquet npm
`pdfmarkdown-ppocrv5-models@1.0.0`.

Le modèle de reconnaissance d'origine (multilingue, 18 385 classes, 16,5 Mo) a été réduit
aux 133 caractères utiles (lettres latines et accents français, chiffres, ponctuation, €, °)
avec `scripts/ocr/prune_rec_latin.py` : seule la dernière couche est découpée, le reste du réseau
est identique. Résultat : fichier 2× plus léger, mêmes résultats, et plus de confusions avec
des caractères chinois.

Ces fichiers sont importés via `?url` par `src/ocr/ocrService.ts` : Vite leur donne un nom
avec empreinte (cache navigateur permanent), et le service les garde aussi dans le Cache Storage.
