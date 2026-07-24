param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('fresh', 'upgrade-base', 'inspect-upgrade', 'verify-upgrade', 'upgrade-lifecycle')]
    [string]$Mode,

    [string]$MySqlUser = 'root'
)

$databaseByMode = @{
    'fresh' = 'milerdev_lifecycle_fresh'
    'upgrade-base' = 'milerdev_lifecycle_upgrade'
    'inspect-upgrade' = 'milerdev_lifecycle_upgrade'
    'verify-upgrade' = 'milerdev_lifecycle_upgrade'
    'upgrade-lifecycle' = 'milerdev_lifecycle_upgrade'
}

$securePassword = Read-Host 'MySQL password (input is hidden)' -AsSecureString
$credential = [System.Management.Automation.PSCredential]::new($MySqlUser, $securePassword)
$plainPassword = $credential.GetNetworkCredential().Password
$encodedUser = [Uri]::EscapeDataString($MySqlUser)
$encodedPassword = [Uri]::EscapeDataString($plainPassword)
$database = $databaseByMode[$Mode]
$exitCode = 1

try {
    $env:USER_LIFECYCLE_DATABASE_URL = "mysql://${encodedUser}:${encodedPassword}@localhost:3306/$database"
    & npm.cmd run db:rehearse:user-lifecycle -- $Mode
    $exitCode = $LASTEXITCODE
}
finally {
    Remove-Item Env:USER_LIFECYCLE_DATABASE_URL -ErrorAction SilentlyContinue
    $plainPassword = $null
    $encodedPassword = $null
    $credential = $null
    $securePassword.Dispose()
}

exit $exitCode
