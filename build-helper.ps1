# Helper script for build.bat
param(
    [string]$TemplatePath,
    [string]$OutputPath,
    [string]$Password,
    [string]$GmPassword,
    [string]$BasePath,
    [string]$Lang,
    [string]$LoginTitle,
    [string]$LoginSubtitle,
    [string]$LoginPlaceholder,
    [string]$LoginSubmit,
    [string]$LoginError,
    [string]$LoginGmCheckbox,
    [string]$Logout,
    [string]$AppTitle
)

$content = Get-Content $TemplatePath -Raw -Encoding UTF8

$content = $content -replace '\{\{PASSWORD\}\}', $Password
$content = $content -replace '\{\{GM_PASSWORD\}\}', $GmPassword
$content = $content -replace '\{\{BASE_PATH\}\}', $BasePath
$content = $content -replace '\{\{LANG\}\}', $Lang
$content = $content -replace '\{\{LOGIN_TITLE\}\}', $LoginTitle
$content = $content -replace '\{\{LOGIN_SUBTITLE\}\}', $LoginSubtitle
$content = $content -replace '\{\{LOGIN_PLACEHOLDER\}\}', $LoginPlaceholder
$content = $content -replace '\{\{LOGIN_SUBMIT\}\}', $LoginSubmit
$content = $content -replace '\{\{LOGIN_ERROR\}\}', $LoginError
$content = $content -replace '\{\{LOGIN_GM_CHECKBOX\}\}', $LoginGmCheckbox
$content = $content -replace '\{\{LOGOUT\}\}', $Logout
$content = $content -replace '\{\{APP_TITLE\}\}', $AppTitle

[System.IO.File]::WriteAllText($OutputPath, $content, [System.Text.Encoding]::UTF8)

Write-Host "Generated: $OutputPath"