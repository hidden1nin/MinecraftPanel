@echo off
title Minecraft Server
cd server
set JAVA="C:\Program Files\Java\jdk-17\bin\java.exe"

set MIN_RAM=1G
set MAX_RAM=4G

set JAR_FILE="server.jar"
set JAVA_ARGS=-Xms%MIN_RAM% -Xmx%MAX_RAM% -jar %JAR_FILE% nogui

echo Starting Minecraft Server...
%JAVA% %JAVA_ARGS%