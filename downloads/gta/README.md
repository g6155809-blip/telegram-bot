# Original Arachnid Hero — GTA SA files

Для ZModeler скачай полный архив:

- `original_arachnid_hero_truth_rig_complete.zip` — новая версия с точным 32-костным скелетом оригинального скина
- `original_arachnid_hero_truth_rig.dff` — retargeted DFF для этого игрового слота
- `original_arachnid_hero_truth_rig_dff_only.dff` — retargeted DFF без TXD
- `original_arachnid_hero_dff_only.dff` — цвет встроен в DFF, TXD не нужен
- `original_arachnid_hero_dff_only.zip` — архив только с DFF-only моделью
- `original_arachnid_hero_zmodeler_complete.zip` — DFF, TXD и PNG вместе
- `BASECOLOR.png` — отдельная PNG-текстура, которую нужно выбрать в окне
  `Select a .png image`
- `original_arachnid_hero_zmodeler.dff` — модель со скелетом и ссылкой на BASECOLOR
- `original_arachnid_hero_zmodeler.txd` — классический D3D8/DXT5 архив BASECOLOR
- `original_arachnid_hero_game_files.zip` — предыдущая пара DFF и TXD
- `original_arachnid_hero_skinned.dff` — предыдущая модель со скелетом и весами
- `original_arachnid_hero.txd` — предыдущий архив текстур

Это оригинальные файлы проекта для инструментов, совместимых с GTA San Andreas.

В ZModeler открывай `original_arachnid_hero_zmodeler.dff`, затем в окне
`Select a .png image` выбери файл `BASECOLOR.png`. Не выбирай там `.txd`:
это окно принимает только PNG. Файл `.txd` нужен для GTA SA/игрового
пакета и должен лежать рядом с DFF.

Для варианта без TXD открывай `original_arachnid_hero_dff_only.dff`.
У этой версии цвет запечён в vertex colors, поэтому отдельный TXD или PNG
не требуется. Изображение может быть немного менее детальным, чем у
текстурной версии.

Для исправленного игрового скина используй `original_arachnid_hero_truth_rig.dff`
вместе с `original_arachnid_hero_zmodeler.txd`. Эта версия использует
скелет из загруженного оригинального DFF слота. Если TXD не нужен, используй
`original_arachnid_hero_truth_rig_dff_only.dff`.