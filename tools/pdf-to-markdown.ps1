# Regenerates docs/rules/ from the Daggerheart PDFs in the repo root.
#
# Requires `pdftotext` (poppler) on PATH — it ships with Git for Windows at
# C:\Program Files\Git\mingw64\bin — and Node.js.
#
#   powershell -File tools/pdf-to-markdown.ps1

$ErrorActionPreference = 'Stop'

$repo = Split-Path -Parent $PSScriptRoot
$work = Join-Path ([System.IO.Path]::GetTempPath()) ("dh-pdf-" + [guid]::NewGuid().ToString('N').Substring(0, 8))
New-Item -ItemType Directory -Path $work -Force | Out-Null

$books = @(
    @{ Pdf = 'Daggerheart_Corebook.pdf';                       Raw = 'core_raw.txt'; Lay = 'core_lay.txt' },
    @{ Pdf = 'Daggerheart_Hope_and_Fear_Interactive_Book.pdf'; Raw = 'hf_raw.txt';   Lay = 'hf_lay.txt' }
)

foreach ($b in $books) {
    $src = Join-Path $repo $b.Pdf
    if (-not (Test-Path $src)) { throw "Missing source PDF: $src" }

    Write-Host "Extracting $($b.Pdf) ..."
    # Reading-order pass: correct column flow, used for prose.
    & pdftotext -enc UTF-8 $src (Join-Path $work $b.Raw)
    if ($LASTEXITCODE -ne 0) { throw "pdftotext failed on $($b.Pdf)" }
    # Layout pass: preserves column alignment, used for tables and stat blocks.
    & pdftotext -layout -enc UTF-8 $src (Join-Path $work $b.Lay)
    if ($LASTEXITCODE -ne 0) { throw "pdftotext -layout failed on $($b.Pdf)" }
}

$out = Join-Path $repo 'docs\rules'
& node (Join-Path $PSScriptRoot 'pdf-to-markdown.js') $work $out
if ($LASTEXITCODE -ne 0) { throw 'Markdown conversion failed' }

Remove-Item $work -Recurse -Force
Write-Host "Done -> $out"
