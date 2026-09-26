@REM ----------------------------------------------------------------------------
@REM Maven Wrapper startup batch script for Windows
@REM ----------------------------------------------------------------------------
@setlocal

set MAVEN_PROJECTBASEDIR=%~dp0
set WRAPPER_JAR="%MAVEN_PROJECTBASEDIR%.mvn\wrapper\maven-wrapper.jar"
set WRAPPER_URL="https://repo.maven.apache.org/maven2/org/apache/maven/wrapper/maven-wrapper/3.3.2/maven-wrapper-3.3.2.jar"

@REM Check if maven-wrapper.jar exists, download if not
if not exist %WRAPPER_JAR% (
    echo Downloading Maven Wrapper...
    powershell -Command "Invoke-WebRequest -Uri %WRAPPER_URL% -OutFile %WRAPPER_JAR%"
)

set MAVEN_CMD_LINE_ARGS=%*

"%JAVA_HOME%\bin\java.exe" -jar %WRAPPER_JAR% %MAVEN_CMD_LINE_ARGS%
if not "%JAVA_HOME%"=="" goto javaHomeSet
for %%i in (java.exe) do set "JAVACMD=%%~$PATH:i"
goto runWrapper

:javaHomeSet
set "JAVACMD=%JAVA_HOME%\bin\java.exe"

:runWrapper
"%JAVACMD%" -jar %WRAPPER_JAR% %MAVEN_CMD_LINE_ARGS%
