@echo off
set CONVEX_URL=http://backend-r88koogcc0oss4owcgg0cg4c.51.210.245.120.sslip.io
set CONVEX_SELF_HOSTED_ADMIN_KEY=self-hosted-convex^|012e46b092347941eed3403877a6e2b74a89c39a56e89069871c74d368d724121a9c6bea30

echo Seeding user via npx convex run shipments:seedKillerBean...
npx convex run shipments:seedKillerBean
if %ERRORLEVEL% EQU 0 (
    echo Seeding successful!
) else (
    echo Seeding failed with error level %ERRORLEVEL%
    exit /b %ERRORLEVEL%
)
