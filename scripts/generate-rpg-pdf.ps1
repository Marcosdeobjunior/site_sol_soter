$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$docsDir = Join-Path $root 'docs'
$assetsDir = Join-Path $docsDir 'rpg-pdf-assets'
$pdfPath = Join-Path $docsDir 'tutorial-sistema-rpg.pdf'
$logoPath = Join-Path $root 'img/soldesoter_logo.png'

New-Item -ItemType Directory -Force -Path $docsDir | Out-Null
New-Item -ItemType Directory -Force -Path $assetsDir | Out-Null

function New-Brush([string]$hex) {
  return New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml($hex))
}

function New-Pen([string]$hex, [float]$width = 1) {
  return New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml($hex)), $width
}

function Save-Jpeg([System.Drawing.Bitmap]$bitmap, [string]$path) {
  $encoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageDecoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
  $encParams = New-Object System.Drawing.Imaging.EncoderParameters 1
  $encParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), 92L
  $bitmap.Save($path, $encoder, $encParams)
}

function Draw-RoundedRect($graphics, $pen, $brush, [float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $diam = $r * 2
  $path.AddArc($x, $y, $diam, $diam, 180, 90)
  $path.AddArc($x + $w - $diam, $y, $diam, $diam, 270, 90)
  $path.AddArc($x + $w - $diam, $y + $h - $diam, $diam, $diam, 0, 90)
  $path.AddArc($x, $y + $h - $diam, $diam, $diam, 90, 90)
  $path.CloseFigure()
  if ($brush) { $graphics.FillPath($brush, $path) }
  if ($pen) { $graphics.DrawPath($pen, $path) }
  $path.Dispose()
}

function New-Canvas([int]$width = 1600, [int]$height = 900) {
  $bmp = New-Object System.Drawing.Bitmap $width, $height
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  return @{ Bitmap = $bmp; Graphics = $g }
}

function Draw-Logo($graphics, [float]$x, [float]$y, [float]$size) {
  if (Test-Path $logoPath) {
    $img = [System.Drawing.Image]::FromFile($logoPath)
    try {
      $graphics.DrawImage($img, $x, $y, $size, $size)
    } finally {
      $img.Dispose()
    }
  }
}

function Create-CoverImage([string]$path) {
  $ctx = New-Canvas 1600 900
  $bmp = $ctx.Bitmap
  $g = $ctx.Graphics

  $bg = New-Object System.Drawing.Drawing2D.LinearGradientBrush ([System.Drawing.Rectangle]::new(0,0,1600,900)), ([System.Drawing.ColorTranslator]::FromHtml('#0E1324')), ([System.Drawing.ColorTranslator]::FromHtml('#221534')), 20
  $g.FillRectangle($bg, 0, 0, 1600, 900)
  $bg.Dispose()

  $goldBrush = New-Brush '#D8B46A'
  $softBrush = New-Brush '#F4E8C2'
  $mutedBrush = New-Brush '#AFA5D6'
  $panelBrush = New-Brush '#121B33'
  $panelPen = New-Pen '#3B3356' 2

  Draw-RoundedRect $g $null $panelBrush 70 70 1460 760 28

  for ($i = 0; $i -lt 18; $i++) {
    $alpha = 20 + ($i * 3)
    $color = [System.Drawing.Color]::FromArgb([Math]::Min($alpha, 90), 216, 180, 106)
    $pen = New-Object System.Drawing.Pen $color, 1.5
    $g.DrawEllipse($pen, 1080 - ($i * 18), 150 - ($i * 18), 280 + ($i * 36), 280 + ($i * 36))
    $pen.Dispose()
  }

  Draw-Logo $g 116 118 120

  $eyebrowFont = New-Object System.Drawing.Font 'Segoe UI', 22, ([System.Drawing.FontStyle]::Bold)
  $titleFont = New-Object System.Drawing.Font 'Georgia', 44, ([System.Drawing.FontStyle]::Bold)
  $subFont = New-Object System.Drawing.Font 'Segoe UI', 19, ([System.Drawing.FontStyle]::Regular)
  $chipFont = New-Object System.Drawing.Font 'Segoe UI', 16, ([System.Drawing.FontStyle]::Bold)

  $g.DrawString('SOL DE SOTER  |  RPG SYSTEM GUIDE', $eyebrowFont, $goldBrush, 116, 280)
  $g.DrawString('Tutorial Completo do Sistema RPG', $titleFont, $softBrush, 116, 330)
  $g.DrawString('Uma visao profissional do progresso, atributos, classes, missoes e economia de XP.', $subFont, $mutedBrush, [System.Drawing.RectangleF]::new(116, 410, 760, 140))

  $chipBrush1 = New-Brush '#1D2947'
  $chipBrush2 = New-Brush '#281F44'
  $chipPen = New-Pen '#5A4B7A' 1.5

  Draw-RoundedRect $g $chipPen $chipBrush1 116 560 220 70 18
  Draw-RoundedRect $g $chipPen $chipBrush2 356 560 220 70 18
  Draw-RoundedRect $g $chipPen $chipBrush1 596 560 220 70 18

  $g.DrawString('Progresso Real', $chipFont, $softBrush, 150, 584)
  $g.DrawString('XP Dinamico', $chipFont, $softBrush, 397, 584)
  $g.DrawString('Tarefas Complexas', $chipFont, $softBrush, 620, 584)

  $cardBrush = New-Brush '#18213D'
  $cardPen = New-Pen '#5B4A7C' 1.5
  Draw-RoundedRect $g $cardPen $cardBrush 1000 250 410 430 24

  $statTitle = New-Object System.Drawing.Font 'Segoe UI', 18, ([System.Drawing.FontStyle]::Bold)
  $statNum = New-Object System.Drawing.Font 'Georgia', 34, ([System.Drawing.FontStyle]::Bold)
  $bodyFont = New-Object System.Drawing.Font 'Segoe UI', 16, ([System.Drawing.FontStyle]::Regular)

  $g.DrawString('Mapa do personagem', $statTitle, $goldBrush, 1040, 294)
  $g.DrawString('6', $statNum, $softBrush, 1040, 354)
  $g.DrawString('atributos principais', $bodyFont, $mutedBrush, 1100, 368)
  $g.DrawString('8', $statNum, $softBrush, 1040, 438)
  $g.DrawString('fontes principais de XP', $bodyFont, $mutedBrush, 1100, 452)
  $g.DrawString('4', $statNum, $softBrush, 1040, 522)
  $g.DrawString('missoes diarias rotativas', $bodyFont, $mutedBrush, 1100, 536)

  $g.DrawString('Conteudo incluido', $statTitle, $goldBrush, 1040, 610)
  $g.DrawString("• classes e identidade visual`n• leitura, cinema e mangas`n• regras de tarefas e complexidade`n• conquistas agrupadas por tipo", $bodyFont, $softBrush, 1040, 652)

  Save-Jpeg $bmp $path

  $eyebrowFont.Dispose(); $titleFont.Dispose(); $subFont.Dispose(); $chipFont.Dispose()
  $statTitle.Dispose(); $statNum.Dispose(); $bodyFont.Dispose()
  $goldBrush.Dispose(); $softBrush.Dispose(); $mutedBrush.Dispose()
  $panelBrush.Dispose(); $panelPen.Dispose(); $chipBrush1.Dispose(); $chipBrush2.Dispose(); $chipPen.Dispose()
  $cardBrush.Dispose(); $cardPen.Dispose()
  $g.Dispose(); $bmp.Dispose()
}

function Create-XPImage([string]$path) {
  $ctx = New-Canvas 1600 900
  $bmp = $ctx.Bitmap
  $g = $ctx.Graphics

  $bg = New-Object System.Drawing.Drawing2D.LinearGradientBrush ([System.Drawing.Rectangle]::new(0,0,1600,900)), ([System.Drawing.ColorTranslator]::FromHtml('#111728')), ([System.Drawing.ColorTranslator]::FromHtml('#1B102A')), 0
  $g.FillRectangle($bg, 0, 0, 1600, 900)
  $bg.Dispose()

  $titleFont = New-Object System.Drawing.Font 'Georgia', 38, ([System.Drawing.FontStyle]::Bold)
  $labelFont = New-Object System.Drawing.Font 'Segoe UI', 20, ([System.Drawing.FontStyle]::Bold)
  $bodyFont = New-Object System.Drawing.Font 'Segoe UI', 16, ([System.Drawing.FontStyle]::Regular)
  $goldBrush = New-Brush '#E0BC73'
  $textBrush = New-Brush '#F0E8D6'
  $mutedBrush = New-Brush '#B8B1D7'

  $g.DrawString('Economia de XP', $titleFont, $goldBrush, 94, 70)
  $g.DrawString('Cada tracker alimenta o nivel com regras diferentes. Quanto maior o progresso real, maior o XP.', $bodyFont, $mutedBrush, 94, 132)

  $cards = @(
    @{ X = 96; Y = 220; W = 320; H = 470; Fill = '#1A233E'; Border = '#4E6AA2'; Title = 'Livraria'; Value = 'Paginas lidas'; Note = 'XP escala com o total lido e recebe bonus ao concluir o livro.' },
    @{ X = 448; Y = 220; W = 320; H = 470; Fill = '#241B3E'; Border = '#7A5CB8'; Title = 'Mangas'; Value = 'Capitulos lidos'; Note = 'Cada atualizacao de capitulo soma XP; concluir adiciona bonus extra.' },
    @{ X = 800; Y = 220; W = 320; H = 470; Fill = '#3A211D'; Border = '#C37A52'; Title = 'Cinema'; Value = 'Episodios e filmes'; Note = 'Series escalam por episodios vistos. Filmes concluidos rendem valor fixo.' },
    @{ X = 1152; Y = 220; W = 320; H = 470; Fill = '#17342E'; Border = '#49A887'; Title = 'Tarefas'; Value = 'Prioridade + complexidade'; Note = 'Prioridade alta, subtarefas e ligacoes de mae/filha aumentam o ganho.' }
  )

  foreach ($card in $cards) {
    $brush = New-Brush $card.Fill
    $pen = New-Pen $card.Border 2
    Draw-RoundedRect $g $pen $brush $card.X $card.Y $card.W $card.H 26

    $g.DrawString($card.Title, $labelFont, $textBrush, ($card.X + 28), ($card.Y + 34))
    $g.DrawString($card.Value, $labelFont, $goldBrush, ($card.X + 28), ($card.Y + 92))

    $barBrush = New-Brush $card.Border
    Draw-RoundedRect $g $null (New-Brush '#0E1426') ($card.X + 28) ($card.Y + 170) 264 18 9
    Draw-RoundedRect $g $null $barBrush ($card.X + 28) ($card.Y + 170) 200 18 9

    $g.DrawString($card.Note, $bodyFont, $mutedBrush, [System.Drawing.RectangleF]::new(($card.X + 28), ($card.Y + 220), 260, 150))

    $miniPen = New-Pen $card.Border 3
    $g.DrawLine($miniPen, ($card.X + 28), ($card.Y + 390), ($card.X + 292), ($card.Y + 390))
    $g.DrawLine($miniPen, ($card.X + 28), ($card.Y + 430), ($card.X + 240), ($card.Y + 430))
    $g.DrawLine($miniPen, ($card.X + 28), ($card.Y + 470), ($card.X + 210), ($card.Y + 470))
    $miniPen.Dispose()

    $barBrush.Dispose(); $brush.Dispose(); $pen.Dispose()
  }

  Save-Jpeg $bmp $path

  $titleFont.Dispose(); $labelFont.Dispose(); $bodyFont.Dispose()
  $goldBrush.Dispose(); $textBrush.Dispose(); $mutedBrush.Dispose()
  $g.Dispose(); $bmp.Dispose()
}

function Create-TasksImage([string]$path) {
  $ctx = New-Canvas 1600 900
  $bmp = $ctx.Bitmap
  $g = $ctx.Graphics

  $bg = New-Object System.Drawing.Drawing2D.LinearGradientBrush ([System.Drawing.Rectangle]::new(0,0,1600,900)), ([System.Drawing.ColorTranslator]::FromHtml('#0F1527')), ([System.Drawing.ColorTranslator]::FromHtml('#1A2B24')), 10
  $g.FillRectangle($bg, 0, 0, 1600, 900)
  $bg.Dispose()

  $titleFont = New-Object System.Drawing.Font 'Georgia', 38, ([System.Drawing.FontStyle]::Bold)
  $labelFont = New-Object System.Drawing.Font 'Segoe UI', 18, ([System.Drawing.FontStyle]::Bold)
  $bodyFont = New-Object System.Drawing.Font 'Segoe UI', 15, ([System.Drawing.FontStyle]::Regular)
  $goldBrush = New-Brush '#E0BC73'
  $textBrush = New-Brush '#F3EBD8'
  $mutedBrush = New-Brush '#B6D7C7'
  $linePen = New-Pen '#5AA182' 2

  $g.DrawString('Complexidade de tarefas', $titleFont, $goldBrush, 92, 70)
  $g.DrawString('O valor final cresce com prioridade, subtarefas e relacoes estruturais entre tarefas.', $bodyFont, $mutedBrush, 92, 130)

  $panelBrush = New-Brush '#162135'
  $panelPen = New-Pen '#5AA182' 2
  Draw-RoundedRect $g $panelPen $panelBrush 90 210 1420 580 30

  $g.DrawString('Fluxo de avaliacao', $labelFont, $textBrush, 126, 246)

  $steps = @(
    @{ X = 140; Y = 350; W = 250; H = 170; Title = '1. Prioridade'; Text = 'Baixa, media e alta definem a base do XP da tarefa.' },
    @{ X = 468; Y = 350; W = 250; H = 170; Title = '2. Subtarefas'; Text = 'Cada subtarefa adiciona peso e indica maior esforco operacional.' },
    @{ X = 796; Y = 350; W = 250; H = 170; Title = '3. Hierarquia'; Text = 'Tarefas maes e filhas elevam a complexidade por dependencia.' },
    @{ X = 1124; Y = 350; W = 250; H = 170; Title = '4. XP Final'; Text = 'O resultado combina base + complexidade para valorizar tarefas relevantes.' }
  )

  foreach ($step in $steps) {
    $boxBrush = New-Brush '#1E2D45'
    $boxPen = New-Pen '#6BB394' 2
    Draw-RoundedRect $g $boxPen $boxBrush $step.X $step.Y $step.W $step.H 24
    $g.DrawString($step.Title, $labelFont, $goldBrush, ($step.X + 22), ($step.Y + 24))
    $g.DrawString($step.Text, $bodyFont, $textBrush, [System.Drawing.RectangleF]::new(($step.X + 22), ($step.Y + 68), 204, 80))
    $boxBrush.Dispose(); $boxPen.Dispose()
  }

  $g.DrawLine($linePen, 390, 435, 468, 435)
  $g.DrawLine($linePen, 718, 435, 796, 435)
  $g.DrawLine($linePen, 1046, 435, 1124, 435)

  $g.DrawString('Exemplo rapido: tarefa alta com 3 subtarefas e 1 filha rende muito mais XP do que uma tarefa simples.', $bodyFont, $mutedBrush, 126, 620)

  Save-Jpeg $bmp $path

  $titleFont.Dispose(); $labelFont.Dispose(); $bodyFont.Dispose()
  $goldBrush.Dispose(); $textBrush.Dispose(); $mutedBrush.Dispose()
  $linePen.Dispose(); $panelBrush.Dispose(); $panelPen.Dispose()
  $g.Dispose(); $bmp.Dispose()
}

function Escape-PdfText([string]$text) {
  return $text.Replace('\', '\\').Replace('(', '\(').Replace(')', '\)')
}

function Format-PdfTextLines([string[]]$lines, [double]$x, [double]$y, [double]$fontSize, [double]$leading) {
  $sb = New-Object System.Text.StringBuilder
  [void]$sb.Append("BT`n/F1 $fontSize Tf`n$x $y Td`n$leading TL`n")
  for ($i = 0; $i -lt $lines.Count; $i++) {
    $escaped = Escape-PdfText $lines[$i]
    [void]$sb.Append("($escaped) Tj`n")
    if ($i -lt ($lines.Count - 1)) {
      [void]$sb.Append("T*`n")
    }
  }
  [void]$sb.Append("ET`n")
  return $sb.ToString()
}

function New-ImageObject([string]$name, [string]$path) {
  $bytes = [System.IO.File]::ReadAllBytes($path)
  $img = [System.Drawing.Image]::FromFile($path)
  try {
    return @{
      Name = $name
      Width = $img.Width
      Height = $img.Height
      Bytes = $bytes
      Dictionary = "<< /Type /XObject /Subtype /Image /Width $($img.Width) /Height $($img.Height) /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length $($bytes.Length) >>"
    }
  } finally {
    $img.Dispose()
  }
}

$coverImage = Join-Path $assetsDir 'cover.jpg'
$xpImage = Join-Path $assetsDir 'xp-overview.jpg'
$tasksImage = Join-Path $assetsDir 'tasks-complexity.jpg'

Create-CoverImage $coverImage
Create-XPImage $xpImage
Create-TasksImage $tasksImage

$imgCover = New-ImageObject 'ImCover' $coverImage
$imgXP = New-ImageObject 'ImXP' $xpImage
$imgTasks = New-ImageObject 'ImTasks' $tasksImage

$pages = @()

$page1 = New-Object System.Text.StringBuilder
[void]$page1.Append("0.09 0.11 0.18 rg 0 0 595 842 re f`n")
[void]$page1.Append("q 40 330 515 465 cm /ImCover Do Q`n")
[void]$page1.Append("0.92 0.88 0.77 rg 52 300 491 2 re f`n")
[void]$page1.Append("BT`n/F2 26 Tf`n0.95 0.91 0.84 rg`n54 266 Td`n(Tutorial completo do Sistema RPG) Tj`nET`n")
[void]$page1.Append((Format-PdfTextLines @(
  'Este documento apresenta a estrutura do seu sistema de personagem, com foco em leitura, cinema, mangas, tarefas, conquistas, classes e fluxo de evolucao.',
  'O objetivo e mostrar como o progresso real se transforma em XP de forma clara, consistente e visualmente organizada.'
) 54 230 12 18))
$pages += @{ Content = $page1.ToString(); Images = @($imgCover) }

$page2 = New-Object System.Text.StringBuilder
[void]$page2.Append("0.97 0.96 0.93 rg 0 0 595 842 re f`n")
[void]$page2.Append("0.12 0.16 0.26 rg 38 748 519 56 re f`n")
[void]$page2.Append("BT`n/F2 24 Tf`n0.94 0.89 0.75 rg`n54 768 Td`n(1. Como o sistema funciona) Tj`nET`n")
[void]$page2.Append((Format-PdfTextLines @(
  'O personagem sobe de nivel com base no XP total acumulado.',
  'As principais fontes de XP sao: livraria, cinema, mangas, tarefas, estudos, treinos, sonhos e viagens.',
  'Cada area alimenta tambem atributos, habilidades e conquistas.'
) 54 710 12 17))
[void]$page2.Append("0.15 0.18 0.28 rg 54 618 232 98 re f`n")
[void]$page2.Append("0.18 0.33 0.29 rg 308 618 232 98 re f`n")
[void]$page2.Append("0.33 0.23 0.19 rg 54 498 232 98 re f`n")
[void]$page2.Append("0.25 0.17 0.34 rg 308 498 232 98 re f`n")
[void]$page2.Append("BT`n/F2 16 Tf`n0.95 0.91 0.84 rg`n70 680 Td`n(Atributos) Tj`nET`n")
[void]$page2.Append((Format-PdfTextLines @(
  'Intelecto, Forca,',
  'Sabedoria, Disciplina,',
  'Exploracao e Prestigio.'
) 70 656 11 15))
[void]$page2.Append("BT`n/F2 16 Tf`n0.95 0.91 0.84 rg`n324 680 Td`n(Conquistas) Tj`nET`n")
[void]$page2.Append((Format-PdfTextLines @(
  'Agrupadas por tipo:',
  'Leitura, Cinema,',
  'Academia, Estudo e mais.'
) 324 656 11 15))
[void]$page2.Append("BT`n/F2 16 Tf`n0.95 0.91 0.84 rg`n70 560 Td`n(Classes) Tj`nET`n")
[void]$page2.Append((Format-PdfTextLines @(
  'Sabio, Guerreiro,',
  'Explorador, Artista,',
  'Mago e Ranger.'
) 70 536 11 15))
[void]$page2.Append("BT`n/F2 16 Tf`n0.95 0.91 0.84 rg`n324 560 Td`n(Missoes do dia) Tj`nET`n")
[void]$page2.Append((Format-PdfTextLines @(
  'Rotativas, objetivas',
  'e pensadas para gerar',
  'consistencia diaria.'
) 324 536 11 15))
[void]$page2.Append((Format-PdfTextLines @(
  'Boas praticas:',
  '- atualize o progresso com frequencia',
  '- use tarefas estruturadas quando houver dependencia',
  '- acompanhe o nivel e as habilidades no painel do RPG'
) 54 430 12 18))
$pages += @{ Content = $page2.ToString(); Images = @() }

$page3 = New-Object System.Text.StringBuilder
[void]$page3.Append("0.96 0.95 0.92 rg 0 0 595 842 re f`n")
[void]$page3.Append("BT`n/F2 24 Tf`n0.12 0.15 0.25 rg`n54 790 Td`n(2. XP por progresso real) Tj`nET`n")
[void]$page3.Append((Format-PdfTextLines @(
  'Livraria, mangas e cinema nao dependem apenas de itens concluidos.',
  'O sistema premia progresso incremental: paginas, capitulos e episodios.',
  'Quanto maior o avanco registrado, maior o ganho de XP.'
) 54 750 12 17))
[void]$page3.Append("q 55 250 485 430 cm /ImXP Do Q`n")
[void]$page3.Append((Format-PdfTextLines @(
  'Resumo operacional:',
  '- livros escalam com paginas lidas e ganham bonus ao concluir',
  '- mangas escalam por capitulos e recebem bonus de fechamento',
  '- series escalam por episodios; filmes concluidos rendem XP fixo'
) 54 208 11 16))
$pages += @{ Content = $page3.ToString(); Images = @($imgXP) }

$page4 = New-Object System.Text.StringBuilder
[void]$page4.Append("0.95 0.96 0.94 rg 0 0 595 842 re f`n")
[void]$page4.Append("BT`n/F2 24 Tf`n0.10 0.20 0.18 rg`n54 790 Td`n(3. Tarefas, prioridade e complexidade) Tj`nET`n")
[void]$page4.Append((Format-PdfTextLines @(
  'As tarefas agora rendem XP de acordo com dois fatores centrais:',
  'prioridade e complexidade estrutural.',
  'Complexidade cresce com subtarefas, relacao de tarefa mae e tarefas filhas.'
) 54 750 12 17))
[void]$page4.Append("q 55 260 485 400 cm /ImTasks Do Q`n")
[void]$page4.Append((Format-PdfTextLines @(
  'Exemplos de tarefas valorizadas:',
  '- alta prioridade com varias subtarefas',
  '- tarefa mae que coordena entregas menores',
  '- tarefa filha ligada a um fluxo maior de execucao'
) 54 226 11 16))
[void]$page4.Append((Format-PdfTextLines @(
  'Recomendacao: modele projetos longos como tarefas maes e filhas para refletir melhor o esforco real.'
) 54 154 11 16))
$pages += @{ Content = $page4.ToString(); Images = @($imgTasks) }

$page5 = New-Object System.Text.StringBuilder
[void]$page5.Append("0.98 0.97 0.95 rg 0 0 595 842 re f`n")
[void]$page5.Append("BT`n/F2 24 Tf`n0.18 0.14 0.24 rg`n54 790 Td`n(4. Guia pratico de uso) Tj`nET`n")
[void]$page5.Append((Format-PdfTextLines @(
  'Fluxo recomendado para uso diario:',
  '1. Atualize livros, mangas ou cinema sempre que houver progresso.',
  '2. Conclua tarefas com prioridade clara e estrutura coerente.',
  '3. Revise o painel de RPG para acompanhar atributos, conquistas e nivel.'
) 54 748 12 18))
[void]$page5.Append("0.14 0.16 0.25 rg 54 600 488 120 re f`n")
[void]$page5.Append((Format-PdfTextLines @(
  'Checklist semanal',
  '- revisar itens concluidos',
  '- limpar tarefas sem contexto',
  '- verificar missoes do dia',
  '- observar quais conquistas estao proximas'
) 76 684 12 17))
[void]$page5.Append("0.84 0.74 0.47 rg 54 548 488 2 re f`n")
[void]$page5.Append((Format-PdfTextLines @(
  'Leitura da interface do RPG:',
  '- o painel principal mostra nivel, XP e fontes de ganho',
  '- os atributos resumem areas de desenvolvimento',
  '- as conquistas agrupadas facilitam a leitura do progresso'
) 54 514 12 18))
[void]$page5.Append("0.17 0.30 0.28 rg 54 280 488 180 re f`n")
[void]$page5.Append((Format-PdfTextLines @(
  'Conclusao',
  'O sistema RPG funciona melhor quando o progresso registrado representa o trabalho real.',
  'Use esse documento como referencia para manter consistencia e dar mais valor as areas que exigem mais dedicacao.'
) 76 410 12 18))
[void]$page5.Append((Format-PdfTextLines @(
  'Arquivo gerado automaticamente para o projeto Sol de Soter.'
) 54 96 10 14))
$pages += @{ Content = $page5.ToString(); Images = @() }

$objects = New-Object System.Collections.Generic.List[object]

function Add-PdfObject([byte[]]$bytes) {
  $script:objects.Add(@{ Bytes = $bytes }) | Out-Null
  return $script:objects.Count
}

function StrBytes([string]$text) {
  return [System.Text.Encoding]::ASCII.GetBytes($text)
}

$font1 = Add-PdfObject (StrBytes "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
$font2 = Add-PdfObject (StrBytes "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>")

$imageRefs = @{}
foreach ($img in @($imgCover, $imgXP, $imgTasks)) {
  if ($imageRefs.ContainsKey($img.Name)) { continue }
  $header = StrBytes ($img.Dictionary + "`nstream`n")
  $footer = StrBytes "`nendstream"
  $stream = New-Object byte[] ($header.Length + $img.Bytes.Length + $footer.Length)
  [Array]::Copy($header, 0, $stream, 0, $header.Length)
  [Array]::Copy($img.Bytes, 0, $stream, $header.Length, $img.Bytes.Length)
  [Array]::Copy($footer, 0, $stream, $header.Length + $img.Bytes.Length, $footer.Length)
  $imageRefs[$img.Name] = Add-PdfObject $stream
}

$pageObjectRefs = @()

foreach ($page in $pages) {
  $contentBytes = StrBytes $page.Content
  $contentObj = Add-PdfObject (StrBytes ("<< /Length " + $contentBytes.Length + " >>`nstream`n" + $page.Content + "`nendstream"))

  $xObjectEntries = @()
  foreach ($img in $page.Images) {
    $xObjectEntries += "/" + $img.Name + " " + $imageRefs[$img.Name] + " 0 R"
  }
  $xObjectText = if ($xObjectEntries.Count) { "/XObject << " + ($xObjectEntries -join " ") + " >>" } else { "" }
  $resources = "<< /Font << /F1 $font1 0 R /F2 $font2 0 R >> $xObjectText >>"
  $pageObj = Add-PdfObject (StrBytes ("<< /Type /Page /Parent PAGES_REF /MediaBox [0 0 595 842] /Resources " + $resources + " /Contents " + $contentObj + " 0 R >>"))
  $pageObjectRefs += $pageObj
}

$kids = ($pageObjectRefs | ForEach-Object { "$_ 0 R" }) -join " "
$pagesObj = Add-PdfObject (StrBytes ("<< /Type /Pages /Kids [ " + $kids + " ] /Count " + $pageObjectRefs.Count + " >>"))

for ($i = 0; $i -lt $objects.Count; $i++) {
  $text = [System.Text.Encoding]::ASCII.GetString($objects[$i].Bytes)
  if ($text.Contains('PAGES_REF')) {
    $objects[$i].Bytes = StrBytes ($text.Replace('PAGES_REF', ($pagesObj.ToString() + ' 0 R')))
  }
}

$catalogObj = Add-PdfObject (StrBytes ("<< /Type /Catalog /Pages " + $pagesObj + " 0 R >>"))

$ms = New-Object System.IO.MemoryStream
$writer = New-Object System.IO.BinaryWriter $ms
$writer.Write([System.Text.Encoding]::ASCII.GetBytes("%PDF-1.4`n"))

$offsets = New-Object System.Collections.Generic.List[int]
for ($i = 0; $i -lt $objects.Count; $i++) {
  $offsets.Add([int]$ms.Position) | Out-Null
  $writer.Write([System.Text.Encoding]::ASCII.GetBytes((($i + 1).ToString() + " 0 obj`n")))
  $writer.Write($objects[$i].Bytes)
  $writer.Write([System.Text.Encoding]::ASCII.GetBytes("`nendobj`n"))
}

$xrefPos = [int]$ms.Position
$writer.Write([System.Text.Encoding]::ASCII.GetBytes("xref`n0 " + ($objects.Count + 1) + "`n"))
$writer.Write([System.Text.Encoding]::ASCII.GetBytes("0000000000 65535 f `n"))
foreach ($offset in $offsets) {
  $writer.Write([System.Text.Encoding]::ASCII.GetBytes(($offset.ToString('0000000000') + " 00000 n `n")))
}
$writer.Write([System.Text.Encoding]::ASCII.GetBytes("trailer`n<< /Size " + ($objects.Count + 1) + " /Root " + $catalogObj + " 0 R >>`nstartxref`n" + $xrefPos + "`n%%EOF"))
$writer.Flush()
[System.IO.File]::WriteAllBytes($pdfPath, $ms.ToArray())
$writer.Dispose()
$ms.Dispose()

Write-Output "PDF criado em: $pdfPath"
