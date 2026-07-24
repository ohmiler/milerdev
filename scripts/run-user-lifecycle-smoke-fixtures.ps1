param(
    [string]$MySqlUser = 'root'
)

$databasePassword = Read-Host 'MySQL password (input is hidden)' -AsSecureString
$adminPassword = Read-Host 'Local Admin password (input is hidden)' -AsSecureString
$studentPassword = Read-Host 'Local Student password (input is hidden)' -AsSecureString

$databaseCredential = [System.Management.Automation.PSCredential]::new($MySqlUser, $databasePassword)
$adminCredential = [System.Management.Automation.PSCredential]::new('local-admin', $adminPassword)
$studentCredential = [System.Management.Automation.PSCredential]::new('local-student', $studentPassword)

$plainDatabasePassword = $databaseCredential.GetNetworkCredential().Password
$plainAdminPassword = $adminCredential.GetNetworkCredential().Password
$plainStudentPassword = $studentCredential.GetNetworkCredential().Password
$encodedUser = [Uri]::EscapeDataString($MySqlUser)
$encodedDatabasePassword = [Uri]::EscapeDataString($plainDatabasePassword)
$exitCode = 1

try {
    $env:USER_LIFECYCLE_SMOKE_DATABASE_URL = "mysql://${encodedUser}:${encodedDatabasePassword}@localhost:3306/milerdev"
    $env:USER_LIFECYCLE_SMOKE_ADMIN_PASSWORD = $plainAdminPassword
    $env:USER_LIFECYCLE_SMOKE_STUDENT_PASSWORD = $plainStudentPassword

    & npm.cmd run db:fixtures:user-lifecycle-smoke
    $exitCode = $LASTEXITCODE
}
finally {
    Remove-Item Env:USER_LIFECYCLE_SMOKE_DATABASE_URL -ErrorAction SilentlyContinue
    Remove-Item Env:USER_LIFECYCLE_SMOKE_ADMIN_PASSWORD -ErrorAction SilentlyContinue
    Remove-Item Env:USER_LIFECYCLE_SMOKE_STUDENT_PASSWORD -ErrorAction SilentlyContinue
    $plainDatabasePassword = $null
    $plainAdminPassword = $null
    $plainStudentPassword = $null
    $encodedDatabasePassword = $null
    $databaseCredential = $null
    $adminCredential = $null
    $studentCredential = $null
    $databasePassword.Dispose()
    $adminPassword.Dispose()
    $studentPassword.Dispose()
}

exit $exitCode