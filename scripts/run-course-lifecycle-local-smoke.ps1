param(
    [string]$MySqlUser = 'root'
)

$databasePassword = Read-Host 'MySQL password (input is hidden)' -AsSecureString
$databaseCredential = [System.Management.Automation.PSCredential]::new(
    $MySqlUser,
    $databasePassword
)

$plainDatabasePassword = $databaseCredential.GetNetworkCredential().Password
$encodedUser = [Uri]::EscapeDataString($MySqlUser)
$encodedDatabasePassword = [Uri]::EscapeDataString($plainDatabasePassword)
$databaseUrl = "mysql://${encodedUser}:${encodedDatabasePassword}@localhost:3306/milerdev"
$exitCode = 1

try {
    $env:DATABASE_URL = $databaseUrl
    $env:COURSE_LIFECYCLE_SMOKE_DATABASE_URL = $databaseUrl

    & npm.cmd run db:migrate
    if ($LASTEXITCODE -ne 0) {
        $exitCode = $LASTEXITCODE
        exit $exitCode
    }

    & npm.cmd run db:fixtures:course-lifecycle-smoke
    $exitCode = $LASTEXITCODE
}
finally {
    Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
    Remove-Item Env:COURSE_LIFECYCLE_SMOKE_DATABASE_URL -ErrorAction SilentlyContinue
    $databaseUrl = $null
    $plainDatabasePassword = $null
    $encodedDatabasePassword = $null
    $databaseCredential = $null
    $databasePassword.Dispose()
}

exit $exitCode
